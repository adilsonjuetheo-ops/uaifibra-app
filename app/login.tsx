import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
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
import { colors, radius, spacing, typography } from '@/constants/theme';
import { friendlyError } from '@/services/ixc';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const entrar = async () => {
    setErro(null);
    setCarregando(true);
    try {
      await login(cpf, senha);
    } catch (error) {
      setErro(error instanceof Error ? error.message : friendlyError(error));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Image
          source={require('@/assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[
          styles.sheetContent,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sheetHandle} />

        <Text style={styles.titulo}>Acesse sua conta</Text>
        <Text style={styles.subtitulo}>
          Entre com seu CPF para acompanhar faturas, planos e muito mais.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>CPF</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.textSecondary} />
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

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textSecondary} />
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
            No primeiro acesso, use os 4 últimos dígitos do seu CPF.
          </Text>
        </View>

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <Button title="Entrar" onPress={entrar} loading={carregando} />

        <Pressable onPress={() => router.push('/recuperar-senha')} hitSlop={8}>
          <Text style={styles.esqueci}>Esqueci minha senha</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.secondary },

  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
  },

  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sheetContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

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

  fieldGroup: { gap: 6 },
  label: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
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
});
