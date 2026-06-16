import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
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
import MaskInput, { Masks } from 'react-native-mask-input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ENV } from '@/constants/ixcEndpoints';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { atualizarCliente, buscarClientePorCpf, IXCCliente } from '@/services/cliente';
import { onlyDigits } from '@/utils/format';

type Etapa = 'cpf' | 'telefone' | 'sucesso' | 'suporte';

export default function RecuperarSenhaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [etapa, setEtapa] = useState<Etapa>('cpf');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cliente, setCliente] = useState<IXCCliente | null>(null);

  const verificarCpf = async () => {
    setErro(null);
    const digits = onlyDigits(cpf);
    if (digits.length !== 11) {
      setErro('CPF inválido. Confira os 11 dígitos.');
      return;
    }
    setCarregando(true);
    try {
      const found = await buscarClientePorCpf(digits);
      if (!found) {
        setErro('CPF não encontrado. Verifique os dados ou fale com o suporte.');
        return;
      }
      setCliente(found);
      const temTelefone =
        onlyDigits(found.telefone_celular ?? '').length >= 10 ||
        onlyDigits(found.fone ?? '').length >= 10;
      setEtapa(temTelefone ? 'telefone' : 'suporte');
    } catch {
      setErro('Erro ao consultar o CPF. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const verificarTelefone = async () => {
    if (!cliente) return;
    setErro(null);
    const digitsInformado = onlyDigits(telefone);
    if (digitsInformado.length < 10) {
      setErro('Informe o telefone completo com DDD.');
      return;
    }
    const celularIxc = onlyDigits(cliente.telefone_celular ?? '');
    const foneIxc = onlyDigits(cliente.fone ?? '');
    const bate = digitsInformado === celularIxc || digitsInformado === foneIxc;
    if (!bate) {
      setErro('Telefone não confere com o cadastrado. Tente o suporte pelo WhatsApp.');
      return;
    }
    setCarregando(true);
    try {
      await atualizarCliente(cliente.id, { senha: '' });
      setEtapa('sucesso');
    } catch {
      setErro('Não foi possível redefinir a senha. Tente o suporte pelo WhatsApp.');
    } finally {
      setCarregando(false);
    }
  };

  const abrirWhatsApp = () => {
    void Linking.openURL(
      `https://wa.me/${ENV.SUPORTE_WHATSAPP}?text=${encodeURIComponent('Olá! Esqueci minha senha do app UaiFibra e preciso de ajuda para recuperar o acesso.')}`
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Pressable onPress={() => router.back()} style={styles.voltar} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </Pressable>
        <MaterialCommunityIcons name="lock-reset" size={48} color="#FFF" />
        <Text style={styles.headerTitulo}>Recuperar acesso</Text>
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

        {etapa === 'cpf' && (
          <>
            <Text style={styles.titulo}>Informe seu CPF</Text>
            <Text style={styles.subtitulo}>
              Vamos verificar seu cadastro para redefinir sua senha.
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
            {erro ? <Text style={styles.erro}>{erro}</Text> : null}
            <Button title="Continuar" onPress={verificarCpf} loading={carregando} />
          </>
        )}

        {etapa === 'telefone' && (
          <>
            <Text style={styles.titulo}>Confirme seu telefone</Text>
            <Text style={styles.subtitulo}>
              Informe o número cadastrado na UaiFibra para confirmar sua identidade.
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Telefone (com DDD)</Text>
              <View style={styles.inputRow}>
                <MaterialCommunityIcons name="phone-outline" size={20} color={colors.textSecondary} />
                <MaskInput
                  value={telefone}
                  onChangeText={(masked) => setTelefone(masked)}
                  mask={['(', /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/]}
                  keyboardType="phone-pad"
                  placeholder="(38) 99999-9999"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </View>
            </View>
            {erro ? <Text style={styles.erro}>{erro}</Text> : null}
            <Button title="Redefinir senha" onPress={verificarTelefone} loading={carregando} />
            <Button title="Falar com o suporte" variant="ghost" onPress={abrirWhatsApp}
              icon={<MaterialCommunityIcons name="whatsapp" size={18} color={colors.primary} />}
            />
          </>
        )}

        {etapa === 'suporte' && (
          <>
            <View style={styles.avisoBox}>
              <MaterialCommunityIcons name="phone-off" size={40} color={colors.warning} />
              <Text style={styles.titulo}>Sem telefone no cadastro</Text>
              <Text style={styles.subtitulo}>
                Não encontramos um telefone no seu cadastro para verificar sua identidade.
                Entre em contato com o nosso suporte para redefinir a senha.
              </Text>
            </View>
            <Button
              title="Falar com o suporte"
              onPress={abrirWhatsApp}
              icon={<MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" />}
            />
            <Button title="Voltar" variant="ghost" onPress={() => router.back()} />
          </>
        )}

        {etapa === 'sucesso' && (
          <>
            <View style={styles.avisoBox}>
              <MaterialCommunityIcons name="check-circle-outline" size={48} color={colors.success} />
              <Text style={styles.titulo}>Senha redefinida!</Text>
              <Text style={styles.subtitulo}>
                Sua senha foi redefinida com sucesso. Faça login usando os{' '}
                <Text style={styles.destaque}>5 primeiros dígitos do seu CPF</Text> como senha.
                Você será obrigado a criar uma nova senha após entrar.
              </Text>
            </View>
            <Button title="Ir para o login" onPress={() => router.back()} />
          </>
        )}
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
    gap: spacing.sm,
  },
  voltar: {
    position: 'absolute',
    left: spacing.lg,
    top: 0,
  },
  headerTitulo: {
    color: '#FFF',
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.semibold,
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
  destaque: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.semibold,
  },

  avisoBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
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
  erro: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
});
