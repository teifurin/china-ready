#!/usr/bin/env node
'use strict';
require('./env').load();
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { extract, BUDGET_NAMES } = require('./intent');
const { buildPlan } = require('./planner');
const { translatePhoto } = require('./photo');
const llm = require('./llm');
const flyai = require('./flyai');

const PUB = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 8787);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };

function redact(s) { return llm.redact(s).slice(0, 300); }
function sse(res, event, data) {
  if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); }
function body(req, limit = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('Body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(e); } });
  });
}

function status() {
  return {
    llm: llm.info(),
    flyai: { offline: process.env.FLYAI_OFFLINE === '1', apiKey: Boolean(process.env.FLYAI_API_KEY), note: process.env.FLYAI_API_KEY ? 'formal key' : 'experience mode (no key): some prices masked', paused: flyai.pauseState() },
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, status());
    if (req.method === 'POST' && url.pathname === '/api/plan') {
      const b = await body(req);
      const text = String(b.text || '').slice(0, 2000);
      if (!text.trim()) return send(res, 400, { error: 'text is required' });
      const intent = await extract(text, ['ja', 'en', 'ko', 'zh'].includes(b.lang) ? b.lang : undefined);
      if (b.startDate && /^\d{4}-\d{2}-\d{2}$/.test(b.startDate)) intent.startDate = b.startDate;
      // a budget picked on the page beats one read from the sentence, and is no longer an assumption
      if (BUDGET_NAMES.includes(b.budget)) { intent.budget = b.budget; intent.assumptions = (intent.assumptions || []).filter((a) => a !== 'budget_default'); }
      if (b.stream) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        try {
          const t0 = Date.now();
          const plan = await buildPlan(intent, { onProgress: (p) => sse(res, 'progress', p) });
          plan.elapsedMs = Date.now() - t0;
          sse(res, 'result', plan);
        } catch (e) {
          sse(res, 'error', { error: redact(e.message) });
        }
        return res.end();
      }
      const t0 = Date.now();
      const plan = await buildPlan(intent);
      plan.elapsedMs = Date.now() - t0;
      return send(res, 200, plan);
    }
    if (req.method === 'POST' && url.pathname === '/api/photo') {
      const b = await body(req);
      try {
        return send(res, 200, await translatePhoto({ images: b.images, imageDataUrl: b.imageDataUrl, lang: b.lang }));
      } catch (e) {
        // bad input is the caller's error; model and network failures stay 500
        if (/data URL|Too many images|too large|Send 1/.test(e.message)) return send(res, 400, { error: redact(e.message) });
        throw e;
      }
    }
    if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
    let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    if (!p || p.endsWith('/')) p += 'index.html';
    const file = path.join(PUB, p);
    if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    if (!res.headersSent) send(res, 500, { error: redact(e.message) });
    else if (!res.writableEnded) res.end();
  }
});

server.listen(PORT, () => {
  const s = status();
  console.log(`China Ready · 入境中国随身通  http://localhost:${PORT}`);
  const why = s.llm.blocked ? ` — ${s.llm.blocked}, not calling the model` : '';
  console.log(`  LLM: ${s.llm.mode.toUpperCase()} (${s.llm.textModel} / ${s.llm.vlModel}) via ${s.llm.baseUrl}${why}`);
  console.log(`  flyai: ${s.flyai.offline ? 'OFFLINE fixtures' : 'live'}; ${s.flyai.note}`);
  if (s.flyai.paused && !s.flyai.offline) console.log(`  flyai live calls paused until ${s.flyai.paused.until} after ${s.flyai.paused.reason}`);
});
