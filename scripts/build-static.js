'use strict';
/**
 * Builds the static sample site: the web UI, the sample photos, plus a recorded plan for each of the three examples.
 * It never calls Fliggy or Qwen (child_process.execFile is replaced before anything loads; plans it builds itself use
 * template narrative).
 *
 *   node scripts/build-static.js                         plans from fixtures/flyai (recorded flyai responses)
 *   node scripts/build-static.js --cache ja              the ja plan from .cache/flyai instead (any age), e.g. a formal-key run
 *   node scripts/build-static.js --plan ja=run-ja.json   embed a plan JSON saved from a real app run (e.g. with live Qwen) as is
 *   node scripts/build-static.js --ui-only               refresh the UI files and photos, keep data/ as it is
 *   --out <dir>                                          write somewhere other than docs/demo
 *
 * Every query of a plan it builds must come from the chosen store (fixture or cache). An embedded run may only use
 * Fliggy responses: live, cached, or the recorded fixtures of an offline run; never the fallback after a failed live
 * call. Otherwise the build stops.
 */
const cp = require('node:child_process');
cp.execFile = function refused(file, args, opts, cb) {
  const done = typeof opts === 'function' ? opts : cb;
  process.nextTick(() => done(new Error('the static build never calls flyai'), '', ''));
  return { kill() {}, on() { return this; } };
};
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const OUT = path.resolve(opt('--out') || path.join(ROOT, 'docs', 'demo'));
const FROM_CACHE = new Set(String(opt('--cache') || '').split(',').filter(Boolean));
const UI_ONLY = argv.includes('--ui-only');
// --plan ja=a.json,ko=b.json
const RECORDED = Object.fromEntries(String(opt('--plan') || '').split(',').filter(Boolean).map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i), kv.slice(i + 1)]; }));

// must match EXAMPLES in public/app.js word for word: the static page finds a plan by its example text
const EXAMPLES = [
  { lang: 'ja', text: '東京から上海と杭州へ4日間の旅行をしたいです。11月7日出発、大人1人。歴史と美味しいものが好きです。' },
  { lang: 'en', text: "From Seoul to Beijing and Xi'an, 5 days from Dec 3, 2 adults, we love history and food." },
  { lang: 'ko', text: '서울에서 상하이 3박4일, 11월 14일 출발, 성인 1명. 야경이랑 맛집 좋아해요.' },
];

function copyUi() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of ['app.js', 'style.css', 'icon.svg']) fs.copyFileSync(path.join(ROOT, 'public', f), path.join(OUT, f));
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8').replace('<html lang="en">', '<html lang="en" data-mode="static">');
  if (!html.includes('data-mode="static"')) throw new Error('could not mark index.html as static');
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  const photos = path.join(ROOT, 'public', 'photos');
  fs.mkdirSync(path.join(OUT, 'photos'), { recursive: true });
  for (const f of fs.readdirSync(photos)) fs.copyFileSync(path.join(photos, f), path.join(OUT, 'photos', f));
}

const firstFetch = (plan) => plan.data.sources.map((s) => s.fetchedAt).filter(Boolean).sort()[0];
function save(ex, plan) {
  const json = JSON.stringify(plan);
  if (/sk-[A-Za-z0-9_-]{8,}/.test(json)) throw new Error(`${ex.lang}: the plan contains something that looks like an API key`);
  fs.writeFileSync(path.join(OUT, 'data', `plan-${ex.lang}.json`), json);
}

// a plan saved from a real run of the app, embedded as is; only the runtime pause state is dropped
function embed(ex, file, ruleBased) {
  const plan = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const rb = ruleBased(ex.text, ex.lang);
  if (plan.lang !== ex.lang || plan.intent.origin !== rb.origin || JSON.stringify(plan.intent.destinations) !== JSON.stringify(rb.destinations)) {
    throw new Error(`${ex.lang}: ${file} is not a run of this example (lang ${plan.lang}, ${plan.intent.origin} → ${plan.intent.destinations})`);
  }
  const bad = plan.data.sources.filter((s) => !['live', 'cache', 'cache-stale', 'fixture'].includes(s.source));
  if (bad.length) throw new Error(`${ex.lang}: ${bad.length} queries did not come from Fliggy: ` + bad.map((s) => `${s.command} ${s.source}`).join('; '));
  const by = {};
  for (const s of plan.data.sources) by[s.source] = (by[s.source] || 0) + 1;
  plan.data.paused = null;
  plan.static = { recordedAt: firstFetch(plan), from: 'run', ranAt: plan.createdAt, text: ex.text };
  save(ex, plan);
  console.log(`  ${ex.lang}: embedded run of ${plan.createdAt}: ${plan.days.length} days, known ¥${plan.totals.knownSum}, ${plan.data.errors.length} flyai errors, queries ${JSON.stringify(by)}, narrative ${plan.narrative.source}, intent ${plan.intent.extractor}`);
}

async function buildPlans() {
  process.env.MOCK_LLM = '1';
  delete process.env.DASHSCOPE_API_KEY;
  const { ruleBased } = require('../src/intent');
  const { buildPlan } = require('../src/planner');
  fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
  for (const ex of EXAMPLES) {
    if (RECORDED[ex.lang]) { embed(ex, RECORDED[ex.lang], ruleBased); continue; }
    const cache = FROM_CACHE.has(ex.lang);
    if (cache) { delete process.env.FLYAI_OFFLINE; process.env.FLYAI_CACHE_TTL_SEC = String(10 * 365 * 86400); }
    else { process.env.FLYAI_OFFLINE = '1'; delete process.env.FLYAI_CACHE_TTL_SEC; }
    const plan = await buildPlan(ruleBased(ex.text, ex.lang));
    const store = cache ? 'cache' : 'fixture';
    const off = plan.data.sources.filter((s) => s.source !== store);
    if (off.length) throw new Error(`${ex.lang}: ${off.length} queries were not in the ${store}: ` + off.map((s) => `${s.command} ${JSON.stringify(s.args)}`).join('; '));
    plan.data.paused = null; // a runtime state, not part of the recording
    plan.static = { recordedAt: firstFetch(plan), from: store, text: ex.text };
    save(ex, plan);
    console.log(`  ${ex.lang}: ${plan.days.length} days, known ¥${plan.totals.knownSum}, ${plan.totals.masked.length} masked, ${plan.data.errors.length} flyai errors, from ${store}, recorded ${plan.static.recordedAt}`);
  }
}

(async () => {
  copyUi();
  if (!UI_ONLY) await buildPlans();
  console.log(`static sample written to ${path.relative(ROOT, OUT) || OUT}${UI_ONLY ? ' (UI only)' : ''}`);
})().catch((e) => { console.error('build failed:', e.message); process.exit(1); });
