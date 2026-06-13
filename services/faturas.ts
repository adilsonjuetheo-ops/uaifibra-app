import { IXC } from '@/constants/ixcEndpoints';
import { ixcApi, ixcList } from '@/services/ixc';
import { daysUntil } from '@/utils/format';

export interface IXCFatura {
  id: string;
  id_cliente: string;
  documento?: string;
  data_emissao: string;
  data_vencimento: string;
  valor: string;
  status: 'A' | 'R' | 'C'; // A=Em aberto, R=Recebido/Pago, C=Cancelado
  linha_digitavel?: string;
  pix_txid?: string;
  obs?: string;
}

export type FaturaStatus = 'aberta' | 'paga' | 'vencida' | 'cancelada';

export function statusFatura(fatura: IXCFatura): FaturaStatus {
  if (fatura.status === 'R') return 'paga';
  if (fatura.status === 'C') return 'cancelada';
  return daysUntil(fatura.data_vencimento) < 0 ? 'vencida' : 'aberta';
}

/** Lista as faturas do cliente, mais recentes primeiro. */
export async function listarFaturas(idCliente: string): Promise<IXCFatura[]> {
  const registros = await ixcList<IXCFatura>(IXC.FATURAS, {
    qtype: 'fn_areceber.id_cliente',
    query: idCliente,
    oper: '=',
    sortname: 'fn_areceber.data_vencimento',
    sortorder: 'desc',
  });
  return registros.filter((f) => f.status !== 'C');
}

/** Próxima fatura em aberto (vencida primeiro, depois a de vencimento mais próximo). */
export function proximaFatura(faturas: IXCFatura[]): IXCFatura | null {
  const abertas = faturas
    .filter((f) => f.status === 'A')
    .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
  return abertas[0] ?? null;
}

/**
 * 2ª via do boleto em PDF (base64).
 * O IXC atualiza juros/multa e devolve o arquivo do boleto.
 */
export async function obterBoletoPdfBase64(idFatura: string): Promise<string> {
  const { data } = await ixcApi.post<string | { boleto?: string }>(IXC.BOLETO, {
    boletos: idFatura,
    juro: 'N',
    multa: 'N',
    atualiza_boleto: 'S',
    tipo_boleto: 'arquivo',
    base64: 'S',
  });
  const base64 = typeof data === 'string' ? data : data?.boleto;
  if (!base64) throw new Error('Não foi possível gerar o boleto.');
  return base64;
}

export interface PixInfo {
  qrcodeText: string; // copia-e-cola
  qrcodeImageBase64?: string;
}

/** Busca o PIX (QR Code + copia-e-cola) da fatura. */
export async function obterPix(idFatura: string): Promise<PixInfo | null> {
  const { data } = await ixcApi.post<{
    type?: string;
    message?: string;
    pix?: { qrCode?: { qrcode?: string; imagemQrcode?: string } };
  }>(IXC.PIX, { id_areceber: idFatura });

  const qrcode = data?.pix?.qrCode?.qrcode;
  if (!qrcode) return null;
  return {
    qrcodeText: qrcode,
    qrcodeImageBase64: data?.pix?.qrCode?.imagemQrcode,
  };
}

/**
 * Solicita o desbloqueio em confiança (libera o acesso por alguns dias).
 * Recebe o ID do CONTRATO (não do cliente) — o IXC valida internamente
 * se o contrato tem direito ao desbloqueio.
 */
export async function solicitarDesbloqueioConfianca(idContrato: string): Promise<string> {
  const { data } = await ixcApi.post<{ type?: string; message?: string }>(
    IXC.DESBLOQUEIO_CONFIANCA,
    { id: idContrato }
  );
  if (data?.type === 'error') {
    throw new Error(data.message || 'Não foi possível solicitar o desbloqueio.');
  }
  return data?.message || 'Desbloqueio em confiança ativado com sucesso!';
}
