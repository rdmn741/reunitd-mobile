import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getMe, login as apiLogin, verifyTwoFactor, TOKEN_STORE_KEY, setUnauthorizedHandler } from './api';
import { isBiometricEnabled, isBiometricAvailable, authenticateWithBiometrics } from './biometrics';

const REMEMBERED_TOKEN_KEY = 'reunitd_remembered_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [parent, setParent] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // booting

  const logout = useCallback(async (pushToken = null) => {
    try {
      if (pushToken) {
        const { unregisterPushToken } = await import('./api');
        await unregisterPushToken(pushToken).catch(() => {});
      }
    } catch (_) {}

    // If biometric is enabled, keep a remembered token so Face ID can restore the session
    const biometricOn = await isBiometricEnabled();
    if (biometricOn) {
      const current = await SecureStore.getItemAsync(TOKEN_STORE_KEY);
      if (current) {
        await SecureStore.setItemAsync(REMEMBERED_TOKEN_KEY, current);
      }
    } else {
      await SecureStore.deleteItemAsync(REMEMBERED_TOKEN_KEY);
    }

    await SecureStore.deleteItemAsync(TOKEN_STORE_KEY);
    setToken(null);
    setParent(null);
  }, []);

  // Biometric login — called from LoginScreen when user taps Face ID button
  const loginWithBiometric = useCallback(async () => {
    const available = await isBiometricAvailable();
    if (!available) return false;

    const authenticated = await authenticateWithBiometrics('Authenticate to open reunItD');
    if (!authenticated) return false;

    const remembered = await SecureStore.getItemAsync(REMEMBERED_TOKEN_KEY);
    if (!remembered) return false;

    try {
      await SecureStore.setItemAsync(TOKEN_STORE_KEY, remembered);
      setToken(remembered);
      const data = await getMe();
      setParent(data.parent);
      return true;
    } catch {
      // Token expired — clear remembered token
      await SecureStore.deleteItemAsync(REMEMBERED_TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_STORE_KEY);
      return false;
    }
  }, []);

  // Boot: restore session from SecureStore
  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_STORE_KEY);
        if (stored) {
          // If biometric lock is enabled, require authentication before restoring session
          const biometricOn = await isBiometricEnabled();
          const biometricAvailable = await isBiometricAvailable();
          if (biometricOn && biometricAvailable) {
            const authenticated = await authenticateWithBiometrics('Authenticate to open reunItD');
            if (!authenticated) {
              // User cancelled — clear session and show login
              await SecureStore.deleteItemAsync(TOKEN_STORE_KEY);
              setLoading(false);
              return;
            }
          }
          setToken(stored);
          const data = await getMe();
          setParent(data.parent);
        }
      } catch (err) {
        // Token invalid or expired — clear it
        await SecureStore.deleteItemAsync(TOKEN_STORE_KEY);
        setToken(null);
        setParent(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // Register 401 handler so any API call that gets a 401 auto-logs out
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setParent(null);
    });
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    // Account has 2FA enabled — no session token yet; caller must complete the
    // code step via completeTwoFactor(). Don't store anything here.
    if (data.twoFactorRequired) {
      return data; // { twoFactorRequired: true, tempToken }
    }
    await SecureStore.setItemAsync(TOKEN_STORE_KEY, data.token);
    setToken(data.token);
    setParent(data.parent);
    return data;
  }, []);

  // Complete a 2FA login with the emailed code + temp token from login().
  const completeTwoFactor = useCallback(async (tempToken, code) => {
    const data = await verifyTwoFactor(tempToken, code);
    await SecureStore.setItemAsync(TOKEN_STORE_KEY, data.token);
    setToken(data.token);
    setParent(data.parent);
    return data;
  }, []);

  const refreshParent = useCallback(async () => {
    const data = await getMe();
    setParent(data.parent);
    return data.parent;
  }, []);

  const updateParent = useCallback((updates) => {
    setParent((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ parent, token, loading, login, completeTwoFactor, logout, loginWithBiometric, refreshParent, updateParent }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
