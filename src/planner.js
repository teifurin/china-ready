'use strict';
/**
 * Planner: intent -> flyai queries -> deterministic day-by-day skeleton with REAL options,
 * then (live mode) Qwen writes the narrative in the user's language, constrained to the ids we pass.
 * In mock mode, narrative comes from fixed templates; every place/price/link still comes from flyai.
 */
const flyai = require('./flyai');
const llm = require('./llm');
const { card } = require('./cards');
const { tipsFor } = require('./tips');
const { addDays } = require('./intent');
const N = require('./narrative');
const FAMILY = [/游船|游轮|游览|观光巴士|码头|夜游/];
const PARKS = new Set(['动物园', '海洋馆', '主题乐园', '水上乐园', '影视基地', '滑雪', '漂流']);

const realPrice = (p) => {
  if (p === null || p === undefined) return null;
  const s = String(p).replace(/[¥,\s元]/g, '');
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
};
// nightly budget per room in CNY. The user picks a band, or "standard" is assumed and labelled as such.
const BUDGETS = { economy: [0, 299], standard: [300, 600], upscale: [601, Infinity] };
// Fliggy's hotel classes, and the class each budget looks for first
const HOTEL_CLASS = { 经济型: 1, 舒适型: 2, 高档型: 3, 豪华型: 4 };
const BUDGET_CLASS = { economy: 1, standard: 2, upscale: 3 };
// a real price, or the middle of the range a masked experience-mode price shows ("¥5xx" = 500–599)
function nightlyPrice(p) {
  const real = realPrice(p);
  if (real != null) return real;
  const m = String(p ?? '').replace(/[¥,\s元]/g, '').match(/^(\d+)(x+)$/i);
  return m ? Number(m[1]) * 10 ** m[2].length + (10 ** m[2].length - 1) / 2 : null;
}
// hotels within the budget come first, then the class that budget looks for, then Fliggy's own order.
// When a city has nothing in the budget, the closest price leads and inBudget is false, so the page can say so.
function rankHotels(items, budget) {
  const [lo, hi] = BUDGETS[budget] || BUDGETS.standard;
  const want = BUDGET_CLASS[budget] || BUDGET_CLASS.standard;
  const gap = (p) => (p == null ? Infinity : p < lo ? lo - p : p > hi ? p - hi : 0);
  return items.map(mapHotel).filter((h) => !/电竞|青旅|hostel|民宿/i.test(h.name))
    .map((h, i) => ({ h, i, gap: gap(nightlyPrice(h.price)), cls: Math.abs((HOTEL_CLASS[h.star] || 0) - want) }))
    .sort((a, b) => (a.gap > 0) - (b.gap > 0) || a.gap - b.gap || a.cls - b.cls || a.i - b.i)
    .map((x) => ({ ...x.h, inBudget: x.gap === 0 }));
}

function kmBetween(a, b) {
  const R = 6371, r = Math.PI / 180, la1 = Number(a.lat), la2 = Number(b.lat), dLat = (la2 - la1) * r, dLng = (Number(b.lng) - Number(a.lng)) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const hhmm = (dt) => (dt ? String(dt).slice(11, 16) : '');
const hour = (dt) => (dt ? Number(String(dt).slice(11, 13)) + Number(String(dt).slice(14, 16)) / 60 : NaN);

function mapJourney(it, kind) {
  const segs = (it.journeys?.[0]?.segments) || [];
  const first = segs[0] || {}; const last = segs[segs.length - 1] || {};
  const price = it.ticketPrice ?? it.price ?? null;
  return {
    kind,
    no: segs.map((s) => s.marketingTransportNo).filter(Boolean).join(' / '),
    carrier: first.marketingTransportName || '',
    direct: segs.length === 1,
    from: first.depStationName, fromCity: first.depCityName, to: last.arrStationName, toCity: last.arrCityName,
    dep: first.depDateTime, arr: last.arrDateTime, depTime: hhmm(first.depDateTime), arrTime: hhmm(last.arrDateTime),
    durationMin: Number(it.totalDuration || first.duration || 0) || null,
    seat: first.seatClassName || '',
    price: price === null ? null : String(price), priceValue: realPrice(price), priceMasked: price !== null && realPrice(price) === null,
    url: it.jumpUrl || null,
  };
}

function mapHotel(it) {
  return {
    kind: 'hotel', id: 'h' + (it.shId || it.name), name: it.name, address: it.address, star: it.star, img: it.mainPic,
    price: it.price ?? null, priceValue: realPrice(it.price), priceMasked: it.price != null && realPrice(it.price) === null,
    near: it.interestsPoi || '', decorated: it.decorationTime || '', url: it.detailUrl || null, lat: it.latitude, lng: it.longitude,
  };
}

function mapPoi(it) {
  const t = it.ticketInfo || {};
  const free = it.freePoiStatus === 'FREE';
  return {
    kind: 'poi', id: 'p' + (it.id || it.name), name: it.name, address: it.address, category: it.category, level: Number(it.poiLevel) || 0,
    rank: it.listRank || '', lat: it.latitude, lng: it.longitude, description: (it.description || '').slice(0, 280), img: it.mainPic, url: it.jumpUrl || null,
    free, ticketName: t.ticketName || '', price: free ? '0' : (t.price ?? null), priceValue: free ? 0 : realPrice(t.price), priceMasked: !free && t.price != null && realPrice(t.price) === null,
  };
}

function pickFlight(list, { arriveBy, departAfter }) {
  const score = (f) => (f.direct ? 0 : 1000) + (f.priceValue ?? 5000) / 10 +
    (arriveBy && (hour(f.arr) > arriveBy || hour(f.arr) < 7) ? 300 : 0) + (departAfter && hour(f.dep) < departAfter ? 300 : 0);
  return [...list].sort((a, b) => score(a) - score(b));
}
function pickTrain(list) {
  const score = (t) => (hour(t.dep) >= 8 && hour(t.dep) <= 11 ? 0 : 200) + (t.durationMin || 300) + (t.direct ? 0 : 500);
  return [...list].sort((a, b) => score(a) - score(b));
}

function allocate(days, cities) {
  const k = cities.length; const base = Math.floor(days / k); let rem = days % k;
  return cities.map((c) => base + (rem-- > 0 ? 1 : 0)).map((n, i) => ({ city: cities[i], n: Math.max(n, 1) }));
}

async function buildPlan(intent, { onProgress = () => {} } = {}) {
  if (!Array.isArray(intent.destinations) || !intent.destinations.length || intent.destinations.length > intent.days) {
    const error = new Error('Allow at least one trip day per destination city. Increase the duration or choose fewer cities.');
    error.statusCode = 400;
    error.code = 'TOO_MANY_CITIES'; // the page shows its own wording for this code
    throw error;
  }
  const lang = intent.lang;
  const cities = intent.destinations;
  const alloc = allocate(intent.days, cities);
  const dayCity = []; alloc.forEach((a) => { for (let i = 0; i < a.n; i++) dayCity.push(a.city); });
  while (dayCity.length > intent.days) dayCity.pop();
  const dates = dayCity.map((_, i) => addDays(intent.startDate, i));
  const lastCity = dayCity[dayCity.length - 1];
  const firstDayOf = (c) => dayCity.indexOf(c);
  const queries = [];
  const q = (label, p) => {
    queries.push(label);
    onProgress({ step: label, state: 'start' });
    return Promise.resolve(p).then((r) => {
      const failed = !r || r.ok === false;
      onProgress({
        step: label,
        state: failed ? 'error' : 'done',
        count: r && Array.isArray(r.items) ? r.items.length : 0,
        error: failed ? ((r && r.error) || 'no result') : undefined,
      });
      return r;
    }, (err) => {
      onProgress({ step: label, state: 'error', error: String((err && err.message) || err).slice(0, 200) });
      throw err;
    });
  };

  // ---- flyai queries (parallel) -------------------------------------
  const outboundP = q(`flight ${intent.origin}→${cities[0]} ${dates[0]}`, flyai.searchFlight({ origin: intent.origin, destination: cities[0], date: dates[0] }));
  const returnP = q(`flight ${lastCity}→${intent.origin} ${intent.endDate}`, flyai.searchFlight({ origin: lastCity, destination: intent.origin, date: intent.endDate }));
  const trainPs = cities.slice(1).map((c, i) => {
    const d = dates[firstDayOf(c)];
    return q(`train ${cities[i]}→${c} ${d} 08-12h`, flyai.searchTrain({ origin: cities[i], destination: c, date: d, hourStart: 8, hourEnd: 12 }));
  });
  const poiPs = cities.map((c) => {
    const cats = (intent.interests || []).slice(0, 2);
    const ps = [q(`poi ${c}`, flyai.searchPoi({ city: c }))];
    for (const cat of cats) ps.push(q(`poi ${c} ${cat}`, flyai.searchPoi({ city: c, category: cat })));
    return Promise.all(ps);
  });
  const pois = await Promise.all(poiPs);
  // rank attractions: interest match > level > list rank; de-prioritise far-out theme parks unless asked
  const interests = new Set(intent.interests || []);
  const poiOpts = pois.map((rs) => {
    const seen = new Map();
    rs.forEach((r, ri) => r.items.map(mapPoi).forEach((it) => {
      const prev = seen.get(it.name);
      const match = ri > 0 || interests.has(it.category);
      if (prev) { prev.match = prev.match || match; return; }
      seen.set(it.name, { ...it, match });
    }));
    const score = (p) => (p.match ? 3 : 0) + p.level * 0.6 + (p.rank ? 0.5 : 0) - (PARKS.has(p.category) && !interests.has(p.category) ? 3 : 0);
    return [...seen.values()].map((p) => ({ ...p, score: Math.round(score(p) * 10) / 10 })).sort((a, b) => b.score - a.score);
  });
  // hotels near each city's anchor attraction (top-level landmark), hotels only (not hostels/B&Bs)
  // anchor = attraction with the most other attractions within 5 km (data-driven "centre"), so hotels sit near the action
  const anchors = poiOpts.map((list) => {
    const pts = list.filter((p) => p.lat && p.lng && !PARKS.has(p.category));
    let best = null;
    for (const p of pts) {
      const n = pts.filter((o) => o !== p && kmBetween(p, o) <= 5).length;
      const sc = n * 10 + p.level;
      if (!best || sc > best.sc) best = { sc, name: p.name };
    }
    return best ? best.name : (list[0] || {}).name;
  });
  const hotelPs = cities.map((c, i) => {
    const checkIn = dates[firstDayOf(c)];
    const checkOut = i + 1 < cities.length ? dates[firstDayOf(cities[i + 1])] : intent.endDate;
    if (checkIn === checkOut) return Promise.resolve(null);
    return q(`hotel ${c} near ${anchors[i] || '-'} ${checkIn}~${checkOut}`, flyai.searchHotel({ city: c, poi: anchors[i], types: '酒店', checkIn, checkOut }))
      .then((r) => ({ ...r, checkIn, checkOut, anchor: anchors[i] }));
  });

  const [outbound, ret, trains, hotels] = await Promise.all([outboundP, returnP, Promise.all(trainPs), Promise.all(hotelPs)]);

  // A flight from another city is not reachable unless a connecting journey is verified.
  // Keep the final-city search result, even when empty; never invent that connection.
  const returnRes = ret;

  const sources = [];
  const track = (r) => { if (r && r.meta) sources.push({ command: r.meta.command, args: r.meta.args, source: r.meta.source, fetchedAt: r.meta.fetchedAt, count: r.items.length, experienceMode: r.experienceMode, ok: r.ok, error: r.error }); };
  [outbound, returnRes, ...trains, ...hotels.filter(Boolean), ...pois.flat()].forEach(track);
  const experienceMode = sources.some((s) => s.experienceMode);
  const systemMessage = [outbound, returnRes, ...trains].map((r) => r && r.systemMessage).find(Boolean) || '';

  const outFlights = pickFlight(outbound.items.map((x) => mapJourney(x, 'flight')), { arriveBy: 18 });
  const retFlights = pickFlight(returnRes.items.map((x) => mapJourney(x, 'flight')), { departAfter: 13 });
  const trainOpts = trains.map((r) => pickTrain(r.items.map((x) => mapJourney(x, 'train'))));
  const budget = BUDGETS[intent.budget] ? intent.budget : 'standard';
  const hotelOpts = hotels.map((r) => (r ? rankHotels(r.items, budget) : []));
  // ---- assemble days --------------------------------------------------
  const used = cities.map(() => new Set());
  const km = (a, b) => {
    if (!a || !b || !a.lat || !b.lat) return null;
    const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  // greedy pick: score minus distance from hotel (keeps a day geographically sane); maxKm for arrival evening
  const takePois = (ci, n, maxKm) => {
    const hotel = hotelOpts[ci][0];
    const ref = hotel ? { lat: Number(hotel.lat), lng: Number(hotel.lng) } : null;
    const cands = poiOpts[ci].filter((p) => !used[ci].has(p.name)).map((p) => {
      const d = km(ref, { lat: Number(p.lat), lng: Number(p.lng) });
      return { p: { ...p, kmFromHotel: d == null ? null : Math.round(d * 10) / 10 }, s: p.score - (d == null ? 0 : d / 8), d };
    }).filter((c) => maxKm == null || (c.d != null && c.d <= maxKm)).sort((a, b) => b.s - a.s);
    // diversity: no near-duplicate names (same 3-char prefix, e.g. several "黄浦江…" cruises), max 2 per category per day
    const picked = []; const catCount = {};
    for (const c of cands) {
      if (picked.length >= n) break;
      const pre = c.p.name.slice(0, 3);
      if ([...used[ci]].some((u) => u.slice(0, 3) === pre)) continue;
      const fam = FAMILY.find((re) => re.test(c.p.name));
      if (fam && [...used[ci]].some((u) => fam.test(u))) continue;
      if ((catCount[c.p.category] || 0) >= 2) continue;
      picked.push(c); used[ci].add(c.p.name); catCount[c.p.category] = (catCount[c.p.category] || 0) + 1;
    }
    return picked.map((c) => c.p);
  };
  const chosenHotel = (ci) => hotelOpts[ci][0] || null;
  const days = [];
  const count = intent.adults || 1;

  for (let d = 0; d < dayCity.length; d++) {
    const city = dayCity[d]; const ci = cities.indexOf(city);
    const isFirst = d === 0; const isLast = d === dayCity.length - 1;
    const isMove = !isFirst && dayCity[d - 1] !== city;
    const stops = [];
    const hotel = chosenHotel(ci);
    const hotelParam = hotel ? { name: hotel.name, address: hotel.address } : null;

    if (isFirst) {
      const f = outFlights[0];
      stops.push({ id: `d${d}-flight`, type: 'flight', option: f || null, alternatives: outFlights.slice(1, 4), missing: !f,
        cards: hotelParam ? [card('taxi', lang, { ...hotelParam, label: hotel.name })] : [] });
    }
    if (isMove) {
      const opts = trainOpts[ci - 1] || []; const t = opts[0];
      stops.push({ id: `d${d}-train`, type: 'train', option: t || null, alternatives: opts.slice(1, 4), missing: !t,
        cards: t ? [card('taxi', lang, { name: t.from, label: t.from }), card('train', lang, { no: t.no, from: t.from, to: t.to, time: t.depTime })] : [] });
    }
    if ((isFirst || isMove) && hotel) {
      const h = hotels[ci];
      stops.push({ id: `d${d}-hotel`, type: 'hotel', option: hotel, alternatives: hotelOpts[ci].slice(1, 4), checkIn: h.checkIn, checkOut: h.checkOut,
        cards: [card('taxi', lang, { ...hotelParam, label: hotel.name }), card('checkin', lang, { ...hotelParam, label: hotel.name, checkIn: h.checkIn, checkOut: h.checkOut })] });
    }
    let nPoi = isFirst ? 1 : isMove ? 2 : 3;
    const rf = retFlights[0];
    if (isLast && !isFirst) nPoi = rf && hour(rf.dep) >= 15 ? 1 : 0;
    for (const p of takePois(ci, nPoi, isFirst ? 8 : null)) {
      const cs = [card('taxi', lang, { name: p.name, address: p.address, label: p.name })];
      if (!p.free && p.ticketName) cs.push(card('ticket', lang, { name: p.name, ticketName: p.ticketName, count, label: p.name }));
      cs.push(card('directions', lang, { name: p.name, label: p.name }));
      stops.push({ id: `d${d}-${p.id}`, type: 'poi', option: p, cards: cs });
    }
    if (isLast) {
      if (!rf) {
        stops.push({ id: `d${d}-note`, type: 'note', noteKey: 'returnUnavailable', city });
      }
      stops.push({ id: `d${d}-flight`, type: 'flight', option: rf || null, alternatives: retFlights.slice(1, 4), missing: !rf, cards: rf ? [card('taxi', lang, { name: rf.from, label: rf.from })] : [] });
    }
    days.push({ index: d + 1, date: dates[d], city, kind: isFirst ? 'arrive' : isLast ? 'depart' : isMove ? 'move' : 'explore', stops,
      cards: [card('ordering', lang, {}), card('payment', lang, {}), card('help', lang, {})] });
  }

  // ---- totals (only real numeric prices are summed) ------------------
  // transport and tickets × travellers; a hotel price is read as per room per night: × nights, one room
  const nightsOf = (s) => Math.max(1, Math.round((Date.parse(s.checkOut) - Date.parse(s.checkIn)) / 86400000) || 1);
  const priced = []; const masked = [];
  for (const day of days) for (const s of day.stops) {
    if (!s.option || s.type === 'note') continue;
    const o = s.option;
    if (o.priceMasked) masked.push({ id: s.id, label: o.no || o.name, price: o.price });
    else if (o.priceValue != null && s.type === 'hotel') priced.push({ id: s.id, type: 'hotel', label: o.name, unit: o.priceValue, qty: nightsOf(s), value: o.priceValue * nightsOf(s) });
    else if (o.priceValue != null) priced.push({ id: s.id, type: s.type, label: o.no || o.name, unit: o.priceValue, qty: count, value: o.priceValue * count });
  }
  const totals = { currency: 'CNY', knownSum: Math.round(priced.reduce((a, b) => a + b.value, 0)), priced, masked, travellers: count };

  // which budget the hotels were chosen for, and per city whether one in that budget existed
  const stay = {
    budget, assumed: (intent.assumptions || []).includes('budget_default'),
    cities: cities.map((c, ci) => hotelOpts[ci][0] && { city: c, name: hotelOpts[ci][0].name, price: hotelOpts[ci][0].price, inBudget: hotelOpts[ci][0].inBudget }).filter(Boolean),
  };
  const plan = {
    intent, lang, createdAt: new Date().toISOString(), days, totals, stay, tips: tipsFor(lang),
    data: {
      provider: 'Fliggy flyai (飞猪)', experienceMode, systemMessage, sources,
      errors: sources.filter((s) => s.ok === false).map((s) => ({ command: s.command, args: s.args, error: s.error || 'flyai query failed' })),
      // live calls paused after a 429/403/503, and whether any result here is saved data instead of a live answer
      paused: process.env.FLYAI_OFFLINE === '1' ? null : flyai.pauseState(),
      fallback: sources.some((s) => s.source === 'cache-stale' || s.source === 'fixture-fallback'),
    },
    llm: llm.info(),
  };
  plan.narrative = await N.write(plan);
  return plan;
}

module.exports = { buildPlan, allocate, mapJourney, mapHotel, mapPoi, rankHotels, nightlyPrice, BUDGETS };
