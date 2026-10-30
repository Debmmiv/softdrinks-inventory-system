import { StyleSheet, Text, View } from 'react-native';

type Props = { title: string; todo: string };

export default function ScreenPlaceholder({ title, todo }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.todo}>TODO: {todo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  todo: { fontSize: 14, color: '#555' },
});
