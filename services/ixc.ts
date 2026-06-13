import axios, { AxiosError } from 'axios';

import { ENV } from '@/constants/ixcEndpoints';

/** Codifica string em base64 (btoa não existe no runtime do RN). */
function toBase64(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < input.length; i += 3) {
    const a = input.charCodeAt(i);
    const b = input.charCodeAt(i + 1);
    const c = input.charCodeAt(i + 2);
    output += chars[a >> 2];
    output += chars[((a & 3) << 4) | (Number.isNaN(b) ? 0 : b >> 4)];
    output += Number.isNaN(b) ? '=' : chars[((b & 15) << 2) | (Number.isNaN(c) ? 0 : c >> 6)];
    output += Number.isNaN(c) ? '=' : chars[c & 63];
  }
  return output;
}

export const ixcApi = axios.create({
  baseURL: ENV.BASE_URL,
  timeout: 30_000,
  headers: {
    Authorization: `Basic ${toBase64(ENV.TOKEN)}`,
    'Content-Type': 'application/json',
  },
});

/** Callback registrado pelo authStore para deslogar em caso de 401. */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

ixcApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export interface IXCListParams {
  qtype: string;
  query: string;
  oper?: string;
  page?: string;
  rp?: string;
  sortname?: string;
  sortorder?: 'asc' | 'desc';
  /** Filtros extras: JSON string [{"TB":"tabela.campo","OP":"=","P":"valor"}] */
  grid_param?: string;
}

export interface IXCListResponse<T> {
  type?: string;
  total: number | string;
  registros?: T[];
}

/**
 * Listagem padrão do IXC: POST no recurso com header `ixcsoft: listar`.
 */
export async function ixcList<T>(resource: string, params: IXCListParams): Promise<T[]> {
  const { data } = await ixcApi.post<IXCListResponse<T>>(
    resource,
    {
      oper: '=',
      page: '1',
      rp: '100',
      ...params,
    },
    { headers: { ixcsoft: 'listar' } }
  );
  return data.registros ?? [];
}

/** Mensagem amigável para erros de rede/API. */
export function friendlyError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    }
    if (error.response.status === 401) {
      return 'Sessão expirada. Faça login novamente.';
    }
    if (error.response.status >= 500) {
      return 'O sistema do provedor está temporariamente indisponível. Tente novamente em instantes.';
    }
    const msg = (error.response.data as { message?: string })?.message;
    if (msg) return msg;
  }
  return 'Algo deu errado. Tente novamente.';
}
