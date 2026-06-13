import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Mural de avisos do provedor.
 * Fonte principal: Painel UaiFibra (painel.uaifibratelecom.com.br).
 * Fallback: JSON no GitHub Pages; por último, o cache local.
 */
export const PAINEL_URL = 'https://painel.uaifibratelecom.com.br';
const FONTES = [
  `${PAINEL_URL}/avisos.json`,
  'https://adilsonjuetheo-ops.github.io/uaifibra-avisos/avisos.json',
];
const CACHE_KEY = 'uaifibra.avisos.cache';

export type AvisoTipo = 'info' | 'manutencao' | 'urgente';

export interface Aviso {
  id: string;
  tipo: AvisoTipo;
  titulo: string;
  mensagem: string;
  /** Cidades que veem o aviso; lista vazia = todos. */
  cidades?: string[];
  exibirDe?: string; // YYYY-MM-DD
  exibirAte?: string; // YYYY-MM-DD
}

/** Busca o mural na primeira fonte que responder; sem rede, usa o cache. */
export async function buscarAvisos(): Promise<Aviso[]> {
  for (const url of FONTES) {
    try {
      // cache-buster: o CDN do GitHub Pages segura o arquivo por ~10 min
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = (await res.json()) as Aviso[];
      if (Array.isArray(json)) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(json));
        return json;
      }
    } catch {
      // tenta a próxima fonte
    }
  }
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  try {
    return raw ? (JSON.parse(raw) as Aviso[]) : [];
  } catch {
    return [];
  }
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();
}

/** Filtra avisos vigentes hoje e destinados à cidade do cliente. */
export function avisosAtivos(avisos: Aviso[], cidade?: string | null): Aviso[] {
  const hoje = new Date();
  hoje.setMinutes(hoje.getMinutes() - hoje.getTimezoneOffset());
  const dataHoje = hoje.toISOString().slice(0, 10);

  return avisos.filter((a) => {
    if (!a?.id || !a.titulo) return false;
    if (a.exibirDe && dataHoje < a.exibirDe) return false;
    if (a.exibirAte && dataHoje > a.exibirAte) return false;
    if (a.cidades && a.cidades.length > 0 && cidade) {
      const c = normalizar(cidade);
      if (!a.cidades.some((x) => normalizar(x) === c)) return false;
    }
    return true;
  });
}
