import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { buscarContratos, IXCContrato } from '@/services/cliente';

const KEY_SELECIONADO = 'uaifibra.contrato.selecionado';

interface ContractState {
  contratos: IXCContrato[];
  selecionadoId: string | null;
  carregar: (idCliente: string) => Promise<void>;
  selecionar: (idCliente: string, id: string) => Promise<void>;
}

export const useContractStore = create<ContractState>((set) => ({
  contratos: [],
  selecionadoId: null,

  carregar: async (idCliente) => {
    const [contratos, salvo] = await Promise.all([
      buscarContratos(idCliente),
      AsyncStorage.getItem(KEY_SELECIONADO),
    ]);
    const selecionadoId =
      (salvo && contratos.find((c) => c.id === salvo) ? salvo : null) ??
      contratos[0]?.id ??
      null;
    set({ contratos, selecionadoId });
  },

  selecionar: async (_idCliente, id) => {
    await AsyncStorage.setItem(KEY_SELECIONADO, id);
    set({ selecionadoId: id });
  },
}));

/** Retorna o contrato selecionado (ou o primeiro disponível). */
export function contratoAtual(state: ContractState): IXCContrato | null {
  const { contratos, selecionadoId } = state;
  return contratos.find((c) => c.id === selecionadoId) ?? contratos[0] ?? null;
}
