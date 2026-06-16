/**
 * Dados fictícios para o modo demo.
 * Ativo quando o IXC não está configurado (.env ausente) ou quando
 * o usuário usa o CPF de teste 123.456.789-00 / senha inicial 12345.
 */

import { IXCContrato } from '@/services/cliente';
import { IXCFatura } from '@/services/faturas';
import { SessaoCliente } from '@/services/auth';

export const DEMO_CPF = '12345678900';
export const DEMO_SENHA_PADRAO = '8900'; // 4 últimos dígitos do CPF de teste

export function isDemoCliente(idCliente: string): boolean {
  return idCliente === 'DEMO-001';
}

export function demoSessao(senhaPadrao: boolean): SessaoCliente {
  return {
    id: 'DEMO-001',
    nome: 'Cliente Teste',
    cpf: DEMO_CPF,
    email: 'teste@uaifibra.com.br',
    telefone: '(38) 99999-9999',
    endereco: 'Rua das Fibras, 100, Centro',
    cidade: 'Buritizeiro',
    senhaPadrao,
  };
}

export function demoContratos(): IXCContrato[] {
  return [
    {
      id: 'DEMO-C1',
      id_cliente: 'DEMO-001',
      contrato: 'Plano 200 Mega',
      status: 'A',
      status_internet: 'A',
      data_ativacao: '2024-01-15',
    },
  ];
}

export function demoFaturas(): IXCFatura[] {
  const hoje = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const venc1 = new Date(hoje);
  venc1.setDate(hoje.getDate() + 10);

  const venc2 = new Date(hoje);
  venc2.setMonth(hoje.getMonth() - 1);
  venc2.setDate(10);

  const venc3 = new Date(hoje);
  venc3.setMonth(hoje.getMonth() - 2);
  venc3.setDate(10);

  return [
    {
      id: 'DEMO-F1',
      id_cliente: 'DEMO-001',
      documento: '2024001',
      data_emissao: fmt(hoje),
      data_vencimento: fmt(venc1),
      valor: '99.90',
      status: 'A',
      pix_txid: 'demo-pix-txid-001',
      obs: 'Internet Fibra - Plano 200 Mega',
    },
    {
      id: 'DEMO-F2',
      id_cliente: 'DEMO-001',
      documento: '2023012',
      data_emissao: fmt(venc2),
      data_vencimento: fmt(venc2),
      valor: '99.90',
      status: 'R',
      obs: 'Internet Fibra - Plano 200 Mega',
    },
    {
      id: 'DEMO-F3',
      id_cliente: 'DEMO-001',
      documento: '2023011',
      data_emissao: fmt(venc3),
      data_vencimento: fmt(venc3),
      valor: '99.90',
      status: 'R',
      obs: 'Internet Fibra - Plano 200 Mega',
    },
  ];
}
