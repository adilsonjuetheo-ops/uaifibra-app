export interface IXCLoginResponse {
  token: string;
  id_cliente: string;
  nome: string;
  cpf_cnpj: string;
  email: string;
  fone: string;
  celular: string;
  mensagem?: string;
}

export interface IXCCliente {
  id: string;
  razao: string;
  fantasia: string;
  cnpj_cpf: string;
  email: string;
  fone: string;
  celular: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  status: 'A' | 'I' | 'B';
}

export interface IXCContrato {
  id: string;
  id_cliente: string;
  id_plano: string;
  descricao_plano: string;
  velocidade_down: number;
  velocidade_up: number;
  status: 'A' | 'I' | 'CA' | 'CM' | 'FA' | 'AA';
  status_internet: 'A' | 'B';
  data_ativacao: string;
  valor: string;
  dia_vencimento: string;
  enderecos_mac?: string;
}

export interface IXCBoleto {
  id: string;
  id_cliente: string;
  id_contrato?: string;
  descricao: string;
  valor: string;
  valor_pago?: string;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'A' | 'P' | 'C';
  linha_digitavel?: string;
  nosso_numero?: string;
  url_boleto?: string;
  url_nf?: string;
  pix_qrcode?: string;
  pix_copia_cola?: string;
  tipo: 'B' | 'P';
}

export interface IXCChamado {
  id: string;
  id_cliente: string;
  assunto: string;
  mensagem: string;
  status: 'A' | 'E' | 'F';
  prioridade: '1' | '2' | '3';
  data_abertura: string;
  data_fechamento?: string;
  departamento?: string;
}

export interface IXCDesbloqueioBloqueio {
  id_contrato: string;
  mensagem?: string;
}

export interface IXCApiResponse<T> {
  type: 'success' | 'error';
  message: string;
  registros?: T[];
  total?: number;
  recordsTotal?: number;
  recordsFiltered?: number;
}
