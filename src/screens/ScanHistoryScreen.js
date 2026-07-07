import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTagScans, getErrorMessage } from '../api';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ScanRow({ log, index }) {
  const location =
    log.city && log.country
      ? `${log.city}, ${log.country}`
      : log.country || log.city || 'Unknown location';

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowNumber}>#{index + 1}</Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTopLine}>
          <Text style={styles.location}>{location}</Text>
          <Text style={styles.timeAgo}>{timeAgo(log.scannedAt)}</Text>
        </View>
        <Text style={styles.ip}>{log.ip || 'IP not recorded'}</Text>
        <Text style={styles.datetime}>{formatDateTime(log.scannedAt)}</Text>
        {log.lat && log.lon && (
          <Text style={styles.coords}>
            {parseFloat(log.lat).toFixed(4)}, {parseFloat(log.lon).toFixed(4)}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ScanHistoryScreen({ route }) {
  const { tagId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScans = useCallback(async () => {
    try {
      const result = await getTagScans(tagId);
      setData(result);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tagId]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  function onRefresh() {
    setRefreshing(true);
    fetchScans();
  }

  const logs = data?.logs
    ? [...data.logs].sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading scan history…</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => `${item.scannedAt}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <Text style={styles.tagIdText}>{tagId}</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryNumber}>{data?.scanCount ?? 0}</Text>
                  <Text style={styles.summaryLabel}>Total Scans</Text>
                </View>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryNumber}>{logs.length}</Text>
                  <Text style={styles.summaryLabel}>In Log</Text>
                </View>
              </View>
            </View>
          }
          renderItem={({ item, index }) => <ScanRow log={item} index={index} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📡</Text>
              <Text style={styles.emptyTitle}>No Scans Yet</Text>
              <Text style={styles.emptyBody}>
                When someone scans this tag, the event will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tagIdText: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 14,
  },
  summaryRow: { flexDirection: 'row', gap: 16 },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingVertical: 12,
  },
  summaryNumber: { fontSize: 28, fontWeight: '800', color: '#2563eb' },
  summaryLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 2 },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  rowLeft: {
    width: 36,
    alignItems: 'center',
    paddingTop: 2,
  },
  rowNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rowContent: { flex: 1 },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  location: { fontSize: 14, fontWeight: '700', color: '#111827' },
  timeAgo: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  ip: { fontSize: 12, color: '#6b7280', fontFamily: 'monospace', marginBottom: 2 },
  datetime: { fontSize: 11, color: '#9ca3af' },
  coords: { fontSize: 10, color: '#c4b5fd', fontFamily: 'monospace', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e3a8a', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
});
