import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { restaurarSessao } from '@/services/auth';
import { avisosAtivos, buscarAvisos } from '@/services/avisos';
import { listarFaturas } from '@/services/faturas';
import { daysUntil, formatCurrency, formatDate } from '@/utils/format';

export const TASK_VENCIMENTOS = 'uaifibra-checar-vencimentos';
const NOTIFICADAS_KEY = 'uaifibra.faturas.notificadas';

/** Evita notificar a mesma fatura mais de uma vez por dia/etapa. */
async function jaNotificada(chave: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(NOTIFICADAS_KEY);
  const set: string[] = raw ? JSON.parse(raw) : [];
  if (set.includes(chave)) return true;
  await AsyncStorage.setItem(NOTIFICADAS_KEY, JSON.stringify([...set.slice(-50), chave]));
  return false;
}

export async function checarVencimentos(): Promise<boolean> {
  const ativo = await AsyncStorage.getItem('uaifibra.notificacoes.lembretes');
  if (ativo === 'false') return false;

  const sessao = await restaurarSessao();
  if (!sessao) return false;

  const faturas = await listarFaturas(sessao.id);
  let notificou = false;

  for (const fatura of faturas) {
    if (fatura.status !== 'A') continue;
    const dias = daysUntil(fatura.data_vencimento);

    if (dias === 2) {
      const chave = `${fatura.id}:2dias`;
      if (!(await jaNotificada(chave))) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚡ Sua fatura vence em 2 dias!',
            body: `Fatura de ${formatCurrency(fatura.valor)} vence em ${formatDate(fatura.data_vencimento)}. Toque para pagar agora.`,
            data: { idFatura: fatura.id },
            sound: 'notification.wav',
          },
          trigger: null,
        });
        notificou = true;
      }
    }

    if (dias === 0) {
      const chave = `${fatura.id}:hoje`;
      if (!(await jaNotificada(chave))) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Sua fatura vence hoje!',
            body: `Fatura de ${formatCurrency(fatura.valor)} vence hoje. Toque para pagar e evitar bloqueio.`,
            data: { idFatura: fatura.id },
            sound: 'notification.wav',
          },
          trigger: null,
        });
        notificou = true;
      }
    }
  }

  return notificou;
}

/**
 * Notifica avisos de manutenção/urgentes do mural (1x por aviso).
 * Não exige login: funciona mesmo com o cliente deslogado.
 */
export async function checarAvisosImportantes(): Promise<boolean> {
  const ativo = await AsyncStorage.getItem('uaifibra.notificacoes.lembretes');
  if (ativo === 'false') return false;

  const sessao = await restaurarSessao(); // só para o filtro de cidade (opcional)
  const avisos = avisosAtivos(await buscarAvisos(), sessao?.cidade);
  let notificou = false;

  for (const aviso of avisos) {
    if (aviso.tipo !== 'manutencao' && aviso.tipo !== 'urgente') continue;
    const chave = `aviso:${aviso.id}`;
    if (await jaNotificada(chave)) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${aviso.tipo === 'urgente' ? '⚠️' : '🔧'} ${aviso.titulo}`,
        body: aviso.mensagem,
        data: { rota: '/avisos' },
        sound: 'notification.wav',
      },
      trigger: null,
    });
    notificou = true;
  }

  return notificou;
}

TaskManager.defineTask(TASK_VENCIMENTOS, async () => {
  try {
    const notificouAvisos = await checarAvisosImportantes().catch(() => false);
    const notificouFaturas = await checarVencimentos().catch(() => false);
    return notificouAvisos || notificouFaturas
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Registra a task para rodar ~1x ao dia em background.
 * Indisponível no Expo Go (só funciona em build nativo) — falha em silêncio.
 */
export async function registrarBackgroundFetch(): Promise<void> {
  try {
    const registrada = await TaskManager.isTaskRegisteredAsync(TASK_VENCIMENTOS);
    if (registrada) return;
    await BackgroundFetch.registerTaskAsync(TASK_VENCIMENTOS, {
      minimumInterval: 60 * 60 * 24, // 24h
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (error) {
    console.warn('[notificacoes] background fetch indisponível neste ambiente:', error);
  }
}
