import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { enrollUserApi } from '../../../client/api/syncApi';
import { useSync } from '../../../client/context/SyncContext';

/**
 * In-App Staff Enrollment Screen (FR6, FR7, NFR7, NFR8)
 * Allows Owner/Manager to provision new warehouse employees directly from the mobile app.
 */
export default function StaffEnrollmentScreen() {
  const router = useRouter();
  const { isOnline } = useSync();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'staff' | 'owner/manager'>('staff');
  const [submitting, setSubmitting] = useState(false);

  async function handleEnroll() {
    if (!isOnline) {
      Alert.alert(
        'Internet Required',
        'Enrolling a new staff member requires an active internet connection to save the account in the cloud.'
      );
      return;
    }

    if (!fullName.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please complete all fields (Full Name, Username, and Password).');
      return;
    }

    if (username.trim().length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Initial temporary password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await enrollUserApi({
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
        initial_password: password,
        role,
      });

      Alert.alert(
        'Staff Enrolled Successfully',
        `Account created for ${res.user.full_name} (@${res.user.username}) as ${res.user.role}.\n\nThey can now log into the mobile app using their username and temporary password.`,
        [
          {
            text: 'View Staff List',
            onPress: () => router.replace('/(owner)/users'),
          },
          {
            text: 'Enroll Another',
            onPress: () => {
              setFullName('');
              setUsername('');
              setPassword('');
              setRole('staff');
            },
            style: 'cancel',
          },
        ]
      );
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error || err?.message || 'Failed to create staff account. Please try again.';
      Alert.alert('Enrollment Failed', errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Connection Notice */}
        {!isOnline && (
          <View style={styles.offlineNotice}>
            <Ionicons name="cloud-offline-outline" size={16} color="#DC2626" />
            <Text style={styles.offlineNoticeText}>
              Device is offline. Connect to Wi-Fi to enroll new staff.
            </Text>
          </View>
        )}

        {/* Header Summary */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={28} color="#2563EB" />
          </View>
          <Text style={styles.title}>Enroll New Staff Member</Text>
          <Text style={styles.subtitle}>
            Create credentials for a warehouse employee. They will use these to log into their handheld on the floor.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Juan Dela Cruz"
            placeholderTextColor="#94A3B8"
            value={fullName}
            onChangeText={setFullName}
            editable={!submitting}
          />

          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. juan"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            editable={!submitting}
          />

          <Text style={styles.label}>TEMPORARY PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters (e.g. Staff123)"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            editable={!submitting}
          />

          <Text style={styles.label}>ACCOUNT ROLE</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleOption, role === 'staff' && styles.roleOptionActive]}
              onPress={() => setRole('staff')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={role === 'staff' ? '#2563EB' : '#64748B'}
              />
              <Text style={[styles.roleOptionText, role === 'staff' && styles.roleOptionTextActive]}>
                Warehouse Staff
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, role === 'owner/manager' && styles.roleOptionActive]}
              onPress={() => setRole('owner/manager')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={role === 'owner/manager' ? '#2563EB' : '#64748B'}
              />
              <Text
                style={[
                  styles.roleOptionText,
                  role === 'owner/manager' && styles.roleOptionTextActive,
                ]}
              >
                Owner / Manager
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, (submitting || !isOnline) && styles.submitBtnDisabled]}
          onPress={handleEnroll}
          disabled={submitting || !isOnline}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Create Account</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16, paddingBottom: 40 },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  offlineNoticeText: { color: '#DC2626', fontSize: 13, fontWeight: '600', flex: 1 },
  header: { alignItems: 'center', marginVertical: 16 },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  label: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  roleSelector: { flexDirection: 'row', gap: 10, marginTop: 4 },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  roleOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  roleOptionText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  roleOptionTextActive: { color: '#2563EB', fontWeight: '700' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
