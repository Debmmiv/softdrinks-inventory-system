import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../client/context/AuthContext';

/**
 * Owner-Only Protected Stack Layout (FR4, NFR7)
 * Houses management screens: Reports, Products, Users, Staff Enrollment.
 * Restricts access strictly to authenticated users with the 'owner/manager' role.
 */
export default function OwnerLayout() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || user?.role !== 'owner/manager') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#E6F4FE' },
        headerTintColor: '#0F172A',
      }}
    >
      <Stack.Screen name="reports" options={{ title: 'Reports & Analytics' }} />
      <Stack.Screen name="products/index" options={{ title: 'Product Management' }} />
      <Stack.Screen name="users/index" options={{ title: 'User Management' }} />
      <Stack.Screen name="users/enroll" options={{ title: 'Staff Enrollment' }} />
    </Stack>
  );
}
