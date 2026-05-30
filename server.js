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

const PORT = process.env.PORT || 3000;
const SECRET = process.env.RIVET_SECRET || 'dev-secret-change-me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const googleEnabled = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

function baseUrl(req){
  const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'http';
  return `${proto}://${req.headers.host}`;
}
function getCookie(req, name){
  const c = (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
  return c ? c.slice(name.length+1) : null;
}

// ---------- session: signed cookie holding the user id (stateless) ----------
function sign(val){ return crypto.createHmac('sha256', SECRET).update(val).digest('hex').slice(0,32); }
function setSession(res, uid){
  const v = String(uid), token = `${v}.${sign(v)}`;
  res.setHeader('Set-Cookie', `sess=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`);
}
function clearSession(res){ res.setHeader('Set-Cookie', 'sess=; HttpOnly; Path=/; Max-Age=0'); }
async function getUser(req){
  const cookie = (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sess='));
  if(!cookie) return null;
  const token = cookie.slice(5);
  const [uid, sig] = token.split('.');
  if(!uid || sig !== sign(uid)) return null;
  return (await db.prepare('SELECT id,email,role,name,company FROM users WHERE id=?').get(Number(uid))) || null;
}

// ---------- helpers ----------
function send(res, html, code=200){ res.writeHead(code, {'Content-Type':'text/html; charset=utf-8'}); res.end(html); }
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
const openJobs   = () => db.prepare(`SELECT j.*, u.company FROM jobs j JOIN users u ON u.id=j.employer_id WHERE j.status='open' ORDER BY j.created_at DESC`).all();

async function rankJobsForWorker(uid){
  const prof = await getProfile(uid); const creds = await getCreds(uid);
  const jobs = await openJobs();
  return jobs.map(j=>{ const r=M.scoreMatch(prof,creds,j); return {job:j, score:r.score, missing:r.missing}; })
    .sort((a,b)=>b.score-a.score);
}
async function rankWorkersForJob(job){
  const workers = await db.prepare(`SELECT u.id user_id,u.name,p.* FROM users u JOIN worker_profiles p ON p.user_id=u.id WHERE u.role='worker'`).all();
  const out = [];
  for(const w of workers){ const creds=await getCreds(w.user_id); const r=M.scoreMatch(w,creds,job);
    out.push({...w, score:r.score, readiness:w.readiness}); }
  return out.sort((a,b)=>b.score-a.score);
}

// ---------- router ----------
const server = http.createServer(async (req,res)=>{
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname, method = req.method;
  const user = await getUser(req);

  try {
    // static
    if(p==='/styles.css'){ res.writeHead(200,{'Content-Type':'text/css'}); return res.end(fs.readFileSync(path.join(__dirname,'styles.css'))); }

    // ---- public ----
    if(p==='/' && method==='GET'){
      if(user) return redirect(res, user.role==='employer'?'/console':'/app');
      return send(res, V.layout({title:'Hire & get hired in the trades', user:null, body:V.landing()}));
    }
    if(p==='/signup' && method==='GET')
      return send(res, V.layout({title:'Sign up', user:null, body:V.authForm('signup',{role:url.searchParams.get('role')||'worker', google:googleEnabled})}));
    if(p==='/login' && method==='GET')
      return send(res, V.layout({title:'Log in', user:null, body:V.authForm('login',{google:googleEnabled})}));

    if(p==='/signup' && method==='POST'){
      const b = await readBody(req);
      const role = b.role==='employer'?'employer':'worker';
      if(!b.email||!b.pass||!b.name) return send(res, V.layout({title:'Sign up',user:null,body:V.authForm('signup',{role,google:googleEnabled,error:'All fields are required.'})}));
      try{
        const info = await db.prepare('INSERT INTO users(email,pass,role,name,company) VALUES(?,?,?,?,?)')
          .run(b.email.toLowerCase().trim(), hashPassword(b.pass), role, b.name.trim(), role==='employer'?(b.company||'').trim():null);
        setSession(res, info.lastInsertRowid);
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
      setSession(res, u.id);
      return redirect(res, u.role==='employer'?'/console':'/app');
    }
    if(p==='/logout'){ clearSession(res); return redirect(res,'/'); }

    // ---- Google OAuth (only active when GOOGLE_CLIENT_ID/SECRET are set) ----
    if(p==='/auth/google' && method==='GET'){
      if(!googleEnabled) return redirect(res,'/login');
      const role = url.searchParams.get('role')==='employer' ? 'employer' : 'worker';
      const state = `${crypto.randomBytes(16).toString('hex')}:${role}`;
      res.setHeader('Set-Cookie', `gstate=${state}.${sign(state)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600`);
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
        setSession(res, u.id);
        return redirect(res, u.role==='employer' ? '/console' : '/app');
      } catch(e){
        console.error('google oauth', e);
        return redirect(res,'/login');
      }
    }

    // ---- worker (Rivet) ----
    if(p.startsWith('/app')){
      if(!user) return redirect(res,'/login');
      if(user.role!=='worker') return redirect(res,'/console');
      const prof = await getProfile(user.id);

      if(p==='/app/onboard' && method==='GET') return send(res, V.layout({title:'Set up',user,active:'',body:V.workerOnboard()}));
      if(p==='/app/onboard' && method==='POST'){
        const b = await readBody(req);
        const vals = [b.trade, Number(b.years_exp)||0, b.city||'', b.zip||'', Number(b.pay_floor)||0, b.shift||'Any'];
        if(prof) await db.prepare('UPDATE worker_profiles SET trade=?,years_exp=?,city=?,zip=?,pay_floor=?,shift=? WHERE user_id=?').run(...vals,user.id);
        else await db.prepare('INSERT INTO worker_profiles(user_id,trade,years_exp,city,zip,pay_floor,shift) VALUES(?,?,?,?,?,?,?)').run(user.id,...vals);
        await recomputeReadiness(user.id);
        return redirect(res,'/app');
      }
      if(!prof) return redirect(res,'/app/onboard');

      if(p==='/app' && method==='GET')
        return send(res, V.layout({title:'Home',user,active:'home',body:V.workerHome({user,profile:prof,creds:await getCreds(user.id),matches:await rankJobsForWorker(user.id)})}));
      if(p==='/app/jobs' && method==='GET')
        return send(res, V.layout({title:'Matches',user,active:'jobs',body:V.workerJobs({matches:await rankJobsForWorker(user.id)})}));
      if(p==='/app/profile' && method==='GET')
        return send(res, V.layout({title:'Work Card',user,active:'profile',body:V.workerProfile({user,profile:prof,creds:await getCreds(user.id)})}));
      if(p==='/app/credentials' && method==='POST'){
        const b = await readBody(req);
        if(b.kind) await db.prepare('INSERT INTO credentials(user_id,kind,name,verified,expires) VALUES(?,?,?,1,?)')
          .run(user.id, b.kind, M.CRED_KINDS[b.kind]||b.kind, b.expires||null);
        await recomputeReadiness(user.id);
        return redirect(res,'/app/profile');
      }
      if(p==='/app/applications' && method==='GET'){
        const apps = await db.prepare(`SELECT a.*, j.title,j.trade,j.pay_min,j.pay_max,j.city,u.company
          FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=j.employer_id
          WHERE a.worker_id=? ORDER BY a.created_at DESC`).all(user.id);
        const body = `<section class="wrap"><div class="sec-h big">Your applications</div>
          ${apps.map(a=>`<div class="card jobline-static"><div class="jl-left"><div class="badge">${({electrician:'⚡',hvac:'🔧',controls:'🏭'}[a.trade]||'🧰')}</div>
            <div><h4>${a.title}</h4><div class="muted">${a.company||''} · ${a.city} · $${a.pay_min}–${a.pay_max}/hr</div></div></div>
            <div><span class="stage-pill">${a.stage}</span> <span class="score-tag ${a.score>=85?'s-hi':a.score>=70?'s-md':'s-lo'}">${a.score}</span></div></div>`).join('')
            || '<div class="card muted">No applications yet. <a href="/app/jobs">Browse matches →</a></div>'}
          </section>`;
        return send(res, V.layout({title:'Applications',user,active:'apps',body}));
      }
      const jid = qid(p);
      if(jid && p===`/app/jobs/${jid}` && method==='GET'){
        const job = await db.prepare(`SELECT j.*,u.company FROM jobs j JOIN users u ON u.id=j.employer_id WHERE j.id=?`).get(jid);
        if(!job) return send(res, V.layout({title:'Not found',user,body:'<section class="wrap"><div class="card">Job not found.</div></section>'}),404);
        const match = M.scoreMatch(prof, await getCreds(user.id), job);
        const applied = !!(await db.prepare('SELECT 1 FROM applications WHERE job_id=? AND worker_id=?').get(jid,user.id));
        return send(res, V.layout({title:job.title,user,active:'jobs',body:V.jobDetail({job,match,applied})}));
      }
      if(jid && p===`/app/jobs/${jid}/apply` && method==='POST'){
        const job = await db.prepare('SELECT * FROM jobs WHERE id=?').get(jid);
        if(job){ const m=M.scoreMatch(prof,await getCreds(user.id),job);
          try{ await db.prepare('INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,?,?)').run(jid,user.id,'Sourced',m.score); }catch(e){}
        }
        return redirect(res, `/app/jobs/${jid}`);
      }
    }

    // ---- employer (Crewline) ----
    if(p.startsWith('/console')){
      if(!user) return redirect(res,'/login');
      if(user.role!=='employer') return redirect(res,'/app');

      if(p==='/console' && method==='GET'){
        const jobs = await db.prepare(`SELECT * FROM jobs WHERE employer_id=?`).all(user.id);
        const jobIds = jobs.map(j=>j.id);
        const applicants = jobIds.length? (await db.prepare(`SELECT COUNT(*) c FROM applications WHERE job_id IN (${jobIds.map(()=>'?').join(',')})`).get(...jobIds)).c : 0;
        const pipeline = jobIds.length? (await db.prepare(`SELECT COUNT(*) c FROM applications WHERE stage!='Sourced' AND job_id IN (${jobIds.map(()=>'?').join(',')})`).get(...jobIds)).c : 0;
        const pool = (await db.prepare(`SELECT COUNT(*) c FROM worker_profiles`).get()).c;
        const hot = await db.prepare(`SELECT u.name,p.trade,p.readiness,(SELECT COUNT(*) FROM credentials c WHERE c.user_id=u.id AND c.verified=1) vcount
          FROM users u JOIN worker_profiles p ON p.user_id=u.id WHERE u.role='worker' ORDER BY p.readiness DESC LIMIT 5`).all();
        const alerts = [];
        const expiring = (await db.prepare(`SELECT COUNT(*) c FROM credentials WHERE verified=1 AND expires IS NOT NULL AND expires < '2026-08'`).get()).c;
        if(expiring) alerts.push({lvl:'warn',text:`⚠️ ${expiring} credential(s) in the pool expiring within 60 days.`});
        if(pipeline) alerts.push({lvl:'info',text:`⏳ ${pipeline} candidate(s) advancing in your pipeline.`});
        alerts.push({lvl:'ok',text:`✅ ${pool} verified workers available to match right now.`});
        return send(res, V.layout({title:'Overview',user,active:'ov',body:V.empOverview({user,
          kpis:{openJobs:jobs.filter(j=>j.status==='open').length, pool, applicants, pipeline}, hot, alerts})}));
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
        const info = await db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr)
          VALUES(?,?,?,?,?,?,?,?,?,?)`).run(user.id,b.title,b.trade,Number(b.pay_min)||0,Number(b.pay_max)||0,b.city||'',b.zip||'',b.shift||'Day',reqCreds,b.descr||'');
        return redirect(res, `/console/jobs/${info.lastInsertRowid}`);
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
        if(job && wid){ const prof=await getProfile(wid); const m=M.scoreMatch(prof,await getCreds(wid),job);
          try{ await db.prepare('INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,?,?)').run(jobId,wid,'Sourced',m.score);}catch(e){} }
        return redirect(res, `/console/jobs/${jobId}`);
      }

      const jid = qid(p);
      if(jid && p===`/console/jobs/${jid}` && method==='GET'){
        const job = await db.prepare('SELECT * FROM jobs WHERE id=? AND employer_id=?').get(jid,user.id);
        if(!job) return send(res, V.layout({title:'Not found',user,body:'<section class="wrap"><div class="card">Job not found.</div></section>'}),404);
        const apps = await db.prepare(`SELECT a.id app_id,a.stage,a.score,u.name,p.trade FROM applications a
          JOIN users u ON u.id=a.worker_id JOIN worker_profiles p ON p.user_id=a.worker_id WHERE a.job_id=?`).all(jid);
        const columns = {}; for(const st of V.STAGES) columns[st]=[];
        const inPipe = new Set(); for(const a of apps){ (columns[a.stage]=columns[a.stage]||[]).push(a); inPipe.add(a.name); }
        const candidates = (await rankWorkersForJob(job)).filter(w=>!inPipe.has(w.name)).slice(0,5);
        return send(res, V.layout({title:job.title,user,active:'jobs',body:V.empPipeline({job,columns,candidates})}));
      }

      if(p==='/console/search' && method==='GET'){
        const filters = {trade:url.searchParams.get('trade')||'', verified:!!url.searchParams.get('verified'), ready:!!url.searchParams.get('ready')};
        const rowsRaw = await db.prepare(`SELECT u.id,u.name,p.* FROM users u JOIN worker_profiles p ON p.user_id=u.id WHERE u.role='worker'`).all();
        let rows = [];
        for(const w of rowsRaw){ const creds=(await getCreds(w.id)).filter(c=>!filters.verified||c.verified); rows.push({...w, creds}); }
        if(filters.trade) rows = rows.filter(w=>w.trade===filters.trade);
        if(filters.ready) rows = rows.filter(w=>w.readiness>=85);
        rows.sort((a,b)=>b.readiness-a.readiness);
        return send(res, V.layout({title:'Talent Search',user,active:'search',body:V.empSearch({rows,filters})}));
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
  .then(()=> server.listen(PORT, ()=>console.log(`Rivet × Crewline running → http://localhost:${PORT}`)))
  .catch(err=>{ console.error('init failed', err); process.exit(1); });
