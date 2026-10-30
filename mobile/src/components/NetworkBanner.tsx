import NetInfo from '@react-native-community/netinfo';
import { StyleSheet, Text, View } from 'react-native';

export default function NetworkBanner() {
  const { isConnected } = NetInfo.useNetInfo();
  const offline = isConnected === false;

  return (
    <View style={[styles.bar, offline ? styles.offline : styles.online]}>
      <Text style={styles.text}>
        {offline ? 'Offline: changes are saved and will sync later' : 'Online'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: 6, alignItems: 'center' },
  online: { backgroundColor: '#d9f2e3' },
  offline: { backgroundColor: '#fde7c8' },
  text: { fontSize: 12 },
});
