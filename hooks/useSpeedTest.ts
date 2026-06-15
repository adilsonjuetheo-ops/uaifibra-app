import { useEffect, useState } from 'react';

interface NetworkInfo {
  ip: string;
  provedor: string;
}

async function buscarRede(): Promise<NetworkInfo> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const json = (await res.json()) as { ip?: string; org?: string };
    return { ip: json.ip ?? '--', provedor: json.org ?? '--' };
  } catch {
    return { ip: '--', provedor: '--' };
  }
}

export function useNetworkInfo(): NetworkInfo {
  const [rede, setRede] = useState<NetworkInfo>({ ip: '--', provedor: '--' });

  useEffect(() => {
    void buscarRede().then(setRede);
  }, []);

  return rede;
}
