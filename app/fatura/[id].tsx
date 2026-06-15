import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DesbloqueioModal } from '@/components/faturas/DesbloqueioModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { IXC } from '@/constants/ixcEndpoints';
import { colors, radius, spacing, typography } from '@/constants/theme';
import {
  IXCFatura,
  obterBoletoPdfBase64,
  statusFatura,
} from '@/services/faturas';
import { friendlyError, ixcList } from '@/services/ixc';
import { showToast } from '@/store/toastStore';
import { formatCurrency, formatDate, monthRef } from '@/utils/format';

export default function FaturaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [fatura, setFatura] = useState<IXCFatura | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gerandoBoleto, setGerandoBoleto] = useState(false);
  const [modalDesbloqueio, setModalDesbloqueio] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const registros = await ixcList<IXCFatura>(IXC.FATURAS, {
        qtype: 'fn_areceber.id',
        query: String(id),
        oper: '=',
      });
      setFatura(registros[0] ?? null);
    } catch (error) {
      setErro(friendlyError(error));
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const copiar = async (texto: string, mensagem: string) => {
    await Clipboard.setStringAsync(texto);
    showToast(mensagem, 'success');
  };

  const abrirBoletoPdf = async () => {
    if (!fatura) return;
    setGerandoBoleto(true);
    try {
      const base64 = await obterBoletoPdfBase64(fatura.id);
      const path = `${FileSystem.cacheDirectory}boleto-${fatura.id}.pdf`;
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/pdf',
          dialogTitle: 'Boleto UaiFibra',
        });
      } else {
        showToast('Boleto salvo, mas não foi possível abri-lo neste aparelho.', 'info');
      }
    } catch (error) {
      showToast(friendlyError(error), 'error');
    } finally {
      setGerandoBoleto(false);
    }
  };

  if (carregando) return <LoadingSpinner mensagem="Carregando fatura..." />;

  if (erro || !fatura) {
    return (
      <View style={styles.centro}>
        <MaterialCommunityIcons name="cloud-alert" size={48} color={colors.textSecondary} />
        <Text style={styles.erroTexto}>{erro ?? 'Fatura não encontrada.'}</Text>
        <Button title="Tentar novamente" onPress={() => void carregar()} />
      </View>
    );
  }

  const status = statusFatura(fatura);
  const paga = status === 'paga';
  const vencida = status === 'vencida';

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {/* Resumo */}
      <Card elevated style={{ gap: 6 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.mes}>{monthRef(fatura.data_vencimento)}</Text>
          <Badge
            label={paga ? 'Paga' : vencida ? 'Vencida' : 'Em aberto'}
            tone={paga ? 'success' : vencida ? 'danger' : 'warning'}
          />
        </View>
        <Text style={styles.valor}>{formatCurrency(fatura.valor)}</Text>
        <Text style={styles.vencimento}>
          Vencimento: {formatDate(fatura.data_vencimento)}
        </Text>
      </Card>

      {paga ? (
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="check-decagram" size={40} color={colors.primary} />
          <Text style={styles.pagaTexto}>Esta fatura já foi paga. Obrigado! 💚</Text>
        </Card>
      ) : (
        <>
          <Card style={{ gap: spacing.md }}>
            <Text style={styles.secaoTitulo}>2ª via de boleto</Text>
            {fatura.linha_digitavel ? (
              <>
                <Text style={styles.linhaLabel}>Linha digitável</Text>
                <Pressable
                  style={styles.linhaBox}
                  onPress={() =>
                    void copiar(fatura.linha_digitavel!, 'Código de barras copiado!')
                  }
                >
                  <Text style={styles.linhaTexto}>{fatura.linha_digitavel}</Text>
                </Pressable>
                <Button
                  title="Copiar código de barras"
                  variant="secondary"
                  onPress={() =>
                    void copiar(fatura.linha_digitavel!, 'Código de barras copiado!')
                  }
                  icon={
                    <MaterialCommunityIcons
                      name="content-copy"
                      size={18}
                      color={colors.primary}
                    />
                  }
                />
              </>
            ) : (
              <Text style={styles.infoTexto}>
                Linha digitável indisponível. Abra o boleto em PDF abaixo.
              </Text>
            )}
            <Button
              title="Abrir boleto PDF"
              onPress={abrirBoletoPdf}
              loading={gerandoBoleto}
              icon={
                <MaterialCommunityIcons name="file-pdf-box" size={20} color="#FFF" />
              }
            />
          </Card>

          {vencida ? (
            <Card style={{ gap: spacing.sm }}>
              <Text style={styles.secaoTitulo}>Está sem acesso?</Text>
              <Text style={styles.infoTexto}>
                Se sua conexão foi bloqueada, você pode solicitar o desbloqueio em
                confiança enquanto o pagamento é processado.
              </Text>
              <Button
                title="Desbloquear em Confiança"
                variant="secondary"
                onPress={() => setModalDesbloqueio(true)}
                icon={
                  <MaterialCommunityIcons
                    name="lock-open-outline"
                    size={20}
                    color={colors.primary}
                  />
                }
              />
            </Card>
          ) : null}
        </>
      )}

      <DesbloqueioModal
        visible={modalDesbloqueio}
        onClose={() => setModalDesbloqueio(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mes: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  valor: {
    color: colors.textPrimary,
    fontSize: typography.sizes['3xl'],
    fontFamily: typography.fontFamily.bold,
  },
  vencimento: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  pagaTexto: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  erroTexto: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  secaoTitulo: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.semibold,
  },
  linhaLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  linhaBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  linhaTexto: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    letterSpacing: 0.5,
  },
  infoTexto: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 20,
  },
});
