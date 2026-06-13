import { create } from 'zustand';

import {
  login as loginService,
  logout as logoutService,
  restaurarSessao,
  SessaoCliente,
} from '@/services/auth';

interface AuthState {
  cliente: SessaoCliente | null;
  carregando: boolean;
  hidratar: () => Promise<void>;
  login: (cpf: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  atualizarCliente: (changes: Partial<SessaoCliente>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  cliente: null,
  carregando: true,

  hidratar: async () => {
    const sessao = await restaurarSessao();
    set({ cliente: sessao, carregando: false });
  },

  login: async (cpf, senha) => {
    const sessao = await loginService(cpf, senha);
    set({ cliente: sessao });
  },

  logout: async () => {
    await logoutService();
    set({ cliente: null });
  },

  atualizarCliente: (changes) => {
    const { cliente } = get();
    if (cliente) set({ cliente: { ...cliente, ...changes } });
  },
}));
