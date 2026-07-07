import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken } from './api';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission and register the Expo push token with the backend.
 * Returns the token string on success, null if permission denied or on error.
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn('Push notifications are only supported on physical devices.');
    return null;
  }

  // Check/request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted.');
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'reunItD Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
      sound: true,
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      null;

    // projectId is required by Expo's push service — skip silently if not configured yet
    if (!projectId) {
      console.log('[Push] No EAS projectId configured — skipping push token registration.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenData.data;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await registerPushToken(expoPushToken, platform);

    return expoPushToken;
  } catch (err) {
    console.log('[Push] Push token registration skipped:', err.message);
    return null;
  }
}

/**
 * Set up notification response listener.
 * When user taps a notification, calls onNotificationTap(data).
 */
export function setupNotificationResponseListener(onNotificationTap) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (onNotificationTap) {
      onNotificationTap(data);
    }
  });
  return subscription; // call subscription.remove() to clean up
}

/**
 * Set up foreground notification listener.
 * Calls onNotification(notification) when a notification arrives while app is open.
 */
export function setupForegroundNotificationListener(onNotification) {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    if (onNotification) {
      onNotification(notification);
    }
  });
  return subscription;
}
