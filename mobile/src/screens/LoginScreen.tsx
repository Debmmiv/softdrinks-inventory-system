import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Soft Drinks Inventory</Text>
      <TextInput style={styles.input} placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Log in</Text>
      </Pressable>
      <Text style={styles.note}>The first login needs an internet connection.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 6, padding: 12 },
  button: { backgroundColor: '#222', borderRadius: 6, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#b00020' },
  note: { fontSize: 12, color: '#555', textAlign: 'center' },
});
