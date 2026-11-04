import { View, Text, StyleSheet } from 'react-native';

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory Reports & Deficit Analysis</Text>
      <Text style={styles.subtitle}>
        Full cloud reports and replenishment summaries will be wired to MongoDB in Phase 2.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center' },
});
