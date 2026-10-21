'use strict';
/**
 * Thin wrapper around the official Fliggy flyai CLI (@fly-ai/flyai-cli).
 * - Live mode: spawns `flyai <command> ...` and parses the JSON it prints.
 *   Without FLYAI_API_KEY the CLI runs in Fliggy "experience mode" (some prices masked, e.g. "¥8xx").
 *   With FLYAI_API_KEY in the environment the CLI uses your formal key.
 * - Offline mode (FLYAI_OFFLINE=1): replays fixtures/flyai/*.json recorded from real flyai responses.
 *   Nothing is invented.
 * - RECORD_FIXTURES=1: live calls are also written to fixtures/flyai/.
 */
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const FIXTURE_DIR = path.join(ROOT, 'fixtures', 'flyai');
const CACHE_DIR = path.join(ROOT, '.cache', 'flyai');

function redact(s) {
  return String(s || '')
    .replace(/sk-[A-Za-z0-9_-]{4,}/g, '[redacted]')
    .replace(/(Bearer\s+)\S+/gi, '$1[redacted]')
    .replace(/((?:api[_-]?key|authorization)\s*[=:]\s*)\S+/gi, '$1[redacted]');
}

function friendlyError(err, stderr) {
  const msg = redact(err && err.message);
  if (err && (err.killed || /timed out|ETIMEDOUT/i.test(msg))) return 'flyai timed out';
  if (/ENOENT/.test(msg)) return 'flyai CLI not found (run npm i)';
  if (/EINVAL/.test(msg)) return 'flyai failed to start';
  if (/HTTP 429/.test(msg)) return 'flyai rate limited (HTTP 429)';
  if (/HTTP 403/.test(msg)) return /risk control/i.test(msg) ? 'flyai blocked by Fliggy risk control (HTTP 403)' : 'flyai refused the request (HTTP 403)';
  if (/HTTP 503/.test(msg)) return 'flyai unavailable (HTTP 503)';
  if (/UND_ERR_CONNECT_TIMEOUT|Connect Timeout/i.test(msg)) return 'flyai connect timeout';
  // execFile puts the whole command line (local paths included) first; keep only what the CLI printed,
  // minus the libuv assertion the bundled CLI hits on exit under Node 24 on Windows
  const detail = msg.replace(/^Command failed:[^\n]*\n?/, '').replace(/\n?Assertion failed:[^\n]*/g, '').trim();
  return (detail || redact(stderr).slice(0, 180) || 'flyai returned non-JSON output').slice(0, 240);
}

// ---- strict rate limit ----------------------------------------------------
// Live CLI calls go out one at a time, 1.5–3 s apart (random). The first HTTP 429, 403 or 503 pauses
// live calls for 30 minutes in every process (server and CLI runs alike) via .cache/flyai/pause.json.
// While paused a query gets the last response saved for it (any age), else its recorded fixture.
const GAP_MS = [1500, 3000];
const PAUSE_MS = 30 * 60 * 1000;
const PAUSE_FILE = path.join(CACHE_DIR, 'pause.json');
const LIMIT_SIGNAL = /HTTP (429|403|503)|SentinelBlockException/; // Sentinel: Fliggy's flow control, sent inside an ordinary JSON reply
let localPause = null; // still holds if the pause file cannot be written
let lastEnd = 0;
let lane = Promise.resolve();

function pauseState() {
  let p = localPause;
  try {
    const f = JSON.parse(fs.readFileSync(PAUSE_FILE, 'utf8'));
    if (!p || Date.parse(f.until) > Date.parse(p.until)) p = f;
  } catch (_) { /* no pause file */ }
  return p && Date.parse(p.until) > Date.now() ? p : null;
}

function startPause(error) {
  localPause = { since: new Date().toISOString(), until: new Date(Date.now() + PAUSE_MS).toISOString(), reason: error.match(LIMIT_SIGNAL)[0] };
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(PAUSE_FILE, JSON.stringify(localPause));
  } catch (_) { /* best-effort, like the cache */ }
  return localPause;
}

function gate(task) {
  const turn = lane.then(async () => {
    if (!pauseState()) { // a paused query never goes out, so it does not wait for a gap
      const wait = lastEnd + GAP_MS[0] + Math.random() * (GAP_MS[1] - GAP_MS[0]) - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    return task();
  });
  lane = turn.catch(() => {});
  return turn;
}

function saved(id, meta, paused) {
  const tries = [[path.join(CACHE_DIR, id + '.json'), 'cache-stale'], [path.join(FIXTURE_DIR, id + '.json'), 'fixture-fallback']];
  for (const [file, source] of tries) {
    try {
      const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
      return normalize(rec.response, { ...meta, source, fetchedAt: rec.fetchedAt });
    } catch (_) { /* try the next one */ }
  }
  const until = new Date(paused.until).toTimeString().slice(0, 5);
  return { ok: false, meta: { ...meta, source: 'paused' }, error: `flyai live search paused until ${until} after ${paused.reason}; nothing saved for this query`, items: [] };
}

// Invoke the bundled CLI with node. On Windows, spawning flyai.cmd via execFile throws EINVAL.
function resolveCommand() {
  const bundle = path.join(ROOT, 'node_modules', '@fly-ai', 'flyai-cli', 'dist', 'flyai-bundle.cjs');
  if (fs.existsSync(bundle)) return { file: process.execPath, prefix: [bundle] };
  return { file: 'flyai', prefix: [] };
}

function keyOf(command, args) {
  const norm = JSON.stringify([command, Object.keys(args).sort().map((k) => [k, String(args[k])])]);
  return command + '_' + crypto.createHash('sha1').update(norm).digest('hex').slice(0, 12);
}

function toArgv(command, args) {
  const argv = [command];
  for (const [k, v] of Object.entries(args)) {
    if (v === undefined || v === null || v === '') continue;
    argv.push('--' + k, String(v));
  }
  return argv;
}

function childEnv() {
  const env = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === 'string' && v.startsWith('sk-sp-')) delete env[k];
  }
  return env;
}

function runOnce(command, args = {}, { timeoutMs = 90000, bypassCache = false } = {}) {
  const id = keyOf(command, args);
  const meta = { command, args, id, source: 'live', fetchedAt: new Date().toISOString() };

  if (process.env.FLYAI_OFFLINE === '1') {
    const f = path.join(FIXTURE_DIR, id + '.json');
    if (!fs.existsSync(f)) {
      return Promise.resolve({ ok: false, meta: { ...meta, source: 'fixture-missing' }, error: 'No recorded fixture for this query (offline mode).', items: [] });
    }
    const rec = JSON.parse(fs.readFileSync(f, 'utf8'));
    return Promise.resolve(normalize(rec.response, { ...meta, source: 'fixture', fetchedAt: rec.fetchedAt }));
  }

  // short-lived cache so repeated demo runs don't hammer the API
  const cacheFile = path.join(CACHE_DIR, id + '.json');
  const ttl = Number(process.env.FLYAI_CACHE_TTL_SEC || 1800) * 1000;
  if (!bypassCache && ttl > 0 && fs.existsSync(cacheFile) && Date.now() - fs.statSync(cacheFile).mtimeMs < ttl) {
    const rec = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    return Promise.resolve(normalize(rec.response, { ...meta, source: 'cache', fetchedAt: rec.fetchedAt }));
  }

  return gate(() => {
    const paused = pauseState();
    if (paused) return saved(id, meta, paused);
    return live(command, args, id, meta, cacheFile, timeoutMs)
      .then((r) => (r.ok || !LIMIT_SIGNAL.test(r.error || '') ? r : saved(id, meta, startPause(r.error))));
  });
}

function live(command, args, id, meta, cacheFile, timeoutMs) {
  return new Promise((resolve) => {
    meta.fetchedAt = new Date().toISOString(); // when the query actually left the queue
    const env = childEnv();
    const spec = resolveCommand();
    try {
      execFile(spec.file, [...spec.prefix, ...toArgv(command, args)], { env, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
        lastEnd = Date.now();
        let response = null;
        try {
          const s = String(stdout || '').trim();
          const i = s.indexOf('{');
          response = i >= 0 ? JSON.parse(s.slice(i)) : null;
        } catch (_) { /* fallthrough */ }
        if (!response) return resolve({ ok: false, meta, error: friendlyError(err, stderr), items: [] });
        const rec = { fetchedAt: meta.fetchedAt, command, args, response };
        try {
          if (response.status === 0) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
            fs.writeFileSync(cacheFile, JSON.stringify(rec));
          }
          if (process.env.RECORD_FIXTURES === '1') {
            fs.mkdirSync(FIXTURE_DIR, { recursive: true });
            fs.writeFileSync(path.join(FIXTURE_DIR, id + '.json'), JSON.stringify(rec, null, 1));
          }
        } catch (_) { /* cache is best-effort */ }
        resolve(normalize(response, meta));
      });
    } catch (err) {
      lastEnd = Date.now();
      resolve({ ok: false, meta, error: friendlyError(err, ''), items: [] });
    }
  });
}

function run(command, args = {}, opts = {}) {
  return runOnce(command, args, opts).then(async (first) => {
    // fixtures, cache and paused fallbacks are final; a live call that failed or came back empty gets one more try
    if (!first.meta || first.meta.source !== 'live') return first;
    if (first.ok && first.items && first.items.length) return first;
    const second = await runOnce(command, args, { ...opts, bypassCache: true }); // queues for its own random gap
    if (second.ok && second.items && second.items.length) return second;
    return second.ok ? second : first;
  });
}

function normalize(response, meta) {
  const items = (response && response.data && response.data.itemList) || [];
  const sys = (response && response.systemMessage) || '';
  const ok = Boolean(response && response.status === 0);
  return {
    ok,
    meta,
    items,
    message: response && response.message,
    systemMessage: sys,
    experienceMode: /体验模式/.test(sys),
    error: ok ? undefined : (redact(response && response.message).slice(0, 200) || 'flyai query failed'),
    raw: response && typeof response.data === 'string' ? response.data : undefined,
  };
}

// ---- typed helpers -------------------------------------------------------
const searchFlight = (o) => run('search-flight', { origin: o.origin, destination: o.destination, 'dep-date': o.date, 'sort-type': o.sortType || 3 });
const searchTrain = (o) => run('search-train', { origin: o.origin, destination: o.destination, 'dep-date': o.date, 'dep-hour-start': o.hourStart, 'dep-hour-end': o.hourEnd, 'sort-type': o.sortType });
const searchHotel = (o) => run('search-hotel', {
  'dest-name': o.city, 'poi-name': o.poi, 'hotel-types': o.types,
  'check-in-date': o.checkIn, 'check-out-date': o.checkOut, sort: o.sort,
});
const searchPoi = (o) => run('search-poi', { 'city-name': o.city, category: o.category, keyword: o.keyword, 'poi-level': o.level });

module.exports = { run, searchFlight, searchTrain, searchHotel, searchPoi, keyOf, pauseState, FIXTURE_DIR };
