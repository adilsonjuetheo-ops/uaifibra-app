import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaskInput, { Masks } from 'react-native-mask-input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ENV } from '@/constants/ixcEndpoints';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { configurarNotificacoes } from '@/hooks/useNotifications';
import { friendlyError } from '@/services/ixc';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);

  const entrar = async () => {
    setErro(null);
    setCarregando(true);
    try {
      await login(cpf, senha);
      // solicita permissão de notificação no primeiro login
      void configurarNotificacoes();
    } catch (error) {
      setErro(error instanceof Error ? error.message : friendlyError(error));
    } finally {
      setCarregando(false);
    }
  };

  const abrirWhatsApp = () => {
    void Linking.openURL(
      `https://wa.me/${ENV.SUPORTE_WHATSAPP}?text=${encodeURIComponent('Olá! Esqueci minha senha do app UaiFibra.')}`
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('@/assets/logo-glow.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Card elevated style={styles.card}>
          <Text style={styles.titulo}>Acesse sua conta</Text>
          <Text style={styles.subtitulo}>
            Entre com seu CPF para acompanhar faturas, planos e muito mais.
          </Text>

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>CPF</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons
                name="account-outline"
                size={20}
                color={colors.textSecondary}
              />
              <MaskInput
                value={cpf}
                onChangeText={(masked) => setCpf(masked)}
                mask={Masks.BRL_CPF}
                keyboardType="number-pad"
                placeholder="000.000.000-00"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={colors.textSecondary}
              />
              <MaskInput
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!mostrarSenha}
                placeholder="Sua senha"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
              <Pressable onPress={() => setMostrarSenha(!mostrarSenha)} hitSlop={8}>
                <MaterialCommunityIcons
                  name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
            <Text style={styles.dica}>
              No primeiro acesso, use os 5 primeiros dígitos do seu CPF.
            </Text>
          </View>

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

          <Button title="Entrar" onPress={entrar} loading={carregando} />

          <Pressable onPress={() => setModalSenha(true)} hitSlop={8}>
            <Text style={styles.esqueci}>Esqueci minha senha</Text>
          </Pressable>
        </Card>
      </ScrollView>

      <Modal
        visible={modalSenha}
        transparent
        animationType="fade"
        onRequestClose={() => setModalSenha(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <MaterialCommunityIcons
              name="lock-question"
              size={48}
              color={colors.primary}
              style={{ alignSelf: 'center' }}
            />
            <Text style={styles.modalTitulo}>Esqueceu sua senha?</Text>
            <Text style={styles.modalTexto}>
              Entre em contato com o nosso suporte para redefinir a senha de acesso do
              aplicativo.
            </Text>
            <Button
              title="Falar com o suporte"
              onPress={abrirWhatsApp}
              icon={<MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" />}
            />
            <Button title="Fechar" variant="ghost" onPress={() => setModalSenha(false)} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
  },
  logo: {
    width: 280,
    height: 187,
    alignSelf: 'center',
  },
  card: { gap: spacing.md, padding: spacing.lg },
  titulo: {
    color: colors.textPrimary,
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.fontFamily.bold,
  },
  subtitulo: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 20,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.regular,
    paddingVertical: 14,
  },
  dica: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  erro: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  esqueci: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
    textAlign: 'center',
    paddingVertical: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitulo: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  modalTexto: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
});
