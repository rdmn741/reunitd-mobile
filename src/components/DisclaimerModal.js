import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const DISCLAIMER_TEXT = `IMPORTANT PRIVACY DISCLAIMER — PLEASE READ CAREFULLY

By enabling this field on your reunItD profile, you consent to displaying this personal information to anyone who scans your child's NFC tag.

1. PUBLIC DISCLOSURE
The information you choose to display (such as phone numbers, home address, and emergency notes) will be visible to any person who scans the NFC tag attached to your child's clothing or belongings. This information is accessible without any login or verification from the scanner.

2. RISKS OF DISCLOSURE
Displaying personal contact information publicly carries inherent privacy risks, including but not limited to:
• Unwanted contact from strangers
• Potential misuse of your address or phone number
• Exposure of sensitive household information

3. YOUR RESPONSIBILITY
You acknowledge that you have carefully considered the risks of making this information publicly visible. reunItD provides this feature as a tool for child safety and emergency contact purposes only.

4. RECOMMENDED USE
We recommend only displaying the minimum information necessary for a good samaritan to contact you in an emergency. Consider using a mobile phone number rather than a home address where possible.

5. REUNITD LIABILITY
reunItD is not responsible for any misuse of information you choose to display publicly via this service. By enabling this field, you accept full responsibility for the consequences of public disclosure.

6. REVOCATION
You may disable this field at any time from the Tag Settings screen. Disabling the field will immediately remove it from the public scan page.

By checking the box below and tapping "I Agree," you confirm that you have read, understood, and accepted all terms above, and that you consent to displaying this information publicly.`;

export default function DisclaimerModal({ visible, fieldName, onAgree, onCancel }) {
  const [checked, setChecked] = useState(false);

  function handleCancel() {
    setChecked(false);
    onCancel();
  }

  function handleAgree() {
    if (!checked) return;
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
            <Text style={styles.disclaimerText}>{DISCLAIMER_TEXT}</Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setChecked((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Ionicons name="checkmark" size={15} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I have read and understood the disclaimer
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.agreeButton, !checked && styles.agreeButtonDisabled]}
                onPress={handleAgree}
                disabled={!checked}
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
