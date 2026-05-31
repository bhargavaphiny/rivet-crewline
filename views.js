'use strict';
/*
 * Rivet x Crewline - server-side HTML views.
 * Plain template-literal rendering. No template engine, no client framework.
 */
const { TRADES, CRED_KINDS, TRAINING } = require('./matching');
const US_STATES = require('./us-geo');

// ---- inline SVG icon set (consistent line style; no emoji) ----
const ICONS = {
  bolt:    { f:1, p:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' },
  dot:     { f:1, p:'<circle cx="12" cy="12" r="6"/>' },
  wrench:  { f:0, p:'<path d="M14.5 6.5a4 4 0 0 0 5.3 5.3L17 14.6l3.5 3.5a2 2 0 0 1-2.8 2.8L14.2 17l-2.8 2.8a4 4 0 0 1-5.3-5.3L8.9 12 6 9.1a2 2 0 0 1 2.8-2.8L11.7 9z"/>' },
  droplet: { f:0, p:'<path d="M12 3 6.5 9a7.5 7.5 0 1 0 11 0z"/>' },
  flame:   { f:0, p:'<path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.2.5-2 1-2.8C9 10 9 7 12 3z"/><path d="M5 14a7 7 0 0 0 14 0"/>' },
  hammer:  { f:0, p:'<path d="M14 6 18 2l4 4-4 4z"/><path d="M16 8 8.5 15.5"/><path d="M3 21l5.5-5.5a2 2 0 0 1 0-2.8"/>' },
  layers:  { f:0, p:'<path d="M12 3 3 8l9 5 9-5z"/><path d="M3 13l9 5 9-5"/>' },
  truck:   { f:0, p:'<path d="M3 6h11v9H3z"/><path d="M14 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>' },
  leaf:    { f:0, p:'<path d="M5 19c0-8 6-13 16-13 0 10-5 16-13 16-2 0-3-1-3-3z"/><path d="M5 19C8 14 12 11 17 9"/>' },
  bell:    { f:0, p:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10.5 21a2 2 0 0 0 3 0"/>' },
  pin:     { f:0, p:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.6"/>' },
  send:    { f:0, p:'<path d="M22 3 11 14"/><path d="M22 3 15 21l-4-7-7-4z"/>' },
  check:   { f:0, p:'<path d="M20 6 9 17l-5-5"/>' },
  star:    { f:1, p:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z"/>' },
  warn:    { f:0, p:'<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><path d="M12 17h.01"/>' },
  cross:   { f:0, p:'<path d="M10 3h4v5h5v4h-5v5h-4v-5H5V8h5z"/>' },
  heart:   { f:0, p:'<path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z"/>' },
  utensils:{ f:0, p:'<path d="M5 3v8M8 3v8M6.5 11v10M17 3c-1.5 0-2.5 1.8-2.5 4.5S15.5 12 17 12v9"/>' },
  box:     { f:0, p:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>' },
  spray:   { f:0, p:'<path d="M9 21h6V9H9z"/><path d="M9 9V5h4V3M13 5h3l1 2.5M19 6l1.5 1.5M20 10l1 1"/>' },
  shield:  { f:0, p:'<path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/>' },
  zoomin:  { f:0, p:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4M11 8v6M8 11h6"/>' },
  zoomout: { f:0, p:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4M8 11h6"/>' },
  toolbox: { f:0, p:'<path d="M3 9h18v11H3z"/><path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/><path d="M3 13h18"/>' },
  building:{ f:0, p:'<path d="M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M8 7h3M8 11h3M8 15h3"/>' },
  globe:   { f:0, p:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>' },
};
function icon(name, cls=''){
  const ic = ICONS[name] || ICONS.wrench;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="${ic.f?'currentColor':'none'}" stroke="${ic.f?'none':'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic.p}</svg>`;
}
const TRADE_ICON = {
  electrician:'bolt',solar:'bolt',low_voltage:'bolt',controls:'bolt',
  hvac:'wrench',sheet_metal:'layers',millwright:'wrench',machinist:'wrench',diesel_mechanic:'wrench',
  automotive_tech:'wrench',facilities:'wrench',locksmith:'wrench',elevator_tech:'wrench',crane_operator:'truck',
  plumber:'droplet',pipefitter:'droplet',fire_sprinkler:'droplet',
  welder:'flame',boilermaker:'flame',ironworker:'flame',
  carpenter:'hammer',framer:'hammer',drywall:'hammer',roofer:'hammer',glazier:'hammer',
  insulation:'hammer',painter:'hammer',flooring:'hammer',tile:'hammer',mason:'layers',concrete:'layers',
  cdl_driver:'truck',heavy_equipment:'truck',landscaper:'leaf',
  cna:'cross',medical_assistant:'cross',phlebotomist:'cross',emt:'cross',caregiver:'heart',
  farmworker:'leaf',fruit_picker:'leaf',
  cook:'utensils',server:'utensils',dishwasher:'utensils',bartender:'utensils',
  warehouse:'box',delivery_driver:'truck',mover:'box',
  janitor:'spray',housekeeper:'spray',security_guard:'shield',pest_control:'spray',appliance_repair:'wrench',
};

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const initials = name => esc((name||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase());

// ---------- i18n (en / es) ----------
let LANG = 'en';
function setLang(l){ LANG = (l === 'es') ? 'es' : 'en'; }
const I18N = {
  en: {
    nav_login:'Log in', nav_get_started:'Get started', nav_home:'Home', nav_find_work:'Jobs',
    nav_work_card:'Work Card', nav_applications:'Applications', nav_training:'Learn', nav_pulse:'Pulse', nav_messages:'Messages',
    nav_hiring:'Hiring →', nav_working:'Working →', nav_logout:'Log out', mode_work:'Work', mode_hire:'Hire',
    nav_overview:'Overview', nav_talent:'Talent', nav_jobs:'Jobs',
    hero_tag:'The blue-collar hiring platform · U.S.',
    hero_h1a:"America can't ", hero_build:'build', hero_h1b:' what it can\'t ', hero_staff:'staff.',
    hero_lead:'Rivet prepares skilled-trade workers to get hired and certified. Crewline gives employers verified, job-ready crews — fast.',
    cta_worker:"I'm a worker → Rivet", cta_employer:"I'm hiring → Crewline",
    pc_worker_h:'Rivet — for workers',
    pc_w1:'Verified credential wallet (license, OSHA, EPA)', pc_w2:'Job-readiness score', pc_w3:'Scored job matches near you', pc_w4:'Apply with one tap',
    pc_emp_h:'Crewline — for employers',
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
    home_readiness:'Job-Readiness Score', home_hireready:'Hire-ready', home_almost:'Almost there', home_build:'Build your card',
    home_credentials:'credentials', home_top:'Top matches near you', home_seeall:'See all', home_nomatch:'No matches yet — check back soon.',
    home_boost:'Boost your card', step_cred:'Add a credential', step_about:'Write your About', step_work:'Add work history', step_port:'Add portfolio photos',
    home_wallet:'Credential Wallet', home_manage:'Manage', home_quick:'Quick stats',
    cred_expiring_one:'credential expiring soon', cred_expiring_many:'credentials expiring soon',
    st_readiness:'READINESS', st_verified:'VERIFIED', st_years:'YEARS',
    x_avail_on:'Available for work', x_avail_off:'Tap: Available', x_today_on:'Can work today', x_today_off:'Tap: Work today',
    x_relo_on:'Open to relocate', x_relo_off:'Tap: Relocate', x_alert_on:'Job alerts on', x_alert_off:'Tap: Job alerts',
    x_tools_on:'I have my own tools', x_tools_off:'Tap: Own tools', x_transport_on:'Have reliable transport', x_transport_off:'Tap: Own transport',
    x_bilingual_on:'Bilingual (EN/ES)', x_bilingual_off:'Tap: Bilingual',
  },
  es: {
    nav_login:'Entrar', nav_get_started:'Empezar', nav_home:'Inicio', nav_find_work:'Empleos',
    nav_work_card:'Mi perfil', nav_applications:'Solicitudes', nav_training:'Aprender', nav_pulse:'Pulso', nav_messages:'Mensajes',
    nav_hiring:'Contratar →', nav_working:'Trabajar →', nav_logout:'Salir', mode_work:'Trabajo', mode_hire:'Contratar',
    nav_overview:'Resumen', nav_talent:'Talento', nav_jobs:'Empleos',
    hero_tag:'La plataforma de empleo para oficios · EE. UU.',
    hero_h1a:'Estados Unidos no puede ', hero_build:'construir', hero_h1b:' lo que no puede ', hero_staff:'dotar de personal.',
    hero_lead:'Rivet prepara a trabajadores de oficios para ser contratados y certificados. Crewline da a las empresas cuadrillas verificadas y listas para trabajar — rápido.',
    cta_worker:'Soy trabajador → Rivet', cta_employer:'Estoy contratando → Crewline',
    pc_worker_h:'Rivet — para trabajadores',
    pc_w1:'Cartera de credenciales verificadas (licencia, OSHA, EPA)', pc_w2:'Puntaje de preparación', pc_w3:'Empleos cerca de ti según tu perfil', pc_w4:'Postúlate con un toque',
    pc_emp_h:'Crewline — para empresas',
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
    home_readiness:'Puntaje de preparación', home_hireready:'Listo para contratar', home_almost:'Casi listo', home_build:'Completa tu perfil',
    home_credentials:'credenciales', home_top:'Mejores empleos cerca de ti', home_seeall:'Ver todos', home_nomatch:'Aún no hay coincidencias — vuelve pronto.',
    home_boost:'Mejora tu perfil', step_cred:'Agrega una credencial', step_about:'Escribe tu perfil', step_work:'Agrega tu experiencia', step_port:'Agrega fotos de tu trabajo',
    home_wallet:'Cartera de credenciales', home_manage:'Gestionar', home_quick:'Resumen',
    cred_expiring_one:'credencial por vencer', cred_expiring_many:'credenciales por vencer',
    st_readiness:'PREPARACIÓN', st_verified:'VERIFICADAS', st_years:'AÑOS',
    x_avail_on:'Disponible para trabajar', x_avail_off:'Toca: Disponible', x_today_on:'Puedo trabajar hoy', x_today_off:'Toca: Trabajar hoy',
    x_relo_on:'Dispuesto a mudarme', x_relo_off:'Toca: Mudarme', x_alert_on:'Alertas activadas', x_alert_off:'Toca: Alertas de empleo',
    x_tools_on:'Tengo mis herramientas', x_tools_off:'Toca: Herramientas', x_transport_on:'Tengo transporte', x_transport_off:'Toca: Transporte',
    x_bilingual_on:'Bilingüe (EN/ES)', x_bilingual_off:'Toca: Bilingüe',
  },
};
function t(k){ return (I18N[LANG] && I18N[LANG][k] != null) ? I18N[LANG][k] : (I18N.en[k] != null ? I18N.en[k] : k); }

// Self-keyed translation: T('English text') → Spanish from the LLM cache when
// LANG==='es', else the English text. Misses are collected for the server to
// translate in the background (English shows until then). $0 + no hardcoding.
let ESMAP = null;
const _esMiss = new Set();
function setEs(m){ ESMAP = m; }
function drainEsMisses(){ const a = [..._esMiss]; _esMiss.clear(); return a; }
function T(s){
  if(LANG !== 'es' || !s) return s;
  if(ESMAP && ESMAP.has(s)) return ESMAP.get(s);
  _esMiss.add(s);
  return s;
}

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
  const langTg = `<div class="seg" role="group" aria-label="Language">
      <a class="seg-opt ${LANG!=='es'?'on':''}" href="/lang/en">EN</a><a class="seg-opt ${LANG==='es'?'on':''}" href="/lang/es">ES</a></div>`;
  const modeTg = (cur)=>`<div class="seg mode" role="group" aria-label="Mode">
      <a class="seg-opt ${cur==='work'?'on':''}" href="/app">${t('mode_work')}</a><a class="seg-opt ${cur==='hire'?'on':''}" href="/console">${t('mode_hire')}</a></div>`;
  let nav = '';
  if (!user) {
    nav = `<a class="nav-link" href="/login">${t('nav_login')}</a>
           <a class="btn-sm" href="/signup">${t('nav_get_started')}</a>${langTg}`;
  } else if ((user.mode || user.role) === 'worker') {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    const msg = `<a class="nav-link ${active==='msgs'?'on':''}" href="/app/messages">${t('nav_messages')}${user.unread?`<span class="ndot">${user.unread}</span>`:''}</a>`;
    nav = `${L('/app',t('nav_home'),'home')}${L('/app/jobs',t('nav_find_work'),'jobs')}${L('/app/profile',t('nav_work_card'),'profile')}${L('/app/applications',t('nav_applications'),'apps')}${L('/app/training',t('nav_training'),'training')}${L('/pulse',t('nav_pulse'),'pulse')}${msg}
           ${modeTg('work')}
           <span class="who">${initials(user.name)}</span>
           <a class="nav-link" href="/logout">${t('nav_logout')}</a>${langTg}`;
  } else {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    const msg = `<a class="nav-link ${active==='msgs'?'on':''}" href="/console/messages">${t('nav_messages')}${user.unread?`<span class="ndot">${user.unread}</span>`:''}</a>`;
    nav = `${L('/console',t('nav_overview'),'ov')}${L('/console/search',t('nav_talent'),'search')}${L('/console/jobs',t('nav_jobs'),'jobs')}${L('/pulse',t('nav_pulse'),'pulse')}${msg}
           ${modeTg('hire')}
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
  <link rel="stylesheet" href="/styles.css?v=35">
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
function xToggle(action, on, iconName, onLabel, offLabel, next){
  return `<form method="post" action="${action}" class="xf"><input type="hidden" name="next" value="${next}">
    <button class="xbtn ${on?'on':''}">${icon(iconName,'xic')}<span>${on?onLabel:offLabel}</span></button></form>`;
}
function workerHome({ user, profile, creds, matches, workCount = 0, portCount = 0, jobsGeo = null }) {
  const top = matches.slice(0,3).map(m=>jobCard(m)).join('');
  const expiring = creds.filter(c=>c.expires && c.expires < '2026-08').length;
  const steps = [
    { done: creds.length>0, label:t('step_cred'), href:'/app/profile' },
    { done: !!profile.about, label:t('step_about'), href:'/app/profile' },
    { done: workCount>0, label:t('step_work'), href:'/app/profile' },
    { done: portCount>0, label:t('step_port'), href:'/app/profile' },
  ];
  const doneN = steps.filter(s=>s.done).length;
  return `<section class="wrap">
    <div class="xbar">
      ${xToggle('/app/available', profile.available, 'dot', t('x_avail_on'), t('x_avail_off'), '/app')}
      ${xToggle('/app/work-today', profile.work_today, 'bolt', t('x_today_on'), t('x_today_off'), '/app')}
      ${xToggle('/app/relocate', profile.relocate, 'send', t('x_relo_on'), t('x_relo_off'), '/app')}
      ${xToggle('/app/alerts', profile.alerts, 'bell', t('x_alert_on'), t('x_alert_off'), '/app')}
      ${xToggle('/app/tools', profile.has_tools, 'toolbox', t('x_tools_on'), t('x_tools_off'), '/app')}
      ${xToggle('/app/transport', profile.has_transport, 'truck', t('x_transport_on'), t('x_transport_off'), '/app')}
      ${xToggle('/app/bilingual', profile.bilingual, 'globe', t('x_bilingual_on'), t('x_bilingual_off'), '/app')}
    </div>
    ${jobsGeo && jobsGeo.points.length ? usMap(jobsGeo.points, {title:t('home_top'), noun:T('job'), cta:T('Apply'),
        legend:`<span class="lg"><i class="d-direct"></i> ${T('Your trades')}</span><span class="lg"><i class="d-related"></i> ${T('Related trades')}</span>`,
        emptyMsg:T('No mapped openings yet.')}) : ''}
    <div class="dash-grid">
      <div>
        <div class="readiness card">
          <div class="ring">${ring(profile.readiness)}</div>
          <div>
            <div class="r-lbl">${t('home_readiness')}</div>
            <div class="r-big">${profile.readiness>=85?t('home_hireready'):profile.readiness>=70?t('home_almost'):t('home_build')}</div>
            <p>${creds.length} ${t('home_credentials')} · ${tradesOf(profile).map(t=>TRADES[t]||t).join(', ')} · ${esc(profile.city)}</p>
          </div>
        </div>
        <div class="sec-h">${t('home_top')} <a href="/app/jobs">${t('home_seeall')}</a></div>
        ${top || `<div class="card muted">${t('home_nomatch')}</div>`}
      </div>
      <aside>
        ${doneN<4?`<div class="card">
          <div class="sec-h" style="margin-top:0">${t('home_boost')} <span class="muted">${doneN}/4</span></div>
          <div class="checklist">${steps.map(s=>`<a class="chk-step ${s.done?'done':''}" href="${s.href}"><span class="cb">${s.done?'✓':''}</span>${s.label}</a>`).join('')}</div>
        </div>`:''}
        <div class="card">
          <div class="sec-h" style="margin-top:0">${t('home_wallet')} <a href="/app/profile">${t('home_manage')}</a></div>
          ${creds.slice(0,4).map(credRow).join('') || `<p class="muted">${t('step_cred')}</p>`}
        </div>
        ${expiring?`<div class="card warn-card">${icon('warn','xic')} <span>${expiring} ${expiring===1?t('cred_expiring_one'):t('cred_expiring_many')}</span> · <a href="/app/profile">${t('home_manage')}</a></div>`:''}
        <div class="card">
          <div class="sec-h" style="margin-top:0">${t('home_quick')}</div>
          <div class="ministats">
            <div><b>${profile.readiness}</b><span>${t('st_readiness')}</span></div>
            <div><b>${creds.filter(c=>c.verified).length}</b><span>${t('st_verified')}</span></div>
            <div><b>${profile.years_exp}</b><span>${t('st_years')}</span></div>
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
  const fit = (m.missing && m.missing.length)
    ? `<span class="mtag warn">${T('Needs')} ${CRED_KINDS[m.missing[0]]||m.missing[0]}</span>`
    : `<span class="mtag fit">${T('Credentials ✓')}</span>`;
  return `<a class="card job" href="/app/jobs/${j.id}">
    <div class="job-row">
      <div class="badge">${tradeEmoji(j.trade)}</div>
      <div class="job-main">
        <div class="job-t">${esc(j.title)}</div>
        <div class="job-c">${esc(j.company||'')} · ${esc(j.city)}${m.distance!=null?` · <b class="dist">${m.distance} ${T('mi away')}</b>`:''}</div>
      </div>
      <span class="score-chip ${scoreClass(m.score)}">${m.score}</span>
    </div>
    <div class="job-foot">
      <span class="pay">$${j.pay_min}–${j.pay_max}<small>/hr</small></span>
      ${j.employment_type?`<span class="jtype">${esc(j.employment_type)}</span>`:''}
      <span class="js-shift">${esc(j.shift)}</span>
      ${fit}
    </div>
    <div class="matchbar"><i style="width:${m.score}%"></i></div>
  </a>`;
}

function tradeEmoji(t){ return icon(TRADE_ICON[t] || 'wrench', 'tic'); }

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
    <div class="sec-h big">${T('Find work')} <span class="muted">${matches.length} ${matches.length===1?T('job'):T('jobs')}${active?' · '+T('filtered'):' · '+T('ranked by fit')}</span></div>
    <form class="jobfilters" method="get" action="/app/jobs">
      <input name="q" value="${esc(filters.q||'')}" placeholder="${T('Search title or company')}" aria-label="Search">
      <select name="trade" aria-label="Trade">${tradeOpts}</select>
      <input name="city" value="${esc(filters.city||'')}" placeholder="${T('City')}" aria-label="City">
      <input name="minpay" type="number" min="0" inputmode="numeric" value="${filters.minpay||''}" placeholder="${T('Min $/hr')}" aria-label="Minimum pay">
      <input name="maxmi" type="number" min="0" inputmode="numeric" value="${filters.maxmi||''}" placeholder="${T('Within mi')}" aria-label="Within miles">
      <select name="shift" aria-label="Shift">${shiftOpts}</select>
      <select name="jtype" aria-label="Employment type">${typeOpts}</select>
      <label class="chk"><input type="checkbox" name="sort" value="distance" ${filters.sort==='distance'?'checked':''}> ${T('Nearest first')}</label>
      <button class="btn-sm">${T('Search')}</button>
      ${active?`<a class="nav-link" style="color:var(--brand-d)" href="/app/jobs">${T('Clear')}</a>`:''}
    </form>
    ${jobsGeo && jobsGeo.points.length ? usMap(jobsGeo.points, {title:T('Where the work is'), noun:T('job'), cta:T('Apply'),
        legend:`<span class="lg"><i class="d-direct"></i> ${T('Your trades')}</span><span class="lg"><i class="d-related"></i> ${T('Related trades')}</span>`,
        emptyMsg:T('No mapped openings yet.')}) : ''}
    <div class="grid3">${matches.map(jobCard).join('') || `<div class="card muted">${T('No jobs match those filters.')} <a href="/app/jobs">${T('Clear filters')}</a></div>`}</div>
  </section>`;
}

// ---------- worker: job detail ----------
function jobDetail({ job, match, applied, saved = false, jobMedia = [], distance = null, rules = null }) {
  const belowMin = rules && job.pay_min && job.pay_min < rules.minWage;
  return `<section class="wrap narrow">
    <a class="back" href="/app/jobs">← All matches</a>
    <div class="card">
      <div class="job-row">
        <div class="badge big">${tradeEmoji(job.trade)}</div>
        <div class="job-main">
          <h2>${esc(job.title)}</h2>
          ${job.employment_type?`<span class="jtype">${esc(job.employment_type)}</span>`:''}
          <div class="job-c">${esc(job.company||'')} · ${esc(job.city)} ${esc(job.zip)} · ${esc(job.shift)} shift${distance!=null?` · <b class="dist">${distance} ${T('mi away')}</b>`:''}</div>
          <div class="pay big">$${job.pay_min}–${job.pay_max}/hr</div>
        </div>
        <div class="score-pill ${scoreClass(match.score)}">${match.score}<small>match</small></div>
      </div>
      <p class="descr">${esc(job.descr)}</p>
      ${rules?`<div class="rules">
        <div class="rules-h">${T('Local pay & rules')} · ${esc(rules.stateName)}</div>
        <div class="rules-grid">
          <div><span>${T('State minimum wage')}</span><b>$${rules.minWage.toFixed(2)}/hr</b></div>
          <div><span>${T('This job pays')}</span><b class="${belowMin?'r-bad':'r-good'}">$${job.pay_min}–${job.pay_max}/hr</b></div>
          <div><span>${T('Overtime')}</span><b>${T('1.5× after 40 hrs/wk')}</b></div>
        </div>
        <p class="rules-note">${T('Employers must meet the higher of state, county or city minimum wage. Verify local rules before you start.')}</p>
      </div>`:''}
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
    <div class="sec-h big">${T('Your applications')}</div>
    ${apps.length ? apps.map(a=>`<div class="card app-card">
      <div class="job-row"><div class="badge">${tradeEmoji(a.trade)}</div>
        <div class="job-main"><h4>${esc(a.title)}</h4>
          <div class="muted">${esc(a.company||'')} · ${esc(a.city)} · $${a.pay_min}–${a.pay_max}/hr${a.distance!=null?` · <b class="dist">${a.distance} ${T('mi away')}</b>`:''}</div></div>
        <span class="score-tag ${scoreClass(a.score)}">${a.score}</span></div>
      ${stageTimeline(a.stage)}
    </div>`).join('') : `<div class="card muted">${T('No applications yet.')} <a href="/app/jobs">${T('Browse matches →')}</a></div>`}
    <div class="sec-h big" style="margin-top:26px">${T('Saved jobs')}</div>
    ${savedJobs.length ? savedJobs.map(j=>`<a class="jobline" href="/app/jobs/${j.id}">
        <div class="jl-left"><div class="badge">${tradeEmoji(j.trade)}</div>
          <div><h4>${esc(j.title)}</h4><div class="muted">${esc(j.company||'')} · ${esc(j.city)} · $${j.pay_min}–${j.pay_max}/hr · ${esc(j.shift)}${j.distance!=null?` · <b class="dist">${j.distance} ${T('mi away')}</b>`:''}</div></div></div>
        <span class="nav-link" style="color:var(--brand-d)">${T('View →')}</span>
      </a>`).join('')
      : `<div class="card muted">${T('No saved jobs yet. Tap ☆ Save on any job to keep it here.')}</div>`}
  </section>`;
}
function bd(label,val,max){const pct=Math.round(val/max*100);return `<div class="bd"><span>${label}</span><div class="bdbar"><i style="width:${pct}%"></i></div><b>${val}/${max}</b></div>`;}

// ---------- worker: profile / work card ----------
function tradeChips(profile){
  let out = tradesOf(profile).map(t=>`<span class="chip">${tradeEmoji(t)} ${TRADES[t]||t}</span>`).join('');
  if(profile && profile.custom_trade) out += `<span class="chip">${tradeEmoji('wrench')} ${esc(profile.custom_trade)}</span>`;
  return out;
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
      <div class="exp-top"><b>${esc(w.role||'')}</b>${w.current?`<span class="chip sm green">${T('Current')}</span>`:''}</div>
      <div class="muted">${esc(w.employer||'')}${w.city?(' · '+esc(w.city)):''}${yrs?(' · '+esc(yrs)):''}</div>
      ${w.description?`<p class="exp-d">${esc(w.description)}</p>`:''}
    </div>
    ${editable?`<form method="post" action="/app/experience/${w.id}/delete"><button class="x" title="Remove">✕</button></form>`:''}
  </div>`;
}
function workHistoryList(items, editable){
  return items.length ? `<div class="explist">${items.map(w=>workRow(w, editable)).join('')}</div>`
    : (editable ? `<p class="muted">${T('No past jobs added yet — add the places you’ve worked below. This is what recruiters trust most.')}</p>` : '');
}
function workerProfile({ user, profile, creds, error, portfolio = [], work = [] }) {
  const kinds = Object.entries(CRED_KINDS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  const trades = tradesOf(profile);
  return `<section class="wrap">
    <div class="card profile-head wide-head">
      <div class="big-av">${initials(user.name)}</div>
      <h2>${esc(user.name)}</h2>
      ${profile.headline?`<p class="headline">${esc(profile.headline)}</p>`:''}
      <div class="chips">${tradeChips(profile)}</div>
      <p class="muted">${esc(profile.city)} · ${profile.years_exp} yrs · floor $${profile.pay_floor}/hr · ${esc(profile.shift)} shift</p>
      <div class="ministats">
        <div><b>${profile.readiness}</b><span>${T('READINESS')}</span></div>
        <div><b>${creds.filter(c=>c.verified).length}</b><span>${T('VERIFIED')}</span></div>
        <div><b>${creds.length}</b><span>${T('TOTAL CREDS')}</span></div>
      </div>
      <form method="post" action="/app/available" class="avail-form">
        <button class="btn-sm tgl ${profile.available?'':'ghost'}">${icon('dot','xic')}<span>${profile.available?T('Available for work — tap to pause'):T('Paused — tap to go available')}</span></button>
      </form>
      <form method="post" action="/app/work-today" class="avail-form" style="margin-top:8px">
        <button class="btn-sm tgl ${profile.work_today?'':'ghost'}">${icon('bolt','xic')}<span>${profile.work_today?T('Can work today — tap to clear'):T('I can work today')}</span></button>
      </form>
      <form method="post" action="/app/alerts" class="avail-form" style="margin-top:8px">
        <button class="btn-sm tgl ${profile.alerts?'':'ghost'}">${icon('bell','xic')}<span>${profile.alerts?T('Job alerts on — tap to stop'):T('Text me new job alerts')}</span></button>
      </form>
      <form method="post" action="/app/relocate" class="avail-form" style="margin-top:8px">
        <button class="btn-sm tgl ${profile.relocate?'':'ghost'}">${icon('send','xic')}<span>${profile.relocate?T('Open to relocate — tap to clear'):T('I’m open to relocating')}</span></button>
      </form>
    </div>
    <div class="col2"><div class="colstack">
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Trades, headline & about')}</div>
      ${error?`<div class="err">${esc(error)}</div>`:''}
      <form method="post" action="/app/profile/details">
        <label>${T('Headline')} <input name="headline" maxlength="80" value="${esc(profile.headline||'')}" placeholder="${T('e.g. Journeyman electrician — commercial & solar')}"></label>
        <div class="fieldset">
          <div class="fs-lbl">${T('Your trades')} <span class="muted">${T('pick all you work')}</span></div>
          <div class="tradegrid">${tradeCheckboxes(trades)}</div>
        </div>
        <label>${T("Don't see your job? Add it")} <input name="custom_trade" maxlength="60" value="${esc(profile.custom_trade||'')}" placeholder="${T('e.g. Wind turbine technician')}"></label>
        <label>${T('About you')} <textarea name="about" rows="3" maxlength="600" placeholder="${T("Where you've worked, what you're great at, what you're looking for.")}">${esc(profile.about||'')}</textarea></label>
        <button class="btn-sm">${T('Save details')}</button>
      </form>
      <form method="post" action="/app/profile/suggest-about" style="margin-top:8px">
        <button class="btn-sm ghost" title="Drafts an About from your trades and work history — free">${T('✨ Draft my About for me')}</button>
      </form>
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Work history')}</div>
      ${workHistoryList(work, true)}
      <form method="post" action="/app/experience" class="exp-form">
        <div class="row2">
          <label>${T('Role / title')} <input name="role" maxlength="80" required placeholder="${T('e.g. Lead Electrician')}"></label>
          <label>${T('Employer')} <input name="employer" maxlength="80" placeholder="${T('e.g. Sun Valley Electric')}"></label>
        </div>
        <div class="row2">
          <label>${T('Trade')} <select name="trade">${trades.length?trades.map(t=>`<option value="${t}">${TRADES[t]||t}</option>`).join(''):Object.entries(TRADES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
          <label>${T('City')} <input name="city" maxlength="60" placeholder="${T('e.g. Phoenix')}"></label>
        </div>
        <div class="row2">
          <label>${T('From year')} <input type="number" name="start_year" min="1960" max="2026" placeholder="2019"></label>
          <label>${T('To year')} <input type="number" name="end_year" min="1960" max="2026" placeholder="${T('2023 (blank = current)')}"></label>
        </div>
        <label>${T('What you did')} <textarea name="description" rows="2" maxlength="400" placeholder="${T('Scope, scale, what you were responsible for.')}"></textarea></label>
        <button class="btn-sm">${T('Add to work history')}</button>
      </form>
    </div>
    </div><div class="colstack">
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Credential Wallet')}</div>
      ${creds.map(credRow).join('') || `<p class="muted">${T('No credentials yet — add one below.')}</p>`}
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Add a credential')}</div>
      ${error?`<div class="err">${esc(error)}</div>`:''}
      <form method="post" action="/app/credentials" class="inline-form">
        <select name="kind">${kinds}</select>
        <input name="expires" placeholder="${T('Expires e.g. 2027-06')}">
        <button class="btn">${T('Add credential')}</button>
      </form>
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Portfolio — your past work')} <a href="/p/${user.id}" target="_blank" rel="noopener">${T('View public page ↗')}</a></div>
      ${mediaGallery(portfolio, {deletable:true, base:'/app/portfolio'}) || `<p class="muted">${T('Add photos or videos of jobs you’ve completed — it builds your shareable portfolio and helps recruiters trust your work.')}</p>`}
      <form method="post" action="/app/portfolio" class="port-form">
        <input name="url" placeholder="${T('Image URL or YouTube / Vimeo link')}" required>
        <input name="title" placeholder="${T('Title — e.g. Commercial panel upgrade')}">
        <input name="caption" placeholder="${T('Short caption (optional)')}">
        <button class="btn-sm">${T('Add to portfolio')}</button>
      </form>
    </div>
    </div></div>
  </section>`;
}

// ---------- worker: training & certifications ----------
function trainCard(kind, have){
  const tr = TRAINING[kind]; if(!tr) return '';
  return `<div class="train ${have?'have':''}">
    <div class="train-h"><b>${esc(CRED_KINDS[kind]||kind)}</b>${have?`<span class="chip sm green">${T('On your card ✓')}</span>`:''}</div>
    <p>${T(tr.how)}</p>
    <a class="nav-link" style="color:var(--brand-d);font-weight:700" href="${esc(tr.url)}" target="_blank" rel="noopener noreferrer">${T('How to earn it ↗')}</a>
  </div>`;
}
function workerTraining({ have = [] }) {
  const haveSet = new Set(have);
  const all = Object.keys(TRAINING);
  const todo = all.filter(k=>!haveSet.has(k));
  const done = all.filter(k=>haveSet.has(k));
  return `<section class="wrap">
    <div class="sec-h big">${T('Learn & get certified')} <span class="muted">${T('Real credentials open more jobs and raise your readiness score')}</span></div>
    <div class="card info-card">${T('Certifications are the fastest way to stand out. Every one you add to your Work Card is verified and boosts how you match to jobs. Below is how to earn each — most can be done online or through a local provider.')}</div>
    <div class="sec-h">${T('Recommended — not on your card yet')}</div>
    <div class="traingrid">${todo.map(k=>trainCard(k,false)).join('') || `<p class="muted">${T('You’ve added every credential we track. Impressive.')}</p>`}</div>
    ${done.length?`<div class="sec-h">${T('Already on your Work Card')}</div><div class="traingrid">${done.map(k=>trainCard(k,true)).join('')}</div>`:''}
  </section>`;
}

// ---------- Industry Pulse: trends + community board ----------
const PULSE_NEWS = [
  { tag:'Demand', title:'Data-center boom is driving record electrician & HVAC demand', body:'Hyperscale and AI build-outs are pulling thousands of electricians, controls techs and HVAC installers into commercial work — often at premium pay.' },
  { tag:'Wages', title:'Skilled-trade wages keep climbing faster than inflation', body:'Welders, plumbers and pipefitters with current certs are commanding sign-on bonuses and per-diem on travel jobs as the labor crunch continues.' },
  { tag:'Healthcare', title:'CNAs and home-health aides are among the fastest-growing roles', body:'An aging population is fueling steady, flexible demand for certified nursing assistants and caregivers nationwide.' },
  { tag:'Logistics', title:'Warehouse, delivery and CDL roles stay red-hot', body:'E-commerce and regional distribution keep last-mile drivers, forklift operators and warehouse crews in constant demand.' },
];
function pulsePage({ user, trending, posts, totalOpen, companies = [], demandGeo = [] }) {
  const maxN = Math.max(1, ...trending.map(t=>t.n));
  const trendRows = trending.map((t,i)=>`<div class="trend-row">
      <span class="trend-rank">${i+1}</span>
      <span class="trend-ic">${tradeEmoji(t.trade)}</span>
      <div class="trend-main"><div class="trend-nm">${TRADES[t.trade]||t.trade}</div>
        <div class="trend-bar"><i style="width:${Math.round((t.n/maxN)*100)}%"></i></div></div>
      <b class="trend-n">${t.n}</b>
    </div>`).join('');
  const companyRows = companies.map((c,i)=>`<div class="trend-row">
      <span class="trend-rank">${i+1}</span>
      <span class="trend-ic">${icon('building','tic')}</span>
      <div class="trend-main"><div class="trend-nm">${esc(c.company)}</div><div class="muted sm">${esc(c.company_city||'')}</div></div>
      <b class="trend-n">${c.n}</b>
    </div>`).join('');
  return `<section class="wrap">
    <div class="sec-h big">${T('Industry Pulse')} <span class="muted">${T("What's in demand right now")}</span></div>
    ${demandGeo.length ? usMap(demandGeo, {title:T('Where demand is hottest'), noun:T('job'), cta:T('View')}) : ''}
    <div class="grid2">
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Trending trades')} <span class="muted">${totalOpen} ${T('open jobs')}</span></div>
        ${trendRows || `<p class="muted">${T('No open jobs yet.')}</p>`}
      </div>
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Industry news')}</div>
        ${PULSE_NEWS.map(n=>`<div class="news">
          <span class="news-tag">${T(n.tag)}</span>
          <div class="news-t">${T(n.title)}</div>
          <p class="news-b">${T(n.body)}</p>
        </div>`).join('')}
        <p class="muted sm" style="margin-top:8px">${T('Trends reflect open jobs on Rivet plus public labor data.')} <a href="https://www.bls.gov/ooh/" target="_blank" rel="noopener noreferrer">BLS ↗</a></p>
      </div>
    </div>
    ${companies.length?`<div class="card">
      <div class="sec-h" style="margin-top:0">${T('Top hiring companies')} <span class="muted">${T('most open roles')}</span></div>
      ${companyRows}
    </div>`:''}
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Community board')} <span class="muted">${T('Tips from the field')}</span></div>
      ${user ? `<form method="post" action="/pulse" class="msg-form" style="margin-bottom:14px">
        <input name="body" placeholder="${T("Share a tip, a lead, or what's hiring near you…")}" autocomplete="off" required maxlength="600">
        <button class="btn-sm">${T('Post')}</button>
      </form>` : `<p class="muted">${T('Log in to join the conversation.')}</p>`}
      <div class="board">
        ${posts.length ? posts.map(p=>`<div class="post">
          <span class="av-t">${initials(p.author_name||'?')}</span>
          <div class="post-main">
            <div class="post-h"><b>${esc(p.author_name||'Member')}</b>${p.trade?`<span class="chip sm">${tradeEmoji(p.trade)} ${TRADES[p.trade]||p.trade}</span>`:''}<span class="post-t">${timeAgo(p.created_at)}</span></div>
            <p class="post-b">${esc(p.body)}</p>
          </div>
        </div>`).join('') : `<p class="muted">${T('No posts yet — be the first.')}</p>`}
      </div>
    </div>
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
// ---------- US map (real state outlines from us-geo, same linear projection as dots) ----------
// Interactive US map: real state outlines + clickable count dots that open a
// panel of jobs/candidates (with a CTA), plus zoom controls. points = [{city,lat,lon,n,kind?,items:[{label,sub,href}]}]
const MAP_CITIES = [
  ['Seattle',-122.33,47.61],['Portland',-122.68,45.52],['San Francisco',-122.42,37.77],['Los Angeles',-118.24,34.05],
  ['Las Vegas',-115.14,36.17],['Phoenix',-112.07,33.45],['Denver',-104.99,39.74],['Dallas',-96.80,32.78],
  ['Houston',-95.37,29.76],['Minneapolis',-93.27,44.98],['Chicago',-87.63,41.88],['Detroit',-83.05,42.33],
  ['Nashville',-86.78,36.17],['Atlanta',-84.39,33.75],['Miami',-80.19,25.76],['New York',-74.0,40.71],
];
function usMap(points = [], opts = {}){
  const { title='Where your talent is', noun='candidate', emptyMsg='No mapped locations yet.', legend=null, cta='Open' } = opts;
  const MINLON=-125, MAXLON=-66, MINLAT=24, MAXLAT=50, VW=620, VH=350;
  const px = lon => ((lon-MINLON)/(MAXLON-MINLON)*VW).toFixed(1);
  const py = lat => ((MAXLAT-lat)/(MAXLAT-MINLAT)*VH).toFixed(1);
  const statePaths = US_STATES.map(s=>`<path class="us-state" d="${s.d}"><title>${esc(s.n)}</title></path>`).join('');
  const cityLayer = MAP_CITIES.map(([nm,lo,la])=>`<g class="us-city"><circle cx="${px(lo)}" cy="${py(la)}" r="1.6"/><text x="${(+px(lo)+4).toFixed(1)}" y="${(+py(la)+3).toFixed(1)}">${esc(nm)}</text></g>`).join('');
  // demand heat: soft amber glow blobs sized by how many openings/candidates cluster there
  const heatDefs = `<defs><radialGradient id="rvheat"><stop offset="0%" stop-color="#F6A623" stop-opacity=".6"/><stop offset="55%" stop-color="#F6A623" stop-opacity=".18"/><stop offset="100%" stop-color="#F6A623" stop-opacity="0"/></radialGradient></defs>`;
  const heat = points.map(g=>{ const hr=Math.min(64, 18 + (g.n||1)*9); return `<circle class="heat" cx="${px(g.lon)}" cy="${py(g.lat)}" r="${hr}" fill="url(#rvheat)"/>`; }).join('');
  const total = points.reduce((a,g)=>a+(g.n||0),0);
  const dots = points.map((g,i)=>{
    const r = Math.min(18, 6 + (g.n||1)*2.2);
    const cls = g.kind==='related' ? 'mdot related' : 'mdot';
    const lbl = `${g.city||''}: ${g.n} ${noun}${g.n===1?'':'s'}`;
    return `<g class="${cls}" tabindex="0" role="button" onclick="rvMapShow(${i})" onkeydown="if(event.key==='Enter')rvMapShow(${i})">
      <circle cx="${px(g.lon)}" cy="${py(g.lat)}" r="${r}"><title>${esc(lbl)}</title></circle>
      <text x="${px(g.lon)}" y="${(+py(g.lat)+3.6).toFixed(1)}" text-anchor="middle">${g.n}</text></g>`;
  }).join('');
  const top = points.slice(0,7).map((g,i)=>`<li onclick="rvMapShow(${i})"><span>${esc(g.city||'—')}</span><b>${g.n}</b></li>`).join('');
  // escaped per-point payload for the click panel (esc() makes it HTML- and </script>-safe)
  const data = points.map(g=>({ c: esc(g.city||''), items: (g.items||[]).slice(0,12).map(it=>({l:esc(it.label||''),s:esc(it.sub||''),h:esc(it.href||'#')})) }));
  return `<div class="card">
    <div class="sec-h" style="margin-top:0">${esc(title)} <span class="muted">${total} ${noun}${total===1?'':'s'} mapped</span></div>
    ${points.length ? `<div class="mapwrap">
      <div class="mapbox">
        <svg class="usmap" id="rvsvg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="US map">
          ${heatDefs}
          <g class="us-states">${statePaths}</g>
          <g class="us-heat">${heat}</g>
          <g class="us-cities">${cityLayer}</g>${dots}
        </svg>
        <div class="mapzoom"><button type="button" onclick="rvZoom(.8)" aria-label="Zoom in">${icon('zoomin')}</button><button type="button" onclick="rvZoom(1.25)" aria-label="Zoom out">${icon('zoomout')}</button></div>
      </div>
      <div class="mapside">
        <ul class="maplist">${top}</ul>
        <div class="mappanel" id="rvpanel"><p class="muted sm">${T('Tap a dot to see openings there')}</p></div>
      </div>
    </div>${legend?`<div class="maplegend">${legend}</div>`:''}
    <script>(function(){
      window.__RVD=${JSON.stringify(data)};window.__RVC=${JSON.stringify(esc(cta))};
      if(window.__rvmapInit)return;window.__rvmapInit=1;
      window.rvMapShow=function(i){var d=(window.__RVD||[])[i];var p=document.getElementById('rvpanel');if(!d||!p)return;
        if(!d.items.length){p.innerHTML='<div class="mp-h">'+d.c+'</div><p class="muted sm">'+(window.__RVC==='Apply'?'No matching openings here yet.':'No items here.')+'</p>';return;}
        p.innerHTML='<div class="mp-h">'+d.c+'</div>'+d.items.map(function(it){return '<div class="mp-row"><div class="mp-info"><b>'+it.l+'</b><span>'+it.s+'</span></div><a class="mp-cta" href="'+it.h+'">'+window.__RVC+'</a></div>';}).join('');};
      window.rvZoom=function(f){var s=document.getElementById('rvsvg');if(!s)return;var vb=(s.getAttribute('viewBox')||'0 0 620 350').split(' ').map(Number);var cx=vb[0]+vb[2]/2,cy=vb[1]+vb[3]/2,nw=Math.max(150,Math.min(620,vb[2]*f)),nh=Math.max(85,Math.min(350,vb[3]*f));s.setAttribute('viewBox',(cx-nw/2).toFixed(1)+' '+(cy-nh/2).toFixed(1)+' '+nw.toFixed(1)+' '+nh.toFixed(1));};
    })();</script>`
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
    <div class="page-h"><h2>${T('Overview')}</h2><p class="muted">${esc(user.company||user.name)}</p>
      <a class="btn-sm right" href="/console/jobs/new">${T('+ Post a job')}</a></div>
    <div class="kpis">
      ${kpi(T('Open jobs'),kpis.openJobs)}
      ${kpi(T('Verified talent pool'),kpis.pool)}
      ${kpi(T('In pipeline'),kpis.pipeline)}
      ${kpi(T('Hired'),kpis.hired)}
      ${kpi(T('Fill rate'),fillRate+'%')}
    </div>
    <div class="grid2">
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Hiring funnel')} <span class="muted">${kpis.applicants} ${T('candidates')}</span></div>
        ${kpis.applicants ? `<div class="funnel">${funnelBars}</div>` : `<p class="muted">${T('No candidates in your pipeline yet.')} <a href="/console/search">${T('Source from Talent Search →')}</a></p>`}
      </div>
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Recent activity')}</div>
        ${recent && recent.length ? recent.map(r=>`<div class="act">
          <span class="av-t">${initials(r.name)}</span>
          <div class="act-b"><a class="cand-link" href="/console/candidates/${r.worker_id}">${esc(r.name)}</a> ${T('entered')} <b>${esc(r.title)}</b> <span class="stage-pill sm">${esc(r.stage)}</span></div>
          <span class="act-t">${timeAgo(r.created_at)}</span>
        </div>`).join('') : `<p class="muted">${T('No recent activity yet.')}</p>`}
      </div>
    </div>
    ${usMap(geo, {title:T('Where your talent is'), noun:T('candidate'), cta:T('View'), emptyMsg:T('No mapped candidate locations yet. Locations appear as workers add a ZIP to their Work Card.')})}
    <div class="grid2">
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Hot candidates — ready now')} <a href="/console/search">${T('Search all')}</a></div>
        <table class="tbl"><tr><th>${T('Candidate')}</th><th>${T('Trade')}</th><th>${T('Readiness')}</th><th>${T('Creds')}</th></tr>
        ${hot.map(w=>`<tr><td><a class="cand-link" href="/console/candidates/${w.id}"><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</a></td>
          <td>${TRADES[w.trade]||w.trade}</td>
          <td><span class="score-tag ${scoreClass(w.readiness)}">${w.readiness}</span></td>
          <td>${w.vcount} ${T('verified')}</td></tr>`).join('') || `<tr><td colspan=4 class="muted">${T('No workers yet.')}</td></tr>`}
        </table>
      </div>
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Needs attention')}</div>
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
      <div class="sec-h" style="margin-top:0">${T('Company profile')} <span class="muted sm">${T('shown to candidates on your jobs')}</span></div>
      ${saved?'<div class="ok-card">Saved.</div>':''}
      <form method="post" action="/console/company">
        <label>Company name <input name="company" maxlength="80" value="${esc(user.company||'')}" placeholder="e.g. Sun Valley Mechanical"></label>
        <div class="row2">
          <label>City <input name="company_city" maxlength="60" value="${esc(user.company_city||'')}" placeholder="Phoenix, AZ"></label>
          <label>Size <select name="company_size">${sizeOpts}</select></label>
        </div>
        <label>Website <input name="company_website" maxlength="200" value="${esc(user.company_website||'')}" placeholder="https://…"></label>
        <label>About the company <textarea name="company_about" rows="4" maxlength="800" placeholder="What you build, who you hire, why crews stay. Candidates read this before applying.">${esc(user.company_about||'')}</textarea></label>
        <button class="btn">${T('Save company profile')}</button>
      </form>
    </div>
  </section>`;
}

function empJobs({ jobs }) {
  return `<section class="wrap">
    <div class="page-h"><h2>${T('Job Postings')}</h2><a class="btn-sm right" href="/console/jobs/new">${T('+ Post a job')}</a></div>
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
    <h2>${T('Post a job')}</h2><p class="muted">${T("It's matched against the verified talent pool instantly.")}</p>
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
    ${alerted>0?`<div class="ok-card">${icon('bell','xic')} ${alerted} matching worker${alerted===1?'':'s'} with alerts on ${alerted===1?'was':'were'} notified about this job.</div>`:''}
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
    <div class="page-h"><h2>${T('Talent Search')}</h2><p class="muted">${rows.length} ${T('verified candidates')}</p>
      <a class="btn-sm right ghost" href="/console/shortlist">★ Shortlist</a></div>
    <form class="filters" method="get" action="/console/search">
      <select name="trade" onchange="this.form.submit()">${tradeOpts}</select>
      <label class="chk"><input type="checkbox" name="verified" value="1" ${filters.verified?'checked':''} onchange="this.form.submit()"> ${T('Verified only')}</label>
      <label class="chk"><input type="checkbox" name="ready" value="1" ${filters.ready?'checked':''} onchange="this.form.submit()"> ${T('Readiness ≥ 85')}</label>
      <label class="chk"><input type="checkbox" name="avail" value="1" ${filters.avail?'checked':''} onchange="this.form.submit()"> ${icon('dot')} ${T('Available now')}</label>
      <label class="chk"><input type="checkbox" name="today" value="1" ${filters.today?'checked':''} onchange="this.form.submit()"> ${icon('bolt')} ${T('Work today')}</label>
      <label class="chk"><input type="checkbox" name="relocate" value="1" ${filters.relocate?'checked':''} onchange="this.form.submit()"> ${icon('send')} ${T('Open to relocate')}</label>
      <label class="chk"><input type="checkbox" name="tools" value="1" ${filters.tools?'checked':''} onchange="this.form.submit()"> ${icon('toolbox')} ${T('Own tools')}</label>
      <label class="chk"><input type="checkbox" name="transport" value="1" ${filters.transport?'checked':''} onchange="this.form.submit()"> ${icon('truck')} ${T('Own transport')}</label>
      <label class="chk"><input type="checkbox" name="bilingual" value="1" ${filters.bilingual?'checked':''} onchange="this.form.submit()"> ${icon('globe')} ${T('Bilingual')}</label>
    </form>
    <div class="card" style="padding:0">
      <table class="tbl wide"><tr><th>Candidate</th><th>Trade</th><th>Exp</th><th>Credentials</th><th>Readiness</th><th>Pay floor</th></tr>
      ${rows.map(w=>`<tr><td><a class="cand-link" href="/console/candidates/${w.id}"><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</a>${w.available?`<span class="avail-dot" title="Available for work">${icon('dot')}</span>`:''}${w.work_today?`<span class="today-chip" title="Can work today">${icon('bolt')}</span>`:''}${w.relocate?`<span class="today-chip" title="Open to relocate">${icon('send')}</span>`:''}</td>
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
      ${profile.available?`<div class="avail-badge">${icon('dot','xic')} ${T('Available for work')}</div>`:`<div class="avail-badge off">${T('Not currently available')}</div>`}${profile.work_today?`<div class="avail-badge today">${icon('bolt','xic')} ${T('Can work today')}</div>`:''}${profile.relocate?`<div class="avail-badge relo">${icon('send','xic')} ${T('Open to relocate')}</div>`:''}
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
    <div class="page-h"><h2>${T('Shortlist')}</h2><p class="muted">${rows.length} ${rows.length===1?T('saved candidate'):T('saved candidates')}</p>
      <a class="btn-sm right" href="/console/search">${T('Talent Search')}</a></div>
    ${rows.length ? `<div class="card" style="padding:0"><table class="tbl wide"><tr><th>Candidate</th><th>Trade</th><th>Exp</th><th>Readiness</th><th>Pay floor</th></tr>
      ${rows.map(w=>`<tr><td><a class="cand-link" href="/console/candidates/${w.id}"><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</a>${w.available?`<span class="avail-dot" title="Available for work">${icon('dot')}</span>`:''}${w.work_today?`<span class="today-chip" title="Can work today">${icon('bolt')}</span>`:''}${w.relocate?`<span class="today-chip" title="Open to relocate">${icon('send')}</span>`:''}</td>
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

module.exports = { setLang, setEs, drainEsMisses, layout, landing, authForm, phoneStart, phoneVerify, workerOnboard, workerHome, workerJobs,
  jobDetail, workerProfile, workerApplications, publicPortfolio, empOverview, empJobs, empJobForm, empPipeline, empSearch, empCandidate, empShortlist, inbox, ogImage, STAGES, JOB_TYPES, empCompany, workerTraining, pulsePage };
