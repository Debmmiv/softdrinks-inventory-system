import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchDiscrepanciesApi,
  resolveDiscrepancyApi,
  type DiscrepancyRecord,
  type DiscrepancyFilter,
} from '../../client/api/syncApi';
import { useSync } from '../../client/context/SyncContext';
import { formatStock } from '../../client/utils/calculations';
import { TRANSACTION_TYPE_LABELS } from '../../client/utils/constants';

/**
 * Owner Stock Discrepancy Review Screen (NFR13)
 * Lists transactions the server flagged CONCURRENCY_DEFICIT: two or more offline devices
 * released stock that, once combined, exceeded what the warehouse actually held.
 *
 * Resolution flow: count the shelf -> record a Count Correction in the Adjustment tab
 * so central stock is right again -> mark the discrepancy resolved here with a note.
 * The ledger entry is never edited; only its review status changes.
 */
export default function DiscrepanciesScreen() {
  const { isOnline } = useSync();

  const [filter, setFilter] = useState<DiscrepancyFilter>('open');
  const [items, setItems] = useState<DiscrepancyRecord[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [target, setTarget] = useState<DiscrepancyRecord | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (which: DiscrepancyFilter) => {
      if (!isOnline) {
        setLoading(false);
        return;
      }
      setLoadError(null);
      try {
        const res = await fetchDiscrepanciesApi(which);
        setItems(res.discrepancies);
        setOpenCount(res.open_count);
      } catch (err: any) {
        setLoadError(err?.response?.data?.error || 'Failed to load stock discrepancies.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isOnline]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(filter);
    }, [load, filter])
  );

  function switchFilter(next: DiscrepancyFilter) {
    if (next === filter) return;
    setFilter(next);
    setItems([]);
    setLoading(true);
  }

  function openResolve(item: DiscrepancyRecord) {
    setTarget(item);
    setNote('');
  }

  async function submitResolve() {
    if (!target) return;
    if (note.trim().length < 3) {
      Alert.alert('Note required', 'Describe what you found or did (at least 3 characters).');
      return;
    }
    setSaving(true);
    try {
      await resolveDiscrepancyApi(target.id, note.trim());
      setTarget(null);
      await load(filter);
    } catch (err: any) {
      Alert.alert('Could not resolve', err?.response?.data?.error || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!isOnline) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={36} color="#94A3B8" />
        <Text style={styles.emptyTitle}>You are offline</Text>
        <Text style={styles.emptyText}>Stock discrepancies are reviewed from the cloud. Reconnect to continue.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, filter === 'open' && styles.tabActive]}
          onPress={() => switchFilter('open')}
        >
          <Text style={[styles.tabText, filter === 'open' && styles.tabTextActive]}>
            Open{openCount > 0 ? ` (${openCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'resolved' && styles.tabActive]}
          onPress={() => switchFilter('resolved')}
        >
          <Text style={[styles.tabText, filter === 'resolved' && styles.tabTextActive]}>Resolved</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563EB" size="large" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(filter);
              }}
            />
          }
          ListHeaderComponent={
            loadError ? <Text style={styles.errorText}>{loadError}</Text> : undefined
          }
          ListEmptyComponent={
            !loadError ? (
              <View style={styles.centered}>
                <Ionicons name="checkmark-circle-outline" size={36} color="#16A34A" />
                <Text style={styles.emptyTitle}>
                  {filter === 'open' ? 'Nothing to review' : 'No resolved records yet'}
                </Text>
                {filter === 'open' && (
                  <Text style={styles.emptyText}>No concurrent releases have exceeded stock.</Text>
                )}
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <DiscrepancyCard item={item} onResolve={() => openResolve(item)} />
          )}
        />
      )}

      <Modal visible={target !== null} transparent animationType="fade" onRequestClose={() => setTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Resolve discrepancy</Text>
            {target?.product && target.product.current_stock_bottles < 0 && (
              <Text style={styles.warnText}>
                Central stock for this product is still {target.product.current_stock_bottles} bottles.
                Record a Count Correction in the Adjustment tab first.
              </Text>
            )}
            <Text style={styles.modalLabel}>What did you find or do?</Text>
            <TextInput
              style={styles.modalInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Counted 14 cases on shelf, corrected via Adjustment"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTarget(null)} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={submitResolve} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmText}>Mark resolved</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DiscrepancyCard({ item, onResolve }: { item: DiscrepancyRecord; onResolve: () => void }) {
  const resolved = item.status === 'RESOLVED';
  const upc = item.product?.units_per_case ?? 1;
  const current = item.product?.current_stock_bottles;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.product ? `${item.product.name} (${item.product.bottle_size})` : 'Unknown product'}
        </Text>
        <View style={[styles.pill, resolved ? styles.pillResolved : styles.pillOpen]}>
          <Text style={[styles.pillText, { color: resolved ? '#15803D' : '#B91C1C' }]}>
            {resolved ? 'Resolved' : 'Open'}
          </Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {TRANSACTION_TYPE_LABELS[item.transaction_type] ?? item.transaction_type} of{' '}
        {formatStock(Math.abs(item.total_bottles_delta), upc)} by{' '}
        {item.recorded_by?.full_name ?? 'unknown user'}
      </Text>
      <Text style={styles.meta}>Recorded {new Date(item.created_at).toLocaleString()}</Text>

      <View style={styles.stockRow}>
        <StockCell label="Device expected" value={item.device_expected_stock} />
        <StockCell label="Central after sync" value={item.stock_after_sync} danger />
        <StockCell label="Central now" value={current ?? null} danger={current !== undefined && current < 0} />
      </View>

      {item.note && <Text style={styles.note}>{item.note}</Text>}

      {resolved ? (
        <Text style={styles.resolution}>
          Resolved{item.resolved_by ? ` by ${item.resolved_by.full_name}` : ''}
          {item.resolved_at ? ` on ${new Date(item.resolved_at).toLocaleDateString()}` : ''}
          {item.resolution_note ? `: ${item.resolution_note}` : ''}
        </Text>
      ) : (
        <TouchableOpacity style={styles.resolveBtn} onPress={onResolve}>
          <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
          <Text style={styles.resolveText}>Resolve</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StockCell({ label, value, danger }: { label: string; value: number | null; danger?: boolean }) {
  return (
    <View style={styles.stockCell}>
      <Text style={styles.stockLabel}>{label}</Text>
      <Text style={[styles.stockValue, danger && value !== null && value < 0 && { color: '#DC2626' }]}>
        {value === null ? '—' : `${value}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  loader: { marginTop: 40 },
  tabs: { flexDirection: 'row', margin: 16, backgroundColor: '#E2E8F0', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#0F172A' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  errorText: { color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  productName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillOpen: { backgroundColor: '#FEE2E2' },
  pillResolved: { backgroundColor: '#DCFCE7' },
  pillText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12, color: '#64748B' },
  stockRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stockCell: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, padding: 8 },
  stockLabel: { fontSize: 10, color: '#64748B', marginBottom: 2 },
  stockValue: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  note: { fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 17 },
  resolution: { fontSize: 12, color: '#15803D', marginTop: 4, lineHeight: 17 },
  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 10, marginTop: 6,
  },
  resolveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, gap: 8 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  warnText: {
    fontSize: 12, color: '#92400E', backgroundColor: '#FEF3C7',
    padding: 8, borderRadius: 8, lineHeight: 17,
  },
  modalLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  modalInput: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10,
    minHeight: 72, textAlignVertical: 'top', color: '#0F172A', fontSize: 14,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelText: { color: '#334155', fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 8, backgroundColor: '#2563EB' },
  confirmText: { color: '#FFFFFF', fontWeight: '700' },
});
