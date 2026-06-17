import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useBiometricStore } from '@/store/biometricStore';

/**
 * Tela de bloqueio por biometria (digital/Face ID).
 * Renderizar no layout raiz por cima do conteúdo: quando o usuário está logado
 * e ativou a biometria no Perfil, o app abre travado até autenticar.
 */
export function BiometricGate() {
  const cliente = useAuthStore((s) => s.cliente);
  const logout = useAuthStore((s) => s.logout);
  const { ativa, hidratado } = useBiometricStore();

  const [desbloqueado, setDesbloqueado] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const precisaDesbloquear = !!cliente && ativa && hidratado && !desbloqueado;

  const autenticar = useCallback(async () => {
    setFalhou(false);
    try {
      // se a biometria foi removida do aparelho, não tranca o usuário
      const temHardware = await LocalAuthentication.hasHardwareAsync();
      const cadastrada = await LocalAuthentication.isEnrolledAsync();
      if (!temHardware || !cadastrada) {
        setDesbloqueado(true);
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloqueie o UaiFibra',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false, // permite PIN do aparelho como alternativa
      });
      if (res.success) {
        setDesbloqueado(true);
      } else {
        setFalhou(true);
      }
    } catch {
      setFalhou(true);
    }
  }, []);

  useEffect(() => {
    if (precisaDesbloquear) void autenticar();
  }, [precisaDesbloquear, autenticar]);

  // ao deslogar, rearma o bloqueio para o próximo login
  useEffect(() => {
    if (!cliente) setDesbloqueado(false);
  }, [cliente]);

  if (!precisaDesbloquear) return null;

  return (
    <View style={styles.overlay}>
      <Image
        source={require('@/assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <MaterialCommunityIcons name="fingerprint" size={72} color={colors.primary} />
      <Text style={styles.titulo}>App bloqueado</Text>
      <Text style={styles.texto}>
        {falhou
          ? 'Não foi possível confirmar sua identidade. Tente novamente.'
          : 'Use sua digital ou reconhecimento facial para entrar.'}
      </Text>
      <Button
        title="Desbloquear"
        onPress={() => void autenticar()}
        style={{ alignSelf: 'stretch' }}
        icon={<MaterialCommunityIcons name="fingerprint" size={20} color="#FFF" />}
      />
      <Pressable onPress={() => void logout()} hitSlop={8}>
        <Text style={styles.sair}>Entrar com CPF e senha</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    zIndex: 1000,
    elevation: 1000,
  },
  logo: { width: 160, height: 160, borderRadius: 80, overflow: 'hidden' },
  titulo: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
  },
  texto: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  sair: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
    padding: spacing.sm,
  },
});
