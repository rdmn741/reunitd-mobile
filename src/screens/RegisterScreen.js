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
import { register } from '../api';
import { useAuth } from '../AuthContext';
import { getErrorMessage } from '../api';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    primaryPhone: '',
    secondaryPhone: '',
    emergencyNote: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegister() {
    const { name, email, password, confirmPassword, primaryPhone } = form;

    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Name, email, and password are required.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
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
      if (form.secondaryPhone.trim()) payload.secondaryPhone = form.secondaryPhone.trim();
      if (form.emergencyNote.trim()) payload.emergencyNote = form.emergencyNote.trim();

      await register(payload);
      // Auto-login after registration
      await login(email.trim(), password);
      Alert.alert(
        'Verify Your Email',
        `We sent a verification link to ${email.trim()}. Tap it to confirm your address.`
      );
    } catch (err) {
      Alert.alert('Registration Failed', getErrorMessage(err));
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
              <Ionicons name="chevron-back" size={16} color={colors.muted} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subheading}>Set up your reunItD parent account</Text>
          </View>

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
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Min. 8 characters"
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

            <Text style={styles.label}>Secondary Phone (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 555 987 6543"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={form.secondaryPhone}
              onChangeText={(v) => setField('secondaryPhone', v)}
              returnKeyType="next"
            />

            <Text style={styles.label}>Emergency Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Child has peanut allergy. Reward offered."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              value={form.emergencyNote}
              onChangeText={(v) => setField('emergencyNote', v)}
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

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign in</Text>
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
  textArea: {
    height: 90,
    textAlignVertical: 'top',
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
