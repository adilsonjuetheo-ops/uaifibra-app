import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, typography } from '@/constants/theme';

const SIZE = 260;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
// arco de 270° (de 135° a 405°)
const START_ANGLE = 135;
const SWEEP = 270;
const MAX_VISUAL = 500; // Mbps no fundo da escala

function polar(angleDeg: number, r: number = RADIUS) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + r * Math.cos(rad),
    y: CENTER + r * Math.sin(rad),
  };
}

function arcPath(fromDeg: number, toDeg: number): string {
  const start = polar(fromDeg);
  const end = polar(toDeg);
  const largeArc = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

interface SpeedometerProps {
  /** Velocidade atual em Mbps. */
  value: number;
  /** Rótulo abaixo do número (ex.: "DOWNLOAD"). */
  label: string;
  unidade?: string;
}

export function Speedometer({ value, label, unidade = 'Mbps' }: SpeedometerProps) {
  // escala logarítmica para dar sensação de velocímetro
  const norm = Math.min(Math.log10(value + 1) / Math.log10(MAX_VISUAL + 1), 1);
  const endAngle = START_ANGLE + Math.max(norm * SWEEP, 0.01);

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        <Path
          d={arcPath(START_ANGLE, START_ANGLE + SWEEP)}
          stroke={colors.surfaceElevated}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={arcPath(START_ANGLE, endAngle)}
          stroke={colors.primary}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <Circle
          cx={polar(endAngle).x}
          cy={polar(endAngle).y}
          r={STROKE / 2 + 4}
          fill={colors.primaryLight}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.valor}>{value.toFixed(value >= 100 ? 0 : 1)}</Text>
        <Text style={styles.unidade}>{unidade}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  valor: {
    color: colors.textPrimary,
    fontSize: 52,
    fontFamily: typography.fontFamily.bold,
  },
  unidade: {
    color: colors.primary,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.semibold,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    letterSpacing: 2,
    marginTop: 4,
  },
});
