import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { toTotalBottles } from '../database/stock';

type Props = {
  unitsPerCase: number;
  onChange: (totalBottles: number) => void;
};

export default function CaseBottleInput({ unitsPerCase, onChange }: Props) {
  const [cases, setCases] = useState('0');
  const [bottles, setBottles] = useState('0');

  function update(c: string, b: string) {
    onChange(toTotalBottles(Number(c) || 0, Number(b) || 0, unitsPerCase));
  }

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <Text style={styles.label}>Cases</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={cases}
          onChangeText={(v) => { setCases(v); update(v, bottles); }}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Bottles</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={bottles}
          onChangeText={(v) => { setBottles(v); update(cases, v); }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  label: { fontSize: 12, color: '#555', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 6, padding: 10 },
});
