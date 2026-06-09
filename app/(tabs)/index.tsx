import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuthStore } from '../../store/authStore';
import { getContratos } from '../../services/cliente';
import { getBoletos } from '../../services/financeiro';
import { solicitarDesbloqueioConfianca } from '../../services/cliente';

function contratoStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    A: { label: 'Ativo', color: Colors.success },
    I: { label: 'Inativo', color: Colors.textMuted },
    CA: { label: 'Cancelado', color: Colors.danger },
    CM: { label: 'Cancelado Migrando', color: Colors.danger },
    FA: { label: 'Financeiro Bloqueado', color: Colors.warning },
    AA: { label: 'Aguardando Ativação', color: Colors.info },
  };
  return map[status] ?? { label: status, color: Colors.textMuted };
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const {
    data: contratos,
    isLoading: loadingContratos,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['contratos', user?.id_cliente],
    queryFn: () => getContratos(user!.id_cliente),
    enabled: !!user,
  });

  const { data: boletos } = useQuery({
    queryKey: ['boletos', user?.id_cliente],
    queryFn: () => getBoletos(user!.id_cliente),
    enabled: !!user,
  });

  const boletosAbertos = boletos?.filter((b) => b.status === 'A') ?? [];
  const primeiroContrato = contratos?.[0];

  async function handleDesbloquear() {
    if (!primeiroContrato) return;
    Alert.alert(
      'Desbloqueio em Confiança',
      'Deseja solicitar desbloqueio temporário da sua conexão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          onPress: async () => {
            try {
              const msg = await solicitarDesbloqueioConfianca(primeiroContrato.id);
              Alert.alert('Sucesso!', msg);
            } catch {
              Alert.alert('Erro', 'Não foi possível solicitar o desbloqueio agora.');
            }
          },
        },
      ]
    );
  }

  const firstName = user?.nome?.split(' ')[0] ?? 'Cliente';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={Colors.orange}
          colors={[Colors.orange]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {firstName} 👋</Text>
          <Text style={styles.greetingSub}>Bem-vindo à UaiFibra</Text>
        </View>
        <View style={styles.logoSmall}>
          <Text style={styles.logoText}>U</Text>
        </View>
      </View>

      {/* Alerta de boleto aberto */}
      {boletosAbertos.length > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => router.push('/(tabs)/financeiro')}
          activeOpacity={0.8}
        >
          <Ionicons name="warning-outline" size={20} color={Colors.warning} />
          <Text style={styles.alertText}>
            Você tem {boletosAbertos.length} fatura{boletosAbertos.length > 1 ? 's' : ''} em aberto
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.warning} />
        </TouchableOpacity>
      )}

      {/* Contrato principal */}
      {loadingContratos ? (
        <Card style={styles.loadingCard}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </Card>
      ) : primeiroContrato ? (
        <Card highlight style={styles.contractCard}>
          <View style={styles.contractHeader}>
            <Text style={styles.contractTitle}>Meu Plano</Text>
            <StatusBadge
              label={contratoStatusLabel(primeiroContrato.status).label}
              color={contratoStatusLabel(primeiroContrato.status).color}
            />
          </View>
          <Text style={styles.planName}>{primeiroContrato.descricao_plano}</Text>
          <View style={styles.speedRow}>
            <View style={styles.speedItem}>
              <Ionicons name="arrow-down-circle" size={20} color={Colors.orange} />
              <Text style={styles.speedValue}>{primeiroContrato.velocidade_down} Mbps</Text>
              <Text style={styles.speedLabel}>Download</Text>
            </View>
            <View style={styles.speedDivider} />
            <View style={styles.speedItem}>
              <Ionicons name="arrow-up-circle" size={20} color={Colors.gold} />
              <Text style={styles.speedValue}>{primeiroContrato.velocidade_up} Mbps</Text>
              <Text style={styles.speedLabel}>Upload</Text>
            </View>
            <View style={styles.speedDivider} />
            <View style={styles.speedItem}>
              <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.speedValue}>Dia {primeiroContrato.dia_vencimento}</Text>
              <Text style={styles.speedLabel}>Vencimento</Text>
            </View>
          </View>
          {(primeiroContrato.status === 'FA' || primeiroContrato.status_internet === 'B') && (
            <TouchableOpacity style={styles.unlockBtn} onPress={handleDesbloquear} activeOpacity={0.8}>
              <Ionicons name="lock-open-outline" size={16} color={Colors.white} />
              <Text style={styles.unlockText}>Desbloqueio em Confiança</Text>
            </TouchableOpacity>
          )}
        </Card>
      ) : (
        <Card>
          <Text style={styles.textMuted}>Nenhum contrato encontrado.</Text>
        </Card>
      )}

      {/* Atalhos rápidos */}
      <Text style={styles.sectionTitle}>Acesso Rápido</Text>
      <View style={styles.shortcuts}>
        {[
          { icon: 'document-text-outline', label: 'Faturas', route: '/(tabs)/financeiro', color: Colors.orange },
          { icon: 'speedometer-outline', label: 'Velocidade', route: '/(tabs)/velocidade', color: Colors.gold },
          { icon: 'headset-outline', label: 'Suporte', route: '/(tabs)/suporte', color: Colors.info },
          { icon: 'person-outline', label: 'Perfil', route: '/(tabs)/perfil', color: Colors.success },
        ].map(({ icon, label, route, color }) => (
          <TouchableOpacity
            key={label}
            style={styles.shortcut}
            onPress={() => router.push(route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: `${color}18` }]}>
              <Ionicons name={icon as any} size={26} color={color} />
            </View>
            <Text style={styles.shortcutLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Informações do cliente */}
      <Text style={styles.sectionTitle}>Meus Dados</Text>
      <Card>
        <View style={styles.infoRow}>
          <Ionicons name="person-circle-outline" size={18} color={Colors.orange} />
          <Text style={styles.infoLabel}>Nome</Text>
          <Text style={styles.infoValue}>{user?.nome}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.infoRow}>
          <Ionicons name="card-outline" size={18} color={Colors.orange} />
          <Text style={styles.infoLabel}>CPF</Text>
          <Text style={styles.infoValue}>{user?.cpf_cnpj}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={18} color={Colors.orange} />
          <Text style={styles.infoLabel}>Celular</Text>
          <Text style={styles.infoValue}>{user?.celular || user?.fone || '—'}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark },
  container: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: Colors.white, fontSize: 22, fontWeight: '900' },
  greetingSub: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  logoSmall: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: Colors.white, fontWeight: '900', fontSize: 18 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,208,0,0.1)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,208,0,0.3)',
    padding: 14, marginBottom: 16,
  },
  alertText: { flex: 1, color: Colors.warning, fontSize: 14, fontWeight: '600' },
  contractCard: { marginBottom: 24 },
  contractHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  contractTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  planName: { color: Colors.white, fontSize: 20, fontWeight: '900', marginBottom: 16 },
  speedRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  speedItem: { alignItems: 'center', gap: 4 },
  speedValue: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  speedLabel: { color: Colors.textMuted, fontSize: 11 },
  speedDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  unlockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 16, backgroundColor: Colors.orange,
    borderRadius: 10, paddingVertical: 10,
  },
  unlockText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  loadingCard: { padding: 24, alignItems: 'center', marginBottom: 24 },
  loadingText: { color: Colors.textMuted },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '800', marginBottom: 14, marginTop: 4 },
  shortcuts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  shortcut: { alignItems: 'center', gap: 8, flex: 1 },
  shortcutIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  infoLabel: { color: Colors.textMuted, fontSize: 13, width: 60 },
  infoValue: { color: Colors.white, fontSize: 13, fontWeight: '600', flex: 1 },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 10 },
  textMuted: { color: Colors.textMuted, textAlign: 'center' },
});
