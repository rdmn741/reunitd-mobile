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
import { getTags, getTagScans, getErrorMessage } from '../api';

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
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ScanNotificationRow({ item }) {
  const location =
    item.city && item.country
      ? `${item.city}, ${item.country}`
      : item.country || item.city || 'Unknown location';

  return (
    <View style={styles.row}>
      <View style={styles.iconContainer}>
        <Text style={styles.rowIcon}>📡</Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.tagId}>{item.tagId}</Text>
          <Text style={styles.timeAgo}>{timeAgo(item.scannedAt)}</Text>
        </View>
        <Text style={styles.location}>{location}</Text>
        <Text style={styles.ip}>{item.ip || 'IP not recorded'}</Text>
        <Text style={styles.datetime}>{formatDateTime(item.scannedAt)}</Text>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllScans = useCallback(async () => {
    try {
      const tagsData = await getTags();
      const tags = tagsData.tags || [];

      // Fetch scans for all tags in parallel
      const scanResults = await Promise.allSettled(
        tags.map((tag) => getTagScans(tag.tagId))
      );

      const allScans = [];
      scanResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const tagId = tags[idx].tagId;
          const logs = result.value.logs || [];
          logs.forEach((log) => {
            allScans.push({ ...log, tagId });
          });
        }
      });

      // Sort newest first
      allScans.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
      setScans(allScans);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllScans();
  }, [fetchAllScans]);

  function onRefresh() {
    setRefreshing(true);
    fetchAllScans();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Scan Activity</Text>
        <Text style={styles.headerSub}>All tags, newest first</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading scan activity…</Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item, index) => `${item.tagId}-${item.scannedAt}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          ListHeaderComponent={
            scans.length > 0 ? (
              <View style={styles.countBanner}>
                <Text style={styles.countText}>{scans.length} scan event{scans.length !== 1 ? 's' : ''} recorded</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => <ScanNotificationRow item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No Scan Activity</Text>
              <Text style={styles.emptyBody}>
                When someone scans one of your tags, it will appear here in real time.
              </Text>
              <Text style={styles.emptyTip}>
                Pull down to refresh
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
  headerBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e3a8a' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 40 },
  countBanner: {
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  countText: { fontSize: 13, fontWeight: '600', color: '#1e40af' },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  rowIcon: { fontSize: 22 },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tagId: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeAgo: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  location: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  ip: { fontSize: 12, color: '#6b7280', fontFamily: 'monospace', marginBottom: 2 },
  datetime: { fontSize: 11, color: '#9ca3af' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e3a8a', marginBottom: 8 },
  emptyBody: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  emptyTip: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
});
