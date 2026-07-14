import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getErrorMessage } from '../api';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

/**
 * Post-login/signup nudge to turn on two-factor authentication.
 * Optional — the guardian can skip and will be asked again next sign-in.
 */
export default function EnableTwoFactorPrompt({ visible, onEnable, onDismiss }) {
  const [busy, setBusy] = useState(false);

  async function handleEnable() {
    setBusy(true);
    try {
      await onEnable();
    } catch (err) {
      Alert.alert('Could Not Enable', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Protect your account</Text>
          <Text style={styles.body}>
            Turn on two-factor authentication. We'll email a 6-digit code each time you sign in — so your
            child's safety information stays protected even if your password is ever stolen.
          </Text>

          <TouchableOpacity
            style={[styles.enableBtn, busy && styles.enableBtnDisabled]}
            onPress={handleEnable}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.enableText}>Enable two-factor authentication</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterBtn} onPress={onDismiss} disabled={busy}>
            <Text style={styles.laterText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  body: { fontSize: 14, color: '#6b7280', lineHeight: 20, textAlign: 'center', marginBottom: 22 },
  enableBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  enableBtnDisabled: { backgroundColor: '#93c5fd' },
  enableText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  laterBtn: { marginTop: 14, paddingVertical: 8 },
  laterText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
});
