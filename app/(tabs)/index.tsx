import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContractSelector } from '@/components/ContractSelector';
import { DesbloqueioModal } from '@/components/faturas/DesbloqueioModal';
import { Badge, BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { Aviso, avisosAtivos, buscarAvisos } from '@/services/avisos';
import { STATUS_INTERNET_LABEL } from '@/services/cliente';
import { IXCFatura, listarFaturas, proximaFatura, statusFatura } from '@/services/faturas';
import { friendlyError } from '@/services/ixc';
import { useAuthStore } from '@/store/authStore';
import { contratoAtual, useContractStore } from '@/store/contractStore';
import { daysUntil, formatCurrency, formatDate } from '@/utils/format';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cliente = useAuthStore((s) => s.cliente);

  const contractStore = useContractStore();
  const [faturas, setFaturas] = useState<IXCFatura[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [modalDesbloqueio, setModalDesbloqueio] = useState(false);

  const carregarContratos = contractStore.carregar;
  const carregar = useCallback(async () => {
    if (!cliente) return;
    setErro(null);
    try {
      const [, fts, avs] = await Promise.all([
        carregarContratos(cliente.id),
        listarFaturas(cliente.id),
        buscarAvisos(),
      ]);
      setFaturas(fts);
      setAvisos(avisosAtivos(avs, cliente.cidade));
    } catch (error) {
      setErro(friendlyError(error));
    }
  }, [cliente, carregarContratos]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const refresh = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  const contrato = contratoAtual(contractStore);
  const statusConexao = contrato
    ? (STATUS_INTERNET_LABEL[contrato.status_internet] ?? {
        label: 'Status desconhecido',
        tone: 'warning' as const,
      })
    : null;
  const bloqueado =
    !!contrato && ['CM', 'CA', 'FA', 'D'].includes(contrato.status_internet);

  const fatura = proximaFatura(faturas);
  const dias = fatura ? daysUntil(fatura.data_vencimento) : 0;
  const faturaVencida = fatura ? statusFatura(fatura) === 'vencida' : false;
  const badgeFatura: { label: string; tone: BadgeTone } = faturaVencida
    ? { label: `Vencida há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`, tone: 'danger' }
    : dias === 0
      ? { label: 'Vence hoje', tone: 'warning' }
      : { label: `Vence em ${dias} dia${dias === 1 ? '' : 's'}`, tone: dias <= 3 ? 'warning' : 'info' };

  const primeiroNome = cliente?.nome.split(' ')[0] ?? '';

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + spacing.md },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Text style={styles.saudacao}>Olá, {primeiroNome} 👋</Text>
      <Text style={styles.subtitulo}>Bem-vindo de volta à UaiFibra</Text>

      <ContractSelector />

      {erro ? (
        <Card style={styles.cardErro}>
          <MaterialCommunityIcons name="wifi-off" size={22} color={colors.danger} />
          <Text style={styles.erroTexto}>{erro}</Text>
          <Pressable onPress={() => void carregar()}>
            <Text style={styles.tentarNovamente}>Tentar novamente</Text>
          </Pressable>
        </Card>
      ) : null}

      {/* Status da conexão */}
      <Card elevated style={styles.cardStatus}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: statusConexao
                ? statusConexao.tone === 'success'
                  ? colors.success
                  : statusConexao.tone === 'warning'
                    ? colors.warning
                    : colors.danger
                : colors.textSecondary,
            },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusLabel}>Status da conexão</Text>
          <Text style={styles.statusValor}>
            {statusConexao?.label ?? 'Carregando...'}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={bloqueado ? 'wifi-off' : 'wifi'}
          size={28}
          color={bloqueado ? colors.danger : colors.primary}
        />
      </Card>

      {/* Próxima fatura */}
      {fatura ? (
        <Card style={{ gap: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitulo}>Próxima fatura</Text>
            <Badge label={badgeFatura.label} tone={badgeFatura.tone} />
          </View>
          <Text style={styles.faturaValor}>{formatCurrency(fatura.valor)}</Text>
          <Text style={styles.faturaVencimento}>
            Vencimento: {formatDate(fatura.data_vencimento)}
          </Text>
        </Card>
      ) : (
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="check-decagram" size={32} color={colors.primary} />
          <Text style={styles.semFatura}>Nenhuma fatura em aberto. Tudo em dia! 🎉</Text>
        </Card>
      )}

      {/* Ações rápidas */}
      <View style={styles.acoes}>
        <Pressable
          style={styles.acao}
          onPress={() =>
            fatura ? router.push(`/fatura/${fatura.id}`) : router.push('/(tabs)/faturas')
          }
        >
          <View style={styles.acaoIcone}>
            <MaterialCommunityIcons name="barcode-scan" size={26} color={colors.primary} />
          </View>
          <Text style={styles.acaoTexto}>Pagar Fatura</Text>
        </Pressable>

        <Pressable style={styles.acao} onPress={() => setModalDesbloqueio(true)}>
          <View style={styles.acaoIcone}>
            <MaterialCommunityIcons name="lock-open-outline" size={26} color={colors.primary} />
          </View>
          <Text style={styles.acaoTexto}>Desbloquear em Confiança</Text>
        </Pressable>
      </View>

      {/* Plano contratado */}
      <Card style={{ gap: spacing.sm }}>
        <Text style={styles.cardTitulo}>Seu plano</Text>
        {contrato ? (
          <>
            <Text style={styles.planoNome}>{contrato.contrato || 'Plano contratado'}</Text>
            <View style={styles.planoRow}>
              <View style={styles.planoItem}>
                <MaterialCommunityIcons name="download" size={20} color={colors.primary} />
                <Text style={styles.planoLabel}>Download</Text>
              </View>
              <View style={styles.planoItem}>
                <MaterialCommunityIcons name="upload" size={20} color={colors.primaryLight} />
                <Text style={styles.planoLabel}>Upload</Text>
              </View>
              <View style={styles.planoItem}>
                <MaterialCommunityIcons
                  name="calendar-check"
                  size={20}
                  color={colors.info}
                />
                <Text style={styles.planoLabel}>
                  Ativo desde {formatDate(contrato.data_ativacao)}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.semFatura}>Nenhum contrato encontrado.</Text>
        )}
      </Card>

      {/* Avisos do provedor (mural); sem aviso ativo, mostra a dica padrão */}
      {avisos.length > 0 ? (
        <Pressable onPress={() => router.push('/avisos' as Parameters<typeof router.push>[0])}>
          <Card style={styles.avisos}>
            <MaterialCommunityIcons
              name={avisos[0].tipo === 'info' ? 'bell-ring-outline' : 'alert-circle-outline'}
              size={20}
              color={avisos[0].tipo === 'urgente' ? colors.danger : avisos[0].tipo === 'manutencao' ? colors.warning : colors.info}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.avisoTitulo}>{avisos[0].titulo}</Text>
              <Text style={styles.avisoTexto} numberOfLines={2}>
                {avisos[0].mensagem}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </Card>
        </Pressable>
      ) : (
        <Card style={styles.avisos}>
          <MaterialCommunityIcons name="bell-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.avisoTexto}>
            {faturaVencida
              ? 'Você possui fatura vencida. Pague agora para evitar bloqueio do acesso.'
              : 'Pague suas faturas pelo app com PIX e tenha a liberação em até 1 hora.'}
          </Text>
        </Card>
      )}

      <DesbloqueioModal
        visible={modalDesbloqueio}
        onClose={() => setModalDesbloqueio(false)}
        onSuccess={() => void carregar()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  saudacao: {
    color: colors.textPrimary,
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.fontFamily.bold,
  },
  subtitulo: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    marginTop: -spacing.sm,
  },
  cardErro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: colors.danger,
  },
  erroTexto: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  tentarNovamente: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
  },
  cardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  statusValor: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.semibold,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitulo: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  faturaValor: {
    color: colors.textPrimary,
    fontSize: typography.sizes['3xl'],
    fontFamily: typography.fontFamily.bold,
  },
  faturaVencimento: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  semFatura: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  acoes: { flexDirection: 'row', gap: spacing.md },
  acao: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 10,
  },
  acaoIcone: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acaoTexto: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
    textAlign: 'center',
  },
  planoNome: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.semibold,
  },
  planoRow: { gap: 8 },
  planoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planoLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  avisos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avisoTitulo: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
  },
  avisoTexto: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 20,
  },
});
