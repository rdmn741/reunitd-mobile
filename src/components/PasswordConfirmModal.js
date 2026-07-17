import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { getErrorMessage } from '../api';

/**
 * Generic password-gated confirmation modal. Used anywhere the backend
 * requires the account password to proceed — currently tag deactivate/remove
 * (routes/api/tags.js requires it for both), matching web's
 * openPasswordConfirm/confirmPasswordAction flow.
 */
export default function PasswordConfirmModal({
  visible,
  title,
  body,
  confirmLabel = 'Confirm',
  destructive = true,
  onConfirm,
  onCancel,
}) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setPassword('');
      setError('');
      setSubmitting(false);
    }
  }, [visible]);

  async function handleConfirm() {
    if (!password) {
      setError('Password is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(password);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Account password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
            autoFocus
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, destructive && styles.confirmButtonDanger, submitting && { opacity: 0.7 }]}
              onPress={handleConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  body: { fontSize: 13, color: colors.muted, marginBottom: 16, lineHeight: 18 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  error: { fontSize: 12, color: colors.danger, marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmButtonDanger: { backgroundColor: colors.danger },
  confirmButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
