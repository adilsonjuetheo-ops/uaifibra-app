import api from './api';
import { DEMO_MODE, DEMO_BOLETOS } from './demo';
import type { IXCBoleto, IXCApiResponse } from '../types/ixc';

export async function getBoletos(idCliente: string): Promise<IXCBoleto[]> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 700));
    return DEMO_BOLETOS;
  }

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
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 500));
    return '';
  }

  const { data } = await api.get(`/fn_areceber/${idBoleto}/boleto_pdf`);
  return data.url ?? data.boleto_url ?? '';
}

export async function getBoletoPixQrCode(idBoleto: string): Promise<{
  qrcode: string;
  copia_cola: string;
}> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 800));
    const boleto = DEMO_BOLETOS.find((b) => b.id === idBoleto);
    return {
      qrcode: boleto?.pix_qrcode ?? '',
      copia_cola: boleto?.pix_copia_cola ?? '',
    };
  }

  const { data } = await api.get(`/fn_areceber/${idBoleto}/pix`);
  return {
    qrcode: data.pix_qrcode ?? data.qrcode ?? '',
    copia_cola: data.pix_copia_cola ?? data.copia_cola ?? '',
  };
}
