import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuthStore } from '../../store/authStore';
import { getBoletos, getBoletoPDF, getBoletoPixQrCode } from '../../services/financeiro';
import type { IXCBoleto } from '../../types/ixc';

function formatDate(date: string) {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

function formatCurrency(value: string | number) {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function boletoStatus(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    A: { label: 'Em aberto', color: Colors.warning },
    P: { label: 'Pago', color: Colors.success },
    C: { label: 'Cancelado', color: Colors.danger },
  };
  return map[status] ?? { label: status, color: Colors.textMuted };
}

interface PixModalProps {
  boleto: IXCBoleto;
  onClose: () => void;
}

function PixModal({ boleto, onClose }: PixModalProps) {
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrcode: string; copia_cola: string } | null>(null);

  React.useEffect(() => {
    setLoading(true);
    getBoletoPixQrCode(boleto.id)
      .then(setPixData)
      .catch(() => Alert.alert('Erro', 'PIX não disponível para esta fatura.'))
      .finally(() => setLoading(false));
  }, [boleto.id]);

  async function handleCopiar() {
    if (!pixData?.copia_cola) return;
    await Clipboard.setStringAsync(pixData.copia_cola);
    Alert.alert('Copiado!', 'Chave PIX copiada para a área de transferência.');
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Pagar com PIX</Text>
          <Text style={modalStyles.subtitle}>
            Vencimento: {formatDate(boleto.data_vencimento)} · {formatCurrency(boleto.valor)}
          </Text>

          {loading ? (
            <ActivityIndicator color={Colors.orange} size="large" style={{ marginVertical: 32 }} />
          ) : pixData ? (
            <>
              <View style={modalStyles.pixBox}>
                <Ionicons name="qr-code-outline" size={80} color={Colors.orange} />
                <Text style={modalStyles.pixHint}>Abra o app do seu banco e escaneie</Text>
              </View>
              <View style={modalStyles.copiaCola}>
                <Text style={modalStyles.copiaCola_label}>Pix Copia e Cola</Text>
                <Text style={modalStyles.copiaCola_value} numberOfLines={3}>
                  {pixData.copia_cola}
                </Text>
              </View>
              <Button title="Copiar chave PIX" onPress={handleCopiar} />
            </>
          ) : (
            <Text style={modalStyles.noData}>PIX não disponível.</Text>
          )}

          <Button title="Fechar" onPress={onClose} variant="ghost" style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

export default function FinanceiroScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [pixBoleto, setPixBoleto] = useState<IXCBoleto | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');

  const { data: boletos, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['boletos', user?.id_cliente],
    queryFn: () => getBoletos(user!.id_cliente),
    enabled: !!user,
  });

  const filtered = (boletos ?? []).filter((b: IXCBoleto) => {
    if (filter === 'open') return b.status === 'A';
    if (filter === 'paid') return b.status === 'P';
    return true;
  });

  async function handleAbrirBoleto(boleto: IXCBoleto) {
    try {
      const url = await getBoletoPDF(boleto.id);
      if (url) await Linking.openURL(url);
      else Alert.alert('Indisponível', 'Boleto PDF não disponível no momento.');
    } catch {
      if (boleto.linha_digitavel) {
        await Clipboard.setStringAsync(boleto.linha_digitavel);
        Alert.alert('Copiado!', 'Linha digitável copiada para a área de transferência.');
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o boleto.');
      }
    }
  }

  async function handleCopiarLinha(boleto: IXCBoleto) {
    if (!boleto.linha_digitavel) {
      Alert.alert('Indisponível', 'Linha digitável não disponível.');
      return;
    }
    await Clipboard.setStringAsync(boleto.linha_digitavel);
    Alert.alert('Copiado!', 'Linha digitável copiada.');
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.orange} colors={[Colors.orange]} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Financeiro</Text>
      <Text style={styles.pageSub}>Suas faturas e formas de pagamento</Text>

      {/* Filtros */}
      <View style={styles.filters}>
        {(['all', 'open', 'paid'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todas' : f === 'open' ? 'Em aberto' : 'Pagas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.orange} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={40} color={Colors.textDim} />
          <Text style={styles.emptyText}>Nenhuma fatura encontrada</Text>
        </Card>
      ) : (
        filtered.map((boleto: IXCBoleto) => {
          const { label, color } = boletoStatus(boleto.status);
          const isOpen = boleto.status === 'A';
          return (
            <Card key={boleto.id} style={styles.boletoCard} highlight={isOpen}>
              <View style={styles.boletoHeader}>
                <Text style={styles.boletoDesc} numberOfLines={1}>{boleto.descricao}</Text>
                <StatusBadge label={label} color={color} />
              </View>
              <View style={styles.boletoInfo}>
                <View>
                  <Text style={styles.boletoValor}>{formatCurrency(boleto.valor)}</Text>
                  <Text style={styles.boletoVenc}>
                    Vence: {formatDate(boleto.data_vencimento)}
                  </Text>
                </View>
                {boleto.data_pagamento && (
                  <Text style={styles.boletoPago}>
                    Pago em: {formatDate(boleto.data_pagamento)}
                  </Text>
                )}
              </View>

              {isOpen && (
                <View style={styles.boletoActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleAbrirBoleto(boleto)}
                  >
                    <Ionicons name="document-outline" size={16} color={Colors.orange} />
                    <Text style={styles.actionText}>Boleto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleCopiarLinha(boleto)}
                  >
                    <Ionicons name="copy-outline" size={16} color={Colors.orange} />
                    <Text style={styles.actionText}>Copiar linha</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPix]}
                    onPress={() => setPixBoleto(boleto)}
                  >
                    <Ionicons name="qr-code-outline" size={16} color={Colors.white} />
                    <Text style={[styles.actionText, { color: Colors.white }]}>PIX</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          );
        })
      )}

      {pixBoleto && <PixModal boleto={pixBoleto} onClose={() => setPixBoleto(null)} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark },
  container: { padding: 20, paddingBottom: 32 },
  pageTitle: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 4 },
  pageSub: { color: Colors.textMuted, fontSize: 14, marginBottom: 20 },
  filters: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  filterBtnActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  filterText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: Colors.white },
  emptyCard: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  boletoCard: { marginBottom: 14 },
  boletoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  boletoDesc: { color: Colors.white, fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  boletoInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  boletoValor: { color: Colors.white, fontSize: 22, fontWeight: '900' },
  boletoVenc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  boletoPago: { color: Colors.success, fontSize: 12, fontWeight: '600' },
  boletoActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: 'rgba(255,106,0,0.06)',
  },
  actionBtnPix: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  actionText: { color: Colors.orange, fontSize: 13, fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
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
  pixBox: { alignItems: 'center', gap: 12, marginBottom: 20 },
  pixHint: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  copiaCola: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 16,
  },
  copiaCola_label: { color: Colors.textMuted, fontSize: 11, marginBottom: 6, fontWeight: '700', textTransform: 'uppercase' },
  copiaCola_value: { color: Colors.white, fontSize: 12, lineHeight: 18 },
  noData: { color: Colors.textMuted, textAlign: 'center', marginVertical: 24 },
});
