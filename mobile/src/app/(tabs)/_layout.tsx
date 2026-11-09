import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HeaderMenu from '../../client/components/HeaderMenu';
import HeaderRightStatus from '../../client/components/HeaderRightStatus';
import { useAuth } from '../../client/context/AuthContext';

/**
 * Tab bar layout (FR4 — RBAC).
 * The bottom tab bar holds the daily warehouse actions:
 *   Dashboard, Delivery, Release, Adjust.
 * Secondary screens (Catalog, Sync, History, Settings) and owner screens
 * live in the dropdown menu (top-left of the header) via <HeaderMenu />.
 * Real-time cloud sync & network status is displayed on the top-right via <HeaderRightStatus />.
 */
export default function TabsLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerLeft: () => <HeaderMenu />,
        headerRight: () => <HeaderRightStatus />,
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

      {/* ── Secondary screens: hidden from bottom tab bar but fully routable ── */}
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Catalog',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync Queue',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Audit History',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}