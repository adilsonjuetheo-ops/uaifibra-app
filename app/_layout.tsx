import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricGate } from '@/components/BiometricGate';
import { Toast } from '@/components/ui/Toast';
import { colors } from '@/constants/theme';
import { configurarNotificacoes, useNotificationNavigation } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/authStore';
import { useBiometricStore } from '@/store/biometricStore';
import { useNotificationStore } from '@/store/notificationStore';
// registra a task de background no escopo do módulo
import '@/tasks/backgroundFetch';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { cliente, carregando, hidratar } = useAuthStore();
  const hidratarNotificacoes = useNotificationStore((s) => s.hidratar);
  const hidratarBiometria = useBiometricStore((s) => s.hidratar);

  const [fontesOk] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useNotificationNavigation();

  useEffect(() => {
    void hidratar();
    void hidratarNotificacoes();
    void hidratarBiometria();
  }, [hidratar, hidratarNotificacoes, hidratarBiometria]);

  // Re-registra o token push a cada abertura do app enquanto logado.
  // Garante que reinicializações do servidor não percam os tokens.
  useEffect(() => {
    if (cliente) void configurarNotificacoes();
  }, [cliente]);

  useEffect(() => {
    if (fontesOk && !carregando) {
      void SplashScreen.hideAsync();
    }
  }, [fontesOk, carregando]);

  if (!fontesOk || carregando) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            contentStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
          }}
        >
          {/* senha padrão do 1º acesso: só libera as abas após criar senha própria */}
          <Stack.Protected guard={!!cliente && !cliente.senhaPadrao}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="fatura/[id]"
              options={{ title: 'Pagamento', headerBackTitle: 'Voltar' }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!!cliente}>
            <Stack.Screen
              name="change-password"
              options={{ title: 'Alterar Senha', headerBackTitle: 'Voltar' }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!cliente}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
        <BiometricGate />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
