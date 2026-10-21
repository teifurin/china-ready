'use strict';
/**
 * Intent extraction: free text in ja/en/ko/zh -> structured trip request.
 * live: Qwen (百炼) extracts JSON; result is validated against our city list.
 * mock: deterministic rule-based parser (no LLM) — clearly labeled in the response.
 */
const { findCities, byZh } = require('./cities');
const llm = require('./llm');

// `hint` tells the model what each flyai category covers, so it maps interests the way the rule parser does
const CATEGORY_HINTS = [
  { cat: '历史古迹', hint: 'history, historic sites', re: /歴史|history|historic|역사|历史|古迹|史跡/i },
  { cat: '博物馆', hint: 'museums, art', re: /博物館|博物馆|museum|박물관|美術館|美术馆|art/i },
  { cat: '园林花园', hint: 'gardens', re: /庭園|园林|garden|정원|花园/i },
  { cat: '山湖田园', hint: 'nature, lakes, scenery', re: /自然|nature|lake|湖|자연|景色|scenery/i },
  { cat: '宗教场所', hint: 'temples', re: /寺|temple|절|사찰|寺庙|寺院/i },
  { cat: '古镇古村', hint: 'old towns, water towns', re: /古い町|古镇|水郷|水乡|old town|water town|옛 마을|고진/i },
  { cat: '城市观光', hint: 'city sights, night views, city walks', re: /夜景|night view|야경|街歩き|city walk|观光|sightseeing/i },
  { cat: '市集', hint: 'food, local snacks, markets', re: /グルメ|美味|食べ|food|eat|맛집|음식|美食|小吃|市場|market|시장/i },
];

// nightly hotel budget named in the sentence; the bands themselves live in planner.js (BUDGETS)
const BUDGET_HINTS = [
  { budget: 'economy', re: /安い|安く|格安|節約|リーズナブル|\bbudget\b|cheap|affordable|inexpensive|저렴|가성비|싸게|便宜|省钱|穷游|实惠/i },
  { budget: 'upscale', re: /高級|ラグジュアリー|贅沢|luxury|luxurious|upscale|high-end|five-star|5-star|고급|럭셔리|호캉스|豪华|高档|奢华|五星/i },
  { budget: 'standard', re: /スタンダード|中級|mid-range|midrange|moderate|중급|中档|中等/i },
];
const BUDGET_NAMES = ['economy', 'standard', 'upscale'];

function detectLang(text) {
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  return 'en';
}

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return fmt(d); }

const NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const EN_MONTH = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function parseDate(text, today = new Date()) {
  let m = text.match(/(20\d\d)[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  let mo, da;
  if ((m = text.match(/(\d{1,2})\s*(?:月|월)\s*(\d{1,2})\s*(?:日|号|號|일)?/))) { mo = +m[1]; da = +m[2]; }
  else if ((m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})/i))) { mo = EN_MONTH[m[1].toLowerCase()]; da = +m[2]; }
  else if ((m = text.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i))) { mo = EN_MONTH[m[2].toLowerCase()]; da = +m[1]; }
  else if ((m = text.match(/\b(\d{1,2})\/(\d{1,2})\b/))) { mo = +m[1]; da = +m[2]; }
  if (!mo) return null;
  let y = today.getFullYear();
  const cand = new Date(y, mo - 1, da);
  if (cand < new Date(today.getFullYear(), today.getMonth(), today.getDate())) y += 1;
  return `${y}-${pad(mo)}-${pad(da)}`;
}

function parseDays(text) {
  let m = text.match(/(\d{1,2})\s*(?:日間|日间|天|日|days?|일|박)/i);
  if (m) {
    const n = +m[1];
    // "3박4일" style: prefer the 일 number
    const k = text.match(/(\d{1,2})\s*박\s*(\d{1,2})\s*일/);
    return k ? +k[2] : n;
  }
  m = text.match(/([一二两三四五六七八九十])\s*(?:日間|天|日)/);
  if (m) return NUM[m[1]];
  m = text.match(/(\d{1,2})\s*(?:泊|晚|nights?)/i);
  if (m) return +m[1] + 1;
  return null;
}

function parseAdults(text) {
  let m = text.match(/(?:大人|成人|adults?|어른|성인)\s*(\d{1,2})|(\d{1,2})\s*(?:人|名|people|persons?|adults?|명)/i);
  if (m) return +(m[1] || m[2]);
  if (/ひとり|一人|solo|혼자|alone/i.test(text)) return 1;
  if (/ふたり|二人|两个人|couple|둘이|두 명/i.test(text)) return 2;
  return 1;
}

function ruleBased(text, langHint) {
  const lang = langHint || detectLang(text);
  const cities = findCities(text);
  const abroad = cities.filter((c) => !c.cn);
  const china = cities.filter((c) => c.cn);
  const assumptions = [];
  let origin = abroad[0]?.zh || null;
  if (!origin) { origin = '东京'; assumptions.push('origin_default'); }
  const dests = china.map((c) => c.zh);
  if (!dests.length) { dests.push('上海'); assumptions.push('dest_default'); }
  let days = parseDays(text);
  if (!days) { days = Math.max(3, dests.length * 2); assumptions.push('days_default'); }
  days = Math.min(Math.max(days, 2), 10);
  let startDate = parseDate(text);
  if (!startDate) { startDate = addDays(fmt(new Date()), 14); assumptions.push('date_default'); }
  const interests = CATEGORY_HINTS.filter((h) => h.re.test(text)).map((h) => h.cat);
  const named = BUDGET_HINTS.find((h) => h.re.test(text));
  if (!named) assumptions.push('budget_default');
  return {
    lang, origin, destinations: dests.slice(0, 4), days, startDate,
    endDate: addDays(startDate, days - 1), adults: parseAdults(text),
    interests: [...new Set(interests)].slice(0, 3), budget: named ? named.budget : 'standard', assumptions, extractor: 'rule-based (mock, no LLM)',
  };
}

async function extract(text, langHint) {
  const base = ruleBased(text, langHint);
  if (llm.mode() !== 'live') return base;
  const today = fmt(new Date());
  const prompt = `You extract a structured trip request for a foreign traveller visiting mainland China.
Today is ${today}. Return ONLY JSON with keys:
lang ("ja"|"en"|"ko"|"zh" — the language the user wrote in),
origin (departure city outside mainland China, written in Simplified Chinese, e.g. "东京"),
destinations (ordered array of mainland China cities in Simplified Chinese, max 4),
days (integer total trip days incl. travel days), startDate (YYYY-MM-DD or null if not stated),
adults (integer), interests (array of category names, choose from: ${CATEGORY_HINTS.map((h) => `${h.cat} = ${h.hint}`).join('; ')}. Liking food or eating means 市集),
budget (hotel budget per room per night: "economy" = under 300 CNY, "standard" = 300–600 CNY, "upscale" = over 600 CNY; turn a stated nightly amount in any currency into the nearest band; null if no budget or price level is stated),
notes (short array of other constraints in the user's language, e.g. dietary needs).
Do not guess dates; use null when unknown.
User text: """${text.slice(0, 2000)}"""`;
  try {
    // temperature 0: the same sentence should pick the same categories, so flyai queries (and the cache) stay stable
    const { content } = await llm.chat({ model: llm.FAST_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0 });
    const out = { ...base, extractor: `Qwen (${llm.FAST_MODEL}) + validation` };
    if (['ja', 'en', 'ko', 'zh'].includes(content.lang)) out.lang = langHint || content.lang;
    if (typeof content.origin === 'string') {
      const originCity = byZh(content.origin.trim());
      if (originCity && !originCity.cn) {
        out.origin = originCity.zh;
        out.assumptions = out.assumptions.filter((a) => a !== 'origin_default');
      }
    }
    const dests = [];
    const seenDest = new Set();
    for (const d of Array.isArray(content.destinations) ? content.destinations : []) {
      if (typeof d !== 'string') continue;
      const city = byZh(d.trim());
      if (!city || !city.cn || seenDest.has(city.zh)) continue;
      seenDest.add(city.zh);
      dests.push(city.zh);
    }
    if (dests.length) { out.destinations = dests.slice(0, 4); out.assumptions = out.assumptions.filter((a) => a !== 'dest_default'); }
    if (Number.isInteger(content.days) && content.days >= 2 && content.days <= 10) { out.days = content.days; out.assumptions = out.assumptions.filter((a) => a !== 'days_default'); }
    if (typeof content.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(content.startDate)) { out.startDate = content.startDate; out.assumptions = out.assumptions.filter((a) => a !== 'date_default'); }
    if (Number.isInteger(content.adults) && content.adults > 0 && content.adults < 10) out.adults = content.adults;
    if (Array.isArray(content.interests)) out.interests = content.interests.filter((c) => CATEGORY_HINTS.some((h) => h.cat === c)).slice(0, 3);
    if (BUDGET_NAMES.includes(content.budget)) { out.budget = content.budget; out.assumptions = out.assumptions.filter((a) => a !== 'budget_default'); }
    if (Array.isArray(content.notes)) out.notes = content.notes.filter((n) => typeof n === 'string').slice(0, 5);
    out.endDate = addDays(out.startDate, out.days - 1);
    return out;
  } catch (e) {
    return { ...base, extractor: base.extractor + ` (LLM error: ${llm.redact(e.message).slice(0, 120)})` };
  }
}

module.exports = { extract, ruleBased, detectLang, parseDate, parseDays, addDays, byZh, BUDGET_NAMES };
