import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { initDb } from './src/database/db';
import NetworkBanner from './src/components/NetworkBanner';
import LoginScreen from './src/screens/LoginScreen';
import StockScreen from './src/screens/StockScreen';
import RecordScreen from './src/screens/RecordScreen';
import SyncScreen from './src/screens/SyncScreen';
import ReportsScreen from './src/screens/ReportsScreen';

const TABS = ['Stock', 'Record', 'Sync', 'Reports'] as const;
type Tab = (typeof TABS)[number];

function Main() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('Stock');

  useEffect(() => {
    initDb().catch((e) => console.error('Database setup failed:', e));
  }, []);

  if (!user) return <LoginScreen />;

  return (
    <View style={styles.container}>
      <NetworkBanner />
      <View style={styles.body}>
        {tab === 'Stock' && <StockScreen />}
        {tab === 'Record' && <RecordScreen />}
        {tab === 'Sync' && <SyncScreen />}
        {tab === 'Reports' && <ReportsScreen />}
      </View>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t} style={styles.tab} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Main />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 40 },
  body: { flex: 1 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#ccc' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  tabText: { fontSize: 13, color: '#555' },
  tabActive: { fontWeight: '700', color: '#000' },
});
