import { IXC } from '@/constants/ixcEndpoints';
import { demoContratos, isDemoCliente } from '@/services/demo';
import { ixcApi, ixcList } from '@/services/ixc';
import { onlyDigits } from '@/utils/format';

export interface IXCCliente {
  id: string;
  razao: string;
  cnpj_cpf: string;
  email: string;
  telefone_celular: string;
  fone?: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade?: string;
  senha?: string;
  ativo?: string;
  hotsite_email?: string;
}

export interface IXCContrato {
  id: string;
  id_cliente: string;
  contrato: string;
  status: string; // A=Ativo, I=Inativo, N=Negativado, D=Desistiu
  status_internet: string; // A=Ativo, D=Desativado, CM=Bloq. manual, CA=Bloq. automático, FA=Financeiro
  data_ativacao?: string;
  id_vd_contrato?: string;
}

/** CPF no formato armazenado pelo IXC: 000.000.000-00 */
function formatarCpf(cpf: string): string {
  const digits = onlyDigits(cpf);
  return digits.length === 11
    ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    : digits;
}

/** Busca cliente pelo CPF/CNPJ (o IXC armazena formatado). */
export async function buscarClientePorCpf(cpf: string): Promise<IXCCliente | null> {
  const registros = await ixcList<IXCCliente>(IXC.CLIENTE, {
    qtype: 'cliente.cnpj_cpf',
    query: formatarCpf(cpf),
    oper: '=',
  });
  return registros[0] ?? null;
}

/**
 * Busca cliente pelo CPF filtrando também pela senha do hotsite (server-side).
 * A API nunca retorna o campo `senha`, mas aceita filtrá-lo via grid_param —
 * se vier registro, a senha confere.
 */
export async function buscarClientePorCpfESenha(
  cpf: string,
  senha: string
): Promise<IXCCliente | null> {
  const registros = await ixcList<IXCCliente>(IXC.CLIENTE, {
    qtype: 'cliente.cnpj_cpf',
    query: formatarCpf(cpf),
    oper: '=',
    grid_param: JSON.stringify([{ TB: 'cliente.senha', OP: '=', P: senha }]),
  });
  return registros[0] ?? null;
}

export async function buscarClientePorId(id: string): Promise<IXCCliente | null> {
  const registros = await ixcList<IXCCliente>(IXC.CLIENTE, {
    qtype: 'cliente.id',
    query: id,
    oper: '=',
  });
  return registros[0] ?? null;
}

/** Nome da cidade a partir do id usado no cadastro (tabela `cidade`). */
export async function nomeCidade(idCidade: string | undefined): Promise<string | null> {
  if (!idCidade) return null;
  try {
    const registros = await ixcList<{ id: string; nome: string }>('/cidade', {
      qtype: 'cidade.id',
      query: idCidade,
      oper: '=',
    });
    return registros[0]?.nome ?? null;
  } catch {
    return null; // sem permissão na tabela cidade: app funciona sem filtro regional
  }
}

/** Busca os contratos do cliente (plano, status da conexão etc.). */
export async function buscarContratos(idCliente: string): Promise<IXCContrato[]> {
  if (isDemoCliente(idCliente)) return demoContratos();
  return ixcList<IXCContrato>(IXC.CONTRATO, {
    qtype: 'cliente_contrato.id_cliente',
    query: idCliente,
    oper: '=',
  });
}

/**
 * Atualiza um campo do cliente. O PUT do IXC exige o registro completo,
 * então buscamos o registro atual e mesclamos as mudanças.
 */
export async function atualizarCliente(
  id: string,
  changes: Partial<IXCCliente>
): Promise<void> {
  const atual = await buscarClientePorId(id);
  if (!atual) throw new Error('Cliente não encontrado.');
  const body = { ...atual, ...changes };
  // IXC exige telefone_celular no PUT; clientes com só fone fixo usam fone como fallback
  if (!body.telefone_celular && body.fone) {
    body.telefone_celular = body.fone;
  }
  const resp = await ixcApi.put(`${IXC.CLIENTE}/${id}`, body);
  const respBody = resp.data as { type?: string; message?: string } | undefined;
  // IXC às vezes retorna HTTP 200 com type:"error" no corpo indicando falha
  if (respBody?.type && respBody.type !== 'success') {
    throw new Error(respBody.message ?? `IXC retornou type="${respBody.type}"`);
  }
}

export const STATUS_INTERNET_LABEL: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  A: { label: 'Conexão ativa', tone: 'success' },
  D: { label: 'Conexão desativada', tone: 'danger' },
  CM: { label: 'Bloqueado manualmente', tone: 'danger' },
  CA: { label: 'Bloqueado automaticamente', tone: 'danger' },
  FA: { label: 'Bloqueio financeiro', tone: 'warning' },
};
