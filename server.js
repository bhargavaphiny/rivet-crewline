'use strict';
/*
 * Rivet x Crewline - HTTP server.
 * Run:  node server.js   (or: npm start)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, init, hashPassword, verifyPassword, recomputeReadiness } = require('./db');
const M = require('./matching');
const V = require('./views');
const LLM = require('./llm');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.RIVET_SECRET || 'dev-secret-change-me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const googleEnabled = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const TWILIO_SID = process.env.TWILIO_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_FROM || '';
const smsEnabled = !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);

function normPhone(s){ return String(s||'').trim().replace(/[^\d+]/g,''); }
function validPhone(s){ return normPhone(s).replace(/\D/g,'').length >= 10; }
async function sendSms(to, body){
  if(!smsEnabled) return false;
  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method:'POST', headers:{ Authorization:`Basic ${auth}`, 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: TWILIO_FROM, To: to, Body: body }),
    });
    return r.ok;
  } catch(e){ console.error('sms send', e); return false; }
}

function baseUrl(req){
  const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'http';
  return `${proto}://${req.headers.host}`;
}
function getCookie(req, name){
  const c = (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
  return c ? c.slice(name.length+1) : null;
}
function isHttps(req){
  return (req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https' || !!(req.socket && req.socket.encrypted);
}
function secAttr(req){ return isHttps(req) ? '; Secure' : ''; }
function setSecurityHeaders(res){
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-inline'; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; " +
    "form-action 'self'; base-uri 'self'; frame-ancestors 'none'");
}

// ---------- session: signed cookie holding the user id (stateless) ----------
function sign(val){ return crypto.createHmac('sha256', SECRET).update(val).digest('hex').slice(0,32); }
function setSession(req, res, uid){
  const v = String(uid), token = `${v}.${sign(v)}`;
  res.setHeader('Set-Cookie', `sess=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secAttr(req)}`);
}
function clearSession(req, res){ res.setHeader('Set-Cookie', `sess=; HttpOnly; Path=/; Max-Age=0${secAttr(req)}`); }
async function getUser(req){
  const cookie = (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sess='));
  if(!cookie) return null;
  const token = cookie.slice(5);
  const [uid, sig] = token.split('.');
  if(!uid || sig !== sign(uid)) return null;
  const u = await db.prepare('SELECT id,email,role,name,company,company_about,company_website,company_city,company_size FROM users WHERE id=?').get(Number(uid));
  if(!u) return null;
  try { u.unread = (await db.prepare('SELECT COUNT(*) c FROM messages WHERE to_id=? AND read_at IS NULL').get(u.id)).c; }
  catch(e){ u.unread = 0; }
  return u;
}

// ---------- messaging helpers ----------
async function getConversations(meId){
  const ids = await db.prepare(`SELECT DISTINCT CASE WHEN from_id=? THEN to_id ELSE from_id END oid
    FROM messages WHERE from_id=? OR to_id=?`).all(meId, meId, meId);
  const convos = [];
  for(const { oid } of ids){
    const other = await db.prepare('SELECT id,name,company,role FROM users WHERE id=?').get(oid);
    if(!other) continue;
    const msgs = await db.prepare(`SELECT * FROM messages WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?)
      ORDER BY created_at, id`).all(meId, oid, oid, meId);
    other.unread = msgs.filter(m=>m.to_id===meId && !m.read_at).length;
    convos.push({ other, msgs, last: msgs[msgs.length-1] });
  }
  convos.sort((a,b)=> String(b.last&&b.last.created_at||'').localeCompare(String(a.last&&a.last.created_at||'')));
  return convos;
}
async function sendMessage(fromId, toId, body){
  const text = String(body||'').trim().slice(0,2000);
  if(!text) return false;
  await db.prepare('INSERT INTO messages(from_id,to_id,body) VALUES(?,?,?)').run(fromId, toId, text);
  return true;
}

// ---------- helpers ----------
function send(res, html, code=200){ res.writeHead(code, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); res.end(html); }
function redirect(res, loc){ res.writeHead(302, {Location: loc}); res.end(); }
function readBody(req){
  return new Promise(resolve=>{
    let b=''; req.on('data',c=>b+=c); req.on('end',()=>{
      const params = new URLSearchParams(b); const o={};
      for(const [k,v] of params){ if(o[k]!==undefined){ o[k]=[].concat(o[k],v);} else o[k]=v; }
      resolve(o);
    });
  });
}
function qid(p){ const m=p.match(/(\d+)/); return m?Number(m[1]):null; }

// ---------- data helpers ----------
const getProfile = uid => db.prepare('SELECT * FROM worker_profiles WHERE user_id=?').get(uid);
const getCreds   = uid => db.prepare('SELECT * FROM credentials WHERE user_id=? ORDER BY id').all(uid);
const getWorkHistory = uid => db.prepare('SELECT * FROM work_history WHERE user_id=? ORDER BY current DESC, COALESCE(end_year,9999) DESC, COALESCE(start_year,0) DESC, id DESC').all(uid);
const openJobs   = () => db.prepare(`SELECT j.*, u.company FROM jobs j JOIN users u ON u.id=j.employer_id WHERE j.status='open' ORDER BY j.created_at DESC`).all();

// normalize a checkbox field (string | array | undefined) to a clean list of valid trade keys
function normTrades(v){
  const arr = [].concat(v||[]).map(s=>String(s).trim()).filter(Boolean);
  const seen = new Set(); const out = [];
  for(const t of arr){ if(M.TRADES[t] && !seen.has(t)){ seen.add(t); out.push(t); } }
  return out;
}
// a candidate can hold multiple trades; score against the best-fitting one
function profTrades(p){
  const arr = String((p && (p.trades || p.trade)) || '').split(',').map(s=>s.trim()).filter(Boolean);
  return arr.length ? arr : (p && p.trade ? [p.trade] : []);
}
function bestMatch(prof, creds, job){
  const trades = profTrades(prof);
  if(!trades.length) return M.scoreMatch(prof, creds, job);
  let best = null;
  for(const tr of trades){ const r = M.scoreMatch({ ...prof, trade: tr }, creds, job); if(!best || r.score > best.score) best = r; }
  return best;
}

async function rankJobsForWorker(uid){
  const prof = await getProfile(uid); const creds = await getCreds(uid);
  const jobs = await openJobs();
  const home = prof ? await geocodeZip(prof.zip) : null;
  const zc = {};
  const out = [];
  for(const j of jobs){
    const r = bestMatch(prof, creds, j);
    let distance = null;
    if(home && j.zip){ if(!(j.zip in zc)) zc[j.zip] = await geocodeZip(j.zip); distance = zc[j.zip] ? haversineMi(home, zc[j.zip]) : null; }
    out.push({job:j, score:r.score, missing:r.missing, distance});
  }
  return out.sort((a,b)=>b.score-a.score);
}
// distance in miles between a worker's home ZIP and an arbitrary ZIP (cached; null if unknown)
async function workerDistance(prof, zip){
  if(!prof || !zip) return null;
  const home = await geocodeZip(prof.zip); if(!home) return null;
  const dest = await geocodeZip(zip); if(!dest) return null;
  return haversineMi(home, dest);
}
// Marketplace scale: realistic live-demand figures per metro so the map reflects
// platform scale (thousands), while the click panel still lists the real sample jobs.
const METRO_BASE = {
  'New York':5200,'Los Angeles':4800,'Chicago':3600,'Houston':3400,'Dallas':3100,'Phoenix':2900,
  'Atlanta':2700,'Miami':2300,'Seattle':2300,'San Francisco':2000,'Denver':2100,'Austin':1700,
  'Las Vegas':1600,'San Antonio':1500,'Minneapolis':1500,'Tampa':1400,'Detroit':1400,'Charlotte':1300,
  'Portland':1300,'Nashville':1200,'Salt Lake City':1100,'Columbus':1100,'Kansas City':1000,'Fresno':900,
  'Mesa':620,'Tempe':540,'Scottsdale':520,'Glendale':500,'Chandler':460,'Gilbert':420,
};
const metroDemand  = (city, real=0) => (METRO_BASE[city] || 600) + real*45;
const metroTalent  = (city, real=0) => Math.round((METRO_BASE[city] || 600) * 0.7) + real*30;

// aggregated candidate locations for the recruiter US map (with per-location candidate list)
async function candidateGeo(){
  const rows = await db.prepare(`SELECT u.id, u.name, p.city, p.zip, z.lat, z.lon, p.trade, p.readiness
    FROM worker_profiles p JOIN users u ON u.id=p.user_id JOIN zip_geo z ON z.zip=p.zip
    ORDER BY p.readiness DESC`).all();
  const byZip = {};
  for(const r of rows){
    const _k=r.city||r.zip; const b = byZip[_k] || (byZip[_k] = {city:r.city, lat:r.lat, lon:r.lon, real:0, items:[]});
    b.real++;
    if(b.items.length<12) b.items.push({ label:r.name, sub:`${M.TRADES[r.trade]||r.trade} · readiness ${r.readiness}`, href:`/console/candidates/${r.id}` });
  }
  return Object.values(byZip).map(b=>({...b, n: metroTalent(b.city, b.real)})).sort((a,b)=>b.n-a.n);
}
// ALL open-job locations (for the Pulse demand heat map)
async function jobGeoAll(){
  const rows = await db.prepare(`SELECT j.id, j.title, j.trade, j.pay_min, j.pay_max, j.zip, z.lat, z.lon, z.city, u.company
    FROM jobs j JOIN zip_geo z ON z.zip=j.zip JOIN users u ON u.id=j.employer_id WHERE j.status='open'`).all();
  const byZip = {};
  for(const r of rows){
    const _k=r.city||r.zip; const b = byZip[_k] || (byZip[_k] = {city:r.city, lat:r.lat, lon:r.lon, real:0, items:[]});
    b.real++;
    if(b.items.length<12) b.items.push({ label:`${r.title} · $${r.pay_min}–${r.pay_max}/hr`, sub:`${r.company||''} · ${M.TRADES[r.trade]||r.trade}`, href:`/jobs/${r.id}` });
  }
  return Object.values(byZip).map(b=>({...b, n: metroDemand(b.city, b.real)})).sort((a,b)=>b.n-a.n);
}
// open-job locations relevant to a worker: their trades (direct) + adjacent trades (related)
async function jobGeoForWorker(prof){
  const trades = profTrades(prof);
  if(!trades.length) return { points: [] };
  const direct = new Set(trades);
  const related = new Set();
  for(const t of trades) (M.ADJACENT[t]||[]).forEach(a=>{ if(!direct.has(a)) related.add(a); });
  const rows = await db.prepare(`SELECT j.id, j.title, j.trade, j.pay_min, j.pay_max, j.zip, z.lat, z.lon, z.city, u.company
    FROM jobs j JOIN zip_geo z ON z.zip=j.zip JOIN users u ON u.id=j.employer_id WHERE j.status='open'`).all();
  const byZip = {};
  for(const r of rows){
    const isDirect = direct.has(r.trade), isRelated = related.has(r.trade);
    if(!isDirect && !isRelated) continue;
    const _k=r.city||r.zip; const b = byZip[_k] || (byZip[_k] = {city:r.city, lat:r.lat, lon:r.lon, n:0, anyDirect:false, items:[]});
    b.n++; if(isDirect) b.anyDirect = true;
    b.items.push({ label:`${r.title} · $${r.pay_min}–${r.pay_max}/hr`, sub:`${r.company||''} · ${M.TRADES[r.trade]||r.trade}`, href:`/app/jobs/${r.id}` });
  }
  const points = Object.values(byZip).map(b=>({
    city:b.city, lat:b.lat, lon:b.lon, n:b.n, kind:b.anyDirect?'direct':'related', items:b.items
  })).sort((a,b)=>b.n-a.n);
  return { points };
}
async function rankWorkersForJob(job){
  const workers = await db.prepare(`SELECT u.id user_id,u.name,p.* FROM users u JOIN worker_profiles p ON p.user_id=u.id`).all();
  const out = [];
  for(const w of workers){ const creds=await getCreds(w.user_id); const r=bestMatch(w,creds,job);
    out.push({...w, score:r.score, readiness:w.readiness}); }
  return out.sort((a,b)=>b.score-a.score);
}

// ---------- geo / distance ----------
function haversineMi(a, b){
  if(!a || !b) return null;
  const R=3958.8, toRad=d=>d*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLon=toRad(b.lon-a.lon);
  const s=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(s)));
}
async function geocodeZip(zip){
  zip = String(zip||'').trim().slice(0,5);
  if(!/^\d{5}$/.test(zip)) return null;
  try {
    const cached = await db.prepare('SELECT lat,lon FROM zip_geo WHERE zip=?').get(zip);
    if(cached && cached.lat!=null) return { lat:cached.lat, lon:cached.lon };
    const opts = (typeof AbortSignal!=='undefined' && AbortSignal.timeout) ? { signal: AbortSignal.timeout(2500) } : {};
    const r = await fetch(`https://api.zippopotam.us/us/${zip}`, opts);
    if(!r.ok) return null;
    const j = await r.json();
    const place = j.places && j.places[0];
    if(!place) return null;
    const lat = parseFloat(place.latitude), lon = parseFloat(place.longitude);
    if(isNaN(lat) || isNaN(lon)) return null;
    try { await db.prepare('INSERT OR IGNORE INTO zip_geo(zip,lat,lon,city) VALUES(?,?,?,?)').run(zip, lat, lon, place['place name']||''); } catch(e){}
    return { lat, lon };
  } catch(e){ return null; }
}

// ---------- i18n: LLM-translated UI strings, cached in DB (English fallback) ----------
const ES = new Map();
async function loadTranslations(){
  try {
    const rows = await db.prepare("SELECT src,dst FROM translations WHERE lang='es'").all();
    for(const r of rows) ES.set(r.src, r.dst);
  } catch(e){}
  V.setEs(ES);
}
// Pre-warm the Spanish cache at boot: render key pages in es to collect every
// T()-wrapped string, then batch-translate via Groq so the first es page is Spanish.
async function prewarmEs(){
  if(!LLM.enabled) return;
  try {
    const stubUser = { id:0, name:'Demo', company:'Demo Co', mode:'worker' };
    const stubProf = { trades:'electrician', trade:'electrician', city:'Phoenix', zip:'85004', years_exp:5, pay_floor:30, shift:'Day', readiness:80, available:1 };
    V.setLang('es');
    const renders = [
      ()=>V.workerOnboard(),
      ()=>V.workerJobs({matches:[], filters:{}, jobsGeo:{points:[]}}),
      ()=>V.workerProfile({user:stubUser, profile:stubProf, creds:[], work:[]}),
      ()=>V.workerApplications({apps:[], savedJobs:[]}),
      ()=>V.workerTraining({have:[]}),
      ()=>V.empCompany({user:stubUser}),
      ()=>V.empSearch({rows:[], filters:{}}),
      ()=>V.empJobForm(),
      ()=>V.empOverview({user:stubUser, kpis:{openJobs:0,pool:0,pipeline:0,hired:0,applicants:0}, funnel:{}, recent:[], hot:[], alerts:[], fillRate:0, geo:[]}),
    ];
    for(const r of renders){ try { r(); } catch(e){} }
    V.setLang('en');
    let misses = V.drainEsMisses().filter(s=>!ES.has(s));
    while(misses.length){
      const batch = misses.splice(0, 25);
      const map = await LLM.translateBatch(batch, 'Spanish');
      for(const [src,dst] of Object.entries(map)){
        ES.set(src, dst);
        try { await db.prepare("INSERT OR IGNORE INTO translations(lang,src,dst) VALUES('es',?,?)").run(src, dst); } catch(e){}
      }
    }
    console.log('[i18n] Spanish cache pre-warmed');
  } catch(e){ V.setLang('en'); }
}
let trBusy = false;
async function fillTranslations(){
  if(trBusy || !LLM.enabled) return;
  const misses = V.drainEsMisses();
  if(!misses.length) return;
  trBusy = true;
  try {
    let pending = misses.slice();
    while(pending.length){
      const batch = pending.splice(0, 25);
      const map = await LLM.translateBatch(batch, 'Spanish');
      for(const [src,dst] of Object.entries(map)){
        ES.set(src, dst);
        try { await db.prepare("INSERT OR IGNORE INTO translations(lang,src,dst) VALUES('es',?,?)").run(src, dst); } catch(e){}
      }
    }
  } catch(e){ /* non-fatal */ } finally { trBusy = false; }
}

// ---------- router ----------
const server = http.createServer(async (req,res)=>{
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname, method = req.method;
  const user = await getUser(req);
  if(user) user.mode = p.startsWith('/console') ? 'employer' : (p.startsWith('/app') ? 'worker' : user.role);
  const isEs = getCookie(req,'lang')==='es';
  V.setLang(isEs ? 'es' : 'en');
  if(isEs && LLM.enabled) res.on('finish', ()=> setImmediate(fillTranslations));

  try {
    setSecurityHeaders(res);
    // language toggle
    const lm = p.match(/^\/lang\/(en|es)$/);
    if(lm){
      res.setHeader('Set-Cookie', `lang=${lm[1]}; Path=/; Max-Age=31536000; SameSite=Lax${secAttr(req)}`);
      let back='/'; try { const u=new URL(req.headers.referer||''); if(u.host===req.headers.host) back=u.pathname+u.search; } catch(e){}
      return redirect(res, back);
    }
    // static & utility
    if(p==='/styles.css'){ res.writeHead(200,{'Content-Type':'text/css','Cache-Control':'no-cache'}); return res.end(fs.readFileSync(path.join(__dirname,'styles.css'))); }
    if(p==='/og.svg'){ res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=86400'}); return res.end(V.ogImage()); }
    if(p==='/healthz'){ res.writeHead(200,{'Content-Type':'text/plain'}); return res.end('ok'); }
    if(p==='/robots.txt'){ res.writeHead(200,{'Content-Type':'text/plain'}); return res.end('User-agent: *\nAllow: /\nAllow: /jobs\nDisallow: /app\nDisallow: /console\nDisallow: /auth\n\nSitemap: https://rivet-crewline.onrender.com/sitemap.xml\n'); }
    if(p==='/sitemap.xml'){
      const ids = await db.prepare("SELECT id FROM jobs WHERE status='open' ORDER BY id DESC LIMIT 1000").all();
      const urls = ['https://rivet-crewline.onrender.com/','https://rivet-crewline.onrender.com/pulse']
        .concat(ids.map(r=>`https://rivet-crewline.onrender.com/jobs/${r.id}`));
      res.writeHead(200,{'Content-Type':'application/xml'});
      return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${u}</loc></url>`).join('')}</urlset>`);
    }

    // ---- public, crawlable job page (Google for Jobs) ----
    const pj = p.match(/^\/jobs\/(\d+)$/);
    if(pj && method==='GET'){
      const job = await db.prepare(`SELECT j.*,u.company,u.company_about,u.company_city,u.company_size FROM jobs j JOIN users u ON u.id=j.employer_id WHERE j.id=?`).get(Number(pj[1]));
      if(!job) return send(res, V.layout({title:'Job not found',user,body:'<section class="wrap"><div class="card"><h2>Job not found</h2><p><a href="/">Browse all jobs</a></p></div></section>'}),404);
      const rules = M.localRules(job.city);
      const ETMAP = {'Full-time':'FULL_TIME','Part-time':'PART_TIME','Contract':'CONTRACTOR','Temp':'TEMPORARY','Apprenticeship':'OTHER','Outcome-based':'CONTRACTOR'};
      const ld = {
        '@context':'https://schema.org/','@type':'JobPosting',
        title: job.title, description: `<p>${String(job.descr||job.title)}</p>`,
        datePosted: String(job.created_at||'').replace(' ','T'),
        employmentType: ETMAP[job.employment_type]||'FULL_TIME',
        hiringOrganization: { '@type':'Organization', name: job.company||'Employer' },
        jobLocation: { '@type':'Place', address: { '@type':'PostalAddress', addressLocality: job.city||'', addressRegion: (rules&&rules.state)||'', postalCode: job.zip||'', addressCountry:'US' } },
        baseSalary: { '@type':'MonetaryAmount', currency:'USD', value: { '@type':'QuantitativeValue', minValue: job.pay_min||0, maxValue: job.pay_max||0, unitText:'HOUR' } },
      };
      const jsonld = JSON.stringify(ld).replace(/</g,'\\u003c');
      return send(res, V.layout({title:`${job.title} — ${job.company||'Hiring'} (${job.city})`, user, body:V.publicJob({job, rules, jsonld})}));
    }

    // ---- Industry Pulse (trends + community board) — open to all ----
    if(p==='/pulse' && method==='GET'){
      const trending = await db.prepare(`SELECT trade, COUNT(*) n FROM jobs WHERE status='open' GROUP BY trade ORDER BY n DESC LIMIT 8`).all();
      const totalOpen = (await db.prepare(`SELECT COUNT(*) c FROM jobs WHERE status='open'`).get()).c;
      const posts = await db.prepare(`SELECT * FROM posts ORDER BY created_at DESC, id DESC LIMIT 40`).all();
      const companies = await db.prepare(`SELECT u.company, u.company_city, COUNT(*) n FROM jobs j JOIN users u ON u.id=j.employer_id
        WHERE j.status='open' AND u.company IS NOT NULL AND u.company<>'' GROUP BY u.id ORDER BY n DESC LIMIT 8`).all();
      const demandGeo = await jobGeoAll();
      return send(res, V.layout({title:'Industry Pulse', user, active:'pulse', body:V.pulsePage({user, trending, posts, totalOpen, companies, demandGeo})}));
    }
    if(p==='/pulse' && method==='POST'){
      if(!user) return redirect(res, '/login');
      const b = await readBody(req);
      const body = String(b.body||'').trim().slice(0,600);
      if(body){
        const prof = await getProfile(user.id);
        const trade = prof ? (profTrades(prof)[0]||null) : null;
        try { await db.prepare('INSERT INTO posts(author_id,author_name,trade,body) VALUES(?,?,?,?)').run(user.id, user.name, trade, body); } catch(e){}
      }
      return redirect(res, '/pulse');
    }

    // ---- public ----
    if(p==='/' && method==='GET'){
      if(user) return redirect(res, user.role==='employer'?'/console':'/app');
      const demandGeo = await jobGeoAll();
      return send(res, V.layout({title:'Hire & get hired in the trades', user:null, body:V.landing(demandGeo)}));
    }
    if(p==='/signup' && method==='GET')
      return send(res, V.layout({title:'Sign up', user:null, body:V.authForm('signup',{role:url.searchParams.get('role')||'worker', google:googleEnabled})}));
    if(p==='/login' && method==='GET')
      return send(res, V.layout({title:'Log in', user:null, body:V.authForm('login',{google:googleEnabled})}));

    // ---- phone (SMS OTP) login ----
    if(p==='/phone' && method==='GET')
      return send(res, V.layout({title:'Phone sign in', user:null, body:V.phoneStart({role:url.searchParams.get('role')||'worker'})}));
    if(p==='/phone/start' && method==='POST'){
      const b = await readBody(req);
      const role = b.role==='employer'?'employer':'worker';
      const name = String(b.name||'').trim().slice(0,80);
      const ph = normPhone(b.phone);
      if(!validPhone(ph)) return send(res, V.layout({title:'Phone sign in',user:null,body:V.phoneStart({role,name,phone:b.phone,error:'Enter a valid phone number (10+ digits, include country code).'})}));
      const code = String(Math.floor(100000 + Math.random()*900000));
      await db.prepare("INSERT INTO otp(phone,code,expires,role,name) VALUES(?,?,datetime('now','+10 minutes'),?,?) ON CONFLICT(phone) DO UPDATE SET code=excluded.code, expires=excluded.expires, role=excluded.role, name=excluded.name, created_at=datetime('now')").run(ph, code, role, name);
      await sendSms(ph, `${code} is your Rivet × Crewline verification code.`);
      return send(res, V.layout({title:'Enter code',user:null,body:V.phoneVerify({phone:ph, demoCode: smsEnabled ? '' : code})}));
    }
    if(p==='/phone/verify' && method==='POST'){
      const b = await readBody(req);
      const ph = normPhone(b.phone);
      const code = String(b.code||'').trim();
      const row = await db.prepare("SELECT * FROM otp WHERE phone=? AND code=? AND expires > datetime('now')").get(ph, code);
      if(!row) return send(res, V.layout({title:'Enter code',user:null,body:V.phoneVerify({phone:ph, demoCode:'', error:'That code is invalid or expired. Try again.'})}));
      let u = await db.prepare('SELECT * FROM users WHERE phone=?').get(ph);
      const role = row.role==='employer'?'employer':'worker';
      if(!u){
        const email = `phone_${ph.replace(/\D/g,'')}@phone.rivet.local`;
        const placeholder = hashPassword(crypto.randomBytes(24).toString('hex'));
        try {
          const r = await db.prepare('INSERT INTO users(email,phone,pass,role,name,company) VALUES(?,?,?,?,?,?)')
            .run(email, ph, placeholder, role, row.name || ph, null);
          u = { id:r.lastInsertRowid, role };
        } catch(e){ u = await db.prepare('SELECT * FROM users WHERE phone=?').get(ph); }
      }
      await db.prepare('DELETE FROM otp WHERE phone=?').run(ph);
      if(!u) return redirect(res,'/phone');
      setSession(req, res, u.id);
      return redirect(res, u.role==='employer' ? '/console' : '/app');
    }

    // ---- public shareable portfolio ----
    const pp = p.match(/^\/p\/(\d+)$/);
    if(pp && method==='GET'){
      const wid = Number(pp[1]);
      const worker = await db.prepare('SELECT id,name FROM users WHERE id=?').get(wid);
      const profile = worker ? await getProfile(wid) : null;
      if(!worker || !profile) return send(res, V.layout({title:'Not found',user,body:'<section class="wrap"><div class="card"><h2>Portfolio not found</h2><p><a href="/">Home</a></p></div></section>'}),404);
      const creds = await getCreds(wid);
      const portfolio = await db.prepare("SELECT * FROM media WHERE user_id=? AND target='portfolio' ORDER BY created_at DESC, id DESC").all(wid);
      const work = await getWorkHistory(wid);
      return send(res, V.layout({title:`${worker.name} — Trades portfolio`, user, body:V.publicPortfolio({worker,profile,creds,portfolio,work})}));
    }

    if(p==='/signup' && method==='POST'){
      const b = await readBody(req);
      const role = b.role==='employer'?'employer':'worker';
      if(!b.email||!b.pass||!b.name) return send(res, V.layout({title:'Sign up',user:null,body:V.authForm('signup',{role,google:googleEnabled,error:'All fields are required.'})}));
      try{
        const info = await db.prepare('INSERT INTO users(email,pass,role,name,company) VALUES(?,?,?,?,?)')
          .run(b.email.toLowerCase().trim(), hashPassword(b.pass), role, b.name.trim(), role==='employer'?(b.company||'').trim():null);
        setSession(req, res, info.lastInsertRowid);
        return redirect(res, role==='employer'?'/console':'/app/onboard');
      }catch(e){
        return send(res, V.layout({title:'Sign up',user:null,body:V.authForm('signup',{role,google:googleEnabled,error:'That email is already registered.'})}));
      }
    }
    if(p==='/login' && method==='POST'){
      const b = await readBody(req);
      const u = await db.prepare('SELECT * FROM users WHERE email=?').get((b.email||'').toLowerCase().trim());
      if(!u || !verifyPassword(b.pass||'', u.pass))
        return send(res, V.layout({title:'Log in',user:null,body:V.authForm('login',{google:googleEnabled,error:'Invalid email or password.'})}));
      setSession(req, res, u.id);
      return redirect(res, u.role==='employer'?'/console':'/app');
    }
    if(p==='/logout'){ clearSession(req, res); return redirect(res,'/'); }

    // ---- Google OAuth (only active when GOOGLE_CLIENT_ID/SECRET are set) ----
    if(p==='/auth/google' && method==='GET'){
      if(!googleEnabled) return redirect(res,'/login');
      const role = url.searchParams.get('role')==='employer' ? 'employer' : 'worker';
      const state = `${crypto.randomBytes(16).toString('hex')}:${role}`;
      res.setHeader('Set-Cookie', `gstate=${state}.${sign(state)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600${secAttr(req)}`);
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: `${baseUrl(req)}/auth/google/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account',
      });
      return redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    }
    if(p==='/auth/google/callback' && method==='GET'){
      if(!googleEnabled) return redirect(res,'/login');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state') || '';
      const cookie = getCookie(req,'gstate') || '';
      const dot = cookie.lastIndexOf('.');
      const cState = dot>0 ? cookie.slice(0,dot) : '';
      const cSig = dot>0 ? cookie.slice(dot+1) : '';
      if(!code || !state || state!==cState || sign(state)!==cSig) return redirect(res,'/login');
      const role = state.split(':')[1]==='employer' ? 'employer' : 'worker';
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body: new URLSearchParams({
            code, client_id:GOOGLE_CLIENT_ID, client_secret:GOOGLE_CLIENT_SECRET,
            redirect_uri:`${baseUrl(req)}/auth/google/callback`, grant_type:'authorization_code',
          }),
        });
        const tok = await tokenRes.json();
        if(!tok.access_token) throw new Error('token exchange failed');
        const uiRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers:{ Authorization:`Bearer ${tok.access_token}` },
        });
        const gu = await uiRes.json();
        if(!gu.email) throw new Error('no email from Google');
        const email = String(gu.email).toLowerCase().trim();
        let u = await db.prepare('SELECT * FROM users WHERE email=?').get(email);
        if(!u){
          const placeholder = hashPassword(crypto.randomBytes(24).toString('hex'));
          const r = await db.prepare('INSERT INTO users(email,pass,role,name,company) VALUES(?,?,?,?,?)')
            .run(email, placeholder, role, gu.name || email.split('@')[0], null);
          u = { id:r.lastInsertRowid, role };
        }
        setSession(req, res, u.id);
        return redirect(res, u.role==='employer' ? '/console' : '/app');
      } catch(e){
        console.error('google oauth', e);
        return redirect(res,'/login');
      }
    }

    // ---- worker (Rivet) ----
    if(p.startsWith('/app')){
      if(!user) return redirect(res,'/login');
      let prof = await getProfile(user.id);

      if(p==='/app/onboard' && method==='GET') return send(res, V.layout({title:'Set up',user,active:'',body:V.workerOnboard()}));
      if(p==='/app/onboard' && method==='POST'){
        const b = await readBody(req);
        const trades = normTrades(b.trades);
        const trade = trades[0] || b.trade || 'electrician';
        const tradesCsv = (trades.length?trades:[trade]).join(',');
        const headline = String(b.headline||'').slice(0,80);
        const about = String(b.about||'').slice(0,600);
        const vals = [trade, tradesCsv, headline, about, Number(b.years_exp)||0, b.city||'', b.zip||'', Number(b.pay_floor)||0, b.shift||'Any'];
        if(prof) await db.prepare('UPDATE worker_profiles SET trade=?,trades=?,headline=?,about=?,years_exp=?,city=?,zip=?,pay_floor=?,shift=? WHERE user_id=?').run(...vals,user.id);
        else await db.prepare('INSERT INTO worker_profiles(user_id,trade,trades,headline,about,years_exp,city,zip,pay_floor,shift) VALUES(?,?,?,?,?,?,?,?,?,?)').run(user.id,...vals);
        await recomputeReadiness(user.id);
        return redirect(res,'/app');
      }

      if(p==='/app/messages' && method==='GET'){
        await db.prepare("UPDATE messages SET read_at=datetime('now') WHERE to_id=? AND read_at IS NULL").run(user.id);
        const convos = await getConversations(user.id);
        return send(res, V.layout({title:'Messages',user:{...user,unread:0},active:'msgs',body:V.inbox({convos, base:'/app', meId:user.id})}));
      }
      const wMsg = p.match(/^\/app\/messages\/(\d+)$/);
      if(wMsg && method==='POST'){
        const b = await readBody(req);
        await sendMessage(user.id, Number(wMsg[1]), b.body);
        return redirect(res, '/app/messages');
      }

      // First login: never show an empty app. Auto-create a blank Work Card so every
      // page renders populated (all open jobs + full demand map), with a gentle setup nudge.
      if(!prof){
        try { await db.prepare("INSERT INTO worker_profiles(user_id,trade,trades,city,zip,pay_floor,shift,available) VALUES(?,'','','','',0,'Any',1)").run(user.id); } catch(e){}
        prof = await getProfile(user.id);
      }
      const isNewWorker = !(prof && (prof.trades || prof.trade));

      if(p==='/app' && method==='GET'){
        const creds = await getCreds(user.id);
        const workCount = (await db.prepare('SELECT COUNT(*) c FROM work_history WHERE user_id=?').get(user.id)).c;
        const portCount = (await db.prepare("SELECT COUNT(*) c FROM media WHERE user_id=? AND target='portfolio'").get(user.id)).c;
        // new users (no trade yet): show the FULL national demand map + recent open jobs, unscored
        const jobsGeo = isNewWorker ? { points: await jobGeoAll() } : await jobGeoForWorker(prof);
        let matches = await rankJobsForWorker(user.id);
        if(isNewWorker){ matches = matches.slice().sort((a,b)=> (b.job.id||0)-(a.job.id||0)); }
        return send(res, V.layout({title:'Home',user,active:'home',body:V.workerHome({user,profile:prof,creds,matches,workCount,portCount,jobsGeo,isNew:isNewWorker})}));
      }
      if(p==='/app/jobs' && method==='GET'){
        const f = {
          q:(url.searchParams.get('q')||'').trim(),
          trade:url.searchParams.get('trade')||'',
          city:(url.searchParams.get('city')||'').trim(),
          minpay:Number(url.searchParams.get('minpay'))||0,
          shift:url.searchParams.get('shift')||'',
          jtype:url.searchParams.get('jtype')||'',
          maxmi:Number(url.searchParams.get('maxmi'))||0,
          sort:url.searchParams.get('sort')||'',
        };
        let matches = await rankJobsForWorker(user.id);
        if(f.q){ const q=f.q.toLowerCase(); matches=matches.filter(m=>(m.job.title||'').toLowerCase().includes(q)||(m.job.company||'').toLowerCase().includes(q)); }
        if(f.trade) matches=matches.filter(m=>m.job.trade===f.trade);
        if(f.city){ const c=f.city.toLowerCase(); matches=matches.filter(m=>(m.job.city||'').toLowerCase().includes(c)); }
        if(f.minpay) matches=matches.filter(m=>(m.job.pay_max||0)>=f.minpay);
        if(f.shift) matches=matches.filter(m=>m.job.shift===f.shift);
        if(f.jtype) matches=matches.filter(m=>(m.job.employment_type||'Full-time')===f.jtype);
        // distance is precomputed in rankJobsForWorker (cached; null when geo unavailable)
        if(f.maxmi) matches = matches.filter(m=> m.distance!=null && m.distance<=f.maxmi);
        if(f.sort==='distance') matches.sort((a,b)=> (a.distance==null?1e9:a.distance)-(b.distance==null?1e9:b.distance));
        const jobsGeo = await jobGeoForWorker(prof);
        return send(res, V.layout({title:'Find work',user,active:'jobs',body:V.workerJobs({matches, filters:f, jobsGeo})}));
      }
      if(p==='/app/profile' && method==='GET'){
        const portfolio = await db.prepare("SELECT * FROM media WHERE user_id=? AND target='portfolio' ORDER BY created_at DESC, id DESC").all(user.id);
        const work = await getWorkHistory(user.id);
        return send(res, V.layout({title:'Work Card',user,active:'profile',body:V.workerProfile({user,profile:prof,creds:await getCreds(user.id),portfolio,work})}));
      }
      if(p==='/app/profile/details' && method==='POST'){
        const b = await readBody(req);
        const trades = normTrades(b.trades);
        const trade = trades[0] || prof.trade;
        const tradesCsv = (trades.length?trades:[trade]).join(',');
        await db.prepare('UPDATE worker_profiles SET trade=?,trades=?,headline=?,about=?,custom_trade=? WHERE user_id=?')
          .run(trade, tradesCsv, String(b.headline||'').slice(0,80), String(b.about||'').slice(0,600), String(b.custom_trade||'').slice(0,60), user.id);
        await recomputeReadiness(user.id);
        return redirect(res,'/app/profile');
      }
      if(p==='/app/experience' && method==='POST'){
        const b = await readBody(req);
        const role = String(b.role||'').trim().slice(0,80);
        if(role){
          const sy = Number(b.start_year)||null, ey = Number(b.end_year)||null;
          await db.prepare(`INSERT INTO work_history(user_id,employer,role,trade,city,start_year,end_year,current,description)
            VALUES(?,?,?,?,?,?,?,?,?)`).run(user.id,
            String(b.employer||'').slice(0,80), role, String(b.trade||'').slice(0,40), String(b.city||'').slice(0,60),
            sy, ey, ey?0:1, String(b.description||'').slice(0,400));
        }
        return redirect(res,'/app/profile');
      }
      const expDel = p.match(/^\/app\/experience\/(\d+)\/delete$/);
      if(expDel && method==='POST'){
        await db.prepare('DELETE FROM work_history WHERE id=? AND user_id=?').run(Number(expDel[1]), user.id);
        return redirect(res,'/app/profile');
      }
      if(p==='/app/credentials' && method==='POST'){
        const b = await readBody(req);
        if(b.kind) await db.prepare('INSERT INTO credentials(user_id,kind,name,verified,expires) VALUES(?,?,?,1,?)')
          .run(user.id, b.kind, M.CRED_KINDS[b.kind]||b.kind, b.expires||null);
        await recomputeReadiness(user.id);
        return redirect(res,'/app/profile');
      }
      if(p==='/app/portfolio' && method==='POST'){
        const b = await readBody(req);
        const url = String(b.url||'').trim().slice(0,1000);
        const title = String(b.title||'').trim().slice(0,140);
        const caption = String(b.caption||'').trim().slice(0,300);
        if(/^https?:\/\//i.test(url)){
          const kind = /youtube|youtu\.be|vimeo/i.test(url) ? 'video' : 'image';
          await db.prepare("INSERT INTO media(user_id,target,kind,url,title,caption) VALUES(?,'portfolio',?,?,?,?)").run(user.id, kind, url, title, caption);
        }
        return redirect(res,'/app/profile');
      }
      const pDel = p.match(/^\/app\/portfolio\/(\d+)\/delete$/);
      if(pDel && method==='POST'){
        await db.prepare("DELETE FROM media WHERE id=? AND user_id=? AND target='portfolio'").run(Number(pDel[1]), user.id);
        return redirect(res,'/app/profile');
      }
      if(['/app/available','/app/work-today','/app/alerts','/app/relocate','/app/tools','/app/transport','/app/bilingual'].includes(p) && method==='POST'){
        const col = { '/app/available':'available', '/app/work-today':'work_today', '/app/alerts':'alerts', '/app/relocate':'relocate', '/app/tools':'has_tools', '/app/transport':'has_transport', '/app/bilingual':'bilingual' }[p];
        const b = await readBody(req);
        const cur = prof && prof[col] ? 1 : 0;
        await db.prepare(`UPDATE worker_profiles SET ${col}=? WHERE user_id=?`).run(cur?0:1, user.id);
        return redirect(res, b.next==='/app' ? '/app' : '/app/profile');
      }
      if(p==='/app/profile/suggest-about' && method==='POST'){
        const tradeLabels = profTrades(prof).map(t=>M.TRADES[t]||t);
        const wh = await getWorkHistory(user.id);
        const workLines = wh.slice(0,3).map(w=>`${w.role||''}${w.employer?` at ${w.employer}`:''}`.trim()).filter(Boolean);
        const about = await LLM.workerAbout({ name:user.name, tradeLabels, years:prof.years_exp, city:prof.city, workLines });
        if(about) await db.prepare('UPDATE worker_profiles SET about=? WHERE user_id=?').run(about.slice(0,600), user.id);
        return redirect(res,'/app/profile');
      }
      if(p==='/app/training' && method==='GET'){
        const have = (await getCreds(user.id)).map(c=>c.kind);
        return send(res, V.layout({title:'Learn & get certified',user,active:'training',body:V.workerTraining({have})}));
      }
      if(p==='/app/applications' && method==='GET'){
        const apps = await db.prepare(`SELECT a.*, j.title,j.trade,j.pay_min,j.pay_max,j.city,j.zip,u.company
          FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=j.employer_id
          WHERE a.worker_id=? ORDER BY a.created_at DESC`).all(user.id);
        const savedJobs = await db.prepare(`SELECT j.*, u.company FROM saved_jobs s
          JOIN jobs j ON j.id=s.job_id JOIN users u ON u.id=j.employer_id
          WHERE s.worker_id=? ORDER BY s.created_at DESC`).all(user.id);
        const home = await geocodeZip(prof.zip);
        const zc = {};
        const dist = async z => { if(!home||!z) return null; if(!(z in zc)) zc[z]=await geocodeZip(z); return zc[z]?haversineMi(home,zc[z]):null; };
        for(const a of apps) a.distance = await dist(a.zip);
        for(const j of savedJobs) j.distance = await dist(j.zip);
        return send(res, V.layout({title:'Applications',user,active:'apps',body:V.workerApplications({apps, savedJobs})}));
      }
      const jid = qid(p);
      if(jid && p===`/app/jobs/${jid}/save` && method==='POST'){
        const exists = await db.prepare('SELECT 1 FROM saved_jobs WHERE worker_id=? AND job_id=?').get(user.id, jid);
        if(exists) await db.prepare('DELETE FROM saved_jobs WHERE worker_id=? AND job_id=?').run(user.id, jid);
        else { try { await db.prepare('INSERT INTO saved_jobs(worker_id,job_id) VALUES(?,?)').run(user.id, jid); } catch(e){} }
        return redirect(res, `/app/jobs/${jid}`);
      }
      if(jid && p===`/app/jobs/${jid}` && method==='GET'){
        const job = await db.prepare(`SELECT j.*,u.company,u.company_about,u.company_website,u.company_city,u.company_size FROM jobs j JOIN users u ON u.id=j.employer_id WHERE j.id=?`).get(jid);
        if(!job) return send(res, V.layout({title:'Not found',user,body:'<section class="wrap"><div class="card">Job not found.</div></section>'}),404);
        const match = bestMatch(prof, await getCreds(user.id), job);
        const applied = !!(await db.prepare('SELECT 1 FROM applications WHERE job_id=? AND worker_id=?').get(jid,user.id));
        const saved = !!(await db.prepare('SELECT 1 FROM saved_jobs WHERE worker_id=? AND job_id=?').get(user.id, jid));
        const jobMedia = await db.prepare("SELECT * FROM media WHERE job_id=? AND target='job' ORDER BY created_at DESC, id DESC").all(jid);
        const distance = await workerDistance(prof, job.zip);
        const rules = M.localRules(job.city);
        return send(res, V.layout({title:job.title,user,active:'jobs',body:V.jobDetail({job,match,applied,saved,jobMedia,distance,rules})}));
      }
      if(jid && p===`/app/jobs/${jid}/apply` && method==='POST'){
        const job = await db.prepare('SELECT * FROM jobs WHERE id=?').get(jid);
        if(job){ const m=bestMatch(prof,await getCreds(user.id),job);
          try{ await db.prepare('INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,?,?)').run(jid,user.id,'Sourced',m.score); }catch(e){}
        }
        return redirect(res, `/app/jobs/${jid}`);
      }
    }

    // ---- employer (Crewline) ----
    if(p.startsWith('/console')){
      if(!user) return redirect(res,'/login');

      if(p==='/console' && method==='GET'){
        const jobs = await db.prepare(`SELECT * FROM jobs WHERE employer_id=?`).all(user.id);
        const jobIds = jobs.map(j=>j.id);
        const ph = jobIds.map(()=>'?').join(',');
        const funnel = {Sourced:0,Screened:0,Interview:0,Offer:0,Hired:0};
        let recent = [];
        if(jobIds.length){
          const rows = await db.prepare(`SELECT stage, COUNT(*) c FROM applications WHERE job_id IN (${ph}) GROUP BY stage`).all(...jobIds);
          for(const r of rows){ if(funnel[r.stage]!==undefined) funnel[r.stage]=r.c; }
          recent = await db.prepare(`SELECT a.created_at,a.stage,u.id worker_id,u.name,j.title
            FROM applications a JOIN users u ON u.id=a.worker_id JOIN jobs j ON j.id=a.job_id
            WHERE a.job_id IN (${ph}) ORDER BY a.created_at DESC, a.id DESC LIMIT 6`).all(...jobIds);
        }
        const applicants = Object.values(funnel).reduce((a,b)=>a+b,0);
        const pipeline = applicants - funnel.Sourced;
        const hired = funnel.Hired;
        const fillRate = applicants ? Math.round((hired/applicants)*100) : 0;
        const pool = (await db.prepare(`SELECT COUNT(*) c FROM worker_profiles`).get()).c;
        const hot = await db.prepare(`SELECT u.id,u.name,p.trade,p.readiness,(SELECT COUNT(*) FROM credentials c WHERE c.user_id=u.id AND c.verified=1) vcount
          FROM users u JOIN worker_profiles p ON p.user_id=u.id ORDER BY p.readiness DESC LIMIT 5`).all();
        const alerts = [];
        const expiring = (await db.prepare(`SELECT COUNT(*) c FROM credentials WHERE verified=1 AND expires IS NOT NULL AND expires < '2026-08'`).get()).c;
        if(expiring) alerts.push({lvl:'warn',text:`${expiring} credential(s) in the pool expiring within 60 days.`});
        if(pipeline) alerts.push({lvl:'info',text:`${pipeline} candidate(s) advancing in your pipeline.`});
        alerts.push({lvl:'ok',text:`${pool} verified workers available to match right now.`});
        const geo = await candidateGeo();
        const talentTotal = geo.reduce((a,g)=>a+(g.n||0),0);
        return send(res, V.layout({title:'Overview',user,active:'ov',body:V.empOverview({user,
          kpis:{openJobs:jobs.filter(j=>j.status==='open').length, pool, applicants, pipeline, hired}, funnel, recent, hot, alerts, fillRate, geo, isNew:jobs.length===0, talentTotal})}));
      }
      if(p==='/console/analytics' && method==='GET'){
        const jobs = await db.prepare('SELECT * FROM jobs WHERE employer_id=?').all(user.id);
        const jobIds = jobs.map(j=>j.id);
        const ph = jobIds.map(()=>'?').join(',');
        let apps = [];
        if(jobIds.length){
          apps = await db.prepare(`SELECT a.created_at, a.stage, a.score, j.trade, j.title, j.id job_id
            FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.job_id IN (${ph})`).all(...jobIds);
        }
        const totalApps = apps.length;
        const order = V.STAGES;
        const sidx = s => order.indexOf(s);
        const conv = order.map((s,i)=>{ const reached = apps.filter(a=>sidx(a.stage)>=i).length;
          return {stage:s, reached, pct: totalApps ? Math.round((reached/totalApps)*100) : 0}; });
        const pipeline = apps.filter(a=>a.stage!=='Sourced').length;
        const hired = apps.filter(a=>a.stage==='Hired').length;
        const offers = apps.filter(a=>a.stage==='Offer'||a.stage==='Hired').length;
        const fillRate = offers ? Math.round((hired/offers)*100) : 0;
        const avgScore = totalApps ? Math.round(apps.reduce((s,a)=>s+(a.score||0),0)/totalApps) : 0;
        const now = Date.now(), DAY = 864e5;
        const weekly = [];
        for(let w=7; w>=0; w--){
          const start = now-(w+1)*7*DAY, end = now-w*7*DAY;
          const n = apps.filter(a=>{ const t=Date.parse(String(a.created_at||'').replace(' ','T')+'Z'); return t>=start && t<end; }).length;
          const d = new Date(end-3*DAY);
          weekly.push({label:`${d.getMonth()+1}/${d.getDate()}`, n});
        }
        const tmap={}; for(const a of apps){ tmap[a.trade]=(tmap[a.trade]||0)+1; }
        const topTrades = Object.entries(tmap).map(([trade,n])=>({trade,n})).sort((a,b)=>b.n-a.n).slice(0,6);
        const jmap={}; for(const a of apps){ const k=a.job_id; (jmap[k]=jmap[k]||{id:a.job_id,title:a.title,n:0,hired:0}); jmap[k].n++; if(a.stage==='Hired') jmap[k].hired++; }
        const topJobs = Object.values(jmap).sort((a,b)=>b.n-a.n).slice(0,6);
        return send(res, V.layout({title:'Analytics',user,active:'analytics',body:V.empAnalytics({user,
          kpis:{pipeline, hired, fillRate}, weekly, conv, topTrades, topJobs, avgScore, totalApps})}));
      }
      if(p==='/console/company' && method==='GET')
        return send(res, V.layout({title:'Company profile',user,active:'',body:V.empCompany({user, saved:url.searchParams.get('saved')==='1'})}));
      if(p==='/console/company' && method==='POST'){
        const b = await readBody(req);
        let site = String(b.company_website||'').trim().slice(0,200);
        if(site && !/^https?:\/\//i.test(site)) site = 'https://'+site;
        await db.prepare('UPDATE users SET company=?,company_city=?,company_size=?,company_website=?,company_about=? WHERE id=?')
          .run(String(b.company||'').slice(0,80), String(b.company_city||'').slice(0,60),
            String(b.company_size||'').slice(0,20), site, String(b.company_about||'').slice(0,800), user.id);
        return redirect(res,'/console/company?saved=1');
      }

      if(p==='/console/jobs' && method==='GET'){
        const jobsRaw = await db.prepare(`SELECT * FROM jobs WHERE employer_id=? ORDER BY created_at DESC`).all(user.id);
        const jobs = [];
        for(const j of jobsRaw){
          const applicants = (await db.prepare('SELECT COUNT(*) c FROM applications WHERE job_id=?').get(j.id)).c;
          const matched = (await rankWorkersForJob(j)).filter(w=>w.score>=70).length;
          jobs.push({...j, applicants, matched});
        }
        return send(res, V.layout({title:'Jobs',user,active:'jobs',body:V.empJobs({jobs})}));
      }
      if(p==='/console/jobs/new' && method==='GET')
        return send(res, V.layout({title:'Post a job',user,active:'jobs',body:V.empJobForm()}));
      if(p==='/console/jobs/new' && method==='POST'){
        const b = await readBody(req);
        if(!b.title) return send(res, V.layout({title:'Post a job',user,active:'jobs',body:V.empJobForm('Title is required.')}));
        const reqCreds = [].concat(b.req_creds||[]).filter(Boolean).join(',');
        const empType = V.JOB_TYPES.includes(b.employment_type) ? b.employment_type : 'Full-time';
        const info = await db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(user.id,b.title,b.trade,Number(b.pay_min)||0,Number(b.pay_max)||0,b.city||'',b.zip||'',b.shift||'Day',reqCreds,b.descr||'',empType);
        const jobId = info.lastInsertRowid;
        // SMS job alerts to matching, opted-in, available workers who have a phone
        let alerted = 0;
        try {
          const trades = [b.trade, ...((M.ADJACENT && M.ADJACENT[b.trade]) || [])];
          const ph = trades.map(()=>'?').join(',');
          const targets = await db.prepare(`SELECT u.phone FROM users u JOIN worker_profiles p ON p.user_id=u.id
            WHERE p.alerts=1 AND p.available=1 AND u.phone IS NOT NULL AND p.trade IN (${ph})`).all(...trades);
          const label = (M.TRADES && M.TRADES[b.trade]) || b.trade || 'trades';
          for(const t of targets){
            await sendSms(t.phone, `New ${label} job on Rivet: ${b.title} · $${Number(b.pay_min)||0}-${Number(b.pay_max)||0}/hr · ${b.city||''}. Open the app to apply.`);
            alerted++;
          }
        } catch(e){ console.error('job alerts', e); }
        return redirect(res, `/console/jobs/${jobId}?alerted=${alerted}`);
      }

      // pipeline add / stage move
      const aMatch = p.match(/^\/console\/applications\/(\d+)\/stage$/);
      if(aMatch && method==='POST'){
        const b = await readBody(req);
        if(V.STAGES.includes(b.stage)) await db.prepare('UPDATE applications SET stage=? WHERE id=?').run(b.stage, Number(aMatch[1]));
        const app = await db.prepare('SELECT job_id FROM applications WHERE id=?').get(Number(aMatch[1]));
        return redirect(res, `/console/jobs/${app?app.job_id:''}`);
      }
      const addMatch = p.match(/^\/console\/jobs\/(\d+)\/add$/);
      if(addMatch && method==='POST'){
        const b = await readBody(req); const jobId=Number(addMatch[1]);
        const job = await db.prepare('SELECT * FROM jobs WHERE id=?').get(jobId);
        const wid = Number(b.worker_id);
        if(job && wid){ const prof=await getProfile(wid); const m=bestMatch(prof,await getCreds(wid),job);
          try{ await db.prepare('INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,?,?)').run(jobId,wid,'Sourced',m.score);}catch(e){} }
        return redirect(res, `/console/jobs/${jobId}`);
      }

      const jMedia = p.match(/^\/console\/jobs\/(\d+)\/media$/);
      if(jMedia && method==='POST'){
        const jobId=Number(jMedia[1]);
        const job = await db.prepare('SELECT id FROM jobs WHERE id=? AND employer_id=?').get(jobId, user.id);
        if(job){
          const b = await readBody(req);
          const url = String(b.url||'').trim().slice(0,1000);
          const title = String(b.title||'').trim().slice(0,140);
          const caption = String(b.caption||'').trim().slice(0,300);
          if(/^https?:\/\//i.test(url)){
            const kind = /youtube|youtu\.be|vimeo/i.test(url) ? 'video' : 'image';
            await db.prepare("INSERT INTO media(user_id,target,job_id,kind,url,title,caption) VALUES(?,'job',?,?,?,?,?)").run(user.id, jobId, kind, url, title, caption);
          }
        }
        return redirect(res, `/console/jobs/${jobId}`);
      }
      const jMediaDel = p.match(/^\/console\/jobs\/(\d+)\/media\/(\d+)\/delete$/);
      if(jMediaDel && method==='POST'){
        const jobId=Number(jMediaDel[1]), mid=Number(jMediaDel[2]);
        const job = await db.prepare('SELECT id FROM jobs WHERE id=? AND employer_id=?').get(jobId, user.id);
        if(job) await db.prepare("DELETE FROM media WHERE id=? AND job_id=? AND target='job'").run(mid, jobId);
        return redirect(res, `/console/jobs/${jobId}`);
      }

      const jClose = p.match(/^\/console\/jobs\/(\d+)\/(close|reopen)$/);
      if(jClose && method==='POST'){
        const jobId=Number(jClose[1]), status = jClose[2]==='close' ? 'closed' : 'open';
        await db.prepare('UPDATE jobs SET status=? WHERE id=? AND employer_id=?').run(status, jobId, user.id);
        return redirect(res, url.searchParams.get('from')==='list' ? '/console/jobs' : `/console/jobs/${jobId}`);
      }
      const jEdit = p.match(/^\/console\/jobs\/(\d+)\/edit$/);
      if(jEdit){
        const jobId = Number(jEdit[1]);
        const job = await db.prepare('SELECT * FROM jobs WHERE id=? AND employer_id=?').get(jobId, user.id);
        if(!job) return send(res, V.layout({title:'Not found',user,body:'<section class="wrap"><div class="card">Job not found.</div></section>'}),404);
        if(method==='GET') return send(res, V.layout({title:'Edit job',user,active:'jobs',body:V.empJobForm('', job)}));
        const b = await readBody(req);
        if(!b.title) return send(res, V.layout({title:'Edit job',user,active:'jobs',body:V.empJobForm('Title is required.', {...job, ...b, req_creds:[].concat(b.req_creds||[]).join(',')})}));
        const reqCreds = [].concat(b.req_creds||[]).filter(Boolean).join(',');
        const empType = V.JOB_TYPES.includes(b.employment_type) ? b.employment_type : (job.employment_type||'Full-time');
        await db.prepare(`UPDATE jobs SET title=?,trade=?,pay_min=?,pay_max=?,city=?,zip=?,shift=?,req_creds=?,descr=?,employment_type=? WHERE id=? AND employer_id=?`)
          .run(String(b.title).slice(0,120), b.trade||job.trade, Number(b.pay_min)||0, Number(b.pay_max)||0, b.city||'', b.zip||'', b.shift||'Day', reqCreds, String(b.descr||'').slice(0,2000), empType, jobId, user.id);
        return redirect(res, `/console/jobs/${jobId}`);
      }

      const jid = qid(p);
      if(jid && p===`/console/jobs/${jid}` && method==='GET'){
        const job = await db.prepare('SELECT * FROM jobs WHERE id=? AND employer_id=?').get(jid,user.id);
        if(!job) return send(res, V.layout({title:'Not found',user,body:'<section class="wrap"><div class="card">Job not found.</div></section>'}),404);
        const apps = await db.prepare(`SELECT a.id app_id,a.stage,a.score,u.id worker_id,u.name,p.trade FROM applications a
          JOIN users u ON u.id=a.worker_id JOIN worker_profiles p ON p.user_id=a.worker_id WHERE a.job_id=?`).all(jid);
        const columns = {}; for(const st of V.STAGES) columns[st]=[];
        const inPipe = new Set(); for(const a of apps){ (columns[a.stage]=columns[a.stage]||[]).push(a); inPipe.add(a.name); }
        const candidates = (await rankWorkersForJob(job)).filter(w=>!inPipe.has(w.name)).slice(0,5);
        const jobMedia = await db.prepare("SELECT * FROM media WHERE job_id=? AND target='job' ORDER BY created_at DESC, id DESC").all(jid);
        const alerted = Number(url.searchParams.get('alerted'))||0;
        return send(res, V.layout({title:job.title,user,active:'jobs',body:V.empPipeline({job,columns,candidates,jobMedia,alerted})}));
      }

      if(p==='/console/search' && method==='GET'){
        const filters = {trade:url.searchParams.get('trade')||'', verified:!!url.searchParams.get('verified'), ready:!!url.searchParams.get('ready'), avail:!!url.searchParams.get('avail'), today:!!url.searchParams.get('today'), relocate:!!url.searchParams.get('relocate'), tools:!!url.searchParams.get('tools'), transport:!!url.searchParams.get('transport'), bilingual:!!url.searchParams.get('bilingual')};
        const rowsRaw = await db.prepare(`SELECT u.id,u.name,p.* FROM users u JOIN worker_profiles p ON p.user_id=u.id`).all();
        let rows = [];
        for(const w of rowsRaw){ const creds=(await getCreds(w.id)).filter(c=>!filters.verified||c.verified); rows.push({...w, creds}); }
        if(filters.trade) rows = rows.filter(w=>w.trade===filters.trade);
        if(filters.ready) rows = rows.filter(w=>w.readiness>=85);
        if(filters.avail) rows = rows.filter(w=>w.available);
        if(filters.today) rows = rows.filter(w=>w.work_today);
        if(filters.relocate) rows = rows.filter(w=>w.relocate);
        if(filters.tools) rows = rows.filter(w=>w.has_tools);
        if(filters.transport) rows = rows.filter(w=>w.has_transport);
        if(filters.bilingual) rows = rows.filter(w=>w.bilingual);
        rows.sort((a,b)=>b.readiness-a.readiness);
        return send(res, V.layout({title:'Talent Search',user,active:'search',body:V.empSearch({rows,filters})}));
      }

      if(p==='/console/messages' && method==='GET'){
        await db.prepare("UPDATE messages SET read_at=datetime('now') WHERE to_id=? AND read_at IS NULL").run(user.id);
        const convos = await getConversations(user.id);
        return send(res, V.layout({title:'Messages',user:{...user,unread:0},active:'msgs',body:V.inbox({convos, base:'/console', meId:user.id})}));
      }
      const eMsg = p.match(/^\/console\/messages\/(\d+)$/);
      if(eMsg && method==='POST'){
        const b = await readBody(req);
        await sendMessage(user.id, Number(eMsg[1]), b.body);
        return redirect(res, '/console/messages');
      }
      const cMsg = p.match(/^\/console\/candidates\/(\d+)\/message$/);
      if(cMsg && method==='POST'){
        const wid = Number(cMsg[1]);
        const b = await readBody(req);
        const w = await db.prepare("SELECT id FROM users WHERE id=?").get(wid);
        if(w) await sendMessage(user.id, wid, b.body);
        return redirect(res, `/console/candidates/${wid}`);
      }
      const cNote = p.match(/^\/console\/candidates\/(\d+)\/note$/);
      if(cNote && method==='POST'){
        const wid = Number(cNote[1]);
        const b = await readBody(req);
        const body = String(b.body||'').trim().slice(0,2000);
        if(body) await db.prepare('INSERT INTO notes(author_id,worker_id,body) VALUES(?,?,?)').run(user.id, wid, body);
        return redirect(res, `/console/candidates/${wid}`);
      }
      const cSave = p.match(/^\/console\/candidates\/(\d+)\/save$/);
      if(cSave && method==='POST'){
        const wid = Number(cSave[1]);
        const exists = await db.prepare('SELECT 1 FROM saved_candidates WHERE employer_id=? AND worker_id=?').get(user.id, wid);
        if(exists) await db.prepare('DELETE FROM saved_candidates WHERE employer_id=? AND worker_id=?').run(user.id, wid);
        else await db.prepare('INSERT INTO saved_candidates(employer_id,worker_id) VALUES(?,?)').run(user.id, wid);
        return redirect(res, `/console/candidates/${wid}`);
      }
      if(p==='/console/shortlist' && method==='GET'){
        const rows = await db.prepare(`SELECT u.id,u.name,p.* FROM saved_candidates s
          JOIN users u ON u.id=s.worker_id JOIN worker_profiles p ON p.user_id=s.worker_id
          WHERE s.employer_id=? ORDER BY s.created_at DESC`).all(user.id);
        return send(res, V.layout({title:'Shortlist',user,active:'search',body:V.empShortlist({rows})}));
      }

      const candMatch = p.match(/^\/console\/candidates\/(\d+)$/);
      if(candMatch && method==='GET'){
        const wid = Number(candMatch[1]);
        const w = await db.prepare("SELECT id,name FROM users WHERE id=?").get(wid);
        const prof = w ? await getProfile(wid) : null;
        if(!w || !prof) return send(res, V.layout({title:'Candidate',user,active:'search',body:'<section class="wrap narrow"><a class="back" href="/console/search">← Talent Search</a><div class="card">Candidate not found.</div></section>'}),404);
        const creds = await getCreds(wid);
        const jobs = await db.prepare('SELECT * FROM jobs WHERE employer_id=? ORDER BY created_at DESC').all(user.id);
        const matches = jobs.map(j=>{ const r=bestMatch(prof,creds,j); return {job:j, score:r.score, breakdown:r.breakdown, missing:r.missing}; }).sort((a,b)=>b.score-a.score);
        const apps = jobs.length ? await db.prepare(`SELECT job_id,stage FROM applications WHERE worker_id=? AND job_id IN (${jobs.map(()=>'?').join(',')})`).all(wid, ...jobs.map(j=>j.id)) : [];
        const messages = await db.prepare(`SELECT * FROM messages WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?) ORDER BY created_at, id`).all(user.id, wid, wid, user.id);
        await db.prepare("UPDATE messages SET read_at=datetime('now') WHERE to_id=? AND from_id=? AND read_at IS NULL").run(user.id, wid);
        const notes = await db.prepare('SELECT * FROM notes WHERE author_id=? AND worker_id=? ORDER BY created_at DESC, id DESC').all(user.id, wid);
        const saved = !!(await db.prepare('SELECT 1 FROM saved_candidates WHERE employer_id=? AND worker_id=?').get(user.id, wid));
        const portfolio = await db.prepare("SELECT * FROM media WHERE user_id=? AND target='portfolio' ORDER BY created_at DESC, id DESC").all(wid);
        const work = await getWorkHistory(wid);
        return send(res, V.layout({title:w.name,user,active:'search',body:V.empCandidate({worker:w,profile:prof,creds,matches,apps,messages,meId:user.id,notes,saved,portfolio,work})}));
      }
    }

    // 404
    return send(res, V.layout({title:'Not found',user,body:'<section class="wrap"><div class="card"><h2>404</h2><p>Page not found. <a href="/">Home</a></p></div></section>'}),404);
  } catch (err) {
    console.error(err);
    return send(res, V.layout({title:'Error',user,body:`<section class="wrap"><div class="card"><h2>Something went wrong</h2><pre>${String(err.message)}</pre></div></section>`}),500);
  }
});

init()
  .then(loadTranslations)
  .then(()=> server.listen(PORT, ()=>console.log(`Rivet × Crewline running → http://localhost:${PORT}`)))
  .then(()=> { prewarmEs().catch(()=>{}); })
  .catch(err=>{ console.error('init failed', err); process.exit(1); });
