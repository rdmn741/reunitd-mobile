import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { getTags, setLostMode, updateTagSettings, getErrorMessage } from '../api';
import DisclaimerModal from './DisclaimerModal';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// The info fields a guardian can reveal to finders. Sensitive ones get a
// confirmation before they're exposed on the public scan page.
const FIELDS = [
  { key: 'childName',     label: "Child's Name",   sensitive: false },
  { key: 'photo',         label: "Child's Photo",  sensitive: true },
  { key: 'phones',        label: 'Phone Numbers',  sensitive: true },
  { key: 'address',       label: 'Home Address',   sensitive: true },
  { key: 'emergencyNote', label: 'Emergency Note', sensitive: true },
];

/**
 * Bottom-sheet quick actions shown when a finder scans a guardian's tag.
 * Lets the guardian activate Lost Mode and toggle which info is visible —
 * without digging into the full tag detail screen.
 */
export default function QuickActionSheet({ visible, tagId, scanInfo, onClose, onOpenDetails }) {
  const [loading, setLoading] = useState(false);
  const [tag, setTag] = useState(null);
  const [lostBusy, setLostBusy] = useState(false);
  const [fieldBusy, setFieldBusy] = useState(null);
  const [disclaimerField, setDisclaimerField] = useState(null);

  const load = useCallback(async () => {
    if (!tagId) return;
    setLoading(true);
    setTag(null);
    try {
      const data = await getTags();
      const found = (data.tags || []).find((t) => t.tagId === tagId);
      setTag(found || null);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tagId]);

  useEffect(() => {
    if (visible && tagId) load();
  }, [visible, tagId, load]);

  const visibleFields =
    (tag && tag.visibleFields) || { childName: false, phones: false, address: false, emergencyNote: false, photo: false };

  async function toggleLost() {
    if (!tag) return;
    const newVal = !tag.lostMode;
    setLostBusy(true);
    try {
      await setLostMode(tag.tagId, newVal);
      setTag((p) => ({ ...p, lostMode: newVal }));
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLostBusy(false);
    }
  }

  function onToggleField(field, newValue, sensitive) {
    if (newValue && sensitive) {
      // Enabling a sensitive field requires the full privacy disclaimer.
      setDisclaimerField(field);
    } else {
      applyField(field, newValue);
    }
  }

  async function applyField(field, newValue) {
    if (!tag) return;
    const newVf = { ...visibleFields, [field]: newValue };
    setFieldBusy(field);
    try {
      await updateTagSettings(tag.tagId, newVf);
      setTag((p) => ({ ...p, visibleFields: newVf }));
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setFieldBusy(null);
    }
  }

  const loc = scanInfo ? [scanInfo.city, scanInfo.country].filter(Boolean).join(', ') : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="notifications" size={20} color={colors.primary} />
            <Text style={styles.title}>Someone found your tag</Text>
          </View>
          <Text style={styles.subtitle}>
            {tag?.label ? tag.label : tagId || ''}
            {loc ? ` · scanned in ${loc}` : ''}
          </Text>

          {loading ? (
            <ActivityIndicator color="#2563eb" style={{ marginVertical: 32 }} />
          ) : !tag ? (
            <Text style={styles.err}>Couldn't load this tag. Pull up your dashboard to respond.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 4 }}>
              <TouchableOpacity
                style={[styles.lostBtn, tag.lostMode ? styles.lostOn : styles.lostOff]}
                onPress={toggleLost}
                disabled={lostBusy}
                activeOpacity={0.85}
              >
                {lostBusy ? (
                  <ActivityIndicator color={tag.lostMode ? '#b91c1c' : '#fff'} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="alert-circle" size={18} color={tag.lostMode ? '#b91c1c' : '#fff'} />
                    <Text style={[styles.lostBtnText, tag.lostMode && styles.lostOnText]}>
                      {tag.lostMode ? 'Lost Mode is ON — tap to turn off' : 'Activate Lost Mode'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.sectionLabel}>Show finders more info</Text>
              {FIELDS.map((f) => (
                <View style={styles.fieldRow} key={f.key}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  {fieldBusy === f.key ? (
                    <ActivityIndicator color="#2563eb" />
                  ) : (
                    <Switch
                      value={!!visibleFields[f.key]}
                      onValueChange={(v) => onToggleField(f.key, v, f.sensitive)}
                      trackColor={{ true: '#2563eb', false: '#d1d5db' }}
                    />
                  )}
                </View>
              ))}

              {onOpenDetails && (
                <TouchableOpacity
                  style={styles.detailsLink}
                  onPress={() => {
                    const t = tag;
                    onClose();
                    onOpenDetails(t);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.detailsText}>View full tag details</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DisclaimerModal
        visible={!!disclaimerField}
        fieldName={disclaimerField}
        onAgree={() => {
          const f = disclaimerField;
          setDisclaimerField(null);
          if (f) applyField(f, true);
        }}
        onCancel={() => setDisclaimerField(null)}
      />
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
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 18 },
  err: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginVertical: 28 },
  lostBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  lostOff: { backgroundColor: '#dc2626' },
  lostOn: { backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fca5a5' },
  lostBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  lostOnText: { color: '#b91c1c' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  fieldLabel: { fontSize: 15, color: '#111827', fontWeight: '600' },
  detailsLink: { alignSelf: 'center', marginTop: 18 },
  detailsText: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
  closeBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 12 },
  closeText: { fontSize: 15, color: '#6b7280', fontWeight: '600' },
});
