import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const HISTORY_KEY = 'uaifibra.speedtest.historico';

/**
 * Teste de velocidade usando a rede de servidores do Minha Conexão
 * (https://www.minhaconexao.com.br) — servidores hospedados em provedores
 * brasileiros, muito mais próximos do cliente que CDNs internacionais.
 *
 * Protocolo dos servidores (porta 9090, HTTPS):
 *   GET  {server}/download?size={bytes}&z={rand}
 *   POST {server}/upload?z={rand}
 */
const MC_API = 'https://api.minhaconexao.com.br/v1';
const MC_FALLBACK_SERVERS = [
  'https://testserver1.mcservers.co:9090',
  'https://testserver2.mcservers.co:9090',
];
// último recurso caso a rede Minha Conexão esteja fora
const CF_DOWN = 'https://speed.cloudflare.com/__down?bytes=';
const CF_UP = 'https://speed.cloudflare.com/__up';

export interface SpeedResult {
  download: number; // Mbps
  upload: number; // Mbps
  ping: number; // ms
  data: string; // ISO
  servidor?: string;
}

export type SpeedPhase = 'idle' | 'ping' | 'download' | 'upload' | 'done';

interface NetworkInfo {
  ip: string;
  provedor: string;
  lat?: number;
  lng?: number;
}

interface TestServer {
  base: string; // ex.: https://server004633.mcservers.co:9090
  nome: string; // ex.: "ITA INTERNET — Itaipé"
}

interface MCServer {
  name?: string;
  city?: string;
  host?: string;
  port?: string;
  distance?: number;
}

async function buscarRede(): Promise<NetworkInfo> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const json = (await res.json()) as {
      ip?: string;
      org?: string;
      latitude?: number;
      longitude?: number;
    };
    return {
      ip: json.ip ?? '--',
      provedor: json.org ?? '--',
      lat: json.latitude,
      lng: json.longitude,
    };
  } catch {
    return { ip: '--', provedor: '--' };
  }
}

function mcServerToBase(s: MCServer): string | null {
  if (!s.host) return null;
  const hostPort = s.host.includes(':') ? s.host : `${s.host}:${s.port || '9090'}`;
  return `https://${hostPort}`;
}

/** Busca o servidor de teste mais próximo na rede Minha Conexão. */
async function buscarServidor(rede: NetworkInfo): Promise<TestServer> {
  try {
    if (rede.lat != null && rede.lng != null) {
      const url =
        `${MC_API}/server?lat=${rede.lat}&lng=${rede.lng}` +
        (rede.ip !== '--' ? `&ip=${rede.ip}` : '');
      const res = await fetch(url);
      const json = (await res.json()) as {
        serverIpOwner?: MCServer;
        servers?: MCServer[];
      };

      // Prioridade: 1) servidor detectado pelo IP do cliente (serverIpOwner),
      // 2) servidor da UaiFibra ("UaiFibra Fibra — Buritizeiro"), 3) o mais próximo
      const proximos = (json.servers ?? []).sort(
        (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)
      );
      const daUaiFibra = proximos.filter((s) => /uaifibra/i.test(s.name ?? ''));
      const demais = proximos.filter((s) => !/uaifibra/i.test(s.name ?? ''));
      const candidatos: MCServer[] = [
        ...(json.serverIpOwner ? [json.serverIpOwner] : []),
        ...daUaiFibra,
        ...demais,
      ];

      for (const s of candidatos) {
        const base = mcServerToBase(s);
        if (!base) continue;
        if (await servidorDisponivel(base)) {
          const nome = [s.name, s.city].filter(Boolean).join(' — ');
          return { base, nome: nome || 'Minha Conexão' };
        }
      }
    }
  } catch {
    // cai para os servidores padrão abaixo
  }

  for (const base of MC_FALLBACK_SERVERS) {
    if (await servidorDisponivel(base)) {
      return { base, nome: 'Minha Conexão — São Paulo' };
    }
  }

  return { base: '', nome: 'Cloudflare' };
}

async function servidorDisponivel(base: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${base}/download?size=1&z=${Math.random()}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

function urlDownload(server: TestServer, bytes: number): string {
  return server.base
    ? `${server.base}/download?size=${bytes}&z=${Math.random()}`
    : `${CF_DOWN}${bytes}`;
}

function urlUpload(server: TestServer): string {
  return server.base ? `${server.base}/upload?z=${Math.random()}` : CF_UP;
}

async function medirPing(server: TestServer): Promise<number> {
  const tempos: number[] = [];
  for (let i = 0; i < 5; i++) {
    const inicio = Date.now();
    await fetch(urlDownload(server, 1), { cache: 'no-store' });
    tempos.push(Date.now() - inicio);
  }
  tempos.sort((a, b) => a - b);
  // mediana: descarta o primeiro request (handshake TLS) e picos
  return Math.round(tempos[Math.floor(tempos.length / 2)]);
}

async function medirDownload(
  server: TestServer,
  onProgress: (mbps: number) => void
): Promise<number> {
  // tamanhos crescentes: aquece a conexão e mede no maior bloco
  const tamanhos = [1_000_000, 5_000_000, 15_000_000];
  let mbps = 0;
  for (const bytes of tamanhos) {
    const inicio = Date.now();
    const res = await fetch(urlDownload(server, bytes), { cache: 'no-store' });
    await res.arrayBuffer();
    const segundos = (Date.now() - inicio) / 1000;
    mbps = (bytes * 8) / segundos / 1_000_000;
    onProgress(mbps);
  }
  return Math.round(mbps * 10) / 10;
}

async function medirUpload(
  server: TestServer,
  onProgress: (mbps: number) => void
): Promise<number> {
  const tamanhos = [500_000, 2_000_000, 5_000_000];
  let mbps = 0;
  for (const bytes of tamanhos) {
    const payload = new Uint8Array(bytes);
    const inicio = Date.now();
    await fetch(urlUpload(server), { method: 'POST', body: payload });
    const segundos = (Date.now() - inicio) / 1000;
    mbps = (bytes * 8) / segundos / 1_000_000;
    onProgress(mbps);
  }
  return Math.round(mbps * 10) / 10;
}

export function useSpeedTest() {
  const [fase, setFase] = useState<SpeedPhase>('idle');
  const [velocidadeAtual, setVelocidadeAtual] = useState(0);
  const [resultado, setResultado] = useState<SpeedResult | null>(null);
  const [historico, setHistorico] = useState<SpeedResult[]>([]);
  const [rede, setRede] = useState<NetworkInfo>({ ip: '--', provedor: '--' });
  const [servidor, setServidor] = useState<string>('--');
  const [erro, setErro] = useState<string | null>(null);
  const rodando = useRef(false);
  const redeRef = useRef<NetworkInfo>({ ip: '--', provedor: '--' });

  useEffect(() => {
    void AsyncStorage.getItem(HISTORY_KEY).then((raw) => {
      if (raw) setHistorico(JSON.parse(raw) as SpeedResult[]);
    });
    void buscarRede().then((info) => {
      redeRef.current = info;
      setRede(info);
    });
  }, []);

  const iniciar = useCallback(async () => {
    if (rodando.current) return;
    rodando.current = true;
    setErro(null);
    setResultado(null);
    setVelocidadeAtual(0);
    try {
      setFase('ping');

      // garante dados de rede (ip/lat/lng) antes de escolher o servidor
      if (redeRef.current.ip === '--') {
        redeRef.current = await buscarRede();
        setRede(redeRef.current);
      }
      const server = await buscarServidor(redeRef.current);
      setServidor(server.nome);

      const ping = await medirPing(server);

      setFase('download');
      const download = await medirDownload(server, setVelocidadeAtual);

      setFase('upload');
      setVelocidadeAtual(0);
      const upload = await medirUpload(server, setVelocidadeAtual);

      const res: SpeedResult = {
        download,
        upload,
        ping,
        data: new Date().toISOString(),
        servidor: server.nome,
      };
      setResultado(res);
      setFase('done');

      const novoHistorico = [res, ...historico].slice(0, 5);
      setHistorico(novoHistorico);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(novoHistorico));
    } catch {
      setErro('Não foi possível concluir o teste. Verifique sua conexão.');
      setFase('idle');
    } finally {
      rodando.current = false;
    }
  }, [historico]);

  return { fase, velocidadeAtual, resultado, historico, rede, servidor, erro, iniciar };
}
