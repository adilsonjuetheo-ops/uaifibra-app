import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'uaifibra.notificacoes.lembretes';

interface NotificationState {
  lembretesAtivos: boolean;
  setLembretesAtivos: (ativo: boolean) => Promise<void>;
  hidratar: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  lembretesAtivos: true,

  hidratar: async () => {
    const val = await AsyncStorage.getItem(KEY);
    // null = nunca configurado = ativo por padrão
    set({ lembretesAtivos: val !== 'false' });
  },

  setLembretesAtivos: async (ativo) => {
    await AsyncStorage.setItem(KEY, String(ativo));
    set({ lembretesAtivos: ativo });
  },
}));
