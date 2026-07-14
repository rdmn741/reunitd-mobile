'use strict';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { updateTag, setLostMode, getErrorMessage } from '../api';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../AuthContext';

export default function TagCard({ tag: initialTag, onUpdate, onPress }) {
  const [tag, setTag] = useState(initialTag);
  const [labelEditing, setLabelEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(tag.label || '');
  const [labelSaving, setLabelSaving] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const { parent } = useAuth();

  // Web convention: lostMode=true → sharing ON (info visible), lostMode=false → hidden
  const sharingOn  = !!tag.lostMode;
  const isActive   = tag.status === 'active';
  const childName  = parent?.childName;

  function update(patch) {
    const updated = { ...tag, ...patch };
    setTag(updated);
    onUpdate?.(updated);
  }

  async function handleLabelSave() {
    setLabelSaving(true);
    try {
      await updateTag(tag.tagId, { label: labelDraft.trim() });
      update({ label: labelDraft.trim() });
      setLabelEditing(false);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLabelSaving(false);
    }
  }

  async function handlePrivacyToggle() {
    const newSharing = !sharingOn;
    setPrivacyLoading(true);
    try {
      await setLostMode(tag.tagId, newSharing);
      update({ lostMode: newSharing });
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setPrivacyLoading(false);
    }
  }

  function handleStatusToggle() {
    const newStatus = isActive ? 'inactive' : 'active';
    Alert.alert(
      isActive ? 'Deactivate Tag?' : 'Activate Tag?',
      isActive
        ? 'Tag will stop responding when scanned.'
        : 'Tag will become active and respond when scanned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActive ? 'Deactivate' : 'Activate',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            setStatusLoading(true);
            try {
              await updateTag(tag.tagId, { status: newStatus });
              update({ status: newStatus });
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

  return (
    <View style={[styles.card, isActive ? styles.cardActive : styles.cardInactive]}>

      {/* ── Top row: Tag ID + status ── */}
      <View style={styles.topRow}>
        <Text style={styles.tagId}>{tag.tagId}</Text>
        <View style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
            {isActive ? '● Active' : '○ Inactive'}
          </Text>
        </View>
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="happy-outline" size={15} color={colors.text} />
            <Text style={styles.actionBtnText}>Child</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { setLabelDraft(tag.label || ''); setLabelEditing(true); }}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="pencil-outline" size={14} color={colors.text} />
            <Text style={styles.actionBtnText}>Label</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionIconBtn} onPress={onPress} activeOpacity={0.75}>
          <Ionicons name="settings-outline" size={17} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDeactivate]}
          onPress={handleStatusToggle}
          disabled={statusLoading}
          activeOpacity={0.75}
        >
          {statusLoading
            ? <ActivityIndicator size="small" color="#dc2626" />
            : <Text style={[styles.actionBtnText, styles.actionBtnDeactivateText]}>
                {isActive ? 'Deactivate' : 'Activate'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Inline label editor ── */}
      {labelEditing && (
        <View style={styles.labelEditor}>
          <TextInput
            style={styles.labelInput}
            value={labelDraft}
            onChangeText={setLabelDraft}
            placeholder="e.g. Emma's Backpack"
            placeholderTextColor="#9ca3af"
            autoFocus
          />
          <View style={styles.labelBtnRow}>
            <TouchableOpacity style={styles.labelCancelBtn}
              onPress={() => { setLabelDraft(tag.label || ''); setLabelEditing(false); }}>
              <Text style={styles.labelCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.labelSaveBtn, labelSaving && { opacity: 0.6 }]}
              onPress={handleLabelSave} disabled={labelSaving}>
              {labelSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.labelSaveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Label + child badge ── */}
      {!labelEditing && (tag.label || childName) ? (
        <View style={styles.metaRow}>
          {tag.label ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="bookmark-outline" size={13} color={colors.muted} />
              <Text style={styles.metaLabel}>{tag.label}</Text>
            </View>
          ) : null}
          {childName ? (
            <View style={styles.childBadge}>
              <Text style={styles.childBadgeText}>{childName.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Privacy / Sharing toggle ── */}
      <View style={[styles.privacyRow, sharingOn && styles.privacyRowOn]}>
        <View style={styles.privacyLeft}>
          <Ionicons
            name={sharingOn ? 'eye-outline' : 'lock-closed'}
            size={18}
            color={sharingOn ? colors.warning : colors.success}
            style={{ marginRight: 8, marginTop: 2 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyLabel}>
              {sharingOn ? 'Privacy Mode — OFF (Info Visible)' : 'Privacy Mode — ON'}
            </Text>
            <Text style={styles.privacySub}>
              {sharingOn
                ? 'Finders can see your contact info now. Toggle ON to hide.'
                : 'Finders see a safe-message only. Toggle OFF to share info.'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.privacyToggle, sharingOn && styles.privacyToggleOn]}
          onPress={handlePrivacyToggle}
          disabled={privacyLoading || !isActive}
          activeOpacity={0.8}
        >
          {privacyLoading
            ? <ActivityIndicator size="small" color={sharingOn ? '#fff' : '#6b7280'} />
            : <View style={[styles.privacyThumb, sharingOn && styles.privacyThumbOn]} />
          }
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  cardActive:   { borderLeftWidth: 4, borderLeftColor: '#16a34a' },
  cardInactive: { borderLeftWidth: 4, borderLeftColor: '#d1d5db' },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  tagId: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 17,
    fontWeight: '800',
    color: '#1e3a8a',
    letterSpacing: 0.8,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeActive:   { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusTextActive:   { color: '#16a34a' },
  statusTextInactive: { color: '#9ca3af' },

  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  actionIconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  actionIconText: { fontSize: 13 },
  actionBtnDeactivate: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  actionBtnDeactivateText: { color: '#dc2626' },

  // Inline label editor
  labelEditor: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  labelInput: {
    borderWidth: 1.5,
    borderColor: '#c7d7ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f0f4ff',
    marginBottom: 8,
  },
  labelBtnRow: { flexDirection: 'row', gap: 8 },
  labelCancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  labelCancelText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  labelSaveBtn: {
    flex: 1, backgroundColor: '#2563eb', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  labelSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Meta row (label + child badge)
  metaRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  metaLabel: { fontSize: 13, color: '#6b7280' },
  childBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  childBadgeText: { fontSize: 12, fontWeight: '800', color: '#92400e', letterSpacing: 0.5 },

  // Privacy row
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fafafa',
    gap: 12,
  },
  privacyRowOn: { backgroundColor: '#fefce8', borderTopColor: '#fde68a' },
  privacyLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  privacyIcon: { fontSize: 18, marginTop: 1 },
  privacyLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  privacySub: { fontSize: 11, color: '#9ca3af', marginTop: 1, lineHeight: 15 },

  // Custom toggle
  privacyToggle: {
    width: 44, height: 26,
    borderRadius: 13,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    padding: 3,
    flexShrink: 0,
  },
  privacyToggleOn: { backgroundColor: '#16a34a' },
  privacyThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  privacyThumbOn: { alignSelf: 'flex-end' },
});
