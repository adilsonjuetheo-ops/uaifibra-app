'use strict';

const express = require('express');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ─── Config ───────────────────────────────────────────────────────────────────

require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'uaifibra2024';

// ─── Database ─────────────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'painel.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS avisos (
    id          TEXT PRIMARY KEY,
    tipo        TEXT NOT NULL DEFAULT 'info',
    titulo      TEXT NOT NULL,
    mensagem    TEXT NOT NULL,
    cidades     TEXT DEFAULT '',
    exibir_de   TEXT DEFAULT '',
    exibir_ate  TEXT DEFAULT '',
    enviado_push INTEGER DEFAULT 0,
    criado_em   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS push_tokens (
    token          TEXT PRIMARY KEY,
    id_cliente     TEXT,
    cidade         TEXT,
    registrado_em  TEXT NOT NULL
  );
`);

// ─── Express ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autenticar(req, res, next) {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ erro: 'Não autorizado' });
  try {
    req.admin = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function avisoDB_para_json(a) {
  return {
    id: a.id,
    tipo: a.tipo,
    titulo: a.titulo,
    mensagem: a.mensagem,
    cidades: a.cidades
      ? a.cidades.split(',').map((c) => c.trim()).filter(Boolean)
      : [],
    exibirDe: a.exibir_de || undefined,
    exibirAte: a.exibir_ate || undefined,
    enviadoPush: !!a.enviado_push,
    criadoEm: a.criado_em,
  };
}

async function enviarPushParaTodos(titulo, mensagem, cidadesFiltro) {
  try {
    const tokens = db.prepare('SELECT token, cidade FROM push_tokens').all();

    const cidades = (cidadesFiltro || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    const destinos = tokens
      .filter((t) => {
        if (cidades.length === 0) return true;
        return cidades.some((c) => (t.cidade || '').toLowerCase().includes(c));
      })
      .map((t) => t.token);

    if (destinos.length === 0) return 0;

    // Expo Push API accepts up to 100 per batch
    let enviados = 0;
    for (let i = 0; i < destinos.length; i += 100) {
      const lote = destinos.slice(i, i + 100).map((token) => ({
        to: token,
        title: titulo,
        body: mensagem,
        data: { rota: '/avisos' },
        sound: 'notification.wav',
        priority: 'high',
        channelId: 'avisos',
      }));
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(lote),
      });
      if (resp.ok) enviados += lote.length;
    }
    return enviados;
  } catch (err) {
    console.error('[push]', err);
    return 0;
  }
}

// ─── Public routes (used by the mobile app) ───────────────────────────────────

// Announcements feed – mobile app polls this endpoint
app.get('/avisos.json', (_req, res) => {
  const avisos = db.prepare('SELECT * FROM avisos ORDER BY criado_em DESC').all();
  res.json(avisos.map(avisoDB_para_json));
});

// Register a push token from a device
app.post('/api/push/register', (req, res) => {
  const { token, idCliente, cidade } = req.body ?? {};
  if (!token) return res.status(400).json({ erro: 'token obrigatório' });

  db.prepare(`
    INSERT INTO push_tokens (token, id_cliente, cidade, registrado_em)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(token) DO UPDATE
      SET id_cliente = excluded.id_cliente,
          cidade     = excluded.cidade,
          registrado_em = excluded.registrado_em
  `).run(token, idCliente ?? null, cidade ?? null, new Date().toISOString());

  res.json({ ok: true });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { usuario, senha } = req.body ?? {};
  if (usuario !== ADMIN_USER || senha !== ADMIN_PASS) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
  }
  const token = jwt.sign({ usuario }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, usuario });
});

// ─── Admin routes (require Bearer token) ─────────────────────────────────────

app.get('/api/admin/stats', autenticar, (req, res) => {
  const dispositivos = db.prepare('SELECT COUNT(*) AS c FROM push_tokens').get().c;
  const hoje = new Date().toISOString().slice(0, 10);
  const avisosAtivos = db.prepare(`
    SELECT COUNT(*) AS c FROM avisos
    WHERE (exibir_de  = '' OR exibir_de  <= ?)
      AND (exibir_ate = '' OR exibir_ate >= ?)
  `).get(hoje, hoje).c;
  res.json({ dispositivos, avisosAtivos });
});

app.get('/api/admin/avisos', autenticar, (req, res) => {
  const avisos = db.prepare('SELECT * FROM avisos ORDER BY criado_em DESC').all();
  res.json(avisos.map(avisoDB_para_json));
});

app.post('/api/admin/avisos', autenticar, async (req, res) => {
  const { tipo, titulo, mensagem, cidades, exibirDe, exibirAte, enviarPush } = req.body ?? {};
  if (!titulo || !mensagem) {
    return res.status(400).json({ erro: 'Título e mensagem são obrigatórios' });
  }

  const id = crypto.randomUUID();
  const cidadesStr = Array.isArray(cidades)
    ? cidades.join(', ')
    : (cidades || '');

  db.prepare(`
    INSERT INTO avisos (id, tipo, titulo, mensagem, cidades, exibir_de, exibir_ate, enviado_push, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    id,
    tipo || 'info',
    titulo,
    mensagem,
    cidadesStr,
    exibirDe || '',
    exibirAte || '',
    new Date().toISOString(),
  );

  let pushEnviados = 0;
  if (enviarPush) {
    pushEnviados = await enviarPushParaTodos(titulo, mensagem, cidadesStr);
    if (pushEnviados > 0) {
      db.prepare('UPDATE avisos SET enviado_push = 1 WHERE id = ?').run(id);
    }
  }

  res.json({ ok: true, id, pushEnviados });
});

app.put('/api/admin/avisos/:id', autenticar, (req, res) => {
  const { tipo, titulo, mensagem, cidades, exibirDe, exibirAte } = req.body ?? {};
  const cidadesStr = Array.isArray(cidades)
    ? cidades.join(', ')
    : (cidades || '');

  const info = db.prepare(`
    UPDATE avisos
    SET tipo=?, titulo=?, mensagem=?, cidades=?, exibir_de=?, exibir_ate=?
    WHERE id=?
  `).run(tipo || 'info', titulo, mensagem, cidadesStr, exibirDe || '', exibirAte || '', req.params.id);

  if (info.changes === 0) return res.status(404).json({ erro: 'Aviso não encontrado' });
  res.json({ ok: true });
});

app.delete('/api/admin/avisos/:id', autenticar, (req, res) => {
  db.prepare('DELETE FROM avisos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/tokens', autenticar, (req, res) => {
  const tokens = db
    .prepare('SELECT * FROM push_tokens ORDER BY registrado_em DESC')
    .all();
  res.json(tokens);
});

app.post('/api/admin/push/enviar', autenticar, async (req, res) => {
  const { titulo, mensagem, cidades } = req.body ?? {};
  if (!titulo || !mensagem) return res.status(400).json({ erro: 'Título e mensagem obrigatórios' });
  const enviados = await enviarPushParaTodos(titulo, mensagem, cidades || '');
  res.json({ ok: true, enviados });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  UaiFibra Painel  →  http://localhost:${PORT}`);
  console.log(`  Admin: ${ADMIN_USER} / ${ADMIN_PASS}\n`);
});
