'use strict';
/**
 * Photo help with a Qwen vision model on 百炼: menus, shop signs, notices, museum exhibits and labels, dishes.
 * Up to 3 photos of the same subject go in one request (e.g. an exhibit and its label).
 * Mock mode returns an explicit "unavailable" result — it never fabricates a translation.
 * Each explanation is tagged "photo" (printed or visible) or "general" (general knowledge), and anything
 * the model cannot see stays in `uncertain`; the UI shows both, so a guess never reads as a fact.
 */
const llm = require('./llm');
const LANG_NAME = { en: 'English', ja: 'Japanese', ko: 'Korean', zh: 'Simplified Chinese' };
const KINDS = ['menu', 'shopfront', 'sign', 'notice', 'exhibit', 'dish', 'other'];
const MAX_IMAGES = 3;
const DATA_URL = /^data:image\/(png|jpe?g|webp|gif|bmp);base64,/;

function imagesOf({ images, imageDataUrl }) {
  const list = Array.isArray(images) ? images : imageDataUrl ? [imageDataUrl] : [];
  if (!list.length) throw new Error('Send 1–3 images as base64 data URLs (png/jpeg/webp)');
  if (list.length > MAX_IMAGES) throw new Error(`Too many images (max ${MAX_IMAGES})`);
  for (const u of list) if (!DATA_URL.test(u || '')) throw new Error('Each image must be a base64 data URL (png/jpeg/webp)');
  if (list.reduce((n, u) => n + u.length, 0) > 14 * 1024 * 1024) throw new Error('Images too large (max ~10 MB in total)');
  return list;
}

function prompt(target, count) {
  return `You help a foreign visitor in mainland China understand what they photographed. Write every explanation in ${target}.
${count > 1 ? `These ${count} photos show the same subject (for example an exhibit and its label, or a shop sign and its menu). Read them together.\n` : ''}Decide what the photo shows: "menu", "shopfront" (a shop or restaurant front or sign), "sign", "notice", "exhibit" (a museum object and/or its label), "dish" (food served at a table) or "other".
Return ONLY JSON:
{"kind": one of those words,
"title": ${target}, at most 12 words: what this is (for a dish, your best identification),
"summary": ${target}, at most 50 words,
"confidence": "high"|"medium"|"low" — how sure you are what it is; a dish identified only by its look is "medium" at most,
"items": [{"zh": a line of Chinese text exactly as printed, "pinyin": full pinyin of zh, "meaning": ${target} translation, "price": price as printed or null, "note": ${target} or null}] — every readable line of Chinese text in reading order, [] if there is none. Copy characters and numbers exactly as printed, including text in brackets, even where a more common spelling exists; keep traditional characters; write [?] for a character you cannot read. A note never restates a number unless it copies it exactly. A poem or inscription written in columns gets one item per verse line (join characters across column breaks) with a plain translation of that line,
"details": [{"text": ${target}, at most 40 words, "basis": "photo"|"general"}] — 2 to 6 points a visitor would want to know; "photo" only for what is printed or plainly visible; anything inferred or known from elsewhere (what a dish or cut of meat is, a Western calendar year, what a style suggests) is "general",
"candidates": [{"zh": dish name in Chinese, "pinyin": string, "meaning": ${target}}] — for a dish only, up to 3 other dishes it could be, else [],
"advice": ${target} or null — for a shop, menu or dish: what the place serves, its signature dish, price range and what to order or ask, based only on the photo. Do not describe portion sizes, presentation or taste unless printed or visible. Never say it is good, popular, clean, authentic or worth it: the photo cannot show reviews,
"uncertain": [${target}] — what cannot be told from the photo (e.g. the filling, which meat, how spicy),
"warnings": [${target}] — e.g. spicy, pork, peanut, alcohol, cash only, no entry — only if printed or clearly visible}.
Never invent text, dishes, prices, dates, places or facts. If the text is unreadable, say so in summary.`;
}

const str = (v, n) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, n) : '');
const list = (v, n) => (Array.isArray(v) ? v : []).slice(0, n).filter((x) => x !== null && x !== undefined);
const obj = (x) => x && typeof x === 'object';

function clean(c) {
  const kind = KINDS.includes(c.kind) ? c.kind : 'other';
  return {
    kind,
    title: str(c.title, 120),
    summary: str(c.summary, 600),
    confidence: ['high', 'medium', 'low'].includes(c.confidence) ? c.confidence : null,
    items: list(c.items, 60).filter(obj).map((x) => ({ zh: str(x.zh, 200), pinyin: str(x.pinyin, 300), meaning: str(x.meaning, 300), price: str(x.price, 40) || null, note: str(x.note, 300) || null })).filter((x) => x.zh),
    // an untagged point counts as general knowledge, so nothing is presented as seen in the photo by default
    details: list(c.details, 8).filter(obj).map((x) => ({ text: str(x.text, 400), basis: x.basis === 'photo' ? 'photo' : 'general' })).filter((x) => x.text),
    candidates: kind === 'dish' ? list(c.candidates, 3).filter(obj).map((x) => ({ zh: str(x.zh, 40), pinyin: str(x.pinyin, 80), meaning: str(x.meaning, 160) })).filter((x) => x.zh) : [],
    advice: str(c.advice, 500) || null,
    uncertain: list(c.uncertain, 6).map((x) => str(x, 200)).filter(Boolean),
    warnings: list(c.warnings, 8).map((x) => str(x, 120)).filter(Boolean),
  };
}

async function translatePhoto({ images, imageDataUrl, lang = 'en' }) {
  const imgs = imagesOf({ images, imageDataUrl });
  if (llm.mode() !== 'live') {
    const blocked = llm.info().blocked;
    const message = blocked
      ? 'Photo translation refused a Token Plan key or endpoint. Set a pay-as-you-go DASHSCOPE_API_KEY (sk-, not sk-sp-) and the dashscope compatible-mode URL. No translation is shown.'
      : 'Photo translation needs a pay-as-you-go DASHSCOPE_API_KEY (Qwen vision model on Alibaba Cloud Model Studio). No translation is shown in mock mode.';
    return { mode: 'mock', available: false, model: llm.VL_MODEL, blocked: blocked || null, message };
  }
  const target = LANG_NAME[lang] || 'English';
  const { content, model, usage } = await llm.chat({
    model: llm.VL_MODEL,
    messages: [{ role: 'user', content: [...imgs.map((url) => ({ type: 'image_url', image_url: { url } })), { type: 'text', text: prompt(target, imgs.length) }] }],
    temperature: 0.1,
    timeoutMs: 180000,
  });
  return { mode: 'live', available: true, model, usage, lang, images: imgs.length, ...clean(content || {}) };
}

module.exports = { translatePhoto, clean, MAX_IMAGES };
