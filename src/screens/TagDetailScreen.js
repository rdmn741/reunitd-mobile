'use strict';
import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { setLostMode, updateTag, updateTagSettings, deleteTag, updateMe, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import DisclaimerModal from '../components/DisclaimerModal';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import ChildFormModal from '../components/ChildFormModal';
import AssignChildModal from '../components/AssignChildModal';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const SENSITIVE_FIELDS = ['phones', 'address', 'emergencyNote', 'photo'];
const GENDER_ICON = { male: 'male', female: 'female', other: 'person' };

const FIELD_CONFIG = [
  { key: 'childName',     label: "Child's Name",    desc: 'First name shown to finder',          parentKey: 'childName',     sensitive: false },
  { key: 'photo',         label: "Child's Photo",   desc: 'Photo shown to finder',               parentKey: null,            sensitive: true  },
  { key: 'phones',        label: 'Phone Numbers',   desc: 'Primary and backup contact numbers',  parentKey: null,            sensitive: true  },
  { key: 'address',       label: 'Home Address',    desc: 'Home address for reunion',            parentKey: 'address',       sensitive: true  },
  { key: 'emergencyNote', label: 'Emergency Note',  desc: 'Medical info or special instructions',parentKey: null,            sensitive: true  },
];

// Resolves the identity/contact fields a finder would actually see for this
// tag: the assigned child's profile takes precedence, falling back to the
// guardian's legacy single-child fields. Mirrors web's previewTag resolution
// (public/dashboard.html) exactly, including the quirk that emergencyNote's
// no-child fallback is the tag's own note, not the guardian's.
function resolveTagIdentity(tag, parent, child) {
  return {
    childName: child ? child.name : (parent?.childName || ''),
    gender:    child ? child.gender : (parent?.childGender || ''),
    photo:     child ? child.photo : (parent?.childPhoto || ''),
    address:   child ? (child.address || parent?.address || '') : (parent?.address || ''),
    note:      child ? (child.emergencyNote || '') : (tag.emergencyNote || ''),
  };
}

// ── Finder Preview ────────────────────────────────────────────────────────────
function FinderPreview({ tag, parent, resolved }) {
  const vf = tag.visibleFields || {};
  const hasAny = vf.childName || vf.phones || vf.address || vf.emergencyNote;
  const showPhoto = vf.photo && resolved.photo;

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

        {vf.childName && resolved.childName ? (
          <View style={[styles.previewRow, styles.previewNameRow]}>
            <View style={styles.previewAvatar}>
              {showPhoto ? (
                <Image source={{ uri: resolved.photo }} style={styles.previewAvatarImg} />
              ) : (
                <Ionicons name={GENDER_ICON[resolved.gender] || 'person'} size={18} color="#93c5fd" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewRowLabel}>NAME</Text>
              <Text style={styles.previewRowValue}>{resolved.childName}</Text>
            </View>
          </View>
        ) : null}

        {vf.phones && parent?.primaryPhone ? (
          <View style={styles.previewCallBtn}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.previewCallText}>Call Family — {parent.primaryPhone}</Text>
            </View>
          </View>
        ) : null}

        {vf.phones && parent?.secondaryPhone ? (
          <Text style={styles.previewBackup}>Backup: {parent.secondaryPhone}</Text>
        ) : null}

        {vf.emergencyNote && resolved.note ? (
          <View style={styles.previewMedical}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="medkit" size={14} color={colors.warning} />
              <Text style={styles.previewMedicalLabel}>MEDICAL</Text>
            </View>
            <Text style={styles.previewMedicalText}>{resolved.note}</Text>
          </View>
        ) : null}

        {vf.address && resolved.address ? (
          <View style={styles.previewRow}>
            <Text style={styles.previewRowLabel}>ADDRESS</Text>
            <Text style={styles.previewRowValue}>{resolved.address}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── Inline field editor (guardian-level text fields only) ─────────────────────
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

// ── Emergency note: always inline-editable here, independent of assignment ────
// Always saves to the tag's own note (PUT .../settings), matching web's
// saveEmergencyNote — even though the *displayed* value prefers the assigned
// child's note when one exists (see resolveTagIdentity).
function EmergencyNoteEditor({ tagId, note, onSaved }) {
  const [draft, setDraft] = useState(note || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateTagSettings(tagId, undefined, draft.trim());
      onSaved(draft.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.ftValueSection}>
      <TextInput
        style={[styles.efInput, styles.efInputMulti]}
        value={draft}
        onChangeText={setDraft}
        placeholder="e.g. Peanut allergy. EpiPen in left jacket pocket."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={3}
        maxLength={300}
      />
      <View style={styles.efBtnRow}>
        <TouchableOpacity style={[styles.efSaveBtn, { flex: 0, paddingHorizontal: 18 }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.efSaveText}>Save Note</Text>}
        </TouchableOpacity>
        {saved && <Text style={styles.noteSaved}>✓ Saved</Text>}
      </View>
    </View>
  );
}

// ── Field toggle row (visibility + value + edit) ──────────────────────────────
function FieldToggleRow({ fieldCfg, isOn, onToggle, parent, resolved, hasChild, onSaveField, onSaveNote, onRoute, tagId }) {
  const routeButton = (
    <TouchableOpacity onPress={onRoute} style={styles.routeBtn}>
      <Text style={styles.routeBtnText}>Edit</Text>
    </TouchableOpacity>
  );

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

      <View style={!isOn ? styles.ftValueDimmed : null}>
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
        ) : fieldCfg.key === 'childName' ? (
          <View style={styles.ftValueSection}>
            <View style={styles.ftRouteRow}>
              <Text style={[styles.efValue, !resolved.childName && styles.efEmpty, { flex: 1 }]}>
                {resolved.childName || 'No name yet — add a child profile'}
              </Text>
              {routeButton}
            </View>
          </View>
        ) : fieldCfg.key === 'photo' ? (
          <View style={styles.ftValueSection}>
            <View style={styles.ftRouteRow}>
              {resolved.photo ? (
                <View style={styles.ftPhotoThumb}>
                  <Image source={{ uri: resolved.photo }} style={styles.ftPhotoThumbImg} />
                </View>
              ) : (
                <Text style={[styles.efValue, styles.efEmpty, { flex: 1 }]}>No photo yet</Text>
              )}
              {routeButton}
            </View>
          </View>
        ) : fieldCfg.key === 'address' ? (
          <View style={styles.ftValueSection}>
            <Text style={styles.ftValueLabel}>Current value</Text>
            {hasChild ? (
              <View style={styles.ftRouteRow}>
                <Text style={[styles.efValue, !resolved.address && styles.efEmpty, { flex: 1 }]}>
                  {resolved.address || 'No address on this child\'s profile'}
                </Text>
                {routeButton}
              </View>
            ) : (
              <EditableField
                label="Home Address"
                value={parent?.address}
                placeholder="Enter home address"
                onSave={(v) => onSaveField({ address: v })}
              />
            )}
          </View>
        ) : fieldCfg.key === 'emergencyNote' ? (
          <EmergencyNoteEditor tagId={tagId} note={resolved.note} onSaved={onSaveNote} />
        ) : null}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TagDetailScreen({ route, navigation }) {
  usePreventScreenCapture();
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
  const [childModalVisible, setChildModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [pwConfirm, setPwConfirm] = useState(null); // { kind: 'remove' | 'deactivate' }

  const visibleFields = tag.visibleFields || {
    childName: false, phones: false, address: false, emergencyNote: false, photo: false,
  };

  const child = tag.childId ? (parent?.children || []).find((c) => c._id === tag.childId) : null;
  const resolved = resolveTagIdentity(tag, parent, child);

  async function handleLostModeToggle() {
    const newVal = !tag.lostMode;
    Alert.alert(
      newVal ? 'Activate Lost Mode' : 'Deactivate Lost Mode',
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

  function handleStatusToggle() {
    if (tag.status === 'active') {
      // Deactivating removes finder protection — require the account password.
      setPwConfirm({ kind: 'deactivate' });
      return;
    }
    // Reactivating needs no password (matches backend: only status==='deactivated' is gated).
    reactivateTag();
  }

  async function reactivateTag() {
    setStatusLoading(true);
    try {
      await updateTag(tag.tagId, { status: 'active' });
      setTag((p) => ({ ...p, status: 'active' }));
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setStatusLoading(false);
    }
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

  function handleSaveNote(note) {
    setTag((p) => ({ ...p, emergencyNote: note }));
  }

  function handleEditRoute() {
    if (child) {
      setChildModalVisible(true);
    } else {
      setAssignModalVisible(true);
    }
  }

  function handleChildSaved(children) {
    updateParent({ children });
    setChildModalVisible(false);
  }

  function handleAssignSaved(updatedTag) {
    setTag((p) => ({ ...p, childId: updatedTag.childId || null }));
    setAssignModalVisible(false);
  }

  function handleDeleteTag() {
    // Goes straight to the password modal (which already states this is
    // permanent) rather than confirming twice — chaining a custom Modal open
    // from inside an Alert.alert callback is also flaky on iOS, where the new
    // modal's presentation can get dropped while the alert is still dismissing.
    setPwConfirm({ kind: 'remove' });
  }

  async function handlePasswordConfirm(password) {
    if (pwConfirm.kind === 'remove') {
      await deleteTag(tag.tagId, password);
      setPwConfirm(null);
      navigation.goBack();
    } else {
      await updateTag(tag.tagId, { status: 'deactivated', password });
      setTag((p) => ({ ...p, status: 'deactivated' }));
      setPwConfirm(null);
    }
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="alert-circle" size={13} color="#fff" />
                  <Text style={styles.lostBadgeText}>LOST</Text>
                </View>
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
            : <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ionicons name={isLost ? 'checkmark-circle' : 'alert-circle'} size={19} color="#fff" />
                <Text style={styles.lostButtonText}>
                  {isLost ? 'Child Found — Deactivate Lost Mode' : 'My Child Is Lost — Activate Now'}
                </Text>
              </View>
          }
        </TouchableOpacity>

        {/* ── Finder Preview ── */}
        <FinderPreview tag={tag} parent={parent} resolved={resolved} />

        {/* ── Assigned Child ── */}
        <TouchableOpacity style={styles.assignRow} onPress={() => setAssignModalVisible(true)}>
          <Ionicons name="people-outline" size={16} color={colors.primary} />
          <Text style={styles.assignRowText}>
            {child ? `Assigned to ${child.name}` : 'Not assigned to a child — tap to assign'}
          </Text>
          <Ionicons name="chevron-forward" size={15} color="#9ca3af" />
        </TouchableOpacity>

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
              resolved={resolved}
              hasChild={!!child}
              onSaveField={handleSaveField}
              onSaveNote={handleSaveNote}
              onRoute={handleEditRoute}
              tagId={tag.tagId}
            />
          ))}
        </View>

        {/* ── Scan History ── */}
        <TouchableOpacity
          style={styles.scanHistoryButton}
          onPress={() => navigation.navigate('ScanHistory', { tagId: tag.tagId })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="time-outline" size={17} color={colors.primary} />
            <Text style={styles.scanHistoryText}>View Scan History</Text>
          </View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.deleteButtonText}>Remove Tag from Account</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <DisclaimerModal
        visible={disclaimerVisible}
        fieldName={pendingField}
        onAgree={() => { setDisclaimerVisible(false); if (pendingField) { applyFieldToggle(pendingField, true); setPendingField(null); } }}
        onCancel={() => { setDisclaimerVisible(false); setPendingField(null); }}
      />

      <ChildFormModal
        visible={childModalVisible}
        child={child}
        onClose={() => setChildModalVisible(false)}
        onSaved={handleChildSaved}
      />

      <AssignChildModal
        visible={assignModalVisible}
        tagId={tag.tagId}
        currentChildId={tag.childId || null}
        onClose={() => setAssignModalVisible(false)}
        onSaved={handleAssignSaved}
      />

      <PasswordConfirmModal
        visible={!!pwConfirm}
        title={pwConfirm?.kind === 'remove' ? `Remove tag ${tag.tagId}?` : 'Deactivate this tag?'}
        body={
          pwConfirm?.kind === 'remove'
            ? 'This permanently removes the tag from your account. This cannot be undone.'
            : 'This tag will stop responding when scanned until reactivated.'
        }
        confirmLabel={pwConfirm?.kind === 'remove' ? 'Remove' : 'Deactivate'}
        onConfirm={handlePasswordConfirm}
        onCancel={() => setPwConfirm(null)}
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

  // Assigned-child row
  assignRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 14,
  },
  assignRowText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e3a8a' },

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
  previewNameRow: { alignItems: 'center', gap: 10, justifyContent: 'flex-start' },
  previewAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#dbeafe',
    borderWidth: 1.5, borderColor: '#93c5fd', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  previewAvatarImg: { width: '100%', height: '100%' },
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
  ftValueDimmed: { opacity: 0.45 },
  ftRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ftPhotoThumb: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe',
    borderWidth: 1.5, borderColor: '#93c5fd', overflow: 'hidden',
  },
  ftPhotoThumbImg: { width: '100%', height: '100%' },

  // Edit-elsewhere route button
  routeBtn: { paddingVertical: 4, paddingHorizontal: 10 },
  routeBtnText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },

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
  efBtnRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  efCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  efCancelText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  efSaveBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  efSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  noteSaved: { fontSize: 12, color: '#16a34a', fontWeight: '600' },

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
