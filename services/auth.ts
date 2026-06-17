import * as SecureStore from 'expo-secure-store';

import {
  atualizarCliente,
  buscarClientePorCpf,
  buscarClientePorCpfESenha,
  IXCCliente,
  nomeCidade,
} from '@/services/cliente';
import { DEMO_CPF, DEMO_SENHA_PADRAO, demoSessao, isDemoCliente } from '@/services/demo';
import { onlyDigits } from '@/utils/format';
import { md5 } from '@/utils/md5';

const KEY_CPF = 'uaifibra.cpf';
const KEY_SENHA = 'uaifibra.senha';
const KEY_CLIENTE = 'uaifibra.cliente';

export interface SessaoCliente {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  endereco: string;
  /** Nome da cidade de instalação (para o mural de avisos regional). */
  cidade?: string | null;
  /** true quando logou com a senha padrão (4 últimos dígitos do CPF) — força a troca. */
  senhaPadrao?: boolean;
}

function toSessao(cliente: IXCCliente): SessaoCliente {
  const endereco = [cliente.endereco, cliente.numero, cliente.bairro]
    .filter(Boolean)
    .join(', ');
  return {
    id: cliente.id,
    nome: cliente.razao,
    cpf: onlyDigits(cliente.cnpj_cpf),
    email: cliente.email ?? '',
    telefone: cliente.telefone_celular || cliente.fone || '',
    endereco,
  };
}

/**
 * Autentica o cliente. A API do IXC nunca retorna o campo `senha`, então a
 * validação é feita server-side, filtrando a busca por CPF + senha:
 *
 *  1. senha em texto puro (como o painel grava por padrão);
 *  2. senha com hash MD5 (instalações com `senha_hotsite_md5` ativo);
 *  3. cliente sem senha cadastrada → vale a senha padrão do primeiro
 *     acesso (4 últimos dígitos do CPF).
 */
export async function login(cpf: string, senha: string): Promise<SessaoCliente> {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) throw new Error('CPF inválido. Confira os 11 dígitos.');
  if (!senha) throw new Error('Informe sua senha.');

  // ── Usuário de teste (sem API configurada) ──────────────────────────────
  if (digits === DEMO_CPF) {
    const senhaPadrao = digits.slice(-4);
    if (senha !== senhaPadrao && senha !== DEMO_SENHA_PADRAO) {
      // após trocar a senha no demo, ela fica salva no SecureStore
      const senhaSalva = await SecureStore.getItemAsync(KEY_SENHA);
      if (!senhaSalva || senha !== senhaSalva) {
        throw new Error('Senha incorreta.');
      }
    }
    const sessao = demoSessao(senha === senhaPadrao);
    await SecureStore.setItemAsync(KEY_CPF, digits);
    await SecureStore.setItemAsync(KEY_SENHA, senha);
    await SecureStore.setItemAsync(KEY_CLIENTE, JSON.stringify(sessao));
    return sessao;
  }
  // ───────────────────────────────────────────────────────────────────────

  const existe = await buscarClientePorCpf(digits);
  if (!existe) throw new Error('CPF não encontrado. Verifique os dados ou fale com o suporte.');

  let cliente =
    (await buscarClientePorCpfESenha(digits, senha)) ??
    (await buscarClientePorCpfESenha(digits, md5(senha)));

  if (!cliente) {
    // sem senha cadastrada no IXC: aceita a senha padrão do primeiro acesso
    const senhaPadrao = digits.slice(-4);
    if (senha === senhaPadrao) {
      cliente = await buscarClientePorCpfESenha(digits, '');
    }
  }

  if (!cliente) {
    throw new Error(
      'Senha incorreta. No primeiro acesso, use os 4 últimos dígitos do seu CPF.'
    );
  }

  const sessao = toSessao(cliente);
  sessao.cidade = await nomeCidade(cliente.cidade);
  // logou com a senha padrão? obriga a criar uma senha própria antes de usar o app
  sessao.senhaPadrao = senha === digits.slice(-4);
  await SecureStore.setItemAsync(KEY_CPF, digits);
  await SecureStore.setItemAsync(KEY_SENHA, senha);
  await SecureStore.setItemAsync(KEY_CLIENTE, JSON.stringify(sessao));
  return sessao;
}

/** Restaura a sessão salva no SecureStore (ou null se não logado). */
export async function restaurarSessao(): Promise<SessaoCliente | null> {
  const raw = await SecureStore.getItemAsync(KEY_CLIENTE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessaoCliente;
  } catch {
    return null;
  }
}

export async function persistirSessao(sessao: SessaoCliente): Promise<void> {
  await SecureStore.setItemAsync(KEY_CLIENTE, JSON.stringify(sessao));
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_CPF);
  await SecureStore.deleteItemAsync(KEY_SENHA);
  await SecureStore.deleteItemAsync(KEY_CLIENTE);
}

/**
 * Troca a senha do hotsite do cliente no IXC.
 * `senhaAtual = null` pula a conferência (usado na troca obrigatória do
 * primeiro acesso, em que a senha atual é a padrão já validada no login).
 */
export async function trocarSenha(
  idCliente: string,
  senhaAtual: string | null,
  novaSenha: string
): Promise<void> {
  const senhaSalva = await SecureStore.getItemAsync(KEY_SENHA);
  if (senhaAtual !== null && senhaSalva && senhaAtual !== senhaSalva) {
    throw new Error('Senha atual incorreta.');
  }
  if (novaSenha.length < 6) {
    throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
  }

  const sessao = await restaurarSessao();
  if (sessao && novaSenha === sessao.cpf.slice(-4)) {
    throw new Error('A nova senha não pode ser igual à senha padrão (4 últimos dígitos do CPF).');
  }

  if (!isDemoCliente(idCliente)) {
    // Tenta plain text; se o IXC rejeitar, tenta MD5 (instalações com senha_hotsite_md5)
    let salvoNoIxc = false;
    for (const valor of [novaSenha, md5(novaSenha)]) {
      try {
        await atualizarCliente(idCliente, { senha: valor });
        salvoNoIxc = true;
        break;
      } catch (err) {
        console.warn('[trocarSenha] falhou:', err instanceof Error ? err.message : err);
      }
    }
    if (!salvoNoIxc) {
      throw new Error('Não foi possível salvar a nova senha no servidor. Tente novamente ou fale com o suporte.');
    }
  }
  await SecureStore.setItemAsync(KEY_SENHA, novaSenha);

  // a partir daqui o cliente tem senha própria
  if (sessao) {
    const atualizada = { ...sessao, senhaPadrao: false };
    await SecureStore.setItemAsync(KEY_CLIENTE, JSON.stringify(atualizada));
  }
}
