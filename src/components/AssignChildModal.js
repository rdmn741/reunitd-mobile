import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../AuthContext';
import { updateTag, getErrorMessage } from '../api';

const GENDER_ICON = { male: 'male', female: 'female', other: 'person' };

/**
 * Bottom-sheet picker for which child profile a tag represents. Mirrors
 * web's assign-child modal (openAssignModal/selectAssignOption/saveAssignment
 * in public/dashboard.html): "No assignment" plus one row per child,
 * single-select, saved via PUT /api/tags/:tagId { childId }.
 */
export default function AssignChildModal({ visible, tagId, currentChildId, onClose, onSaved }) {
  const { parent } = useAuth();
  const [selected, setSelected] = useState(currentChildId || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setSelected(currentChildId || null);
  }, [visible, currentChildId]);

  async function handleSave() {
    setSaving(true);
    try {
      const data = await updateTag(tagId, { childId: selected || null });
      onSaved(data.tag);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const children = parent?.children || [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Assign to a Child</Text>
          <Text style={styles.subtitle}>Which child does this tag represent?</Text>

          <ScrollView style={{ maxHeight: 340 }}>
            <TouchableOpacity
              style={[styles.option, selected === null && styles.optionSelected]}
              onPress={() => setSelected(null)}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="person-outline" size={18} color={colors.muted} />
              </View>
              <Text style={styles.optionName}>No assignment</Text>
              {selected === null && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>

            {children.map((c) => (
              <TouchableOpacity
                key={c._id}
                style={[styles.option, selected === c._id && styles.optionSelected]}
                onPress={() => setSelected(c._id)}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name={GENDER_ICON[c.gender] || 'person'} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>{c.name}</Text>
                  {c.address ? <Text style={styles.optionDetail}>{c.address}</Text> : null}
                </View>
                {selected === c._id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}

            {!children.length && (
              <Text style={styles.empty}>
                No child profiles yet — add one from the Profile tab first.
              </Text>
            )}
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 16 },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, marginBottom: 4,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  optionSelected: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  optionIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  optionName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  optionDetail: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  empty: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },

  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
