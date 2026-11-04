import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../client/context/AuthContext';
import { useSync } from '../../client/context/SyncContext';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Tab bar layout (FR4 — RBAC).
 * Staff see 7 tabs. Owner/Manager see the same 7 plus a "Manage" section entry.
 * Owner-only screens (Products, Reports, Users) live in the (owner) route group.
 */
export default function TabsLayout() {
  const { user } = useAuth();
  const { pendingCount } = useSync();
  const isOwner = user?.role === 'owner/manager';

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { paddingBottom: 4, height: 60 },
        headerStyle: { backgroundColor: '#E6F4FE' },
        headerTintColor: '#0F172A',
      }}
    >
      {/* ── Shared screens (Staff & Owner) ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="delivery"
        options={{
          title: 'Delivery',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="archive-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="release"
        options={{
          title: 'Release',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="exit-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="adjustment"
        options={{
          title: 'Adjust',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-vertical-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Catalog',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="sync-outline" size={size} color={color as string} />
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color as string} />
          ),
        }}
      />

      {/* ── History (accessible to all, placed last) ── */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color as string} />
          ),
          // Hide from tab bar if too many tabs — accessible via Dashboard shortcut
          href: isOwner ? '/history' : '/history',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
