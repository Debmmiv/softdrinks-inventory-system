import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllQueueItems } from '../../client/database/transactionRepo';
import { useSync } from '../../client/context/SyncContext';
import { formatDisplayDate } from '../../client/utils/date';
import type { QueueItem } from '../../client/types/sync';

/**
 * Sync Queue & Status Screen (FR17, FR18, FR19, FR22, FR23, FR31, NFR2, NFR3, NFR4, NFR6)
 *
 * Phase 1: Read-only view of the SQLite sync_queue. Shows PENDING counts.
 * Phase 3: "Sync Now" button will trigger the actual network upload to MongoDB.
 */
export default function SyncScreen() {
  const { pendingCount, isOnline, refreshPendingCount } = useSync();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const rows = await getAllQueueItems();
    setItems(rows);
    await refreshPendingCount();
    setLoading(false);
  }

  const pending = items.filter((i) => i.status === 'PENDING').length;
  const synced = items.filter((i) => i.status === 'SYNCED').length;
  const failed = items.filter((i) => i.status === 'FAILED').length;

  return (
    <View style={styles.container}>
      {/* Status summary */}
      <View style={styles.statusCard}>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#16A34A' : '#DC2626' }]} />
        <Text style={styles.statusLabel}>{isOnline ? 'Online' : 'Offline (Phase 3 wires sync)'}</Text>
      </View>

      <View style={styles.countsRow}>
        <CountBadge count={pending} label="Pending" color="#D97706" />
        <CountBadge count={synced} label="Synced" color="#16A34A" />
        <CountBadge count={failed} label="Failed" color="#DC2626" />
      </View>

      <TouchableOpacity
        style={[styles.syncBtn, !isOnline && styles.syncBtnDisabled]}
        disabled={!isOnline}
        onPress={() => Alert.alert('Coming in Phase 3', 'Sync engine will be wired in Phase 3.')}
      >
        <Ionicons name="sync-outline" size={18} color="#fff" />
        <Text style={styles.syncBtnText}>Sync Now</Text>
      </TouchableOpacity>

      <Text style={styles.listHeader}>TRANSACTION QUEUE</Text>

      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.queue_id)}
          renderItem={({ item }) => <QueueRow item={item} />}
          ListEmptyComponent={<Text style={styles.empty}>No transactions in queue.</Text>}
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
    PENDING: '#D97706', SYNCING: '#2563EB', SYNCED: '#16A34A', FAILED: '#DC2626',
  };
  return (
    <View style={styles.queueRow}>
      <View style={[styles.statusPip, { backgroundColor: colorMap[item.status] }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.queueUuid} numberOfLines={1}>{item.transaction_uuid}</Text>
        <Text style={styles.queueMeta}>
          {item.status} · Queued {formatDisplayDate(item.queued_at)}
          {item.retry_count > 0 ? ` · Retries: ${item.retry_count}` : ''}
        </Text>
        {item.error_message && (
          <Text style={styles.queueError}>{item.error_message}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  countsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  countCard: { flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1.5 },
  countNum: { fontSize: 24, fontWeight: '800' },
  countLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563EB', borderRadius: 10, padding: 14, marginBottom: 20 },
  syncBtnDisabled: { opacity: 0.4 },
  syncBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  listHeader: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 1, marginBottom: 10 },
  list: { paddingBottom: 32 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  queueRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  statusPip: { width: 4, borderRadius: 2 },
  queueUuid: { fontSize: 12, color: '#334155', fontFamily: 'monospace' },
  queueMeta: { fontSize: 11, color: '#94A3B8', marginTop: 3 },
  queueError: { fontSize: 11, color: '#DC2626', marginTop: 3 },
});
