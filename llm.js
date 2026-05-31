'use strict';
// Pluggable, $0 LLM helper. Uses Groq's free OpenAI-compatible API when
// GROQ_API_KEY is set; otherwise falls back to a deterministic template so the
// feature always works at no cost and with no external dependency.
const KEY = process.env.GROQ_API_KEY || '';
const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const enabled = !!KEY;

async function chat(prompt) {
  if (!KEY) return null;
  try {
    const opts = { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(8000) : undefined };
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0.6, max_tokens: 220,
        messages: [{ role: 'user', content: prompt }] }),
      ...opts,
    });
    if (!r.ok) return null;
    const j = await r.json();
    const txt = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    return (txt || '').trim() || null;
  } catch (e) { return null; }
}

function titleCaseTrade(t) { return t; }
function joinList(arr) {
  arr = arr.filter(Boolean);
  if (arr.length <= 1) return arr[0] || '';
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

// data: { name, tradeLabels:[], years, city, workLines:[] }
function templateAbout(d) {
  const trades = joinList(d.tradeLabels) || 'the trades';
  const exp = d.years ? `${d.years}-year ` : '';
  const where = d.city ? ` based in ${d.city}` : '';
  const recent = (d.workLines && d.workLines[0]) ? ` Most recently ${d.workLines[0]}.` : '';
  return `${exp}${trades} professional${where}, known for showing up ready and doing clean, code-compliant work.${recent} Looking for a crew that values reliability and craftsmanship.`.trim();
}

async function workerAbout(d) {
  const prompt = `Write a confident, first-person "About me" for a blue-collar tradesperson's job profile. `
    + `Trades: ${(d.tradeLabels || []).join(', ') || 'general trades'}. `
    + `${d.years || 0} years experience${d.city ? ` in ${d.city}` : ''}. `
    + `Past roles: ${(d.workLines || []).join('; ') || 'various job sites'}. `
    + `2-3 sentences, under 60 words, plain language, no buzzwords or hashtags.`;
  const ai = await chat(prompt);
  return ai || templateAbout(d);
}

// Batch-translate UI strings to a target language. Returns { src: dst } for
// whatever it could translate; {} when disabled or on failure (caller keeps English).
async function translateBatch(texts, langName = 'Spanish') {
  if (!KEY || !texts || !texts.length) return {};
  const list = texts.slice(0, 60);
  const numbered = list.map((s, i) => `${i + 1}. ${s.replace(/\n/g, ' ')}`).join('\n');
  const prompt = `Translate these short UI strings for a US blue-collar hiring app into ${langName}. `
    + `Keep any leading emoji, keep it concise and natural for tradespeople, do NOT translate brand names "Rivet" or "Crewline". `
    + `Return ONLY a JSON array of strings in the same order, no commentary.\n\n${numbered}`;
  const out = await chat(prompt);
  if (!out) return {};
  try {
    const start = out.indexOf('['), end = out.lastIndexOf(']');
    if (start < 0 || end < 0) return {};
    const arr = JSON.parse(out.slice(start, end + 1));
    const map = {};
    list.forEach((s, i) => { if (typeof arr[i] === 'string' && arr[i].trim()) map[s] = arr[i].trim(); });
    return map;
  } catch (e) { return {}; }
}

module.exports = { enabled, workerAbout, translateBatch };
