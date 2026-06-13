import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'uaifibra.biometria.ativa';

interface BiometricState {
  ativa: boolean;
  hidratado: boolean;
  setAtiva: (ativa: boolean) => Promise<void>;
  hidratar: () => Promise<void>;
}

export const useBiometricStore = create<BiometricState>((set) => ({
  ativa: false,
  hidratado: false,

  hidratar: async () => {
    const val = await AsyncStorage.getItem(KEY);
    set({ ativa: val === 'true', hidratado: true });
  },

  setAtiva: async (ativa) => {
    await AsyncStorage.setItem(KEY, String(ativa));
    set({ ativa });
  },
}));
