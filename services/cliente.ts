import api from './api';
import type { IXCCliente, IXCContrato, IXCApiResponse } from '../types/ixc';

export async function getCliente(idCliente: string): Promise<IXCCliente> {
  const { data } = await api.get<IXCApiResponse<IXCCliente>>(`/cliente/${idCliente}`);
  if (data.registros && data.registros.length > 0) return data.registros[0];
  return data as unknown as IXCCliente;
}

export async function getContratos(idCliente: string): Promise<IXCContrato[]> {
  const { data } = await api.get<IXCApiResponse<IXCContrato>>('/contrato', {
    params: {
      qtype: 'contrato.id_cliente',
      query: idCliente,
      oper: '=',
      page: 1,
      rp: 20,
      sortname: 'contrato.id',
      sortorder: 'desc',
    },
  });
  return data.registros ?? [];
}

export async function solicitarDesbloqueioConfianca(idContrato: string): Promise<string> {
  const { data } = await api.post('/desbloqueio_confianca', {
    id_contrato: idContrato,
  });
  return data.mensagem ?? 'Desbloqueio solicitado com sucesso!';
}
