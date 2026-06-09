import api from './api';
import type { IXCChamado, IXCApiResponse } from '../types/ixc';

export async function getChamados(idCliente: string): Promise<IXCChamado[]> {
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
  await api.post('/su_chamado', {
    id_cliente: idCliente,
    assunto,
    mensagem,
    prioridade: '2',
  });
}
