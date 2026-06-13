import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { colors } from '@/constants/theme';
import { restaurarSessao } from '@/services/auth';
import { PAINEL_URL } from '@/services/avisos';
import { registrarBackgroundFetch } from '@/tasks/backgroundFetch';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Pede permissão, cria o canal Android e registra a checagem periódica de faturas. */
export async function configurarNotificacoes(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vencimentos', {
        name: 'Lembretes de vencimento',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.primary,
      });
    }

    const { status } = await Notifications.getPermissionsAsync();
    let final = status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      final = req.status;
    }
    if (final !== 'granted') return false;

    await registrarBackgroundFetch();
    void registrarTokenPush();
    return true;
  } catch (error) {
    // recursos de notificação podem não existir no ambiente (ex.: Expo Go)
    console.warn('[notificacoes] indisponível neste ambiente:', error);
    return false;
  }
}

/**
 * Registra o token de push deste aparelho no Painel UaiFibra,
 * permitindo que o provedor envie avisos mesmo com o app fechado.
 * Falha em silêncio (Expo Go sem projectId, painel offline etc.).
 */
async function registrarTokenPush(): Promise<void> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    if (!token) return;
    const sessao = await restaurarSessao();
    await fetch(`${PAINEL_URL}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        idCliente: sessao?.id ?? null,
        cidade: sessao?.cidade ?? null,
      }),
    });
  } catch (error) {
    console.warn('[push] registro indisponível neste ambiente:', error);
  }
}

/** Navega para a fatura quando o usuário toca na notificação. */
export function useNotificationNavigation() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      const idFatura = data.idFatura as string | undefined;
      const rota = data.rota as string | undefined;
      if (idFatura) {
        router.push(`/fatura/${idFatura}`);
      } else if (rota === '/avisos') {
        router.push('/avisos' as Parameters<typeof router.push>[0]);
      }
    });
    return () => sub.remove();
  }, [router]);
}
