import api from './api';
import { DEMO_MODE, DEMO_CONTRATOS } from './demo';
import type { IXCCliente, IXCContrato, IXCApiResponse } from '../types/ixc';

export async function getCliente(idCliente: string): Promise<IXCCliente> {
  const { data } = await api.get<IXCApiResponse<IXCCliente>>(`/cliente/${idCliente}`);
  if (data.registros && data.registros.length > 0) return data.registros[0];
  return data as unknown as IXCCliente;
}

export async function getContratos(idCliente: string): Promise<IXCContrato[]> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 600));
    return DEMO_CONTRATOS;
  }

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
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 1200));
    return 'Desbloqueio em confiança concedido! Sua conexão será liberada em instantes.';
  }

  const { data } = await api.post('/desbloqueio_confianca', {
    id_contrato: idContrato,
  });
  return data.mensagem ?? 'Desbloqueio solicitado com sucesso!';
}
