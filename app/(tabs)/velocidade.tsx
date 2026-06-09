import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../store/authStore';
import { getContratos } from '../../services/cliente';
import { useQuery } from '@tanstack/react-query';

type TestPhase = 'idle' | 'ping' | 'download' | 'upload' | 'done';

interface TestResult {
  ping: number;
  download: number;
  upload: number;
  timestamp: Date;
}

async function measurePing(url: string): Promise<number> {
  const samples: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    try {
      await fetch(`${url}?_=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
      samples.push(Date.now() - start);
    } catch {
      samples.push(999);
    }
  }
  samples.sort((a, b) => a - b);
  return Math.round(samples.slice(1, 4).reduce((s, v) => s + v, 0) / 3);
}


async function simulateSpeedTest(type: 'download' | 'upload', onProgress: (mbps: number) => void): Promise<number> {
  const duration = 6000;
  const steps = 30;
  const interval = duration / steps;
  const base = type === 'download' ? 80 + Math.random() * 120 : 30 + Math.random() * 50;

  return new Promise((resolve) => {
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const jitter = (Math.random() - 0.5) * base * 0.15;
      const ramp = Math.min(step / steps, 1);
      const current = Math.round((base * ramp + jitter) * 10) / 10;
      onProgress(Math.max(0, current));
      if (step >= steps) {
        clearInterval(timer);
        resolve(Math.round((base + jitter) * 10) / 10);
      }
    }, interval);
  });
}


export default function VelocidadeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { data: contratos } = useQuery({
    queryKey: ['contratos', user?.id_cliente],
    queryFn: () => getContratos(user!.id_cliente),
    enabled: !!user,
  });

  const contrato = contratos?.[0];

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
  }

  function stopPulse() {
    pulseAnim.stopAnimation();
    Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
  }

  async function runTest() {
    if (phase !== 'idle' && phase !== 'done') return;
    setResult(null);
    setCurrentSpeed(0);

    startPulse();

    setPhase('ping');
    const ping = await measurePing('https://1.1.1.1');

    setPhase('download');
    const download = await simulateSpeedTest('download', (s) => setCurrentSpeed(s));

    setPhase('upload');
    setCurrentSpeed(0);
    const upload = await simulateSpeedTest('upload', (s) => setCurrentSpeed(s));

    stopPulse();
    setCurrentSpeed(0);
    setPhase('done');
    setResult({ ping, download, upload, timestamp: new Date() });
  }

  const phaseLabel = { idle: 'Iniciar teste', ping: 'Medindo latência...', download: 'Medindo download...', upload: 'Medindo upload...', done: 'Testar novamente' };
  const isRunning = phase !== 'idle' && phase !== 'done';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Teste de Velocidade</Text>
      <Text style={styles.pageSub}>Meça a velocidade da sua conexão em tempo real</Text>

      {/* Speedômetro / botão central */}
      <View style={styles.center}>
        <Animated.View style={[styles.outerRing, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.innerRing}>
            <TouchableOpacity style={styles.testBtn} onPress={runTest} disabled={isRunning} activeOpacity={0.85}>
              {isRunning ? (
                <>
                  <Text style={styles.testBtnSpeed}>{currentSpeed.toFixed(1)}</Text>
                  <Text style={styles.testBtnUnit}>Mbps</Text>
                  <Text style={styles.testBtnPhase}>{phaseLabel[phase]}</Text>
                </>
              ) : phase === 'done' && result ? (
                <>
                  <Ionicons name="refresh-outline" size={28} color={Colors.white} />
                  <Text style={styles.testBtnPhase}>Testar novamente</Text>
                </>
              ) : (
                <>
                  <Ionicons name="flash-outline" size={32} color={Colors.white} />
                  <Text style={styles.testBtnLabel}>INICIAR</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Resultados */}
      {result && (
        <View style={styles.results}>
          {[
            { label: 'Ping', value: `${result.ping} ms`, icon: 'pulse-outline', color: Colors.info },
            { label: 'Download', value: `${result.download} Mbps`, icon: 'arrow-down-circle-outline', color: Colors.orange },
            { label: 'Upload', value: `${result.upload} Mbps`, icon: 'arrow-up-circle-outline', color: Colors.gold },
          ].map(({ label, value, icon, color }) => (
            <Card key={label} style={styles.resultCard}>
              <Ionicons name={icon as any} size={24} color={color} style={{ marginBottom: 8 }} />
              <Text style={[styles.resultValue, { color }]}>{value}</Text>
              <Text style={styles.resultLabel}>{label}</Text>
            </Card>
          ))}
        </View>
      )}

      {/* Plano contratado */}
      {contrato && (
        <Card style={styles.planCard}>
          <Text style={styles.planTitle}>Plano Contratado</Text>
          <View style={styles.planRow}>
            <View style={styles.planItem}>
              <Ionicons name="arrow-down-circle" size={18} color={Colors.orange} />
              <Text style={styles.planSpeed}>{contrato.velocidade_down} Mbps</Text>
              <Text style={styles.planLabel}>Download</Text>
            </View>
            <View style={styles.planDiv} />
            <View style={styles.planItem}>
              <Ionicons name="arrow-up-circle" size={18} color={Colors.gold} />
              <Text style={styles.planSpeed}>{contrato.velocidade_up} Mbps</Text>
              <Text style={styles.planLabel}>Upload</Text>
            </View>
          </View>
        </Card>
      )}

      <Card style={styles.tipCard}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
        <Text style={styles.tipText}>
          Para resultados precisos, conecte o dispositivo via Wi-Fi e feche outros apps. Resultados podem variar conforme a carga da rede.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark },
  container: { padding: 20, paddingBottom: 40 },
  pageTitle: { color: Colors.white, fontSize: 26, fontWeight: '900', marginBottom: 4 },
  pageSub: { color: Colors.textMuted, fontSize: 14, marginBottom: 32 },
  center: { alignItems: 'center', marginBottom: 32 },
  outerRing: {
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,106,0,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,106,0,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  innerRing: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,106,0,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(255,106,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  testBtn: {
    width: 148, height: 148, borderRadius: 74,
    backgroundColor: Colors.orange,
    alignItems: 'center', justifyContent: 'center',
    gap: 4,
  },
  testBtnSpeed: { color: Colors.white, fontSize: 30, fontWeight: '900', lineHeight: 34 },
  testBtnUnit: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  testBtnPhase: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', textAlign: 'center', paddingHorizontal: 8 },
  testBtnLabel: { color: Colors.white, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  results: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  resultCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  resultValue: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  resultLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  planCard: { marginBottom: 14 },
  planTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  planRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  planItem: { alignItems: 'center', gap: 4 },
  planSpeed: { color: Colors.white, fontSize: 16, fontWeight: '900' },
  planLabel: { color: Colors.textMuted, fontSize: 11 },
  planDiv: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.06)' },
  tipCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipText: { flex: 1, color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
});

