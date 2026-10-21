'use strict';
/**
 * Offline fixtures + LLM wiring checks. Does not call a live model and never prints secrets.
 */
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DEMO = '東京から上海と杭州へ4日間の旅行をしたいです。11月7日出発、大人1人。歴史と美味しいものが好きです。';

function fail(msg) { console.error('FAIL', msg); process.exit(1); }

async function offlinePlan() {
  process.env.MOCK_LLM = '1';
  process.env.FLYAI_OFFLINE = '1';
  delete process.env.DASHSCOPE_API_KEY;
  delete process.env.DASHSCOPE_BASE_URL;
  const { ruleBased } = require('../src/intent');
  const intent = ruleBased(DEMO);
  assert.equal(intent.lang, 'ja');
  assert.equal(intent.origin, '东京');
  assert.deepEqual(intent.destinations, ['上海', '杭州']);
  assert.equal(intent.days, 4);
  assert.match(intent.startDate, /^\d{4}-11-07$/);
  const { buildPlan } = require('../src/planner');
  const plan = await buildPlan(intent);
  assert.equal(plan.days.length, 4);
  const opts = plan.days.flatMap((d) => d.stops).map((s) => s.option).filter(Boolean);
  assert.ok(opts.some((o) => o.no && /router\.feizhu\.com/.test(o.url || '')), 'expected a real flyai booking link from fixtures');
  assert.equal(plan.totals.knownSum, Math.round(plan.totals.priced.reduce((a, b) => a + b.value, 0)));
  const pricedIds = new Set(plan.totals.priced.map((p) => p.id));
  for (const m of plan.totals.masked) assert.ok(!pricedIds.has(m.id), 'masked price was summed');
  assert.ok(plan.narrative.source === 'template' || plan.narrative.source.startsWith('template'));
  assert.ok(plan.tips.some((t) => t.id === 'foreign-guest' && t.kind === 'general'));
  assert.ok(plan.tips.filter((t) => t.kind === 'official').every((t) => t.sources.length && t.checked));
  assert.ok(plan.days.some((d) => (d.stops.concat([{ cards: d.cards }])).some((s) => (s.cards || []).some((c) => /[\u4e00-\u9fff]/.test(c.zh)))));
  assert.ok(plan.days.every((d) => d.cards.some((c) => c.type === 'payment' && /\u652f\u4ed8\u5b9d/.test(c.zh) && c.gloss)), 'every day has a payment card');
  assert.ok(plan.tips.find((t) => t.id === 'payment').sources.some((s) => /gov\.cn/.test(s.url)), 'payment tip cites gov.cn');
  // hotels follow the nightly budget: "standard" is assumed when the sentence names none, and the plan says so
  assert.equal(plan.stay.budget, 'standard');
  assert.ok(plan.stay.assumed && plan.intent.assumptions.includes('budget_default'));
  assert.equal(plan.stay.cities.length, plan.intent.destinations.length);
  assert.equal(ruleBased('東京から上海へ3日間、安いホテルで').budget, 'economy');
  assert.equal(ruleBased('Beijing 4 days, luxury hotels please').budget, 'upscale');
  assert.ok(!ruleBased('Beijing 4 days, luxury hotels please').assumptions.includes('budget_default'));
  const { rankHotels, nightlyPrice } = require('../src/planner');
  assert.equal(nightlyPrice('¥5xx'), 549.5); // a masked price counts as the middle of the range it shows
  assert.equal(nightlyPrice('¥395'), 395);
  const hotelsSeen = [{ name: 'A', star: '豪华型', price: '¥1331' }, { name: 'B', star: '经济型', price: '¥311' }, { name: 'C', star: '舒适型', price: '¥471' }, { name: 'D民宿', star: '舒适型', price: '¥400' }, { name: 'E', star: '经济型', price: '¥249' }];
  assert.deepEqual(rankHotels(hotelsSeen, 'standard').map((h) => h.name), ['C', 'B', 'E', 'A']); // in budget, class it looks for, B&Bs out
  assert.equal(rankHotels(hotelsSeen, 'economy')[0].name, 'E');
  const onlyCheap = rankHotels([{ name: 'X', star: '经济型', price: '¥222' }, { name: 'Y', star: '经济型', price: '¥395' }], 'upscale');
  assert.deepEqual([onlyCheap[0].name, onlyCheap[0].inBudget], ['Y', false]); // nothing in budget: closest price, flagged
  const { translatePhoto } = require('../src/photo');
  const photo = await translatePhoto({ imageDataUrl: 'data:image/jpeg;base64,AAAA', lang: 'ja' });
  assert.equal(photo.available, false);
  assert.match(photo.message, /No translation/);
  const img = 'data:image/jpeg;base64,AAAA';
  assert.equal((await translatePhoto({ images: [img, img], lang: 'en' })).available, false, 'two photos of one subject are accepted');
  await assert.rejects(() => translatePhoto({ images: [img, img, img, img] }), /Too many images/);
  await assert.rejects(() => translatePhoto({ images: ['http://example.com/a.jpg'] }), /data URL/);
  // model output is cleaned: unknown kinds become "other", untagged points count as general knowledge,
  // alternative dish names only appear for a dish, and empty rows are dropped
  const { clean } = require('../src/photo');
  const c1 = clean({ kind: 'poster', details: [{ text: 'a' }, { text: 'b', basis: 'photo' }, { basis: 'photo' }], candidates: [{ zh: '炸糕' }], items: [{ zh: '' }, { zh: '茶托', price: 12 }] });
  assert.equal(c1.kind, 'other');
  assert.deepEqual(c1.details.map((d) => d.basis), ['general', 'photo']);
  assert.deepEqual(c1.candidates, []);
  assert.deepEqual(c1.items.map((x) => [x.zh, x.price]), [['茶托', '12']]);
  assert.equal(clean({ kind: 'dish', candidates: [{ zh: '炸糕' }] }).candidates.length, 1);
  console.log('offline plan ok', plan.days.length, 'days, known ¥' + plan.totals.knownSum);
}

async function llmGuard() {
  const llm = require('../src/llm');
  process.env.MOCK_LLM = '0';
  delete process.env.DASHSCOPE_BASE_URL;
  process.env.DASHSCOPE_API_KEY = 'sk-sp-test-not-real';
  assert.equal(llm.mode(), 'mock');
  assert.equal(llm.info().blocked, 'token-plan-key-refused');
  let called = 0;
  global.fetch = async () => { called += 1; throw new Error('fetch should not run'); };
  await assert.rejects(() => llm.chat({ model: 'qwen3.8-flash', messages: [{ role: 'user', content: 'hi' }] }));
  assert.equal(called, 0);

  process.env.DASHSCOPE_API_KEY = 'sk-test-not-a-real-key';
  process.env.DASHSCOPE_BASE_URL = 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1';
  assert.equal(llm.mode(), 'mock');
  assert.equal(llm.info().blocked, 'token-plan-endpoint-refused');
  delete process.env.DASHSCOPE_BASE_URL;

  global.fetch = async (url, opts) => {
    assert.match(String(url), /^https:\/\/dashscope\.aliyuncs\.com\/compatible-mode\/v1\/chat\/completions$/);
    assert.doesNotMatch(String(url), /token-plan|coding\.dashscope/);
    const body = JSON.parse(opts.body);
    assert.equal(body.enable_thinking, false);
    assert.equal(body.model, 'qwen3.8-flash');
    assert.ok(!String(opts.headers.Authorization).includes('sk-sp-'));
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: '{"lang":"ja","origin":"东京","destinations":["上海","火星","杭州"],"days":4,"startDate":"2026-11-07","adults":1,"interests":["历史古迹","not-a-cat"]}' } }], model: 'qwen3.8-flash' }) };
  };
  const { extract } = require('../src/intent');
  const got = await extract(DEMO, 'ja');
  assert.deepEqual(got.destinations, ['上海', '杭州']);
  assert.equal(got.origin, '东京');
  assert.ok(got.extractor.includes('Qwen'));
  assert.ok(!got.interests.includes('not-a-cat'));

  global.fetch = async () => ({ ok: false, status: 401, text: async () => 'unauthorized sk-test-not-a-real-key' });
  await assert.rejects(() => llm.chat({ model: 'qwen3.8-flash', messages: [{ role: 'user', content: 'x' }] }), (e) => {
    assert.doesNotMatch(e.message, /sk-test/);
    assert.match(e.message, /\[redacted\]/);
    return true;
  });
  delete process.env.DASHSCOPE_API_KEY;
  console.log('llm guard ok');
}

function httpOffline() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/server.js'], {
      cwd: ROOT,
      env: { ...process.env, FLYAI_OFFLINE: '1', MOCK_LLM: '1', PORT: '8791', DASHSCOPE_API_KEY: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('offline server timeout')); }, 30000);
    child.stdout.on('data', (b) => { log += b.toString(); });
    child.stderr.on('data', (b) => { log += b.toString(); });
    const ping = setInterval(async () => {
      if (!/http:\/\/localhost:8791/.test(log)) return;
      clearInterval(ping);
      try {
        const status = await (await fetch('http://127.0.0.1:8791/api/status')).json();
        assert.equal(status.llm.mode, 'mock');
        assert.equal(status.flyai.offline, true);
        const res = await fetch('http://127.0.0.1:8791/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: DEMO, lang: 'ja' }) });
        const plan = await res.json();
        assert.equal(res.status, 200);
        assert.equal(plan.days.length, 4);
        assert.equal(plan.narrative.source, 'template');
        console.log('offline http ok');
        clearTimeout(timer);
        child.kill();
        resolve();
      } catch (e) { clearTimeout(timer); child.kill(); reject(e); }
    }, 200);
    child.on('exit', (code) => { if (code && code !== 0 && code !== null) reject(new Error('server exited ' + code)); });
  });
}

async function rateLimit() {
  // Runs a temp copy of src/flyai.js so its cache and pause file land in the temp dir. A pause file in
  // the project's own .cache would block real live calls for 30 minutes.
  const fs = require('node:fs');
  const os = require('node:os');
  const cp = require('node:child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'china-ready-'));
  fs.mkdirSync(path.join(tmp, 'src'));
  const file = path.join(tmp, 'src', 'flyai.js');
  fs.copyFileSync(path.join(ROOT, 'src', 'flyai.js'), file);
  const saved = { FLYAI_OFFLINE: process.env.FLYAI_OFFLINE, FLYAI_CACHE_TTL_SEC: process.env.FLYAI_CACHE_TTL_SEC };
  delete process.env.FLYAI_OFFLINE;
  delete process.env.FLYAI_CACHE_TTL_SEC;
  const realExecFile = cp.execFile;
  const spawns = [];
  let inFlight = 0, peak = 0;
  cp.execFile = (bin, argv, opts, cb) => { // fake CLI: city "B" answers HTTP 429, the others succeed
    const call = { city: argv[argv.indexOf('--city-name') + 1], start: Date.now() };
    spawns.push(call); inFlight += 1; peak = Math.max(peak, inFlight);
    setTimeout(() => {
      inFlight -= 1; call.end = Date.now();
      if (call.city === 'B') return cb(Object.assign(new Error('Command failed: flyai search-poi\nMCP HTTP 429: \nBody: {}'), { code: 1 }), '', '');
      cb(null, JSON.stringify({ status: 0, data: { itemList: [{ name: call.city }] }, systemMessage: '' }), '');
    }, 50);
  };
  try {
    let flyai = require(file);
    const query = (city) => flyai.run('search-poi', { 'city-name': city });
    fs.mkdirSync(path.join(tmp, 'fixtures', 'flyai'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'fixtures', 'flyai', flyai.keyOf('search-poi', { 'city-name': 'C' }) + '.json'),
      JSON.stringify({ fetchedAt: '2026-10-20T00:00:00.000Z', response: { status: 0, data: { itemList: [{ name: 'C from fixture' }] }, systemMessage: '' } }));
    const t0 = Date.now();
    const [a, b, c, d] = await Promise.all(['A', 'B', 'C', 'D'].map(query));
    assert.deepEqual(spawns.map((s) => s.city), ['A', 'B'], 'a call went live after the first 429');
    assert.equal(peak, 1, 'live calls overlapped');
    const gap = spawns[1].start - spawns[0].end;
    assert.ok(gap >= 1500 && gap <= 3500, 'gap between live calls was ' + gap + 'ms');
    assert.ok(Date.now() - t0 < 4000, 'paused queries waited for a gap');
    assert.equal(a.meta.source, 'live');
    assert.equal(b.meta.source, 'paused');
    assert.equal(c.meta.source, 'fixture-fallback');
    assert.equal(c.items[0].name, 'C from fixture');
    assert.equal(d.meta.source, 'paused');
    assert.equal(flyai.pauseState().reason, 'HTTP 429');
    process.env.FLYAI_CACHE_TTL_SEC = '0'; // skip the fresh-cache read: A must come back as saved data, not live
    assert.equal((await query('A')).meta.source, 'cache-stale');
    delete require.cache[require.resolve(file)]; // a new module instance, like a second CLI run
    flyai = require(file);
    assert.equal((await query('E')).meta.source, 'paused');
    assert.equal(spawns.length, 2, 'the pause did not carry over to a new process');
    console.log(`rate limit ok: one live call at a time, ${gap}ms gap, nothing live after the first 429`);
  } finally {
    cp.execFile = realExecFile;
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function sentinelPause() {
  // Fliggy's Sentinel flow control arrives as an ordinary JSON reply with exit code 0, not as an HTTP status.
  // This replays the Sentinel reply recorded on 2026-10-20 through a temp copy of src/flyai.js: it must pause
  // live calls like a 429 does, without retrying that query or caching the reply, and the pause must reach a new process.
  const fs = require('node:fs');
  const os = require('node:os');
  const cp = require('node:child_process');
  const sentinel = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'flyai', 'search-poi_b6315526fc90.json'), 'utf8')).response;
  assert.match(sentinel.message, /^SentinelBlockException/);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'china-ready-'));
  fs.mkdirSync(path.join(tmp, 'src'));
  const file = path.join(tmp, 'src', 'flyai.js');
  fs.copyFileSync(path.join(ROOT, 'src', 'flyai.js'), file);
  const saved = { FLYAI_OFFLINE: process.env.FLYAI_OFFLINE, FLYAI_CACHE_TTL_SEC: process.env.FLYAI_CACHE_TTL_SEC };
  delete process.env.FLYAI_OFFLINE;
  delete process.env.FLYAI_CACHE_TTL_SEC;
  const realExecFile = cp.execFile;
  const spawns = [];
  cp.execFile = (bin, argv, opts, cb) => { // fake CLI: city "S" gets the recorded Sentinel reply, the others succeed
    const city = argv[argv.indexOf('--city-name') + 1];
    spawns.push(city);
    setTimeout(() => cb(null, JSON.stringify(city === 'S' ? sentinel : { status: 0, data: { itemList: [{ name: city }] }, systemMessage: '' }), ''), 20);
  };
  try {
    let flyai = require(file);
    const query = (city) => flyai.run('search-poi', { 'city-name': city });
    const [a, s, c] = await Promise.all(['A', 'S', 'C'].map(query));
    assert.deepEqual(spawns, ['A', 'S'], 'after the Sentinel reply a call went live or the query was retried');
    assert.equal(a.meta.source, 'live');
    assert.equal(s.meta.source, 'paused');
    assert.equal(c.meta.source, 'paused');
    assert.equal(flyai.pauseState().reason, 'SentinelBlockException');
    assert.ok(!fs.existsSync(path.join(tmp, '.cache', 'flyai', flyai.keyOf('search-poi', { 'city-name': 'S' }) + '.json')), 'the Sentinel reply was cached as a result');
    delete require.cache[require.resolve(file)]; // a new module instance, like a second CLI run
    flyai = require(file);
    assert.equal((await query('E')).meta.source, 'paused');
    assert.equal(spawns.length, 2, 'the Sentinel pause did not carry over to a new process');
    console.log('sentinel ok: a SentinelBlockException inside a JSON reply pauses live calls, no retry, not cached');
  } finally {
    cp.execFile = realExecFile;
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function staticBuild() {
  // the static sample builds from fixtures alone, its examples are the ones the page knows, and docs/demo is not stale
  const fs = require('node:fs');
  const os = require('node:os');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'china-ready-static-'));
  try {
    const r = require('node:child_process').spawnSync(process.execPath, ['scripts/build-static.js', '--out', out], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, 'static build failed: ' + (r.stderr || r.stdout));
    assert.match(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), /<html lang="en" data-mode="static">/);
    const appJs = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
    for (const l of ['ja', 'en', 'ko']) {
      const p = JSON.parse(fs.readFileSync(path.join(out, 'data', `plan-${l}.json`), 'utf8'));
      assert.ok(p.days.length >= 4, l + ': too few days');
      assert.ok(p.data.sources.every((s) => s.source === 'fixture'), l + ': a query was not a fixture');
      assert.equal(p.data.paused, null);
      assert.ok(appJs.includes(p.static.text), l + ': example text differs from EXAMPLES in public/app.js');
    }
    for (const f of fs.readdirSync(path.join(ROOT, 'public', 'photos'))) assert.ok(fs.existsSync(path.join(out, 'photos', f)), 'photo not copied: ' + f);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
  const demo = path.join(ROOT, 'docs', 'demo');
  if (fs.existsSync(demo)) {
    for (const f of ['app.js', 'style.css', 'icon.svg']) {
      assert.equal(fs.readFileSync(path.join(demo, f), 'utf8'), fs.readFileSync(path.join(ROOT, 'public', f), 'utf8'), `docs/demo/${f} is stale: run npm run build:static -- --ui-only`);
    }
    for (const f of fs.readdirSync(path.join(ROOT, 'public', 'photos'))) {
      assert.ok(fs.existsSync(path.join(demo, 'photos', f)) && fs.readFileSync(path.join(demo, 'photos', f)).equals(fs.readFileSync(path.join(ROOT, 'public', 'photos', f))), `docs/demo/photos/${f} is stale: run npm run build:static -- --ui-only`);
    }
  }
  // sample photos are published: no EXIF block (camera, time, location), and every sample file exists;
  // a recorded answer must be a live model answer with its recording time
  const photos = path.join(ROOT, 'public', 'photos');
  for (const f of fs.readdirSync(photos).filter((x) => x.endsWith('.jpg'))) {
    assert.ok(!fs.readFileSync(path.join(photos, f)).includes(Buffer.from('Exif\0\0', 'latin1')), f + ' still has EXIF data');
  }
  for (const x of JSON.parse(fs.readFileSync(path.join(photos, 'samples.json'), 'utf8')).samples) {
    for (const f of x.files) assert.ok(fs.existsSync(path.join(photos, f)) && fs.existsSync(path.join(photos, f.replace(/\.jpg$/, '-thumb.jpg'))), x.id + ': missing ' + f);
    for (const [l, r] of Object.entries(x.results)) assert.ok(r.mode === 'live' && r.available && r.model && r.recordedAt, `${x.id}/${l}: not a recorded live answer`);
  }
  console.log('static build ok');
}

(async () => {
  await offlinePlan();
  await httpOffline();
  await llmGuard();
  await rateLimit();
  await sentinelPause();
  staticBuild();
  console.log('selftest ok');
})().catch((e) => fail(e && e.message ? e.message : e));
