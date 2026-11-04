import { Stack } from 'expo-router';

/**
 * Owner-Only Protected Stack Layout
 * Houses management screens: Reports, Products, Users, Staff Enrollment.
 */
export default function OwnerLayout() {
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
