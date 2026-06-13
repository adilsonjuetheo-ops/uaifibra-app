import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, typography } from '@/constants/theme';
import { ToastTone, useToastStore } from '@/store/toastStore';

const ICONS: Record<ToastTone, keyof typeof MaterialCommunityIcons.glyphMap> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'information',
};

const TONE_COLOR: Record<ToastTone, string> = {
  success: colors.success,
  error: colors.danger,
  info: colors.info,
};

/** Toast global — renderizar uma única vez no layout raiz. */
export function Toast() {
  const { mensagem, tone } = useToastStore();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: mensagem ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [mensagem, opacity]);

  if (!mensagem) return null;

  return (
    <Animated.View
      style={[styles.toast, { top: insets.top + 8, opacity, borderColor: TONE_COLOR[tone] }]}
      pointerEvents="none"
    >
      <MaterialCommunityIcons name={ICONS[tone]} size={20} color={TONE_COLOR[tone]} />
      <Text style={styles.text}>{mensagem}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    zIndex: 999,
    elevation: 8,
  },
  text: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
});
