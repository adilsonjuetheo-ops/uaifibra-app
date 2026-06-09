import type { IXCLoginResponse, IXCContrato, IXCBoleto, IXCChamado } from '../types/ixc';

export const DEMO_MODE = true; // mude para false quando tiver o servidor IXC

export const DEMO_USER: IXCLoginResponse = {
  token: 'demo-token',
  id_cliente: '1001',
  nome: 'João Carlos Silva',
  cpf_cnpj: '123.456.789-00',
  email: 'joao.silva@email.com',
  fone: '(34) 3321-0000',
  celular: '(34) 99812-3456',
};

export const DEMO_CONTRATOS: IXCContrato[] = [
  {
    id: '2001',
    id_cliente: '1001',
    id_plano: '5',
    descricao_plano: 'UaiFibra 300 Mega',
    velocidade_down: 300,
    velocidade_up: 150,
    status: 'FA',
    status_internet: 'B',
    data_ativacao: '2024-03-15',
    valor: '99.90',
    dia_vencimento: '10',
  },
];

const hoje = new Date();
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r.toISOString().split('T')[0];
}

export const DEMO_BOLETOS: IXCBoleto[] = [
  {
    id: '3001',
    id_cliente: '1001',
    descricao: 'Mensalidade UaiFibra 300 Mega - Jul/2025',
    valor: '99.90',
    data_vencimento: addDays(hoje, 5),
    status: 'A',
    linha_digitavel: '10491.12345 12345.678901 12345.678901 1 10000000009990',
    pix_qrcode: 'demo-qrcode',
    pix_copia_cola: '00020101021226870014br.gov.bcb.pix2565qr.exemplo.com.br/pix/v2/cobv/demo12345204000053039865802BR5913UaiFibra LTDA6008Uberaba62070503***6304ABCD',
    tipo: 'B',
  },
  {
    id: '3002',
    id_cliente: '1001',
    descricao: 'Mensalidade UaiFibra 300 Mega - Jun/2025',
    valor: '99.90',
    valor_pago: '99.90',
    data_vencimento: addDays(hoje, -25),
    data_pagamento: addDays(hoje, -26),
    status: 'P',
    linha_digitavel: '10491.12345 12345.678901 12345.678901 1 10000000009990',
    tipo: 'B',
  },
  {
    id: '3003',
    id_cliente: '1001',
    descricao: 'Mensalidade UaiFibra 300 Mega - Mai/2025',
    valor: '99.90',
    valor_pago: '99.90',
    data_vencimento: addDays(hoje, -55),
    data_pagamento: addDays(hoje, -55),
    status: 'P',
    tipo: 'B',
  },
];

export const DEMO_CHAMADOS: IXCChamado[] = [
  {
    id: '4001',
    id_cliente: '1001',
    assunto: 'Lentidão no período da noite',
    mensagem: 'Minha internet fica lenta todo dia após as 20h. A velocidade cai para menos de 10 Mbps.',
    status: 'E',
    prioridade: '2',
    data_abertura: addDays(hoje, -3) + ' 14:32:00',
  },
  {
    id: '4002',
    id_cliente: '1001',
    assunto: 'Instalação de ponto extra',
    mensagem: 'Gostaria de instalar mais um ponto de rede no quarto.',
    status: 'F',
    prioridade: '3',
    data_abertura: addDays(hoje, -30) + ' 09:15:00',
    data_fechamento: addDays(hoje, -28) + ' 16:00:00',
  },
];
