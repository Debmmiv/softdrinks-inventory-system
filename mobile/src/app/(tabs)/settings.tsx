import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../client/context/AuthContext';
import { useSync } from '../../client/context/SyncContext';

/**
 * Settings / Profile Screen (FR5, FR28, NFR7, NFR8, NFR12)
 * Shows user profile, device ID, pending sync count, and logout.
 * Password change will be wired in Phase 2 (requires backend /api/auth/change-password).
 */
export default function SettingsScreen() {
  const { user, deviceId, logout } = useAuth();
  const { pendingCount } = useSync();

  function confirmLogout() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      {/* Info rows */}
      <View style={styles.section}>
        <InfoRow icon="person-outline" label="Username" value={user?.username ?? '—'} />
        <InfoRow icon="phone-portrait-outline" label="Device ID" value={deviceId ? `${deviceId.slice(0, 18)}…` : '—'} />
        <InfoRow icon="sync-outline" label="Pending Sync" value={String(pendingCount)} />
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => Alert.alert('Coming in Phase 2', 'Password change requires the backend API.')}
        >
          <Ionicons name="key-outline" size={20} color="#2563EB" />
          <Text style={styles.actionText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#64748B" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  profileCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, color: '#fff', fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  role: { fontSize: 13, color: '#64748B', textTransform: 'capitalize', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel: { flex: 1, fontSize: 14, color: '#334155' },
  infoValue: { fontSize: 13, color: '#64748B' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  actionText: { flex: 1, fontSize: 14, color: '#2563EB' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16, marginTop: 8 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },
});
