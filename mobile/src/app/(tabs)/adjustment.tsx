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
import { ADJUSTMENT_REASONS } from '../../client/utils/constants';
import type { AdjustmentReason } from '../../client/types/transaction';

/**
 * Stock Adjustment Screen (FR14, FR15, FR16, FR17, NFR1, NFR5, NFR12)
 *
 * Records positive or negative adjustments due to breakage, damage, loss, or count corrections.
 * A mandatory reason must be selected before submission.
 * adjustment_direction: '+' = stock gain (found extra), '-' = stock loss (breakage etc.)
 */
export default function AdjustmentScreen() {
  const { user, deviceId } = useAuth();
  const { products, refresh } = useInventory();
  const { refreshPendingCount } = useSync();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [cases, setCases] = useState('');
  const [looseBottles, setLooseBottles] = useState('');
  const [reason, setReason] = useState<AdjustmentReason | ''>('');
  const [direction, setDirection] = useState<'+' | '-'>('-');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const casesNum = parseInt(cases) || 0;
  const looseNum = parseInt(looseBottles) || 0;
  const bottleCount = selectedProduct
    ? toTotalBottles(casesNum, looseNum, selectedProduct.units_per_case)
    : 0;
  const signedDelta = direction === '+' ? bottleCount : -bottleCount;

  async function handleSubmit() {
    if (!selectedProductId) { Alert.alert('Required', 'Please select a product.'); return; }
    if (!reason) { Alert.alert('Required', 'Please select an adjustment reason.'); return; }
    if (!isValidQuantity(casesNum, looseNum)) { Alert.alert('Invalid', 'Enter at least 1 case or 1 bottle.'); return; }

    const product = await getProductById(selectedProductId);
    if (!product) return;

    const newStock = product.local_stock_bottles + signedDelta;
    if (newStock < 0) {
      Alert.alert(
        'Invalid Adjustment',
        `This would result in negative stock (${newStock} bottles). Adjust the quantity.`
      );
      return;
    }

    setSubmitting(true);
    try {
      // For adjustments: pass signed cases/bottles via total_bottles_delta
      // The repo calculates the final delta from the direction we pass
      await recordTransaction(
        {
          product_id: selectedProductId,
          transaction_type: 'ADJUSTMENT',
          cases: direction === '+' ? casesNum : -casesNum,
          loose_bottles: direction === '+' ? looseNum : -looseNum,
          reason,
          remarks: remarks.trim() || undefined,
        },
        product.local_stock_bottles,
        product.units_per_case,
        user!.id,
        deviceId!
      );

      await Promise.all([refresh(), refreshPendingCount()]);
      setCases(''); setLooseBottles(''); setReason(''); setRemarks(''); setSelectedProductId('');

      Alert.alert(
        'Adjustment Recorded ✓',
        `${direction === '+' ? '+' : '-'}${formatStock(bottleCount, product.units_per_case)} adjusted for ${product.brand_name} ${product.product_name}.`
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to record adjustment.'); console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>SELECT PRODUCT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {products.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, selectedProductId === p.id && styles.chipSelected]}
            onPress={() => setSelectedProductId(p.id)}
          >
            <Text style={[styles.chipText, selectedProductId === p.id && styles.chipTextSel]}>
              {p.brand_name} {p.product_name} · {p.bottle_size}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>ADJUSTMENT DIRECTION</Text>
      <View style={styles.dirRow}>
        {(['+', '-'] as const).map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.dirBtn, direction === d && styles.dirBtnActive]}
            onPress={() => setDirection(d)}
          >
            <Text style={[styles.dirBtnText, direction === d && styles.dirBtnTextActive]}>
              {d === '+' ? '+ Add Stock (found/returned)' : '− Remove Stock (breakage/loss)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>QUANTITY</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cases</Text>
          <TextInput style={styles.input} keyboardType="number-pad" placeholder="0" value={cases} onChangeText={setCases} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Loose Bottles</Text>
          <TextInput style={styles.input} keyboardType="number-pad" placeholder="0" value={looseBottles} onChangeText={setLooseBottles} />
        </View>
      </View>
      {selectedProduct && bottleCount > 0 && (
        <Text style={[styles.calcText, direction === '-' && styles.calcNeg]}>
          {direction}{bottleCount} bottles ({formatStock(bottleCount, selectedProduct.units_per_case)})
        </Text>
      )}

      <Text style={styles.sectionLabel}>REASON (required)</Text>
      <View style={styles.reasons}>
        {ADJUSTMENT_REASONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.reasonBtn, reason === r.value && styles.reasonBtnActive]}
            onPress={() => setReason(r.value)}
          >
            <Text style={[styles.reasonText, reason === r.value && styles.reasonTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>REMARKS (optional)</Text>
      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
        multiline
        placeholder="Extra details about this adjustment…"
        value={remarks}
        onChangeText={setRemarks}
      />

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Record Adjustment</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff' },
  chipSelected: { backgroundColor: '#D97706', borderColor: '#D97706' },
  chipText: { fontSize: 13, color: '#334155' },
  chipTextSel: { color: '#fff', fontWeight: '600' },
  dirRow: { gap: 8 },
  dirBtn: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  dirBtnActive: { backgroundColor: '#FEF3C7', borderColor: '#D97706' },
  dirBtnText: { fontSize: 13, color: '#334155' },
  dirBtnTextActive: { color: '#92400E', fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#fff', color: '#0F172A', marginBottom: 4 },
  calcText: { color: '#16A34A', fontWeight: '600', fontSize: 14, marginTop: 4 },
  calcNeg: { color: '#DC2626' },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonBtn: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  reasonBtnActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  reasonText: { fontSize: 13, color: '#334155' },
  reasonTextActive: { color: '#fff', fontWeight: '600' },
  button: { backgroundColor: '#D97706', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
