import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { trocarSenha } from '@/services/auth';
import { friendlyError } from '@/services/ixc';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/store/toastStore';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { cliente, logout, atualizarCliente } = useAuthStore();

  // primeiro acesso: logou com a senha padrão e precisa criar a própria
  const primeiroAcesso = !!cliente?.senhaPadrao;

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setErro(null);
    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      setErro('A confirmação não confere com a nova senha.');
      return;
    }
    if (!cliente) return;

    setSalvando(true);
    try {
      await trocarSenha(cliente.id, primeiroAcesso ? null : senhaAtual, novaSenha);
      showToast('Senha criada com sucesso! Bem-vindo 👋', 'success');
      if (primeiroAcesso) {
        await atualizarCliente({ senhaPadrao: false });
        router.replace('/');
      } else {
        router.back();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : friendlyError(error);
      setErro(msg);
      showToast(msg, 'error');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {primeiroAcesso ? (
          <Card style={styles.aviso}>
            <MaterialCommunityIcons name="shield-key" size={28} color={colors.warning} />
            <Text style={styles.avisoTexto}>
              <Text style={styles.avisoDestaque}>Primeiro acesso: </Text>
              por segurança, crie uma senha pessoal para continuar. A senha padrão
              (início do CPF) deixará de funcionar.
            </Text>
          </Card>
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <Text style={styles.descricao}>
            Sua nova senha será usada para acessar o aplicativo e a central do assinante.
          </Text>

          {!primeiroAcesso ? (
            <Input
              label="Senha atual"
              value={senhaAtual}
              onChangeText={setSenhaAtual}
              secureTextEntry
              placeholder="Digite sua senha atual"
            />
          ) : null}
          <Input
            label="Nova senha"
            value={novaSenha}
            onChangeText={setNovaSenha}
            secureTextEntry
            placeholder="Mínimo de 6 caracteres"
          />
          <Input
            label="Confirmar nova senha"
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry
            placeholder="Repita a nova senha"
            error={erro}
          />

          <Button
            title={primeiroAcesso ? 'Criar senha e continuar' : 'Salvar nova senha'}
            onPress={salvar}
            loading={salvando}
          />
        </Card>

        {primeiroAcesso ? (
          <Pressable onPress={() => void logout()} hitSlop={8}>
            <Text style={styles.voltarLogin}>Voltar para o login</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderColor: colors.warning,
    borderRadius: radius.lg,
  },
  avisoTexto: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 20,
  },
  avisoDestaque: {
    color: colors.warning,
    fontFamily: typography.fontFamily.semibold,
  },
  descricao: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 20,
  },
  voltarLogin: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semibold,
    textAlign: 'center',
    padding: spacing.sm,
  },
});
