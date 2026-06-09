import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';
import { getStoredUser } from '../services/auth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    getStoredUser().then((user) => {
      if (user) setUser(user);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0d0d' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/alterar-senha" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryClientProvider>
  );
}
