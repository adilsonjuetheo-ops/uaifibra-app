'use strict';

const express = require('express');
const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');

// ─── Config ───────────────────────────────────────────────────────────────────

require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT       = process.env.PORT       || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'uaifibra2024';

if (!process.env.DATABASE_URL) {
  console.error('ERRO: variável DATABASE_URL não definida.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// ─── Schema ───────────────────────────────────────────────────────────────────

async function criarTabelas() {
  await sql`
    CREATE TABLE IF NOT EXISTS avisos (
      id           TEXT PRIMARY KEY,
      tipo         TEXT NOT NULL DEFAULT 'info',
      titulo       TEXT NOT NULL,
      mensagem     TEXT NOT NULL,
      cidades      TEXT DEFAULT '',
      exibir_de    TEXT DEFAULT '',
      exibir_ate   TEXT DEFAULT '',
      enviado_push INTEGER DEFAULT 0,
      criado_em    TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS push_tokens (
      token         TEXT PRIMARY KEY,
      id_cliente    TEXT,
      cidade        TEXT,
      registrado_em TEXT NOT NULL
    )
  `;
  console.log('  Tabelas verificadas/criadas no Neon.');
}

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
    id:          a.id,
    tipo:        a.tipo,
    titulo:      a.titulo,
    mensagem:    a.mensagem,
    cidades:     a.cidades
      ? a.cidades.split(',').map((c) => c.trim()).filter(Boolean)
      : [],
    exibirDe:    a.exibir_de  || undefined,
    exibirAte:   a.exibir_ate || undefined,
    enviadoPush: !!a.enviado_push,
    criadoEm:    a.criado_em,
  };
}

async function enviarPushParaTodos(titulo, mensagem, cidadesFiltro) {
  try {
    const tokens = await sql`SELECT token, cidade FROM push_tokens`;

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

    let enviados = 0;
    for (let i = 0; i < destinos.length; i += 100) {
      const lote = destinos.slice(i, i + 100).map((token) => ({
        to:        token,
        title:     titulo,
        body:      mensagem,
        data:      { rota: '/avisos' },
        sound:     'notification.wav',
        priority:  'high',
        channelId: 'avisos',
      }));
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          Accept:            'application/json',
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

// ─── Public routes ────────────────────────────────────────────────────────────

app.get('/avisos.json', async (_req, res) => {
  try {
    const avisos = await sql`SELECT * FROM avisos ORDER BY criado_em DESC`;
    res.json(avisos.map(avisoDB_para_json));
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.post('/api/push/register', async (req, res) => {
  const { token, idCliente, cidade } = req.body ?? {};
  if (!token) return res.status(400).json({ erro: 'token obrigatório' });
  try {
    await sql`
      INSERT INTO push_tokens (token, id_cliente, cidade, registrado_em)
      VALUES (${token}, ${idCliente ?? null}, ${cidade ?? null}, ${new Date().toISOString()})
      ON CONFLICT (token) DO UPDATE
        SET id_cliente    = EXCLUDED.id_cliente,
            cidade        = EXCLUDED.cidade,
            registrado_em = EXCLUDED.registrado_em
    `;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao registrar token' });
  }
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

// ─── Admin routes ─────────────────────────────────────────────────────────────

app.get('/api/admin/stats', autenticar, async (_req, res) => {
  try {
    const hoje = new Date().toISOString().slice(0, 10);
    const [{ c: dispositivos }] = await sql`SELECT COUNT(*) AS c FROM push_tokens`;
    const [{ c: avisosAtivos }] = await sql`
      SELECT COUNT(*) AS c FROM avisos
      WHERE (exibir_de  = '' OR exibir_de  <= ${hoje})
        AND (exibir_ate = '' OR exibir_ate >= ${hoje})
    `;
    res.json({ dispositivos, avisosAtivos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar stats' });
  }
});

app.get('/api/admin/avisos', autenticar, async (_req, res) => {
  try {
    const avisos = await sql`SELECT * FROM avisos ORDER BY criado_em DESC`;
    res.json(avisos.map(avisoDB_para_json));
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar avisos' });
  }
});

app.post('/api/admin/avisos', autenticar, async (req, res) => {
  const { tipo, titulo, mensagem, cidades, exibirDe, exibirAte, enviarPush } = req.body ?? {};
  if (!titulo || !mensagem) {
    return res.status(400).json({ erro: 'Título e mensagem são obrigatórios' });
  }
  try {
    const id = crypto.randomUUID();
    const cidadesStr = Array.isArray(cidades) ? cidades.join(', ') : (cidades || '');

    await sql`
      INSERT INTO avisos (id, tipo, titulo, mensagem, cidades, exibir_de, exibir_ate, enviado_push, criado_em)
      VALUES (
        ${id}, ${tipo || 'info'}, ${titulo}, ${mensagem},
        ${cidadesStr}, ${exibirDe || ''}, ${exibirAte || ''}, 0, ${new Date().toISOString()}
      )
    `;

    let pushEnviados = 0;
    if (enviarPush) {
      pushEnviados = await enviarPushParaTodos(titulo, mensagem, cidadesStr);
      if (pushEnviados > 0) {
        await sql`UPDATE avisos SET enviado_push = 1 WHERE id = ${id}`;
      }
    }

    res.json({ ok: true, id, pushEnviados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao publicar aviso' });
  }
});

app.put('/api/admin/avisos/:id', autenticar, async (req, res) => {
  const { tipo, titulo, mensagem, cidades, exibirDe, exibirAte } = req.body ?? {};
  const cidadesStr = Array.isArray(cidades) ? cidades.join(', ') : (cidades || '');
  try {
    const rows = await sql`
      UPDATE avisos
      SET tipo       = ${tipo || 'info'},
          titulo     = ${titulo},
          mensagem   = ${mensagem},
          cidades    = ${cidadesStr},
          exibir_de  = ${exibirDe  || ''},
          exibir_ate = ${exibirAte || ''}
      WHERE id = ${req.params.id}
      RETURNING id
    `;
    if (rows.length === 0) return res.status(404).json({ erro: 'Aviso não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar aviso' });
  }
});

app.delete('/api/admin/avisos/:id', autenticar, async (req, res) => {
  try {
    await sql`DELETE FROM avisos WHERE id = ${req.params.id}`;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir aviso' });
  }
});

app.get('/api/admin/tokens', autenticar, async (_req, res) => {
  try {
    const tokens = await sql`SELECT * FROM push_tokens ORDER BY registrado_em DESC`;
    res.json(tokens);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar tokens' });
  }
});

app.post('/api/admin/push/enviar', autenticar, async (req, res) => {
  const { titulo, mensagem, cidades } = req.body ?? {};
  if (!titulo || !mensagem) return res.status(400).json({ erro: 'Título e mensagem obrigatórios' });
  try {
    const enviados = await enviarPushParaTodos(titulo, mensagem, cidades || '');
    res.json({ ok: true, enviados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao enviar push' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

criarTabelas()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n  UaiFibra Painel  →  http://localhost:${PORT}`);
      console.log(`  Admin: ${ADMIN_USER} / ${ADMIN_PASS}\n`);
    });
  })
  .catch((err) => {
    console.error('Falha ao inicializar banco de dados:', err);
    process.exit(1);
  });
