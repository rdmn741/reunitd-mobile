import React, { useState, useEffect } from 'react';
import {
  Modal,
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
import { addChild, updateChild, deleteChild, getErrorMessage } from '../api';
import { pickAndResizeChildPhoto } from '../imageUtils';

const GENDERS = [
  { value: 'male', label: 'Boy', icon: 'male' },
  { value: 'female', label: 'Girl', icon: 'female' },
  { value: 'other', label: 'Other', icon: 'person' },
];

/**
 * Add/edit a child profile. Mirrors web's edit-child modal
 * (public/dashboard.html openEditChildModal/saveChildEdit/handleAddChild):
 * name, gender, an address that defaults to the guardian's unless
 * overridden, an emergency note, and an optional photo.
 *
 * `child` null = add mode. Non-null = edit mode (adds a Delete action).
 * `onSaved(children)` fires after any successful add/update/delete with the
 * fresh children array straight from the API response.
 */
export default function ChildFormModal({ visible, child, onClose, onSaved }) {
  const { parent } = useAuth();
  const isEdit = !!child;

  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [hasOwnAddress, setHasOwnAddress] = useState(false);
  const [address, setAddress] = useState('');
  const [emergencyNote, setEmergencyNote] = useState('');
  const [photo, setPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    const ownAddr = !!(child?.address && child.address.trim());
    setName(child?.name || '');
    setGender(child?.gender || '');
    setHasOwnAddress(ownAddr);
    setAddress(child?.address || '');
    setEmergencyNote(child?.emergencyNote || '');
    setPhoto(child?.photo || '');
    setError('');
    setSaving(false);
    setDeleting(false);
  }, [visible, child]);

  function toggleOwnAddress(value) {
    setHasOwnAddress(value);
    if (!value) setAddress('');
  }

  async function handlePickPhoto() {
    try {
      const dataUrl = await pickAndResizeChildPhoto();
      if (dataUrl) setPhoto(dataUrl);
    } catch (err) {
      Alert.alert('Photo Error', err.message || 'Could not use that photo.');
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Child name is required.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      name: name.trim(),
      gender,
      address: hasOwnAddress ? address.trim() : '',
      emergencyNote: emergencyNote.trim(),
      photo,
    };
    try {
      const data = isEdit ? await updateChild(child._id, payload) : await addChild(payload);
      onSaved(data.children);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Child Profile',
      `${child?.name || 'This child'} — this cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const data = await deleteChild(child._id);
              onSaved(data.children);
            } catch (err) {
              setDeleting(false);
              Alert.alert('Error', getErrorMessage(err));
            }
          },
        },
      ]
    );
  }

  const busy = saving || deleting;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>{isEdit ? 'Edit Child' : 'Add Child'}</Text>
              <TouchableOpacity onPress={onClose} disabled={busy}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              {/* Photo */}
              <View style={styles.photoRow}>
                <TouchableOpacity style={styles.photoCircle} onPress={handlePickPhoto} disabled={busy}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.photoImg} />
                  ) : (
                    <Ionicons name="person" size={30} color="#93c5fd" />
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={handlePickPhoto} disabled={busy}>
                    <Text style={styles.photoLink}>{photo ? 'Change Photo' : 'Add Photo'}</Text>
                  </TouchableOpacity>
                  {photo ? (
                    <TouchableOpacity onPress={() => setPhoto('')} disabled={busy}>
                      <Text style={[styles.photoLink, styles.photoRemove]}>Remove Photo</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <Text style={styles.label}>Child's Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="First name"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.genderPill, gender === g.value && styles.genderPillSelected]}
                    onPress={() => setGender(gender === g.value ? '' : g.value)}
                  >
                    <Ionicons name={g.icon} size={15} color={gender === g.value ? '#fff' : colors.muted} />
                    <Text style={[styles.genderPillText, gender === g.value && styles.genderPillTextSelected]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Different address than guardian</Text>
                  {!hasOwnAddress && (
                    <Text style={styles.hint}>
                      Uses guardian's home address{parent?.address ? `: ${parent.address}` : ''}
                    </Text>
                  )}
                </View>
                <Switch
                  value={hasOwnAddress}
                  onValueChange={toggleOwnAddress}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={hasOwnAddress ? colors.primary : '#9ca3af'}
                />
              </View>
              {hasOwnAddress && (
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="123 Main St, Anytown, CA 90210"
                  placeholderTextColor="#9ca3af"
                  autoFocus
                />
              )}

              <Text style={styles.label}>Emergency Note</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={emergencyNote}
                onChangeText={setEmergencyNote}
                placeholder="e.g. Peanut allergy. EpiPen in left jacket pocket."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={busy}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, busy && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={busy}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              {isEdit && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={busy}>
                  {deleting ? (
                    <ActivityIndicator color={colors.danger} size="small" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete Child Profile</Text>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  safe: { maxHeight: '92%' },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  scroll: { padding: 20, paddingBottom: 36 },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  photoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#bfdbfe',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoLink: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  photoRemove: { color: colors.danger },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
    marginBottom: 16, backgroundColor: '#f9fafb',
  },
  textArea: { height: 80, textAlignVertical: 'top' },

  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  genderPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10,
    backgroundColor: '#f9fafb',
  },
  genderPillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderPillText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  genderPillTextSelected: { color: '#fff' },

  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },

  error: { fontSize: 13, color: colors.danger, marginBottom: 8 },

  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cancelButton: {
    flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  deleteButton: { alignItems: 'center', paddingVertical: 14, marginTop: 14 },
  deleteButtonText: { fontSize: 13, fontWeight: '700', color: colors.danger },
});
