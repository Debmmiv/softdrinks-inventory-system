import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useSync } from '../context/SyncContext';

/**
 * Top-right header status indicator.
 * Displays real-time cloud connectivity and pending outbox count.
 * Tapping it navigates immediately to the Sync screen.
 */
export default function HeaderRightStatus() {
  const navigation = useNavigation<any>();
  const { isOnline, isSyncing, pendingCount } = useSync();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('sync')}
      activeOpacity={0.7}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Network: ${isOnline ? 'Online' : 'Offline'}, Pending syncs: ${pendingCount}`}
    >
      {isSyncing ? (
        <View style={[styles.pill, styles.pillSyncing]}>
          <ActivityIndicator size="small" color="#2563EB" style={styles.spinner} />
          <Text style={styles.syncingText}>Syncing</Text>
        </View>
      ) : pendingCount > 0 ? (
        <View style={[styles.pill, styles.pillPending]}>
          <Ionicons name="cloud-upload-outline" size={14} color="#D97706" />
          <Text style={styles.pendingText}>{pendingCount}</Text>
        </View>
      ) : (
        <View style={styles.pillStatus}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isOnline ? '#16A34A' : '#94A3B8' },
            ]}
          />
          <Text style={[styles.statusText, { color: isOnline ? '#16A34A' : '#64748B' }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pillSyncing: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pillPending: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pillStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spinner: {
    transform: [{ scale: 0.75 }],
  },
  syncingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
