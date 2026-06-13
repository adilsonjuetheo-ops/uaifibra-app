import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { ContractSelector } from '@/components/ContractSelector';
import { ProfileField } from '@/components/perfil/ProfileField';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ENV } from '@/constants/ixcEndpoints';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { configurarNotificacoes } from '@/hooks/useNotifications';
import { STATUS_INTERNET_LABEL } from '@/services/cliente';
import { useAuthStore } from '@/store/authStore';
import { contratoAtual, useContractStore } from '@/store/contractStore';
import { useBiometricStore } from '@/store/biometricStore';
import { useNotificationStore } from '@/store/notificationStore';
import { showToast } from '@/store/toastStore';
import { initials, maskCpf } from '@/utils/format';

export default function PerfilScreen() {
  const router = useRouter();
  const { cliente, logout } = useAuthStore();
  const { lembretesAtivos, setLembretesAtivos } = useNotificationStore();
  const { ativa: biometriaAtiva, setAtiva: setBiometriaAtiva } = useBiometricStore();

  const contractStore = useContractStore();
  const contrato = contratoAtual(contractStore);
  const [atualizando, setAtualizando] = useState(false);

  const carregarContratos = contractStore.carregar;
  const carregar = useCallback(async () => {
    if (!cliente) return;
    try {
      await carregarContratos(cliente.id);
    } catch {
      // dados do contrato são complementares — não bloqueia a tela
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

  const alternarNotificacoes = async (ativo: boolean) => {
    if (ativo) {
      const ok = await configurarNotificacoes();
      if (!ok) {
        showToast('Permita as notificações nas configurações do aparelho.', 'error');
        return;
      }
    }
    await setLembretesAtivos(ativo);
    showToast(
      ativo ? 'Lembretes de vencimento ativados.' : 'Lembretes de vencimento desativados.',
      'success'
    );
  };

  const alternarBiometria = async (ativo: boolean) => {
    if (ativo) {
      const temHardware = await LocalAuthentication.hasHardwareAsync();
      const cadastrada = await LocalAuthentication.isEnrolledAsync();
      if (!temHardware || !cadastrada) {
        showToast('Cadastre uma digital ou Face ID nas configurações do aparelho.', 'error');
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua biometria para ativar',
        cancelLabel: 'Cancelar',
      });
      if (!res.success) return;
    }
    await setBiometriaAtiva(ativo);
    showToast(
      ativo ? 'Desbloqueio por biometria ativado.' : 'Desbloqueio por biometria desativado.',
      'success'
    );
  };

  const sair = () => {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  // Exclusão de conta com dupla confirmação (exigência App Store 5.1.1)
  const excluirConta = () => {
    Alert.alert(
      'Excluir Conta',
      'Esta ação apaga todos os seus dados deste aparelho e envia à UaiFibra uma solicitação de exclusão dos seus dados pessoais (LGPD).\n\n' +
        'Atenção: isso não cancela seu contrato de internet — o serviço continua ativo. ' +
        'Para cancelar o serviço, fale com o atendimento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', style: 'destructive', onPress: confirmarExclusao },
      ]
    );
  };

  const confirmarExclusao = () => {
    Alert.alert(
      'Confirmar exclusão definitiva',
      'Tem certeza? Você será desconectado, os dados do app serão apagados e a solicitação de exclusão será aberta no WhatsApp do atendimento. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir definitivamente',
          style: 'destructive',
          onPress: () => void executarExclusao(),
        },
      ]
    );
  };

  const executarExclusao = async () => {
    const msg =
      'Olá! Solicito a EXCLUSÃO dos meus dados pessoais conforme a LGPD. ' +
      `Nome: ${cliente?.nome ?? ''} — CPF: ${maskCpf(cliente?.cpf)}. ` +
      'Pedido feito pelo app UaiFibra.';
    // abre a solicitação no WhatsApp do atendimento antes de desconectar
    try {
      await Linking.openURL(
        `https://wa.me/${ENV.SUPORTE_WHATSAPP}?text=${encodeURIComponent(msg)}`
      );
    } catch {
      // sem WhatsApp instalado: a exclusão local prossegue mesmo assim
    }
    await AsyncStorage.clear(); // histórico de testes, preferências, lembretes
    await logout(); // remove credenciais do SecureStore e volta ao login
  };

  const sobre = () => {
    Alert.alert(
      'Sobre o App',
      `UaiFibra v${Constants.expoConfig?.version ?? '1.0.0'}\n\nAplicativo do assinante UaiFibra Fibra.`,
      [
        {
          text: 'Política de Privacidade',
          onPress: () =>
            void Linking.openURL(
              'https://adilsonjuetheo-ops.github.io/uaifibra-privacidade/'
            ),
        },
        { text: 'Fechar', style: 'cancel' },
      ]
    );
  };

  const statusContrato = contrato
    ? (STATUS_INTERNET_LABEL[contrato.status_internet] ?? {
        label: 'Indisponível',
        tone: 'neutral' as const,
      })
    : null;

  if (!cliente) return null;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Avatar */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{initials(cliente.nome)}</Text>
        </View>
        <Text style={styles.nome}>{cliente.nome}</Text>
        {statusContrato ? (
          <Badge label={statusContrato.label} tone={statusContrato.tone} />
        ) : null}
      </View>

      <ContractSelector />

      {/* Dados do cliente */}
      <Card>
        <ProfileField icon="card-account-details-outline" label="CPF" value={maskCpf(cliente.cpf)} />
        <ProfileField icon="email-outline" label="E-mail" value={cliente.email} />
        <ProfileField icon="phone-outline" label="Telefone" value={cliente.telefone} />
        <ProfileField icon="map-marker-outline" label="Endereço de instalação" value={cliente.endereco} />
        <ProfileField
          icon="wifi"
          label="Plano contratado"
          value={contrato?.contrato || 'Carregando...'}
        />
        <View style={styles.ultimoCampo}>
          <ProfileField
            icon="file-sign"
            label="Status do contrato"
            value={contrato ? (contrato.status === 'A' ? 'Ativo' : 'Inativo') : '--'}
          />
        </View>
      </Card>

      {/* Configurações */}
      <Text style={styles.secao}>Configurações</Text>
      <Card style={{ paddingVertical: 4 }}>
        <Pressable style={styles.opcao} onPress={() => router.push('/change-password')}>
          <MaterialCommunityIcons name="lock-reset" size={22} color={colors.primary} />
          <Text style={styles.opcaoTexto}>Alterar Senha</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
        </Pressable>

        <View style={styles.opcao}>
          <MaterialCommunityIcons name="bell-ring-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.opcaoTexto}>Notificações</Text>
            <Text style={styles.opcaoDescricao}>Lembretes de vencimento de fatura</Text>
          </View>
          <Switch
            value={lembretesAtivos}
            onValueChange={(v) => void alternarNotificacoes(v)}
            trackColor={{ false: colors.border, true: colors.primaryDark }}
            thumbColor={lembretesAtivos ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.opcao}>
          <MaterialCommunityIcons name="fingerprint" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.opcaoTexto}>Desbloqueio por biometria</Text>
            <Text style={styles.opcaoDescricao}>Exige digital ou Face ID ao abrir o app</Text>
          </View>
          <Switch
            value={biometriaAtiva}
            onValueChange={(v) => void alternarBiometria(v)}
            trackColor={{ false: colors.border, true: colors.primaryDark }}
            thumbColor={biometriaAtiva ? colors.primary : colors.textSecondary}
          />
        </View>

        <Pressable style={styles.opcao} onPress={sobre}>
          <MaterialCommunityIcons name="information-outline" size={22} color={colors.primary} />
          <Text style={styles.opcaoTexto}>Sobre o App</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={[styles.opcao, { borderBottomWidth: 0 }]} onPress={excluirConta}>
          <MaterialCommunityIcons name="account-remove-outline" size={22} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.opcaoTexto, { color: colors.danger }]}>Excluir Conta</Text>
            <Text style={styles.opcaoDescricao}>
              Apaga seus dados do app e solicita exclusão (LGPD)
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
        </Pressable>
      </Card>

      {/* Sair */}
      <Pressable style={styles.sair} onPress={sair}>
        <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
        <Text style={styles.sairTexto}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    color: '#FFFFFF',
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.fontFamily.bold,
  },
  nome: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  ultimoCampo: {
    marginBottom: -12,
  },
  secao: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  opcaoTexto: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.medium,
  },
  opcaoDescricao: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  sair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  sairTexto: {
    color: colors.danger,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.semibold,
  },
});
