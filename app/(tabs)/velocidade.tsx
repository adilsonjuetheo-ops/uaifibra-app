import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';
import { useNetworkInfo } from '@/hooks/useSpeedTest';

const SPEEDTEST_URL = 'https://www.speedtest.net';

export default function VelocidadeScreen() {
  const rede = useNetworkInfo();

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <MaterialCommunityIcons name="speedometer" size={96} color={colors.primary} />
        <Text style={styles.titulo}>Teste de Velocidade</Text>
        <Text style={styles.subtitulo}>
          Meça sua velocidade real de download, upload e latência com o Speedtest.
        </Text>
      </View>

      <Button
        title="Abrir Speedtest"
        icon={<MaterialCommunityIcons name="open-in-new" size={18} color="#FFF" />}
        onPress={() => void Linking.openURL(SPEEDTEST_URL)}
      />

      <Card style={styles.rede}>
        <View style={styles.redeItem}>
          <MaterialCommunityIcons name="ip-network" size={18} color={colors.textSecondary} />
          <Text style={styles.redeTexto}>IP: {rede.ip}</Text>
        </View>
        <View style={styles.redeItem}>
          <MaterialCommunityIcons name="server-network" size={18} color={colors.textSecondary} />
          <Text style={styles.redeTexto}>Provedor: {rede.provedor}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  titulo: {
    color: colors.textPrimary,
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  subtitulo: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  rede: { gap: 10 },
  redeItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  redeTexto: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
});
