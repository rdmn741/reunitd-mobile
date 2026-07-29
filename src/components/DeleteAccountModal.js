import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { deleteAccount, requestDeleteCode, getErrorMessage } from '../api';

/**
 * Permanent account deletion.
 *
 * Two steps on purpose: the consequences are read first, and the password field
 * only appears afterwards. The list below mirrors section 7 of the published
 * Privacy Policy — if the server's cascade changes, both must change together,
 * or the app promises something the backend does not do.
 *
 * Required by App Store Review Guideline 5.1.1(v): an app that lets people
 * create an account must let them delete it from inside the app.
 */
export default function DeleteAccountModal({ visible, twoFactorEnabled, onClose, onDeleted }) {
  const [step, setStep]         = useState(1);
  const [password, setPassword] = useState('');
  const [code, setCode]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');
  const [notice, setNotice]     = useState('');

  function reset() {
    setStep(1); setPassword(''); setCode('');
    setBusy(false); setSending(false); setError(''); setNotice('');
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  async function handleSendCode() {
    setSending(true); setError(''); setNotice('');
    try {
      await requestDeleteCode();
      setNotice('Verification code sent — check your email.');
    } catch (e) {
      setError(getErrorMessage(e) || 'Could not send the code.');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!password) { setError('Enter your password to confirm.'); return; }
    if (twoFactorEnabled && !code.trim()) {
      setError('Enter the verification code sent to your email.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      await deleteAccount(password, twoFactorEnabled ? code.trim() : undefined);
      reset();
      onDeleted();
    } catch (e) {
      setError(getErrorMessage(e) || 'Could not delete the account.');
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Delete Account</Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'This cannot be undone' : 'Confirm it is really you'}
            </Text>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {step === 1 ? (
              <>
                <View style={styles.warnBox}>
                  <Ionicons name="warning-outline" size={18} color="#b91c1c" />
                  <Text style={styles.warnText}>
                    Deleting your account is immediate and permanent. There is no undo, and
                    we cannot restore it for you afterwards.
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>Deleted right away</Text>
                {[
                  'Your profile — name, phone numbers, address and notes',
                  'Every child profile, including photos',
                  'Your notifications and any live location sharing',
                  'Support tickets sent from your account',
                ].map((line) => (
                  <View key={line} style={styles.bullet}>
                    <Ionicons name="close-circle" size={15} color="#dc2626" />
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))}

                <Text style={styles.sectionLabel}>Your tags</Text>
                <View style={styles.bullet}>
                  <Ionicons name="refresh-circle" size={15} color={colors.primary} />
                  <Text style={styles.bulletText}>
                    Factory-reset — the label, assigned child, medical note, visibility
                    settings and the entire scan history are wiped. The patches can be
                    activated again by a future owner.
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>Billing</Text>
                <View style={styles.bullet}>
                  <Ionicons name="card-outline" size={15} color={colors.primary} />
                  <Text style={styles.bulletText}>
                    Any active subscription is cancelled immediately and your saved billing
                    details are removed, so nothing can be charged again.
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>Kept, but no longer linked to you</Text>
                <View style={styles.bullet}>
                  <Ionicons name="document-text-outline" size={15} color={colors.muted} />
                  <Text style={styles.bulletText}>
                    A few records are kept without your name or email — order amounts for
                    accounting, charity donation totals, and records of safety notices you
                    accepted. Full detail is in section 7 of our Privacy Policy.
                  </Text>
                </View>

                <View style={styles.keyBox}>
                  <Ionicons name="lock-closed-outline" size={16} color="#3730a3" />
                  <Text style={styles.keyText}>
                    Your information is encrypted with a key belonging only to your account.
                    Deleting the account destroys that key, so any remaining copy of your
                    data can no longer be read by anyone.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.confirmIntro}>
                  Enter your password to permanently delete your account.
                </Text>

                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(''); }}
                  placeholder="Your account password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!busy}
                />

                {twoFactorEnabled && (
                  <>
                    <Text style={styles.inputLabel}>Verification code</Text>
                    <View style={styles.codeRow}>
                      <TextInput
                        style={[styles.input, styles.codeInput]}
                        value={code}
                        onChangeText={(v) => { setCode(v); setError(''); }}
                        placeholder="6-digit code"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!busy}
                      />
                      <TouchableOpacity
                        style={styles.sendCodeBtn}
                        onPress={handleSendCode}
                        disabled={sending || busy}
                      >
                        {sending
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : <Text style={styles.sendCodeText}>Send code</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {!!notice && <Text style={styles.notice}>{notice}</Text>}
              </>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          <View style={styles.footer}>
            {step === 1 ? (
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.cancelButtonText}>Keep my account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerButton} onPress={() => setStep(2)}>
                  <Text style={styles.dangerButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { setStep(1); setError(''); }}
                  disabled={busy}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dangerButton, busy && { opacity: 0.6 }]}
                  onPress={handleDelete}
                  disabled={busy}
                >
                  {busy
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.dangerButtonText}>Delete forever</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 16 },
  container: { backgroundColor: '#fff', borderRadius: 20, maxHeight: '88%', overflow: 'hidden' },
  header:    { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title:     { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle:  { fontSize: 14, color: '#6b7280' },
  body:      { paddingHorizontal: 20, paddingVertical: 16, maxHeight: 420 },

  warnBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#fef2f2', borderWidth: 1.5,
    borderColor: '#fca5a5', borderRadius: 12, padding: 13, marginBottom: 18,
  },
  warnText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: '#991b1b', fontWeight: '600' },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 0.06, textTransform: 'uppercase',
    color: '#6b7280', marginTop: 14, marginBottom: 8,
  },
  bullet:     { flexDirection: 'row', gap: 9, marginBottom: 8, alignItems: 'flex-start' },
  bulletText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: '#374151' },

  keyBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#eef2ff', borderWidth: 1,
    borderColor: '#c7d2fe', borderRadius: 12, padding: 13, marginTop: 18, marginBottom: 4,
  },
  keyText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: '#3730a3' },

  confirmIntro: { fontSize: 14, lineHeight: 21, color: '#374151', marginBottom: 18 },
  inputLabel:   { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 13,
    paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff', marginBottom: 12,
  },
  codeRow:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  codeInput: { flex: 1, letterSpacing: 3 },
  sendCodeBtn: {
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.primary, minWidth: 96, alignItems: 'center',
  },
  sendCodeText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  notice: { fontSize: 13, color: '#15803d', marginTop: 4, fontWeight: '600' },
  error:  { fontSize: 13, color: '#b91c1c', marginTop: 10, fontWeight: '600' },

  footer:    { padding: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  cancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#d1d5db', alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  dangerButton: {
    flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#dc2626', alignItems: 'center',
  },
  dangerButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
