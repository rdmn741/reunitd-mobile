'use strict';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setLostMode, updateTag, updateTagSettings, deleteTag, updateMe, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import DisclaimerModal from '../components/DisclaimerModal';

const SENSITIVE_FIELDS = ['phones', 'address', 'emergencyNote'];

const FIELD_CONFIG = [
  { key: 'childName',     label: "Child's Name",    desc: 'First name shown to finder',          parentKey: 'childName',     sensitive: false },
  { key: 'phones',        label: 'Phone Numbers',   desc: 'Primary and backup contact numbers',  parentKey: null,            sensitive: true  },
  { key: 'address',       label: 'Home Address',    desc: 'Home address for reunion',            parentKey: 'address',       sensitive: true  },
  { key: 'emergencyNote', label: 'Emergency Note',  desc: 'Medical info or special instructions',parentKey: 'emergencyNote', sensitive: true  },
];

// ── Finder Preview ────────────────────────────────────────────────────────────
function FinderPreview({ tag, parent }) {
  const vf = tag.visibleFields || {};
  const hasAny = vf.childName || vf.phones || vf.address || vf.emergencyNote;

  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewEyebrow}>FINDER PREVIEW</Text>
      <Text style={styles.previewSub}>What a stranger sees when they scan this tag</Text>

      <View style={styles.previewBody}>
        <View style={styles.previewSosBar}>
          <Text style={styles.previewSosText}>SOS</Text>
          <Text style={styles.previewSosTitle}>Person Found — Contact Info</Text>
          <Text style={styles.previewSosHint}>Please help this person reach their family</Text>
        </View>

        {!hasAny && (
          <Text style={styles.previewEmpty}>No fields are visible yet. Enable at least one below.</Text>
        )}

        {vf.childName && parent?.childName ? (
          <View style={styles.previewRow}>
            <Text style={styles.previewRowLabel}>NAME</Text>
            <Text style={styles.previewRowValue}>{parent.childName}</Text>
          </View>
        ) : null}

        {vf.phones && parent?.primaryPhone ? (
          <View style={styles.previewCallBtn}>
            <Text style={styles.previewCallText}>📞  Call Family — {parent.primaryPhone}</Text>
          </View>
        ) : null}

        {vf.phones && parent?.secondaryPhone ? (
          <Text style={styles.previewBackup}>Backup: {parent.secondaryPhone}</Text>
        ) : null}

        {vf.emergencyNote && parent?.emergencyNote ? (
          <View style={styles.previewMedical}>
            <Text style={styles.previewMedicalLabel}>⚠️  MEDICAL</Text>
            <Text style={styles.previewMedicalText}>{parent.emergencyNote}</Text>
          </View>
        ) : null}

        {vf.address && parent?.address ? (
          <View style={styles.previewRow}>
            <Text style={styles.previewRowLabel}>ADDRESS</Text>
            <Text style={styles.previewRowValue}>{parent.address}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── Inline field editor ───────────────────────────────────────────────────────
function EditableField({ label, value, placeholder, multiline, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <View style={styles.efEditing}>
        <TextInput
          style={[styles.efInput, multiline && styles.efInputMulti]}
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          autoFocus
        />
        <View style={styles.efBtnRow}>
          <TouchableOpacity style={styles.efCancelBtn} onPress={() => { setDraft(value || ''); setEditing(false); }}>
            <Text style={styles.efCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.efSaveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.efSaveText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.efRow} onPress={() => setEditing(true)} activeOpacity={0.7}>
      <Text style={[styles.efValue, !value && styles.efEmpty]}>
        {value || `Tap to add ${label.toLowerCase()}`}
      </Text>
      <Text style={styles.efEdit}>Edit</Text>
    </TouchableOpacity>
  );
}

// ── Field toggle row (visibility + value + edit) ──────────────────────────────
function FieldToggleRow({ fieldCfg, isOn, onToggle, parent, onSaveField }) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.ftTopRow}>
        <View style={styles.ftInfo}>
          <Text style={styles.ftLabel}>{fieldCfg.label}</Text>
          <Text style={styles.ftDesc}>{fieldCfg.desc}</Text>
          {fieldCfg.sensitive && <Text style={styles.ftSensitive}>Sensitive</Text>}
        </View>
        <Switch
          value={isOn}
          onValueChange={onToggle}
          trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
          thumbColor={isOn ? '#2563eb' : '#9ca3af'}
        />
      </View>

      {/* Phones: two separate editable fields */}
      {fieldCfg.key === 'phones' ? (
        <View style={styles.ftValueSection}>
          <Text style={styles.ftValueLabel}>Primary phone</Text>
          <EditableField
            label="Primary phone"
            value={parent?.primaryPhone}
            placeholder="+1 555 012 3456"
            onSave={(v) => onSaveField({ primaryPhone: v })}
          />
          <Text style={[styles.ftValueLabel, { marginTop: 10 }]}>Backup phone</Text>
          <EditableField
            label="Backup phone"
            value={parent?.secondaryPhone}
            placeholder="+1 555 098 7654 (optional)"
            onSave={(v) => onSaveField({ secondaryPhone: v })}
          />
        </View>
      ) : fieldCfg.parentKey ? (
        <View style={styles.ftValueSection}>
          <Text style={styles.ftValueLabel}>Current value</Text>
          <EditableField
            label={fieldCfg.label}
            value={parent?.[fieldCfg.parentKey]}
            placeholder={`Enter ${fieldCfg.label.toLowerCase()}`}
            multiline={fieldCfg.key === 'emergencyNote'}
            onSave={(v) => onSaveField({ [fieldCfg.parentKey]: v })}
          />
        </View>
      ) : null}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TagDetailScreen({ route, navigation }) {
  const { tag: initialTag } = route.params;
  const [tag, setTag] = useState(initialTag);
  const { parent, updateParent } = useAuth();

  const [lostLoading, setLostLoading] = useState(false);
  const [labelEditing, setLabelEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(tag.label || '');
  const [labelSaving, setLabelSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [pendingField, setPendingField] = useState(null);

  const visibleFields = tag.visibleFields || {
    childName: false, phones: false, address: false, emergencyNote: false,
  };

  async function handleLostModeToggle() {
    const newVal = !tag.lostMode;
    Alert.alert(
      newVal ? '🚨 Activate Lost Mode' : '✅ Deactivate Lost Mode',
      newVal
        ? 'This will display a LOST badge when your tag is scanned.'
        : 'Mark your child as found. This will remove the LOST badge.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newVal ? 'Activate' : 'Deactivate',
          style: newVal ? 'destructive' : 'default',
          onPress: async () => {
            setLostLoading(true);
            try {
              await setLostMode(tag.tagId, newVal);
              setTag((p) => ({ ...p, lostMode: newVal }));
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err));
            } finally {
              setLostLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleStatusToggle() {
    const newStatus = tag.status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      newStatus === 'active' ? 'Activate Tag' : 'Deactivate Tag',
      newStatus === 'active'
        ? 'This tag will become visible when scanned.'
        : 'This tag will stop responding when scanned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setStatusLoading(true);
            try {
              await updateTag(tag.tagId, { status: newStatus });
              setTag((p) => ({ ...p, status: newStatus }));
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err));
            } finally {
              setStatusLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleSaveLabel() {
    setLabelSaving(true);
    try {
      await updateTag(tag.tagId, { label: labelValue.trim() });
      setTag((p) => ({ ...p, label: labelValue.trim() }));
      setLabelEditing(false);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLabelSaving(false);
    }
  }

  function handleFieldToggle(field, newValue) {
    if (newValue && SENSITIVE_FIELDS.includes(field)) {
      setPendingField(field);
      setDisclaimerVisible(true);
    } else {
      applyFieldToggle(field, newValue);
    }
  }

  async function applyFieldToggle(field, newValue) {
    const newVf = { ...visibleFields, [field]: newValue };
    try {
      await updateTagSettings(tag.tagId, newVf);
      setTag((p) => ({ ...p, visibleFields: newVf }));
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  }

  async function handleSaveField(updates) {
    await updateMe(updates);
    updateParent(updates);
  }

  function handleDeleteTag() {
    Alert.alert(
      'Remove Tag',
      `Remove tag ${tag.tagId} from your account? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTag(tag.tagId);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err));
            }
          },
        },
      ]
    );
  }

  const isActive = tag.status === 'active';
  const isLost   = tag.lostMode;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Tag header ── */}
        <View style={styles.tagHeader}>
          <Text style={styles.tagId}>{tag.tagId}</Text>
          {tag.label ? <Text style={styles.tagLabel}>{tag.label}</Text> : null}
          <View style={styles.statusBadgeRow}>
            <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
              <Text style={[styles.statusBadgeText, isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                {isActive ? '● Active' : '○ Inactive'}
              </Text>
            </View>
            {isLost && (
              <View style={styles.lostBadge}>
                <Text style={styles.lostBadgeText}>🚨 LOST</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Lost Mode ── */}
        <TouchableOpacity
          style={[styles.lostButton, isLost ? styles.lostButtonActive : styles.lostButtonInactive]}
          onPress={handleLostModeToggle}
          disabled={lostLoading}
        >
          {lostLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.lostButtonText}>
                {isLost ? '✅  Child Found — Deactivate Lost Mode' : '🚨  My Child Is Lost — Activate Now'}
              </Text>
          }
        </TouchableOpacity>

        {/* ── Finder Preview ── */}
        <FinderPreview tag={tag} parent={parent} />

        {/* ── Tag Label ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tag Label</Text>
          <Text style={styles.sectionSubtitle}>Only visible to you in this app.</Text>
          {labelEditing ? (
            <View>
              <TextInput
                style={styles.input}
                value={labelValue}
                onChangeText={setLabelValue}
                placeholder="e.g. Emma's Backpack"
                placeholderTextColor="#9ca3af"
                autoFocus
              />
              <View style={styles.labelButtonRow}>
                <TouchableOpacity style={styles.cancelSmallButton}
                  onPress={() => { setLabelValue(tag.label || ''); setLabelEditing(false); }}>
                  <Text style={styles.cancelSmallText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveSmallButton, labelSaving && { opacity: 0.6 }]}
                  onPress={handleSaveLabel} disabled={labelSaving}>
                  {labelSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveSmallText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.labelRow} onPress={() => setLabelEditing(true)}>
              <Text style={styles.labelValue}>{tag.label || 'No label — tap to add'}</Text>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Visibility + Contact Info (combined) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Info Visible When Scanned</Text>
          <Text style={styles.sectionSubtitle}>
            Toggle each field on to show it to finders. Tap the value to edit it.
          </Text>
          {FIELD_CONFIG.map((cfg) => (
            <FieldToggleRow
              key={cfg.key}
              fieldCfg={cfg}
              isOn={!!(visibleFields[cfg.key])}
              onToggle={(v) => handleFieldToggle(cfg.key, v)}
              parent={parent}
              onSaveField={handleSaveField}
            />
          ))}
        </View>

        {/* ── Scan History ── */}
        <TouchableOpacity
          style={styles.scanHistoryButton}
          onPress={() => navigation.navigate('ScanHistory', { tagId: tag.tagId })}
        >
          <Text style={styles.scanHistoryText}>📊  View Scan History</Text>
        </TouchableOpacity>

        {/* ── Tag Status ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tag Status</Text>
          <Text style={styles.sectionSubtitle}>
            {isActive ? 'Tag is active — finders can see your info.' : 'Tag is inactive — scanning returns nothing.'}
          </Text>
          <TouchableOpacity
            style={[styles.statusToggleButton, isActive ? styles.statusToggleDeactivate : styles.statusToggleActivate]}
            onPress={handleStatusToggle}
            disabled={statusLoading}
          >
            {statusLoading
              ? <ActivityIndicator color={isActive ? '#dc2626' : '#16a34a'} />
              : <Text style={[styles.statusToggleText, isActive ? styles.statusToggleDeactivateText : styles.statusToggleActivateText]}>
                  {isActive ? 'Deactivate Tag' : 'Activate Tag'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Danger Zone ── */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { color: '#dc2626' }]}>Danger Zone</Text>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteTag}>
            <Text style={styles.deleteButtonText}>🗑️  Remove Tag from Account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <DisclaimerModal
        visible={disclaimerVisible}
        fieldName={pendingField}
        onAgree={() => { setDisclaimerVisible(false); if (pendingField) { applyFieldToggle(pendingField, true); setPendingField(null); } }}
        onCancel={() => { setDisclaimerVisible(false); setPendingField(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  scroll: { padding: 20, paddingBottom: 56 },

  // Tag header
  tagHeader: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tagId: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 18, fontWeight: '800', color: '#1e3a8a', letterSpacing: 1, marginBottom: 4,
  },
  tagLabel: { fontSize: 14, color: '#6b7280', marginBottom: 10 },
  statusBadgeRow: { flexDirection: 'row', gap: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusInactive: { backgroundColor: '#f3f4f6' },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  statusActiveText: { color: '#16a34a' },
  statusInactiveText: { color: '#9ca3af' },
  lostBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  lostBadgeText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },

  // Lost button
  lostButton: {
    borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 6, elevation: 3,
  },
  lostButtonInactive: { backgroundColor: '#dc2626' },
  lostButtonActive: { backgroundColor: '#16a34a' },
  lostButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Section card
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  dangerSection: { borderWidth: 1.5, borderColor: '#fecaca' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },

  // Finder Preview
  previewCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1.5, borderColor: '#bfdbfe',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  previewEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#93c5fd', marginBottom: 2 },
  previewSub: { fontSize: 12, color: '#6b7280', marginBottom: 14 },
  previewBody: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  previewSosBar: { backgroundColor: '#dc2626', padding: 12, alignItems: 'center', gap: 2 },
  previewSosText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  previewSosTitle: { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  previewSosHint: { color: 'rgba(255,255,255,0.75)', fontSize: 11, textAlign: 'center' },
  previewEmpty: { fontSize: 13, color: '#9ca3af', padding: 16, textAlign: 'center', fontStyle: 'italic' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  previewRowLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5 },
  previewRowValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  previewCallBtn: { margin: 10, backgroundColor: '#16a34a', borderRadius: 10, padding: 12, alignItems: 'center' },
  previewCallText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  previewBackup: { fontSize: 12, color: '#6b7280', textAlign: 'center', paddingBottom: 8 },
  previewMedical: { backgroundColor: '#fefce8', padding: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  previewMedicalLabel: { fontSize: 10, fontWeight: '700', color: '#d97706', marginBottom: 2 },
  previewMedicalText: { fontSize: 12, color: '#374151' },

  // Label section
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827',
    backgroundColor: '#f9fafb', marginBottom: 10,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  labelValue: { fontSize: 14, color: '#374151' },
  editLink: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  labelButtonRow: { flexDirection: 'row', gap: 10 },
  cancelSmallButton: {
    flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  cancelSmallText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveSmallButton: { flex: 1, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveSmallText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Field toggle rows
  fieldBlock: {
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 12,
  },
  ftTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ftInfo: { flex: 1, paddingRight: 12 },
  ftLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  ftDesc: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  ftSensitive: {
    fontSize: 9, fontWeight: '700', color: '#d97706', backgroundColor: '#fef3c7',
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 3,
  },
  ftValueSection: { marginTop: 10, paddingLeft: 4 },
  ftValueLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.4, marginBottom: 4 },

  // Editable field
  efRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  efValue: { fontSize: 14, color: '#111827', flex: 1 },
  efEmpty: { color: '#9ca3af', fontStyle: 'italic' },
  efEdit: { fontSize: 13, color: '#2563eb', fontWeight: '600', marginLeft: 10 },
  efEditing: { marginTop: 2 },
  efInput: {
    borderWidth: 1.5, borderColor: '#c7d7ff', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#111827',
    backgroundColor: '#f0f4ff', marginBottom: 8,
  },
  efInputMulti: { minHeight: 72, textAlignVertical: 'top' },
  efBtnRow: { flexDirection: 'row', gap: 8 },
  efCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  efCancelText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  efSaveBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  efSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Scan History
  scanHistoryButton: {
    backgroundColor: '#eff6ff', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginBottom: 14, borderWidth: 1.5, borderColor: '#bfdbfe',
  },
  scanHistoryText: { fontSize: 15, fontWeight: '700', color: '#2563eb' },

  // Status toggle
  statusToggleButton: {
    borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, marginTop: 4,
  },
  statusToggleDeactivate: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  statusToggleActivate: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  statusToggleText: { fontSize: 14, fontWeight: '700' },
  statusToggleDeactivateText: { color: '#dc2626' },
  statusToggleActivateText: { color: '#16a34a' },

  // Delete
  deleteButton: {
    borderWidth: 1.5, borderColor: '#fecaca', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 4, backgroundColor: '#fff5f5',
  },
  deleteButtonText: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
});
