import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../../client/context/InventoryContext';
import { formatStock } from '../../client/utils/calculations';
import type { Product } from '../../client/types/inventory';

/**
 * Product Catalog Screen (FR8, FR15, FR16, FR27, NFR1)
 * Searchable list of all active products with current stock, bottle size, and pack info.
 */
export default function CatalogScreen() {
  const { products, isLoading, search } = useInventory();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!text.trim()) { setResults([]); return; }
    setSearching(true);
    setResults(await search(text));
    setSearching(false);
  }, [search]);

  const list = query.trim() ? results : products;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search brand or product name…"
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={handleSearch}
        />
        {searching && <ActivityIndicator size="small" color="#2563EB" />}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color="#2563EB" size="large" />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <CatalogRow product={item} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query ? 'No matches found.' : 'No products in catalog.'}
            </Text>
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function CatalogRow({ product: p }: { product: Product }) {
  const stock = formatStock(p.local_stock_bottles, p.units_per_case);
  const isLow = p.local_stock_bottles <= p.reorder_threshold_bottles;
  return (
    <View style={[styles.row, isLow && styles.rowLow]}>
      <View style={styles.left}>
        <Text style={styles.brand}>{p.brand_name}</Text>
        <Text style={styles.name}>{p.product_name} · {p.bottle_size}</Text>
        <Text style={styles.meta}>{p.units_per_case} bottles/case · Reorder at {p.reorder_threshold_bottles} btls</Text>
        {isLow && <Text style={styles.lowTag}>⚠ LOW STOCK</Text>}
      </View>
      <View style={styles.right}>
        <Text style={styles.stock}>{stock}</Text>
        <Text style={styles.rawBottles}>{p.local_stock_bottles} bottles</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', margin: 16, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  row: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  rowLow: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  left: { flex: 1 },
  brand: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginTop: 2 },
  meta: { fontSize: 11, color: '#94A3B8', marginTop: 3 },
  lowTag: { fontSize: 11, color: '#DC2626', fontWeight: '700', marginTop: 4 },
  right: { alignItems: 'flex-end', justifyContent: 'center' },
  stock: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  rawBottles: { fontSize: 11, color: '#94A3B8' },
});
