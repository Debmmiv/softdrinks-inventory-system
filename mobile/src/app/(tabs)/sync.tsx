import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllQueueItems } from '../../client/database/transactionRepo';
import { useSync } from '../../client/context/SyncContext';
import { formatDisplayDate } from '../../client/utils/date';
import type { QueueItem } from '../../client/types/sync';

/**
 * Sync Queue & Status Screen (FR17, FR18, FR19, FR22, FR23, FR31, NFR2, NFR3, NFR4, NFR6)
 *
 * Full background sync control center:
 * - Displays live connectivity status (online / offline)
 * - Shows last synchronized timestamp
 * - Provides manual "Sync Now" action with real-time feedback
 * - Visualizes transactional outbox queue with status badges, retries, and errors
 */
export default function SyncScreen() {
  const { pendingCount, isOnline, isSyncing, lastSyncedAt, refreshPendingCount, syncNow } = useSync();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllQueueItems();
      setItems(rows);
      await refreshPendingCount();
    } catch (err) {
      console.warn('[SyncScreen] Failed loading queue items:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleManualSync() {
    if (!isOnline) {
      Alert.alert(
        'Offline',
        'Your device is currently offline. Transactions will sync automatically once an internet connection is detected.'
      );
      return;
    }

    try {
      const res = await syncNow();
      await load();

      if (res.success) {
        Alert.alert(
          'Sync Complete',
          res.syncedCount > 0
            ? `Successfully pushed ${res.syncedCount} transaction(s) to the cloud.`
            : 'Catalog is fully up to date. No pending transactions to upload.'
        );
      } else {
        Alert.alert(
          'Sync Issue',
          res.errorMessage ||
            `Failed to sync ${res.failedCount} transaction(s). They remain safely queued locally.`
        );
      }
    } catch (err) {
      Alert.alert('Sync Error', 'An unexpected error occurred while communicating with the server.');
    }
  }

  const pending = items.filter((i) => i.status === 'PENDING').length;
  const synced = items.filter((i) => i.status === 'SYNCED').length;
  const failed = items.filter((i) => i.status === 'FAILED').length;

  return (
    <View style={styles.container}>
      {/* Network Connectivity & Last Sync Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#16A34A' : '#DC2626' }]} />
          <Text style={styles.statusLabel}>
            {isOnline ? 'Online — Connected to Cloud' : 'Offline — Queuing Locally in SQLite'}
          </Text>
        </View>
        <Text style={styles.lastSyncText}>
          {lastSyncedAt
            ? `Last synchronized: ${formatDisplayDate(lastSyncedAt)}`
            : 'No cloud sync recorded yet on this device'}
        </Text>
      </View>

      {/* Transaction Queue Counter Badges */}
      <View style={styles.countsRow}>
        <CountBadge count={pending} label="Pending" color="#D97706" />
        <CountBadge count={synced} label="Synced" color="#16A34A" />
        <CountBadge count={failed} label="Failed" color="#DC2626" />
      </View>

      {/* Sync Action Button */}
      <TouchableOpacity
        style={[styles.syncBtn, (isSyncing || !isOnline) && styles.syncBtnDisabled]}
        disabled={isSyncing}
        onPress={handleManualSync}
        activeOpacity={0.8}
      >
        {isSyncing ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.syncBtnText}>Syncing with Cloud…</Text>
          </>
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.syncBtnText}>
              {isOnline ? 'Sync Now' : 'Device Offline (Queued)'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Outbox List Section */}
      <View style={styles.queueHeaderRow}>
        <Text style={styles.listHeader}>OUTBOX TRANSACTION QUEUE</Text>
        <TouchableOpacity onPress={load} style={styles.refreshIconBtn} hitSlop={10}>
          <Ionicons name="refresh" size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.queue_id)}
          renderItem={({ item }) => <QueueRow item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#94A3B8" />
              <Text style={styles.empty}>All local transactions are synchronized.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} colors={['#2563EB']} />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function CountBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <View style={[styles.countCard, { borderColor: color }]}>
      <Text style={[styles.countNum, { color }]}>{count}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function QueueRow({ item }: { item: QueueItem }) {
  const colorMap: Record<string, string> = {
    PENDING: '#D97706',
    SYNCING: '#2563EB',
    SYNCED: '#16A34A',
    FAILED: '#DC2626',
  };

  const statusColor = colorMap[item.status] || '#64748B';

  return (
    <View style={styles.queueRow}>
      <View style={[styles.statusPip, { backgroundColor: statusColor }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.queueTitleRow}>
          <Text style={styles.queueUuid} numberOfLines={1}>
            {item.transaction_uuid}
          </Text>
          <View style={[styles.statusTag, { backgroundColor: `${statusColor}1A` }]}>
            <Text style={[styles.statusTagText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.queueMeta}>
          Queued: {formatDisplayDate(item.queued_at)}
          {item.retry_count > 0 ? ` · Retries: ${item.retry_count}` : ''}
        </Text>

        {item.synced_at && (
          <Text style={styles.queueSyncedMeta}>
            Synced: {formatDisplayDate(item.synced_at)}
          </Text>
        )}

        {item.error_message && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
            <Text style={styles.queueError}>{item.error_message}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  lastSyncText: { fontSize: 12, color: '#64748B', marginTop: 6 },
  countsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  countCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  countNum: { fontSize: 24, fontWeight: '800' },
  countLabel: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listHeader: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 1 },
  refreshIconBtn: { padding: 4 },
  list: { paddingBottom: 32 },
  emptyContainer: { alignItems: 'center', marginTop: 48, gap: 10 },
  empty: { textAlign: 'center', color: '#94A3B8', fontSize: 14 },
  queueRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  statusPip: { width: 4, borderRadius: 2 },
  queueTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueUuid: { fontSize: 12, color: '#334155', fontFamily: 'monospace', flex: 1, marginRight: 8 },
  statusTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusTagText: { fontSize: 10, fontWeight: '700' },
  queueMeta: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  queueSyncedMeta: { fontSize: 11, color: '#16A34A', marginTop: 2 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  queueError: { fontSize: 11, color: '#DC2626', flex: 1 },
});
