import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getNotifications, markAllNotificationsRead, getErrorMessage } from '../api';
import { useNotifications } from '../NotificationsContext';

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

function NotificationRow({ item }) {
  const isFound = item.type === 'found_alert';
  return (
    <View style={[styles.row, !item.read && styles.rowUnread]}>
      <View style={[styles.iconContainer, isFound && styles.iconContainerAlert]}>
        <Ionicons
          name={isFound ? 'alert-circle' : 'radio-outline'}
          size={20}
          color={isFound ? colors.danger : colors.primary}
        />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          {item.tagId ? <Text style={styles.tagId}>{item.tagId}</Text> : <View />}
          <Text style={styles.timeAgo}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.datetime}>{formatDateTime(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </View>
  );
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { refreshUnreadCount } = useNotifications();

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Snapshot the unread state on load (so this viewing still shows what was
  // new), then mark everything read server-side and clear the tab badge.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        await load();
        if (cancelled) return;
        try {
          await markAllNotificationsRead();
          refreshUnreadCount();
        } catch (_) {
          // Non-fatal — the list itself loaded fine, badge will just retry next visit.
        }
      })();
      return () => { cancelled = true; };
    }, [load, refreshUnreadCount])
  );

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSub}>Scans and found alerts, newest first</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading notifications…</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          renderItem={({ item }) => <NotificationRow item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={44} color={colors.faint} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyBody}>
                When someone scans one of your tags, it will appear here.
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  rowUnread: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
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
  iconContainerAlert: { backgroundColor: '#fee2e2' },
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
  title: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  body: { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 4 },
  datetime: { fontSize: 11, color: '#9ca3af' },
  unreadDot: {
    width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger,
    marginLeft: 8, marginTop: 6, flexShrink: 0,
  },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
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
