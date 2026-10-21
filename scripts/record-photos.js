'use strict';
/**
 * Records real Qwen answers for the sample photos into public/photos/samples.json (results.<lang>).
 * One vision call per sample, one at a time with a random 2–5 s pause between calls; it stops at the first error and never retries.
 * Needs a live pay-as-you-go DASHSCOPE_API_KEY; it refuses to run in mock mode, so a recording is never a template.
 *
 *   node scripts/record-photos.js --lang ja                 every sample (4 calls)
 *   node scripts/record-photos.js --lang en --only menu     one sample (1 call)
 */
require('../src/env').load();
const fs = require('node:fs');
const path = require('node:path');
const llm = require('../src/llm');
const { translatePhoto } = require('../src/photo');

const DIR = path.join(__dirname, '..', 'public', 'photos');
const FILE = path.join(DIR, 'samples.json');
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const lang = opt('--lang') || 'ja';
const only = new Set(String(opt('--only') || '').split(',').filter(Boolean));
const dataUrl = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(DIR, f)).toString('base64');

(async () => {
  if (!['ja', 'en', 'ko', 'zh'].includes(lang)) throw new Error('--lang must be ja, en, ko or zh');
  if (llm.mode() !== 'live') throw new Error('LLM is not live (needs a pay-as-you-go DASHSCOPE_API_KEY); nothing recorded');
  const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const todo = doc.samples.filter((s) => !only.size || only.has(s.id));
  console.log(`recording ${todo.length} sample(s) in ${lang} with ${llm.VL_MODEL}: ${todo.length} vision call(s), one at a time`);
  for (const [i, s] of todo.entries()) {
    if (i) await new Promise((ok) => setTimeout(ok, 2000 + Math.random() * 3000));
    const t0 = Date.now();
    const r = await translatePhoto({ images: s.files.map(dataUrl), lang });
    if (!r.available) throw new Error(`${s.id}: ${r.message}`);
    s.results[lang] = { ...r, recordedAt: new Date().toISOString() };
    // write after every call, so a later failure keeps what was already recorded
    fs.writeFileSync(FILE, JSON.stringify(doc, null, 2) + '\n');
    console.log(`  ${s.id}: ${((Date.now() - t0) / 1000).toFixed(1)}s, ${r.model}, kind ${r.kind}, confidence ${r.confidence}, ${r.items.length} text lines, ${r.details.length} details, tokens ${JSON.stringify(r.usage || {})}`);
    console.log(`    ${r.title} — ${r.summary}`);
  }
})().catch((e) => { console.error('stopped:', llm.redact(e && e.message ? e.message : String(e))); process.exit(1); });
