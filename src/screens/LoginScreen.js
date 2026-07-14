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
import { getErrorMessage, resendTwoFactor } from '../api';
import { isBiometricAvailable, isBiometricEnabled, getBiometricLabel } from '../biometrics';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import Wordmark from '../components/Wordmark';
import { colors, radii, shadow } from '../theme';

const REMEMBERED_TOKEN_KEY = 'reunitd_remembered_token';

export default function LoginScreen({ navigation }) {
  const { login, completeTwoFactor, loginWithBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricLabel, setBiometricLabelState] = useState('Face ID');
  const [biometricLoading, setBiometricLoading] = useState(false);
  // 2FA step (set when login returns twoFactorRequired)
  const [tempToken, setTempToken] = useState(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

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
      const data = await login(trimEmail, password);
      if (data && data.twoFactorRequired) {
        // Account has 2FA — switch to the code-entry step
        setTempToken(data.tempToken);
        setCode('');
      }
      // Otherwise navigation is handled by root navigator watching auth state
    } catch (err) {
      Alert.alert('Login Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code from your email.');
      return;
    }
    setVerifying(true);
    try {
      await completeTwoFactor(tempToken, code);
      // Navigation handled by root navigator watching auth state
    } catch (err) {
      Alert.alert('Verification Failed', getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendTwoFactor(tempToken);
      Alert.alert('Code Sent', 'A new verification code is on its way to your email.');
    } catch (err) {
      Alert.alert('Could Not Resend', getErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  function cancelTwoFactor() {
    setTempToken(null);
    setCode('');
    setPassword('');
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
            <Wordmark size={36} />
            <Text style={styles.tagline}>If someone you love gets lost,{'\n'}one tap reaches you</Text>
          </View>

          {tempToken ? (
            <View style={styles.card}>
              <Text style={styles.heading}>Check your email</Text>
              <Text style={styles.subheading}>Enter the 6-digit code we sent to {email}</Text>

              <Text style={styles.label}>Verification code</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                returnKeyType="done"
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
                onSubmitEditing={handleVerify}
              />

              <TouchableOpacity
                style={[styles.loginButton, verifying && styles.loginButtonDisabled]}
                onPress={handleVerify}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Verify & Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.centerLink} onPress={handleResend} disabled={resending}>
                <Text style={styles.forgotText}>{resending ? 'Sending…' : 'Resend code'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.centerLinkTight, styles.backRow]} onPress={cancelTwoFactor}>
                <Ionicons name="chevron-back" size={15} color={colors.muted} />
                <Text style={styles.backText}>Back to login</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
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
                    <Ionicons
                      name={biometricLabel === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                      size={19}
                      color={colors.primary}
                    />
                    <Text style={styles.biometricButtonText}>
                      Sign in with {biometricLabel}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            </View>
          )}

          {!tempToken && (
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Create one</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  logoArea: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
    gap: 10,
  },
  tagline: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 0,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
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
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  codeInput: {
    textAlign: 'center',
    fontSize: 26,
    letterSpacing: 8,
    fontWeight: '700',
    color: '#111827',
  },
  centerLink: { alignSelf: 'center', marginTop: 18 },
  centerLinkTight: { alignSelf: 'center', marginTop: 12 },
  backText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
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
