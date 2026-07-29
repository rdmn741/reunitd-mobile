import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchDisclaimers } from '../api';

/**
 * The consent text is fetched from the server — the same constants it stores in
 * the audit log — and rendered verbatim.
 *
 * This modal previously hardcoded one generic text shown for every field, while
 * the server recorded a different, field-specific agreement. A consent record is
 * only evidence of what was actually put in front of the person, so displaying
 * anything other than the stored text made those records worse than useless.
 *
 * Cached per app session; the texts change only when the server is redeployed.
 */
let _cachedTexts = null;
let _cachedVersion = '';

export default function DisclaimerModal({ visible, fieldName, onAgree, onCancel }) {
  const [checked, setChecked] = useState(false);
  const [text, setText]       = useState('');
  const [version, setVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed]   = useState(false);

  useEffect(() => {
    if (!visible || !fieldName) return;
    let cancelled = false;

    (async () => {
      setChecked(false);
      setFailed(false);

      if (_cachedTexts && _cachedTexts[fieldName]) {
        setText(_cachedTexts[fieldName]);
        setVersion(_cachedVersion);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchDisclaimers();
        if (cancelled) return;
        _cachedTexts   = data.texts || {};
        _cachedVersion = data.version || '';
        const t = _cachedTexts[fieldName];
        if (t) {
          setText(t);
          setVersion(_cachedVersion);
        } else {
          setFailed(true);
        }
      } catch (e) {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, fieldName]);

  function handleCancel() {
    setChecked(false);
    onCancel();
  }

  function handleAgree() {
    if (!checked || !text) return;
    setChecked(false);
    onAgree();
  }

  const fieldLabels = {
    phones: 'Phone Numbers',
    address: 'Home Address',
    emergencyNote: 'Emergency Note',
    childName: "Child's Name",
    photo: "Child's Photo",
  };

  const displayName = fieldLabels[fieldName] || fieldName;
  // Agreeing is only possible once the exact text is on screen.
  const canAgree = checked && !!text && !loading && !failed;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Privacy Disclaimer</Text>
            <Text style={styles.subtitle}>
              You are about to enable: <Text style={styles.fieldName}>{displayName}</Text>
            </Text>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#2563eb" />
                <Text style={styles.loadingText}>Loading agreement…</Text>
              </View>
            ) : failed ? (
              <Text style={styles.failedText}>
                The agreement could not be loaded, so this field cannot be enabled right now.
                Please check your connection and try again.
              </Text>
            ) : (
              <Text style={styles.disclaimerText}>{text}</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {!!version && !failed && (
              <Text style={styles.versionNote}>
                Recorded on your account as {version}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.checkboxRow, (!text || failed) && styles.rowDisabled]}
              onPress={() => { if (text && !failed) setChecked((v) => !v); }}
              activeOpacity={0.7}
              disabled={!text || failed}
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Ionicons name="checkmark" size={15} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I have read and understood the agreement above
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.agreeButton, !canAgree && styles.agreeButtonDisabled]}
                onPress={handleAgree}
                disabled={!canAgree}
              >
                <Text style={styles.agreeButtonText}>I Agree</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 16,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  fieldName: {
    fontWeight: '700',
    color: '#2563eb',
  },
  scrollArea: {
    minHeight: 200,
    maxHeight: 300,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f9fafb',
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
  },
  loadingBox: {
    paddingVertical: 34,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  failedText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#b91c1c',
    fontWeight: '600',
    paddingVertical: 20,
  },
  versionNote: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 12,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  agreeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  agreeButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  agreeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
