'use strict';
/*
 * Rivet x Crewline - server-side HTML views.
 * Plain template-literal rendering. No template engine, no client framework.
 */
const { TRADES, CRED_KINDS, TRAINING } = require('./matching');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const initials = name => esc((name||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase());

// ---------- i18n (en / es) ----------
let LANG = 'en';
function setLang(l){ LANG = (l === 'es') ? 'es' : 'en'; }
const I18N = {
  en: {
    nav_login:'Log in', nav_get_started:'Get started', nav_home:'Home', nav_find_work:'Jobs',
    nav_work_card:'Work Card', nav_applications:'Applications', nav_training:'Learn', nav_messages:'Messages',
    nav_hiring:'Hiring →', nav_working:'Working →', nav_logout:'Log out',
    nav_overview:'Overview', nav_talent:'Talent', nav_jobs:'Jobs',
    hero_tag:'The blue-collar hiring platform · U.S.',
    hero_h1a:"America can't ", hero_build:'build', hero_h1b:' what it can\'t ', hero_staff:'staff.',
    hero_lead:'Rivet prepares skilled-trade workers to get hired and certified. Crewline gives employers verified, job-ready crews — fast.',
    cta_worker:"I'm a worker → Rivet", cta_employer:"I'm hiring → Crewline",
    pc_worker_h:'📱 Rivet — for workers',
    pc_w1:'Verified credential wallet (license, OSHA, EPA)', pc_w2:'Job-readiness score', pc_w3:'Scored job matches near you', pc_w4:'Apply with one tap',
    pc_emp_h:'🖥️ Crewline — for employers',
    pc_e1:'Search verified, ready, local talent', pc_e2:'Post jobs, auto-matched instantly', pc_e3:'Trades-stage hiring pipeline', pc_e4:'Credential compliance built in',
    how_h:'How it works',
    how_worker_tag:'For workers · Rivet',
    hw1_t:'Build your Work Card', hw1_d:'Add your trade, experience and credentials — your readiness score updates live.',
    hw2_t:'Get matched', hw2_d:'See local jobs ranked by how well you fit, at the pay you want.',
    hw3_t:'Apply in one tap', hw3_d:'Employers see your verified card instantly — no resume, no re-listing.',
    how_emp_tag:'For employers · Crewline',
    he1_t:'Post a job', he1_d:"It's matched against the verified talent pool the moment you publish.",
    he2_t:'Review ranked crews', he2_d:'Candidates scored on trade fit, pay, location and credential coverage.',
    he3_t:'Move them through', he3_d:'A trades-stage pipeline from Sourced to Hired — compliance built in.',
    how_cta_w:'Get hired → Rivet', how_cta_e:'Hire a crew → Crewline',
    foot_tagline:'The blue-collar hiring platform — built for the trades.',
    foot_for_workers:'For workers', foot_for_employers:'For employers',
    foot_get_started:'Get started', foot_post_job:'Post a job',
    auth_create:'Create your account', auth_welcome:'Welcome back',
    auth_google:'Continue with Google', auth_phone:'Continue with phone', auth_or:'or',
    auth_iam:'I am a', auth_worker_opt:'Worker (Rivet)', auth_employer_opt:'Employer (Crewline)',
    auth_fullname:'Full name', auth_company:'Company', auth_email:'Email', auth_password:'Password',
    auth_create_btn:'Create account', auth_login_btn:'Log in',
    auth_have:'Already have an account?', auth_new:'New here?',
    phone_h:'Sign in with your phone', phone_sub:'We’ll text you a 6-digit code — no password to remember.',
    phone_number:'Mobile number', phone_yourname:'Your name', phone_textme:'Text me a code',
    phone_prefer:'Prefer email?',
  },
  es: {
    nav_login:'Entrar', nav_get_started:'Empezar', nav_home:'Inicio', nav_find_work:'Empleos',
    nav_work_card:'Mi perfil', nav_applications:'Solicitudes', nav_training:'Aprender', nav_messages:'Mensajes',
    nav_hiring:'Contratar →', nav_working:'Trabajar →', nav_logout:'Salir',
    nav_overview:'Resumen', nav_talent:'Talento', nav_jobs:'Empleos',
    hero_tag:'La plataforma de empleo para oficios · EE. UU.',
    hero_h1a:'Estados Unidos no puede ', hero_build:'construir', hero_h1b:' lo que no puede ', hero_staff:'dotar de personal.',
    hero_lead:'Rivet prepara a trabajadores de oficios para ser contratados y certificados. Crewline da a las empresas cuadrillas verificadas y listas para trabajar — rápido.',
    cta_worker:'Soy trabajador → Rivet', cta_employer:'Estoy contratando → Crewline',
    pc_worker_h:'📱 Rivet — para trabajadores',
    pc_w1:'Cartera de credenciales verificadas (licencia, OSHA, EPA)', pc_w2:'Puntaje de preparación', pc_w3:'Empleos cerca de ti según tu perfil', pc_w4:'Postúlate con un toque',
    pc_emp_h:'🖥️ Crewline — para empresas',
    pc_e1:'Busca talento local verificado y listo', pc_e2:'Publica empleos con emparejamiento al instante', pc_e3:'Embudo de contratación por etapas', pc_e4:'Cumplimiento de credenciales integrado',
    how_h:'Cómo funciona',
    how_worker_tag:'Para trabajadores · Rivet',
    hw1_t:'Crea tu perfil de trabajo', hw1_d:'Agrega tu oficio, experiencia y credenciales — tu puntaje se actualiza al instante.',
    hw2_t:'Encuentra empleos', hw2_d:'Ve empleos locales ordenados por qué tan bien encajas, con el pago que quieres.',
    hw3_t:'Postúlate con un toque', hw3_d:'Las empresas ven tu perfil verificado al instante — sin currículum.',
    how_emp_tag:'Para empresas · Crewline',
    he1_t:'Publica un empleo', he1_d:'Se empareja con el talento verificado en cuanto lo publicas.',
    he2_t:'Revisa cuadrillas', he2_d:'Candidatos puntuados por oficio, pago, ubicación y credenciales.',
    he3_t:'Avánzalos', he3_d:'Un embudo por etapas de Contactado a Contratado — con cumplimiento.',
    how_cta_w:'Conseguir trabajo → Rivet', how_cta_e:'Contratar cuadrilla → Crewline',
    foot_tagline:'La plataforma de empleo para oficios — hecha para el trabajo.',
    foot_for_workers:'Para trabajadores', foot_for_employers:'Para empresas',
    foot_get_started:'Empezar', foot_post_job:'Publicar empleo',
    auth_create:'Crea tu cuenta', auth_welcome:'Bienvenido de nuevo',
    auth_google:'Continuar con Google', auth_phone:'Continuar con teléfono', auth_or:'o',
    auth_iam:'Soy', auth_worker_opt:'Trabajador (Rivet)', auth_employer_opt:'Empresa (Crewline)',
    auth_fullname:'Nombre completo', auth_company:'Empresa', auth_email:'Correo', auth_password:'Contraseña',
    auth_create_btn:'Crear cuenta', auth_login_btn:'Entrar',
    auth_have:'¿Ya tienes cuenta?', auth_new:'¿Nuevo aquí?',
    phone_h:'Entra con tu teléfono', phone_sub:'Te enviaremos un código de 6 dígitos — sin contraseña que recordar.',
    phone_number:'Número de celular', phone_yourname:'Tu nombre', phone_textme:'Envíame un código',
    phone_prefer:'¿Prefieres correo?',
  },
};
function t(k){ return (I18N[LANG] && I18N[LANG][k] != null) ? I18N[LANG][k] : (I18N.en[k] != null ? I18N.en[k] : k); }

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
  const langTg = `<a class="nav-link lang-tg" href="/lang/${LANG==='es'?'en':'es'}" title="${LANG==='es'?'English':'Español'}">${LANG==='es'?'EN':'ES'}</a>`;
  let nav = '';
  if (!user) {
    nav = `<a class="nav-link" href="/login">${t('nav_login')}</a>
           <a class="btn-sm" href="/signup">${t('nav_get_started')}</a>${langTg}`;
  } else if ((user.mode || user.role) === 'worker') {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    const msg = `<a class="nav-link ${active==='msgs'?'on':''}" href="/app/messages">${t('nav_messages')}${user.unread?`<span class="ndot">${user.unread}</span>`:''}</a>`;
    nav = `${L('/app',t('nav_home'),'home')}${L('/app/jobs',t('nav_find_work'),'jobs')}${L('/app/profile',t('nav_work_card'),'profile')}${L('/app/applications',t('nav_applications'),'apps')}${L('/app/training',t('nav_training'),'training')}${msg}
           <a class="nav-link switch" href="/console" title="Switch to hiring">${t('nav_hiring')}</a>
           <span class="who">${initials(user.name)}</span>
           <a class="nav-link" href="/logout">${t('nav_logout')}</a>${langTg}`;
  } else {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    const msg = `<a class="nav-link ${active==='msgs'?'on':''}" href="/console/messages">${t('nav_messages')}${user.unread?`<span class="ndot">${user.unread}</span>`:''}</a>`;
    nav = `${L('/console',t('nav_overview'),'ov')}${L('/console/search',t('nav_talent'),'search')}${L('/console/jobs',t('nav_jobs'),'jobs')}${msg}
           <a class="nav-link switch" href="/app" title="Switch to working">${t('nav_working')}</a>
           <a class="who" href="/console/company" title="Company profile">${initials(user.company||user.name)}</a>
           <a class="nav-link" href="/logout">${t('nav_logout')}</a>${langTg}`;
  }
  const brand = user && (user.mode || user.role)==='employer'
    ? `<a class="brand" href="/console"><span class="logo c">C</span> Crewline</a>`
    : `<a class="brand" href="${user?'/app':'/'}"><span class="logo">R</span> Rivet${user?'':' <small>× Crewline</small>'}</a>`;

  const desc = 'Rivet × Crewline — the blue-collar hiring platform. Rivet preps skilled-trade workers to get hired and certified; Crewline gives employers verified, job-ready crews, fast.';
  const fullTitle = `${esc(title)} · Rivet × Crewline`;
  const site = 'https://rivet-crewline.onrender.com';
  return `<!DOCTYPE html><html lang="${LANG}"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fullTitle}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="theme-color" content="#13212B">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231763A6'/%3E%3Ctext x='16' y='23' font-size='20' font-weight='900' fill='white' text-anchor='middle' font-family='Arial,sans-serif'%3ER%3C/text%3E%3C/svg%3E">
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
  <link rel="stylesheet" href="/styles.css?v=24">
  </head><body>
  <a class="skip" href="#main">Skip to main content</a>
  <header class="topbar"><div class="bar wrap">${brand}<nav aria-label="Primary">${nav}</nav></div></header>
  ${flash?`<div class="flash wrap">${esc(flash)}</div>`:''}
  <main id="main">${body}</main>
  ${user ? `<footer class="site-foot">Rivet × Crewline — blue-collar hiring platform</footer>`
    : `<footer class="site-foot rich">
    <div class="wrap foot-grid">
      <div class="foot-brand"><a class="brand" href="/"><span class="logo">R</span> Rivet <small>× Crewline</small></a>
        <p>${t('foot_tagline')}</p></div>
      <div class="foot-col"><h5>${t('foot_for_workers')}</h5><a href="/signup?role=worker">${t('foot_get_started')}</a><a href="/login">${t('nav_login')}</a></div>
      <div class="foot-col"><h5>${t('foot_for_employers')}</h5><a href="/signup?role=employer">${t('foot_post_job')}</a><a href="/login">${t('nav_login')}</a></div>
    </div>
    <div class="wrap foot-base">© 2026 Rivet × Crewline · Phoenix, AZ · <a href="/lang/${LANG==='es'?'en':'es'}" style="color:#9fb0bb">${LANG==='es'?'English':'Español'}</a></div>
  </footer>`}
  </body></html>`;
}

// ---------- marketing landing ----------
function landing() {
  return `
  <section class="hero">
    <div class="wrap">
      <span class="tag">${t('hero_tag')}</span>
      <h1>${t('hero_h1a')}<b>${t('hero_build')}</b>${t('hero_h1b')}<b>${t('hero_staff')}</b></h1>
      <p class="lead">${t('hero_lead')}</p>
      <div class="cta-row">
        <a class="btn" href="/signup?role=worker">${t('cta_worker')}</a>
        <a class="btn ghost" href="/signup?role=employer">${t('cta_employer')}</a>
      </div>
    </div>
  </section>
  <section class="wrap split2">
    <div class="prodcard worker">
      <h3>${t('pc_worker_h')}</h3>
      <ul><li>${t('pc_w1')}</li><li>${t('pc_w2')}</li><li>${t('pc_w3')}</li><li>${t('pc_w4')}</li></ul>
    </div>
    <div class="prodcard emp">
      <h3>${t('pc_emp_h')}</h3>
      <ul><li>${t('pc_e1')}</li><li>${t('pc_e2')}</li><li>${t('pc_e3')}</li><li>${t('pc_e4')}</li></ul>
    </div>
  </section>
  <section class="how wrap">
    <h2 class="how-h">${t('how_h')}</h2>
    <div class="how-grid">
      <div class="how-col">
        <div class="how-tag worker">${t('how_worker_tag')}</div>
        <ol class="steps">
          <li><b>${t('hw1_t')}</b><span>${t('hw1_d')}</span></li>
          <li><b>${t('hw2_t')}</b><span>${t('hw2_d')}</span></li>
          <li><b>${t('hw3_t')}</b><span>${t('hw3_d')}</span></li>
        </ol>
      </div>
      <div class="how-col">
        <div class="how-tag emp">${t('how_emp_tag')}</div>
        <ol class="steps">
          <li><b>${t('he1_t')}</b><span>${t('he1_d')}</span></li>
          <li><b>${t('he2_t')}</b><span>${t('he2_d')}</span></li>
          <li><b>${t('he3_t')}</b><span>${t('he3_d')}</span></li>
        </ol>
      </div>
    </div>
    <div class="how-cta">
      <a class="btn" href="/signup?role=worker">${t('how_cta_w')}</a>
      <a class="btn ghost" href="/signup?role=employer">${t('how_cta_e')}</a>
    </div>
  </section>`;
}

// ---------- auth ----------
function authForm(kind, { role = 'worker', error = '', google = false } = {}) {
  const isSignup = kind === 'signup';
  const googleBtn = google ? `
      <a class="gbtn full" id="gbtn" href="/auth/google?role=${esc(role)}">
        <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
        ${t('auth_google')}
      </a>` : '';
  const phoneBtn = `
      <a class="gbtn full" id="phonebtn" href="/phone?role=${esc(role)}">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="#13212B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
        ${t('auth_phone')}
      </a>`;
  const googleBlock = `${googleBtn}${phoneBtn}<div class="or"><span>${t('auth_or')}</span></div>`;
  return `<section class="wrap narrow">
    <div class="card auth">
      <h2>${isSignup?t('auth_create'):t('auth_welcome')}</h2>
      ${error?`<div class="err">${esc(error)}</div>`:''}
      ${googleBlock}
      <form method="post" action="/${kind}">
        ${isSignup?`
          <label>${t('auth_iam')}
            <select name="role">
              <option value="worker" ${role==='worker'?'selected':''}>${t('auth_worker_opt')}</option>
              <option value="employer" ${role==='employer'?'selected':''}>${t('auth_employer_opt')}</option>
            </select>
          </label>
          <label>${t('auth_fullname')} <input name="name" required></label>
          <label class="emp-only">${t('auth_company')} <input name="company"></label>
        `:''}
        <label>${t('auth_email')} <input type="email" name="email" required></label>
        <label>${t('auth_password')} <input type="password" name="pass" required minlength="6"></label>
        <button class="btn full" type="submit">${isSignup?t('auth_create_btn'):t('auth_login_btn')}</button>
      </form>
      <p class="muted">${isSignup?`${t('auth_have')} <a href="/login">${t('auth_login_btn')}</a>`:`${t('auth_new')} <a href="/signup">${t('nav_get_started')}</a>`}</p>
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
    <h2>${t('phone_h')}</h2>
    <p class="muted">${t('phone_sub')}</p>
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="/phone/start">
      <input type="hidden" name="role" value="${esc(role)}">
      <label>${t('phone_number')} <input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(phone)}" placeholder="+1 555 123 4567" required></label>
      <label>${t('phone_yourname')} <input name="name" value="${esc(name)}" autocomplete="name"></label>
      <button class="btn full" type="submit">${t('phone_textme')}</button>
    </form>
    <p class="muted">${t('phone_prefer')} <a href="/login">${t('nav_login')}</a> · <a href="/signup">${t('nav_get_started')}</a></p>
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
function tradeCheckboxes(selected = []) {
  const sel = new Set(selected);
  return Object.entries(TRADES).map(([k,v])=>`<label class="tradechk"><input type="checkbox" name="trades" value="${k}" ${sel.has(k)?'checked':''}><span>${tradeEmoji(k)} ${v}</span></label>`).join('');
}
function workerOnboard(error='') {
  return `<section class="wrap narrow"><div class="card">
    <h2>Set up your Work Card</h2>
    <p class="muted">This is what employers see. It drives your matches and readiness score.</p>
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="/app/onboard">
      <label>Headline <input name="headline" maxlength="80" placeholder="e.g. Journeyman electrician — commercial & solar"></label>
      <div class="fieldset">
        <div class="fs-lbl">Your trades <span class="muted">pick all you work</span></div>
        <div class="tradegrid">${tradeCheckboxes(['electrician'])}</div>
      </div>
      <div class="row2">
        <label>Years experience <input type="number" name="years_exp" min="0" value="3"></label>
        <label>Pay floor ($/hr) <input type="number" name="pay_floor" min="0" value="30"></label>
      </div>
      <div class="row2">
        <label>City <input name="city" value="Phoenix"></label>
        <label>ZIP <input name="zip" value="85004"></label>
      </div>
      <label>Preferred shift
        <select name="shift"><option>Day</option><option>Night</option><option>4x10</option><option>Any</option></select>
      </label>
      <label>About you <textarea name="about" rows="3" maxlength="600" placeholder="Where you've worked, what you're great at, what you're looking for."></textarea></label>
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
    <circle cx="33" cy="33" r="26" fill="none" stroke="#F6A623" stroke-width="7" stroke-linecap="round"
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
        ${j.employment_type?`<span class="jtype">${esc(j.employment_type)}</span>`:''}
        <div class="job-c">${esc(j.company||'')} · ${esc(j.city)} · ${esc(j.shift)} shift${m.distance!=null?` · <b class="dist">${m.distance} mi away</b>`:''}</div>
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
function workerJobs({ matches, filters = {}, jobsGeo = null }) {
  const tradeOpts = `<option value="">All trades</option>`+Object.entries(TRADES).map(([k,v])=>`<option value="${k}" ${filters.trade===k?'selected':''}>${v}</option>`).join('');
  const shifts = ['Day','Night','4x10','Any'];
  const shiftOpts = `<option value="">Any shift</option>`+shifts.map(s=>`<option value="${s}" ${filters.shift===s?'selected':''}>${s}</option>`).join('');
  const typeOpts = `<option value="">Any type</option>`+JOB_TYPES.map(t=>`<option value="${t}" ${filters.jtype===t?'selected':''}>${t}</option>`).join('');
  const active = (filters.q||filters.trade||filters.city||filters.minpay||filters.shift||filters.jtype);
  return `<section class="wrap">
    <div class="sec-h big">Find work <span class="muted">${matches.length} job${matches.length===1?'':'s'}${active?' · filtered':' · ranked by fit'}</span></div>
    <form class="jobfilters" method="get" action="/app/jobs">
      <input name="q" value="${esc(filters.q||'')}" placeholder="Search title or company" aria-label="Search">
      <select name="trade" aria-label="Trade">${tradeOpts}</select>
      <input name="city" value="${esc(filters.city||'')}" placeholder="City" aria-label="City">
      <input name="minpay" type="number" min="0" inputmode="numeric" value="${filters.minpay||''}" placeholder="Min $/hr" aria-label="Minimum pay">
      <input name="maxmi" type="number" min="0" inputmode="numeric" value="${filters.maxmi||''}" placeholder="Within mi" aria-label="Within miles">
      <select name="shift" aria-label="Shift">${shiftOpts}</select>
      <select name="jtype" aria-label="Employment type">${typeOpts}</select>
      <label class="chk"><input type="checkbox" name="sort" value="distance" ${filters.sort==='distance'?'checked':''}> Nearest first</label>
      <button class="btn-sm">Search</button>
      ${active?`<a class="nav-link" style="color:var(--brand-d)" href="/app/jobs">Clear</a>`:''}
    </form>
    ${jobsGeo && jobsGeo.points.length ? usMap(jobsGeo.points, {title:'Where the work is', noun:'job',
        legend:'<span class="lg"><i class="d-direct"></i> Your trades</span><span class="lg"><i class="d-related"></i> Related trades</span>',
        emptyMsg:'No mapped openings yet.'}) : ''}
    <div class="grid3">${matches.map(jobCard).join('') || '<div class="card muted">No jobs match those filters. <a href="/app/jobs">Clear filters</a> to see all open work.</div>'}</div>
  </section>`;
}

// ---------- worker: job detail ----------
function jobDetail({ job, match, applied, saved = false, jobMedia = [], distance = null }) {
  return `<section class="wrap narrow">
    <a class="back" href="/app/jobs">← All matches</a>
    <div class="card">
      <div class="job-row">
        <div class="badge big">${tradeEmoji(job.trade)}</div>
        <div class="job-main">
          <h2>${esc(job.title)}</h2>
          ${job.employment_type?`<span class="jtype">${esc(job.employment_type)}</span>`:''}
          <div class="job-c">${esc(job.company||'')} · ${esc(job.city)} ${esc(job.zip)} · ${esc(job.shift)} shift${distance!=null?` · <b class="dist">${distance} mi away</b>`:''}</div>
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
      ${match.missing.length?`<div class="warn-card">Missing: ${match.missing.map(k=>CRED_KINDS[k]||k).join(', ')} — <a href="/app/training" style="font-weight:700;color:inherit;text-decoration:underline">see how to earn it</a> to boost this match.</div>`:''}
      ${applied
        ? `<div class="ok-card">✓ Applied — the employer can see your verified Work Card.</div>`
        : `<form method="post" action="/app/jobs/${job.id}/apply"><button class="btn full">Apply with verified Work Card</button></form>`}
      <form method="post" action="/app/jobs/${job.id}/save"><button class="btn full ghost">${saved?'★ Saved — remove':'☆ Save this job'}</button></form>
    </div>
    ${(job.company_about||job.company_website||job.company_size)?`<div class="card">
      <div class="sec-h" style="margin-top:0">About the employer</div>
      <div class="job-row"><div class="big-av c sm">${initials(job.company||'')}</div>
        <div class="job-main"><b>${esc(job.company||'')}</b>
          <div class="muted sm">${esc(job.company_city||'')}${job.company_size?` · ${esc(job.company_size)} employees`:''}</div></div></div>
      ${job.company_about?`<p class="descr" style="margin-top:10px">${esc(job.company_about)}</p>`:''}
      ${job.company_website?`<a class="nav-link" style="color:var(--brand-d)" href="${esc(job.company_website)}" target="_blank" rel="noopener">${esc(job.company_website)} ↗</a>`:''}
    </div>`:''}
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
          <div class="muted">${esc(a.company||'')} · ${esc(a.city)} · $${a.pay_min}–${a.pay_max}/hr${a.distance!=null?` · <b class="dist">${a.distance} mi away</b>`:''}</div></div>
        <span class="score-tag ${scoreClass(a.score)}">${a.score}</span></div>
      ${stageTimeline(a.stage)}
    </div>`).join('') : '<div class="card muted">No applications yet. <a href="/app/jobs">Browse matches →</a></div>'}
    <div class="sec-h big" style="margin-top:26px">Saved jobs</div>
    ${savedJobs.length ? savedJobs.map(j=>`<a class="jobline" href="/app/jobs/${j.id}">
        <div class="jl-left"><div class="badge">${tradeEmoji(j.trade)}</div>
          <div><h4>${esc(j.title)}</h4><div class="muted">${esc(j.company||'')} · ${esc(j.city)} · $${j.pay_min}–${j.pay_max}/hr · ${esc(j.shift)}${j.distance!=null?` · <b class="dist">${j.distance} mi away</b>`:''}</div></div></div>
        <span class="nav-link" style="color:var(--brand-d)">View →</span>
      </a>`).join('')
      : '<div class="card muted">No saved jobs yet. Tap ☆ Save on any job to keep it here.</div>'}
  </section>`;
}
function bd(label,val,max){const pct=Math.round(val/max*100);return `<div class="bd"><span>${label}</span><div class="bdbar"><i style="width:${pct}%"></i></div><b>${val}/${max}</b></div>`;}

// ---------- worker: profile / work card ----------
function tradeChips(profile){
  return tradesOf(profile).map(t=>`<span class="chip">${tradeEmoji(t)} ${TRADES[t]||t}</span>`).join('');
}
function tradesOf(profile){
  const raw = (profile && (profile.trades || profile.trade)) || '';
  const arr = String(raw).split(',').map(s=>s.trim()).filter(Boolean);
  return arr.length ? arr : (profile && profile.trade ? [profile.trade] : []);
}
function workRow(w, editable){
  const yrs = w.current ? `${w.start_year||''}–Present` : `${w.start_year||''}${w.end_year?('–'+w.end_year):''}`;
  return `<div class="exp">
    <div class="exp-ic">${tradeEmoji(w.trade)}</div>
    <div class="exp-main">
      <div class="exp-top"><b>${esc(w.role||'')}</b>${w.current?'<span class="chip sm green">Current</span>':''}</div>
      <div class="muted">${esc(w.employer||'')}${w.city?(' · '+esc(w.city)):''}${yrs?(' · '+esc(yrs)):''}</div>
      ${w.description?`<p class="exp-d">${esc(w.description)}</p>`:''}
    </div>
    ${editable?`<form method="post" action="/app/experience/${w.id}/delete"><button class="x" title="Remove">✕</button></form>`:''}
  </div>`;
}
function workHistoryList(items, editable){
  return items.length ? `<div class="explist">${items.map(w=>workRow(w, editable)).join('')}</div>`
    : (editable ? '<p class="muted">No past jobs added yet — add the places you’ve worked below. This is what recruiters trust most.</p>' : '');
}
function workerProfile({ user, profile, creds, error, portfolio = [], work = [] }) {
  const kinds = Object.entries(CRED_KINDS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  const trades = tradesOf(profile);
  return `<section class="wrap narrow">
    <div class="card profile-head">
      <div class="big-av">${initials(user.name)}</div>
      <h2>${esc(user.name)}</h2>
      ${profile.headline?`<p class="headline">${esc(profile.headline)}</p>`:''}
      <div class="chips">${tradeChips(profile)}</div>
      <p class="muted">${esc(profile.city)} · ${profile.years_exp} yrs · floor $${profile.pay_floor}/hr · ${esc(profile.shift)} shift</p>
      <div class="ministats">
        <div><b>${profile.readiness}</b><span>READINESS</span></div>
        <div><b>${creds.filter(c=>c.verified).length}</b><span>VERIFIED</span></div>
        <div><b>${creds.length}</b><span>TOTAL CREDS</span></div>
      </div>
      <form method="post" action="/app/available" class="avail-form">
        <button class="btn-sm ${profile.available?'':'ghost'}">${profile.available?'🟢 Available for work — tap to pause':'⚪ Paused — tap to go available'}</button>
      </form>
      <form method="post" action="/app/work-today" class="avail-form" style="margin-top:8px">
        <button class="btn-sm ${profile.work_today?'':'ghost'}">${profile.work_today?'⚡ Can work TODAY — tap to clear':'⚡ I can work today'}</button>
      </form>
      <form method="post" action="/app/alerts" class="avail-form" style="margin-top:8px">
        <button class="btn-sm ${profile.alerts?'':'ghost'}">${profile.alerts?'🔔 Job alerts ON — tap to stop':'🔔 Text me new job alerts'}</button>
      </form>
      <form method="post" action="/app/relocate" class="avail-form" style="margin-top:8px">
        <button class="btn-sm ${profile.relocate?'':'ghost'}">${profile.relocate?'✈️ Open to relocate — tap to clear':'✈️ I’m open to relocating'}</button>
      </form>
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">Trades, headline & about</div>
      ${error?`<div class="err">${esc(error)}</div>`:''}
      <form method="post" action="/app/profile/details">
        <label>Headline <input name="headline" maxlength="80" value="${esc(profile.headline||'')}" placeholder="e.g. Journeyman electrician — commercial & solar"></label>
        <div class="fieldset">
          <div class="fs-lbl">Your trades <span class="muted">pick all you work</span></div>
          <div class="tradegrid">${tradeCheckboxes(trades)}</div>
        </div>
        <label>About you <textarea name="about" rows="3" maxlength="600" placeholder="Where you've worked, what you're great at, what you're looking for.">${esc(profile.about||'')}</textarea></label>
        <button class="btn-sm">Save details</button>
      </form>
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">Work history</div>
      ${workHistoryList(work, true)}
      <form method="post" action="/app/experience" class="exp-form">
        <div class="row2">
          <label>Role / title <input name="role" maxlength="80" required placeholder="e.g. Lead Electrician"></label>
          <label>Employer <input name="employer" maxlength="80" placeholder="e.g. Sun Valley Electric"></label>
        </div>
        <div class="row2">
          <label>Trade <select name="trade">${trades.length?trades.map(t=>`<option value="${t}">${TRADES[t]||t}</option>`).join(''):Object.entries(TRADES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
          <label>City <input name="city" maxlength="60" placeholder="e.g. Phoenix"></label>
        </div>
        <div class="row2">
          <label>From year <input type="number" name="start_year" min="1960" max="2026" placeholder="2019"></label>
          <label>To year <input type="number" name="end_year" min="1960" max="2026" placeholder="2023 (blank = current)"></label>
        </div>
        <label>What you did <textarea name="description" rows="2" maxlength="400" placeholder="Scope, scale, what you were responsible for."></textarea></label>
        <button class="btn-sm">Add to work history</button>
      </form>
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

// ---------- worker: training & certifications ----------
function trainCard(kind, have){
  const tr = TRAINING[kind]; if(!tr) return '';
  return `<div class="train ${have?'have':''}">
    <div class="train-h"><b>${esc(CRED_KINDS[kind]||kind)}</b>${have?'<span class="chip sm green">On your card ✓</span>':''}</div>
    <p>${esc(tr.how)}</p>
    <a class="nav-link" style="color:var(--brand-d);font-weight:700" href="${esc(tr.url)}" target="_blank" rel="noopener noreferrer">How to earn it ↗</a>
  </div>`;
}
function workerTraining({ have = [] }) {
  const haveSet = new Set(have);
  const all = Object.keys(TRAINING);
  const todo = all.filter(k=>!haveSet.has(k));
  const done = all.filter(k=>haveSet.has(k));
  return `<section class="wrap">
    <div class="sec-h big">Learn & get certified <span class="muted">Real credentials open more jobs and raise your readiness score</span></div>
    <div class="card info-card">Certifications are the fastest way to stand out. Every one you add to your Work Card is verified and boosts how you match to jobs. Below is how to earn each — most can be done online or through a local provider.</div>
    <div class="sec-h">Recommended — not on your card yet</div>
    <div class="traingrid">${todo.map(k=>trainCard(k,false)).join('') || '<p class="muted">You’ve added every credential we track. Impressive.</p>'}</div>
    ${done.length?`<div class="sec-h">Already on your Work Card</div><div class="traingrid">${done.map(k=>trainCard(k,true)).join('')}</div>`:''}
  </section>`;
}

// ---------- public shareable portfolio ----------
function publicPortfolio({ worker, profile, creds, portfolio, work = [] }) {
  return `<section class="hero pub-hero"><div class="wrap">
      <span class="tag">Verified on Rivet</span>
      <h1>${esc(worker.name)}</h1>
      ${profile.headline?`<p class="lead">${esc(profile.headline)}</p>`:''}
      <div class="chips light">${tradeChips(profile)}</div>
      <p class="lead">${esc(profile.city)} · ${profile.years_exp} years experience</p>
      <div class="pub-stats">
        <div><b>${profile.readiness}</b><span>Job-readiness</span></div>
        <div><b>${creds.filter(c=>c.verified).length}</b><span>Verified credentials</span></div>
        <div><b>${portfolio.length}</b><span>Portfolio pieces</span></div>
      </div>
    </div></section>
    <section class="wrap narrow">
      ${(profile.about||profile.bio)?`<div class="card"><div class="sec-h" style="margin-top:0">About</div><p>${esc(profile.about||profile.bio)}</p></div>`:''}
      ${work.length?`<div class="card"><div class="sec-h" style="margin-top:0">Work history</div>${workHistoryList(work, false)}</div>`:''}
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
// ---------- US candidate map (SVG, projection shared by outline + dots) ----------
const US_OUTLINE = [
  [-124.7,48.4],[-123.9,46.2],[-124.2,43.5],[-124.4,40.4],[-122.4,37.8],[-120.6,34.5],
  [-117.1,32.5],[-114.7,32.7],[-111.0,31.3],[-108.2,31.3],[-106.5,31.8],[-103.0,29.0],
  [-101.5,29.8],[-99.5,27.5],[-97.1,25.9],[-95.0,29.0],[-91.0,29.2],[-89.0,29.2],
  [-87.5,30.3],[-84.0,30.0],[-82.0,24.6],[-80.4,27.0],[-80.6,31.0],[-79.0,33.5],
  [-76.0,36.5],[-75.0,38.5],[-74.0,40.5],[-71.0,41.5],[-70.0,43.5],[-67.0,44.5],
  [-69.2,47.5],[-71.5,45.0],[-76.0,43.5],[-79.0,43.3],[-82.5,41.7],[-83.0,42.3],
  [-82.5,45.0],[-84.7,45.8],[-87.0,45.4],[-87.8,47.5],[-90.0,46.7],[-92.0,46.8],
  [-95.0,49.0],[-104.0,49.0],[-117.0,49.0],[-122.8,49.0]
];
// generalized: points = [{city,lat,lon,n,kind?}]; opts controls labels/legend
function usMap(points = [], opts = {}){
  const { title='Where your talent is', noun='candidate', emptyMsg='No mapped locations yet.', legend=null } = opts;
  const MINLON=-125, MAXLON=-66, MINLAT=24, MAXLAT=50, VW=620, VH=350;
  const px = lon => ((lon-MINLON)/(MAXLON-MINLON)*VW).toFixed(1);
  const py = lat => ((MAXLAT-lat)/(MAXLAT-MINLAT)*VH).toFixed(1);
  const path = US_OUTLINE.map(([lo,la],i)=>`${i?'L':'M'}${px(lo)} ${py(la)}`).join(' ')+' Z';
  const total = points.reduce((a,g)=>a+(g.n||0),0);
  const dots = points.map(g=>{
    const r = Math.min(20, 5 + (g.n||1)*2.5);
    const cls = g.kind==='related' ? 'mdot related' : 'mdot';
    const lbl = g.label || `${g.city||''}: ${g.n} ${noun}${g.n===1?'':'s'}`;
    return `<g class="${cls}"><circle cx="${px(g.lon)}" cy="${py(g.lat)}" r="${r}"><title>${esc(lbl)}</title></circle>${g.n>1?`<text x="${px(g.lon)}" y="${(+py(g.lat)+3.5).toFixed(1)}" text-anchor="middle">${g.n}</text>`:''}</g>`;
  }).join('');
  const top = points.slice(0,6).map(g=>`<li><span>${esc(g.city||'—')}</span><b>${g.n}</b></li>`).join('');
  return `<div class="card">
    <div class="sec-h" style="margin-top:0">${esc(title)} <span class="muted">${total} ${noun}${total===1?'':'s'} mapped</span></div>
    ${points.length ? `<div class="mapwrap"><svg class="usmap" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="US map">
        <path class="us-out" d="${path}"/>${dots}</svg>
      <ul class="maplist">${top}</ul></div>${legend?`<div class="maplegend">${legend}</div>`:''}`
      : `<p class="muted">${esc(emptyMsg)}</p>`}
  </div>`;
}
function empOverview({ user, kpis, funnel, recent, hot, alerts, fillRate, geo = [] }) {
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
    ${usMap(geo, {title:'Where your talent is', noun:'candidate', emptyMsg:'No mapped candidate locations yet. Locations appear as workers add a ZIP to their Work Card.'})}
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

const COMPANY_SIZES = ['1–10','11–50','51–200','201–500','500+'];
function empCompany({ user, saved = false }) {
  const sizeOpts = `<option value="">Company size</option>`+COMPANY_SIZES.map(s=>`<option ${user.company_size===s?'selected':''}>${s}</option>`).join('');
  return `<section class="wrap narrow">
    <div class="card profile-head">
      <div class="big-av c">${initials(user.company||user.name)}</div>
      <h2>${esc(user.company||'Your company')}</h2>
      <p class="muted">${esc(user.company_city||'')}${user.company_size?` · ${esc(user.company_size)} employees`:''}</p>
      ${user.company_website?`<p><a class="nav-link" style="color:var(--brand-d)" href="${esc(user.company_website)}" target="_blank" rel="noopener">${esc(user.company_website)} ↗</a></p>`:''}
      ${user.company_about?`<p class="cand-bio">${esc(user.company_about)}</p>`:''}
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">Company profile <span class="muted sm">shown to candidates on your jobs</span></div>
      ${saved?'<div class="ok-card">Saved.</div>':''}
      <form method="post" action="/console/company">
        <label>Company name <input name="company" maxlength="80" value="${esc(user.company||'')}" placeholder="e.g. Sun Valley Mechanical"></label>
        <div class="row2">
          <label>City <input name="company_city" maxlength="60" value="${esc(user.company_city||'')}" placeholder="Phoenix, AZ"></label>
          <label>Size <select name="company_size">${sizeOpts}</select></label>
        </div>
        <label>Website <input name="company_website" maxlength="200" value="${esc(user.company_website||'')}" placeholder="https://…"></label>
        <label>About the company <textarea name="company_about" rows="4" maxlength="800" placeholder="What you build, who you hire, why crews stay. Candidates read this before applying.">${esc(user.company_about||'')}</textarea></label>
        <button class="btn">Save company profile</button>
      </form>
    </div>
  </section>`;
}

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

const JOB_TYPES = ['Full-time','Part-time','Contract','Temp','Apprenticeship','Outcome-based'];
function empJobForm(error='') {
  const opts = Object.entries(TRADES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  const cred = Object.entries(CRED_KINDS).map(([k,v])=>`<label class="ck"><input type="checkbox" name="req_creds" value="${k}"> ${v}</label>`).join('');
  const typeOpts = JOB_TYPES.map(t=>`<option>${t}</option>`).join('');
  return `<section class="wrap narrow"><div class="card">
    <h2>Post a job</h2><p class="muted">It's matched against the verified talent pool instantly.</p>
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="/console/jobs/new">
      <label>Title <input name="title" required placeholder="Commercial Electrician"></label>
      <div class="row2"><label>Trade <select name="trade">${opts}</select></label>
        <label>Employment type <select name="employment_type">${typeOpts}</select></label></div>
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
function empPipeline({ job, columns, candidates, jobMedia = [], alerted = 0 }) {
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
    ${alerted>0?`<div class="ok-card">🔔 ${alerted} matching worker${alerted===1?'':'s'} with alerts on ${alerted===1?'was':'were'} notified about this job.</div>`:''}
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
      <label class="chk"><input type="checkbox" name="avail" value="1" ${filters.avail?'checked':''} onchange="this.form.submit()"> 🟢 Available now</label>
      <label class="chk"><input type="checkbox" name="today" value="1" ${filters.today?'checked':''} onchange="this.form.submit()"> ⚡ Work today</label>
      <label class="chk"><input type="checkbox" name="relocate" value="1" ${filters.relocate?'checked':''} onchange="this.form.submit()"> ✈️ Open to relocate</label>
    </form>
    <div class="card" style="padding:0">
      <table class="tbl wide"><tr><th>Candidate</th><th>Trade</th><th>Exp</th><th>Credentials</th><th>Readiness</th><th>Pay floor</th></tr>
      ${rows.map(w=>`<tr><td><a class="cand-link" href="/console/candidates/${w.id}"><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</a>${w.available?'<span class="avail-dot" title="Available for work">●</span>':''}${w.work_today?'<span class="today-chip" title="Can work today">⚡</span>':''}${w.relocate?'<span class="today-chip" title="Open to relocate">✈️</span>':''}</td>
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
function empCandidate({ worker, profile, creds, matches, apps, messages, meId, notes = [], saved = false, portfolio = [], work = [] }) {
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
      ${profile.headline?`<p class="headline">${esc(profile.headline)}</p>`:''}
      <div class="chips">${tradeChips(profile)}</div>
      <p class="muted">${esc(profile.city)} ${esc(profile.zip||'')} · ${profile.years_exp} yrs experience · seeks $${profile.pay_floor}+/hr</p>
      ${profile.available?'<div class="avail-badge">🟢 Available for work</div>':'<div class="avail-badge off">⚪ Not currently available</div>'}${profile.work_today?'<div class="avail-badge today">⚡ Can work today</div>':''}${profile.relocate?'<div class="avail-badge relo">✈️ Open to relocate</div>':''}
      <div class="ministats">
        <div><b>${profile.readiness}</b><span>READINESS</span></div>
        <div><b>${creds.filter(c=>c.verified).length}</b><span>VERIFIED</span></div>
        <div><b>${creds.length}</b><span>CREDENTIALS</span></div>
      </div>
      ${(profile.about||profile.bio)?`<p class="cand-bio">${esc(profile.about||profile.bio)}</p>`:''}
    </div>
    ${work.length?`<div class="card"><div class="sec-h" style="margin-top:0">Work history</div>${workHistoryList(work, false)}</div>`:''}
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
      ${rows.map(w=>`<tr><td><a class="cand-link" href="/console/candidates/${w.id}"><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</a>${w.available?'<span class="avail-dot" title="Available for work">●</span>':''}${w.work_today?'<span class="today-chip" title="Can work today">⚡</span>':''}${w.relocate?'<span class="today-chip" title="Open to relocate">✈️</span>':''}</td>
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
  <rect width="1200" height="630" fill="#13212B"/>
  <rect width="1200" height="8" y="622" fill="#1763A6"/>
  <g transform="translate(90,90)">
    <rect width="92" height="92" rx="20" fill="#1763A6"/>
    <text x="46" y="66" font-family="Arial,Helvetica,sans-serif" font-size="58" font-weight="900" fill="#fff" text-anchor="middle">R</text>
    <text x="118" y="40" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="800" fill="#fff">Rivet</text>
    <text x="118" y="76" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="600" fill="#9fb0bb">× Crewline</text>
  </g>
  <text x="90" y="320" font-family="Arial,Helvetica,sans-serif" font-size="76" font-weight="800" fill="#fff">America can't <tspan fill="#F6A623">build</tspan></text>
  <text x="90" y="408" font-family="Arial,Helvetica,sans-serif" font-size="76" font-weight="800" fill="#fff">what it can't <tspan fill="#F6A623">staff.</tspan></text>
  <text x="90" y="500" font-family="Arial,Helvetica,sans-serif" font-size="32" font-weight="500" fill="#c3cfd6">The blue-collar hiring platform — built for the trades.</text>
</svg>`;
}

module.exports = { setLang, layout, landing, authForm, phoneStart, phoneVerify, workerOnboard, workerHome, workerJobs,
  jobDetail, workerProfile, workerApplications, publicPortfolio, empOverview, empJobs, empJobForm, empPipeline, empSearch, empCandidate, empShortlist, inbox, ogImage, STAGES, JOB_TYPES, empCompany, workerTraining };
