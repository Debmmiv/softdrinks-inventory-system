import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { getAllTransactions } from '../../client/database/transactionRepo';
import { getAllActiveProducts } from '../../client/database/productRepo';
import { formatDisplayDate } from '../../client/utils/date';
import { TRANSACTION_TYPE_LABELS } from '../../client/utils/constants';
import type { Transaction } from '../../client/types/transaction';
import type { Product } from '../../client/types/inventory';

/**
 * Transaction History Screen (FR24, FR30, NFR1, NFR2, NFR12)
 * Read-only, immutable audit log. No editing or deletion is possible.
 */
export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [txs, prods] = await Promise.all([
        getAllTransactions(),
        getAllActiveProducts(),
      ]);
      setTransactions(txs);
      setProducts(Object.fromEntries(prods.map((p) => [p.id, p])));
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} size="large" color="#2563EB" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(t) => t.uuid}
        renderItem={({ item }) => <TxRow tx={item} product={products[item.product_id]} />}
        ListEmptyComponent={<Text style={styles.empty}>No transactions recorded yet.</Text>}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

function TxRow({ tx, product }: { tx: Transaction; product?: Product }) {
  const isDelivery = tx.transaction_type === 'DELIVERY';
  const isRelease = tx.transaction_type === 'RELEASE';
  const deltaSign = tx.total_bottles_delta >= 0 ? '+' : '';
  const color = isDelivery ? '#2563EB' : isRelease ? '#DC2626' : '#D97706';

  return (
    <View style={styles.card}>
      <View style={[styles.typeDot, { backgroundColor: color }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.type, { color }]}>
            {TRANSACTION_TYPE_LABELS[tx.transaction_type]}
          </Text>
          <Text style={styles.date}>{formatDisplayDate(tx.created_at)}</Text>
        </View>
        <Text style={styles.product}>
          {product ? `${product.brand_name} ${product.product_name} · ${product.bottle_size}` : tx.product_id}
        </Text>
        <Text style={styles.delta}>
          {deltaSign}{tx.total_bottles_delta} bottles → {tx.resulting_stock_bottles} remaining
        </Text>
        {tx.reason && <Text style={styles.meta}>Reason: {tx.reason}</Text>}
        {tx.reference_tag && <Text style={styles.meta}>Ref: {tx.reference_tag}</Text>}
        {tx.remarks && <Text style={styles.meta}>Note: {tx.remarks}</Text>}
        <Text style={styles.uuid} numberOfLines={1}>ID: {tx.uuid}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 48 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  typeDot: { width: 4, borderRadius: 2, marginRight: 12 },
  content: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  date: { fontSize: 11, color: '#94A3B8' },
  product: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginTop: 3 },
  delta: { fontSize: 13, color: '#334155', marginTop: 3 },
  meta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  uuid: { fontSize: 10, color: '#CBD5E1', marginTop: 4 },
});
