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
// Never ship a known default: if RIVET_SECRET is unset, use a random per-process
// secret (sessions reset on restart, but the signing key is never guessable).
const SECRET = process.env.RIVET_SECRET || crypto.randomBytes(32).toString('hex');
if(!process.env.RIVET_SECRET) console.warn('[security] RIVET_SECRET not set — using a random per-process secret (sessions will not survive restarts).');
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
  const needZip = !home; // worker hasn't set a geocodable ZIP, so distance can't be computed
  for(const j of jobs){
    const r = bestMatch(prof, creds, j);
    let distance = null;
    if(home && j.zip){ if(!(j.zip in zc)) zc[j.zip] = await geocodeZip(j.zip); distance = zc[j.zip] ? haversineMi(home, zc[j.zip]) : null; }
    const beyondCommute = (prof && prof.commute_mi>0 && distance!=null && distance>prof.commute_mi);
    out.push({job:j, score:r.score, missing:r.missing, distance, needZip, beyondCommute});
  }
  // Default ranking blends fit with proximity so intra-metro work surfaces first
  // (without hiding strong far matches). Pure fit/distance sorts still available via filters.
  const locBonus = d => d==null ? 0 : (d<=15 ? 14 : d<=40 ? 7 : d<=120 ? 0 : -12);
  return out.sort((a,b)=> (b.score+locBonus(b.distance)) - (a.score+locBonus(a.distance)) || (a.distance??1e9)-(b.distance??1e9));
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
    const _k=r.city||r.zip; const b = byZip[_k] || (byZip[_k] = {city:r.city, lat:r.lat, lon:r.lon, real:0, catReal:{}, items:[]});
    b.real++; const c=M.tradeCategory(r.trade); b.catReal[c]=(b.catReal[c]||0)+1;
    if(b.items.length<12) b.items.push({ label:r.name, sub:`${M.TRADES[r.trade]||r.trade} · readiness ${r.readiness}`, href:`/console/candidates/${r.id}` });
  }
  return Object.values(byZip).map(b=>{
    const n = metroTalent(b.city, b.real);
    const cats = Object.entries(b.catReal).map(([k,rc])=>({k, n:Math.max(1,Math.round(n*rc/b.real))})).sort((a,b)=>b.n-a.n);
    return {...b, n, cats};
  }).sort((a,b)=>b.n-a.n);
}
// open-job map points, optionally scoped to a GTM sector (semiconductor|manufacturing|healthcare)
async function jobGeoAll(sector){
  const rows = sector
    ? await db.prepare(`SELECT j.id, j.title, j.trade, j.pay_min, j.pay_max, j.zip, z.lat, z.lon, z.city, u.company
        FROM jobs j JOIN zip_geo z ON z.zip=j.zip JOIN users u ON u.id=j.employer_id WHERE j.status='open' AND j.sector=?`).all(sector)
    : await db.prepare(`SELECT j.id, j.title, j.trade, j.pay_min, j.pay_max, j.zip, z.lat, z.lon, z.city, u.company
        FROM jobs j JOIN zip_geo z ON z.zip=j.zip JOIN users u ON u.id=j.employer_id WHERE j.status='open'`).all();
  const byZip = {};
  for(const r of rows){
    const _k=r.city||r.zip; const b = byZip[_k] || (byZip[_k] = {city:r.city, lat:r.lat, lon:r.lon, real:0, catReal:{}, items:[]});
    b.real++; const c=M.tradeCategory(r.trade); b.catReal[c]=(b.catReal[c]||0)+1;
    if(b.items.length<12) b.items.push({ label:`${r.title} · $${r.pay_min}–${r.pay_max}/hr`, sub:`${r.company||''} · ${M.TRADES[r.trade]||r.trade}`, href:`/jobs/${r.id}` });
  }
  return Object.values(byZip).map(b=>{
    const n = metroDemand(b.city, b.real);
    const cats = Object.entries(b.catReal).map(([k,rc])=>({k, n:Math.max(1,Math.round(n*rc/b.real))})).sort((a,b)=>b.n-a.n);
    return {...b, n, cats};
  }).sort((a,b)=>b.n-a.n);
}
// GTM sector page data: real employers, role types, pay band, metro count + map
async function sectorStats(sector){
  const jobs = await db.prepare(`SELECT j.trade, j.pay_min, j.pay_max, j.zip, u.company, u.company_city
    FROM jobs j JOIN users u ON u.id=j.employer_id WHERE j.status='open' AND j.sector=?`).all(sector);
  const employers = {}, roles = {}; const metros = new Set(); let lo = Infinity, hi = 0;
  for(const j of jobs){
    if(j.company){ (employers[j.company] = employers[j.company] || {company:j.company, city:j.company_city, n:0}).n++; }
    roles[j.trade] = (roles[j.trade]||0) + 1;
    if(j.zip) metros.add(j.zip);
    if(j.pay_min) lo = Math.min(lo, j.pay_min);
    if(j.pay_max) hi = Math.max(hi, j.pay_max);
  }
  return {
    count: jobs.length, metros: metros.size,
    payLo: lo===Infinity?0:lo, payHi: hi,
    employers: Object.values(employers).sort((a,b)=>b.n-a.n),
    roles: Object.entries(roles).map(([trade,n])=>({trade,n})).sort((a,b)=>b.n-a.n),
    geo: await jobGeoAll(sector),
  };
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
  const primary = trades[0]; // worker's main trade drives the per-metro tightness read
  const byZip = {};
  for(const r of rows){
    const isDirect = direct.has(r.trade), isRelated = related.has(r.trade);
    if(!isDirect && !isRelated) continue;
    const _k=r.city||r.zip; const b = byZip[_k] || (byZip[_k] = {city:r.city, lat:r.lat, lon:r.lon, n:0, primJobs:0, catReal:{}, anyDirect:false, items:[]});
    b.n++; if(isDirect) b.anyDirect = true;
    const c=M.tradeCategory(r.trade); b.catReal[c]=(b.catReal[c]||0)+1;
    if(r.trade===primary) b.primJobs++;
    b.items.push({ label:`${r.title} · $${r.pay_min}–${r.pay_max}/hr`, sub:`${r.company||''} · ${M.TRADES[r.trade]||r.trade}`, href:`/app/jobs/${r.id}` });
  }
  // worker-supply in the primary trade per metro → per-metro market tightness for that trade
  const wkRows = await db.prepare(`SELECT z.city, COUNT(*) n FROM worker_profiles p JOIN zip_geo z ON z.zip=p.zip WHERE p.trade=? GROUP BY z.city`).all(primary);
  const primWk = Object.fromEntries(wkRows.map(r=>[r.city, r.n]));
  // worker's own location anchors the map — "you are here" + commute ring
  const home = await geocodeZip(prof.zip);
  const commute = (prof.commute_mi>0) ? prof.commute_mi : 0;
  let reachable = 0; // real sample jobs within the worker's commute radius
  const nearR = commute>0 ? commute : 40; // "near you" band — drives emphasis + reachable count
  const points = Object.values(byZip).map(b=>{
    const dist = (home && b.lat!=null) ? Math.round(haversineMi(home, {lat:b.lat, lon:b.lon})) : null;
    const near = dist!=null && dist<=nearR;
    if(near) reachable += b.n;
    const mb = M.marketBalance(primary, b.primJobs, primWk[b.city]||0);
    const bal = { trade: M.TRADES[primary]||primary, level: mb.level, label: M.BALANCE_LABEL[mb.level], ratio: mb.ratio };
    const cats = Object.entries(b.catReal).map(([k,rc])=>({k, n:rc})).sort((a,b)=>b.n-a.n);
    return { city:b.city, lat:b.lat, lon:b.lon, n:b.n, kind:b.anyDirect?'direct':'related', dist, near, bal, cats, items:b.items };
  // nearby work first (closest on top) so the worker's eye lands on jobs they can take, then the rest by volume
  }).sort((a,b)=> (b.near?1:0)-(a.near?1:0) || (a.near ? a.dist-b.dist : b.n-a.n));
  const homePin = home ? { lat:home.lat, lon:home.lon, zip:prof.zip, city:prof.city||'', commute, reachable } : null;
  return { points, home: homePin };
}
// Load all credentials once, grouped by user_id — avoids an N+1 query per worker.
async function allCredsByUser(){
  const rows = await db.prepare('SELECT * FROM credentials ORDER BY id').all();
  const m = {}; for(const c of rows){ (m[c.user_id]=m[c.user_id]||[]).push(c); }
  return m;
}
async function rankWorkersForJob(job, credsByUser){
  const workers = await db.prepare(`SELECT u.id user_id,u.name,p.* FROM users u JOIN worker_profiles p ON p.user_id=u.id`).all();
  const cbu = credsByUser || await allCredsByUser();
  const out = [];
  for(const w of workers){ const creds=cbu[w.user_id]||[]; const r=bestMatch(w,creds,job);
    out.push({...w, score:r.score, readiness:w.readiness}); }
  return out.sort((a,b)=>b.score-a.score);
}

// ---------- ratings & reviews ----------
async function ratingFor(subjectId, kind){
  const r = await db.prepare('SELECT AVG(stars) avg, COUNT(*) c FROM reviews WHERE subject_id=? AND subject_kind=?').get(subjectId, kind);
  return { avg: r && r.avg ? Number(r.avg) : 0, count: r ? r.c : 0 };
}
async function reviewsFor(subjectId, kind, limit=8){
  return db.prepare('SELECT * FROM reviews WHERE subject_id=? AND subject_kind=? ORDER BY created_at DESC, id DESC LIMIT ?').all(subjectId, kind, limit);
}
// Show-Up Score: % of completed starts where the worker showed up.
async function showUp(workerId){
  const r = await db.prepare("SELECT COUNT(*) total, SUM(CASE WHEN outcome='showed' THEN 1 ELSE 0 END) showed FROM applications WHERE worker_id=? AND outcome IS NOT NULL AND outcome!='cancelled'").get(workerId);
  const total = r && r.total || 0; const showed = r && r.showed || 0;
  return { starts: total, pct: total ? Math.round((showed/total)*100) : null };
}
// Paid-Like-Promised: % of an employer's completed jobs paid on time.
async function payRep(employerId){
  const r = await db.prepare(`SELECT COUNT(*) total, SUM(CASE WHEN a.pay_outcome='ontime' THEN 1 ELSE 0 END) ontime
    FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.employer_id=? AND a.pay_outcome IS NOT NULL`).get(employerId);
  const total = r && r.total || 0; const ontime = r && r.ontime || 0;
  return { n: total, pct: total ? Math.round((ontime/total)*100) : null };
}
const crewOf = (workerId) => db.prepare('SELECT * FROM crew_members WHERE worker_id=? ORDER BY id').all(workerId);
// Safety Pulse: average worker-rated site safety for an employer.
async function safetyStat(employerId){
  const r = await db.prepare("SELECT AVG(safety) avg, COUNT(safety) n FROM reviews WHERE subject_id=? AND subject_kind='employer' AND safety IS NOT NULL").get(employerId);
  return { avg: r&&r.avg?Number(r.avg):0, n: r?r.n:0 };
}
// Rehire signal: how many workers this employer has hired on 2+ of their jobs (they came back).
async function rehireStat(employerId){
  const r = await db.prepare(`SELECT COUNT(*) n FROM (
    SELECT a.worker_id FROM applications a JOIN jobs j ON j.id=a.job_id
    WHERE j.employer_id=? AND a.stage='Hired' GROUP BY a.worker_id HAVING COUNT(*)>=2)`).get(employerId);
  return r ? r.n : 0;
}
// has this employer hired this worker before (on any job)?
async function hiredBefore(employerId, workerId){
  const r = await db.prepare(`SELECT COUNT(*) n FROM applications a JOIN jobs j ON j.id=a.job_id
    WHERE j.employer_id=? AND a.worker_id=? AND a.stage='Hired'`).get(employerId, workerId);
  return r ? r.n : 0;
}

// ---------- agents ----------
function isExternalJob(j){ return !!(j && j.source && j.source!=='Rivet' && j.apply_url); }

// Career Coach: highest-ROI credentials to earn next, grounded in the live market.
async function coachReco(uid){
  const prof = await getProfile(uid); if(!prof) return null;
  const creds = await getCreds(uid);
  const have = new Set(creds.map(c=>c.kind));
  const trades = profTrades(prof); if(!trades.length) return null;
  const broad = new Set(trades); for(const t of trades) for(const a of (M.ADJACENT[t]||[])) broad.add(a);
  const jobs = (await openJobs()).filter(j=>broad.has(j.trade) && !isExternalJob(j));
  const tally = {}; // credKey -> {count, paySum}
  for(const j of jobs){
    const reqs = String(j.req_creds||'').split(',').map(s=>s.trim()).filter(Boolean);
    for(const r of reqs){ if(have.has(r)) continue; (tally[r]=tally[r]||{count:0,paySum:0}); tally[r].count++; tally[r].paySum += (j.pay_max||0); }
  }
  const floor = prof.pay_floor || 0;
  const list = Object.entries(tally).map(([key,t])=>{
    const avgPay = t.count ? Math.round(t.paySum/t.count) : 0;
    return { key, label: M.CRED_KINDS[key]||key, jobsUnlocked: t.count, payDelta: Math.max(0, avgPay - floor),
      how: (M.TRAINING[key]||{}).how || '', url: (M.TRAINING[key]||{}).url || '' };
  }).filter(c=>c.jobsUnlocked>0).sort((a,b)=> b.jobsUnlocked-a.jobsUnlocked || b.payDelta-a.payDelta);
  if(!list.length) return null;
  return { topCred: list[0], alternatives: list.slice(1,3), marketJobs: jobs.length };
}
function coachLineFallback(c){
  const pay = c.payDelta>0 ? ` and pay up to about +$${c.payDelta}/hr` : '';
  return `Earning your ${c.label} would unlock about ${c.jobsUnlocked} more jobs near you${pay}.`;
}

// Onboarding agent: ordered guided-chat script. Each step parses free text into a profile value.
const TRADE_SYNONYMS = { electrical:'electrician', electric:'electrician', ac:'hvac', 'air conditioning':'hvac', hvacr:'hvac',
  plumbing:'plumber', welding:'welder', carpentry:'carpenter', framing:'framer', concrete:'concrete', mason:'mason', masonry:'mason',
  painting:'painter', roofing:'roofer', driving:'cdl_driver', trucker:'cdl_driver', forklift:'warehouse', warehouseman:'warehouse',
  cook:'cook', chef:'cook', server:'server', waiter:'server', waitress:'server', cleaner:'janitor', janitorial:'janitor',
  caregiving:'caregiver', nurse:'cna', security:'security_guard', guard:'security_guard', landscaping:'landscaper', solar:'solar' };
function matchTrades(text){
  const s = ' '+String(text||'').toLowerCase().replace(/[^a-z ]/g,' ')+' ';
  const out = [];
  for(const key of Object.keys(M.TRADES)){
    const k = key.replace(/_/g,' ');
    const label = String(M.TRADES[key]).toLowerCase();
    if(s.includes(' '+k+' ') || label.split(/[ /]/).some(w=>w.length>3 && s.includes(' '+w+' '))){ if(!out.includes(key)) out.push(key); }
  }
  for(const [syn,key] of Object.entries(TRADE_SYNONYMS)){ if(s.includes(' '+syn+' ') && M.TRADES[key] && !out.includes(key)) out.push(key); }
  return out;
}
const ONBOARD_STEPS = [
  { field:'trades', q:'Welcome! What trade or trades do you work in?', ph:'e.g. electrician and some solar' },
  { field:'years_exp', q:'Nice. How many years have you been doing this work?', ph:'e.g. 8' },
  { field:'city', q:'What city are you based in?', ph:'e.g. Phoenix' },
  { field:'zip', q:'What’s your ZIP code? (so we can show jobs near you)', ph:'e.g. 85004' },
  { field:'pay_floor', q:'What’s the lowest hourly pay you’d take? Just a number.', ph:'e.g. 32' },
  { field:'shift', q:'Last one — what shifts can you work: day, night, or any?', ph:'day / night / any' },
];
async function applyOnboardAnswer(uid, step, text){
  const prof = await getProfile(uid) || {};
  const s = ONBOARD_STEPS[step]; if(!s) return;
  let val, captured = String(text||'').trim();
  if(s.field==='trades'){
    const matched = matchTrades(text);
    if(matched.length){ await db.prepare('UPDATE worker_profiles SET trades=?, trade=? WHERE user_id=?').run(matched.join(','), matched[0], uid); }
    else { await db.prepare('UPDATE worker_profiles SET custom_trade=? WHERE user_id=?').run(captured.slice(0,60), uid); }
    return;
  }
  if(s.field==='years_exp'){ val = (String(text).match(/\d+/)||[0])[0]; await db.prepare('UPDATE worker_profiles SET years_exp=? WHERE user_id=?').run(Number(val)||0, uid); return; }
  if(s.field==='city'){ await db.prepare('UPDATE worker_profiles SET city=? WHERE user_id=?').run(captured.slice(0,60), uid); return; }
  if(s.field==='zip'){ const z=(String(text).match(/\d{5}/)||[''])[0]; await db.prepare('UPDATE worker_profiles SET zip=? WHERE user_id=?').run(z, uid); if(z){ try{ await geocodeZip(z); }catch(e){} } return; }
  if(s.field==='pay_floor'){ val=(String(text).match(/\d+/)||[0])[0]; await db.prepare('UPDATE worker_profiles SET pay_floor=? WHERE user_id=?').run(Number(val)||0, uid); return; }
  if(s.field==='shift'){ const l=String(text).toLowerCase(); const sh = l.includes('night')?'Night':(l.includes('4')?'4x10':(l.includes('day')?'Day':'Any')); await db.prepare('UPDATE worker_profiles SET shift=? WHERE user_id=?').run(sh, uid); return; }
}
function onboardTranscript(prof, step){
  const out = [];
  for(let i=0;i<step && i<ONBOARD_STEPS.length;i++){
    const f = ONBOARD_STEPS[i]; out.push({role:'them', text:f.q});
    let v = '';
    if(f.field==='trades') v = (profTrades(prof).map(t=>M.TRADES[t]||t).join(', ')) || prof.custom_trade || '';
    else if(f.field==='years_exp') v = prof.years_exp ? `${prof.years_exp} years` : '';
    else v = prof[f.field]!=null ? String(prof[f.field]) : '';
    if(v) out.push({role:'you', text:v});
  }
  return out;
}

// Render the recruiter candidate page (reused by GET and the screening agent POST).
async function sendCandidate(res, user, wid, screen=null){
  const w = await db.prepare('SELECT id,name FROM users WHERE id=?').get(wid);
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
  const rating = await ratingFor(wid, 'worker');
  const reviews = await reviewsFor(wid, 'worker');
  const hiredApp = apps.find(a=>a.stage==='Hired');
  const canReviewJob = hiredApp ? hiredApp.job_id : null;
  const myReview = canReviewJob ? await db.prepare('SELECT * FROM reviews WHERE author_id=? AND subject_id=? AND job_id=?').get(user.id, wid, canReviewJob) : null;
  const ivRows = jobs.length ? await db.prepare(`SELECT * FROM interviews WHERE worker_id=? AND employer_id=? AND job_id IN (${jobs.map(()=>'?').join(',')})`).all(wid, user.id, ...jobs.map(j=>j.id)) : [];
  const interviews = {}; for(const iv of ivRows) interviews[iv.job_id] = iv;
  const su = await showUp(wid);
  const crew = await crewOf(wid);
  // rehire: if we've hired them before, offer a one-click invite to an open job they're not in
  let inviteBack = null;
  if(await hiredBefore(user.id, wid)){
    const inPipe = new Set(apps.map(a=>a.job_id));
    const openJob = jobs.find(j=>j.status==='open' && !inPipe.has(j.id));
    if(openJob) inviteBack = { jobId: openJob.id, title: openJob.title };
  }
  return send(res, V.layout({title:w.name,user,active:'search',body:V.empCandidate({worker:w,profile:prof,creds,matches,apps,messages,meId:user.id,notes,saved,portfolio,work,rating,reviews,canReviewJob,myReview,interviews,screen,showUp:su,crew,inviteBack})}));
}

// ---------- geo / distance ----------
function haversineMi(a, b){
  if(!a || !b) return null;
  const R=3958.8, toRad=d=>d*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLon=toRad(b.lon-a.lon);
  const s=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(s)));
}
const _geoMiss = new Set(); // ZIPs that failed to resolve — don't re-hit the network each request
async function geocodeZip(zip){
  zip = String(zip||'').trim().slice(0,5);
  if(!/^\d{5}$/.test(zip)) return null;
  if(_geoMiss.has(zip)) return null;
  try {
    const cached = await db.prepare('SELECT lat,lon FROM zip_geo WHERE zip=?').get(zip);
    if(cached && cached.lat!=null) return { lat:cached.lat, lon:cached.lon };
    const opts = (typeof AbortSignal!=='undefined' && AbortSignal.timeout) ? { signal: AbortSignal.timeout(2500) } : {};
    const r = await fetch(`https://api.zippopotam.us/us/${zip}`, opts);
    if(!r.ok){ _geoMiss.add(zip); return null; }
    const j = await r.json();
    const place = j.places && j.places[0];
    if(!place){ _geoMiss.add(zip); return null; }
    const lat = parseFloat(place.latitude), lon = parseFloat(place.longitude);
    if(isNaN(lat) || isNaN(lon)){ _geoMiss.add(zip); return null; }
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

// ---------- AI mock interview engine ----------
function buildInterviewQuestions(trade, job){
  const role = M.TRADES[trade] || 'this role';
  const lt = V.LEARN_TRACKS[trade];
  const qs = [`Tell me about your experience and why you'd be a great ${role}.`];
  if(lt && lt.qs) qs.push(...lt.qs);
  qs.push(job && job.company ? `Why do you want to work at ${job.company}?` : `Why do you want this ${role} job?`);
  return qs.slice(0,6);
}
async function rateAnswer(answer, role, question){
  const t = (answer||'').trim();
  if(LLM.enabled && t.length>1){
    const prompt = `You are an encouraging blue-collar hiring coach. Role: ${role}. Interview question: "${question}". Candidate's answer: "${t}". Reply ONLY with compact JSON and nothing else: {"rating":"strong|solid|weak","tip":"one short, specific, encouraging coaching sentence in plain language"}.`;
    try { const r = await LLM.chat(prompt, 130, 7000); const m = r && r.match(/\{[\s\S]*\}/); if(m){ const o = JSON.parse(m[0]); if(o && /^(strong|solid|weak)$/.test(o.rating) && o.tip) return { rating:o.rating, tip:String(o.tip).slice(0,200) }; } } catch(e){}
  }
  const lc = t.toLowerCase();
  const specific = /\d/.test(t) || /(osha|safety|ppe|lockout|tig|mig|weld|cleanroom|forklift|patient|sterile|torque|calibrat|blueprint|recipe|cnc|ase|epa|cdl|shift)/.test(lc);
  const rating = t.length < 60 ? 'weak' : (t.length > 160 || specific) ? 'strong' : 'solid';
  const tips = { weak:'Give a real example — the situation, what you did, and how it turned out.', solid:'Good — add one concrete detail or number to make it land.', strong:'Strong, specific answer. Keep that structure.' };
  return { rating, tip: tips[rating] };
}
function interviewVerdict(history){
  const map = { strong:100, solid:75, weak:45 };
  const score = history.length ? Math.round(history.reduce((a,h)=>a+(map[h.rating]||60),0)/history.length) : 0;
  const anyStrong = history.some(h=>h.rating==='strong'), anyWeak = history.some(h=>h.rating==='weak');
  const cls = score>=85 ? 'rate-strong' : score>=65 ? 'rate-solid' : 'rate-weak';
  const headline = score>=85 ? 'You’re interview-ready. Go get it.' : score>=65 ? 'Solid — a little polish and you’re there.' : 'Good start — a few reps will get you ready.';
  const good = anyStrong ? 'specific, detailed answers with real examples' : 'showing up and answering every question';
  const fix = anyWeak ? 'adding concrete examples and numbers to your shorter answers' : 'tightening each answer into a clean STAR story';
  return { score, cls, headline, good, fix };
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
    // self-hosted map libraries (Leaflet + markercluster) — no external CDN dependency
    if(p.startsWith('/vendor/')){
      const base = path.join(__dirname, 'vendor');
      const fp = path.join(base, p.slice('/vendor/'.length).replace(/\.\./g,''));
      if(fp.startsWith(base) && fs.existsSync(fp) && fs.statSync(fp).isFile()){
        const ct = fp.endsWith('.js')?'application/javascript':fp.endsWith('.css')?'text/css':fp.endsWith('.png')?'image/png':'application/octet-stream';
        res.writeHead(200,{'Content-Type':ct,'Cache-Control':'public, max-age=604800'});
        return res.end(fs.readFileSync(fp));
      }
      res.writeHead(404); return res.end('not found');
    }
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

    // ---- Work-in-the-U.S. resource hub — open to all (public, crawlable) ----
    if(p==='/work-authorization' && method==='GET')
      return send(res, V.layout({title:'Work in the U.S.',user,active:'',body:V.workHub()}));

    // ---- GTM sector hubs (public): Manufacturing / Healthcare / Semiconductor ----
    if(p==='/sectors' && method==='GET'){
      const keys = ['semiconductor','manufacturing','healthcare'];
      const cards = [];
      for(const k of keys){ const s = await sectorStats(k); cards.push({key:k, count:s.count, employers:s.employers.length, payLo:s.payLo, payHi:s.payHi}); }
      return send(res, V.layout({title:'Industries we serve',user,active:'sectors',body:V.sectorHub(cards)}));
    }
    const secMatch = p.match(/^\/sectors\/(semiconductor|manufacturing|healthcare)$/);
    if(secMatch && method==='GET'){
      const key = secMatch[1];
      const s = await sectorStats(key);
      return send(res, V.layout({title:V.SECTOR_META[key].label+' jobs',user,active:'sectors',body:V.sectorPage({key, ...s})}));
    }

    // ---- Career guides (public): real BLS data + who's hiring, per role ----
    if(p==='/careers' && method==='GET'){
      const trades = Object.keys(V.ROLE_BLS);
      const counts = await db.prepare("SELECT trade, COUNT(*) c FROM jobs WHERE status='open' GROUP BY trade").all();
      const cMap = Object.fromEntries(counts.map(r=>[r.trade, r.c]));
      const items = trades.map(t=>({trade:t, openCount:cMap[t]||0}));
      return send(res, V.layout({title:'Career guides',user,active:'careers',body:V.careerHub(items)}));
    }
    const carMatch = p.match(/^\/careers\/([a-z_]+)$/);
    if(carMatch && method==='GET' && V.ROLE_BLS[carMatch[1]]){
      const trade = carMatch[1];
      const employers = await db.prepare("SELECT u.company, COUNT(*) n FROM jobs j JOIN users u ON u.id=j.employer_id WHERE j.trade=? AND j.status='open' AND u.company IS NOT NULL AND u.company<>'' GROUP BY u.company ORDER BY n DESC LIMIT 12").all(trade);
      const metros = await db.prepare("SELECT z.city, COUNT(*) n FROM jobs j JOIN zip_geo z ON z.zip=j.zip WHERE j.trade=? AND j.status='open' GROUP BY z.city ORDER BY n DESC LIMIT 14").all(trade);
      const openCount = (await db.prepare("SELECT COUNT(*) c FROM jobs WHERE trade=? AND status='open'").get(trade)).c;
      return send(res, V.layout({title:(M.TRADES[trade]||trade)+' — career guide',user,active:'careers',body:V.careerGuide({trade, employers, metros, openCount})}));
    }

    // ---- Industry Pulse (trends + community board) — open to all ----
    if(p==='/pulse' && method==='GET'){
      const trending = await db.prepare(`SELECT trade, COUNT(*) n FROM jobs WHERE status='open' GROUP BY trade ORDER BY n DESC LIMIT 8`).all();
      const totalOpen = (await db.prepare(`SELECT COUNT(*) c FROM jobs WHERE status='open'`).get()).c;
      const posts = await db.prepare(`SELECT * FROM posts ORDER BY created_at DESC, id DESC LIMIT 40`).all();
      const companies = await db.prepare(`SELECT u.company, u.company_city, COUNT(*) n FROM jobs j JOIN users u ON u.id=j.employer_id
        WHERE j.status='open' AND u.company IS NOT NULL AND u.company<>'' GROUP BY u.id ORDER BY n DESC LIMIT 8`).all();
      const demandGeo = await jobGeoAll();
      const now = new Date();
      const season = M.seasonalTrades(now.getMonth()).map(t=>({trade:t, why:M.SEASON_WHY[t]||''}));
      const monthName = now.toLocaleString('en-US',{month:'long'});
      // supply vs demand: live jobs & workers per trade → market-tightness index
      const jobsByTrade = await db.prepare(`SELECT trade, COUNT(*) n FROM jobs WHERE status='open' GROUP BY trade`).all();
      const wkByTrade = await db.prepare(`SELECT trade, COUNT(*) n FROM worker_profiles WHERE trade IS NOT NULL AND trade<>'' GROUP BY trade`).all();
      const jMap = Object.fromEntries(jobsByTrade.map(r=>[r.trade, r.n]));
      const wMap = Object.fromEntries(wkByTrade.map(r=>[r.trade, r.n]));
      const balAll = [...new Set([...Object.keys(jMap), ...Object.keys(wMap)])]
        .map(tr => M.marketBalance(tr, jMap[tr]||0, wMap[tr]||0))
        .filter(b => b.demand >= 600)
        .sort((a,b)=> b.ratio-a.ratio);
      // lead with the tightest markets (worker leverage), but show a couple of competitive ones
      // at the bottom so the board reflects the real spectrum rather than looking uniform.
      const balance = balAll.length > 9 ? [...balAll.slice(0,7), ...balAll.slice(-2)] : balAll;
      return send(res, V.layout({title:'Industry Pulse', user, active:'pulse', body:V.pulsePage({user, trending, posts, totalOpen, companies, demandGeo, season, monthName, balance})}));
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
      const rating = await ratingFor(wid, 'worker');
      const reviews = await reviewsFor(wid, 'worker');
      return send(res, V.layout({title:`${worker.name} — Trades portfolio`, user, body:V.publicPortfolio({worker,profile,creds,portfolio,work,rating,reviews,showUp:await showUp(wid)})}));
    }

    if(p==='/signup' && method==='POST'){
      const b = await readBody(req);
      const role = b.role==='employer'?'employer':'worker';
      if(!b.email||!b.pass||!b.name) return send(res, V.layout({title:'Sign up',user:null,body:V.authForm('signup',{role,google:googleEnabled,error:'All fields are required.'})}));
      try{
        const info = await db.prepare('INSERT INTO users(email,pass,role,name,company) VALUES(?,?,?,?,?)')
          .run(b.email.toLowerCase().trim(), hashPassword(b.pass), role, b.name.trim(), role==='employer'?(b.company||'').trim():null);
        setSession(req, res, info.lastInsertRowid);
        // new employers set up their company first so worker-facing job pages aren't empty
        return redirect(res, role==='employer'?'/console/company?welcome=1':'/app/onboard');
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
        try { await geocodeZip(b.zip); } catch(e){} // pin new worker on the map immediately
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
        let coach = null;
        if(!isNewWorker){ try { const r = await coachReco(user.id); if(r && r.topCred) coach = { line: coachLineFallback(r.topCred), url: r.topCred.url }; } catch(e){} }
        const needZip = matches.length ? !!matches[0].needZip : false;
        const seasonTrades = M.seasonalTrades(new Date().getMonth());
        const myInSeason = profTrades(prof).find(t=>seasonTrades.includes(t));
        const seasonHint = myInSeason ? {trade:myInSeason, why:M.SEASON_WHY[myInSeason]||''} : null;
        return send(res, V.layout({title:'Home',user,active:'home',body:V.workerHome({user,profile:prof,creds,matches,workCount,portCount,jobsGeo,isNew:isNewWorker,coach,needZip,seasonHint})}));
      }
      if(p==='/app/agents' && method==='GET')
        return send(res, V.layout({title:'Agents',user,active:'agents',body:V.agentsHub({mode:'worker'})}));
      if(p==='/app/coach' && method==='GET'){
        const reco = await coachReco(user.id);
        let line = '';
        if(reco && reco.topCred){
          const tradeLabels = profTrades(prof).map(t=>M.TRADES[t]||t);
          line = await LLM.coachLine({ tradeLabels, credLabel:reco.topCred.label, jobsUnlocked:reco.topCred.jobsUnlocked, payDelta:reco.topCred.payDelta });
        } else {
          line = 'Add your trade and ZIP to your Work Card and I’ll map the fastest way to more, better-paying jobs.';
        }
        return send(res, V.layout({title:'Career Coach',user,active:'home',body:V.workerCoach({profile:prof, reco, line})}));
      }
      if(p==='/app/agent/apply' && method==='POST'){
        const matches = await rankJobsForWorker(user.id);
        const appliedIds = new Set((await db.prepare('SELECT job_id FROM applications WHERE worker_id=?').all(user.id)).map(r=>r.job_id));
        const picks = matches.filter(m=> m.score>=60 && !isExternalJob(m.job) && !appliedIds.has(m.job.id) && (m.distance==null || m.distance<=120)).slice(0,5);
        const applied = [];
        for(const m of picks){
          try { await db.prepare('INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,?,?)').run(m.job.id, user.id, 'Sourced', m.score);
            applied.push({...m.job, score:m.score, distance:m.distance}); } catch(e){}
        }
        return send(res, V.layout({title:'Apply Agent',user,active:'jobs',body:V.agentApplyResult({applied, already:appliedIds.size, total:matches.length})}));
      }
      if(p==='/app/onboard/chat' && method==='GET'){
        const s = ONBOARD_STEPS[0];
        return send(res, V.layout({title:'Onboarding Agent',user,active:'',body:V.onboardChat({question:s.q, placeholder:s.ph, transcript:[], done:false, step:0})}));
      }
      if(p==='/app/onboard/chat' && method==='POST'){
        const b = await readBody(req);
        let step = Math.max(0, Math.min(ONBOARD_STEPS.length, Number(b.step)||0));
        await applyOnboardAnswer(user.id, step, b.answer);
        step += 1;
        const fresh = await getProfile(user.id);
        if(step >= ONBOARD_STEPS.length){
          await recomputeReadiness(user.id);
          return send(res, V.layout({title:'Onboarding Agent',user,active:'',body:V.onboardChat({transcript:onboardTranscript(fresh, step), done:true})}));
        }
        const s = ONBOARD_STEPS[step];
        return send(res, V.layout({title:'Onboarding Agent',user,active:'',body:V.onboardChat({question:s.q, placeholder:s.ph, transcript:onboardTranscript(fresh, step), done:false, step})}));
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
        const needZip = matches.length ? !!matches[0].needZip : false;
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
        return send(res, V.layout({title:'Find work',user,active:'jobs',body:V.workerJobs({matches, filters:f, jobsGeo, needZip})}));
      }
      if(p==='/app/profile' && method==='GET'){
        const portfolio = await db.prepare("SELECT * FROM media WHERE user_id=? AND target='portfolio' ORDER BY created_at DESC, id DESC").all(user.id);
        const work = await getWorkHistory(user.id);
        return send(res, V.layout({title:'Work Card',user,active:'profile',body:V.workerProfile({user,profile:prof,creds:await getCreds(user.id),portfolio,work,rating:await ratingFor(user.id,'worker'),crew:await crewOf(user.id),showUp:await showUp(user.id)})}));
      }
      if(p==='/app/profile/details' && method==='POST'){
        const b = await readBody(req);
        const trades = normTrades(b.trades);
        const trade = trades[0] || prof.trade;
        const tradesCsv = (trades.length?trades:[trade]).join(',');
        const zip = (String(b.zip||'').match(/\d{5}/)||[''])[0];
        const shift = ['Any','Day','Night','4x10'].includes(b.shift) ? b.shift : (prof.shift||'Any');
        const commute = Math.max(0, Math.min(500, Number(b.commute_mi)||0));
        await db.prepare('UPDATE worker_profiles SET trade=?,trades=?,headline=?,about=?,custom_trade=?,city=?,zip=?,years_exp=?,pay_floor=?,shift=?,commute_mi=? WHERE user_id=?')
          .run(trade, tradesCsv, String(b.headline||'').slice(0,80), String(b.about||'').slice(0,600), String(b.custom_trade||'').slice(0,60),
               String(b.city||'').slice(0,60), zip, Number(b.years_exp)||0, Number(b.pay_floor)||0, shift, commute, user.id);
        await recomputeReadiness(user.id);
        try { await geocodeZip(zip); } catch(e){} // pin on the map + enable distance immediately
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
        // self-reported on add (unverified) — honest until proof is submitted & reviewed
        if(b.kind) await db.prepare("INSERT INTO credentials(user_id,kind,name,verified,expires,verify_status) VALUES(?,?,?,0,?,'unverified')")
          .run(user.id, b.kind, M.CRED_KINDS[b.kind]||b.kind, b.expires||null);
        await recomputeReadiness(user.id);
        return redirect(res,'/app/profile');
      }
      if(p==='/app/crew' && method==='POST'){
        const b = await readBody(req);
        const name = String(b.name||'').trim().slice(0,60);
        if(name) await db.prepare('INSERT INTO crew_members(worker_id,name,trade,note) VALUES(?,?,?,?)')
          .run(user.id, name, (M.TRADES[b.trade]?b.trade:'')||'', String(b.note||'').slice(0,80));
        return redirect(res,'/app/profile');
      }
      const crewDel = p.match(/^\/app\/crew\/(\d+)\/delete$/);
      if(crewDel && method==='POST'){
        await db.prepare('DELETE FROM crew_members WHERE id=? AND worker_id=?').run(Number(crewDel[1]), user.id);
        return redirect(res,'/app/profile');
      }
      const payOut = p.match(/^\/app\/applications\/(\d+)\/pay$/);
      if(payOut && method==='POST'){
        const b = await readBody(req);
        if(['ontime','late','short','unpaid'].includes(b.pay_outcome))
          await db.prepare("UPDATE applications SET pay_outcome=? WHERE id=? AND worker_id=? AND stage='Hired'").run(b.pay_outcome, Number(payOut[1]), user.id);
        return redirect(res,'/app/applications');
      }
      if(p==='/app/work-auth' && method==='POST'){
        const b = await readBody(req);
        const allowed = ['','authorized','need_h2a','need_h2b'];
        const wa = allowed.includes(b.work_auth) ? b.work_auth : '';
        await db.prepare('UPDATE worker_profiles SET work_auth=? WHERE user_id=?').run(wa||null, user.id);
        return redirect(res,'/app/profile');
      }
      const credVerify = p.match(/^\/app\/credentials\/(\d+)\/verify$/);
      if(credVerify && method==='POST'){
        const cid = Number(credVerify[1]); const b = await readBody(req);
        let proof = String(b.proof_url||'').trim().slice(0,500);
        if(proof && !/^https?:\/\//i.test(proof)) proof = 'https://'+proof;
        // Attaching proof closes the loop: the credential becomes verified ("proof on file"),
        // which a recruiter can inspect via the proof link. Without proof it stays self-reported.
        if(proof){
          await db.prepare("UPDATE credentials SET proof_url=?, verified=1, verify_status='verified' WHERE id=? AND user_id=?").run(proof, cid, user.id);
          await recomputeReadiness(user.id);
        }
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
      if(['/app/available','/app/work-today','/app/alerts','/app/relocate','/app/tools','/app/transport','/app/bilingual','/app/veteran','/app/subcontract'].includes(p) && method==='POST'){
        const col = { '/app/available':'available', '/app/work-today':'work_today', '/app/alerts':'alerts', '/app/relocate':'relocate', '/app/tools':'has_tools', '/app/transport':'has_transport', '/app/bilingual':'bilingual', '/app/veteran':'veteran', '/app/subcontract':'self_employed' }[p];
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
        // career tracks ordered by what's actually hiring on Rivet (open jobs by trade)
        const hot = await db.prepare("SELECT trade, COUNT(*) c FROM jobs WHERE status='open' GROUP BY trade ORDER BY c DESC").all();
        const hiring = hot.map(r=>r.trade).filter(t=>V.LEARN_TRACKS[t]);
        return send(res, V.layout({title:'Learn & get hired',user,active:'training',body:V.workerTraining({have, hiring})}));
      }
      if(p==='/app/learn/interview' && (method==='GET'||method==='POST')){
        const b = method==='POST' ? await readBody(req) : {};
        const jobId = String((method==='POST'? b.job : url.searchParams.get('job'))||'').trim();
        let trade = String((method==='POST'? b.trade : url.searchParams.get('trade'))||'').trim();
        let job = null;
        if(jobId){
          job = await db.prepare('SELECT id,title,trade FROM jobs WHERE id=?').get(jobId);
          if(job){ trade = job.trade; const emp = await db.prepare('SELECT u.company FROM users u JOIN jobs j ON j.employer_id=u.id WHERE j.id=?').get(jobId); job.company = emp ? emp.company : ''; }
        }
        const questions = buildInterviewQuestions(trade, job);
        const base = { trade, jobId: job?String(job.id):jobId, company: job?(job.company||''):'', questions, aiOn: LLM.enabled };
        if(method==='GET'){
          return send(res, V.layout({title:'AI mock interview',user,active:'training',body:V.mockInterview({...base, history:[], qi:0, done:false})}));
        }
        let history = []; try { history = JSON.parse(b.history||'[]'); } catch(e){}
        let qi = Math.max(0, Math.min(questions.length-1, Number(b.qi)||0));
        const rated = await rateAnswer(String(b.answer||'').slice(0,900), M.TRADES[trade]||trade, questions[qi]||'');
        history.push({ q: questions[qi]||'', a: String(b.answer||'').slice(0,900), rating: rated.rating, tip: rated.tip });
        qi++;
        const done = qi >= questions.length;
        return send(res, V.layout({title:'AI mock interview',user,active:'training',body:V.mockInterview({...base, history, qi, done, verdict: done?interviewVerdict(history):null})}));
      }
      if(p==='/app/applications' && method==='GET'){
        const apps = await db.prepare(`SELECT a.*, j.title,j.trade,j.pay_min,j.pay_max,j.city,j.zip,u.company,u.id employer_id
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
        const interviews = await db.prepare(`SELECT iv.*, j.title, u.company FROM interviews iv
          JOIN jobs j ON j.id=iv.job_id JOIN users u ON u.id=iv.employer_id
          WHERE iv.worker_id=? ORDER BY iv.status='proposed' DESC, iv.created_at DESC`).all(user.id);
        const myRev = await db.prepare("SELECT job_id,stars FROM reviews WHERE author_id=? AND subject_kind='employer'").all(user.id);
        const empReviews = {}; for(const r of myRev) empReviews[r.job_id] = r;
        return send(res, V.layout({title:'Applications',user,active:'apps',body:V.workerApplications({apps, savedJobs, interviews, empReviews})}));
      }
      // worker rates an employer they worked for (Hired)
      if(p==='/app/reviews' && method==='POST'){
        const b = await readBody(req);
        const jobId = Number(b.job_id)||0, empId = Number(b.employer_id)||0;
        const stars = Math.max(1, Math.min(5, Number(b.stars)||0));
        const safety = (Number(b.safety)>=1 && Number(b.safety)<=5) ? Number(b.safety) : null;
        const ok = jobId && await db.prepare("SELECT 1 FROM applications WHERE job_id=? AND worker_id=? AND stage='Hired'").get(jobId, user.id);
        if(ok && empId && stars){
          try { await db.prepare(`INSERT INTO reviews(author_id,author_name,subject_id,subject_kind,stars,body,job_id,safety)
            VALUES(?,?,?,'employer',?,?,?,?)`).run(user.id, user.name, empId, stars, String(b.body||'').slice(0,400), jobId, safety); } catch(e){}
        }
        return redirect(res, '/app/applications');
      }
      // worker accepts an interview slot
      const ivAccept = p.match(/^\/app\/interviews\/(\d+)\/accept$/);
      if(ivAccept && method==='POST'){
        const ivId = Number(ivAccept[1]); const b = await readBody(req);
        const iv = await db.prepare('SELECT * FROM interviews WHERE id=? AND worker_id=?').get(ivId, user.id);
        if(iv && iv.status==='proposed'){
          let slots = []; try { slots = JSON.parse(iv.slots); } catch(e){}
          const chosen = String(b.chosen||'');
          if(slots.includes(chosen)){
            await db.prepare("UPDATE interviews SET chosen=?, status='confirmed' WHERE id=?").run(chosen, ivId);
            try { await sendMessage(user.id, iv.employer_id, `I confirmed the interview. See you then.`); } catch(e){}
          }
        }
        return redirect(res, '/app/applications');
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
        const empRating = await ratingFor(job.employer_id, 'employer');
        const empPay = await payRep(job.employer_id);
        const myQuote = job.quotes_ok ? await db.prepare('SELECT * FROM quotes WHERE job_id=? AND worker_id=?').get(jid, user.id) : null;
        return send(res, V.layout({title:job.title,user,active:'jobs',body:V.jobDetail({job,match,applied,saved,jobMedia,distance,rules,empRating,workAuth:prof.work_auth||'',empPay,myQuote,payFloor:prof.pay_floor||0,empRehire:await rehireStat(job.employer_id),empSafety:await safetyStat(job.employer_id)})}));
      }
      if(jid && p===`/app/jobs/${jid}/quote` && method==='POST'){
        const job = await db.prepare('SELECT id,title,employer_id,quotes_ok FROM jobs WHERE id=?').get(jid);
        if(job && job.quotes_ok){
          const b = await readBody(req);
          const amount = Math.min(1000000, Math.max(1, Math.round(Number(b.amount)||0)));
          const unit = ['job','hour','day'].includes(b.unit) ? b.unit : 'job';
          if(amount){
            try { await db.prepare(`INSERT INTO quotes(job_id,worker_id,amount,unit,note) VALUES(?,?,?,?,?)
              ON CONFLICT(job_id,worker_id) DO UPDATE SET amount=excluded.amount,unit=excluded.unit,note=excluded.note,status='pending'`)
              .run(jid, user.id, amount, unit, String(b.note||'').slice(0,200)); } catch(e){}
            try { await sendMessage(user.id, job.employer_id, `I sent a price quote on "${job.title}": $${amount} ${unit==='job'?'for the job':'per '+unit}.`); } catch(e){}
          }
        }
        return redirect(res, `/app/jobs/${jid}`);
      }
      if(jid && p===`/app/land/${jid}` && method==='GET'){
        const job = await db.prepare(`SELECT j.*,u.company FROM jobs j JOIN users u ON u.id=j.employer_id WHERE j.id=?`).get(jid);
        if(!job) return redirect(res, '/app/jobs');
        const creds = await getCreds(user.id);
        const match = bestMatch(prof, creds, job);
        const distance = await workerDistance(prof, job.zip);
        const applied = !!(await db.prepare('SELECT 1 FROM applications WHERE job_id=? AND worker_id=?').get(jid,user.id));
        const external = !!(job.apply_url && /^https?:\/\//i.test(job.apply_url));
        return send(res, V.layout({title:'Your game plan',user,active:'jobs',body:V.landJob({
          job, company:job.company||'', score:match.score, breakdown:match.breakdown, missing:match.missing,
          readiness:prof.readiness||0, haveCreds:creds.filter(c=>c.verified).map(c=>c.kind), distance, applied, external })}));
      }
      if(jid && p===`/app/jobs/${jid}/apply` && method==='POST'){
        const job = await db.prepare('SELECT * FROM jobs WHERE id=?').get(jid);
        if(job){ const m=bestMatch(prof,await getCreds(user.id),job);
          let isNew=false;
          try{ const r=await db.prepare('INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,?,?)').run(jid,user.id,'Sourced',m.score); isNew=!!r.changes; }catch(e){}
          // close the loop: let the employer know a verified worker applied
          if(isNew && job.employer_id){ try { await sendMessage(user.id, job.employer_id, `I applied to "${job.title}" — my verified Work Card is attached. Happy to talk.`); } catch(e){} }
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
      if(p==='/console/agents' && method==='GET')
        return send(res, V.layout({title:'Agents',user,active:'agents',body:V.agentsHub({mode:'employer'})}));
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
        return send(res, V.layout({title:'Company profile',user,active:'',body:V.empCompany({user, saved:url.searchParams.get('saved')==='1', welcome:url.searchParams.get('welcome')==='1', rating:await ratingFor(user.id,'employer'), reviews:await reviewsFor(user.id,'employer'), payRep:await payRep(user.id), rehire:await rehireStat(user.id), safety:await safetyStat(user.id)})}));
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
        const ids = jobsRaw.map(j=>j.id);
        const counts = {};
        if(ids.length){
          const ph = ids.map(()=>'?').join(',');
          for(const r of await db.prepare(`SELECT job_id, COUNT(*) c FROM applications WHERE job_id IN (${ph}) GROUP BY job_id`).all(...ids)) counts[r.job_id]=r.c;
        }
        // load workers + creds once, score each job against the shared set
        const cbu = await allCredsByUser();
        const workers = await db.prepare(`SELECT u.id user_id, p.* FROM users u JOIN worker_profiles p ON p.user_id=u.id`).all();
        const jobs = jobsRaw.map(j=>{
          const matched = workers.filter(w=>bestMatch(w, cbu[w.user_id]||[], j).score>=70).length;
          return {...j, applicants: counts[j.id]||0, matched};
        });
        return send(res, V.layout({title:'Jobs',user,active:'jobs',body:V.empJobs({jobs})}));
      }
      if(p==='/console/jobs/new' && method==='GET')
        return send(res, V.layout({title:'Post a job',user,active:'jobs',body:V.empJobForm()}));
      if(p==='/console/jobs/new' && method==='POST'){
        const b = await readBody(req);
        if(!b.title) return send(res, V.layout({title:'Post a job',user,active:'jobs',body:V.empJobForm('Title is required.')}));
        const reqCreds = [].concat(b.req_creds||[]).filter(Boolean).join(',');
        const empType = V.JOB_TYPES.includes(b.employment_type) ? b.employment_type : 'Full-time';
        const spon = ['authorized','h2a','h2b'].includes(b.sponsorship) ? b.sponsorship : 'authorized';
        const crewOk = b.crew_ok ? 1 : 0;
        const posterKind = b.poster_kind==='individual' ? 'individual' : 'company';
        const quotesOk = b.quotes_ok ? 1 : 0;
        const dur = V.DURATIONS.includes(b.duration) ? b.duration : null;
        const fairChance = b.fair_chance ? 1 : 0, vetOk = b.veteran_ok ? 1 : 0, transp = b.transport_provided ? 1 : 0;
        const cad = ['daily','weekly','biweekly','monthly'].includes(b.pay_cadence) ? b.pay_cadence : null;
        const subOk = b.subcontract_ok ? 1 : 0;
        const info = await db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type,sponsorship,crew_ok,poster_kind,quotes_ok,duration,fair_chance,veteran_ok,transport_provided,pay_cadence,subcontract_ok)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(user.id,b.title,b.trade,Number(b.pay_min)||0,Number(b.pay_max)||0,b.city||'',b.zip||'',b.shift||'Day',reqCreds,b.descr||'',empType,spon,crewOk,posterKind,quotesOk,dur,fairChance,vetOk,transp,cad,subOk);
        const jobId = info.lastInsertRowid;
        try { await geocodeZip(b.zip); } catch(e){} // pin new job on the demand map immediately
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
        const appId = Number(aMatch[1]);
        const before = await db.prepare(`SELECT a.stage, a.worker_id, a.job_id, j.title, u.phone, p.alerts
          FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=a.worker_id
          LEFT JOIN worker_profiles p ON p.user_id=a.worker_id WHERE a.id=?`).get(appId);
        if(V.STAGES.includes(b.stage)){
          await db.prepare('UPDATE applications SET stage=? WHERE id=?').run(b.stage, appId);
          // close the feedback loop: tell the worker when their status changes
          if(before && before.stage!==b.stage && before.job_id){
            const label = { Screened:'was screened in', Interview:'was moved to Interview', Offer:'received an Offer', Hired:'was Hired 🎉', Sourced:'was added to the pipeline' }[b.stage] || `is now ${b.stage}`;
            try { await sendMessage(user.id, before.worker_id, `Update on "${before.title}": your application ${label}. Open Applications to see next steps.`); } catch(e){}
            if(before.alerts && before.phone && (b.stage==='Interview'||b.stage==='Offer'||b.stage==='Hired')){
              try { await sendSms(before.phone, `Rivet: update on "${before.title}" — your application ${label.replace(' 🎉','')}. Open the app for next steps.`); } catch(e){}
            }
          }
        }
        return redirect(res, `/console/jobs/${before?before.job_id:''}`);
      }
      // Homeowner/poster accepts a worker's price quote
      const qAccept = p.match(/^\/console\/jobs\/(\d+)\/quotes\/(\d+)\/accept$/);
      if(qAccept && method==='POST'){
        const jobId=Number(qAccept[1]), qId=Number(qAccept[2]);
        const job = await db.prepare('SELECT id,title FROM jobs WHERE id=? AND employer_id=?').get(jobId, user.id);
        const q = job && await db.prepare('SELECT * FROM quotes WHERE id=? AND job_id=?').get(qId, jobId);
        if(job && q){
          await db.prepare("UPDATE quotes SET status='declined' WHERE job_id=?").run(jobId);
          await db.prepare("UPDATE quotes SET status='accepted' WHERE id=?").run(qId);
          // move the chosen worker into the pipeline as Hired
          try { await db.prepare("INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,'Hired',90) ON CONFLICT(job_id,worker_id) DO UPDATE SET stage='Hired'").run(jobId, q.worker_id); } catch(e){}
          try { await sendMessage(user.id, q.worker_id, `Good news — I accepted your $${q.amount} quote for "${job.title}". Let's coordinate the details here.`); } catch(e){}
        }
        return redirect(res, `/console/jobs/${jobId}`);
      }
      // Show-Up Score: employer records whether a hired worker showed up
      const outMatch = p.match(/^\/console\/applications\/(\d+)\/outcome$/);
      if(outMatch && method==='POST'){
        const b = await readBody(req); const appId = Number(outMatch[1]);
        const ok = await db.prepare(`SELECT a.id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND j.employer_id=? AND a.stage='Hired'`).get(appId, user.id);
        const app = await db.prepare('SELECT job_id FROM applications WHERE id=?').get(appId);
        if(ok && ['showed','noshow','cancelled'].includes(b.outcome))
          await db.prepare('UPDATE applications SET outcome=? WHERE id=?').run(b.outcome, appId);
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
        const spon = ['authorized','h2a','h2b'].includes(b.sponsorship) ? b.sponsorship : (job.sponsorship||'authorized');
        const crewOk = b.crew_ok ? 1 : 0;
        const posterKind = b.poster_kind==='individual' ? 'individual' : 'company';
        const quotesOk = b.quotes_ok ? 1 : 0;
        const dur = V.DURATIONS.includes(b.duration) ? b.duration : null;
        const fairChance = b.fair_chance ? 1 : 0, vetOk = b.veteran_ok ? 1 : 0, transp = b.transport_provided ? 1 : 0;
        const cad = ['daily','weekly','biweekly','monthly'].includes(b.pay_cadence) ? b.pay_cadence : null;
        const subOk = b.subcontract_ok ? 1 : 0;
        await db.prepare(`UPDATE jobs SET title=?,trade=?,pay_min=?,pay_max=?,city=?,zip=?,shift=?,req_creds=?,descr=?,employment_type=?,sponsorship=?,crew_ok=?,poster_kind=?,quotes_ok=?,duration=?,fair_chance=?,veteran_ok=?,transport_provided=?,pay_cadence=?,subcontract_ok=? WHERE id=? AND employer_id=?`)
          .run(String(b.title).slice(0,120), b.trade||job.trade, Number(b.pay_min)||0, Number(b.pay_max)||0, b.city||'', b.zip||'', b.shift||'Day', reqCreds, String(b.descr||'').slice(0,2000), empType, spon, crewOk, posterKind, quotesOk, dur, fairChance, vetOk, transp, cad, subOk, jobId, user.id);
        return redirect(res, `/console/jobs/${jobId}`);
      }

      const jid = qid(p);
      if(jid && p===`/console/jobs/${jid}` && method==='GET'){
        const job = await db.prepare('SELECT * FROM jobs WHERE id=? AND employer_id=?').get(jid,user.id);
        if(!job) return send(res, V.layout({title:'Not found',user,body:'<section class="wrap"><div class="card">Job not found.</div></section>'}),404);
        const apps = await db.prepare(`SELECT a.id app_id,a.stage,a.score,a.outcome,u.id worker_id,u.name,p.trade FROM applications a
          JOIN users u ON u.id=a.worker_id JOIN worker_profiles p ON p.user_id=a.worker_id WHERE a.job_id=?`).all(jid);
        const columns = {}; for(const st of V.STAGES) columns[st]=[];
        const inPipe = new Set(); for(const a of apps){ (columns[a.stage]=columns[a.stage]||[]).push(a); inPipe.add(a.name); }
        const candidates = (await rankWorkersForJob(job)).filter(w=>!inPipe.has(w.name)).slice(0,5);
        const jobMedia = await db.prepare("SELECT * FROM media WHERE job_id=? AND target='job' ORDER BY created_at DESC, id DESC").all(jid);
        const alerted = Number(url.searchParams.get('alerted'))||0;
        const sourced = Number(url.searchParams.get('sourced'))||0;
        const quotes = job.quotes_ok ? await db.prepare(`SELECT q.*, u.name FROM quotes q JOIN users u ON u.id=q.worker_id WHERE q.job_id=? ORDER BY q.status='accepted' DESC, q.amount ASC`).all(jid) : [];
        // market read for this role's trade → staffing-difficulty advice for the recruiter
        const mJobs = (await db.prepare(`SELECT COUNT(*) n FROM jobs WHERE trade=? AND status='open'`).get(job.trade)).n;
        const mWk = (await db.prepare(`SELECT COUNT(*) n FROM worker_profiles WHERE trade=?`).get(job.trade)).n;
        const mb = M.marketBalance(job.trade, mJobs, mWk);
        const market = { trade: M.TRADES[job.trade]||job.trade, level: mb.level, label: M.BALANCE_LABEL[mb.level], ratio: mb.ratio };
        return send(res, V.layout({title:job.title,user,active:'jobs',body:V.empPipeline({job,columns,candidates,jobMedia,alerted,sourced,quotes,market})}));
      }

      if(p==='/console/search' && method==='GET'){
        const filters = {trade:url.searchParams.get('trade')||'', verified:!!url.searchParams.get('verified'), ready:!!url.searchParams.get('ready'), avail:!!url.searchParams.get('avail'), today:!!url.searchParams.get('today'), relocate:!!url.searchParams.get('relocate'), tools:!!url.searchParams.get('tools'), transport:!!url.searchParams.get('transport'), bilingual:!!url.searchParams.get('bilingual')};
        const rowsRaw = await db.prepare(`SELECT u.id,u.name,p.* FROM users u JOIN worker_profiles p ON p.user_id=u.id`).all();
        const cbu = await allCredsByUser();
        let rows = rowsRaw.map(w=>({...w, creds:(cbu[w.id]||[]).filter(c=>!filters.verified||c.verified)}));
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
      // employer rates a worker they hired
      const cReview = p.match(/^\/console\/candidates\/(\d+)\/review$/);
      if(cReview && method==='POST'){
        const wid = Number(cReview[1]); const b = await readBody(req);
        const stars = Math.max(1, Math.min(5, Number(b.stars)||0));
        const jobId = Number(b.job_id)||null;
        // only allow if this worker is Hired on one of the employer's jobs
        const ok = jobId && await db.prepare(`SELECT 1 FROM applications a JOIN jobs j ON j.id=a.job_id
          WHERE a.worker_id=? AND a.job_id=? AND a.stage='Hired' AND j.employer_id=?`).get(wid, jobId, user.id);
        if(ok && stars){
          try { await db.prepare(`INSERT INTO reviews(author_id,author_name,subject_id,subject_kind,stars,body,job_id)
            VALUES(?,?,?,'worker',?,?,?)`).run(user.id, user.company||user.name, wid, stars, String(b.body||'').slice(0,400), jobId); } catch(e){}
        }
        return redirect(res, `/console/candidates/${wid}`);
      }
      // employer proposes interview times to a candidate in their pipeline
      if(p==='/console/interviews' && method==='POST'){
        const b = await readBody(req);
        const jobId = Number(b.job_id)||0, wid = Number(b.worker_id)||0;
        const job = jobId && await db.prepare('SELECT id,title FROM jobs WHERE id=? AND employer_id=?').get(jobId, user.id);
        const inPipe = job && await db.prepare('SELECT 1 FROM applications WHERE job_id=? AND worker_id=?').get(jobId, wid);
        if(job && inPipe){
          const slots = [b.slot1,b.slot2,b.slot3].map(s=>String(s||'').trim()).filter(Boolean);
          if(slots.length){
            try { await db.prepare(`INSERT INTO interviews(job_id,worker_id,employer_id,slots,status) VALUES(?,?,?,?,'proposed')`)
              .run(jobId, wid, user.id, JSON.stringify(slots)); } catch(e){}
            try { await sendMessage(user.id, wid, `Interview invite for "${job.title}" — open your Applications to pick a time.`); } catch(e){}
          }
        }
        return redirect(res, `/console/candidates/${wid}`);
      }
      if(p==='/console/shortlist' && method==='GET'){
        const rows = await db.prepare(`SELECT u.id,u.name,p.* FROM saved_candidates s
          JOIN users u ON u.id=s.worker_id JOIN worker_profiles p ON p.user_id=s.worker_id
          WHERE s.employer_id=? ORDER BY s.created_at DESC`).all(user.id);
        return send(res, V.layout({title:'Shortlist',user,active:'search',body:V.empShortlist({rows})}));
      }

      // Sourcing agent: auto-add top matches for a job to the pipeline (with AI rationale note)
      const jSource = p.match(/^\/console\/jobs\/(\d+)\/source$/);
      if(jSource && method==='POST'){
        const jobId = Number(jSource[1]);
        const job = await db.prepare('SELECT * FROM jobs WHERE id=? AND employer_id=?').get(jobId, user.id);
        let sourced = 0;
        if(job){
          const inPipe = new Set((await db.prepare('SELECT worker_id FROM applications WHERE job_id=?').all(jobId)).map(r=>r.worker_id));
          const ranked = (await rankWorkersForJob(job)).filter(w=>!inPipe.has(w.user_id) && w.score>=70).slice(0,5);
          for(const w of ranked){
            try {
              await db.prepare('INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,?,?)').run(jobId, w.user_id, 'Sourced', w.score);
              const reasons = [];
              if(w.score>=85) reasons.push(`${M.TRADES[w.trade]||w.trade} match ${w.score}/100`); else reasons.push(`${w.score}/100 fit`);
              if(w.available) reasons.push('available now');
              if(w.work_today) reasons.push('can work today');
              if(w.readiness>=85) reasons.push(`readiness ${w.readiness}`);
              const line = await LLM.sourceLine({ tradeLabel:M.TRADES[w.trade]||w.trade, jobTitle:job.title, score:w.score, reasons });
              await db.prepare('INSERT INTO notes(author_id,worker_id,body) VALUES(?,?,?)').run(user.id, w.user_id, `🤖 Sourcing Agent: ${line}`);
              sourced++;
            } catch(e){}
          }
        }
        return redirect(res, `/console/jobs/${jobId}?sourced=${sourced}`);
      }
      // Screening agent: generate tailored screen questions + fit summary, render on candidate page
      const cScreen = p.match(/^\/console\/candidates\/(\d+)\/screen$/);
      if(cScreen && method==='POST'){
        const wid = Number(cScreen[1]); const b = await readBody(req);
        const jobId = Number(b.job_id)||0;
        const job = jobId && await db.prepare('SELECT * FROM jobs WHERE id=? AND employer_id=?').get(jobId, user.id);
        const prof = await getProfile(wid); const creds = await getCreds(wid);
        let screen = null;
        if(job && prof){
          const have = new Set(creds.map(c=>c.kind));
          const reqs = String(job.req_creds||'').split(',').map(s=>s.trim()).filter(Boolean);
          const res2 = await LLM.screen({
            name:(await db.prepare('SELECT name FROM users WHERE id=?').get(wid)||{}).name||'Candidate',
            tradeLabels: profTrades(prof).map(t=>M.TRADES[t]||t),
            jobTitle: job.title,
            reqCredLabels: reqs.map(r=>M.CRED_KINDS[r]||r),
            missingCredLabels: reqs.filter(r=>!have.has(r)).map(r=>M.CRED_KINDS[r]||r),
            available: !!prof.available, hasTransport: !!prof.has_transport,
            payFloor: prof.pay_floor||0, jobPayMax: job.pay_max||0,
          });
          screen = { ...res2, jobId };
        }
        return sendCandidate(res, user, wid, screen);
      }
      // Scheduling agent: auto-propose 3 interview slots to a pipelined candidate
      const cAuto = p.match(/^\/console\/candidates\/(\d+)\/autoschedule$/);
      if(cAuto && method==='POST'){
        const wid = Number(cAuto[1]); const b = await readBody(req);
        const jobId = Number(b.job_id)||0;
        const job = jobId && await db.prepare('SELECT id,title FROM jobs WHERE id=? AND employer_id=?').get(jobId, user.id);
        const inPipe = job && await db.prepare('SELECT 1 FROM applications WHERE job_id=? AND worker_id=?').get(jobId, wid);
        const existing = job && await db.prepare('SELECT 1 FROM interviews WHERE job_id=? AND worker_id=?').get(jobId, wid);
        if(job && inPipe && !existing){
          const slots = []; let added=0, day=2;
          while(added<3 && day<10){
            const d = new Date(); d.setDate(d.getDate()+day); d.setHours(added%2?14:10,0,0,0);
            const dow = d.getDay(); if(dow!==0 && dow!==6){ slots.push(d.toISOString()); added++; }
            day++;
          }
          try {
            await db.prepare("INSERT INTO interviews(job_id,worker_id,employer_id,slots,status) VALUES(?,?,?,?,'proposed')").run(jobId, wid, user.id, JSON.stringify(slots));
            await sendMessage(user.id, wid, `Interview invite for "${job.title}" — open your Applications to pick a time.`);
          } catch(e){}
        }
        return redirect(res, `/console/candidates/${wid}`);
      }
      const cInvite = p.match(/^\/console\/candidates\/(\d+)\/inviteback$/);
      if(cInvite && method==='POST'){
        const wid = Number(cInvite[1]); const b = await readBody(req);
        const jobId = Number(b.job_id)||0;
        const job = jobId && await db.prepare('SELECT id,title FROM jobs WHERE id=? AND employer_id=?').get(jobId, user.id);
        if(job && await hiredBefore(user.id, wid)){
          const prof = await getProfile(wid); const m = bestMatch(prof, await getCreds(wid), job);
          try { await db.prepare("INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,'Sourced',?)").run(jobId, wid, m.score); } catch(e){}
          try { await sendMessage(user.id, wid, `We'd love to have you back — I added you to "${job.title}". Interested?`); } catch(e){}
        }
        return redirect(res, `/console/candidates/${wid}`);
      }
      const candMatch = p.match(/^\/console\/candidates\/(\d+)$/);
      if(candMatch && method==='GET') return sendCandidate(res, user, Number(candMatch[1]));
    }

    // 404
    return send(res, V.layout({title:'Not found',user,body:'<section class="wrap"><div class="card"><h2>404</h2><p>Page not found. <a href="/">Home</a></p></div></section>'}),404);
  } catch (err) {
    console.error(err);
    return send(res, V.layout({title:'Error',user,body:`<section class="wrap"><div class="card"><h2>Something went wrong</h2><p class="muted">Please try again. If it keeps happening, contact us.</p></div></section>`}),500);
  }
});

// Live job ingestion from companies' public job boards (Greenhouse). Runs in the
// background after boot, at most every 6h, so prod stays full of real current postings.
const { ingestLiveJobs } = require('./jobs_live');
async function refreshLiveJobs(){
  try {
    const last = await db.prepare("SELECT v FROM meta WHERE k='live_at'").get();
    const age = last ? (Date.now() - Number(last.v)) : Infinity;
    const liveCount = (await db.prepare("SELECT COUNT(*) c FROM jobs WHERE apply_url LIKE '%greenhouse%' OR apply_url LIKE '%psiquantum%'").get()).c;
    if(age < 6*3600*1000 && liveCount >= 400) return; // fresh enough and well-stocked
    const r = await ingestLiveJobs(db);
    await db.prepare("INSERT INTO meta(k,v) VALUES('live_at',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(String(Date.now()));
    console.log(`[live] ingested ${r.added} new real jobs (scanned ${r.scanned})`);
  } catch(e){ console.error('[live] ingest skipped (non-fatal):', e.message); }
}

init()
  .then(loadTranslations)
  .then(()=> server.listen(PORT, ()=>console.log(`Rivet × Crewline running → http://localhost:${PORT}`)))
  .then(()=> { prewarmEs().catch(()=>{}); setTimeout(()=>{ refreshLiveJobs(); }, 3000); })
  .catch(err=>{ console.error('init failed', err); process.exit(1); });
