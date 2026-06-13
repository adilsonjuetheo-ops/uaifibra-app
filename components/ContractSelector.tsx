import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radius, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useContractStore } from '@/store/contractStore';

/** Rótulo curto do contrato: descrição do plano ou nº do contrato. */
function rotulo(contrato: { id: string; contrato: string }): string {
  const desc = (contrato.contrato || '').trim();
  if (desc) return desc.length > 28 ? `${desc.slice(0, 28)}…` : desc;
  return `Contrato #${contrato.id}`;
}

/**
 * Seletor de contrato — só aparece quando o cliente tem mais de um.
 * A seleção vale para o app todo (Home, Perfil, Desbloqueio).
 */
export function ContractSelector() {
  const cliente = useAuthStore((s) => s.cliente);
  const { contratos, selecionadoId, selecionar } = useContractStore();

  if (!cliente || contratos.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {contratos.map((c) => {
        const ativo = c.id === selecionadoId;
        return (
          <Pressable
            key={c.id}
            onPress={() => void selecionar(cliente.id, c.id)}
            style={[styles.chip, ativo && styles.chipAtivo]}
          >
            <MaterialCommunityIcons
              name={ativo ? 'check-circle' : 'file-sign'}
              size={16}
              color={ativo ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.texto, ativo && styles.textoAtivo]}>{rotulo(c)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipAtivo: {
    backgroundColor: 'rgba(0, 166, 81, 0.15)',
    borderColor: colors.primary,
  },
  texto: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  textoAtivo: { color: colors.primary },
});
