import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../client/context/AuthContext';
import { useInventory } from '../../client/context/InventoryContext';
import { useSync } from '../../client/context/SyncContext';
import { recordTransaction } from '../../client/database/transactionRepo';
import { getProductById } from '../../client/database/productRepo';
import { toTotalBottles, formatStock, isValidQuantity } from '../../client/utils/calculations';

/**
 * Record Delivery Screen (FR11, FR15, FR16, FR17, FR30, NFR1, NFR5, NFR12)
 *
 * Staff enter cases + loose bottles received from a supplier.
 * Total bottles are calculated automatically, stock is incremented in SQLite,
 * and the transaction is queued as PENDING for later sync to MongoDB.
 */
export default function DeliveryScreen() {
  const { user, deviceId } = useAuth();
  const { products, refresh } = useInventory();
  const { refreshPendingCount } = useSync();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [cases, setCases] = useState('');
  const [looseBottles, setLooseBottles] = useState('');
  const [referenceTag, setReferenceTag] = useState(''); // FR30: Supplier DR / Waybill
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const casesNum = parseInt(cases) || 0;
  const looseNum = parseInt(looseBottles) || 0;
  const totalBottles = selectedProduct
    ? toTotalBottles(casesNum, looseNum, selectedProduct.units_per_case)
    : 0;

  async function handleSubmit() {
    if (!selectedProductId) {
      Alert.alert('Required', 'Please select a product.');
      return;
    }
    if (!isValidQuantity(casesNum, looseNum)) {
      Alert.alert('Invalid Quantity', 'Enter at least 1 case or 1 bottle.');
      return;
    }

    setSubmitting(true);
    try {
      const product = await getProductById(selectedProductId);
      if (!product) throw new Error('Product not found');

      await recordTransaction(
        {
          product_id: selectedProductId,
          transaction_type: 'DELIVERY',
          cases: casesNum,
          loose_bottles: looseNum,
          reference_tag: referenceTag.trim() || undefined,
        },
        product.local_stock_bottles,
        product.units_per_case,
        user!.id,
        deviceId!
      );

      await Promise.all([refresh(), refreshPendingCount()]);

      // Reset form
      setCases('');
      setLooseBottles('');
      setReferenceTag('');
      setSelectedProductId('');

      Alert.alert(
        'Delivery Recorded ✓',
        `Added ${formatStock(totalBottles, product.units_per_case)} of ${product.brand_name} ${product.product_name}.`
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to record delivery. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>SELECT PRODUCT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {products.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, selectedProductId === p.id && styles.chipSelected]}
            onPress={() => setSelectedProductId(p.id)}
          >
            <Text style={[styles.chipText, selectedProductId === p.id && styles.chipTextSelected]}>
              {p.brand_name} {p.product_name} · {p.bottle_size}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedProduct && (
        <View style={styles.stockInfo}>
          <Text style={styles.stockInfoText}>
            Current stock: {formatStock(selectedProduct.local_stock_bottles, selectedProduct.units_per_case)}
          </Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>QUANTITY RECEIVED</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cases</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="0"
            value={cases}
            onChangeText={setCases}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Loose Bottles</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="0"
            value={looseBottles}
            onChangeText={setLooseBottles}
          />
        </View>
      </View>

      {selectedProduct && totalBottles > 0 && (
        <Text style={styles.totalCalc}>
          = {totalBottles} bottles total ({formatStock(totalBottles, selectedProduct.units_per_case)})
        </Text>
      )}

      <Text style={styles.sectionLabel}>SUPPLIER REFERENCE (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="DR #, Waybill # or Supplier name"
        value={referenceTag}
        onChangeText={setReferenceTag}
      />

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Record Delivery</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 13, color: '#334155' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  stockInfo: {
    backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginTop: 8,
  },
  stockInfoText: { color: '#1D4ED8', fontSize: 13 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    padding: 14, fontSize: 16, backgroundColor: '#fff', color: '#0F172A',
    marginBottom: 4,
  },
  totalCalc: { color: '#16A34A', fontWeight: '600', fontSize: 14, marginTop: 6, marginBottom: 4 },
  button: {
    backgroundColor: '#2563EB', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 24, marginBottom: 40,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
