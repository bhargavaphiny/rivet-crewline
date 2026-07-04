'use strict';
// Pluggable, $0 LLM helper. Uses Groq's free OpenAI-compatible API when
// GROQ_API_KEY is set; otherwise falls back to a deterministic template so the
// feature always works at no cost and with no external dependency.
const KEY = process.env.GROQ_API_KEY || '';
const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const enabled = !!KEY;

async function chat(prompt, maxTokens = 220, timeoutMs = 8000) {
  if (!KEY) return null;
  try {
    const opts = { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(timeoutMs) : undefined };
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0.4, max_tokens: maxTokens,
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
  const list = texts.slice(0, 25);
  const numbered = list.map((s, i) => `${i + 1}. ${s.replace(/\n/g, ' ')}`).join('\n');
  const prompt = `Translate each UI string for a US blue-collar hiring app into ${langName}.\n`
    + `Rules: keep any leading emoji exactly as given and DO NOT add new emojis; keep it concise and natural for tradespeople; `
    + `do NOT translate the brand names "Rivet" or "Crewline".\n`
    + `Return ONLY a JSON array of plain strings — element i is the translation of input i, same order, same count. No objects, no keys, no commentary.\n`
    + `Example input: 1. Find work 2. Save\nExample output: ["Buscar trabajo","Guardar"]\n\n${numbered}`;
  const out = await chat(prompt, 1800, 15000);
  if (!out) return {};
  try {
    const start = out.indexOf('['), end = out.lastIndexOf(']');
    if (start < 0 || end < 0) return {};
    const arr = JSON.parse(out.slice(start, end + 1));
    const map = {};
    list.forEach((s, i) => {
      let v = arr[i];
      if (v && typeof v === 'object' && !Array.isArray(v)) { const vals = Object.values(v); v = vals.length ? vals[0] : null; }
      if (typeof v === 'string' && v.trim()) map[s] = v.trim();
    });
    return map;
  } catch (e) { return {}; }
}

// ---------- agent helpers (deterministic fallback so they work with $0 / no key) ----------

// Career Coach: one motivating line about the highest-ROI next credential.
// d: { tradeLabels:[], credLabel, jobsUnlocked, payDelta }
async function coachLine(d){
  const prompt = `You are a blue-collar career coach. In ONE encouraging sentence (under 32 words, plain language, no hashtags), `
    + `tell a ${ (d.tradeLabels||[]).join('/') || 'tradesperson' } that earning their ${d.credLabel} would unlock about `
    + `${d.jobsUnlocked} more local jobs${d.payDelta>0?` and roughly +$${d.payDelta}/hr`:''}. Be specific and motivating.`;
  const ai = await chat(prompt, 80, 6000);
  if (ai) return ai.replace(/^["']|["']$/g,'');
  const pay = d.payDelta>0 ? ` and pay up to about +$${d.payDelta}/hr` : '';
  return `Earning your ${d.credLabel} would unlock about ${d.jobsUnlocked} more jobs near you${pay}. It's one of the fastest ways to level up.`;
}

// Screening agent: tailored pre-qualifying questions + a short fit summary.
// d: { name, tradeLabels:[], jobTitle, reqCredLabels:[], missingCredLabels:[], available, hasTransport, payFloor, jobPayMax, distance }
async function screen(d){
  const ctx = `Candidate: ${d.name}, trades ${ (d.tradeLabels||[]).join(', ') }. Applying to "${d.jobTitle}". `
    + `Required credentials: ${ (d.reqCredLabels||[]).join(', ') || 'none listed' }. `
    + `Missing: ${ (d.missingCredLabels||[]).join(', ') || 'none' }. `
    + `Available now: ${d.available?'yes':'no'}. Own transport: ${d.hasTransport?'yes':'no'}. `
    + `Seeks $${d.payFloor||0}/hr; job pays up to $${d.jobPayMax||0}/hr.`;
  const prompt = `You are a hiring screener for the skilled trades. ${ctx}\n`
    + `Return ONLY JSON: {"questions":["...","..."],"summary":"..."}. `
    + `4-5 short, specific phone-screen questions that verify fit (licenses, hands-on experience, availability, reliability). `
    + `summary = one neutral sentence on overall fit and the main thing to verify. No commentary outside JSON.`;
  const out = await chat(prompt, 360, 9000);
  if (out){
    try {
      const s = out.indexOf('{'), e = out.lastIndexOf('}');
      if (s>=0 && e>=0){
        const j = JSON.parse(out.slice(s,e+1));
        if (Array.isArray(j.questions) && j.questions.length) return { questions: j.questions.slice(0,6).map(String), summary: String(j.summary||'') , ai:true };
      }
    } catch(e){}
  }
  // deterministic fallback
  const q = [];
  if ((d.missingCredLabels||[]).length) q.push(`You don't show ${d.missingCredLabels.join(' or ')} on file — do you hold it, and can you provide proof?`);
  q.push(`Walk me through your most recent ${ (d.tradeLabels||['trade'])[0] } project — scope, your role, and crew size.`);
  q.push(`Are you available to start ${d.available?'this week':'soon'}, and what shifts work for you?`);
  if (!d.hasTransport) q.push(`Do you have reliable transportation to the job site each day?`);
  q.push(`Our target is up to $${d.jobPayMax||0}/hr — does that work for you?`);
  const summary = `${d.name} matches the ${ (d.tradeLabels||['trade'])[0] } scope` + ((d.missingCredLabels||[]).length?`; verify ${d.missingCredLabels.join(', ')} before advancing.`:` and meets the listed credentials.`);
  return { questions: q.slice(0,5), summary, ai:false };
}

// Sourcing agent: a short reason this candidate was auto-sourced.
// d: { tradeLabel, jobTitle, score, reasons:[] }
async function sourceLine(d){
  const prompt = `In one short phrase (under 16 words), say why a ${d.tradeLabel} scoring ${d.score}/100 is a good auto-match for "${d.jobTitle}". Reasons: ${ (d.reasons||[]).join(', ') }. No quotes.`;
  const ai = await chat(prompt, 50, 5000);
  if (ai) return ai.replace(/^["']|["']$/g,'');
  return (d.reasons && d.reasons.length) ? d.reasons.join(' · ') : `Strong ${d.tradeLabel} match (${d.score}/100).`;
}

module.exports = { enabled, chat, workerAbout, translateBatch, coachLine, screen, sourceLine };
