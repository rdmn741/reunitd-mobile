import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { getTags, activateTag, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import TagCard from '../components/TagCard';

function StatsRow({ tags }) {
  const total = tags.length;
  const active = tags.filter((t) => t.status === 'active').length;
  const sharingCount = tags.filter((t) => t.lostMode).length;

  return (
    <View style={styles.statsRow}>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{total}</Text>
        <Text style={styles.statLabel}>Total Tags</Text>
      </View>
      <View style={[styles.statBox, styles.statBoxMiddle]}>
        <Text style={[styles.statNumber, { color: '#16a34a' }]}>{active}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={[styles.statNumber, sharingCount > 0 && { color: '#2563eb' }]}>
          {sharingCount}
        </Text>
        <Text style={styles.statLabel}>Sharing</Text>
      </View>
    </View>
  );
}

function ActivateModal({ visible, onClose, onSuccess }) {
  const [tagId, setTagId] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ocrHint, setOcrHint] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  function reset() {
    setTagId('');
    setActivationCode('');
    setLabel('');
    setOcrHint('');
  }

  function handleClose() {
    reset();
    setShowScanner(false);
    onClose();
  }

  async function openScanner() {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera Permission Needed', 'Please allow camera access to read your activation card.');
        return;
      }
    }
    setOcrHint('');
    setShowScanner(true);
  }

  async function handleCapture() {
    if (!cameraRef.current || processing) return;
    setProcessing(true);
    setOcrHint('Reading code…');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.92, skipProcessing: true });
      const result = await TextRecognition.recognize(photo.uri);

      // Collect all recognized text blocks
      const allText = result.blocks.map(b => b.text).join(' ').toUpperCase();

      // Match activation code: 4 chars – 4 chars (letters, digits, !@#)
      const codeMatch = allText.match(/[A-Z0-9!@#]{4}-[A-Z0-9!@#]{4}/);
      // Match Tag ID: exactly 8 uppercase alphanumeric chars as a word
      const tagMatch  = allText.match(/\b[A-Z][A-Z0-9]{7}\b/);

      if (codeMatch) {
        setActivationCode(codeMatch[0]);
        if (tagMatch && tagMatch[0].replace('-', '') !== codeMatch[0].replace('-', '')) {
          setTagId(tagMatch[0]);
        }
        setShowScanner(false);
        setOcrHint('');
      } else {
        setOcrHint('Code not found — move closer and try again');
      }
    } catch {
      setOcrHint('Could not read image — try again');
    } finally {
      setProcessing(false);
    }
  }

  async function handleActivate() {
    const trimTagId = tagId.trim().toUpperCase();
    const trimCode  = activationCode.trim();
    if (!trimTagId || !trimCode) {
      Alert.alert('Missing Fields', 'Tag ID and Activation Code are required.');
      return;
    }
    setLoading(true);
    try {
      await activateTag(trimTagId, trimCode, label.trim() || undefined);
      reset();
      onSuccess();
    } catch (err) {
      Alert.alert('Activation Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Full-screen OCR scanner ── */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerRoot}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
          />

          <SafeAreaView style={styles.scannerSafe}>
            {/* Top bar */}
            <View style={styles.scannerTopBar}>
              <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.scannerCloseBtn}>
                <Text style={styles.scannerCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Read Activation Code</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Viewfinder */}
            <View style={styles.scannerCenter}>
              <View style={styles.scannerFrame}>
                <View style={[styles.scannerCorner, styles.cornerTL]} />
                <View style={[styles.scannerCorner, styles.cornerTR]} />
                <View style={[styles.scannerCorner, styles.cornerBL]} />
                <View style={[styles.scannerCorner, styles.cornerBR]} />
              </View>
              <Text style={styles.scannerCodeLabel}>XXXX-XXXX</Text>
            </View>

            {/* Bottom: hint + capture button */}
            <View style={styles.scannerBottom}>
              <Text style={styles.scannerHint}>
                Frame the activation code, then tap Capture
              </Text>
              {ocrHint ? (
                <Text style={styles.scannerOcrHint}>{ocrHint}</Text>
              ) : (
                <Text style={styles.scannerSub}>From the card included in your package</Text>
              )}
              <TouchableOpacity
                style={[styles.captureBtn, processing && styles.captureBtnDisabled]}
                onPress={handleCapture}
                disabled={processing}
                activeOpacity={0.8}
              >
                {processing
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.captureBtnText}>📸  Capture</Text>
                }
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Activate bottom sheet ── */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalDragBar} />
            <Text style={styles.modalTitle}>Activate New Tag</Text>
            <Text style={styles.modalSubtitle}>
              Scan the QR code from your activation card, or enter the details manually.
            </Text>

            {/* Scan button */}
            <TouchableOpacity style={styles.scanQrButton} onPress={openScanner} activeOpacity={0.85}>
              <Text style={styles.scanQrIcon}>📷</Text>
              <View>
                <Text style={styles.scanQrLabel}>Scan Activation Code</Text>
                <Text style={styles.scanQrSub}>Camera reads the code from your card</Text>
              </View>
              <Text style={styles.scanQrArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.orDividerRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or enter manually</Text>
              <View style={styles.orLine} />
            </View>

            <Text style={styles.modalLabel}>Tag ID *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. A3B7K2M9"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              autoCorrect={false}
              value={tagId}
              onChangeText={(v) => setTagId(v.toUpperCase())}
            />

            <Text style={styles.modalLabel}>Activation Code *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. A2B3-C4D5"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              autoCorrect={false}
              value={activationCode}
              onChangeText={(v) => setActivationCode(v.toUpperCase())}
            />

            <Text style={styles.modalLabel}>Label (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Emma's Backpack"
              placeholderTextColor="#9ca3af"
              value={label}
              onChangeText={setLabel}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={handleClose}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActivateButton, loading && styles.disabledButton]}
                onPress={handleActivate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalActivateText}>Activate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

export default function DashboardScreen({ navigation }) {
  const { parent } = useAuth();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);

  const fetchTags = useCallback(async () => {
    try {
      const data = await getTags();
      setTags(data.tags || []);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  function onRefresh() {
    setRefreshing(true);
    fetchTags();
  }

  function handleTagPress(tag) {
    navigation.navigate('TagDetail', { tag });
  }

  function handleTagUpdate(updatedTag) {
    setTags((prev) =>
      prev.map((t) => (t.tagId === updatedTag.tagId ? updatedTag : t))
    );
  }

  function handleActivateSuccess() {
    setShowActivateModal(false);
    fetchTags();
  }

  const firstName = parent?.name?.split(' ')[0] || 'Parent';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
          <Text style={styles.headerSub}>Your reunItD Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowActivateModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Tag</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading tags…</Text>
        </View>
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(item) => item.tagId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          ListHeaderComponent={
            <>
              <StatsRow tags={tags} />
              {tags.length > 0 && (
                <Text style={styles.sectionTitle}>Your Tags</Text>
              )}
            </>
          }
          renderItem={({ item }) => (
            <TagCard
              tag={item}
              onPress={() => handleTagPress(item)}
              onUpdate={handleTagUpdate}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏷️</Text>
              <Text style={styles.emptyTitle}>No Tags Yet</Text>
              <Text style={styles.emptyBody}>
                Activate your first reunItD tag to start protecting your loved one.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowActivateModal(true)}
              >
                <Text style={styles.emptyButtonText}>Activate a Tag</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <ActivateModal
        visible={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        onSuccess={handleActivateSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: { fontSize: 20, fontWeight: '800', color: '#1e3a8a' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  centerLoader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 32 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statBox: { flex: 1, paddingVertical: 18, alignItems: 'center' },
  statBoxMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f0f0f0',
  },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#1e3a8a' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2, fontWeight: '600' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  emptyState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e3a8a', marginBottom: 8 },
  emptyBody: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
  },
  modalDragBar: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 18 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  modalActivateButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.6 },
  modalActivateText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // QR scan button
  scanQrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  scanQrIcon: { fontSize: 26 },
  scanQrLabel: { fontSize: 15, fontWeight: '700', color: '#1e40af' },
  scanQrSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  scanQrArrow: { marginLeft: 'auto', fontSize: 22, color: '#93c5fd', fontWeight: '300' },
  orDividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },

  // Scanner
  scannerRoot: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: { ...StyleSheet.absoluteFillObject },
  scannerSafe: { flex: 1 },
  scannerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  scannerCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  scannerCloseText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  scannerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  scannerCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  scannerFrame: {
    width: 220, height: 220,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 24, height: 24,
    borderColor: '#fff',
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scannerBottom: {
    paddingBottom: 48, paddingHorizontal: 32, alignItems: 'center', gap: 8,
  },
  scannerCodeLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  scannerHint: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  scannerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' },
  scannerOcrHint: {
    color: '#fbbf24', fontSize: 13, fontWeight: '600', textAlign: 'center',
  },
  captureBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 50,
    minWidth: 160,
    alignItems: 'center',
  },
  captureBtnDisabled: { opacity: 0.6 },
  captureBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
