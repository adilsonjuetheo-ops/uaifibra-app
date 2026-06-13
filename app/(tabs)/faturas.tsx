import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FaturaCard } from '@/components/faturas/FaturaCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { IXCFatura, listarFaturas, statusFatura } from '@/services/faturas';
import { friendlyError } from '@/services/ixc';
import { useAuthStore } from '@/store/authStore';

type Filtro = 'todas' | 'abertas' | 'pagas' | 'vencidas';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'abertas', label: 'Em aberto' },
  { key: 'pagas', label: 'Pagas' },
  { key: 'vencidas', label: 'Vencidas' },
];

export default function FaturasScreen() {
  const cliente = useAuthStore((s) => s.cliente);
  const [faturas, setFaturas] = useState<IXCFatura[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    if (!cliente) return;
    setErro(null);
    try {
      setFaturas(await listarFaturas(cliente.id));
    } catch (error) {
      setErro(friendlyError(error));
      setFaturas([]);
    }
  }, [cliente]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const refresh = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  const filtradas = useMemo(() => {
    if (!faturas) return [];
    switch (filtro) {
      case 'abertas':
        return faturas.filter((f) => statusFatura(f) === 'aberta');
      case 'pagas':
        return faturas.filter((f) => statusFatura(f) === 'paga');
      case 'vencidas':
        return faturas.filter((f) => statusFatura(f) === 'vencida');
      default:
        return faturas;
    }
  }, [faturas, filtro]);

  if (faturas === null) {
    return <LoadingSpinner mensagem="Carregando suas faturas..." />;
  }

  return (
    <View style={styles.flex}>
      <View style={styles.filtros}>
        {FILTROS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFiltro(f.key)}
            style={[styles.filtro, filtro === f.key && styles.filtroAtivo]}
          >
            <Text
              style={[styles.filtroTexto, filtro === f.key && styles.filtroTextoAtivo]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtradas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FaturaCard fatura={item} />}
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
        ListEmptyComponent={
          <View style={styles.vazio}>
            <MaterialCommunityIcons
              name={erro ? 'cloud-alert' : 'file-check-outline'}
              size={48}
              color={colors.textSecondary}
            />
            <Text style={styles.vazioTexto}>
              {erro ?? 'Nenhuma fatura encontrada com esse filtro.'}
            </Text>
            {erro ? (
              <Pressable onPress={() => void carregar()}>
                <Text style={styles.tentarNovamente}>Tentar novamente</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  filtros: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filtro: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filtroAtivo: {
    backgroundColor: 'rgba(0, 166, 81, 0.15)',
    borderColor: colors.primary,
  },
  filtroTexto: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  filtroTextoAtivo: { color: colors.primary },
  lista: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
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
  tentarNovamente: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
  },
});
