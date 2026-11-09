import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../client/context/AuthContext';
import { useInventory } from '../../client/context/InventoryContext';
import { useSync } from '../../client/context/SyncContext';
import { formatStock } from '../../client/utils/calculations';
import type { Product } from '../../client/types/inventory';

/**
 * Dashboard / Home Screen (FR15, FR16, FR26, FR27, NFR1, NFR5)
 * Shows stock summary, low-stock alerts, real-time search, and quick-action buttons.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { products, lowStockProducts, isLoading, refresh, search } = useInventory();
  const { pendingCount, isOnline, syncNow } = useSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // FR27: Real-time search with debounce-like approach
  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const results = await search(text);
    setSearchResults(results);
    setSearching(false);
  }, [search]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isOnline) {
        await syncNow();
      } else {
        await refresh();
      }
    } finally {
      setRefreshing(false);
    }
  }, [isOnline, syncNow, refresh]);

  const displayList = searchQuery.trim() ? searchResults : products;

  return (
    <View style={styles.container}>
      {/* Offline / sync status banner */}
      <View style={[styles.statusBanner, isOnline ? styles.online : styles.offline]}>
        <Ionicons
          name={isOnline ? 'wifi' : 'wifi-outline'}
          size={14}
          color={isOnline ? '#16A34A' : '#DC2626'}
        />
        <Text style={[styles.statusText, { color: isOnline ? '#16A34A' : '#DC2626' }]}>
          {isOnline ? 'Online' : 'Offline'}
          {pendingCount > 0 && ` · ${pendingCount} pending sync`}
        </Text>
      </View>

      {/* Welcome + low-stock alert */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.full_name?.split(' ')[0]} 👋</Text>
          <Text style={styles.role}>{user?.role}</Text>
        </View>
        {lowStockProducts.length > 0 && (
          <View style={styles.alertBadge}>
            <Ionicons name="warning-outline" size={14} color="#DC2626" />
            <Text style={styles.alertText}>{lowStockProducts.length} low stock</Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.actionsRow}>
        <QuickAction label="Delivery" icon="archive-outline" color="#2563EB" onPress={() => navigation.navigate('delivery')} />
        <QuickAction label="Release" icon="exit-outline" color="#16A34A" onPress={() => navigation.navigate('release')} />
        <QuickAction label="Adjust" icon="swap-vertical-outline" color="#D97706" onPress={() => navigation.navigate('adjustment')} />
        <QuickAction label="History" icon="time-outline" color="#7C3AED" onPress={() => navigation.navigate('history')} />
      </View>

      {/* Real-time search bar (FR27) */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products…"
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
        {searching && <ActivityIndicator size="small" color="#2563EB" />}
      </View>

      {/* Product list */}
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color="#2563EB" size="large" />
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductCard product={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searchQuery ? 'No products match your search.' : 'No products found.'}
            </Text>
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function QuickAction({
  label, icon, color, onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.action, { borderColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProductCard({ product }: { product: Product }) {
  const stock = formatStock(product.local_stock_bottles, product.units_per_case);
  const isLow = product.local_stock_bottles <= product.reorder_threshold_bottles;

  return (
    <View style={[styles.card, isLow && styles.cardLow]}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardBrand}>{product.brand_name}</Text>
        <Text style={styles.cardName}>{product.product_name} · {product.bottle_size}</Text>
        {isLow && (
          <Text style={styles.lowLabel}>⚠ Low stock — reorder needed</Text>
        )}
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardStock}>{stock}</Text>
        <Text style={styles.cardPack}>{product.units_per_case} btls/case</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  online: { backgroundColor: '#DCFCE7' },
  offline: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '500' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  greeting: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  role: { fontSize: 12, color: '#64748B', textTransform: 'capitalize' },
  alertBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  alertText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  action: {
    alignItems: 'center', borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14, gap: 4,
  },
  actionLabel: { fontSize: 11, fontWeight: '600' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  loader: { marginTop: 48 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardLow: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  cardLeft: { flex: 1 },
  cardBrand: { fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginTop: 2 },
  lowLabel: { fontSize: 11, color: '#DC2626', marginTop: 4 },
  cardRight: { alignItems: 'flex-end' },
  cardStock: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  cardPack: { fontSize: 11, color: '#94A3B8' },
});
