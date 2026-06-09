import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  highlight?: boolean;
}

export function Card({ children, style, highlight = false }: CardProps) {
  return (
    <View style={[styles.card, highlight && styles.highlight, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
  },
  highlight: {
    borderColor: Colors.orange,
    backgroundColor: 'rgba(255,106,0,0.08)',
  },
});
