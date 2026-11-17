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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchCatalogApi,
  createProductApi,
  updateProductApi,
  type CatalogProduct,
} from '../../../client/api/syncApi';
import { useSync } from '../../../client/context/SyncContext';
import { formatStock } from '../../../client/utils/calculations';

/**
 * Owner Product Management (FR8, FR9, FR10)
 * - Lists every product (active and deactivated) from the cloud catalog.
 * - Adds products with brand, name, bottle size, pack size and reorder level.
 * - Edits details and the reorder level. Pack size is locked by the server once the product
 *   has any transaction (FR9); the server's message is shown if an edit is refused.
 * - Deactivates / reactivates products (nothing is ever deleted, the ledger stays intact).
 *
 * Opening stock is NOT entered here: record it as a Delivery so it appears in the ledger.
 * Requires an internet connection because the cloud catalog is the source of truth.
 */

interface FormState {
  brand_name: string;
  product_name: string;
  bottle_size: string;
  units_per_case: string;
  reorder_threshold_bottles: string;
}

const EMPTY_FORM: FormState = {
  brand_name: '',
  product_name: '',
  bottle_size: '',
  units_per_case: '24',
  reorder_threshold_bottles: '0',
};

function describeStock(bottles: number, unitsPerCase: number): string {
  if (bottles < 0) return `${bottles} bottles (deficit, needs a count)`;
  return formatStock(bottles, unitsPerCase);
}

function apiErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.error || fallback;
}

export default function ProductManagementScreen() {
  const { isOnline, syncNow } = useSync();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isOnline) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setLoadError(null);
    try {
      const res = await fetchCatalogApi();
      setProducts(res.products);
    } catch (err: any) {
      setLoadError(apiErrorMessage(err, 'Failed to load the product catalog.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(product: CatalogProduct) {
    setEditing(product);
    setForm({
      brand_name: product.brand_name,
      product_name: product.product_name,
      bottle_size: product.bottle_size,
      units_per_case: String(product.units_per_case),
      reorder_threshold_bottles: String(product.reorder_threshold_bottles),
    });
    setModalOpen(true);
  }

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): { ok: true; payload: Parameters<typeof createProductApi>[0] } | { ok: false; message: string } {
    const brand_name = form.brand_name.trim();
    const product_name = form.product_name.trim();
    const bottle_size = form.bottle_size.trim();
    if (!brand_name || !product_name || !bottle_size) {
      return { ok: false, message: 'Brand, product name and bottle size are required.' };
    }
    if (!/^\d+$/.test(form.units_per_case.trim()) || parseInt(form.units_per_case, 10) < 1) {
      return { ok: false, message: 'Bottles per case must be a whole number of 1 or more.' };
    }
    if (!/^\d+$/.test(form.reorder_threshold_bottles.trim())) {
      return { ok: false, message: 'Reorder level must be a whole number of 0 or more.' };
    }
    return {
      ok: true,
      payload: {
        brand_name,
        product_name,
        bottle_size,
        units_per_case: parseInt(form.units_per_case, 10),
        reorder_threshold_bottles: parseInt(form.reorder_threshold_bottles, 10),
      },
    };
  }

  async function handleSave() {
    const result = validate();
    if (!result.ok) {
      Alert.alert('Check the form', result.message);
      return;
    }
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to change the product catalog.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateProductApi(editing._id, result.payload);
      } else {
        await createProductApi(result.payload);
      }
      setModalOpen(false);
      await load();
      // Pull the catalog onto this phone as well so Delivery/Release lists are current.
      syncNow().catch(() => undefined);
    } catch (err: any) {
      Alert.alert('Could not save product', apiErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  function confirmToggleActive(product: CatalogProduct) {
    const next = !product.is_active;
    Alert.alert(
      next ? 'Reactivate product?' : 'Deactivate product?',
      next
        ? `${product.brand_name} ${product.product_name} will appear in delivery and release lists again.`
        : `${product.brand_name} ${product.product_name} will be hidden from delivery and release lists. Its history is kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Reactivate' : 'Deactivate',
          style: next ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await updateProductApi(product._id, { is_active: next });
              await load();
              syncNow().catch(() => undefined);
            } catch (err: any) {
              Alert.alert('Could not update product', apiErrorMessage(err, 'Please try again.'));
            }
          },
        },
      ]
    );
  }

  const unitsPreview = parseInt(form.units_per_case, 10);
  const thresholdPreview = parseInt(form.reorder_threshold_bottles, 10);
  const thresholdHint =
    Number.isInteger(unitsPreview) && unitsPreview >= 1 && Number.isInteger(thresholdPreview)
      ? `= ${formatStock(thresholdPreview, unitsPreview)}`
      : '';

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#92400E" />
          <Text style={styles.offlineText}>
            You are offline. Connect to the internet to view or change the catalog.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.addBtn, !isOnline && styles.disabled]}
        onPress={openAdd}
        disabled={!isOnline}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addBtnText}>Add Product</Text>
      </TouchableOpacity>

      {loadError && <Text style={styles.errorText}>{loadError}</Text>}

      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              colors={['#2563EB']}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {isOnline ? 'No products yet. Tap "Add Product" to create the first one.' : 'Catalog unavailable offline.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, !item.is_active && styles.cardInactive]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.brand_name} {item.product_name}
                  </Text>
                  <Text style={styles.meta}>
                    {item.bottle_size} · {item.units_per_case} bottles per case
                  </Text>
                </View>
                {!item.is_active && (
                  <View style={styles.inactiveTag}>
                    <Text style={styles.inactiveTagText}>INACTIVE</Text>
                  </View>
                )}
              </View>

              <Text style={styles.stock}>
                In stock: {describeStock(item.total_stock_bottles, item.units_per_case)}
              </Text>
              <Text style={styles.meta}>
                Reorder level: {formatStock(item.reorder_threshold_bottles, item.units_per_case)}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => openEdit(item)}
                  disabled={!isOnline}
                >
                  <Ionicons name="create-outline" size={16} color="#2563EB" />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => confirmToggleActive(item)}
                  disabled={!isOnline}
                >
                  <Ionicons
                    name={item.is_active ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={item.is_active ? '#DC2626' : '#16A34A'}
                  />
                  <Text style={[styles.actionText, { color: item.is_active ? '#DC2626' : '#16A34A' }]}>
                    {item.is_active ? 'Deactivate' : 'Reactivate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{editing ? 'Edit Product' : 'Add Product'}</Text>

            <Field label="Brand" value={form.brand_name} onChangeText={(v) => setField('brand_name', v)} placeholder="e.g. Coca-Cola" />
            <Field label="Product name" value={form.product_name} onChangeText={(v) => setField('product_name', v)} placeholder="e.g. Coke Original" />
            <Field label="Bottle size" value={form.bottle_size} onChangeText={(v) => setField('bottle_size', v)} placeholder="e.g. 1.5L or 500ml" />
            <Field
              label="Bottles per case"
              value={form.units_per_case}
              onChangeText={(v) => setField('units_per_case', v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              hint={
                editing
                  ? 'Locked by the server once this product has any recorded transaction.'
                  : 'Cannot be changed after the first transaction is recorded.'
              }
            />
            <Field
              label="Reorder level (bottles)"
              value={form.reorder_threshold_bottles}
              onChangeText={(v) => setField('reorder_threshold_bottles', v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              hint={thresholdHint || 'You are alerted when stock falls to this level or below.'}
            />

            {!editing && (
              <Text style={styles.note}>
                Opening stock is not entered here. Record it from the Delivery tab so it appears in the history.
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Save Changes' : 'Create Product'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={props.keyboardType ?? 'default'}
      />
      {props.hint ? <Text style={styles.hint}>{props.hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 14,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  errorText: { color: '#DC2626', fontSize: 13, marginBottom: 10 },
  list: { paddingBottom: 32 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardInactive: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  meta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  stock: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginTop: 8 },
  inactiveTag: { backgroundColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  inactiveTagText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  modalBody: { padding: 20, paddingTop: 48, backgroundColor: '#F8FAFC', flexGrow: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  hint: { fontSize: 11, color: '#64748B', marginTop: 4 },
  note: { fontSize: 12, color: '#64748B', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12, backgroundColor: '#2563EB' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
