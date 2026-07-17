import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from './src/AuthContext';
import { NotificationsProvider, useNotifications } from './src/NotificationsContext';
import {
  registerForPushNotifications,
  setupNotificationResponseListener,
  setupForegroundNotificationListener,
} from './src/notifications';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TagDetailScreen from './src/screens/TagDetailScreen';
import ScanHistoryScreen from './src/screens/ScanHistoryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ShopScreen from './src/screens/ShopScreen';
import QuickActionSheet from './src/components/QuickActionSheet';
import EnableTwoFactorPrompt from './src/components/EnableTwoFactorPrompt';
import Wordmark from './src/components/Wordmark';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Unauthenticated Stack ───────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// ─── Dashboard Stack ─────────────────────────────────────────────────────────
function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1e3a8a',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TagDetail"
        component={TagDetailScreen}
        options={({ route }) => ({
          title: route.params?.tag?.label || route.params?.tag?.tagId || 'Tag Details',
          headerBackTitle: 'Dashboard',
        })}
      />
      <Stack.Screen
        name="ScanHistory"
        component={ScanHistoryScreen}
        options={({ route }) => ({
          title: `Scans — ${route.params?.tagId || ''}`,
          headerBackTitle: 'Tag',
        })}
      />
    </Stack.Navigator>
  );
}

// ─── Tab icon renderer ───────────────────────────────────────────────────────
function TabIcon({ name, focused, color, showDot }) {
  const icons = {
    Dashboard:     focused ? 'home'          : 'home-outline',
    Shop:          focused ? 'pricetags'     : 'pricetags-outline',
    Notifications: focused ? 'notifications' : 'notifications-outline',
    Profile:       focused ? 'person'        : 'person-outline',
  };
  return (
    <View>
      <Ionicons name={icons[name] || 'ellipse-outline'} size={22} color={color} />
      {showDot && <View style={styles.tabDot} />}
    </View>
  );
}

// ─── Authenticated Tabs ──────────────────────────────────────────────────────
function AppTabs() {
  const { unreadCount } = useNotifications();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon
            name={route.name}
            focused={focused}
            color={color}
            showDot={route.name === 'Notifications' && unreadCount > 0}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────
function RootNavigator() {
  const { parent, loading, mfaPromptVisible, enableMfaFromPrompt, dismissMfaPrompt } = useAuth();
  const { refreshUnreadCount } = useNotifications();
  const navigationRef = useRef(null);
  // Quick-action sheet shown when a finder's scan alert arrives
  const [quickTagId, setQuickTagId] = useState(null);
  const [quickScan, setQuickScan] = useState(null);

  const openQuickActions = useCallback((data) => {
    if (data && data.tagId) {
      setQuickTagId(data.tagId);
      setQuickScan(data.scanLog || null);
      return true;
    }
    return false;
  }, []);

  // Register for push notifications after login
  useEffect(() => {
    if (parent) {
      registerForPushNotifications().catch(console.warn);
    }
  }, [parent]);

  // Badge count: refresh on login, whenever the app returns to the
  // foreground (catches notifications delivered while fully backgrounded),
  // and immediately whenever one arrives while open.
  useEffect(() => {
    if (!parent) return;
    refreshUnreadCount();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshUnreadCount();
    });
    return () => sub.remove();
  }, [parent, refreshUnreadCount]);

  // Handle notification tap → navigate to Notifications tab
  useEffect(() => {
    if (!parent) return;

    // Tapping a scan alert opens the quick-action sheet for that tag;
    // any other notification falls back to the Notifications tab.
    const responseSub = setupNotificationResponseListener((data) => {
      refreshUnreadCount();
      if (!openQuickActions(data) && navigationRef.current) {
        navigationRef.current.navigate('Notifications');
      }
    });

    // A scan alert arriving while the app is open auto-opens the quick sheet.
    const foregroundSub = setupForegroundNotificationListener((notification) => {
      refreshUnreadCount();
      const data = notification?.request?.content?.data;
      openQuickActions(data);
    });

    return () => {
      responseSub.remove();
      foregroundSub.remove();
    };
  }, [parent, openQuickActions, refreshUnreadCount]);

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <Wordmark size={38} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {parent ? <AppTabs /> : <AuthStack />}
      {parent && (
        <QuickActionSheet
          visible={!!quickTagId}
          tagId={quickTagId}
          scanInfo={quickScan}
          onClose={() => {
            setQuickTagId(null);
            setQuickScan(null);
          }}
          onOpenDetails={(tag) => {
            if (navigationRef.current) {
              navigationRef.current.navigate('Dashboard', { screen: 'TagDetail', params: { tag } });
            }
          }}
        />
      )}
      {parent && (
        <EnableTwoFactorPrompt
          visible={mfaPromptVisible}
          onEnable={enableMfaFromPrompt}
          onDismiss={dismissMfaPrompt}
        />
      )}
    </NavigationContainer>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationsProvider>
          <RootNavigator />
        </NotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabDot: {
    position: 'absolute',
    top: -2,
    right: -5,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
});
