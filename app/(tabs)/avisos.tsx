import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { colors, spacing, typography } from '@/constants/theme';
import { Aviso, AvisoTipo, avisosAtivos, buscarAvisos } from '@/services/avisos';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/utils/format';

const TIPO_VISUAL: Record<
  AvisoTipo,
  { icone: keyof typeof MaterialCommunityIcons.glyphMap; cor: string; rotulo: string }
> = {
  info: { icone: 'information', cor: colors.info, rotulo: 'Informativo' },
  manutencao: { icone: 'tools', cor: colors.warning, rotulo: 'Manutenção' },
  urgente: { icone: 'alert', cor: colors.danger, rotulo: 'Urgente' },
};

export default function AvisosScreen() {
  const cliente = useAuthStore((s) => s.cliente);
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    const todos = await buscarAvisos();
    setAvisos(avisosAtivos(todos, cliente?.cidade));
  }, [cliente?.cidade]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const refresh = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  if (avisos === null) return <LoadingSpinner mensagem="Carregando avisos..." />;

  return (
    <FlatList
      style={styles.flex}
      data={avisos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.lista}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      renderItem={({ item }) => {
        const visual = TIPO_VISUAL[item.tipo] ?? TIPO_VISUAL.info;
        return (
          <Card style={[styles.card, { borderLeftColor: visual.cor }]}>
            <View style={styles.cabecalho}>
              <MaterialCommunityIcons name={visual.icone} size={22} color={visual.cor} />
              <Text style={[styles.tipo, { color: visual.cor }]}>{visual.rotulo}</Text>
              {item.exibirAte ? (
                <Text style={styles.validade}>até {formatDate(item.exibirAte)}</Text>
              ) : null}
            </View>
            <Text style={styles.titulo}>{item.titulo}</Text>
            <Text style={styles.mensagem}>{item.mensagem}</Text>
          </Card>
        );
      }}
      ListEmptyComponent={
        <View style={styles.vazio}>
          <MaterialCommunityIcons name="bell-check-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.vazioTexto}>
            Nenhum aviso no momento. Está tudo funcionando normalmente! ✅
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  lista: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  card: { gap: 8, borderLeftWidth: 4 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipo: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  validade: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  titulo: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.semibold,
  },
  mensagem: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 22,
  },
  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing['2xl'],
  },
  vazioTexto: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
