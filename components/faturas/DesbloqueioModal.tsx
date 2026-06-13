import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { buscarContratos } from '@/services/cliente';
import { solicitarDesbloqueioConfianca } from '@/services/faturas';
import { friendlyError } from '@/services/ixc';
import { useAuthStore } from '@/store/authStore';
import { contratoAtual, useContractStore } from '@/store/contractStore';
import { showToast } from '@/store/toastStore';

interface DesbloqueioModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DesbloqueioModal({ visible, onClose, onSuccess }: DesbloqueioModalProps) {
  const cliente = useAuthStore((s) => s.cliente);
  const [aceitou, setAceitou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const fechar = () => {
    setAceitou(false);
    setSucesso(false);
    onClose();
  };

  const contractStore = useContractStore();

  const solicitar = async () => {
    if (!cliente) return;
    setEnviando(true);
    try {
      // o desbloqueio é por CONTRATO: usa o selecionado no app
      let contrato = contratoAtual(contractStore);
      if (!contrato) {
        const contratos = await buscarContratos(cliente.id);
        contrato = contratos.find((c) => c.status === 'A') ?? contratos[0] ?? null;
      }
      if (!contrato) {
        throw new Error('Nenhum contrato encontrado para o seu cadastro.');
      }
      await solicitarDesbloqueioConfianca(contrato.id);
      setSucesso(true);
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : friendlyError(error);
      showToast(msg, 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {sucesso ? (
            <>
              <MaterialCommunityIcons
                name="lock-open-check"
                size={56}
                color={colors.primary}
                style={{ alignSelf: 'center' }}
              />
              <Text style={styles.titulo}>Acesso liberado por 5 dias ⏳</Text>
              <Text style={styles.texto}>
                Seu desbloqueio em confiança foi ativado. Realize o pagamento da fatura
                dentro do prazo para evitar um novo bloqueio.
              </Text>
              <Button title="Entendi" onPress={fechar} />
            </>
          ) : (
            <>
              <MaterialCommunityIcons
                name="handshake"
                size={56}
                color={colors.primary}
                style={{ alignSelf: 'center' }}
              />
              <Text style={styles.titulo}>Desbloqueio em Confiança</Text>
              <Text style={styles.texto}>
                O desbloqueio em confiança libera seu acesso por 5 dias. Após esse
                período, o pagamento será necessário para evitar novo bloqueio.
              </Text>

              <Pressable style={styles.checkRow} onPress={() => setAceitou(!aceitou)}>
                <MaterialCommunityIcons
                  name={aceitou ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={aceitou ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.checkTexto}>
                  Li e aceito os termos do desbloqueio em confiança.
                </Text>
              </Pressable>

              <Button
                title="Solicitar Desbloqueio"
                onPress={solicitar}
                disabled={!aceitou}
                loading={enviando}
              />
              <Button title="Cancelar" variant="ghost" onPress={fechar} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  titulo: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  texto: {
    color: colors.textSecondary,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkTexto: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
});
