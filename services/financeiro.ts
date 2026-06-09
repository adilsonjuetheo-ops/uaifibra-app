import api from './api';
import type { IXCBoleto, IXCApiResponse } from '../types/ixc';

export async function getBoletos(idCliente: string): Promise<IXCBoleto[]> {
  const { data } = await api.get<IXCApiResponse<IXCBoleto>>('/fn_areceber', {
    params: {
      qtype: 'fn_areceber.id_cliente',
      query: idCliente,
      oper: '=',
      page: 1,
      rp: 20,
      sortname: 'fn_areceber.data_vencimento',
      sortorder: 'desc',
    },
  });
  return data.registros ?? [];
}

export async function getBoletoPDF(idBoleto: string): Promise<string> {
  const { data } = await api.get(`/fn_areceber/${idBoleto}/boleto_pdf`);
  return data.url ?? data.boleto_url ?? '';
}

export async function getBoletoPixQrCode(idBoleto: string): Promise<{
  qrcode: string;
  copia_cola: string;
}> {
  const { data } = await api.get(`/fn_areceber/${idBoleto}/pix`);
  return {
    qrcode: data.pix_qrcode ?? data.qrcode ?? '',
    copia_cola: data.pix_copia_cola ?? data.copia_cola ?? '',
  };
}
