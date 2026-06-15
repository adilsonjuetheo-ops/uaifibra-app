import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Speedometer } from '@/components/velocidade/Speedometer';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useSpeedTest } from '@/hooks/useSpeedTest';

const FASE_LABEL: Record<string, string> = {
  ping: 'Medindo latência...',
  download: 'DOWNLOAD',
  upload: 'UPLOAD',
};

export default function VelocidadeScreen() {
  const { fase, velocidadeAtual, resultado, historico, rede, servidor, erro, iniciar } =
    useSpeedTest();

  const rodando = fase === 'ping' || fase === 'download' || fase === 'upload';

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {/* Velocímetro / botão iniciar */}
      <View style={styles.gaugeArea}>
        {rodando ? (
          <Speedometer
            value={velocidadeAtual}
            label={FASE_LABEL[fase] ?? ''}
            unidade={fase === 'ping' ? '' : 'Mbps'}
          />
        ) : resultado ? (
          <Speedometer value={resultado.download} label="DOWNLOAD" />
        ) : (
          <Pressable style={styles.botaoIniciar} onPress={() => void iniciar()}>
            <Text style={styles.botaoIniciarTexto}>INICIAR{'\n'}TESTE</Text>
          </Pressable>
        )}
      </View>

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      {/* Resultados */}
      {resultado && !rodando ? (
        <Card style={styles.resultados}>
          <View style={styles.resultadoItem}>
            <MaterialCommunityIcons name="download" size={22} color={colors.primary} />
            <Text style={styles.resultadoValor}>{resultado.download.toFixed(1)}</Text>
            <Text style={styles.resultadoLabel}>Download (Mbps)</Text>
          </View>
          <View style={styles.divisor} />
          <View style={styles.resultadoItem}>
            <MaterialCommunityIcons name="upload" size={22} color={colors.secondaryLight} />
            <Text style={styles.resultadoValor}>{resultado.upload.toFixed(1)}</Text>
            <Text style={styles.resultadoLabel}>Upload (Mbps)</Text>
          </View>
          <View style={styles.divisor} />
          <View style={styles.resultadoItem}>
            <MaterialCommunityIcons name="timer-outline" size={22} color={colors.info} />
            <Text style={styles.resultadoValor}>{resultado.ping}</Text>
            <Text style={styles.resultadoLabel}>Ping (ms)</Text>
          </View>
        </Card>
      ) : null}

      {resultado && !rodando ? (
        <Pressable style={styles.repetir} onPress={() => void iniciar()}>
          <MaterialCommunityIcons name="restart" size={20} color={colors.primary} />
          <Text style={styles.repetirTexto}>Testar novamente</Text>
        </Pressable>
      ) : null}

      {/* Rede */}
      <Card style={styles.rede}>
        <View style={styles.redeItem}>
          <MaterialCommunityIcons name="ip-network" size={18} color={colors.textSecondary} />
          <Text style={styles.redeTexto}>IP: {rede.ip}</Text>
        </View>
        <View style={styles.redeItem}>
          <MaterialCommunityIcons name="server-network" size={18} color={colors.textSecondary} />
          <Text style={styles.redeTexto}>Provedor: {rede.provedor}</Text>
        </View>
        <View style={styles.redeItem}>
          <MaterialCommunityIcons name="map-marker-radius" size={18} color={colors.textSecondary} />
          <Text style={styles.redeTexto}>Servidor de teste: {servidor}</Text>
        </View>
      </Card>

      {/* Histórico */}
      {historico.length > 0 ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.historicoTitulo}>Últimos testes</Text>
          {historico.map((h) => (
            <View key={h.data} style={styles.historicoRow}>
              <Text style={styles.historicoData}>
                {new Date(h.data).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <View style={styles.historicoValores}>
                <Text style={styles.historicoDown}>↓ {h.download.toFixed(1)}</Text>
                <Text style={styles.historicoUp}>↑ {h.upload.toFixed(1)}</Text>
                <Text style={styles.historicoPing}>{h.ping} ms</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
    alignItems: 'stretch',
  },
  gaugeArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  botaoIniciar: {
    width: 200,
    height: 200,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoIniciarTexto: {
    color: colors.primary,
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
    letterSpacing: 2,
  },
  erro: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  resultados: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  resultadoItem: { alignItems: 'center', gap: 4, flex: 1 },
  resultadoValor: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
  },
  resultadoLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  divisor: { width: 1, height: 48, backgroundColor: colors.border },
  repetir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  repetirTexto: {
    color: colors.primary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.semibold,
  },
  rede: { gap: 8 },
  redeItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  redeTexto: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  historicoTitulo: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.semibold,
  },
  historicoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historicoData: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  historicoValores: { flexDirection: 'row', gap: 12 },
  historicoDown: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
  },
  historicoUp: {
    color: colors.secondaryLight,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
  },
  historicoPing: {
    color: colors.info,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
  },
});
