import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../client/context/AuthContext';
import { InventoryProvider } from '../client/context/InventoryContext';
import { SyncProvider } from '../client/context/SyncContext';
import { getDatabase } from '../client/database/db';

/**
 * Root layout — wraps the entire app in all three context providers.
 * This is the Expo Router replacement for the old App.tsx.
 */
export default function RootLayout() {
  // Initialise the SQLite database (creates tables if needed) on app launch
  useEffect(() => {
    getDatabase().catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <InventoryProvider>
        <SyncProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </SyncProvider>
      </InventoryProvider>
    </AuthProvider>
  );
}

/**
 * Decides which Stack to show based on auth state.
 * Redirect happens automatically when user logs in/out.
 */
function RootNavigator() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in — send to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in — send to dashboard
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(owner)" />
    </Stack>
  );
}
