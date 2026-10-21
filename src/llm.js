'use strict';
/**
 * Alibaba Cloud Model Studio (百炼) via its OpenAI-compatible Chat Completions endpoint.
 * Uses a pay-as-you-go API key (DASHSCOPE_API_KEY, starts with "sk-").
 * Do NOT put a Token Plan / Coding Plan key (sk-sp-...) here: per Alibaba Cloud docs those plans
 * are only for interactive use inside AI coding tools, not for app backends.
 */
const DEFAULT_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

function baseUrl() {
  return (process.env.DASHSCOPE_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
}
function textModel() { return process.env.QWEN_TEXT_MODEL || 'qwen3.8-max'; }
function fastModel() { return process.env.QWEN_FAST_MODEL || 'qwen3.8-flash'; }
function vlModel() { return process.env.QWEN_VL_MODEL || 'qwen3-vl-plus'; }

function redact(s) {
  return String(s || '')
    .replace(/sk-[A-Za-z0-9_-]{4,}/g, '[redacted]')
    .replace(/(Bearer\s+)\S+/gi, '$1[redacted]');
}

function blockedReason() {
  const key = process.env.DASHSCOPE_API_KEY || '';
  if (key.startsWith('sk-sp-')) return 'token-plan-key-refused';
  if (/token-plan|coding\.dashscope/i.test(baseUrl())) return 'token-plan-endpoint-refused';
  return null;
}

function mode() {
  if (process.env.MOCK_LLM === '1') return 'mock';
  if (blockedReason()) return 'mock';
  return process.env.DASHSCOPE_API_KEY ? 'live' : 'mock';
}

function info() {
  return {
    mode: mode(),
    baseUrl: baseUrl(),
    textModel: textModel(),
    fastModel: fastModel(),
    vlModel: vlModel(),
    blocked: blockedReason(),
  };
}

class LlmUnavailable extends Error {}

async function postChat({ model, messages, json, parse, temperature, timeoutMs, thinking }) {
  const body = { model, messages, temperature };
  if (thinking === false) body.enable_thinking = false;
  if (json) body.response_format = { type: 'json_object' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(baseUrl() + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.DASHSCOPE_API_KEY },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`Model Studio HTTP ${res.status}: ${redact(text).slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content ?? '';
    return { content: parse ? parseJson(content) : content, usage: data.usage, model: data.model || model };
  } finally {
    clearTimeout(t);
  }
}

async function chat({ model, messages, json = true, temperature = 0.3, timeoutMs = 120000 }) {
  if (mode() !== 'live') throw new LlmUnavailable('LLM is in mock mode (set a pay-as-you-go DASHSCOPE_API_KEY to enable).');
  const attempts = [
    { json, thinking: false },
    { json: false, thinking: false },
    { json: false, thinking: null },
  ];
  let last;
  for (let i = 0; i < attempts.length; i++) {
    try {
      // the fallbacks drop response_format, but a caller that asked for JSON still gets parsed JSON
      return await postChat({ model, messages, temperature, timeoutMs, parse: json, ...attempts[i] });
    } catch (e) {
      last = e;
      const retryable = e.status === 400 && /response_format|enable_thinking|json_object|unknown/i.test(e.message);
      if (!retryable || i === attempts.length - 1) break;
    }
  }
  throw last;
}

function parseJson(s) {
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch (_) {}
  const m = s.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error('Model did not return JSON');
}

module.exports = {
  chat, info, mode, redact, LlmUnavailable,
  get TEXT_MODEL() { return textModel(); },
  get FAST_MODEL() { return fastModel(); },
  get VL_MODEL() { return vlModel(); },
};
