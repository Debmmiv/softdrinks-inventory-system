import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HeaderMenu from '../../client/components/HeaderMenu';

/**
 * Tab bar layout (FR4 — RBAC).
 * The bottom tab bar holds the daily warehouse actions:
 *   Dashboard, Delivery, Release, Adjust.
 * Catalog, Sync, History and Settings are still routable screens, but they
 * live in the dropdown menu (top-left of the header) via <HeaderMenu />.
 * Owner-only screens (Products, Reports, Users) live in the (owner) route group.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerLeft: () => <HeaderMenu />,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { paddingBottom: 4, height: 60 },
        headerStyle: { backgroundColor: '#E6F4FE' },
        headerTintColor: '#0F172A',
      }}
    >
      {/* ── Bottom tabs ── */}
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

      {/* ── Dropdown-menu screens: hidden from the tab bar (href: null) ── */}
      <Tabs.Screen name="catalog" options={{ title: 'Catalog', href: null }} />
      <Tabs.Screen name="sync" options={{ title: 'Sync', href: null }} />
      <Tabs.Screen name="history" options={{ title: 'History', href: null }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', href: null }} />
    </Tabs>
  );
}