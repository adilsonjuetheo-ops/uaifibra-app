import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { colors, typography } from '@/constants/theme';
import { FaturaStatus, IXCFatura, statusFatura } from '@/services/faturas';
import { formatCurrency, formatDate, monthRef } from '@/utils/format';

const STATUS_BADGE: Record<FaturaStatus, { label: string; tone: BadgeTone }> = {
  paga: { label: 'Paga', tone: 'success' },
  aberta: { label: 'Em aberto', tone: 'warning' },
  vencida: { label: 'Vencida', tone: 'danger' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
};

interface FaturaCardProps {
  fatura: IXCFatura;
}

export function FaturaCard({ fatura }: FaturaCardProps) {
  const router = useRouter();
  const status = statusFatura(fatura);
  const badge = STATUS_BADGE[status];
  const emAberto = status === 'aberta' || status === 'vencida';

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.mes}>{monthRef(fatura.data_vencimento)}</Text>
          <Text style={styles.valor}>{formatCurrency(fatura.valor)}</Text>
          <Text style={styles.vencimento}>
            Vencimento: {formatDate(fatura.data_vencimento)}
          </Text>
        </View>
        <Badge label={badge.label} tone={badge.tone} />
      </View>

      {emAberto && (
        <Pressable
          style={styles.pagarBtn}
          onPress={() => router.push(`/fatura/${fatura.id}`)}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.primary} />
          <Text style={styles.pagarTexto}>Ver detalhes / Pagar</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  mes: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  valor: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
  },
  vencimento: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  pagarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  pagarTexto: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
  },
});
