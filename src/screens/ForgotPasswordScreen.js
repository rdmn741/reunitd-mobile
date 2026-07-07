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
import { forgotPassword, getErrorMessage } from '../api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const trimEmail = email.trim();
    if (!trimEmail) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(trimEmail);
      setSent(true);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>

          <View style={styles.iconArea}>
            <Text style={styles.icon}>🔑</Text>
          </View>

          <Text style={styles.heading}>Reset Password</Text>
          <Text style={styles.subheading}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          {sent ? (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successBody}>
                Check your inbox for a password reset link. It may take a minute to arrive.
              </Text>
              <TouchableOpacity
                style={styles.returnButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.returnButtonText}>Return to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                value={email}
                onChangeText={setEmail}
              />

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Send Reset Link</Text>
                )}
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
  backButton: { paddingTop: 20, marginBottom: 24 },
  backText: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  iconArea: { alignItems: 'center', marginBottom: 20 },
  icon: { fontSize: 56 },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e3a8a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
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
    marginBottom: 20,
    backgroundColor: '#f9fafb',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#93c5fd' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  successIcon: { fontSize: 48, marginBottom: 16 },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#16a34a',
    marginBottom: 8,
  },
  successBody: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  returnButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  returnButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
