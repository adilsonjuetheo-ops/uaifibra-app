import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { alterarSenha } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';

export default function AlterarSenhaScreen() {
  const user = useAuthStore((s) => s.user);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSalvar() {
    if (!senhaAtual || !novaSenha || !confirmar) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (novaSenha.length < 6) {
      Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await alterarSenha(user!.id_cliente, senhaAtual, novaSenha);
      Alert.alert('Sucesso!', 'Senha alterada com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.mensagem || 'Não foi possível alterar a senha.');
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
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>

        <Text style={styles.title}>Alterar Senha</Text>
        <Text style={styles.subtitle}>
          Para sua segurança, recomendamos trocar a senha padrão.
        </Text>

        <Input
          label="Senha atual"
          placeholder="Senha atual"
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          isPassword
          icon="lock-closed-outline"
        />
        <Input
          label="Nova senha"
          placeholder="Mínimo 6 caracteres"
          value={novaSenha}
          onChangeText={setNovaSenha}
          isPassword
          icon="lock-open-outline"
        />
        <Input
          label="Confirmar nova senha"
          placeholder="Repita a nova senha"
          value={confirmar}
          onChangeText={setConfirmar}
          isPassword
          icon="checkmark-circle-outline"
        />

        <Button title="Salvar nova senha" onPress={handleSalvar} loading={loading} style={styles.btn} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.dark },
  container: { flexGrow: 1, padding: 24, paddingTop: 56 },
  back: { marginBottom: 24 },
  title: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 8 },
  subtitle: { color: Colors.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 28 },
  btn: { marginTop: 8 },
});
