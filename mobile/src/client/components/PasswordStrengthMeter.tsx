import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { validatePassword, type PasswordValidationResult } from '../utils/passwordPolicy';

interface PasswordStrengthMeterProps {
  password: string;
  username?: string;
}

export function PasswordStrengthMeter({
  password,
  username,
}: PasswordStrengthMeterProps) {
  if (!password) return null;

  const result: PasswordValidationResult = validatePassword(password, username);

  const getStrengthColor = () => {
    switch (result.strength) {
      case 'weak':
        return '#EF4444';
      case 'fair':
        return '#F59E0B';
      case 'strong':
        return '#2563EB';
      case 'very strong':
        return '#10B981';
      default:
        return '#94A3B8';
    }
  };

  const strengthColor = getStrengthColor();

  return (
    <View style={styles.container}>
      <View style={styles.meterHeader}>
        <Text style={styles.meterTitle}>Strength:</Text>
        <Text style={[styles.meterBadge, { color: strengthColor }]}>
          {result.strength.toUpperCase()}
        </Text>
      </View>

      <View style={styles.barRow}>
        {[1, 2, 3, 4, 5].map((index) => (
          <View
            key={index}
            style={[
              styles.barSegment,
              { backgroundColor: index <= result.score ? strengthColor : '#E2E8F0' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 14,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  meterTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  meterBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  barRow: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
  },
  barSegment: {
    flex: 1,
    borderRadius: 2,
  },
});
