import React, { useState } from 'react';
import type { IXCChamado } from '../../types/ixc';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuthStore } from '../../store/authStore';
import { getChamados, abrirChamado } from '../../services/chamados';

function chamadoStatus(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    A: { label: 'Aberto', color: Colors.warning },
    E: { label: 'Em atendimento', color: Colors.info },
    F: { label: 'Fechado', color: Colors.success },
  };
  return map[status] ?? { label: status, color: Colors.textMuted };
}

function formatDate(date: string) {
  if (!date) return '—';
  const [y, m, d] = date.split(' ')[0].split('-');
  return `${d}/${m}/${y}`;
}

export default function SuporteScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);

  const { data: chamados, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['chamados', user?.id_cliente],
    queryFn: () => getChamados(user!.id_cliente),
    enabled: !!user,
  });

  async function handleAbrir() {
    if (!assunto.trim() || !mensagem.trim()) {
      Alert.alert('Atenção', 'Preencha o assunto e a descrição do problema.');
      return;
    }
    setSending(true);
    try {
      await abrirChamado(user!.id_cliente, assunto.trim(), mensagem.trim());
      Alert.alert('Chamado aberto!', 'Seu chamado foi registrado com sucesso. Em breve nossa equipe entrará em contato.');
      setAssunto('');
      setMensagem('');
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o chamado. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.orange} colors={[Colors.orange]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Suporte</Text>
            <Text style={styles.pageSub}>Abertura e acompanhamento de chamados</Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Contato rápido */}
        <Card style={styles.contactCard}>
          <Text style={styles.contactTitle}>Contato Rápido</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL('tel:08001234567')}
            >
              <View style={styles.contactIcon}>
                <Ionicons name="call-outline" size={22} color={Colors.orange} />
              </View>
              <Text style={styles.contactLabel}>Ligar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL('https://wa.me/5500000000000')}
            >
              <View style={[styles.contactIcon, { backgroundColor: 'rgba(37,211,102,0.12)' }]}>
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </View>
              <Text style={styles.contactLabel}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => setShowModal(true)}
            >
              <View style={[styles.contactIcon, { backgroundColor: 'rgba(51,181,229,0.12)' }]}>
                <Ionicons name="chatbubble-outline" size={22} color={Colors.info} />
              </View>
              <Text style={styles.contactLabel}>Chamado</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Meus Chamados</Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.orange} style={{ marginTop: 24 }} />
        ) : !chamados || chamados.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="headset-outline" size={40} color={Colors.textDim} />
            <Text style={styles.emptyText}>Nenhum chamado encontrado</Text>
            <Button title="Abrir chamado" onPress={() => setShowModal(true)} style={{ marginTop: 4 }} />
          </Card>
        ) : (
          chamados.map((chamado: IXCChamado) => {
            const { label, color } = chamadoStatus(chamado.status);
            return (
              <Card key={chamado.id} style={styles.chamadoCard}>
                <View style={styles.chamadoHeader}>
                  <Text style={styles.chamadoId}>#{chamado.id}</Text>
                  <StatusBadge label={label} color={color} />
                </View>
                <Text style={styles.chamadoAssunto}>{chamado.assunto}</Text>
                <Text style={styles.chamadoMsg} numberOfLines={2}>{chamado.mensagem}</Text>
                <View style={styles.chamadoFooter}>
                  <Text style={styles.chamadoDate}>
                    <Ionicons name="calendar-outline" size={12} /> Aberto: {formatDate(chamado.data_abertura)}
                  </Text>
                  {chamado.data_fechamento && (
                    <Text style={styles.chamadoDate}>
                      Fechado: {formatDate(chamado.data_fechamento)}
                    </Text>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Modal novo chamado */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Abrir Chamado</Text>
            <Text style={modal.subtitle}>Descreva o problema que está enfrentando.</Text>

            <Text style={modal.label}>Assunto</Text>
            <TextInput
              style={modal.input}
              placeholder="Ex: Sem internet, lentidão..."
              placeholderTextColor={Colors.textDim}
              value={assunto}
              onChangeText={setAssunto}
            />

            <Text style={modal.label}>Descrição</Text>
            <TextInput
              style={[modal.input, modal.textarea]}
              placeholder="Descreva o que está acontecendo..."
              placeholderTextColor={Colors.textDim}
              value={mensagem}
              onChangeText={setMensagem}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Button title="Enviar chamado" onPress={handleAbrir} loading={sending} />
            <Button title="Cancelar" onPress={() => setShowModal(false)} variant="ghost" style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark },
  container: { padding: 20, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 2 },
  pageSub: { color: Colors.textMuted, fontSize: 13 },
  newBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center',
  },
  contactCard: { marginBottom: 24 },
  contactTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-around' },
  contactItem: { alignItems: 'center', gap: 8 },
  contactIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,106,0,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  contactLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '800', marginBottom: 14 },
  emptyCard: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  chamadoCard: { marginBottom: 12 },
  chamadoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chamadoId: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  chamadoAssunto: { color: Colors.white, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  chamadoMsg: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 10 },
  chamadoFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  chamadoDate: { color: Colors.textDim, fontSize: 12 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  title: { color: Colors.white, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  subtitle: { color: Colors.textMuted, fontSize: 14, marginBottom: 20 },
  label: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.cardBorder, padding: 14, color: Colors.white,
    fontSize: 15, marginBottom: 16,
  },
  textarea: { height: 110, paddingTop: 12 },
});
