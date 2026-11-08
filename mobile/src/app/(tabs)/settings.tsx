import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { hashPasswordLocally } from '../../client/utils/crypto';
import { useAuth } from '../../client/context/AuthContext';
import { useSync } from '../../client/context/SyncContext';
import { changePasswordApi } from '../../client/api/syncApi';
import { getDatabase } from '../../client/database/db';
import { TABLES } from '../../client/utils/constants';

/**
 * Settings / Profile Screen (FR5, FR28, NFR7, NFR8, NFR12)
 * Shows user profile, device ID, connection state, pending sync count,
 * self-serve password change, and secure logout.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { user, deviceId, logout } = useAuth();
  const { pendingCount, isOnline } = useSync();

  // Modal & form states for password change
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  function confirmLogout() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? Any unsynced transactions will remain safely queued on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]
    );
  }

  function openPasswordModal() {
    if (!isOnline) {
      Alert.alert(
        'Internet Required',
        'Changing your password requires an active internet connection to update your account on the server.'
      );
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setModalVisible(true);
  }

  async function handlePasswordChange() {
    if (!currentPassword.trim() || !newPassword.trim()) {
      Alert.alert('Required', 'Please fill in both current and new passwords.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Password Length', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setUpdating(true);
    try {
      await changePasswordApi(currentPassword, newPassword);

      // Update local SQLite users_cache so future offline logins work with new password
      if (user?.id) {
        try {
          const newHash = await hashPasswordLocally(newPassword);
          const db = await getDatabase();
          await db.runAsync(
            `UPDATE ${TABLES.USERS_CACHE} SET password_hash = ? WHERE id = ?`,
            [newHash, user.id]
          );
        } catch (dbErr) {
          console.warn('[SettingsScreen] Failed updating offline password hash:', dbErr);
        }
      }

      setModalVisible(false);
      Alert.alert('Success', 'Your password has been changed successfully.');
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error || err?.message || 'Failed to update password. Please try again.';
      Alert.alert('Error', errorMsg);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      {/* Info Rows */}
      <View style={styles.section}>
        <InfoRow icon="person-outline" label="Username" value={user?.username ?? '—'} />
        <InfoRow
          icon="phone-portrait-outline"
          label="Device ID"
          value={deviceId ? `${deviceId.slice(0, 18)}…` : '—'}
        />
        <InfoRow icon="sync-outline" label="Pending Sync" value={String(pendingCount)} />
        <InfoRow
          icon={isOnline ? 'wifi' : 'cloud-offline-outline'}
          label="Connection"
          value={isOnline ? 'Online' : 'Offline'}
        />
      </View>

      {/* Owner Administration (visible only to owner/manager) */}
      {user?.role === 'owner/manager' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OWNER CONTROLS</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(owner)/users')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={20} color="#2563EB" />
            <Text style={styles.actionText}>Manage Staff & Users</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}
            onPress={() => router.push('/(owner)/users/enroll')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={20} color="#2563EB" />
            <Text style={styles.actionText}>Enroll New Staff Member</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      )}

      {/* Account Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.actionBtn} onPress={openPasswordModal} activeOpacity={0.7}>
          <Ionicons name="key-outline" size={20} color="#2563EB" />
          <Text style={styles.actionText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      {/* Logout Action */}
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Change Password Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter your current password and choose a new password of at least 6 characters.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Current Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!updating}
            />

            <TextInput
              style={styles.input}
              placeholder="New Password (min. 6 characters)"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!updating}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!updating}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={updating}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, updating && styles.saveBtnDisabled]}
                onPress={handlePasswordChange}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#64748B" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, color: '#fff', fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  role: { fontSize: 13, color: '#64748B', textTransform: 'capitalize', marginTop: 4 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: { flex: 1, fontSize: 14, color: '#334155' },
  infoValue: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  actionText: { flex: 1, fontSize: 14, color: '#2563EB', fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
