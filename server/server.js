// Servidor próprio do Linha de Fogo: repassa mensagens entre o anfitrião da sala e os convidados.
// Fala um protocolo mínimo de "canais" por WebSocket, no mesmo formato que o jogo usa com os brokers públicos:
//   cliente → servidor: {op:'sub', t:[canais]} · {op:'pub', t:canal, d:texto} · {op:'will', t:canal, d:texto}
//   servidor → cliente: {t:canal, d:texto}
// O "will" é publicado quando a conexão cai (avisa a sala que o anfitrião ou o convidado saiu).
'use strict';
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = +process.env.PORT || 8080;
const PREFIX = 'linhadefogo/';
const MAX_MSG = 64 * 1024;       // bytes por mensagem
const MAX_RATE = 400;            // mensagens por segundo por conexão
const MAX_SUBS = 16;             // canais por conexão

const topics = new Map();        // canal → Set<ws>
let conns = 0;

const server = http.createServer((req, res) => {
  // checagem de saúde (usada pela hospedagem) e informação rápida
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' });
  res.end(`Linha de Fogo: servidor no ar. Conexões: ${conns}. Salas: ${new Set([...topics.keys()].map((t) => t.split('/')[2])).size}\n`);
});

const wss = new WebSocketServer({ server, path: '/ldf', perMessageDeflate: false, maxPayload: MAX_MSG });

function unsubAll(ws) {
  for (const t of ws.subs) { const s = topics.get(t); if (s) { s.delete(ws); if (!s.size) topics.delete(t); } }
  ws.subs.clear();
}
function publish(t, d, from) {
  const s = topics.get(t); if (!s) return;
  const frame = JSON.stringify({ t, d });
  for (const ws of s) if (ws !== from && ws.readyState === 1 && ws.bufferedAmount < 512 * 1024) ws.send(frame);
}
const okTopic = (t) => typeof t === 'string' && t.length < 120 && t.startsWith(PREFIX);

wss.on('connection', (ws, req) => {
  conns++;
  try { req.socket.setNoDelay(true); } catch (e) {}
  ws.subs = new Set(); ws.will = null; ws.alive = true; ws.win = Date.now(); ws.n = 0;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', (raw) => {
    const now = Date.now();
    if (now - ws.win > 1000) { ws.win = now; ws.n = 0; }
    if (++ws.n > MAX_RATE) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.op === 'pub' && okTopic(m.t) && typeof m.d === 'string') publish(m.t, m.d, ws);
    else if (m.op === 'sub' && Array.isArray(m.t)) {
      unsubAll(ws);
      for (const t of m.t.slice(0, MAX_SUBS)) if (okTopic(t)) { ws.subs.add(t); if (!topics.has(t)) topics.set(t, new Set()); topics.get(t).add(ws); }
    } else if (m.op === 'will' && okTopic(m.t) && typeof m.d === 'string' && m.d.length < 2048) ws.will = { t: m.t, d: m.d };
  });
  ws.on('close', () => {
    conns--; unsubAll(ws);
    if (ws.will) publish(ws.will.t, ws.will.d, ws);
  });
  ws.on('error', () => {});
});

// derruba conexões mortas (o will avisa a sala)
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; try { ws.ping(); } catch (e) {} }
}, 10000);

server.listen(PORT, () => console.log(`Linha de Fogo: servidor ouvindo na porta ${PORT}`));
