import React, { useEffect, useRef, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from './src/AuthContext';
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
function TabIcon({ name, focused }) {
  const icons = {
    Dashboard: '🏠',
    Shop: '🛍️',
    Notifications: '🔔',
    Profile: '👤',
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{icons[name] || '●'}</Text>
  );
}

// ─── Authenticated Tabs ──────────────────────────────────────────────────────
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0f0f0',
          paddingTop: 4,
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
  const { parent, loading } = useAuth();
  const navigationRef = useRef(null);

  // Register for push notifications after login
  useEffect(() => {
    if (parent) {
      registerForPushNotifications().catch(console.warn);
    }
  }, [parent]);

  // Handle notification tap → navigate to Notifications tab
  useEffect(() => {
    if (!parent) return;

    const responseSub = setupNotificationResponseListener((data) => {
      if (navigationRef.current) {
        navigationRef.current.navigate('Notifications');
      }
    });

    const foregroundSub = setupForegroundNotificationListener((notification) => {
      // Foreground handler is set in notifications.js via setNotificationHandler
      // This is just for any additional in-app logic
      console.log('Foreground notification received:', notification.request.content.title);
    });

    return () => {
      responseSub.remove();
      foregroundSub.remove();
    };
  }, [parent]);

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashTitle}>
          reun<Text style={styles.splashAccent}>It</Text>D
        </Text>
        <ActivityIndicator color="#2563eb" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {parent ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#1e3a8a',
    letterSpacing: 0.5,
  },
  splashAccent: {
    color: '#2563eb',
  },
});
