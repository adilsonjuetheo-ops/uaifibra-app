import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/constants/theme';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: 'rgba(0, 166, 81, 0.15)', fg: colors.success },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', fg: colors.warning },
  danger: { bg: 'rgba(239, 68, 68, 0.15)', fg: colors.danger },
  info: { bg: 'rgba(59, 130, 246, 0.15)', fg: colors.info },
  neutral: { bg: 'rgba(160, 160, 160, 0.15)', fg: colors.textSecondary },
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.semibold,
  },
});
