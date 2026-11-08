import { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchUsersApi,
  toggleUserStatusApi,
  resetUserPasswordApi,
  type AdminUserRecord,
} from '../../../client/api/syncApi';
import { useAuth } from '../../../client/context/AuthContext';
import { useSync } from '../../../client/context/SyncContext';

/**
 * Owner User Management Screen (FR6, FR7, FR29, NFR7, NFR8)
 * Displays all enrolled warehouse staff and owner accounts.
 * Allows owner to enroll new staff, toggle active status, and reset passwords.
 */
export default function UserManagementScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { isOnline } = useSync();

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset password modal state
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [targetUser, setTargetUser] = useState<AdminUserRecord | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!isOnline) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchUsersApi();
      setUsers(res.users);
    } catch (err: any) {
      console.warn('[UserManagement] Failed loading users:', err);
      Alert.alert('Load Error', err?.response?.data?.error || 'Failed to fetch user list from cloud.');
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleToggleStatus(user: AdminUserRecord) {
    if (!isOnline) {
      Alert.alert('Offline', 'Connecting to the cloud is required to update account status.');
      return;
    }

    if (user._id === currentUser?.id) {
      Alert.alert('Not Allowed', 'You cannot deactivate your own owner account.');
      return;
    }

    const action = user.is_active ? 'Deactivate' : 'Reactivate';
    Alert.alert(
      `${action} Account`,
      `Are you sure you want to ${action.toLowerCase()} @${user.username} (${user.full_name})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: user.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await toggleUserStatusApi(user._id, !user.is_active);
              await loadUsers();
            } catch (err: any) {
              Alert.alert('Update Failed', err?.response?.data?.error || 'Failed to update user status.');
            }
          },
        },
      ]
    );
  }

  function openResetModal(user: AdminUserRecord) {
    if (!isOnline) {
      Alert.alert('Offline', 'Connecting to the cloud is required to reset passwords.');
      return;
    }
    setTargetUser(user);
    setNewTempPassword('');
    setResetModalVisible(true);
  }

  async function handleResetPassword() {
    if (!targetUser) return;
    if (newTempPassword.length < 6) {
      Alert.alert('Password Length', 'Temporary password must be at least 6 characters.');
      return;
    }

    setResetting(true);
    try {
      await resetUserPasswordApi(targetUser._id, newTempPassword);
      setResetModalVisible(false);
      Alert.alert(
        'Password Reset Complete',
        `The password for ${targetUser.full_name} (@${targetUser.username}) has been updated.\n\nThey can now log in with the new password.`
      );
    } catch (err: any) {
      Alert.alert('Reset Failed', err?.response?.data?.error || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header bar with Enroll CTA */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.heading}>Depot Personnel</Text>
          <Text style={styles.subheading}>{users.length} enrolled accounts</Text>
        </View>

        <TouchableOpacity
          style={styles.enrollBtn}
          onPress={() => router.push('/(owner)/users/enroll')}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add-outline" size={16} color="#fff" />
          <Text style={styles.enrollBtnText}>Enroll Staff</Text>
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#DC2626" />
          <Text style={styles.offlineText}>
            Device offline. User management requires cloud connectivity.
          </Text>
        </View>
      )}

      {loading && users.length === 0 ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <UserCard
              item={item}
              isSelf={item._id === currentUser?.id}
              onToggleStatus={() => handleToggleStatus(item)}
              onResetPassword={() => openResetModal(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadUsers} colors={['#2563EB']} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users loaded.</Text>
            </View>
          }
        />
      )}

      {/* Password Reset Modal */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Staff Password</Text>
            <Text style={styles.modalSubtitle}>
              Set a temporary password for {targetUser?.full_name} (@{targetUser?.username}).
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="New temporary password (min 6 chars)"
              placeholderTextColor="#94A3B8"
              value={newTempPassword}
              onChangeText={setNewTempPassword}
              editable={!resetting}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setResetModalVisible(false)}
                disabled={resetting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, resetting && styles.modalSaveBtnDisabled]}
                onPress={handleResetPassword}
                disabled={resetting}
              >
                {resetting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function UserCard({
  item,
  isSelf,
  onToggleStatus,
  onResetPassword,
}: {
  item: AdminUserRecord;
  isSelf: boolean;
  onToggleStatus: () => void;
  onResetPassword: () => void;
}) {
  const isOwner = item.role === 'owner/manager';

  return (
    <View style={[styles.userCard, !item.is_active && styles.userCardInactive]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: isOwner ? '#2563EB' : '#0D9488' }]}>
          <Text style={styles.avatarText}>{item.full_name[0]?.toUpperCase() ?? '?'}</Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.full_name}</Text>
            {isSelf && <Text style={styles.youBadge}>(You)</Text>}
          </View>
          <Text style={styles.userUsername}>@{item.username}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.statusText, { color: item.is_active ? '#16A34A' : '#DC2626' }]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.roleTag, { backgroundColor: isOwner ? '#EFF6FF' : '#F1F5F9' }]}>
          <Ionicons
            name={isOwner ? 'shield-checkmark-outline' : 'person-outline'}
            size={12}
            color={isOwner ? '#2563EB' : '#64748B'}
          />
          <Text style={[styles.roleTagText, { color: isOwner ? '#2563EB' : '#64748B' }]}>
            {isOwner ? 'Owner / Manager' : 'Staff'}
          </Text>
        </View>

        <View style={styles.actionsGroup}>
          <TouchableOpacity
            style={styles.iconActionBtn}
            onPress={onResetPassword}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Ionicons name="key-outline" size={15} color="#2563EB" />
            <Text style={styles.actionLinkText}>Reset Pass</Text>
          </TouchableOpacity>

          {!isSelf && (
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={onToggleStatus}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Ionicons
                name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                size={15}
                color={item.is_active ? '#DC2626' : '#16A34A'}
              />
              <Text
                style={[styles.actionLinkText, { color: item.is_active ? '#DC2626' : '#16A34A' }]}
              >
                {item.is_active ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heading: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  subheading: { fontSize: 12, color: '#64748B', marginTop: 2 },
  enrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  enrollBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  offlineText: { color: '#DC2626', fontSize: 12, fontWeight: '600', flex: 1 },
  list: { paddingBottom: 32 },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userCardInactive: { opacity: 0.65, backgroundColor: '#FAFAFA' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  youBadge: { fontSize: 11, color: '#2563EB', fontWeight: '700' },
  userUsername: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleTagText: { fontSize: 11, fontWeight: '600' },
  actionsGroup: { flexDirection: 'row', gap: 12 },
  iconActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  actionLinkText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#94A3B8', fontSize: 14 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  modalCancelText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  modalSaveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSaveBtnDisabled: { opacity: 0.5 },
  modalSaveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
