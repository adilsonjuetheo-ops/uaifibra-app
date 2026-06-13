/**
 * Endpoints da API REST do IXC Soft.
 *
 * A API do IXC funciona assim:
 *  - Listagens: POST no recurso com header `ixcsoft: listar` e body
 *    { qtype, query, oper, page, rp, sortname, sortorder }
 *  - Atualizações: PUT /{recurso}/{id}
 *  - Ações especiais: POST direto (get_boleto, get_pix, desbloqueio_confianca)
 *  - Autenticação: Basic Auth com base64("id_token:hash_token")
 */
export const IXC = {
  CLIENTE: '/cliente',
  CONTRATO: '/cliente_contrato',
  FATURAS: '/fn_areceber',
  BOLETO: '/get_boleto',
  PIX: '/get_pix',
  DESBLOQUEIO_CONFIANCA: '/desbloqueio_confianca',
} as const;

export const ENV = {
  BASE_URL: process.env.EXPO_PUBLIC_IXC_BASE_URL ?? '',
  TOKEN: process.env.EXPO_PUBLIC_IXC_TOKEN ?? '',
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME ?? 'UaiFibra',
  SUPORTE_WHATSAPP: process.env.EXPO_PUBLIC_SUPORTE_WHATSAPP ?? '',
};
