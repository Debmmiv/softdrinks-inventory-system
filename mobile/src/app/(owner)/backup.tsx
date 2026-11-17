import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../client/context/AuthContext';
import { useSync } from '../../client/context/SyncContext';
import { fetchBackupExportApi } from '../../client/api/syncApi';

type BackupScope = 'inventory' | 'recent' | 'all';

interface BackupRecord {
  timestamp: string;
  filename: string;
  scope: string;
  totalRecords: number;
  products: number;
  transactions: number;
  users: number;
}

const SCOPE_OPTIONS: { id: BackupScope; title: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    id: 'inventory',
    title: 'Products & Stock Levels',
    desc: 'Catalog, bottle sizes, stock counts & user accounts (Fastest, zero memory risk)',
    icon: 'cube-outline',
  },
  {
    id: 'recent',
    title: 'Recent Activity (Last 30 Days)',
    desc: 'Products, stock levels, plus all deliveries, releases & adjustments from the past month',
    icon: 'time-outline',
  },
  {
    id: 'all',
    title: 'Standard Archive (Up to 1,000 Tx)',
    desc: 'Products, stock levels, user directory, and the latest 1,000 transactions',
    icon: 'archive-outline',
  },
];

/**
 * Backup & Export Screen (Owner only)
 * Allows the owner to export cloud database snapshots with memory safety.
 */
export default function BackupScreen() {
  const { user } = useAuth();
  const { isOnline } = useSync();

  const [selectedScope, setSelectedScope] = useState<BackupScope>('inventory');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BackupRecord[]>([]);

  const downloadOrShare = async (filename: string, jsonString: string) => {
    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Download Started', `Backup saved to your Downloads folder:\n${filename}`);
      } catch (err: any) {
        Alert.alert('Download Error', err?.message || 'Failed to trigger file download.');
      }
    } else {
      try {
        await Share.share({
          title: filename,
          message: jsonString,
        });
      } catch (err: any) {
        if (!err?.message?.includes('User did not share')) {
          Alert.alert('Share Failed', err?.message || 'Failed to share backup file.');
        }
      }
    }
  };

  const handleExport = useCallback(async () => {
    if (!isOnline) {
      Alert.alert(
        'Internet Required',
        'Backup export requires an active internet connection to retrieve records from the cloud.'
      );
      return;
    }

    setLoading(true);
    try {
      const data = await fetchBackupExportApi(selectedScope, 1000);

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const filename = `gusa-backup-${selectedScope}-${dateStr}-${timeStr}.json`;

      // Compact JSON to minimize memory consumption
      const json = JSON.stringify(data);

      const record: BackupRecord = {
        timestamp: now.toISOString(),
        filename,
        scope: selectedScope,
        totalRecords: data.meta.total_records,
        products: data.meta.record_counts.products,
        transactions: data.meta.record_counts.transactions,
        users: data.meta.record_counts.users,
      };
      setHistory((prev) => [record, ...prev]);

      await downloadOrShare(filename, json);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to generate backup.';
      Alert.alert('Export Failed', msg);
    } finally {
      setLoading(false);
    }
  }, [isOnline, selectedScope]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <Ionicons name="cloud-download-outline" size={28} color="#2563EB" />
        </View>
        <Text style={styles.headerTitle}>Cloud Data Backup</Text>
        <Text style={styles.headerDesc}>
          Export a structured JSON snapshot of your wholesale depot's data for secure archival and disaster recovery.
        </Text>
      </View>

      {/* Connection Status */}
      <View style={[styles.statusRow, isOnline ? styles.statusOnline : styles.statusOffline]}>
        <Ionicons
          name={isOnline ? 'wifi' : 'cloud-offline-outline'}
          size={16}
          color={isOnline ? '#16A34A' : '#DC2626'}
        />
        <Text style={[styles.statusText, { color: isOnline ? '#16A34A' : '#DC2626' }]}>
          {isOnline ? 'Connected — ready to export' : 'Offline — connect to internet to export'}
        </Text>
      </View>

      {/* Scope Selector */}
      <Text style={styles.sectionTitle}>SELECT BACKUP SCOPE</Text>
      <View style={styles.scopeContainer}>
        {SCOPE_OPTIONS.map((opt) => {
          const isSelected = selectedScope === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.scopeCard, isSelected && styles.scopeCardActive]}
              onPress={() => setSelectedScope(opt.id)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <View style={[styles.scopeIconWrap, isSelected && styles.scopeIconWrapActive]}>
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={isSelected ? '#2563EB' : '#64748B'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.scopeTitle, isSelected && styles.scopeTitleActive]}>
                  {opt.title}
                </Text>
                <Text style={styles.scopeDesc}>{opt.desc}</Text>
              </View>
              <Ionicons
                name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={isSelected ? '#2563EB' : '#CBD5E1'}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Export Action Button */}
      <TouchableOpacity
        style={[styles.exportBtn, (!isOnline || loading) && styles.exportBtnDisabled]}
        onPress={handleExport}
        disabled={!isOnline || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.exportBtnText}>
              {Platform.OS === 'web' ? 'Download Backup File' : 'Export & Share Backup'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {loading && (
        <Text style={styles.loadingHint}>
          Querying cloud database and generating JSON snapshot…
        </Text>
      )}

      {/* Export History (This Session) */}
      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>EXPORTS IN THIS SESSION</Text>
          {history.map((record, i) => (
            <View key={record.timestamp} style={[styles.historyCard, i > 0 && { marginTop: 8 }]}>
              <View style={styles.historyHeader}>
                <Ionicons name="document-text-outline" size={16} color="#2563EB" />
                <Text style={styles.historyFilename} numberOfLines={1}>
                  {record.filename}
                </Text>
              </View>
              <View style={styles.historyStats}>
                <StatChip label="Products" value={record.products} color="#2563EB" />
                <StatChip label="Transactions" value={record.transactions} color="#16A34A" />
                <StatChip label="Users" value={record.users} color="#7C3AED" />
              </View>
              <Text style={styles.historyTime}>
                {new Date(record.timestamp).toLocaleTimeString()}
                {' · '}
                {record.totalRecords} records exported
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#16A34A" />
        <View style={{ flex: 1 }}>
          <Text style={styles.tipsTitle}>Data Security & Best Practices</Text>
          <Text style={styles.tipsText}>
            • "Products & Stock Levels" is the safest snapshot for stock restoration.{'\n'}
            • User password hashes are never included in exports.{'\n'}
            • Store your backup file securely on Google Drive, an encrypted USB, or depot storage.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.chip, { borderColor: color + '30' }]}>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },

  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  headerDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18 },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusOnline: { backgroundColor: '#DCFCE7' },
  statusOffline: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 13, fontWeight: '600' },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  scopeContainer: {
    gap: 8,
    marginBottom: 16,
  },
  scopeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  scopeCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFC',
  },
  scopeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeIconWrapActive: {
    backgroundColor: '#DBEAFE',
  },
  scopeTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  scopeTitleActive: { color: '#2563EB' },
  scopeDesc: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 8,
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  loadingHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },

  historySection: { marginTop: 16 },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  historyFilename: { fontSize: 13, fontWeight: '600', color: '#0F172A', flex: 1 },
  historyStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  historyTime: { fontSize: 11, color: '#94A3B8' },

  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FAFBFC',
  },
  chipValue: { fontSize: 16, fontWeight: '700' },
  chipLabel: { fontSize: 10, color: '#94A3B8', marginTop: 2 },

  tipsCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 4 },
  tipsText: { fontSize: 12, color: '#15803D', lineHeight: 18 },
});
