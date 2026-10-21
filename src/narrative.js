'use strict';
/**
 * Narrative layer (titles, day headlines, short tips, translated place names).
 * live: Qwen writes it in the user's language, may ONLY reference stop ids we pass; output is validated.
 * mock: fixed templates (labelled "template" in the UI). No travel facts are generated here.
 */
const llm = require('./llm');
const { byZh } = require('./cities');

const CITY = { // display names per language for common cities (fallback: Chinese)
  ja: { 东京: '東京', 大阪: '大阪', 上海: '上海', 杭州: '杭州', 北京: '北京', 西安: '西安', 成都: '成都', 首尔: 'ソウル', 苏州: '蘇州', 南京: '南京', 广州: '広州', 深圳: '深セン', 重庆: '重慶' },
  en: { 东京: 'Tokyo', 大阪: 'Osaka', 上海: 'Shanghai', 杭州: 'Hangzhou', 北京: 'Beijing', 西安: "Xi'an", 成都: 'Chengdu', 首尔: 'Seoul', 苏州: 'Suzhou', 南京: 'Nanjing', 广州: 'Guangzhou', 深圳: 'Shenzhen', 重庆: 'Chongqing' },
  ko: { 东京: '도쿄', 大阪: '오사카', 上海: '상하이', 杭州: '항저우', 北京: '베이징', 西安: '시안', 成都: '청두', 首尔: '서울', 苏州: '쑤저우', 南京: '난징', 广州: '광저우', 深圳: '선전', 重庆: '충칭' },
};
function cityName(zh, lang) {
  if (lang === 'zh') return zh;
  const m = CITY[lang] && CITY[lang][zh];
  if (m) return m;
  const c = byZh(zh);
  return c ? (lang === 'en' ? c.aliases.find((a) => /^[a-z' ]+$/.test(a)) || zh : zh) : zh;
}

const TPL = {
  title: { en: (o, c, n) => `${o} → ${c} · ${n} days`, ja: (o, c, n) => `${o} → ${c} ${n}日間`, ko: (o, c, n) => `${o} → ${c} ${n}일`, zh: (o, c, n) => `${o} → ${c} · ${n}天` },
  arrive: { en: (c) => `Arrive in ${c}`, ja: (c) => `${c}に到着`, ko: (c) => `${c} 도착`, zh: (c) => `抵达${c}` },
  explore: { en: (c) => `Explore ${c}`, ja: (c) => `${c}を巡る`, ko: (c) => `${c} 둘러보기`, zh: (c) => `畅游${c}` },
  move: { en: (c) => `High-speed rail to ${c}`, ja: (c) => `高速鉄道で${c}へ`, ko: (c) => `고속철도로 ${c}`, zh: (c) => `乘高铁前往${c}` },
  depart: { en: (c) => `Fly home from ${c}`, ja: (c) => `${c}から帰国`, ko: (c) => `${c}에서 귀국`, zh: (c) => `从${c}返程` },
  overview: {
    en: () => 'Every flight, train, hotel and attraction below is a real Fliggy (flyai) result with its booking link. Tap a card to show the Chinese text to staff.',
    ja: () => '下記の航空券・列車・ホテル・観光地はすべて飛猪（flyai）の実データで、予約リンク付き。カードをタップすると、スタッフに見せる中国語が大きく表示されます。',
    ko: () => '아래 항공·기차·호텔·관광지는 모두 Fliggy(flyai) 실데이터이며 예약 링크가 있습니다. 카드를 누르면 직원에게 보여 줄 중국어가 크게 표시됩니다.',
    zh: () => '以下航班、火车、酒店、景点均为飞猪 flyai 实时结果，附预订链接。点击卡片可全屏展示给工作人员看的中文。',
  },
};
const pick = (k, lang) => TPL[k][lang] || TPL[k].en;

function template(plan) {
  const L = ['en', 'ja', 'ko', 'zh'].includes(plan.lang) ? plan.lang : 'en';
  const o = cityName(plan.intent.origin, L);
  const cs = plan.intent.destinations.map((c) => cityName(c, L)).join(' → ');
  return {
    source: 'template',
    title: pick('title', L)(o, cs, plan.intent.days),
    overview: pick('overview', L)(),
    days: plan.days.map((d) => ({ index: d.index, headline: pick(d.kind, L)(cityName(d.city, L)), tip: null })),
    names: {},
  };
}

async function write(plan) {
  const base = template(plan);
  if (llm.mode() !== 'live') return base;
  const compact = plan.days.map((d) => ({
    index: d.index, date: d.date, city: d.city, kind: d.kind,
    stops: d.stops.filter((s) => s.option).map((s) => ({ id: s.id, type: s.type, name: s.option.name || s.option.no, category: s.option.category, desc: s.option.description, time: s.option.depTime })),
  }));
  const prompt = `You are a careful travel writer for foreign visitors to China. Write in language "${plan.lang}".
Use ONLY the places in the JSON below; never add places, prices, opening hours or policies.
Tips may name only places listed in the JSON; do not mention any other street, district, restaurant or sight, even nearby ones.
Return JSON: {"title": string, "overview": string (<=60 words), "days": [{"index": n, "headline": string (<=8 words), "tip": string (<=30 words, practical pacing/ordering advice based only on the listed stops)}],
"names": {"<stop id>": {"name": "place name translated/transliterated for the reader", "blurb": "<=25 words based only on desc"}}}.
Traveller interests: ${(plan.intent.interests || []).join(', ') || 'none given'}.
JSON: ${JSON.stringify(compact).slice(0, 12000)}`;
  try {
    const { content, model } = await llm.chat({ model: llm.TEXT_MODEL, messages: [{ role: 'user', content: prompt }], timeoutMs: 150000 });
    const ids = new Set(plan.days.flatMap((d) => d.stops.map((s) => s.id)));
    const names = {};
    for (const [k, v] of Object.entries(content.names || {})) if (ids.has(k) && v && typeof v.name === 'string') names[k] = { name: v.name.slice(0, 80), blurb: String(v.blurb || '').slice(0, 200) };
    const days = base.days.map((d) => {
      const g = (content.days || []).find((x) => x.index === d.index) || {};
      return { index: d.index, headline: typeof g.headline === 'string' ? g.headline.slice(0, 80) : d.headline, tip: typeof g.tip === 'string' ? g.tip.slice(0, 240) : null };
    });
    return { source: `Qwen (${model})`, title: String(content.title || base.title).slice(0, 100), overview: String(content.overview || base.overview).slice(0, 500), days, names };
  } catch (e) {
    return { ...base, source: 'template (LLM error: ' + llm.redact(e.message).slice(0, 120) + ')' };
  }
}

module.exports = { write, cityName };
