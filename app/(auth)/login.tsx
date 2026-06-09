import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { login } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export default function LoginScreen() {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ cpf?: string; senha?: string }>({});
  const setUser = useAuthStore((s) => s.setUser);

  function validate() {
    const e: typeof errors = {};
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) e.cpf = 'CPF inválido.';
    if (senha.length < 1) e.senha = 'Informe a senha.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(cpf, senha);
      setUser(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg =
        err?.response?.data?.mensagem ||
        err?.message ||
        'Não foi possível conectar. Verifique sua internet.';
      Alert.alert('Erro ao entrar', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>UAI</Text>
            <Text style={styles.logoSub}>FIBRA</Text>
          </View>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>FIBRA ÓPTICA</Text>
          </View>
        </View>

        <Text style={styles.title}>Área do Cliente</Text>
        <Text style={styles.subtitle}>
          Acesse com seu CPF e senha.{'\n'}A senha padrão são os 5 primeiros dígitos do CPF.
        </Text>

        <View style={styles.form}>
          <Input
            label="CPF"
            placeholder="000.000.000-00"
            value={cpf}
            onChangeText={(t) => setCpf(formatCPF(t))}
            keyboardType="numeric"
            icon="person-outline"
            error={errors.cpf}
            maxLength={14}
          />
          <Input
            label="Senha"
            placeholder="••••••"
            value={senha}
            onChangeText={setSenha}
            isPassword
            icon="lock-closed-outline"
            error={errors.senha}
          />

          <Button title="Entrar" onPress={handleLogin} loading={loading} style={styles.btn} />

          <TouchableOpacity
            style={styles.helpRow}
            onPress={() => Alert.alert('Senha padrão', 'A senha padrão é composta pelos 5 primeiros dígitos do seu CPF.\n\nExemplo: CPF 123.456.789-00 → Senha: 12345')}
          >
            <Text style={styles.helpText}>Esqueci minha senha / Senha padrão</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Problemas? Ligue{' '}
          <Text style={styles.footerLink}>0800 xxx xxxx</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.dark },
  container: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 40 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { color: Colors.white, fontSize: 24, fontWeight: '900', lineHeight: 26 },
  logoSub: { color: Colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 3 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,106,0,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.3)',
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.orange },
  badgeText: { color: Colors.orange, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { color: Colors.white, fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  form: { gap: 0 },
  btn: { marginTop: 8 },
  helpRow: { alignItems: 'center', marginTop: 16 },
  helpText: { color: Colors.orange, fontSize: 14, fontWeight: '600' },
  footer: { color: Colors.textDim, textAlign: 'center', fontSize: 13, marginTop: 40 },
  footerLink: { color: Colors.orange, fontWeight: '700' },
});
