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

// ---------- media (URL / embed based) ----------
function ytId(url){ const m=String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/); return m?m[1]:null; }
function vimeoId(url){ const m=String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/); return m?m[1]:null; }
function isVideoUrl(url){ return !!(ytId(url) || vimeoId(url)); }
function mediaEmbed(item){
  const url = item.url || '';
  const yt = ytId(url);
  if(yt) return `<iframe class="m-frame" src="https://www.youtube-nocookie.com/embed/${esc(yt)}" title="${esc(item.title||'video')}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
  const vm = vimeoId(url);
  if(vm) return `<iframe class="m-frame" src="https://player.vimeo.com/video/${esc(vm)}" title="${esc(item.title||'video')}" allowfullscreen loading="lazy"></iframe>`;
  return `<img class="m-img" src="${esc(url)}" alt="${esc(item.title||'work photo')}" loading="lazy" referrerpolicy="no-referrer">`;
}
function mediaGallery(items, { deletable = false, base = '' } = {}){
  if(!items || !items.length) return '';
  return `<div class="gallery">${items.map(it=>`<figure class="m-item">
    <div class="m-media">${mediaEmbed(it)}</div>
    ${(it.title||it.caption)?`<figcaption>${it.title?`<b>${esc(it.title)}</b> `:''}${it.caption?esc(it.caption):''}</figcaption>`:''}
    ${deletable?`<form method="post" action="${base}/${it.id}/delete" class="m-del"><button class="m-x" title="Remove" aria-label="Remove">×</button></form>`:''}
  </figure>`).join('')}</div>`;
}

// ---------- layout ----------
function layout({ title, user, body, active = '', flash = '' }) {
  let nav = '';
  if (!user) {
    nav = `<a class="nav-link" href="/login">Log in</a>
           <a class="btn-sm" href="/signup">Get started</a>`;
  } else if ((user.mode || user.role) === 'worker') {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    const msg = `<a class="nav-link ${active==='msgs'?'on':''}" href="/app/messages">Messages${user.unread?`<span class="ndot">${user.unread}</span>`:''}</a>`;
    nav = `${L('/app','Home','home')}${L('/app/jobs','Matches','jobs')}${L('/app/profile','Work Card','profile')}${L('/app/applications','Applications','apps')}${msg}
           <a class="nav-link switch" href="/console" title="Switch to hiring">Hiring →</a>
           <span class="who">${initials(user.name)}</span>
           <a class="nav-link" href="/logout">Log out</a>`;
  } else {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    const msg = `<a class="nav-link ${active==='msgs'?'on':''}" href="/console/messages">Messages${user.unread?`<span class="ndot">${user.unread}</span>`:''}</a>`;
    nav = `${L('/console','Overview','ov')}${L('/console/search','Talent','search')}${L('/console/jobs','Jobs','jobs')}${msg}
           <a class="nav-link switch" href="/app" title="Switch to working">Working →</a>
           <span class="who">${initials(user.company||user.name)}</span>
           <a class="nav-link" href="/logout">Log out</a>`;
  }
  const brand = user && (user.mode || user.role)==='employer'
    ? `<a class="brand" href="/console"><span class="logo c">C</span> Crewline</a>`
    : `<a class="brand" href="${user?'/app':'/'}"><span class="logo">R</span> Rivet${user?'':' <small>× Crewline</small>'}</a>`;

  const desc = 'Rivet × Crewline — the blue-collar hiring platform. Rivet preps skilled-trade workers to get hired and certified; Crewline gives employers verified, job-ready crews, fast.';
  const fullTitle = `${esc(title)} · Rivet × Crewline`;
  const site = 'https://rivet-crewline.onrender.com';
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fullTitle}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="theme-color" content="#16242F">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23FF6A1A'/%3E%3Ctext x='16' y='23' font-size='20' font-weight='900' fill='white' text-anchor='middle' font-family='Arial,sans-serif'%3ER%3C/text%3E%3C/svg%3E">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Rivet × Crewline">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${site}">
  <meta property="og:image" content="${site}/og.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${fullTitle}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${site}/og.svg">
  <link rel="stylesheet" href="/styles.css?v=13">
  </head><body>
  <a class="skip" href="#main">Skip to main content</a>
  <header class="topbar"><div class="bar wrap">${brand}<nav aria-label="Primary">${nav}</nav></div></header>
  ${flash?`<div class="flash wrap">${esc(flash)}</div>`:''}
  <main id="main">${body}</main>
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
  const googleBtn = google ? `
      <a class="gbtn full" id="gbtn" href="/auth/google?role=${esc(role)}">
        <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
        Continue with Google
      </a>` : '';
  const phoneBtn = `
      <a class="gbtn full" id="phonebtn" href="/phone?role=${esc(role)}">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="#16242F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
        Continue with phone
      </a>`;
  const googleBlock = `${googleBtn}${phoneBtn}<div class="or"><span>or</span></div>`;
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
    const pb=document.getElementById('phonebtn');
    if(sel){const t=()=>{document.querySelectorAll('.emp-only').forEach(e=>e.style.display=sel.value==='employer'?'block':'none');if(gb)gb.href='/auth/google?role='+sel.value;if(pb)pb.href='/phone?role='+sel.value;};sel.onchange=t;t();}
  </script>`;
}

// ---------- phone (SMS OTP) ----------
function phoneStart({ role='worker', name='', phone='', error='' }){
  return `<section class="wrap narrow"><div class="card auth">
    <h2>Sign in with your phone</h2>
    <p class="muted">We’ll text you a 6-digit code — no password to remember.</p>
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="/phone/start">
      <input type="hidden" name="role" value="${esc(role)}">
      <label>Mobile number <input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(phone)}" placeholder="+1 555 123 4567" required></label>
      <label>Your name <input name="name" value="${esc(name)}" placeholder="First and last name" autocomplete="name"></label>
      <button class="btn full" type="submit">Text me a code</button>
    </form>
    <p class="muted">Prefer email? <a href="/login">Log in</a> · <a href="/signup">Sign up</a></p>
  </div></section>`;
}
function phoneVerify({ phone, demoCode='', error='' }){
  return `<section class="wrap narrow"><div class="card auth">
    <h2>Enter your code</h2>
    <p class="muted">We sent a 6-digit code to <b>${esc(phone)}</b>.</p>
    ${demoCode?`<div class="ok-card">Demo mode (no SMS provider connected yet): your code is <b style="font-size:18px;letter-spacing:2px">${esc(demoCode)}</b></div>`:''}
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="/phone/verify">
      <input type="hidden" name="phone" value="${esc(phone)}">
      <label>6-digit code <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="123456" required></label>
      <button class="btn full" type="submit">Verify &amp; continue</button>
    </form>
    <p class="muted"><a href="/phone">Use a different number</a></p>
  </div></section>`;
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

function tradeEmoji(t){return {electrician:'⚡',hvac:'🔧',plumber:'🚰',pipefitter:'🔩',welder:'🔥',sheet_metal:'🛠️',carpenter:'🪚',framer:'🏗️',drywall:'🧱',painter:'🎨',roofer:'🏠',mason:'🧱',concrete:'🪨',flooring:'🪵',tile:'◻️',glazier:'🪟',insulation:'🧤',ironworker:'⛓️',millwright:'⚙️',boilermaker:'♨️',controls:'🏭',solar:'☀️',low_voltage:'🔌',fire_sprinkler:'🚿',elevator_tech:'🛗',heavy_equipment:'🚜',crane_operator:'🏗️',cdl_driver:'🚛',diesel_mechanic:'🔧',automotive_tech:'🚗',machinist:'⚙️',landscaper:'🌳',locksmith:'🔑',facilities:'🧰'}[t]||'🧰';}

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
function workerJobs({ matches, filters = {} }) {
  const tradeOpts = `<option value="">All trades</option>`+Object.entries(TRADES).map(([k,v])=>`<option value="${k}" ${filters.trade===k?'selected':''}>${v}</option>`).join('');
  const shifts = ['Day','Night','4x10','Any'];
  const shiftOpts = `<option value="">Any shift</option>`+shifts.map(s=>`<option value="${s}" ${filters.shift===s?'selected':''}>${s}</option>`).join('');
  const active = (filters.q||filters.trade||filters.city||filters.minpay||filters.shift);
  return `<section class="wrap">
    <div class="sec-h big">Find work <span class="muted">${matches.length} job${matches.length===1?'':'s'}${active?' · filtered':' · ranked by fit'}</span></div>
    <form class="jobfilters" method="get" action="/app/jobs">
      <input name="q" value="${esc(filters.q||'')}" placeholder="Search title or company" aria-label="Search">
      <select name="trade" aria-label="Trade">${tradeOpts}</select>
      <input name="city" value="${esc(filters.city||'')}" placeholder="City" aria-label="City">
      <input name="minpay" type="number" min="0" inputmode="numeric" value="${filters.minpay||''}" placeholder="Min $/hr" aria-label="Minimum pay">
      <select name="shift" aria-label="Shift">${shiftOpts}</select>
      <button class="btn-sm">Search</button>
      ${active?`<a class="nav-link" style="color:var(--orange-d)" href="/app/jobs">Clear</a>`:''}
    </form>
    <div class="grid3">${matches.map(jobCard).join('') || '<div class="card muted">No jobs match those filters. <a href="/app/jobs">Clear filters</a> to see all open work.</div>'}</div>
  </section>`;
}

// ---------- worker: job detail ----------
function jobDetail({ job, match, applied, saved = false, jobMedia = [] }) {
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
      ${jobMedia.length?`<div class="sec-h" style="margin-top:4px">The work</div>${mediaGallery(jobMedia)}`:''}
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
      <form method="post" action="/app/jobs/${job.id}/save"><button class="btn full ghost">${saved?'★ Saved — remove':'☆ Save this job'}</button></form>
    </div>
  </section>`;
}

// ---------- worker: applications + saved jobs ----------
function stageTimeline(current){
  const idx = STAGES.indexOf(current);
  return `<div class="timeline">${STAGES.map((s,i)=>`<div class="tl-step ${i<idx?'done':''}${i===idx?'now':''}"><span class="tl-dot"></span><span class="tl-lbl">${s}</span></div>`).join('')}</div>`;
}
function workerApplications({ apps, savedJobs }) {
  return `<section class="wrap">
    <div class="sec-h big">Your applications</div>
    ${apps.length ? apps.map(a=>`<div class="card app-card">
      <div class="job-row"><div class="badge">${tradeEmoji(a.trade)}</div>
        <div class="job-main"><h4>${esc(a.title)}</h4>
          <div class="muted">${esc(a.company||'')} · ${esc(a.city)} · $${a.pay_min}–${a.pay_max}/hr</div></div>
        <span class="score-tag ${scoreClass(a.score)}">${a.score}</span></div>
      ${stageTimeline(a.stage)}
    </div>`).join('') : '<div class="card muted">No applications yet. <a href="/app/jobs">Browse matches →</a></div>'}
    <div class="sec-h big" style="margin-top:26px">Saved jobs</div>
    ${savedJobs.length ? savedJobs.map(j=>`<a class="jobline" href="/app/jobs/${j.id}">
        <div class="jl-left"><div class="badge">${tradeEmoji(j.trade)}</div>
          <div><h4>${esc(j.title)}</h4><div class="muted">${esc(j.company||'')} · ${esc(j.city)} · $${j.pay_min}–${j.pay_max}/hr · ${esc(j.shift)}</div></div></div>
        <span class="nav-link" style="color:var(--orange-d)">View →</span>
      </a>`).join('')
      : '<div class="card muted">No saved jobs yet. Tap ☆ Save on any job to keep it here.</div>'}
  </section>`;
}
function bd(label,val,max){const pct=Math.round(val/max*100);return `<div class="bd"><span>${label}</span><div class="bdbar"><i style="width:${pct}%"></i></div><b>${val}/${max}</b></div>`;}

// ---------- worker: profile / work card ----------
function workerProfile({ user, profile, creds, error, portfolio = [] }) {
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
        <button class="btn">Add credential</button>
      </form>
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">Portfolio — your past work <a href="/p/${user.id}" target="_blank" rel="noopener">View public page ↗</a></div>
      ${mediaGallery(portfolio, {deletable:true, base:'/app/portfolio'}) || '<p class="muted">Add photos or videos of jobs you’ve completed — it builds your shareable portfolio and helps recruiters trust your work.</p>'}
      <form method="post" action="/app/portfolio" class="port-form">
        <input name="url" placeholder="Image URL or YouTube / Vimeo link" required>
        <input name="title" placeholder="Title — e.g. Commercial panel upgrade">
        <input name="caption" placeholder="Short caption (optional)">
        <button class="btn-sm">Add to portfolio</button>
      </form>
    </div>
  </section>`;
}

// ---------- public shareable portfolio ----------
function publicPortfolio({ worker, profile, creds, portfolio }) {
  return `<section class="hero pub-hero"><div class="wrap">
      <span class="tag">Verified on Rivet</span>
      <h1>${esc(worker.name)}</h1>
      <p class="lead">${TRADES[profile.trade]||profile.trade} · ${esc(profile.city)} · ${profile.years_exp} years experience</p>
      <div class="pub-stats">
        <div><b>${profile.readiness}</b><span>Job-readiness</span></div>
        <div><b>${creds.filter(c=>c.verified).length}</b><span>Verified credentials</span></div>
        <div><b>${portfolio.length}</b><span>Portfolio pieces</span></div>
      </div>
    </div></section>
    <section class="wrap narrow">
      ${profile.bio?`<div class="card"><p>${esc(profile.bio)}</p></div>`:''}
      <div class="card">
        <div class="sec-h" style="margin-top:0">Verified credentials</div>
        ${creds.filter(c=>c.verified).map(credRow).join('') || '<p class="muted">No verified credentials listed.</p>'}
      </div>
      <div class="card">
        <div class="sec-h" style="margin-top:0">Work portfolio</div>
        ${mediaGallery(portfolio) || '<p class="muted">No portfolio pieces yet.</p>'}
      </div>
      <div class="card cta-card">
        <b>${esc(worker.name.split(' ')[0])} is on Rivet — verified, job-ready trades talent.</b>
        <div class="cta-row" style="margin-top:12px"><a class="btn" href="/signup?role=employer">Hire on Crewline</a><a class="btn ghost" href="/signup?role=worker">Build your own card</a></div>
      </div>
      <p class="muted" style="text-align:center;margin:18px 0">
        <button class="btn-sm ghost" onclick="navigator.clipboard&&navigator.clipboard.writeText(location.href);this.textContent='Link copied ✓'">Copy share link</button>
      </p>
    </section>`;
}

// ================= EMPLOYER (Crewline) =================
function timeAgo(sqlTs){
  if(!sqlTs) return '';
  const t = Date.parse(sqlTs.replace(' ','T')+'Z');
  if(isNaN(t)) return '';
  const s = Math.max(0, Math.floor((Date.now()-t)/1000));
  if(s<60) return 'just now';
  const m=Math.floor(s/60); if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`;
  const d=Math.floor(h/24); if(d<30) return `${d}d ago`;
  const mo=Math.floor(d/30); return `${mo}mo ago`;
}
function empOverview({ user, kpis, funnel, recent, hot, alerts, fillRate }) {
  const maxF = Math.max(1, ...STAGES.map(s=>funnel[s]||0));
  const funnelBars = STAGES.map(s=>`<div class="fn-row">
      <span class="fn-lbl">${s}</span>
      <div class="fn-bar"><i class="fn-${s.toLowerCase()}" style="width:${Math.round(((funnel[s]||0)/maxF)*100)}%"></i></div>
      <b class="fn-n">${funnel[s]||0}</b>
    </div>`).join('');
  return `<section class="wrap">
    <div class="page-h"><h2>Overview</h2><p class="muted">${esc(user.company||user.name)}</p>
      <a class="btn-sm right" href="/console/jobs/new">+ Post a job</a></div>
    <div class="kpis">
      ${kpi('Open jobs',kpis.openJobs)}
      ${kpi('Verified talent pool',kpis.pool)}
      ${kpi('In pipeline',kpis.pipeline)}
      ${kpi('Hired',kpis.hired)}
      ${kpi('Fill rate',fillRate+'%')}
    </div>
    <div class="grid2">
      <div class="card">
        <div class="sec-h" style="margin-top:0">Hiring funnel <span class="muted">${kpis.applicants} candidates</span></div>
        ${kpis.applicants ? `<div class="funnel">${funnelBars}</div>` : '<p class="muted">No candidates in your pipeline yet. <a href="/console/search">Source from Talent Search →</a></p>'}
      </div>
      <div class="card">
        <div class="sec-h" style="margin-top:0">Recent activity</div>
        ${recent && recent.length ? recent.map(r=>`<div class="act">
          <span class="av-t">${initials(r.name)}</span>
          <div class="act-b"><a class="cand-link" href="/console/candidates/${r.worker_id}">${esc(r.name)}</a> entered <b>${esc(r.title)}</b> <span class="stage-pill sm">${esc(r.stage)}</span></div>
          <span class="act-t">${timeAgo(r.created_at)}</span>
        </div>`).join('') : '<p class="muted">No recent activity yet.</p>'}
      </div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="sec-h" style="margin-top:0">Hot candidates — ready now <a href="/console/search">Search all</a></div>
        <table class="tbl"><tr><th>Candidate</th><th>Trade</th><th>Readiness</th><th>Creds</th></tr>
        ${hot.map(w=>`<tr><td><a class="cand-link" href="/console/candidates/${w.id}"><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</a></td>
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
function empPipeline({ job, columns, candidates, jobMedia = [] }) {
  const cols = STAGES.map(st=>`<div class="col"><div class="col-h">${st} <span>${(columns[st]||[]).length}</span></div>
    ${(columns[st]||[]).map(a=>`<div class="pcard">
        <a class="pc-nm cand-link" href="/console/candidates/${a.worker_id}"><span class="av-t">${initials(a.name)}</span>${esc(a.name)}</a>
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
    <div class="card">
      <div class="sec-h" style="margin-top:0">Photos of the work <span class="muted sm">candidates see these on the job</span></div>
      ${mediaGallery(jobMedia, {deletable:true, base:`/console/jobs/${job.id}/media`}) || '<p class="muted sm">Add photos or a video of the site / work to be done — it helps candidates self-qualify.</p>'}
      <form method="post" action="/console/jobs/${job.id}/media" class="port-form">
        <input name="url" placeholder="Image URL or YouTube / Vimeo link" required>
        <input name="title" placeholder="Title — e.g. Rooftop unit replacement">
        <input name="caption" placeholder="Short caption (optional)">
        <button class="btn-sm">Add photo / video</button>
      </form>
    </div>
    <div class="kanban">${cols}</div>
    <div class="card" style="margin-top:18px">
      <div class="sec-h" style="margin-top:0">Recommended candidates (not yet in pipeline)</div>
      <table class="tbl"><tr><th>Candidate</th><th>Trade</th><th>Match</th><th>Readiness</th><th></th></tr>
      ${candidates.map(c=>`<tr><td><a class="cand-link" href="/console/candidates/${c.user_id}"><span class="av-t">${initials(c.name)}</span> ${esc(c.name)}</a></td>
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
    <div class="page-h"><h2>Talent Search</h2><p class="muted">${rows.length} verified candidates</p>
      <a class="btn-sm right ghost" href="/console/shortlist">★ Shortlist</a></div>
    <form class="filters" method="get" action="/console/search">
      <select name="trade" onchange="this.form.submit()">${tradeOpts}</select>
      <label class="chk"><input type="checkbox" name="verified" value="1" ${filters.verified?'checked':''} onchange="this.form.submit()"> Verified only</label>
      <label class="chk"><input type="checkbox" name="ready" value="1" ${filters.ready?'checked':''} onchange="this.form.submit()"> Readiness ≥ 85</label>
    </form>
    <div class="card" style="padding:0">
      <table class="tbl wide"><tr><th>Candidate</th><th>Trade</th><th>Exp</th><th>Credentials</th><th>Readiness</th><th>Pay floor</th></tr>
      ${rows.map(w=>`<tr><td><a class="cand-link" href="/console/candidates/${w.id}"><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</a></td>
        <td>${TRADES[w.trade]||w.trade}</td><td>${w.years_exp} yr</td>
        <td>${w.creds.map(c=>`<span class="cred-chip">${esc(c.name)}</span>`).join('')||'<span class="muted">—</span>'}</td>
        <td><span class="score-tag ${scoreClass(w.readiness)}">${w.readiness}</span></td>
        <td>$${w.pay_floor}/hr</td></tr>`).join('') || '<tr><td colspan=6 class="muted">No matches for these filters.</td></tr>'}
      </table>
    </div>
  </section>`;
}

// ---------- shared: message thread + inbox ----------
function msgThread(messages, meId){
  if(!messages || !messages.length) return '<p class="muted sm">No messages yet — say hello.</p>';
  return `<div class="thread">${messages.map(m=>`<div class="bubble ${m.from_id===meId?'mine':'theirs'}"><div class="bub-body">${esc(m.body)}</div><div class="bub-t">${timeAgo(m.created_at)}</div></div>`).join('')}</div>`;
}
function inbox({ convos, base, meId }){
  return `<section class="wrap narrow">
    <div class="page-h"><h2>Messages</h2></div>
    ${convos.length ? convos.map(c=>`<div class="card">
      <div class="sec-h" style="margin-top:0">${esc(c.other.company||c.other.name)}${c.other.company?` <span class="muted sm">${esc(c.other.name)}</span>`:''}</div>
      ${msgThread(c.msgs, meId)}
      <form method="post" action="${base}/messages/${c.other.id}" class="msg-form">
        <input name="body" placeholder="Write a message…" autocomplete="off" required maxlength="2000">
        <button class="btn-sm">Send</button>
      </form>
    </div>`).join('') : `<div class="card muted">No conversations yet.${base==='/console'?' Open a candidate from Talent Search and send a message to start one.':' An employer will reach out when you match.'}</div>`}
  </section>`;
}

// ---------- employer: candidate detail ----------
function empCandidate({ worker, profile, creds, matches, apps, messages, meId, notes = [], saved = false, portfolio = [] }) {
  const stageByJob = {}; for (const a of apps) stageByJob[a.job_id] = a.stage;
  return `<section class="wrap narrow">
    <div class="cand-top"><a class="back" href="/console/search">← Talent Search</a>
      <form method="post" action="/console/candidates/${worker.id}/save">
        <button class="btn-sm ${saved?'':'ghost'}">${saved?'★ Saved':'☆ Save to shortlist'}</button>
      </form>
    </div>
    <div class="card profile-head">
      <div class="big-av">${initials(worker.name)}</div>
      <h2>${esc(worker.name)}</h2>
      <p class="muted">${TRADES[profile.trade]||profile.trade} · ${esc(profile.city)} ${esc(profile.zip||'')} · ${profile.years_exp} yrs experience · seeks $${profile.pay_floor}+/hr</p>
      <div class="ministats">
        <div><b>${profile.readiness}</b><span>READINESS</span></div>
        <div><b>${creds.filter(c=>c.verified).length}</b><span>VERIFIED</span></div>
        <div><b>${creds.length}</b><span>CREDENTIALS</span></div>
      </div>
      ${profile.bio?`<p class="cand-bio">${esc(profile.bio)}</p>`:''}
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">Credential wallet</div>
      ${creds.map(credRow).join('') || '<p class="muted">No credentials listed yet.</p>'}
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">Portfolio <a href="/p/${worker.id}" target="_blank" rel="noopener">Public page ↗</a></div>
      ${mediaGallery(portfolio) || '<p class="muted sm">No portfolio pieces yet.</p>'}
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">Fit for your jobs</div>
      ${matches.length ? matches.map(m=>`<div class="cand-fit">
        <div class="cf-top">
          <div><b>${esc(m.job.title)}</b> <span class="muted sm">$${m.job.pay_min}–${m.job.pay_max}/hr · ${esc(m.job.city)} · ${esc(m.job.shift)}</span></div>
          <span class="score-pill ${scoreClass(m.score)}">${m.score}<small>match</small></span>
        </div>
        <div class="breakdown sm">${bd('Trade fit',m.breakdown.trade,45)}${bd('Pay',m.breakdown.pay,20)}${bd('Location',m.breakdown.loc,20)}${bd('Credentials',m.breakdown.cred,15)}</div>
        ${m.missing.length?`<div class="muted sm">Missing: ${m.missing.map(k=>CRED_KINDS[k]||k).join(', ')}</div>`:''}
        <div class="cf-act">${stageByJob[m.job.id]
          ? `<span class="stage-pill">In pipeline · ${esc(stageByJob[m.job.id])}</span>`
          : `<form method="post" action="/console/jobs/${m.job.id}/add"><input type="hidden" name="worker_id" value="${worker.id}"><button class="btn-sm">+ Add to pipeline</button></form>`}</div>
      </div>`).join('') : `<p class="muted">You have no open jobs yet. <a href="/console/jobs/new">Post a job</a> to see how this candidate fits.</p>`}
    </div>
    <div class="card" id="messages">
      <div class="sec-h" style="margin-top:0">Message ${esc(worker.name.split(' ')[0])}</div>
      ${msgThread(messages, meId)}
      <form method="post" action="/console/candidates/${worker.id}/message" class="msg-form">
        <input name="body" placeholder="Reach out about a role…" autocomplete="off" required maxlength="2000">
        <button class="btn-sm">Send</button>
      </form>
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">Private notes <span class="muted sm">only your team sees these</span></div>
      ${notes.length ? notes.map(n=>`<div class="note"><div class="note-b">${esc(n.body)}</div><div class="note-t">${timeAgo(n.created_at)}</div></div>`).join('') : '<p class="muted sm">No notes yet.</p>'}
      <form method="post" action="/console/candidates/${worker.id}/note" class="msg-form" style="margin-top:10px">
        <input name="body" placeholder="Add a private note…" autocomplete="off" required maxlength="2000">
        <button class="btn-sm ghost">Add note</button>
      </form>
    </div>
  </section>`;
}

// ---------- employer: shortlist ----------
function empShortlist({ rows }) {
  return `<section class="wrap">
    <div class="page-h"><h2>Shortlist</h2><p class="muted">${rows.length} saved candidate${rows.length===1?'':'s'}</p>
      <a class="btn-sm right" href="/console/search">Talent Search</a></div>
    ${rows.length ? `<div class="card" style="padding:0"><table class="tbl wide"><tr><th>Candidate</th><th>Trade</th><th>Exp</th><th>Readiness</th><th>Pay floor</th></tr>
      ${rows.map(w=>`<tr><td><a class="cand-link" href="/console/candidates/${w.id}"><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</a></td>
        <td>${TRADES[w.trade]||w.trade}</td><td>${w.years_exp} yr</td>
        <td><span class="score-tag ${scoreClass(w.readiness)}">${w.readiness}</span></td>
        <td>$${w.pay_floor}/hr</td></tr>`).join('')}
      </table></div>`
      : '<div class="card muted">No saved candidates yet. Open a candidate from <a href="/console/search">Talent Search</a> and tap ☆ Save to shortlist.</div>'}
  </section>`;
}

// Branded 1200x630 social-share image (served at /og.svg).
function ogImage() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#16242F"/>
  <rect width="1200" height="8" y="622" fill="#FF6A1A"/>
  <g transform="translate(90,90)">
    <rect width="92" height="92" rx="20" fill="#FF6A1A"/>
    <text x="46" y="66" font-family="Arial,Helvetica,sans-serif" font-size="58" font-weight="900" fill="#fff" text-anchor="middle">R</text>
    <text x="118" y="40" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="800" fill="#fff">Rivet</text>
    <text x="118" y="76" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="600" fill="#9fb0bb">× Crewline</text>
  </g>
  <text x="90" y="320" font-family="Arial,Helvetica,sans-serif" font-size="76" font-weight="800" fill="#fff">America can't <tspan fill="#FFC042">build</tspan></text>
  <text x="90" y="408" font-family="Arial,Helvetica,sans-serif" font-size="76" font-weight="800" fill="#fff">what it can't <tspan fill="#FFC042">staff.</tspan></text>
  <text x="90" y="500" font-family="Arial,Helvetica,sans-serif" font-size="32" font-weight="500" fill="#c3cfd6">The blue-collar hiring platform — built for the trades.</text>
</svg>`;
}

module.exports = { layout, landing, authForm, phoneStart, phoneVerify, workerOnboard, workerHome, workerJobs,
  jobDetail, workerProfile, workerApplications, publicPortfolio, empOverview, empJobs, empJobForm, empPipeline, empSearch, empCandidate, empShortlist, inbox, ogImage, STAGES };
