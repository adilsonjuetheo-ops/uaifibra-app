import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../services/auth';
import { getContratos } from '../../services/cliente';

function contratoStatusInfo(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    A: { label: 'Ativo', color: Colors.success },
    I: { label: 'Inativo', color: Colors.textMuted },
    CA: { label: 'Cancelado', color: Colors.danger },
    FA: { label: 'Financeiro Bloqueado', color: Colors.warning },
    AA: { label: 'Aguardando Ativação', color: Colors.info },
  };
  return map[status] ?? { label: status, color: Colors.textMuted };
}

function RowItem({ icon, label, value, onPress, color = Colors.orange }: {
  icon: string; label: string; value?: string; onPress?: () => void; color?: string;
}) {
  const Inner = (
    <View style={row.container}>
      <View style={[row.iconBox, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={row.info}>
        <Text style={row.label}>{label}</Text>
        {value && <Text style={row.value}>{value}</Text>}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Inner}</TouchableOpacity>;
  return Inner;
}

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);

  const { data: contratos } = useQuery({
    queryKey: ['contratos', user?.id_cliente],
    queryFn: () => getContratos(user!.id_cliente),
    enabled: !!user,
  });

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout();
          clearUser();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar e nome */}
      <View style={styles.avatarArea}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.nome?.charAt(0).toUpperCase() ?? 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.nome}</Text>
        <Text style={styles.cpf}>{user?.cpf_cnpj}</Text>
      </View>

      {/* Dados de contato */}
      <Text style={styles.sectionTitle}>Dados Pessoais</Text>
      <Card style={styles.sectionCard}>
        <RowItem icon="person-outline" label="Nome completo" value={user?.nome} />
        <View style={styles.div} />
        <RowItem icon="card-outline" label="CPF" value={user?.cpf_cnpj} />
        <View style={styles.div} />
        <RowItem
          icon="mail-outline"
          label="E-mail"
          value={user?.email || '—'}
          onPress={user?.email ? () => Linking.openURL(`mailto:${user.email}`) : undefined}
        />
        <View style={styles.div} />
        <RowItem
          icon="call-outline"
          label="Telefone"
          value={user?.celular || user?.fone || '—'}
          onPress={user?.celular ? () => Linking.openURL(`tel:${user.celular}`) : undefined}
        />
      </Card>

      {/* Contratos */}
      {contratos && contratos.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Meus Contratos</Text>
          {contratos.map((c) => {
            const { label, color } = contratoStatusInfo(c.status);
            return (
              <Card key={c.id} style={styles.sectionCard}>
                <View style={styles.contractRow}>
                  <Text style={styles.contractPlan}>{c.descricao_plano}</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
                    <Text style={[styles.statusPillText, { color }]}>{label}</Text>
                  </View>
                </View>
                <Text style={styles.contractDetail}>
                  {c.velocidade_down} Mbps down / {c.velocidade_up} Mbps up
                </Text>
                <Text style={styles.contractDetail}>
                  Vencimento: dia {c.dia_vencimento}
                </Text>
              </Card>
            );
          })}
        </>
      )}

      {/* Conta e segurança */}
      <Text style={styles.sectionTitle}>Conta e Segurança</Text>
      <Card style={styles.sectionCard}>
        <RowItem
          icon="lock-closed-outline"
          label="Alterar senha"
          onPress={() => router.push('/(auth)/alterar-senha')}
        />
        <View style={styles.div} />
        <RowItem
          icon="notifications-outline"
          label="Notificações"
          onPress={() => Alert.alert('Em breve', 'Configurações de notificações em breve.')}
        />
        <View style={styles.div} />
        <RowItem
          icon="shield-checkmark-outline"
          label="Termos e Privacidade"
          onPress={() => Alert.alert('Termos', 'Consulte os termos em nosso site.')}
        />
      </Card>

      {/* Botão sair */}
      <Button
        title="Sair da conta"
        onPress={handleLogout}
        variant="outline"
        style={styles.logoutBtn}
        textStyle={{ color: Colors.danger }}
      />

      <Text style={styles.version}>UaiFibra App v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark },
  container: { padding: 20, paddingBottom: 40 },
  avatarArea: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: Colors.white, fontSize: 34, fontWeight: '900' },
  name: { color: Colors.white, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  cpf: { color: Colors.textMuted, fontSize: 13 },
  sectionTitle: { color: Colors.white, fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  sectionCard: { marginBottom: 20, padding: 4 },
  div: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 12 },
  contractRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  contractPlan: { color: Colors.white, fontSize: 14, fontWeight: '800', flex: 1, marginRight: 8 },
  contractDetail: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  logoutBtn: { borderColor: Colors.danger, marginTop: 8, marginBottom: 16 },
  version: { color: Colors.textDim, textAlign: 'center', fontSize: 12 },
});

const row = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  label: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  value: { color: Colors.white, fontSize: 14, fontWeight: '700', marginTop: 2 },
});
