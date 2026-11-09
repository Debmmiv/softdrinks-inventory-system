import { useState } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSync } from '../context/SyncContext';

type MenuItem = {
  label: string;
  path: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Catalog', path: '/catalog', icon: 'list-outline' },
  { label: 'Sync', path: '/sync', icon: 'sync-outline' },
  { label: 'History', path: '/history', icon: 'time-outline' },
  { label: 'Settings', path: '/settings', icon: 'settings-outline' },
];

/**
 * Dropdown menu shown in the top-left of every screen header.
 * Holds the secondary screens (Catalog, Sync, History, Settings) so the
 * bottom tab bar can stay focused on daily warehouse actions.
 */
export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { pendingCount } = useSync();

  const go = (path: string) => {
    setOpen(false);
    router.navigate(path as any);
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
        {/* Tap anywhere outside the menu to close it */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { top: insets.top + 52 }]}>
            {MENU_ITEMS.map((item, index) => {
              const active = pathname === item.path;
              return (
                <Pressable
                  key={item.path}
                  onPress={() => go(item.path)}
                  style={({ pressed }) => [
                    styles.item,
                    index < MENU_ITEMS.length - 1 && styles.itemDivider,
                    (pressed || active) && styles.itemActive,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? '#2563EB' : '#475569'}
                  />
                  <Text style={[styles.label, active && styles.labelActive]}>
                    {item.label}
                  </Text>
                  {item.path === '/sync' && pendingCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
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
    minWidth: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemActive: { backgroundColor: '#EFF6FF' },
  label: { flex: 1, fontSize: 16, color: '#0F172A' },
  labelActive: { color: '#2563EB', fontWeight: '600' },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});