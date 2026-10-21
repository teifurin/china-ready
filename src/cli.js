#!/usr/bin/env node
'use strict';
require('./env').load();
const fs = require('node:fs');
const path = require('node:path');
const { extract, BUDGET_NAMES } = require('./intent');
const { buildPlan } = require('./planner');
const { translatePhoto } = require('./photo');
const llm = require('./llm');

const DEMO = '東京から上海と杭州へ4日間の旅行をしたいです。11月7日出発、大人1人。歴史と美味しいものが好きです。';
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args.splice(i, 2)[1] : (args.splice(i, 1), true)) : undefined; };

async function main() {
  const lang = flag('--lang'); const asJson = flag('--json'); const out = flag('--out'); const photo = flag('--photo'); const demo = flag('--demo'); const budget = flag('--budget');
  if (flag('--help') || (!args.length && !demo && !photo)) {
    console.log(`China Ready CLI
  node src/cli.js "<trip request in ja/en/ko/zh>" [--lang ja|en|ko|zh] [--budget economy|standard|upscale] [--json] [--out plan.json]
  node src/cli.js --demo                      # 東京→上海→杭州 4日間 (Japanese demo)
  node src/cli.js --photo menu.jpg --lang ja  # photo help (needs DASHSCOPE_API_KEY)
  node src/cli.js --photo exhibit.jpg,label.jpg --lang ja  # up to 3 photos of the same subject
Env: DASHSCOPE_API_KEY (百炼 pay-as-you-go key), FLYAI_API_KEY (optional), MOCK_LLM=1, FLYAI_OFFLINE=1`);
    return;
  }
  if (photo) {
    const images = String(photo).split(',').map((p) => `data:image/${path.extname(p).slice(1).toLowerCase().replace('jpg', 'jpeg')};base64,` + fs.readFileSync(p).toString('base64'));
    const r = await translatePhoto({ images, lang: lang || 'en' });
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  const text = demo ? DEMO : args.join(' ');
  const info = llm.info();
  console.error(`[LLM ${info.mode}] [flyai ${process.env.FLYAI_OFFLINE === '1' ? 'offline fixtures' : 'live'}${process.env.FLYAI_API_KEY ? ', key' : ', experience mode'}]`);
  const intent = await extract(text, lang);
  if (budget !== undefined) {
    if (!BUDGET_NAMES.includes(budget)) throw new Error('--budget must be economy, standard or upscale');
    intent.budget = budget; intent.assumptions = intent.assumptions.filter((a) => a !== 'budget_default');
  }
  console.error('intent:', JSON.stringify(intent));
  const plan = await buildPlan(intent, { onProgress: (p) => {
    if (!p.state || p.state === 'start') console.error('  · flyai', p.step);
    else if (p.state === 'error') console.error('  ! flyai', p.step, p.error || '');
  } });
  if (out) fs.writeFileSync(out, JSON.stringify(plan, null, 2));
  if (asJson) return console.log(JSON.stringify(plan, null, 2));
  print(plan);
}

function price(o) { return o.price == null ? '—' : (o.priceMasked ? `¥${String(o.price).replace(/^¥/, '')} (masked in experience mode)` : `¥${String(o.price).replace(/^¥/, '')}`); }
function print(plan) {
  const n = plan.narrative;
  console.log(`\n# ${n.title}   [narrative: ${n.source}]\n${n.overview}\n`);
  if (plan.stay) console.log(`Hotel budget: ${plan.stay.budget}${plan.stay.assumed ? ' (assumed, none given)' : ''} — ${plan.stay.cities.map((c) => `${c.city} ${c.price ?? '—'}${c.inBudget ? '' : ' (none in budget: closest price)'}`).join(', ')}\n`);
  for (const d of plan.days) {
    const h = n.days.find((x) => x.index === d.index);
    console.log(`## Day ${d.index} · ${d.date} · ${h ? h.headline : d.city}`);
    if (h && h.tip) console.log(`   ${h.tip}`);
    for (const s of d.stops) {
      const o = s.option;
      if (s.type === 'note') { console.log(s.noteKey === 'returnUnavailable' ? `   ! No return flight from ${s.city}; no connection to another departure city is verified. Adjust the route or dates.` : `   ! return flight departs from ${s.city}`); continue; }
      if (!o) { console.log(`   - ${s.type}: no flyai result`); continue; }
      if (s.type === 'flight' || s.type === 'train') console.log(`   - ${s.type === 'flight' ? '✈' : '🚄'} ${o.no} ${o.from} ${o.depTime} → ${o.to} ${o.arrTime}  ${price(o)}  ${o.url || ''}`);
      if (s.type === 'hotel') console.log(`   - 🏨 ${o.name} (${o.star || ''}) ${s.checkIn}~${s.checkOut}  ${price(o)}  ${o.url || ''}`);
      if (s.type === 'poi') console.log(`   - 📍 ${(n.names[s.id] && n.names[s.id].name) || o.name} [${o.category || ''}] ${o.free ? 'free' : price(o)}  ${o.url || ''}`);
      for (const c of s.cards || []) console.log(`       [${c.title}] ${c.zh.replace(/\n/g, ' / ')}`);
    }
  }
  const t = plan.totals;
  console.log(`\nKnown prices (real numbers only): ¥${t.knownSum} — transport and tickets for ${t.travellers} traveller(s), hotels per night × nights, one room. Masked in experience mode: ${t.masked.map((m) => m.label).join(', ') || 'none'}`);
  for (const p of t.priced.filter((x) => x.value)) console.log(`   ${p.label}: ¥${p.unit} × ${p.qty}${p.type === 'hotel' ? ' night(s)' : ''} = ¥${Math.round(p.value)}`);
  if (plan.data.errors && plan.data.errors.length) console.log('\nflyai warnings: ' + plan.data.errors.map((e) => `${e.command}: ${e.error}`).join('; '));
  if (plan.data.paused) console.log(`\nflyai live search paused until ${plan.data.paused.until} after ${plan.data.paused.reason}. Results above come from saved data where it exists.`);
  else if (plan.data.fallback) console.log('\nSome results above are saved data from an earlier flyai search (see fetchedAt with --json).');
  if (plan.data.systemMessage) console.log('\n' + plan.data.systemMessage.replace(/\*/g, ''));
  console.log('\nBased on fly.ai real-time results.');
}

main().catch((e) => { console.error(llm.redact(e && e.message ? e.message : e)); process.exit(1); });
