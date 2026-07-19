import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../AuthContext';
import { updateMe, getErrorMessage } from '../api';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  getBiometricLabel,
} from '../biometrics';
import ChildFormModal from '../components/ChildFormModal';
import ChangePasswordModal from '../components/ChangePasswordModal';

const GENDER_ICON = { male: 'male', female: 'female', other: 'person' };

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function EditProfileForm({ parent, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: parent.name || '',
    email: parent.email || '',
    primaryPhone: parent.primaryPhone || '',
    secondaryPhone: parent.secondaryPhone || '',
    address: parent.address || '',
  });
  const [saving, setSaving] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Missing Field', 'Name is required.');
      return;
    }
    const email = form.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'A valid email address is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        primaryPhone: form.primaryPhone.trim(),
        secondaryPhone: form.secondaryPhone.trim(),
        address: form.address.trim(),
      };
      // Only send email when it changed — a change stays pending until the
      // new address is verified, so the server decides what `email` is.
      if (email !== (parent.email || '').toLowerCase()) payload.email = email;
      const data = await updateMe(payload);
      if (data.emailChangePending) {
        Alert.alert(
          'Confirm Your New Email',
          `We sent a confirmation link to ${email}. Your login email will change once you tap it.`
        );
      }
      onSave(data.parent || payload);
    } catch (err) {
      Alert.alert('Save Failed', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.editCard}>
      <Text style={styles.editTitle}>Edit Profile</Text>

      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={(v) => setField('name', v)}
        placeholder="Jane Smith"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>Email *</Text>
      <TextInput
        style={styles.input}
        value={form.email}
        onChangeText={(v) => setField('email', v)}
        placeholder="you@example.com"
        placeholderTextColor="#9ca3af"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Primary Phone</Text>
      <TextInput
        style={styles.input}
        value={form.primaryPhone}
        onChangeText={(v) => setField('primaryPhone', v)}
        placeholder="+1 555 123 4567"
        placeholderTextColor="#9ca3af"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Secondary Phone</Text>
      <TextInput
        style={styles.input}
        value={form.secondaryPhone}
        onChangeText={(v) => setField('secondaryPhone', v)}
        placeholder="+1 555 987 6543"
        placeholderTextColor="#9ca3af"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Home Address</Text>
      <TextInput
        style={styles.input}
        value={form.address}
        onChangeText={(v) => setField('address', v)}
        placeholder="123 Main St, Anytown, CA 90210"
        placeholderTextColor="#9ca3af"
      />

      <View style={styles.editButtonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { parent, logout, updateParent } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricLabel, setBiometricLabelState] = useState('Face ID');
  const [childModalVisible, setChildModalVisible] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  function handlePasswordChanged() {
    setChangePasswordVisible(false);
    Alert.alert('Password Changed', 'Your password has been changed successfully.');
  }

  function openChildModal(child) {
    setEditingChild(child);
    setChildModalVisible(true);
  }

  function handleChildSaved(children) {
    updateParent({ children });
    setChildModalVisible(false);
  }

  useEffect(() => {
    async function checkBiometrics() {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const enabled = await isBiometricEnabled();
        setBiometricEnabledState(enabled);
        const label = await getBiometricLabel();
        setBiometricLabelState(label);
      }
    }
    checkBiometrics();
  }, []);

  async function handleBiometricToggle(value) {
    await setBiometricEnabled(value);
    setBiometricEnabledState(value);
    Alert.alert(
      value ? `${biometricLabel} Enabled` : `${biometricLabel} Disabled`,
      value
        ? `You will now be asked to authenticate with ${biometricLabel} each time you open reunItD.`
        : `${biometricLabel} lock has been turned off.`
    );
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } catch (_) {
            // Even if logout fails, clear local state
            await logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  }

  function handleSaveProfile(updates) {
    updateParent(updates);
    setEditing(false);
  }

  if (!parent) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Avatar / header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(parent.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.profileName}>{parent.name}</Text>
            <Text style={styles.profileEmail}>{parent.email}</Text>
            <View style={styles.tagCountBadge}>
              <Text style={styles.tagCountText}>
                {(parent.tags || []).length} tag{(parent.tags || []).length !== 1 ? 's' : ''} registered
              </Text>
            </View>
          </View>

          {editing ? (
            <EditProfileForm
              parent={parent}
              onSave={handleSaveProfile}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Text style={styles.infoCardTitle}>Account Info</Text>
                  <TouchableOpacity onPress={() => setEditing(true)}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <InfoRow label="Full Name" value={parent.name} />
                <InfoRow label="Email" value={parent.email} />
                {parent.pendingEmail ? (
                  <InfoRow label="New Email (unverified)" value={parent.pendingEmail} />
                ) : null}
                <InfoRow label="Primary Phone" value={parent.primaryPhone} />
                <InfoRow label="Secondary Phone" value={parent.secondaryPhone} />
                <InfoRow label="Home Address" value={parent.address} />
              </View>

              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setChangePasswordVisible(true)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="key-outline" size={18} color={colors.primary} />
                  <Text style={styles.settingsRowText}>Change Password</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </TouchableOpacity>

              {/* Children */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Text style={styles.infoCardTitle}>Children</Text>
                  <TouchableOpacity onPress={() => openChildModal(null)}>
                    <Text style={styles.editLink}>+ Add Child</Text>
                  </TouchableOpacity>
                </View>
                {parent.children && parent.children.length > 0 ? (
                  parent.children.map((child) => (
                    <TouchableOpacity
                      key={child._id}
                      style={styles.childRow}
                      onPress={() => openChildModal(child)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.childThumb}>
                        {child.photo ? (
                          <Image source={{ uri: child.photo }} style={styles.childThumbImg} />
                        ) : (
                          <Ionicons name={GENDER_ICON[child.gender] || 'person'} size={16} color="#93c5fd" />
                        )}
                      </View>
                      <Text style={styles.childName}>{child.name}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.childEmpty}>No child profiles yet. Add one to assign it to your tags.</Text>
                )}
              </View>
            </>
          )}

          {/* Face ID / Biometric lock */}
          {biometricAvailable && (
            <View style={styles.infoCard}>
              <View style={styles.biometricRow}>
                <View style={styles.biometricText}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={biometricLabel === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                      size={16}
                      color={colors.ink}
                    />
                    <Text style={styles.biometricTitle}>{biometricLabel}</Text>
                  </View>
                  <Text style={styles.biometricSub}>
                    Require {biometricLabel} to open the app
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: '#d1d5db', true: '#2563eb' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          )}

          {/* App info */}
          <View style={styles.appInfoCard}>
            <Text style={styles.appInfoTitle}>reunItD</Text>
            <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
            <Text style={styles.appInfoTagline}>Keeping children safe with smart NFC tags.</Text>
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.logoutButton, loggingOut && { opacity: 0.6 }]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#dc2626" />
            ) : (
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ChildFormModal
        visible={childModalVisible}
        child={editingChild}
        onClose={() => setChildModalVisible(false)}
        onSaved={handleChildSaved}
      />

      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        onChanged={handlePasswordChanged}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60 },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#1e3a8a', marginBottom: 2 },
  profileEmail: { fontSize: 14, color: '#6b7280', marginBottom: 10 },
  tagCountBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagCountText: { fontSize: 12, fontWeight: '700', color: '#1e40af' },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  editLink: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#374151' },

  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  childThumb: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#dbeafe', borderWidth: 1.5, borderColor: '#93c5fd',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  childThumbImg: { width: '100%', height: '100%' },
  childName: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1 },
  childEmpty: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', paddingVertical: 6 },

  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  settingsRowText: { fontSize: 14, fontWeight: '600', color: '#111827' },

  appInfoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  appInfoTitle: { fontSize: 16, fontWeight: '800', color: '#1e3a8a' },
  appInfoVersion: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  appInfoTagline: { fontSize: 12, color: '#6b7280', textAlign: 'center' },

  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  biometricText: { flex: 1, marginRight: 12 },
  biometricTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  biometricSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  logoutButton: {
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    marginBottom: 20,
  },
  logoutButtonText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },

  // Edit form
  editCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  editTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
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
  textArea: { height: 90, textAlignVertical: 'top' },
  editButtonRow: { flexDirection: 'row', gap: 12 },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
