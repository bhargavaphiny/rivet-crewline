'use strict';
/*
 * Rivet x Crewline - server-side HTML views.
 * Plain template-literal rendering. No template engine, no client framework.
 */
const { TRADES, CRED_KINDS } = require('./matching');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const initials = name => esc((name||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase());

function scoreClass(s){ return s>=85?'s-hi':s>=70?'s-md':'s-lo'; }

// ---------- layout ----------
function layout({ title, user, body, active = '', flash = '' }) {
  let nav = '';
  if (!user) {
    nav = `<a class="nav-link" href="/login">Log in</a>
           <a class="btn-sm" href="/signup">Get started</a>`;
  } else if (user.role === 'worker') {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    nav = `${L('/app','Home','home')}${L('/app/jobs','Matches','jobs')}${L('/app/profile','Work Card','profile')}${L('/app/applications','Applications','apps')}
           <span class="who">${initials(user.name)}</span>
           <a class="nav-link" href="/logout">Log out</a>`;
  } else {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    nav = `${L('/console','Overview','ov')}${L('/console/search','Talent','search')}${L('/console/jobs','Jobs','jobs')}
           <span class="who">${initials(user.company||user.name)}</span>
           <a class="nav-link" href="/logout">Log out</a>`;
  }
  const brand = user && user.role==='employer'
    ? `<a class="brand" href="/console"><span class="logo c">C</span> Crewline</a>`
    : `<a class="brand" href="${user?'/app':'/'}"><span class="logo">R</span> Rivet${user?'':' <small>× Crewline</small>'}</a>`;

  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · Rivet × Crewline</title>
  <link rel="stylesheet" href="/styles.css">
  </head><body>
  <header class="topbar"><div class="bar wrap">${brand}<nav>${nav}</nav></div></header>
  ${flash?`<div class="flash wrap">${esc(flash)}</div>`:''}
  <main>${body}</main>
  ${user ? `<footer class="site-foot">Rivet × Crewline — blue-collar hiring platform</footer>`
    : `<footer class="site-foot rich">
    <div class="wrap foot-grid">
      <div class="foot-brand"><a class="brand" href="/"><span class="logo">R</span> Rivet <small>× Crewline</small></a>
        <p>The blue-collar hiring platform — built for the trades.</p></div>
      <div class="foot-col"><h5>For workers</h5><a href="/signup?role=worker">Get started</a><a href="/login">Log in</a></div>
      <div class="foot-col"><h5>For employers</h5><a href="/signup?role=employer">Post a job</a><a href="/login">Log in</a></div>
    </div>
    <div class="wrap foot-base">© 2026 Rivet × Crewline · Phoenix, AZ</div>
  </footer>`}
  </body></html>`;
}

// ---------- marketing landing ----------
function landing() {
  return `
  <section class="hero">
    <div class="wrap">
      <span class="tag">The blue-collar hiring platform · U.S.</span>
      <h1>America can't <b>build</b> what it can't <b>staff.</b></h1>
      <p class="lead">Rivet prepares skilled-trade workers to get hired and certified. Crewline gives employers verified, job-ready crews — fast.</p>
      <div class="cta-row">
        <a class="btn" href="/signup?role=worker">I'm a worker → Rivet</a>
        <a class="btn ghost" href="/signup?role=employer">I'm hiring → Crewline</a>
      </div>
      <p class="demo-note">Demo logins · worker <code>marcus@rivet.test</code> · employer <code>ops@sunvalley.test</code> · password <code>demo1234</code></p>
    </div>
  </section>
  <section class="wrap split2">
    <div class="prodcard worker">
      <h3>📱 Rivet — for workers</h3>
      <ul><li>Verified credential wallet (license, OSHA, EPA)</li><li>Job-readiness score</li><li>Scored job matches near you</li><li>Apply with one tap</li></ul>
    </div>
    <div class="prodcard emp">
      <h3>🖥️ Crewline — for employers</h3>
      <ul><li>Search verified, ready, local talent</li><li>Post jobs, auto-matched instantly</li><li>Trades-stage hiring pipeline</li><li>Credential compliance built in</li></ul>
    </div>
  </section>
  <section class="how wrap">
    <h2 class="how-h">How it works</h2>
    <div class="how-grid">
      <div class="how-col">
        <div class="how-tag worker">For workers · Rivet</div>
        <ol class="steps">
          <li><b>Build your Work Card</b><span>Add your trade, experience and credentials — your readiness score updates live.</span></li>
          <li><b>Get matched</b><span>See local jobs ranked by how well you fit, at the pay you want.</span></li>
          <li><b>Apply in one tap</b><span>Employers see your verified card instantly — no resume, no re-listing.</span></li>
        </ol>
      </div>
      <div class="how-col">
        <div class="how-tag emp">For employers · Crewline</div>
        <ol class="steps">
          <li><b>Post a job</b><span>It's matched against the verified talent pool the moment you publish.</span></li>
          <li><b>Review ranked crews</b><span>Candidates scored on trade fit, pay, location and credential coverage.</span></li>
          <li><b>Move them through</b><span>A trades-stage pipeline from Sourced to Hired — compliance built in.</span></li>
        </ol>
      </div>
    </div>
    <div class="how-cta">
      <a class="btn" href="/signup?role=worker">Get hired → Rivet</a>
      <a class="btn ghost" href="/signup?role=employer">Hire a crew → Crewline</a>
    </div>
  </section>`;
}

// ---------- auth ----------
function authForm(kind, { role = 'worker', error = '', google = false } = {}) {
  const isSignup = kind === 'signup';
  const googleBlock = google ? `
      <a class="gbtn full" id="gbtn" href="/auth/google?role=${esc(role)}">
        <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
        Continue with Google
      </a>
      <div class="or"><span>or</span></div>` : '';
  return `<section class="wrap narrow">
    <div class="card auth">
      <h2>${isSignup?'Create your account':'Welcome back'}</h2>
      ${error?`<div class="err">${esc(error)}</div>`:''}
      ${googleBlock}
      <form method="post" action="/${kind}">
        ${isSignup?`
          <label>I am a
            <select name="role">
              <option value="worker" ${role==='worker'?'selected':''}>Worker (Rivet)</option>
              <option value="employer" ${role==='employer'?'selected':''}>Employer (Crewline)</option>
            </select>
          </label>
          <label>Full name <input name="name" required></label>
          <label class="emp-only">Company <input name="company" placeholder="Your business name"></label>
        `:''}
        <label>Email <input type="email" name="email" required></label>
        <label>Password <input type="password" name="pass" required minlength="6"></label>
        <button class="btn full" type="submit">${isSignup?'Create account':'Log in'}</button>
      </form>
      <p class="muted">${isSignup?`Already have an account? <a href="/login">Log in</a>`:`New here? <a href="/signup">Get started</a>`}</p>
    </div>
  </section>
  <script>
    const sel=document.querySelector('select[name=role]');
    const gb=document.getElementById('gbtn');
    if(sel){const t=()=>{document.querySelectorAll('.emp-only').forEach(e=>e.style.display=sel.value==='employer'?'block':'none');if(gb)gb.href='/auth/google?role='+sel.value;};sel.onchange=t;t();}
  </script>`;
}

// ---------- worker onboarding ----------
function workerOnboard(error='') {
  const opts = Object.entries(TRADES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  return `<section class="wrap narrow"><div class="card">
    <h2>Set up your Work Card</h2>
    <p class="muted">This drives your matches and readiness score.</p>
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="/app/onboard">
      <label>Trade <select name="trade">${opts}</select></label>
      <div class="row2">
        <label>Years experience <input type="number" name="years_exp" min="0" value="3"></label>
        <label>Pay floor ($/hr) <input type="number" name="pay_floor" min="0" value="30"></label>
      </div>
      <div class="row2">
        <label>City <input name="city" value="Phoenix"></label>
        <label>ZIP <input name="zip" value="85004"></label>
      </div>
      <label>Shift
        <select name="shift"><option>Day</option><option>Night</option><option>4x10</option><option>Any</option></select>
      </label>
      <button class="btn full" type="submit">Save & see matches</button>
    </form>
  </div></section>`;
}

// ---------- worker dashboard ----------
function workerHome({ user, profile, creds, matches }) {
  const top = matches.slice(0,3).map(m=>jobCard(m)).join('');
  const expiring = creds.filter(c=>c.expires && c.expires < '2026-08').length;
  return `<section class="wrap">
    <div class="dash-grid">
      <div>
        <div class="readiness card">
          <div class="ring">${ring(profile.readiness)}</div>
          <div>
            <div class="r-lbl">Job-Readiness Score</div>
            <div class="r-big">${profile.readiness>=85?'Hire-ready ⚡':profile.readiness>=70?'Almost there':'Build your card'}</div>
            <p>${creds.length} credentials · ${TRADES[profile.trade]||profile.trade} · ${esc(profile.city)}</p>
          </div>
        </div>
        <div class="sec-h">Top matches near you <a href="/app/jobs">See all</a></div>
        ${top || `<div class="card muted">No matches yet — <a href="/console/jobs">employers post jobs here</a>.</div>`}
      </div>
      <aside>
        <div class="card">
          <div class="sec-h" style="margin-top:0">Credential Wallet <a href="/app/profile">Manage</a></div>
          ${creds.slice(0,4).map(credRow).join('') || '<p class="muted">No credentials yet.</p>'}
        </div>
        ${expiring?`<div class="card warn-card">⚠️ ${expiring} credential(s) expiring soon. <a href="/app/profile">Renew</a></div>`:''}
        <div class="card">
          <div class="sec-h" style="margin-top:0">Quick stats</div>
          <div class="ministats">
            <div><b>${profile.readiness}</b><span>READINESS</span></div>
            <div><b>${creds.filter(c=>c.verified).length}</b><span>VERIFIED</span></div>
            <div><b>${profile.years_exp}</b><span>YEARS</span></div>
          </div>
        </div>
      </aside>
    </div>
  </section>`;
}

function ring(score){
  const off = 163 - (163*score/100);
  return `<svg width="66" height="66" viewBox="0 0 66 66">
    <circle cx="33" cy="33" r="26" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="7"/>
    <circle cx="33" cy="33" r="26" fill="none" stroke="#FFC042" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="163" stroke-dashoffset="${off}" transform="rotate(-90 33 33)"/>
    <text x="33" y="38" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${score}</text></svg>`;
}

function jobCard(m){
  const j = m.job;
  const fitTags = [`<span class="mtag fit">${m.score}% match</span>`];
  if (m.missing && m.missing.length) fitTags.push(`<span class="mtag warn">Needs ${CRED_KINDS[m.missing[0]]||m.missing[0]}</span>`);
  else fitTags.push(`<span class="mtag fit">Credentials ✓</span>`);
  return `<div class="card job">
    <div class="job-row">
      <div class="badge">${tradeEmoji(j.trade)}</div>
      <div class="job-main">
        <a class="job-t" href="/app/jobs/${j.id}">${esc(j.title)}</a>
        <div class="job-c">${esc(j.company||'')} · ${esc(j.city)} · ${esc(j.shift)} shift</div>
        <div class="pay">$${j.pay_min}–${j.pay_max}/hr</div>
        <div class="mrow">${fitTags.join('')}</div>
        <div class="matchbar"><i style="width:${m.score}%"></i></div>
      </div>
    </div>
    <a class="btn full" href="/app/jobs/${j.id}">View & apply</a>
  </div>`;
}

function tradeEmoji(t){return {electrician:'⚡',hvac:'🔧',plumber:'🚰',controls:'🏭',sheet_metal:'🛠️',solar:'☀️',welder:'🔥',pipefitter:'🔩',cdl_driver:'🚛'}[t]||'🧰';}

function credRow(c){
  const verified = c.verified;
  const soon = c.expires && c.expires < '2026-08';
  return `<div class="cred">
    <div class="cred-ic">${verified?'✅':'⬜'}</div>
    <div class="cred-main"><div class="cred-nm">${esc(c.name)}</div><div class="cred-ex">${c.expires?('exp '+esc(c.expires)):'no expiry'}</div></div>
    <span class="v ${verified?(soon?'soon':'ok'):'pending'}">${verified?(soon?'Expiring':'Verified'):'Pending'}</span>
  </div>`;
}

// ---------- worker: all matches ----------
function workerJobs({ matches }) {
  return `<section class="wrap">
    <div class="sec-h big">Your matches <span class="muted">${matches.length} jobs ranked by fit</span></div>
    <div class="grid3">${matches.map(jobCard).join('') || '<div class="card muted">No open jobs yet.</div>'}</div>
  </section>`;
}

// ---------- worker: job detail ----------
function jobDetail({ job, match, applied }) {
  return `<section class="wrap narrow">
    <a class="back" href="/app/jobs">← All matches</a>
    <div class="card">
      <div class="job-row">
        <div class="badge big">${tradeEmoji(job.trade)}</div>
        <div class="job-main">
          <h2>${esc(job.title)}</h2>
          <div class="job-c">${esc(job.company||'')} · ${esc(job.city)} ${esc(job.zip)} · ${esc(job.shift)} shift</div>
          <div class="pay big">$${job.pay_min}–${job.pay_max}/hr</div>
        </div>
        <div class="score-pill ${scoreClass(match.score)}">${match.score}<small>match</small></div>
      </div>
      <p class="descr">${esc(job.descr)}</p>
      <div class="breakdown">
        <h4>Why you match</h4>
        ${bd('Trade fit',match.breakdown.trade,45)}
        ${bd('Pay',match.breakdown.pay,20)}
        ${bd('Location',match.breakdown.loc,20)}
        ${bd('Credentials',match.breakdown.cred,15)}
      </div>
      ${match.missing.length?`<div class="warn-card">Missing: ${match.missing.map(k=>CRED_KINDS[k]||k).join(', ')} — add it to your Work Card to boost this match.</div>`:''}
      ${applied
        ? `<div class="ok-card">✓ Applied — the employer can see your verified Work Card.</div>`
        : `<form method="post" action="/app/jobs/${job.id}/apply"><button class="btn full">Apply with verified Work Card</button></form>`}
    </div>
  </section>`;
}
function bd(label,val,max){const pct=Math.round(val/max*100);return `<div class="bd"><span>${label}</span><div class="bdbar"><i style="width:${pct}%"></i></div><b>${val}/${max}</b></div>`;}

// ---------- worker: profile / work card ----------
function workerProfile({ user, profile, creds, error }) {
  const kinds = Object.entries(CRED_KINDS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  return `<section class="wrap narrow">
    <div class="card profile-head">
      <div class="big-av">${initials(user.name)}</div>
      <h2>${esc(user.name)}</h2>
      <p class="muted">${TRADES[profile.trade]||profile.trade} · ${esc(profile.city)} · ${profile.years_exp} yrs · floor $${profile.pay_floor}/hr</p>
      <div class="ministats">
        <div><b>${profile.readiness}</b><span>READINESS</span></div>
        <div><b>${creds.filter(c=>c.verified).length}</b><span>VERIFIED</span></div>
        <div><b>${creds.length}</b><span>TOTAL CREDS</span></div>
      </div>
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">Credential Wallet</div>
      ${creds.map(credRow).join('') || '<p class="muted">No credentials yet — add one below.</p>'}
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">Add a credential</div>
      ${error?`<div class="err">${esc(error)}</div>`:''}
      <form method="post" action="/app/credentials" class="inline-form">
        <select name="kind">${kinds}</select>
        <input name="expires" placeholder="Expires e.g. 2027-06">
        <button class="btn">Add (auto-verifies in demo)</button>
      </form>
    </div>
  </section>`;
}

// ================= EMPLOYER (Crewline) =================
function empOverview({ user, kpis, hot, alerts }) {
  return `<section class="wrap">
    <div class="page-h"><h2>Overview</h2><p class="muted">${esc(user.company||user.name)}</p>
      <a class="btn-sm right" href="/console/jobs/new">+ Post a job</a></div>
    <div class="kpis">
      ${kpi('Open jobs',kpis.openJobs)}
      ${kpi('Verified talent pool',kpis.pool)}
      ${kpi('Applicants',kpis.applicants)}
      ${kpi('In pipeline',kpis.pipeline)}
    </div>
    <div class="grid2">
      <div class="card">
        <div class="sec-h" style="margin-top:0">Hot candidates — ready now <a href="/console/search">Search all</a></div>
        <table class="tbl"><tr><th>Candidate</th><th>Trade</th><th>Readiness</th><th>Creds</th></tr>
        ${hot.map(w=>`<tr><td><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</td>
          <td>${TRADES[w.trade]||w.trade}</td>
          <td><span class="score-tag ${scoreClass(w.readiness)}">${w.readiness}</span></td>
          <td>${w.vcount} verified</td></tr>`).join('') || '<tr><td colspan=4 class="muted">No workers yet.</td></tr>'}
        </table>
      </div>
      <div class="card">
        <div class="sec-h" style="margin-top:0">Needs attention</div>
        ${alerts.map(a=>`<div class="alert ${a.lvl}">${esc(a.text)}</div>`).join('')}
      </div>
    </div>
  </section>`;
}
function kpi(l,v){return `<div class="kpi"><div class="kl">${l}</div><b>${v}</b></div>`;}

function empJobs({ jobs }) {
  return `<section class="wrap">
    <div class="page-h"><h2>Job Postings</h2><a class="btn-sm right" href="/console/jobs/new">+ Post a job</a></div>
    ${jobs.map(j=>`<a class="jobline" href="/console/jobs/${j.id}">
      <div class="jl-left"><div class="badge">${tradeEmoji(j.trade)}</div>
        <div><h4>${esc(j.title)}</h4><div class="muted">${esc(j.city)} · $${j.pay_min}–${j.pay_max}/hr · ${esc(j.shift)}</div></div></div>
      <div class="jl-nums"><div><b>${j.matched}</b><span>matched</span></div><div><b>${j.applicants}</b><span>applied</span></div></div>
    </a>`).join('') || '<div class="card muted">No jobs yet. Post one to start matching.</div>'}
  </section>`;
}

function empJobForm(error='') {
  const opts = Object.entries(TRADES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  const cred = Object.entries(CRED_KINDS).map(([k,v])=>`<label class="ck"><input type="checkbox" name="req_creds" value="${k}"> ${v}</label>`).join('');
  return `<section class="wrap narrow"><div class="card">
    <h2>Post a job</h2><p class="muted">It's matched against the verified talent pool instantly.</p>
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="/console/jobs/new">
      <label>Title <input name="title" required placeholder="Commercial Electrician"></label>
      <label>Trade <select name="trade">${opts}</select></label>
      <div class="row2"><label>Pay min ($/hr) <input type="number" name="pay_min" value="36"></label>
        <label>Pay max ($/hr) <input type="number" name="pay_max" value="48"></label></div>
      <div class="row2"><label>City <input name="city" value="Phoenix"></label>
        <label>ZIP <input name="zip" value="85004"></label></div>
      <label>Shift <select name="shift"><option>Day</option><option>Night</option><option>4x10</option></select></label>
      <label>Required credentials</label><div class="ckrow">${cred}</div>
      <label>Description <textarea name="descr" rows="3"></textarea></label>
      <button class="btn full">Post & match</button>
    </form>
  </div></section>`;
}

const STAGES = ['Sourced','Screened','Interview','Offer','Hired'];
function empPipeline({ job, columns, candidates }) {
  const cols = STAGES.map(st=>`<div class="col"><div class="col-h">${st} <span>${(columns[st]||[]).length}</span></div>
    ${(columns[st]||[]).map(a=>`<div class="pcard">
        <div class="pc-nm"><span class="av-t">${initials(a.name)}</span>${esc(a.name)}</div>
        <div class="muted sm">${TRADES[a.trade]||a.trade}</div>
        <div class="pc-ft"><span class="score-tag ${scoreClass(a.score)}">${a.score}</span>
          <form method="post" action="/console/applications/${a.app_id}/stage" class="stageform">
            <select name="stage" onchange="this.form.submit()">${STAGES.map(s=>`<option ${s===st?'selected':''}>${s}</option>`).join('')}</select>
          </form></div>
      </div>`).join('')}
    </div>`).join('');
  return `<section class="wrap">
    <a class="back" href="/console/jobs">← All jobs</a>
    <div class="page-h"><h2>${esc(job.title)}</h2><p class="muted">$${job.pay_min}–${job.pay_max}/hr · ${esc(job.city)}</p></div>
    <div class="kanban">${cols}</div>
    <div class="card" style="margin-top:18px">
      <div class="sec-h" style="margin-top:0">Recommended candidates (not yet in pipeline)</div>
      <table class="tbl"><tr><th>Candidate</th><th>Trade</th><th>Match</th><th>Readiness</th><th></th></tr>
      ${candidates.map(c=>`<tr><td><span class="av-t">${initials(c.name)}</span> ${esc(c.name)}</td>
        <td>${TRADES[c.trade]||c.trade}</td>
        <td><span class="score-tag ${scoreClass(c.score)}">${c.score}</span></td>
        <td>${c.readiness}</td>
        <td><form method="post" action="/console/jobs/${job.id}/add"><input type="hidden" name="worker_id" value="${c.user_id}"><button class="btn-sm">+ Pipeline</button></form></td>
      </tr>`).join('') || '<tr><td colspan=5 class="muted">No more candidates to recommend.</td></tr>'}
      </table>
    </div>
  </section>`;
}

function empSearch({ rows, filters }) {
  const tradeOpts = `<option value="">All trades</option>`+Object.entries(TRADES).map(([k,v])=>`<option value="${k}" ${filters.trade===k?'selected':''}>${v}</option>`).join('');
  return `<section class="wrap">
    <div class="page-h"><h2>Talent Search</h2><p class="muted">${rows.length} verified candidates</p></div>
    <form class="filters" method="get" action="/console/search">
      <select name="trade" onchange="this.form.submit()">${tradeOpts}</select>
      <label class="chk"><input type="checkbox" name="verified" value="1" ${filters.verified?'checked':''} onchange="this.form.submit()"> Verified only</label>
      <label class="chk"><input type="checkbox" name="ready" value="1" ${filters.ready?'checked':''} onchange="this.form.submit()"> Readiness ≥ 85</label>
    </form>
    <div class="card" style="padding:0">
      <table class="tbl wide"><tr><th>Candidate</th><th>Trade</th><th>Exp</th><th>Credentials</th><th>Readiness</th><th>Pay floor</th></tr>
      ${rows.map(w=>`<tr><td><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</td>
        <td>${TRADES[w.trade]||w.trade}</td><td>${w.years_exp} yr</td>
        <td>${w.creds.map(c=>`<span class="cred-chip">${esc(c.name)}</span>`).join('')||'<span class="muted">—</span>'}</td>
        <td><span class="score-tag ${scoreClass(w.readiness)}">${w.readiness}</span></td>
        <td>$${w.pay_floor}/hr</td></tr>`).join('') || '<tr><td colspan=6 class="muted">No matches for these filters.</td></tr>'}
      </table>
    </div>
  </section>`;
}

module.exports = { layout, landing, authForm, workerOnboard, workerHome, workerJobs,
  jobDetail, workerProfile, empOverview, empJobs, empJobForm, empPipeline, empSearch, STAGES };
