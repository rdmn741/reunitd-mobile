import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import { getErrorMessage } from '../api';
import { isBiometricAvailable, isBiometricEnabled, getBiometricLabel } from '../biometrics';
import * as SecureStore from 'expo-secure-store';

const REMEMBERED_TOKEN_KEY = 'reunitd_remembered_token';

export default function LoginScreen({ navigation }) {
  const { login, loginWithBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricLabel, setBiometricLabelState] = useState('Face ID');
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      const enabled = await isBiometricEnabled();
      const remembered = await SecureStore.getItemAsync(REMEMBERED_TOKEN_KEY);
      if (available && enabled && remembered) {
        const label = await getBiometricLabel();
        setBiometricLabelState(label);
        setShowBiometric(true);
      }
    }
    checkBiometric();
  }, []);

  async function handleBiometricLogin() {
    setBiometricLoading(true);
    try {
      const success = await loginWithBiometric();
      if (!success) {
        Alert.alert('Authentication Failed', 'Could not authenticate. Please try again or sign in with your password.');
      }
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handleLogin() {
    const trimEmail = email.trim();
    if (!trimEmail || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(trimEmail, password);
      // Navigation handled by root navigator watching auth state
    } catch (err) {
      Alert.alert('Login Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoArea}>
            <Text style={styles.appName}>
              reun<Text style={styles.appNameAccent}>It</Text>D
            </Text>
            <Text style={styles.tagline}>If someone you love gets lost,{'\n'}one tap reaches you</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subheading}>Sign in to your account</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {showBiometric && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={biometricLoading}
              >
                {biometricLoading ? (
                  <ActivityIndicator color="#2563eb" />
                ) : (
                  <>
                    <Text style={styles.biometricIcon}>
                      {biometricLabel === 'Face ID' ? '🔒' : '👆'}
                    </Text>
                    <Text style={styles.biometricButtonText}>
                      Sign in with {biometricLabel}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eff6ff' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  logoArea: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1e3a8a',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  appNameAccent: {
    color: '#2563eb',
  },
  tagline: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 0,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  passwordContainer: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    marginBottom: 12,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  eyeButton: { paddingHorizontal: 12 },
  eyeText: { fontSize: 18 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  loginButtonDisabled: { backgroundColor: '#93c5fd' },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    gap: 8,
  },
  biometricIcon: { fontSize: 18 },
  biometricButtonText: { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
});
