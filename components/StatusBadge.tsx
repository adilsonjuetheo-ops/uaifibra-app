import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface StatusBadgeProps {
  label: string;
  color?: string;
}

export function StatusBadge({ label, color = Colors.success }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}20`, borderColor: `${color}60` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '700' },
});
