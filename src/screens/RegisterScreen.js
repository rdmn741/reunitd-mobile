import React, { useState } from 'react';
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
import { register, resendVerifyCode, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import Wordmark from '../components/Wordmark';

export default function RegisterScreen({ navigation }) {
  const { completeEmailVerify } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    primaryPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Email-verify OTP step (set once register returns verifyRequired)
  const [tempToken, setTempToken] = useState(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegister() {
    const { name, email, password, confirmPassword, primaryPhone } = form;

    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Name, email, and password are required.');
      return;
    }
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.'
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
      };
      if (primaryPhone.trim()) payload.primaryPhone = primaryPhone.trim();

      const data = await register(payload);
      // Mandatory email verification — move to the OTP step, no session yet.
      if (data && data.verifyRequired) {
        setTempToken(data.tempToken);
        setCode('');
      }
    } catch (err) {
      Alert.alert('Registration Failed', getErrorMessage(err));
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
      // On success the account gets its first session and the root navigator
      // switches to the app automatically.
      await completeEmailVerify(tempToken, code);
    } catch (err) {
      Alert.alert('Verification Failed', getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendVerifyCode(tempToken);
      Alert.alert('Code Sent', 'A new verification code is on its way to your email.');
    } catch (err) {
      Alert.alert('Could Not Resend', getErrorMessage(err));
    } finally {
      setResending(false);
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
              <Ionicons name="chevron-back" size={16} color={colors.muted} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Wordmark size={30} style={{ marginBottom: 8 }} />
            <Text style={styles.heading}>{tempToken ? 'Verify your email' : 'Create Account'}</Text>
            <Text style={styles.subheading}>
              {tempToken ? `Enter the 6-digit code we sent to ${form.email.trim()}` : 'Set up your reunItD parent account'}
            </Text>
          </View>

          {tempToken ? (
            <View style={styles.card}>
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
                style={[styles.registerButton, verifying && styles.registerButtonDisabled]}
                onPress={handleVerify}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.resendLink} onPress={handleResend} disabled={resending}>
                <Text style={styles.resendText}>{resending ? 'Sending…' : 'Resend code'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personal Info</Text>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Jane Smith"
              placeholderTextColor="#9ca3af"
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              returnKeyType="next"
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.email}
              onChangeText={(v) => setField('email', v)}
              returnKeyType="next"
            />

            <Text style={styles.label}>Password *</Text>
            <Text style={styles.pwHint}>
              At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Choose a strong password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v) => setField('password', v)}
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              value={form.confirmPassword}
              onChangeText={(v) => setField('confirmPassword', v)}
              returnKeyType="next"
            />

            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Contact Info</Text>

            <Text style={styles.label}>Primary Phone (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 555 123 4567"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={form.primaryPhone}
              onChangeText={(v) => setField('primaryPhone', v)}
              returnKeyType="next"
            />

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
          )}

          {!tempToken && (
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eff6ff' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 20, paddingBottom: 24 },
  backButton: { marginBottom: 16 },
  backText: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  heading: { fontSize: 26, fontWeight: '800', color: '#1e3a8a', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#6b7280' },
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
  codeInput: {
    textAlign: 'center',
    fontSize: 26,
    letterSpacing: 8,
    fontWeight: '700',
    color: '#111827',
  },
  resendLink: { alignSelf: 'center', marginTop: 16 },
  resendText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    paddingBottom: 8,
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
  pwHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
    lineHeight: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
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
  registerButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: { backgroundColor: '#93c5fd' },
  registerButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { fontSize: 14, color: '#6b7280' },
  loginLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
});
