import api from './api';
import { DEMO_MODE, DEMO_CHAMADOS } from './demo';
import type { IXCChamado, IXCApiResponse } from '../types/ixc';

export async function getChamados(idCliente: string): Promise<IXCChamado[]> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 600));
    return DEMO_CHAMADOS;
  }

  const { data } = await api.get<IXCApiResponse<IXCChamado>>('/su_chamado', {
    params: {
      qtype: 'su_chamado.id_cliente',
      query: idCliente,
      oper: '=',
      page: 1,
      rp: 20,
      sortname: 'su_chamado.data_abertura',
      sortorder: 'desc',
    },
  });
  return data.registros ?? [];
}

export async function abrirChamado(
  idCliente: string,
  assunto: string,
  mensagem: string
): Promise<void> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 1000));
    return;
  }

  await api.post('/su_chamado', {
    id_cliente: idCliente,
    assunto,
    mensagem,
    prioridade: '2',
  });
}
