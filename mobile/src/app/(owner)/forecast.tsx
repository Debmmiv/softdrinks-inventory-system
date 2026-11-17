import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchForecastApi,
  type ForecastItem,
} from '../../client/api/syncApi';
import { useSync } from '../../client/context/SyncContext';
import { formatStock } from '../../client/utils/calculations';

/**
 * Demand Forecasting Screen
 * Analyzes historical release data to predict:
 * - Average daily consumption per product
 * - Days until stockout
 * - Recommended reorder date
 * - Demand trend (rising/stable/falling)
 *
 * Owner only. Requires internet (data from MongoDB Atlas).
 */

type Lookback = 7 | 14 | 30 | 60 | 90;

const LOOKBACKS: { key: Lookback; label: string }[] = [
  { key: 7, label: '7 days' },
  { key: 14, label: '14 days' },
  { key: 30, label: '30 days' },
  { key: 60, label: '60 days' },
  { key: 90, label: '90 days' },
];

const URGENCY_CONFIG = {
  critical: { bg: '#FEE2E2', border: '#FECACA', text: '#991B1B', label: 'CRITICAL', icon: 'alert-circle' as const },
  warning:  { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E', label: 'WARNING', icon: 'warning' as const },
  ok:       { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', label: 'OK', icon: 'checkmark-circle' as const },
  overstocked: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', label: 'OVERSTOCKED', icon: 'layers' as const },
};

const TREND_CONFIG = {
  rising:  { icon: 'trending-up' as const, color: '#DC2626', label: 'Rising' },
  falling: { icon: 'trending-down' as const, color: '#16A34A', label: 'Falling' },
  stable:  { icon: 'remove' as const, color: '#64748B', label: 'Stable' },
  no_data: { icon: 'help-circle-outline' as const, color: '#94A3B8', label: 'No data' },
};

export default function ForecastScreen() {
  const { isOnline } = useSync();

  const [lookback, setLookback] = useState<Lookback>(30);
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [criticalCount, setCriticalCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (days: Lookback) => {
      if (!isOnline) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setError(null);
      try {
        const res = await fetchForecastApi(days);
        setForecasts(res.forecasts);
        setCriticalCount(res.critical_count);
        setWarningCount(res.warning_count);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load forecast.');
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
      load(lookback);
    }, [load, lookback])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load(lookback);
          }}
          colors={['#2563EB']}
        />
      }
    >
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#92400E" />
          <Text style={styles.offlineText}>Forecasting needs an internet connection.</Text>
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Summary Cards */}
      {!loading && (
        <View style={styles.summaryRow}>
          <SummaryCard
            icon="alert-circle"
            count={criticalCount}
            label="Critical"
            color="#DC2626"
            bg="#FEE2E2"
          />
          <SummaryCard
            icon="warning"
            count={warningCount}
            label="Warning"
            color="#D97706"
            bg="#FEF3C7"
          />
          <SummaryCard
            icon="checkmark-circle"
            count={forecasts.filter((f) => f.urgency === 'ok').length}
            label="OK"
            color="#16A34A"
            bg="#F0FDF4"
          />
        </View>
      )}

      {/* Lookback Selector */}
      <Text style={styles.sectionTitle}>ANALYSIS PERIOD</Text>
      <View style={styles.chipRow}>
        {LOOKBACKS.map((lb) => (
          <Chip
            key={lb.key}
            label={lb.label}
            active={lookback === lb.key}
            onPress={() => setLookback(lb.key)}
          />
        ))}
      </View>

      {/* Forecast Cards */}
      <Text style={styles.sectionTitle}>PRODUCT FORECASTS</Text>

      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginVertical: 24 }} />
      ) : forecasts.length === 0 ? (
        <Text style={styles.empty}>No active products found.</Text>
      ) : (
        forecasts.map((item) => <ForecastCard key={item.product_id} item={item} />)
      )}
    </ScrollView>
  );
}

function SummaryCard({
  icon,
  count,
  label,
  color,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.summaryCount, { color }]}>{count}</Text>
      <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
    </View>
  );
}

function ForecastCard({ item }: { item: ForecastItem }) {
  const urgency = URGENCY_CONFIG[item.urgency];
  const trend = TREND_CONFIG[item.trend];

  const stockDisplay = formatStock(
    Math.max(0, item.current_stock_bottles),
    item.units_per_case
  );

  const stockoutText =
    item.days_until_stockout >= 999
      ? 'No stockout risk'
      : item.days_until_stockout <= 0
        ? 'OUT OF STOCK'
        : item.days_until_stockout === 1
          ? '~1 day left'
          : `~${item.days_until_stockout} days left`;

  // Mini bar for weekly demand trend
  const weeklyMax = Math.max(...(item.weekly_demand.length > 0 ? item.weekly_demand : [1]));

  return (
    <View style={[styles.card, { borderColor: urgency.border }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>
            {item.brand_name} {item.product_name}
          </Text>
          <Text style={styles.cardSubtitle}>{item.bottle_size}</Text>
        </View>
        <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
          <Ionicons name={urgency.icon} size={12} color={urgency.text} />
          <Text style={[styles.urgencyText, { color: urgency.text }]}>{urgency.label}</Text>
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsRow}>
        <MetricBox label="Current Stock" value={stockDisplay} />
        <MetricBox label="Avg. Daily Demand" value={item.avg_daily_display} />
      </View>

      <View style={styles.metricsRow}>
        <MetricBox
          label="Days to Stockout"
          value={stockoutText}
          valueColor={item.days_until_stockout <= 3 ? '#DC2626' : item.days_until_stockout <= 7 ? '#D97706' : '#0F172A'}
        />
        <MetricBox
          label="Reorder By"
          value={item.reorder_date ?? '—'}
          valueColor={item.days_until_reorder <= 3 ? '#DC2626' : '#0F172A'}
        />
      </View>

      {/* Trend + Weekly Mini Chart */}
      <View style={styles.trendRow}>
        <Ionicons name={trend.icon} size={16} color={trend.color} />
        <Text style={[styles.trendText, { color: trend.color }]}>Demand {trend.label}</Text>
        {item.weekly_demand.length > 0 && (
          <View style={styles.miniChart}>
            {item.weekly_demand.map((val, idx) => (
              <View
                key={idx}
                style={[
                  styles.miniBar,
                  {
                    height: Math.max(3, (val / weeklyMax) * 20),
                    backgroundColor: trend.color,
                    opacity: 0.3 + (idx / item.weekly_demand.length) * 0.7,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Release Stats Footer */}
      <Text style={styles.cardFooter}>
        {item.release_count} release{item.release_count !== 1 ? 's' : ''} •{' '}
        {formatStock(item.total_released_bottles, item.units_per_case)} total released
      </Text>
    </View>
  );
}

function MetricBox({
  label,
  value,
  valueColor = '#0F172A',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  summaryCount: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '600' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
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
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 24, fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cardSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
  },
  metricLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  metricValue: { fontSize: 13, fontWeight: '700' },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  trendText: { fontSize: 12, fontWeight: '600' },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginLeft: 'auto',
    height: 20,
  },
  miniBar: {
    width: 6,
    borderRadius: 2,
  },
  cardFooter: {
    fontSize: 11,
    color: '#94A3B8',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
});
