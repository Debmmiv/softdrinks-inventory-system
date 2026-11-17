import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchReplenishmentApi,
  fetchSummaryApi,
  type ReplenishmentItem,
  type MovementRow,
  type SummaryParams,
} from '../../client/api/syncApi';
import { useSync } from '../../client/context/SyncContext';
import { formatStock } from '../../client/utils/calculations';
import { TRANSACTION_TYPE_LABELS } from '../../client/utils/constants';

/**
 * Owner Reports (FR25, FR26)
 * 1. Replenishment alerts: products at or below their reorder level and how far short they are.
 * 2. Movement summary: deliveries, releases and adjustments per product for a chosen period.
 *
 * Both reports come from the cloud database, so only stock that has been synced is counted,
 * and an internet connection is required.
 */

type Range = 'today' | '7d' | '30d' | 'all';
type TypeFilter = 'ALL' | 'DELIVERY' | 'RELEASE' | 'ADJUSTMENT';

const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
];

const TYPES: { key: TypeFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DELIVERY', label: 'Deliveries' },
  { key: 'RELEASE', label: 'Releases' },
  { key: 'ADJUSTMENT', label: 'Adjustments' },
];

const TYPE_COLORS: Record<string, string> = {
  DELIVERY: '#16A34A',
  RELEASE: '#2563EB',
  ADJUSTMENT: '#D97706',
};

function buildParams(range: Range, type: TypeFilter): SummaryParams {
  const params: SummaryParams = {};
  const now = new Date();
  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    params.start_date = start.toISOString();
  } else if (range === '7d' || range === '30d') {
    const days = range === '7d' ? 7 : 30;
    params.start_date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  }
  if (type !== 'ALL') params.type = type;
  return params;
}

function signedStock(row: MovementRow): string {
  const abs = Math.abs(row.total_bottles_delta);
  const text = formatStock(abs, row.units_per_case);
  if (row.total_bottles_delta === 0) return text;
  return `${row.total_bottles_delta > 0 ? '+' : '-'}${text}`;
}

export default function ReportsScreen() {
  const router = useRouter();
  const { isOnline } = useSync();

  const [range, setRange] = useState<Range>('7d');
  const [type, setType] = useState<TypeFilter>('ALL');
  const [replenishment, setReplenishment] = useState<ReplenishmentItem[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (r: Range, t: TypeFilter) => {
      if (!isOnline) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setError(null);
      try {
        const [rep, sum] = await Promise.all([fetchReplenishmentApi(), fetchSummaryApi(buildParams(r, t))]);
        setReplenishment(rep.replenishment);
        setMovements(sum.movements);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load reports.');
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
      load(range, type);
    }, [load, range, type])
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; rows: MovementRow[] }>();
    for (const row of movements) {
      const entry = map.get(row.product_id) ?? { name: row.product_name.trim(), rows: [] };
      entry.rows.push(row);
      map.set(row.product_id, entry);
    }
    return Array.from(map.entries());
  }, [movements]);

  const totalTransactions = movements.reduce((sum, m) => sum + m.transaction_count, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load(range, type);
          }}
          colors={['#2563EB']}
        />
      }
    >
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#92400E" />
          <Text style={styles.offlineText}>Reports need an internet connection.</Text>
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Demand Forecasting Shortcut */}
      <TouchableOpacity
        style={styles.forecastCard}
        onPress={() => router.push('/(owner)/forecast')}
        activeOpacity={0.7}
      >
        <View style={styles.forecastIconBg}>
          <Ionicons name="trending-up" size={20} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.forecastTitle}>Demand Forecasting</Text>
          <Text style={styles.forecastSubtitle}>Predict daily consumption & stockout dates</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>REPLENISHMENT ALERTS</Text>
      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginVertical: 16 }} />
      ) : replenishment.length === 0 ? (
        <View style={styles.okCard}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#16A34A" />
          <Text style={styles.okText}>All products are above their reorder level.</Text>
        </View>
      ) : (
        replenishment.map((item) => (
          <View key={item.product_id} style={styles.alertCard}>
            <Text style={styles.alertName}>
              {item.brand_name} {item.product_name} ({item.bottle_size})
            </Text>
            <Text style={styles.alertLine}>
              In stock:{' '}
              {item.current_stock_bottles < 0
                ? `${item.current_stock_bottles} bottles (deficit)`
                : formatStock(item.current_stock_bottles, item.units_per_case)}
            </Text>
            <Text style={styles.alertLine}>
              Reorder level: {formatStock(item.reorder_threshold_bottles, item.units_per_case)}
            </Text>
            <Text style={styles.alertDeficit}>Short by {item.deficit_display}</Text>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>STOCK MOVEMENT SUMMARY</Text>

      <View style={styles.chipRow}>
        {RANGES.map((r) => (
          <Chip key={r.key} label={r.label} active={range === r.key} onPress={() => setRange(r.key)} />
        ))}
      </View>
      <View style={styles.chipRow}>
        {TYPES.map((t) => (
          <Chip key={t.key} label={t.label} active={type === t.key} onPress={() => setType(t.key)} />
        ))}
      </View>

      {!loading && (
        <Text style={styles.totals}>
          {totalTransactions} synced transaction(s) across {grouped.length} product(s)
        </Text>
      )}

      {!loading && grouped.length === 0 && (
        <Text style={styles.empty}>No synced transactions for this period.</Text>
      )}

      {grouped.map(([productId, entry]) => (
        <View key={productId} style={styles.card}>
          <Text style={styles.cardTitle}>{entry.name}</Text>
          {entry.rows.map((row) => (
            <View key={`${productId}-${row.transaction_type}`} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: TYPE_COLORS[row.transaction_type] }]} />
              <Text style={styles.rowLabel}>
                {TRANSACTION_TYPE_LABELS[row.transaction_type]} ({row.transaction_count})
              </Text>
              <Text style={[styles.rowValue, { color: TYPE_COLORS[row.transaction_type] }]}>
                {signedStock(row)}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]} activeOpacity={0.8}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  offlineText: { flex: 1, fontSize: 12, color: '#92400E' },
  errorText: { color: '#DC2626', fontSize: 13, marginBottom: 10 },
  forecastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  forecastIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forecastTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  forecastSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 1, marginBottom: 10 },
  okCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  okText: { fontSize: 13, color: '#166534', flex: 1 },
  alertCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertName: { fontSize: 14, fontWeight: '700', color: '#7F1D1D' },
  alertLine: { fontSize: 12, color: '#991B1B', marginTop: 3 },
  alertDeficit: { fontSize: 13, fontWeight: '800', color: '#DC2626', marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#fff' },
  totals: { fontSize: 12, color: '#64748B', marginVertical: 8 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 24, fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: { flex: 1, fontSize: 13, color: '#334155' },
  rowValue: { fontSize: 13, fontWeight: '700' },
});
