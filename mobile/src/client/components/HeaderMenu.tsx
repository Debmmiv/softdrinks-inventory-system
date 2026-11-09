import { useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

type MenuItem = {
  label: string;
  tabName?: string;
  path: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const STANDARD_MENU_ITEMS: MenuItem[] = [
  { label: 'Catalog', tabName: 'catalog', path: '/(tabs)/catalog', icon: 'list-outline' },
  { label: 'Sync Queue', tabName: 'sync', path: '/(tabs)/sync', icon: 'sync-outline' },
  { label: 'Audit History', tabName: 'history', path: '/(tabs)/history', icon: 'time-outline' },
  { label: 'Settings', tabName: 'settings', path: '/(tabs)/settings', icon: 'settings-outline' },
];

const OWNER_MENU_ITEMS: MenuItem[] = [
  { label: 'Reports & Deficits', path: '/(owner)/reports', icon: 'analytics-outline' },
  { label: 'Product Management', path: '/(owner)/products', icon: 'cube-outline' },
  { label: 'User Directory', path: '/(owner)/users', icon: 'people-outline' },
  { label: 'Enroll Staff', path: '/(owner)/users/enroll', icon: 'person-add-outline' },
];

/**
 * Dropdown navigation menu in the header.
 * Provides access to secondary operational screens (Catalog, Sync, History, Settings)
 * and managerial screens for Owner/Manager users.
 */
export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const navigation = useNavigation<any>();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { pendingCount, isOnline } = useSync();

  const isOwner = user?.role === 'owner/manager';

  const isItemActive = (path: string) => {
    return pathname === path || pathname === path.replace('/(tabs)', '');
  };

  const go = (item: MenuItem) => {
    setOpen(false);
    if (isItemActive(item.path)) return;
    setTimeout(() => {
      if (item.tabName) {
        navigation.navigate(item.tabName);
      } else {
        router.push(item.path as any);
      }
    }, 100);
  };

  const handleLogout = () => {
    setOpen(false);
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <Ionicons name="menu" size={26} color="#0F172A" />
        {pendingCount > 0 && <View style={styles.dot} />}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { top: insets.top + 52 }]}>
            {/* User Profile Summary Header */}
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.full_name ?? 'User'}
                </Text>
                <View style={styles.roleRow}>
                  <View
                    style={[
                      styles.roleDot,
                      { backgroundColor: isOnline ? '#16A34A' : '#94A3B8' },
                    ]}
                  />
                  <Text style={styles.userRole}>
                    {isOwner ? 'Owner / Manager' : 'Warehouse Staff'}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView bounces={false} contentContainerStyle={styles.scrollList}>
              {/* Standard Screens */}
              {STANDARD_MENU_ITEMS.map((item, index) => {
                const active = isItemActive(item.path);
                const isSyncItem = item.path.includes('/sync');
                return (
                  <Pressable
                    key={item.path}
                    onPress={() => go(item)}
                    style={({ pressed }) => [
                      styles.item,
                      index < STANDARD_MENU_ITEMS.length - 1 && styles.itemDivider,
                      (pressed || active) && styles.itemActive,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={19}
                      color={active ? '#2563EB' : '#475569'}
                    />
                    <Text style={[styles.label, active && styles.labelActive]}>
                      {item.label}
                    </Text>
                    {isSyncItem && pendingCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}

              {/* Owner Administration Section (Only for Owners) */}
              {isOwner && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>OWNER CONTROLS</Text>
                  </View>
                  {OWNER_MENU_ITEMS.map((item, index) => {
                    const active = pathname === item.path;
                    return (
                      <Pressable
                        key={item.path}
                        onPress={() => go(item)}
                        style={({ pressed }) => [
                          styles.item,
                          index < OWNER_MENU_ITEMS.length - 1 && styles.itemDivider,
                          (pressed || active) && styles.itemActive,
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={19}
                          color={active ? '#2563EB' : '#475569'}
                        />
                        <Text style={[styles.label, active && styles.labelActive]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </>
              )}

              {/* Quick Logout Row */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [styles.item, styles.logoutItem, pressed && styles.itemActive]}
              >
                <Ionicons name="log-out-outline" size={19} color="#DC2626" />
                <Text style={styles.logoutLabel}>Log Out</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { marginLeft: 12, padding: 4 },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.25)' },
  menu: {
    position: 'absolute',
    left: 12,
    width: 230,
    maxHeight: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  userRole: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  scrollList: {
    paddingVertical: 4,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemActive: { backgroundColor: '#EFF6FF' },
  label: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500' },
  labelActive: { color: '#2563EB', fontWeight: '700' },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  logoutLabel: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
});
