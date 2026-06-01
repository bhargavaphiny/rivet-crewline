'use strict';
/*
 * Rivet x Crewline - server-side HTML views.
 * Plain template-literal rendering. No template engine, no client framework.
 */
const { TRADES, CRED_KINDS, TRAINING, CATEGORIES } = require('./matching');
const US_STATES = require('./us-geo');

// ---- inline SVG icon set (consistent line style; no emoji) ----
const ICONS = {
  bolt:    { f:1, p:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' },
  spark:   { f:1, p:'<path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4z"/><path d="M18 14l.8 2.4L21 17l-2.2.6L18 20l-.8-2.4L15 17l2.2-.6z"/>' },
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
  irrigation_tech:'droplet',packing_shed:'box',ranch_hand:'leaf',nursery_worker:'leaf',
  prep_cook:'utensils',busser:'utensils',host:'utensils',barback:'utensils',
  handyman:'wrench',junk_removal:'truck',pressure_wash:'spray',pool_service:'droplet',gig_courier:'truck',event_setup:'box',
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
    nav_overview:'Overview', nav_talent:'Talent', nav_jobs:'Jobs', nav_analytics:'Analytics', nav_agents:'Agents',
    hero_tag:'The blue-collar hiring platform · U.S.',
    hero_h1a:"America can't ", hero_build:'build', hero_h1b:' what it can\'t ', hero_staff:'staff.',
    hero_lead:'Rivet prepares skilled-trade workers to get hired and certified. Crewline gives employers verified, job-ready crews — fast.',
    hero_map_title:'Live demand across the U.S.',
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
    nav_overview:'Resumen', nav_talent:'Talento', nav_jobs:'Empleos', nav_analytics:'Analíticas', nav_agents:'Agentes',
    hero_tag:'La plataforma de empleo para oficios · EE. UU.',
    hero_h1a:'Estados Unidos no puede ', hero_build:'construir', hero_h1b:' lo que no puede ', hero_staff:'dotar de personal.',
    hero_lead:'Rivet prepara a trabajadores de oficios para ser contratados y certificados. Crewline da a las empresas cuadrillas verificadas y listas para trabajar — rápido.',
    hero_map_title:'Demanda en vivo en EE. UU.',
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
// Hand-translated bounded sets (trades, job types, shifts) — perfect + instant, no API key needed.
const BUILTIN_ES = {
  'Electrician':'Electricista','HVAC Technician':'Técnico HVAC','Plumber':'Plomero','Pipefitter':'Tubero (pipefitter)','Welder':'Soldador',
  'Sheet Metal Worker':'Hojalatero','Carpenter':'Carpintero','Framer':'Encuadrador','Drywall / Finisher':'Instalador de tablaroca','Painter':'Pintor',
  'Roofer':'Techador','Mason / Bricklayer':'Albañil','Concrete Finisher':'Acabador de concreto','Flooring Installer':'Instalador de pisos','Tile Setter':'Azulejero',
  'Glazier':'Vidriero','Insulation Installer':'Instalador de aislamiento','Ironworker':'Herrero estructural','Millwright':'Mecánico industrial','Boilermaker':'Calderero',
  'Controls Technician':'Técnico de controles','Solar Installer':'Instalador solar','Low-Voltage / Telecom':'Bajo voltaje / Telecom','Fire Sprinkler Fitter':'Instalador de rociadores',
  'Elevator Technician':'Técnico de elevadores','Heavy Equipment Operator':'Operador de maquinaria pesada','Crane Operator':'Operador de grúa','CDL Driver':'Conductor CDL',
  'Diesel Mechanic':'Mecánico diésel','Automotive Technician':'Técnico automotriz','Machinist / CNC':'Maquinista / CNC','Landscaper / Groundskeeper':'Jardinero','Locksmith':'Cerrajero',
  'Facilities Maintenance':'Mantenimiento de instalaciones','CNA / Nursing Assistant':'Asistente de enfermería (CNA)','Caregiver / Home Health Aide':'Cuidador / Asistente en casa',
  'Medical Assistant':'Asistente médico','Phlebotomist':'Flebotomista','EMT / Paramedic':'Paramédico / EMT','Farmworker / Ag Laborer':'Trabajador agrícola','Fruit / Crop Picker':'Recolector de fruta',
  'Cook / Line Cook':'Cocinero','Server / Waiter':'Mesero / Camarero','Dishwasher':'Lavaplatos','Bartender':'Cantinero','Warehouse Associate':'Almacenista','Delivery Driver':'Repartidor',
  'Mover / Furniture':'Mudancero','Janitor / Custodian':'Conserje','Housekeeper':'Ama de llaves','Security Guard':'Guardia de seguridad','Pest Control Technician':'Técnico de control de plagas',
  'Appliance Repair Tech':'Técnico de electrodomésticos','Irrigation Technician':'Técnico de riego','Packing / Sorting':'Empaque / Clasificación','Ranch Hand':'Peón de rancho',
  'Nursery Worker':'Trabajador de vivero','Prep Cook':'Cocinero de preparación','Busser':'Garrotero','Host / Hostess':'Anfitrión','Barback':'Ayudante de bar','Handyman':'Manitas / Reparaciones',
  'Junk Removal':'Retiro de escombros','Pressure Washing':'Lavado a presión','Pool Service Tech':'Técnico de piscinas','Courier / Gig Delivery':'Mensajero / Repartidor','Event Setup Crew':'Montaje de eventos',
  'Full-time':'Tiempo completo','Part-time':'Medio tiempo','Contract':'Contrato','Temp':'Temporal','Apprenticeship':'Aprendizaje','Outcome-based':'Por resultados',
  'Day':'Día','Night':'Noche','Any':'Cualquiera','mi away':'mi de distancia','Apply':'Aplicar','View':'Ver',
  // first-login welcome banners + key dashboard terms (instant, correct)
  'Welcome to Rivet':'Bienvenido a Rivet','Welcome to Crewline':'Bienvenido a Crewline',
  'Set up my Work Card':'Configura mi tarjeta de trabajo','Post your first job':'Publica tu primer trabajo',
  'Open roles hiring now':'Empleos disponibles ahora','There are':'Hay','Hiring funnel':'Embudo de contratación','candidates':'candidatos',
  "Here's what's hiring across the country right now. Add your trade to get matched to the best-fit jobs near you — it takes a minute.":'Esto es lo que se está contratando en todo el país ahora. Agrega tu oficio para encontrar los empleos que mejor te quedan cerca de ti — toma un minuto.',
  'verified blue-collar workers ready across the U.S. Post your first job and we’ll match you instantly — see who’s available on the map below.':'trabajadores de oficios verificados listos en todo EE. UU. Publica tu primer trabajo y te emparejamos al instante — mira quién está disponible en el mapa.',
  // recruiter analytics (instant, correct)
  'Analytics':'Analíticas','hiring performance':'rendimiento de contratación','Total applicants':'Total de postulantes',
  'In pipeline':'En proceso','Hired':'Contratados','Offer→hire rate':'Tasa de oferta→contrato','Avg match score':'Puntaje promedio',
  'Applications over time':'Postulaciones a lo largo del tiempo','last 8 weeks':'últimas 8 semanas','Funnel conversion':'Conversión del embudo',
  'reached · step %':'alcanzado · % por paso','Top trades by applicants':'Oficios con más postulantes','Jobs by demand':'Empleos por demanda',
  'Job':'Empleo','Applicants':'Postulantes','No applicants yet.':'Aún no hay postulantes.','No jobs posted yet.':'Aún no has publicado empleos.',
  'Post a job':'Publicar un empleo','Post a job →':'Publicar un empleo →',
  'Analytics light up once candidates start flowing into your jobs. Post a role and source from Talent Search to get going.':'Las analíticas se activan cuando los candidatos empiezan a llegar a tus empleos. Publica un puesto y busca en Talento para comenzar.',
  // phone verify (instant, correct)
  'Enter your code':'Ingresa tu código','We sent a 6-digit code to':'Enviamos un código de 6 dígitos a','6-digit code':'Código de 6 dígitos',
  'Verify & continue':'Verificar y continuar','Use a different number':'Usar otro número',
  'Demo mode (no SMS provider connected yet): your code is':'Modo demo (aún sin proveedor de SMS): tu código es',
  // reviews & interviews (instant, correct)
  'No reviews yet':'Aún sin reseñas','No reviews yet.':'Aún sin reseñas.','review':'reseña','reviews':'reseñas','Rating':'Calificación',
  'Share how it went…':'Cuenta cómo te fue…','Reviews':'Reseñas','You rated this hire':'Calificaste a este contratado',
  'You hired this worker — leave a review:':'Contrataste a este trabajador — deja una reseña:','Submit review':'Enviar reseña',
  'How was their work?':'¿Cómo fue su trabajo?','What workers say':'Lo que dicen los trabajadores',
  'You reviewed this employer':'Reseñaste a este empleador','You worked here — rate the employer:':'Trabajaste aquí — califica al empleador:',
  'How was working here?':'¿Cómo fue trabajar aquí?','About the employer':'Sobre el empleador',
  'Interview confirmed':'Entrevista confirmada','Interview proposed':'Entrevista propuesta','waiting on candidate':'esperando al candidato',
  'Propose interview times':'Proponer horarios de entrevista','Interview confirmed for':'Entrevista confirmada para',
  'Interview invite':'Invitación a entrevista','Pick a time that works:':'Elige un horario que te sirva:','Interviews':'Entrevistas',
  // agents (instant, correct)
  'Career Coach':'Asesor de carrera','See my next move':'Ver mi próximo paso','How to earn it ↗':'Cómo obtenerlo ↗',
  'Apply Agent':'Agente de postulación','Let Rivet auto-apply you to the best-fit jobs near you — verified Work Card attached.':'Deja que Rivet te postule automáticamente a los empleos que mejor te quedan cerca de ti — con tu tarjeta de trabajo verificada.',
  'Apply for me':'Postular por mí','Find work':'Buscar trabajo','Home':'Inicio','job':'empleo','jobs':'empleos',
  'Based on your trades and what employers are hiring for near you right now.':'Según tus oficios y lo que los empleadores están contratando cerca de ti ahora.',
  'Your highest-impact next credential':'Tu credencial de mayor impacto','jobs unlocked':'empleos desbloqueados','per hour':'por hora',
  'Add your trade and ZIP to your Work Card and your coach will map the fastest way to more jobs.':'Agrega tu oficio y código postal a tu tarjeta de trabajo y tu asesor trazará el camino más rápido a más empleos.',
  'Other credentials worth earning':'Otras credenciales que vale la pena obtener',
  'Done — I applied you to':'Listo — te postulé a','Applications submitted':'Postulaciones enviadas','View all applications':'Ver todas las postulaciones',
  'You’re already applied to your best matches — nothing new to do.':'Ya estás postulado a tus mejores coincidencias — nada nuevo por hacer.',
  'No matching open jobs to apply to yet. Add your trade and ZIP to your Work Card.':'Aún no hay empleos abiertos que coincidan. Agrega tu oficio y código postal a tu tarjeta de trabajo.',
  'Onboarding Agent':'Agente de registro','I’ll build your Work Card by chat — answer in your own words, in English or Spanish.':'Construiré tu tarjeta de trabajo por chat — responde con tus palabras, en inglés o español.',
  'All set — your Work Card is ready.':'¡Listo — tu tarjeta de trabajo está lista!','Review it →':'Revísala →','Type your answer…':'Escribe tu respuesta…','Send':'Enviar','Go to my Home':'Ir a mi inicio',
  'Welcome! What trade or trades do you work in?':'¡Bienvenido! ¿En qué oficio u oficios trabajas?','e.g. electrician and some solar':'ej. electricista y algo de solar',
  'Nice. How many years have you been doing this work?':'Bien. ¿Cuántos años llevas haciendo este trabajo?','e.g. 8':'ej. 8',
  'What city are you based in?':'¿En qué ciudad estás?','e.g. Phoenix':'ej. Phoenix',
  'What’s your ZIP code? (so we can show jobs near you)':'¿Cuál es tu código postal? (para mostrarte empleos cercanos)','e.g. 85004':'ej. 85004',
  'What’s the lowest hourly pay you’d take? Just a number.':'¿Cuál es el pago por hora más bajo que aceptarías? Solo un número.','e.g. 32':'ej. 32',
  'Last one — what shifts can you work: day, night, or any?':'Última — ¿qué turnos puedes trabajar: día, noche o cualquiera?','day / night / any':'día / noche / cualquiera',
  'Sourcing Agent':'Agente de búsqueda','Sourcing Agent added':'El agente de búsqueda agregó','to your pipeline.':'a tu proceso.',
  'Scan all verified workers and auto-add the strongest matches to this pipeline.':'Escanea a todos los trabajadores verificados y agrega automáticamente las mejores coincidencias a este proceso.',
  'Auto-source candidates':'Buscar candidatos automáticamente','candidate':'candidato','AI screen':'Filtro con IA','offline':'sin conexión','Auto-schedule':'Agendar automático',
  'Build my card by chat':'Crea mi tarjeta por chat',
  'add ZIP for distance':'agrega tu código postal para ver distancia',
  'Add your ZIP to your Work Card to see how far each job is.':'Agrega tu código postal a tu tarjeta de trabajo para ver a qué distancia está cada empleo.',
  // agents hub
  'Agents':'Agentes','AI that works for you — grounded in real data, explainable, free.':'IA que trabaja para ti — basada en datos reales, explicable y gratis.',
  'Finds the one credential that unlocks the most jobs and pay for you, and how to earn it.':'Encuentra la credencial que te desbloquea más empleos y mejor pago, y cómo obtenerla.',
  'Auto-applies you to the best-fit, closest open jobs — your verified Work Card attached.':'Te postula automáticamente a los empleos más afines y cercanos — con tu tarjeta de trabajo verificada.',
  'Builds your Work Card by chat — just answer in your own words, English or Spanish.':'Construye tu tarjeta de trabajo por chat — responde con tus palabras, en inglés o español.',
  'Open Coach':'Abrir asesor','Start chat':'Iniciar chat',
  'Scans every verified worker and auto-adds the strongest matches to a job’s pipeline.':'Escanea a cada trabajador verificado y agrega las mejores coincidencias al proceso de un empleo.',
  'Generates tailored pre-qualifying questions and a fit summary for any candidate.':'Genera preguntas de pre-calificación a la medida y un resumen de idoneidad para cualquier candidato.',
  'Proposes interview times to a shortlisted candidate in one click.':'Propone horarios de entrevista a un candidato preseleccionado con un clic.',
  'Pick a job →':'Elige un empleo →','Open a candidate →':'Abre un candidato →',
  // credential verification
  'Verified':'Verificado','Expiring':'Por vencer','In review':'En revisión','Self-reported':'Auto-reportado','proof ↗':'prueba ↗',
  'Link to proof (card photo, license #, URL)':'Enlace de prueba (foto de la tarjeta, n.º de licencia, URL)',
  'Request verification':'Solicitar verificación','Update':'Actualizar',
  // map legend
  'Tap a circle to see openings there':'Toca un círculo para ver las vacantes ahí','bigger circle = more':'círculo más grande = más',
  'hiring demand':'demanda de contratación','Tap any circle to see them':'Toca cualquier círculo para verlos',
  // work authorization & sponsorship
  'Work authorization':'Autorización de trabajo','Sponsors H-2A visa':'Patrocina visa H-2A','Sponsors H-2B visa':'Patrocina visa H-2B',
  'Informational only — not legal advice':'Solo informativo — no es asesoría legal','matches you':'coincide contigo',
  'If you sponsor H-2A/H-2B workers, candidates seeking that sponsorship will see it. Informational only — not legal advice.':'Si patrocinas trabajadores H-2A/H-2B, los candidatos que buscan ese patrocinio lo verán. Solo informativo — no es asesoría legal.',
  'Requires U.S. work authorization':'Requiere autorización de trabajo en EE. UU.','Offers H-2A (agricultural) visa sponsorship':'Ofrece patrocinio de visa H-2A (agrícola)','Offers H-2B (seasonal) visa sponsorship':'Ofrece patrocinio de visa H-2B (temporal)',
  'Prefer not to say':'Prefiero no decir','Authorized to work in the U.S.':'Autorizado para trabajar en EE. UU.','Seeking H-2A (agricultural) sponsorship':'Busco patrocinio H-2A (agrícola)','Seeking H-2B (seasonal) sponsorship':'Busco patrocinio H-2B (temporal)',
  'This employer sponsors H-2A (agricultural) visas.':'Este empleador patrocina visas H-2A (agrícolas).','This employer sponsors H-2B (seasonal) visas.':'Este empleador patrocina visas H-2B (temporales).',
  'Matches what you’re seeking.':'Coincide con lo que buscas.','Requires existing U.S. work authorization (Form I-9).':'Requiere autorización de trabajo vigente en EE. UU. (Formulario I-9).',
  'Work in the U.S. — your rights & options ↗':'Trabajar en EE. UU. — tus derechos y opciones ↗','Work in the U.S. — full guide':'Trabajar en EE. UU. — guía completa',
  'optional · private':'opcional · privado','Tells you when an employer sponsors the visa you need. We never use this to screen you out, and it’s not shown publicly.':'Te avisa cuando un empleador patrocina la visa que necesitas. Nunca lo usamos para descartarte y no se muestra públicamente.',
  'Work in the U.S.':'Trabajar en EE. UU.','Resources':'Recursos',
  'Plain-language pointers to official government sources — so you can find the real rules yourself.':'Guía sencilla con fuentes oficiales del gobierno — para que encuentres las reglas reales por ti mismo.',
  'This is general information, not legal advice. Rules change and every situation is different — confirm with the official sources below or a qualified immigration attorney before acting.':'Esto es información general, no asesoría legal. Las reglas cambian y cada caso es distinto — confirma con las fuentes oficiales abajo o con un abogado de inmigración calificado antes de actuar.',
  'Am I authorized to work?':'¿Estoy autorizado para trabajar?',
  'Everyone hired in the U.S. completes Form I-9 and shows they’re authorized to work. That can be citizenship, a green card, asylee/refugee status, or an Employment Authorization Document (EAD).':'Todos los contratados en EE. UU. completan el Formulario I-9 y demuestran que están autorizados para trabajar. Eso puede ser ciudadanía, residencia (green card), estatus de asilo/refugiado, o un Documento de Autorización de Empleo (EAD).',
  'Seasonal & agricultural visa sponsorship (H-2A / H-2B)':'Patrocinio de visa temporal y agrícola (H-2A / H-2B)',
  'Some employers sponsor temporary workers: H-2A for agricultural/seasonal farm work, and H-2B for seasonal non-farm work like landscaping, hospitality and events. On Rivet, jobs that sponsor show a badge.':'Algunos empleadores patrocinan trabajadores temporales: H-2A para trabajo agrícola/de temporada, y H-2B para trabajo temporal no agrícola como jardinería, hotelería y eventos. En Rivet, los empleos que patrocinan muestran una insignia.',
  'Students (F-1: CPT / OPT)':'Estudiantes (F-1: CPT / OPT)',
  'International students on an F-1 visa may be able to work through CPT or OPT. Check the official rules and talk to your school’s international student office.':'Los estudiantes internacionales con visa F-1 pueden trabajar mediante CPT u OPT. Revisa las reglas oficiales y habla con la oficina de estudiantes internacionales de tu escuela.',
  'Your rights at work — no matter your status':'Tus derechos en el trabajo — sin importar tu estatus',
  'You are owed at least the minimum wage and a safe workplace, and it is illegal for most employers to discriminate against you based on citizenship or national origin. These protections apply regardless of immigration status.':'Te corresponde al menos el salario mínimo y un lugar de trabajo seguro, y para la mayoría de los empleadores es ilegal discriminarte por ciudadanía u origen nacional. Estas protecciones aplican sin importar tu estatus migratorio.',
  'Know a worker who needs this? Share it — it’s public and free.':'¿Conoces a un trabajador que necesite esto? Compártelo — es público y gratis.',
  // editable Work Card location/pay
  'Trades, location & details':'Oficios, ubicación y detalles','ZIP code':'Código postal','Years of experience':'Años de experiencia',
  'Lowest pay you’d take ($/hr)':'Pago mínimo que aceptarías ($/hr)',
  'Your ZIP powers distance to each job and the map — add it to see how far jobs are.':'Tu código postal calcula la distancia a cada empleo y el mapa — agrégalo para ver qué tan lejos están.',
  // job detail + talent search (i18n pass)
  'All matches':'Todas las coincidencias','match':'coincidencia','The work':'El trabajo','Why you match':'Por qué coincides',
  'Trade fit':'Afinidad de oficio','Pay':'Pago','Location':'Ubicación','Credentials':'Credenciales','Missing':'Falta',
  'see how to earn it':'ver cómo obtenerla','to boost this match.':'para mejorar esta coincidencia.',
  '✓ Applied — the employer can see your verified Work Card.':'✓ Postulado — el empleador puede ver tu tarjeta de trabajo verificada.',
  'Apply with verified Work Card':'Postular con tarjeta verificada','★ Saved — remove':'★ Guardado — quitar','☆ Save this job':'☆ Guardar este empleo',
  'employees':'empleados','Candidate':'Candidato','Trade':'Oficio','Exp':'Exp.','Readiness':'Preparación','Pay floor':'Pago mínimo','yr':'años',
  'No matches for these filters.':'No hay coincidencias para estos filtros.',
  // map hero
  'across':'en','metro':'metro','metros':'metros','warmer & bigger = more hiring':'más grande = más contratación',
  'You':'Tú','commute':'traslado','within':'a menos de','mi of you':'mi de ti','Zoom to me':'Acercar a mí',
  // X-factors: show-up, pay, crew, renewals
  'Shows up':'Asiste','start':'inicio','starts':'inicios','Confirmed start outcomes — showed up vs no-showed':'Resultados confirmados — se presentó vs. no se presentó',
  'Pays on time':'Paga a tiempo','Worker-confirmed pay outcomes':'Pagos confirmados por trabajadores',
  'My crew':'Mi cuadrilla','people you’d vouch for & bring to a job':'gente que recomiendas y llevarías a un trabajo',
  'Add teammates you’ve worked with — employers hiring crews will see you bring a team.':'Agrega compañeros con los que has trabajado — los empleadores que contratan cuadrillas verán que llevas equipo.',
  'No crew listed yet.':'Aún no hay cuadrilla.','How you know them (optional)':'Cómo los conoces (opcional)','Name':'Nombre','Add':'Agregar',
  'Renewals due':'Renovaciones pendientes','keep these current to stay hireable':'manténlas vigentes para seguir contratable',
  'expired':'vencida','expires today':'vence hoy','expires in':'vence en','days':'días','Renew ↗':'Renovar ↗',
  'Did this employer pay you as promised?':'¿Este empleador te pagó como prometió?','Paid on time':'Pagó a tiempo','Paid late':'Pagó tarde','Paid short':'Pagó de menos','Not paid':'No pagó','Pay reported':'Pago reportado',
  '✓ Showed up':'✓ Se presentó','✗ No-showed':'✗ No se presentó','Cancelled w/ notice':'Canceló con aviso','Did they show?':'¿Se presentó?',
  'Showed up':'Se presentó','No-showed':'No se presentó','Cancelled with notice':'Canceló con aviso',
  'Open to crews':'Abierto a cuadrillas','Crews ok':'Cuadrillas ok','Open to crews — a worker can bring vetted teammates':'Abierto a cuadrillas — el trabajador puede llevar compañeros verificados',
  // homeowner posting + price quotes
  'Posting as':'Publicando como','A company / contractor':'Una empresa / contratista','A homeowner or small business (one-off job)':'Un dueño de casa o pequeño negocio (trabajo puntual)',
  'e.g. Fix a leaking faucet':'ej. Arreglar una llave que gotea','Let workers send me a price quote (instead of a fixed pay rate)':'Permitir que los trabajadores me envíen una cotización (en vez de un pago fijo)',
  'Accepting quotes':'Acepta cotizaciones','Posted by a homeowner / small business':'Publicado por un dueño de casa / pequeño negocio','Name your price':'Pon tu precio','Homeowner':'Dueño de casa',
  'Quote sent':'Cotización enviada','per job':'por trabajo','per hour':'por hora','per day':'por día','accepted! 🎉':'¡aceptada! 🎉','not selected':'no seleccionada','waiting on the poster':'esperando al solicitante',
  'Your price':'Tu precio','for the job':'por el trabajo','Add a note (when you can start, what’s included)':'Agrega una nota (cuándo puedes empezar, qué incluye)','Send my price quote':'Enviar mi cotización',
  'Price quotes':'Cotizaciones','quote':'cotización','quotes':'cotizaciones','No quotes yet — they’ll appear here as workers bid.':'Aún no hay cotizaciones — aparecerán aquí cuando los trabajadores oferten.',
  'Accept quote':'Aceptar cotización','Accepted':'Aceptada','Not selected':'No seleccionada','Photos of the work':'Fotos del trabajo','candidates see these on the job':'los candidatos las ven en el empleo','your quote':'tu cotización',
  // job duration
  'Duration':'Duración','Not specified':'Sin especificar','1 day':'1 día','This weekend':'Este fin de semana','1–2 weeks':'1–2 semanas','1 month':'1 mes','3 months':'3 meses','6+ months':'6+ meses','Ongoing':'Continuo','2 weeks':'2 semanas',
  // audit pass: clarity
  'Received':'Recibida','Boost your score':'Sube tu puntaje','Set your pay floor':'Define tu pago mínimo','Verify one more credential':'Verifica una credencial más','Add your work history to show experience':'Agrega tu historial laboral para mostrar experiencia',
  'First, add your company so candidates trust your jobs. Then post your first role — takes a minute.':'Primero, agrega tu empresa para que los candidatos confíen en tus empleos. Luego publica tu primer puesto — toma un minuto.',
  // inclusion: fair-chance + veteran
  'Fair-chance friendly — we consider applicants with a record':'Apto para segunda oportunidad — consideramos a personas con antecedentes',
  'Veteran-friendly — military experience valued':'Apto para veteranos — se valora la experiencia militar',
  'Fair-chance':'Segunda oportunidad','Veteran-friendly':'Apto para veteranos','Veteran':'Veterano','Veteran ✓':'Veterano ✓','I’m a veteran':'Soy veterano',
  // get-there / transport
  'Transport provided — we get workers to the site':'Transporte incluido — llevamos a los trabajadores al sitio','Transport provided':'Transporte incluido','Ride provided':'Con transporte',
  'Farthest you’ll travel (miles, 0 = no limit)':'Distancia máxima que viajarías (millas, 0 = sin límite)','past your commute':'fuera de tu rango',
  // payscale fit
  'Worker sets the price':'El trabajador pone el precio','Asks':'Pide','within your range':'dentro de tu rango','Meets your':'Cumple tu','floor':'mínimo','over budget':'sobre tu presupuesto','below your':'por debajo de tu',
  // shareable work card
  'Share my Work Card':'Compartir mi tarjeta','Preview ↗':'Vista previa ↗','Link copied ✓':'Enlace copiado ✓','Copy link':'Copiar enlace','Portfolio':'Portafolio','Public page ↗':'Página pública ↗',
  'One link with your trades, credentials, reviews & portfolio — text it to any employer.':'Un enlace con tus oficios, credenciales, reseñas y portafolio — envíalo por mensaje a cualquier empleador.',
  // rehire loop
  'rehired':'recontratados','Workers this employer hired more than once':'Trabajadores que este empleador contrató más de una vez','Invite back':'Invitar de vuelta',
  '★ Saved':'★ Guardado','☆ Save to shortlist':'☆ Guardar en lista',
  // safety pulse
  'Site safety':'Seguridad del sitio','Site safety?':'¿Seguridad del sitio?','Safety':'Seguridad','Worker-rated site safety':'Seguridad del sitio calificada por trabajadores',
  // pay cadence
  'Pay cadence':'Frecuencia de pago','Daily pay':'Pago diario','Weekly pay':'Pago semanal','Biweekly pay':'Pago quincenal','Monthly pay':'Pago mensual',
  // seasonality
  'In season this':'En temporada este','hiring climbs for these trades now':'la contratación sube para estos oficios ahora','is in season':'está en temporada','Demand is climbing now.':'La demanda está subiendo ahora.',
  'I take subcontract work':'Acepto trabajo por subcontrato','Subcontract-ready ✓':'Listo para subcontrato ✓','Owner-operator · subcontracts':'Dueño-operador · subcontrata','Open to subcontractors / owner-operators (1099)':'Abierto a subcontratistas / dueños-operadores (1099)','1099 ok':'1099 ok','Subcontractors welcome':'Subcontratistas bienvenidos',
  'AC + heating season':'temporada de aire y calefacción','dry-weather roofing':'techado en clima seco','pour season':'temporada de concreto','growing season':'temporada de jardinería','install season':'temporada de instalación',
  'harvest':'cosecha','harvest packing':'empaque de cosecha','retail peak':'pico minorista','event & holiday season':'temporada de eventos y fiestas','event season':'temporada de eventos',
  'winter building loads':'cargas de invierno en edificios','build season':'temporada de construcción','exterior season':'temporada de exteriores','frozen-pipe season':'temporada de tuberías congeladas','winter demand':'demanda de invierno',
};
function T(s){
  if(LANG !== 'es' || !s) return s;
  if(ESMAP && ESMAP.has(s)) return ESMAP.get(s);
  if(BUILTIN_ES[s]) return BUILTIN_ES[s];
  _esMiss.add(s);
  return s;
}
// translate a trade key's label
function tl(k){ return T(TRADES[k] || k); }

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
    nav = `${L('/app',t('nav_home'),'home')}${L('/app/jobs',t('nav_find_work'),'jobs')}${L('/app/agents',t('nav_agents'),'agents')}${L('/app/profile',t('nav_work_card'),'profile')}${L('/app/applications',t('nav_applications'),'apps')}${L('/app/training',t('nav_training'),'training')}${L('/pulse',t('nav_pulse'),'pulse')}${msg}
           ${modeTg('work')}
           <span class="who">${initials(user.name)}</span>
           <a class="nav-link" href="/logout">${t('nav_logout')}</a>${langTg}`;
  } else {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    const msg = `<a class="nav-link ${active==='msgs'?'on':''}" href="/console/messages">${t('nav_messages')}${user.unread?`<span class="ndot">${user.unread}</span>`:''}</a>`;
    nav = `${L('/console',t('nav_overview'),'ov')}${L('/console/search',t('nav_talent'),'search')}${L('/console/jobs',t('nav_jobs'),'jobs')}${L('/console/agents',t('nav_agents'),'agents')}${L('/console/analytics',t('nav_analytics'),'analytics')}${L('/pulse',t('nav_pulse'),'pulse')}${msg}
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
  <link rel="stylesheet" href="/styles.css?v=70">
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
      <div class="foot-col"><h5>${T('Resources')}</h5><a href="/work-authorization">${T('Work in the U.S.')}</a><a href="/pulse">${t('nav_pulse')}</a></div>
    </div>
    <div class="wrap foot-base">© 2026 Rivet × Crewline · Phoenix, AZ · <a href="/lang/${LANG==='es'?'en':'es'}" style="color:#9fb0bb">${LANG==='es'?'English':'Español'}</a></div>
  </footer>`}
  </body></html>`;
}

// ---------- marketing landing ----------
function landing(demandGeo = []) {
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
  ${demandGeo && demandGeo.length ? `<section class="wrap" style="margin-top:24px">${usMap(demandGeo, {title:t('hero_map_title'), noun:T('job'), cta:T('View'), emptyMsg:''})}</section>` : ''}
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
    <h2>${T('Enter your code')}</h2>
    <p class="muted">${T('We sent a 6-digit code to')} <b>${esc(phone)}</b>.</p>
    ${demoCode?`<div class="ok-card">${T('Demo mode (no SMS provider connected yet): your code is')} <b style="font-size:18px;letter-spacing:2px">${esc(demoCode)}</b></div>`:''}
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="/phone/verify">
      <input type="hidden" name="phone" value="${esc(phone)}">
      <label>${T('6-digit code')} <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="123456" required></label>
      <button class="btn full" type="submit">${T('Verify & continue')}</button>
    </form>
    <p class="muted"><a href="/phone">${T('Use a different number')}</a></p>
  </div></section>`;
}

// ---------- worker onboarding ----------
function tradeCheckboxes(selected = []) {
  const sel = new Set(selected);
  const chip = k => `<label class="tradechk"><input type="checkbox" name="trades" value="${k}" ${sel.has(k)?'checked':''}><span>${tradeEmoji(k)} ${TRADES[k]||k}</span></label>`;
  const seen = new Set();
  let html = '';
  for(const [cat, keys] of Object.entries(CATEGORIES)){
    const ks = keys.filter(k=>TRADES[k]); ks.forEach(k=>seen.add(k));
    if(!ks.length) continue;
    html += `<div class="tradecat">${T(cat)}</div><div class="tradegrid">${ks.map(chip).join('')}</div>`;
  }
  const rest = Object.keys(TRADES).filter(k=>!seen.has(k));
  if(rest.length) html += `<div class="tradecat">${T('Other')}</div><div class="tradegrid">${rest.map(chip).join('')}</div>`;
  return html;
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
        <div class="tradepick">${tradeCheckboxes([])}</div>
      </div>
      <div class="row2">
        <label>Years experience <input type="number" name="years_exp" min="0" placeholder="e.g. 8"></label>
        <label>Pay floor ($/hr) <input type="number" name="pay_floor" min="0" placeholder="e.g. 32"></label>
      </div>
      <div class="row2">
        <label>City <input name="city" placeholder="e.g. Phoenix"></label>
        <label>ZIP <input name="zip" inputmode="numeric" maxlength="5" placeholder="e.g. 85004"></label>
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
function workerHome({ user, profile, creds, matches, workCount = 0, portCount = 0, jobsGeo = null, isNew = false, coach = null, needZip = false, seasonHint = null }) {
  const top = matches.slice(0,3).map(m=>jobCard(m, isNew)).join('');
  const zipBanner = (!isNew && needZip) ? `<a class="zip-banner" href="/app/profile">${icon('pin','xic')} ${T('Add your ZIP to your Work Card to see how far each job is.')}</a>` : '';
  const expiring = creds.filter(c=>c.expires && c.expires < '2026-08').length;
  const welcome = isNew ? `<div class="card welcome">
      <div class="welcome-h">${T('Welcome to Rivet')}, ${esc((user.name||'').split(' ')[0])} 👋</div>
      <p>${T("Here's what's hiring across the country right now. Add your trade to get matched to the best-fit jobs near you — it takes a minute.")}</p>
      <div class="agent-act"><a class="btn" href="/app/onboard/chat">${icon('spark','xic')} ${T('Build my card by chat')}</a><a class="btn ghost" href="/app/profile">${T('Set up my Work Card')}</a></div>
    </div>` : '';
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
      ${xToggle('/app/veteran', profile.veteran, 'shield', T('Veteran ✓'), T('I’m a veteran'), '/app')}
      ${xToggle('/app/subcontract', profile.self_employed, 'hammer', T('Subcontract-ready ✓'), T('I take subcontract work'), '/app')}
    </div>
    ${welcome}
    ${jobsGeo && jobsGeo.points.length ? usMap(jobsGeo.points, {title:isNew?T('Where the work is'):t('home_top'), noun:T('job'), cta:T('Apply'), home:jobsGeo.home,
        legend:isNew?null:`<span class="lg"><i class="d-direct"></i> ${T('Your trades')}</span><span class="lg"><i class="d-related"></i> ${T('Related trades')}</span>`,
        emptyMsg:T('No mapped openings yet.')}) : ''}
    <div class="dash-grid">
      <div>
        ${isNew ? '' : `<div class="readiness card">
          <div class="ring">${ring(profile.readiness)}</div>
          <div>
            <div class="r-lbl">${t('home_readiness')}</div>
            <div class="r-big">${profile.readiness>=85?t('home_hireready'):profile.readiness>=70?t('home_almost'):t('home_build')}</div>
            <p>${creds.length} ${t('home_credentials')} · ${tradesOf(profile).map(t=>TRADES[t]||t).join(', ')} · ${esc(profile.city)}</p>
            ${readinessTip(profile, creds)}
          </div>
        </div>`}
        <div class="sec-h">${isNew?T('Open roles hiring now'):t('home_top')} <a href="/app/jobs">${t('home_seeall')}</a></div>
        ${zipBanner}
        ${top || `<div class="card muted">${t('home_nomatch')}</div>`}
      </div>
      <aside>
        ${seasonHint?`<div class="card season-hint">${icon('flame','xic')} <span><b>${esc(TRADES[seasonHint.trade]||seasonHint.trade)}</b> ${T('is in season')}${seasonHint.why?` — ${T(seasonHint.why)}`:''}. ${T('Demand is climbing now.')}</span></div>`:''}
        ${coach ? `<div class="card agent-card">
          <div class="agent-h">${icon('spark','xic')} ${T('Career Coach')}</div>
          <p class="agent-line">${esc(coach.line)}</p>
          <div class="agent-act"><a class="btn-sm" href="/app/coach">${T('See my next move')}</a>${coach.url?`<a class="btn-sm ghost" href="${esc(coach.url)}" target="_blank" rel="noopener">${T('How to earn it ↗')}</a>`:''}</div>
        </div>` : ''}
        ${doneN<4?`<div class="card">
          <div class="sec-h" style="margin-top:0">${t('home_boost')} <span class="muted">${doneN}/4</span></div>
          <div class="checklist">${steps.map(s=>`<a class="chk-step ${s.done?'done':''}" href="${s.href}"><span class="cb">${s.done?'✓':''}</span>${s.label}</a>`).join('')}</div>
        </div>`:''}
        <div class="card">
          <div class="sec-h" style="margin-top:0">${t('home_wallet')} <a href="/app/profile">${t('home_manage')}</a></div>
          ${creds.slice(0,4).map(c=>credRow(c)).join('') || `<p class="muted">${t('step_cred')}</p>`}
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

// One concrete next step to raise the readiness score (it's otherwise opaque).
function readinessTip(profile, creds = []){
  if((profile.readiness||0) >= 95) return '';
  const verified = creds.filter(c=>c.verified).length;
  let tip;
  if(!(profile.pay_floor>0)) tip = `<a href="/app/profile">${T('Set your pay floor')}</a> → <b>+5</b>`;
  else if(verified*8 < 30) tip = `<a href="/app/profile">${T('Verify one more credential')}</a> → <b>+8</b>`;
  else if((profile.years_exp||0)*3 < 30) tip = T('Add your work history to show experience');
  else return '';
  return `<p class="r-tip">${icon('spark','xic')} ${T('Boost your score')}: ${tip}</p>`;
}
function ring(score){
  const off = 163 - (163*score/100);
  return `<svg width="66" height="66" viewBox="0 0 66 66">
    <circle cx="33" cy="33" r="26" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="7"/>
    <circle cx="33" cy="33" r="26" fill="none" stroke="#F6A623" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="163" stroke-dashoffset="${off}" transform="rotate(-90 33 33)"/>
    <text x="33" y="38" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${score}</text></svg>`;
}

// ---------- worker agents ----------
function workerCoach({ profile, reco, line }){
  const credCard = (c, primary) => `<div class="card ${primary?'agent-card':''}">
    <div class="${primary?'agent-h':'sec-h'}" style="margin-top:0">${primary?icon('spark','xic')+' ':''}${esc(c.label)}</div>
    <div class="coach-stats">
      <div><b>+${c.jobsUnlocked}</b><span>${T('jobs unlocked')}</span></div>
      ${c.payDelta>0?`<div><b>+$${c.payDelta}</b><span>${T('per hour')}</span></div>`:''}
    </div>
    ${c.how?`<p class="muted sm">${esc(c.how)}</p>`:''}
    ${c.url?`<a class="btn-sm" href="${esc(c.url)}" target="_blank" rel="noopener">${T('How to earn it ↗')}</a>`:''}
  </div>`;
  return `<section class="wrap narrow">
    <a class="back" href="/app">← ${T('Home')}</a>
    <div class="card agent-card">
      <div class="agent-h">${icon('spark','xic')} ${T('Career Coach')}</div>
      <p class="agent-line big">${esc(line)}</p>
      <p class="muted sm">${T('Based on your trades and what employers are hiring for near you right now.')}</p>
    </div>
    ${reco && reco.topCred ? `<div class="sec-h">${T('Your highest-impact next credential')}</div>${credCard(reco.topCred, true)}` : `<div class="card muted">${T('Add your trade and ZIP to your Work Card and your coach will map the fastest way to more jobs.')} <a href="/app/profile">${T('Set up my Work Card')}</a></div>`}
    ${reco && reco.alternatives && reco.alternatives.length ? `<div class="sec-h">${T('Other credentials worth earning')}</div>${reco.alternatives.map(c=>credCard(c,false)).join('')}` : ''}
  </section>`;
}

function agentApplyResult({ applied = [], already = 0, total = 0 }){
  return `<section class="wrap narrow">
    <a class="back" href="/app/jobs">← ${T('Find work')}</a>
    <div class="card agent-card">
      <div class="agent-h">${icon('spark','xic')} ${T('Apply Agent')}</div>
      ${applied.length
        ? `<p class="agent-line big">${T('Done — I applied you to')} ${applied.length} ${applied.length===1?T('job'):T('jobs')}.</p>`
        : `<p class="agent-line big">${already?T('You’re already applied to your best matches — nothing new to do.'):T('No matching open jobs to apply to yet. Add your trade and ZIP to your Work Card.')}</p>`}
    </div>
    ${applied.length?`<div class="sec-h">${T('Applications submitted')}</div>${applied.map(a=>`<div class="card app-card">
      <div class="job-row"><div class="badge">${tradeEmoji(a.trade)}</div>
        <div class="job-main"><h4>${esc(a.title)}</h4>
          <div class="muted">${esc(a.company||'')} · ${esc(a.city)} · $${a.pay_min}–${a.pay_max}/hr${a.distance!=null?` · <b class="dist">${a.distance} ${T('mi away')}</b>`:''}</div></div>
        <span class="score-tag ${scoreClass(a.score)}">${a.score}</span></div>
    </div>`).join('')}<a class="btn" href="/app/applications">${T('View all applications')}</a>`:''}
  </section>`;
}

function onboardChat({ question = '', placeholder = '', transcript = [], done = false, step = 0 }){
  return `<section class="wrap narrow">
    <a class="back" href="/app">← ${T('Home')}</a>
    <div class="card agent-card">
      <div class="agent-h">${icon('spark','xic')} ${T('Onboarding Agent')}</div>
      <p class="muted sm">${T('I’ll build your Work Card by chat — answer in your own words, in English or Spanish.')}</p>
    </div>
    <div class="card">
      <div class="chat">
        ${transcript.map(m=>`<div class="bubble ${m.role==='you'?'mine':'theirs'}"><div class="bub-body">${esc(m.text)}</div></div>`).join('')}
        ${!done?`<div class="bubble theirs"><div class="bub-body">${esc(T(question))}</div></div>`:`<div class="bubble theirs"><div class="bub-body">${T('All set — your Work Card is ready.')} <a href="/app/profile">${T('Review it →')}</a></div></div>`}
      </div>
      ${!done?`<form method="post" action="/app/onboard/chat" class="msg-form" style="margin-top:12px">
        <input type="hidden" name="step" value="${step}">
        <input name="answer" placeholder="${esc(T(placeholder)||T('Type your answer…'))}" autocomplete="off" required maxlength="200" autofocus>
        <button class="btn-sm">${T('Send')}</button>
      </form>`:`<a class="btn" href="/app">${T('Go to my Home')}</a>`}
    </div>
  </section>`;
}

// ---------- agents hub (discoverability, both sides) ----------
function agentsHub({ mode }){
  const worker = [
    { title:T('Career Coach'), desc:T('Finds the one credential that unlocks the most jobs and pay for you, and how to earn it.'), action:`<a class="btn-sm" href="/app/coach">${T('Open Coach')}</a>` },
    { title:T('Apply Agent'), desc:T('Auto-applies you to the best-fit, closest open jobs — your verified Work Card attached.'), action:`<form method="post" action="/app/agent/apply">${' '}<button class="btn-sm">${T('Apply for me')}</button></form>` },
    { title:T('Onboarding Agent'), desc:T('Builds your Work Card by chat — just answer in your own words, English or Spanish.'), action:`<a class="btn-sm" href="/app/onboard/chat">${T('Start chat')}</a>` },
  ];
  const recruiter = [
    { title:T('Sourcing Agent'), desc:T('Scans every verified worker and auto-adds the strongest matches to a job’s pipeline.'), action:`<a class="btn-sm" href="/console/jobs">${T('Pick a job →')}</a>` },
    { title:T('Screening Agent'), desc:T('Generates tailored pre-qualifying questions and a fit summary for any candidate.'), action:`<a class="btn-sm" href="/console/search">${T('Open a candidate →')}</a>` },
    { title:T('Scheduling Agent'), desc:T('Proposes interview times to a shortlisted candidate in one click.'), action:`<a class="btn-sm" href="/console/search">${T('Open a candidate →')}</a>` },
  ];
  const items = mode==='employer' ? recruiter : worker;
  return `<section class="wrap">
    <div class="page-h"><h2>${icon('spark','xic')} ${T('Agents')}</h2><p class="muted">${T('AI that works for you — grounded in real data, explainable, free.')}</p></div>
    <div class="grid2">
      ${items.map(a=>`<div class="card agent-card">
        <div class="agent-h">${icon('spark','xic')} ${esc(a.title)}</div>
        <p class="agent-line">${esc(a.desc)}</p>
        <div class="agent-act">${a.action}</div>
      </div>`).join('')}
    </div>
  </section>`;
}

// ---------- Work-in-the-U.S. resource hub (informational, official sources only) ----------
function workHub(){
  const link = (href,label) => `<a class="wa-link" href="${href}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
  const sections = [
    { h:T('Am I authorized to work?'),
      p:T('Everyone hired in the U.S. completes Form I-9 and shows they’re authorized to work. That can be citizenship, a green card, asylee/refugee status, or an Employment Authorization Document (EAD).'),
      links:[['https://www.uscis.gov/i-9-central', 'USCIS — Form I-9 Central'], ['https://www.uscis.gov/working-in-the-united-states','USCIS — Working in the United States']] },
    { h:T('Seasonal & agricultural visa sponsorship (H-2A / H-2B)'),
      p:T('Some employers sponsor temporary workers: H-2A for agricultural/seasonal farm work, and H-2B for seasonal non-farm work like landscaping, hospitality and events. On Rivet, jobs that sponsor show a badge.'),
      links:[['https://www.dol.gov/agencies/whd/agriculture/h2a','U.S. DOL — H-2A (agricultural)'], ['https://www.dol.gov/agencies/whd/immigration/h2b','U.S. DOL — H-2B (seasonal non-agricultural)']] },
    { h:T('Students (F-1: CPT / OPT)'),
      p:T('International students on an F-1 visa may be able to work through CPT or OPT. Check the official rules and talk to your school’s international student office.'),
      links:[['https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors','USCIS — Students & exchange visitors']] },
    { h:T('Your rights at work — no matter your status'),
      p:T('You are owed at least the minimum wage and a safe workplace, and it is illegal for most employers to discriminate against you based on citizenship or national origin. These protections apply regardless of immigration status.'),
      links:[['https://www.justice.gov/crt/immigrant-and-employee-rights-section','U.S. DOJ — Immigrant & Employee Rights'], ['https://www.dol.gov/agencies/whd','U.S. DOL — Wage & Hour Division'], ['https://www.osha.gov/workers','OSHA — Worker safety rights']] },
  ];
  return `<section class="wrap narrow">
    <div class="page-h"><h2>${icon('globe','xic')} ${T('Work in the U.S.')}</h2>
      <p class="muted">${T('Plain-language pointers to official government sources — so you can find the real rules yourself.')}</p></div>
    <div class="card disclaimer">${T('This is general information, not legal advice. Rules change and every situation is different — confirm with the official sources below or a qualified immigration attorney before acting.')}</div>
    ${sections.map(s=>`<div class="card">
      <div class="sec-h" style="margin-top:0">${esc(s.h)}</div>
      <p>${esc(s.p)}</p>
      <div class="wa-links">${s.links.map(([h,l])=>link(h,l)).join('')}</div>
    </div>`).join('')}
    <div class="card muted sm">${T('Know a worker who needs this? Share it — it’s public and free.')}</div>
  </section>`;
}

function jobCard(m, bare = false){
  const j = m.job;
  const fit = (m.missing && m.missing.length)
    ? `<span class="mtag warn">${T('Needs')} ${CRED_KINDS[m.missing[0]]||m.missing[0]}</span>`
    : `<span class="mtag fit">${T('Credentials ✓')}</span>`;
  return `<a class="card job" href="/app/jobs/${j.id}">
    <div class="job-row">
      <div class="badge">${tradeEmoji(j.trade)}</div>
      <div class="job-main">
        <div class="job-t">${esc(T(j.title))}</div>
        <div class="job-c">${j.poster_kind==='individual'?`${T('Homeowner')} · `:`${esc(j.company||'')} · `}${esc(j.city)}${m.distance!=null?` · <b class="dist">${m.distance} ${T('mi away')}</b>${m.beyondCommute?` <span class="far-hint">${T('past your commute')}</span>`:''}`:(!bare && m.needZip?` · <span class="zip-hint">${T('add ZIP for distance')}</span>`:'')}</div>
      </div>
      ${bare?`<span class="mtag fit" style="margin-left:auto">${esc(tl(j.trade))}</span>`:`<span class="score-chip ${scoreClass(m.score)}">${m.score}</span>`}
    </div>
    <div class="job-foot">
      <span class="pay">${j.quotes_ok&&!j.pay_min?T('Name your price'):`$${j.pay_min}–${j.pay_max}<small>/hr</small>`}</span>
      ${j.employment_type?`<span class="jtype">${esc(T(j.employment_type))}</span>`:''}
      ${j.duration?`<span class="jtype dur">${esc(T(j.duration))}</span>`:''}
      ${cadenceBadge(j.pay_cadence)}
      <span class="js-shift">${esc(T(j.shift))}</span>
      ${isExternal(j)?`<span class="ext-badge">${esc(j.source)} ↗</span>`:''}
      ${sponsorBadge(j)}
      ${j.crew_ok?`<span class="crew-badge">${icon('truck')} ${T('Crews ok')}</span>`:''}
      ${j.fair_chance?`<span class="incl-badge fair">${T('Fair-chance')}</span>`:''}
      ${j.veteran_ok?`<span class="incl-badge vet">${T('Veteran-friendly')}</span>`:''}
      ${j.transport_provided?`<span class="incl-badge transp">${T('Ride provided')}</span>`:''}
      ${j.subcontract_ok?`<span class="incl-badge sub">${T('1099 ok')}</span>`:''}
      ${bare?'':fit}
    </div>
    ${bare?'':`<div class="matchbar"><i style="width:${m.score}%"></i></div>`}
  </a>`;
}

function tradeEmoji(t){ return icon(TRADE_ICON[t] || 'wrench', 'tic'); }
function isExternal(job){ return !!(job && job.apply_url && /^https?:\/\//i.test(job.apply_url)); }
// trade <select> grouped by category via <optgroup>
function tradeOptionsGrouped(sel=''){
  const seen = new Set();
  let html = '';
  for(const [cat, keys] of Object.entries(CATEGORIES)){
    const ks = keys.filter(k=>TRADES[k]); ks.forEach(k=>seen.add(k));
    if(!ks.length) continue;
    html += `<optgroup label="${esc(cat)}">${ks.map(k=>`<option value="${k}" ${sel===k?'selected':''}>${esc(TRADES[k])}</option>`).join('')}</optgroup>`;
  }
  const rest = Object.keys(TRADES).filter(k=>!seen.has(k));
  if(rest.length) html += `<optgroup label="Other">${rest.map(k=>`<option value="${k}" ${sel===k?'selected':''}>${esc(TRADES[k])}</option>`).join('')}</optgroup>`;
  return html;
}

function credRow(c, editable = false){
  const st = c.verify_status || (c.verified ? 'verified' : 'unverified');
  const soon = c.verified && c.expires && c.expires < '2026-08';
  const ic = st==='verified' ? '✅' : (st==='review' ? '⏳' : '⬜');
  const badge = st==='verified'
    ? `<span class="v ${soon?'soon':'ok'}">${soon?T('Expiring'):T('Verified')}</span>`
    : (st==='review' ? `<span class="v review">${T('In review')}</span>` : `<span class="v pending">${T('Self-reported')}</span>`);
  const reqForm = (editable && st!=='verified') ? `<form method="post" action="/app/credentials/${c.id}/verify" class="cred-verify">
      <input name="proof_url" placeholder="${T('Link to proof (card photo, license #, URL)')}" maxlength="500"${st==='review'&&c.proof_url?` value="${esc(c.proof_url)}"`:''}>
      <button class="btn-xs">${st==='review'?T('Update'):T('Request verification')}</button>
    </form>` : '';
  return `<div class="cred">
    <div class="cred-ic">${ic}</div>
    <div class="cred-main"><div class="cred-nm">${esc(c.name)}</div><div class="cred-ex">${c.expires?('exp '+esc(c.expires)):'no expiry'}${c.proof_url&&st!=='verified'?` · <a href="${esc(c.proof_url)}" target="_blank" rel="noopener">${T('proof ↗')}</a>`:''}</div>${reqForm}</div>
    ${badge}
  </div>`;
}

// ---------- worker: all matches ----------
function workerJobs({ matches, filters = {}, jobsGeo = null, needZip = false }) {
  const zipBanner = needZip ? `<a class="zip-banner" href="/app/profile">${icon('pin','xic')} ${T('Add your ZIP to your Work Card to see how far each job is.')}</a>` : '';
  const tradeOpts = `<option value="">${T('All trades')}</option>`+Object.entries(TRADES).map(([k,v])=>`<option value="${k}" ${filters.trade===k?'selected':''}>${esc(T(v))}</option>`).join('');
  const shifts = ['Day','Night','4x10','Any'];
  const shiftOpts = `<option value="">${T('Any shift')}</option>`+shifts.map(s=>`<option value="${s}" ${filters.shift===s?'selected':''}>${esc(T(s))}</option>`).join('');
  const typeOpts = `<option value="">${T('Any type')}</option>`+JOB_TYPES.map(t=>`<option value="${t}" ${filters.jtype===t?'selected':''}>${esc(T(t))}</option>`).join('');
  const active = (filters.q||filters.trade||filters.city||filters.minpay||filters.shift||filters.jtype);
  return `<section class="wrap">
    <div class="sec-h big">${T('Find work')} <span class="muted">${matches.length} ${matches.length===1?T('job'):T('jobs')}${active?' · '+T('filtered'):' · '+T('ranked by fit')}</span></div>
    <div class="card agent-card row">
      <div><div class="agent-h">${icon('spark','xic')} ${T('Apply Agent')}</div>
        <p class="agent-line">${T('Let Rivet auto-apply you to the best-fit jobs near you — verified Work Card attached.')}</p></div>
      <form method="post" action="/app/agent/apply"><button class="btn-sm">${T('Apply for me')}</button></form>
    </div>
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
    ${jobsGeo && jobsGeo.points.length ? usMap(jobsGeo.points, {title:T('Where the work is'), noun:T('job'), cta:T('Apply'), home:jobsGeo.home,
        legend:`<span class="lg"><i class="d-direct"></i> ${T('Your trades')}</span><span class="lg"><i class="d-related"></i> ${T('Related trades')}</span>`,
        emptyMsg:T('No mapped openings yet.')}) : ''}
    ${zipBanner}
    <div class="grid3">${matches.map(m=>jobCard(m)).join('') || `<div class="card muted">${T('No jobs match those filters.')} <a href="/app/jobs">${T('Clear filters')}</a></div>`}</div>
  </section>`;
}

// ---------- worker: job detail ----------
function jobDetail({ job, match, applied, saved = false, jobMedia = [], distance = null, rules = null, empRating = {avg:0,count:0}, workAuth = '', empPay = {}, myQuote = null, payFloor = 0, empRehire = 0, empSafety = {} }) {
  const belowMin = rules && job.pay_min && job.pay_min < rules.minWage;
  const spon = (job.sponsorship)||'authorized';
  const sponMatch = (spon==='h2a'&&workAuth==='need_h2a')||(spon==='h2b'&&workAuth==='need_h2b');
  return `<section class="wrap narrow">
    <a class="back" href="/app/jobs">← ${T('All matches')}</a>
    <div class="card">
      <div class="job-row">
        <div class="badge big">${tradeEmoji(job.trade)}</div>
        <div class="job-main">
          <h2>${esc(job.title)}</h2>
          ${job.employment_type?`<span class="jtype">${esc(T(job.employment_type))}</span>`:''}${job.duration?`<span class="jtype dur">${esc(T(job.duration))}</span>`:''}${cadenceBadge(job.pay_cadence)}${job.crew_ok?`<span class="jtype crew">${icon('truck')} ${T('Open to crews')}</span>`:''}${job.quotes_ok?`<span class="jtype quote">${T('Accepting quotes')}</span>`:''}${job.fair_chance?`<span class="jtype fair">${T('Fair-chance')}</span>`:''}${job.veteran_ok?`<span class="jtype vet">${T('Veteran-friendly')}</span>`:''}${job.transport_provided?`<span class="jtype transp">${icon('truck')} ${T('Transport provided')}</span>`:''}${job.subcontract_ok?`<span class="jtype sub">${icon('hammer')} ${T('Subcontractors welcome')}</span>`:''}
          <div class="job-c">${job.poster_kind==='individual'?`${icon('pin')} ${T('Posted by a homeowner / small business')} · `:''}${esc(job.company||'')} · ${esc(job.city)} ${esc(job.zip)} · ${esc(T(job.shift))}${distance!=null?` · <b class="dist">${distance} ${T('mi away')}</b>`:''}</div>
          <div class="pay big">${job.quotes_ok&&!job.pay_min?T('Name your price'):`$${job.pay_min}–${job.pay_max}/hr`}</div>
          ${payFitBadge(payFloor, job, 'worker')}
        </div>
        <div class="score-pill ${scoreClass(match.score)}">${match.score}<small>${T('match')}</small></div>
      </div>
      <p class="descr">${esc(job.descr)}</p>
      ${rules?`<div class="rules">
        <div class="rules-h">${T('Local pay & rules')} · ${esc(rules.level)}</div>
        <div class="rules-grid">
          <div><span>${T('Local minimum wage')}</span><b>$${rules.minWage.toFixed(2)}/hr</b></div>
          <div><span>${T('This job pays')}</span>${job.quotes_ok&&!job.pay_min?`<b>${T('your quote')}</b>`:`<b class="${belowMin?'r-bad':'r-good'}">$${job.pay_min}–${job.pay_max}/hr</b>`}</div>
          <div><span>${T('Overtime')}</span><b>${T('1.5× after 40 hrs/wk')}</b></div>
        </div>
        <p class="rules-note">${rules.cityApplies?`${esc(rules.city)} ${T('sets a higher minimum than the state')} ($${rules.stateWage.toFixed(2)}). `:''}${T('Employers must meet the highest of federal, state, county or city minimum wage. Verify local rules before you start.')}</p>
      </div>`:''}
      <div class="rules workauth">
        <div class="rules-h">${T('Work authorization')}</div>
        ${spon==='h2a'||spon==='h2b'
          ? `<p class="${sponMatch?'wa-match':''}">${icon('globe','xic')} ${spon==='h2a'?T('This employer sponsors H-2A (agricultural) visas.'):T('This employer sponsors H-2B (seasonal) visas.')}${sponMatch?` <b>${T('Matches what you’re seeking.')}</b>`:''}</p>`
          : `<p>${T('Requires existing U.S. work authorization (Form I-9).')}</p>`}
        <p class="rules-note">${T('Informational only — not legal advice.')} <a href="/work-authorization" target="_blank" rel="noopener">${T('Work in the U.S. — your rights & options ↗')}</a></p>
      </div>
      ${jobMedia.length?`<div class="sec-h" style="margin-top:4px">${T('The work')}</div>${mediaGallery(jobMedia)}`:''}
      <div class="breakdown">
        <h4>${T('Why you match')}</h4>
        ${bd(T('Trade fit'),match.breakdown.trade,45)}
        ${bd(T('Pay'),match.breakdown.pay,20)}
        ${bd(T('Location'),match.breakdown.loc,20)}
        ${bd(T('Credentials'),match.breakdown.cred,15)}
      </div>
      ${match.missing.length?`<div class="warn-card">${T('Missing')}: ${match.missing.map(k=>CRED_KINDS[k]||k).join(', ')} — <a href="/app/training" style="font-weight:700;color:inherit;text-decoration:underline">${T('see how to earn it')}</a> ${T('to boost this match.')}</div>`:''}
      ${isExternal(job)
        ? `<a class="btn full" href="${esc(job.apply_url)}" target="_blank" rel="noopener noreferrer">${T('Apply on')} ${esc(job.source)} ↗</a>
           <p class="muted sm" style="text-align:center;margin-top:8px">${T('This opening is listed on')} ${esc(job.source)}. ${T('You’ll finish applying on their site.')}</p>`
        : (job.quotes_ok
          ? (myQuote
            ? `<div class="ok-card">${T('Quote sent')}: <b>$${myQuote.amount} ${T('per '+(myQuote.unit||'job'))}</b>${myQuote.status==='accepted'?` — <b>${T('accepted! 🎉')}</b>`:myQuote.status==='declined'?` — ${T('not selected')}`:` · ${T('waiting on the poster')}`}</div>`
            : `<form method="post" action="/app/jobs/${job.id}/quote" class="quote-form">
                <div class="qf-row"><span class="qf-cur">$</span><input type="number" name="amount" min="1" step="1" placeholder="${T('Your price')}" required>
                  <select name="unit"><option value="job">${T('for the job')}</option><option value="hour">${T('per hour')}</option><option value="day">${T('per day')}</option></select></div>
                <input name="note" placeholder="${T('Add a note (when you can start, what’s included)')}" maxlength="200">
                <button class="btn full">${T('Send my price quote')}</button></form>`)
          : (applied
            ? `<div class="ok-card">${T('✓ Applied — the employer can see your verified Work Card.')}</div>`
            : `<form method="post" action="/app/jobs/${job.id}/apply"><button class="btn full">${T('Apply with verified Work Card')}</button></form>`))}
      <form method="post" action="/app/jobs/${job.id}/save"><button class="btn full ghost">${saved?T('★ Saved — remove'):T('☆ Save this job')}</button></form>
    </div>
    ${(job.company_about||job.company_website||job.company_size||empRating.count||empRehire||(empSafety&&empSafety.n))?`<div class="card">
      <div class="sec-h" style="margin-top:0">${T('About the employer')}</div>
      <div class="job-row"><div class="big-av c sm">${initials(job.company||'')}</div>
        <div class="job-main"><b>${esc(job.company||'')}</b>
          <div class="muted sm">${esc(job.company_city||'')}${job.company_size?` · ${esc(job.company_size)} ${T('employees')}`:''}</div>
          ${(empRating.count||empPay.pct!=null||empRehire||(empSafety&&empSafety.n))?`<div class="rating-row sm">${empRating.count?ratingHead(empRating):''} ${payRepBadge(empPay)} ${rehireBadge(empRehire)} ${safetyBadge(empSafety)}</div>`:''}</div></div>
      ${job.company_about?`<p class="descr" style="margin-top:10px">${esc(job.company_about)}</p>`:''}
      ${job.company_website?`<a class="nav-link" style="color:var(--brand-d)" href="${esc(job.company_website)}" target="_blank" rel="noopener">${esc(job.company_website)} ↗</a>`:''}
    </div>`:''}
  </section>`;
}

// ---------- public, crawlable job page (Google for Jobs) ----------
function publicJob({ job, rules, jsonld }) {
  const belowMin = rules && job.pay_min && job.pay_min < rules.minWage;
  return `<script type="application/ld+json">${jsonld}</script>
  <section class="wrap narrow">
    <a class="back" href="/">← ${esc('Rivet — all jobs')}</a>
    <div class="card">
      <div class="job-row">
        <div class="badge big">${tradeEmoji(job.trade)}</div>
        <div class="job-main">
          <h1 style="font-size:24px">${esc(job.title)}</h1>
          ${job.employment_type?`<span class="jtype">${esc(job.employment_type)}</span>`:''}
          <div class="job-c">${esc(job.company||'')} · ${esc(job.city)} ${esc(job.zip)} · ${esc(job.shift)} shift</div>
          <div class="pay big">$${job.pay_min}–${job.pay_max}/hr</div>
        </div>
      </div>
      <p class="descr">${esc(job.descr)}</p>
      ${rules?`<div class="rules">
        <div class="rules-h">Local pay & rules · ${esc(rules.level)}</div>
        <div class="rules-grid">
          <div><span>Local minimum wage</span><b>$${rules.minWage.toFixed(2)}/hr</b></div>
          <div><span>This job pays</span><b class="${belowMin?'r-bad':'r-good'}">$${job.pay_min}–${job.pay_max}/hr</b></div>
          <div><span>Overtime</span><b>1.5× after 40 hrs/wk</b></div>
        </div>
        ${rules.cityApplies?`<p class="rules-note">${esc(rules.city)} sets a higher local minimum than ${esc(rules.stateName)} ($${rules.stateWage.toFixed(2)}/hr).</p>`:''}
      </div>`:''}
      ${isExternal(job)
        ? `<a class="btn full" href="${esc(job.apply_url)}" target="_blank" rel="noopener noreferrer">Apply on ${esc(job.source)} ↗</a>
           <p class="muted sm" style="text-align:center;margin-top:8px">Listed on ${esc(job.source)} — you'll finish applying on their site.</p>`
        : `<a class="btn full" href="/app/jobs/${job.id}">Apply on Rivet — it's free</a>`}
    </div>
    ${(job.company_about)?`<div class="card">
      <div class="sec-h" style="margin-top:0">About ${esc(job.company||'the employer')}</div>
      <p class="descr">${esc(job.company_about)}</p>
    </div>`:''}
    <div class="card cta-card">
      <b>Rivet is the free, verified way to get hired in the trades.</b>
      <div class="cta-row" style="margin-top:12px"><a class="btn" href="/signup?role=worker">Create your free Work Card</a><a class="btn ghost" href="/">Browse all jobs</a></div>
    </div>
  </section>`;
}

// ---------- worker: applications + saved jobs ----------
// worker-facing stage labels (avoid recruiter jargon like "Sourced")
function stageLabelW(s){ return T(s==='Sourced'?'Received':s); }
function stageTimeline(current){
  const idx = STAGES.indexOf(current);
  return `<div class="timeline">${STAGES.map((s,i)=>`<div class="tl-step ${i<idx?'done':''}${i===idx?'now':''}"><span class="tl-dot"></span><span class="tl-lbl">${stageLabelW(s)}</span></div>`).join('')}</div>`;
}
function workerApplications({ apps, savedJobs, interviews = [], empReviews = {} }) {
  return `<section class="wrap">
    ${interviews.length ? `<div class="sec-h big">${T('Interviews')}</div>${interviews.map(interviewWorker).join('')}` : ''}
    <div class="sec-h big">${T('Your applications')}</div>
    ${apps.length ? apps.map(a=>`<div class="card app-card">
      <div class="job-row"><div class="badge">${tradeEmoji(a.trade)}</div>
        <div class="job-main"><h4>${esc(a.title)}</h4>
          <div class="muted">${esc(a.company||'')} · ${esc(a.city)} · $${a.pay_min}–${a.pay_max}/hr${a.distance!=null?` · <b class="dist">${a.distance} ${T('mi away')}</b>`:''}</div></div>
        <span class="score-tag ${scoreClass(a.score)}">${a.score}</span></div>
      ${stageTimeline(a.stage)}
      ${a.stage==='Hired' ? (empReviews[a.job_id]
        ? `<div class="ok-card sm">${T('You reviewed this employer')} ${starBar(empReviews[a.job_id].stars)}</div>`
        : `<div class="rev-cta"><div class="muted sm">${T('You worked here — rate the employer:')}</div>${reviewForm({action:'/app/reviews', hidden:{job_id:a.job_id, employer_id:a.employer_id}, label:T('Submit review'), prompt:T('How was working here?'), safety:true})}</div>`) : ''}
      ${a.stage==='Hired' ? (a.pay_outcome
        ? `<div class="ok-card sm">${T('Pay reported')}: ${T({ontime:'Paid on time',late:'Paid late',short:'Paid short',unpaid:'Not paid'}[a.pay_outcome]||a.pay_outcome)}</div>`
        : `<div class="rev-cta"><div class="muted sm">${T('Did this employer pay you as promised?')}</div>
          <div class="pay-btns">${[['ontime','Paid on time'],['late','Paid late'],['short','Paid short'],['unpaid','Not paid']].map(([v,l])=>`<form method="post" action="/app/applications/${a.id}/pay"><input type="hidden" name="pay_outcome" value="${v}"><button class="btn-xs${v==='ontime'?'':' ghost'}">${T(l)}</button></form>`).join('')}</div></div>`) : ''}
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
  let out = tradesOf(profile).map(t=>`<span class="chip">${tradeEmoji(t)} ${esc(tl(t))}</span>`).join('');
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
function workerProfile({ user, profile, creds, error, portfolio = [], work = [], rating = {avg:0,count:0}, crew = [], showUp = {} }) {
  const kinds = Object.entries(CRED_KINDS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  const trades = tradesOf(profile);
  return `<section class="wrap">
    <div class="card profile-head wide-head">
      <div class="big-av">${initials(user.name)}</div>
      <h2>${esc(user.name)}</h2>
      ${profile.headline?`<p class="headline">${esc(profile.headline)}</p>`:''}
      <div class="chips">${tradeChips(profile)}</div>
      ${(rating.count||showUp.pct!=null)?`<div class="rating-row">${rating.count?ratingHead(rating):''} ${showUpBadge(showUp)}</div>`:''}
      <p class="muted">${esc(profile.city)} · ${profile.years_exp} yrs · floor $${profile.pay_floor}/hr · ${esc(profile.shift)} shift</p>
      <div class="share-row">
        <button class="btn-sm" type="button" onclick="var u=location.origin+'/p/${user.id}';if(navigator.share){navigator.share({title:'My Rivet Work Card',url:u})}else if(navigator.clipboard){navigator.clipboard.writeText(u);this.textContent='${T('Link copied ✓')}'}">${icon('send')} ${T('Share my Work Card')}</button>
        <a class="btn-sm ghost" href="/p/${user.id}" target="_blank" rel="noopener">${T('Preview ↗')}</a>
      </div>
      <p class="muted sm share-hint">${T('One link with your trades, credentials, reviews & portfolio — text it to any employer.')}</p>
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
      <div class="sec-h" style="margin-top:0">${T('Trades, location & details')}</div>
      ${error?`<div class="err">${esc(error)}</div>`:''}
      <form method="post" action="/app/profile/details">
        <label>${T('Headline')} <input name="headline" maxlength="80" value="${esc(profile.headline||'')}" placeholder="${T('e.g. Journeyman electrician — commercial & solar')}"></label>
        <div class="fieldset">
          <div class="fs-lbl">${T('Your trades')} <span class="muted">${T('pick all you work')}</span></div>
          <div class="tradepick">${tradeCheckboxes(trades)}</div>
        </div>
        <label>${T("Don't see your job? Add it")} <input name="custom_trade" maxlength="60" value="${esc(profile.custom_trade||'')}" placeholder="${T('e.g. Wind turbine technician')}"></label>
        <div class="row2">
          <label>${T('City')} <input name="city" maxlength="60" value="${esc(profile.city||'')}" placeholder="${T('e.g. Phoenix')}"></label>
          <label>${T('ZIP code')} <input name="zip" inputmode="numeric" maxlength="5" pattern="[0-9]*" value="${esc(profile.zip||'')}" placeholder="${T('e.g. 85004')}"></label>
        </div>
        <p class="muted sm" style="margin-top:-4px">${T('Your ZIP powers distance to each job and the map — add it to see how far jobs are.')}</p>
        <div class="row2">
          <label>${T('Years of experience')} <input name="years_exp" type="number" min="0" max="60" inputmode="numeric" value="${profile.years_exp||0}"></label>
          <label>${T('Lowest pay you’d take ($/hr)')} <input name="pay_floor" type="number" min="0" inputmode="numeric" value="${profile.pay_floor||0}"></label>
        </div>
        <label>${T('Farthest you’ll travel (miles, 0 = no limit)')} <input name="commute_mi" type="number" min="0" max="500" inputmode="numeric" value="${profile.commute_mi||0}"></label>
        <label>${T('Shift')} <select name="shift">${['Any','Day','Night','4x10'].map(s=>`<option value="${s}" ${(profile.shift||'Any')===s?'selected':''}>${T(s)}</option>`).join('')}</select></label>
        <label>${T('About you')} <textarea name="about" rows="3" maxlength="600" placeholder="${T("Where you've worked, what you're great at, what you're looking for.")}">${esc(profile.about||'')}</textarea></label>
        <button class="btn-sm">${T('Save details')}</button>
      </form>
      <form method="post" action="/app/profile/suggest-about" style="margin-top:8px">
        <button class="btn-sm ghost" title="Drafts an About from your trades and work history — free">${T('✨ Draft my About for me')}</button>
      </form>
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Work authorization')} <span class="muted sm">${T('optional · private')}</span></div>
      <p class="muted sm">${T('Tells you when an employer sponsors the visa you need. We never use this to screen you out, and it’s not shown publicly.')}</p>
      <form method="post" action="/app/work-auth" class="msg-form">
        <select name="work_auth">${Object.entries(WORK_AUTH).map(([k,v])=>`<option value="${k}" ${(profile.work_auth||'')===k?'selected':''}>${T(v)}</option>`).join('')}</select>
        <button class="btn-sm">${T('Save')}</button>
      </form>
      <p class="muted sm" style="margin-top:8px"><a href="/work-authorization" target="_blank" rel="noopener" style="color:var(--brand-d);font-weight:700">${T('Work in the U.S. — your rights & options ↗')}</a></p>
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
      ${creds.map(c=>credRow(c, true)).join('') || `<p class="muted">${T('No credentials yet — add one below.')}</p>`}
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
    ${renewalRadar(creds)}
    ${crewCard({crew, editable:true})}
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
    <div class="sec-h">${T('Students, part-time & work eligibility')}</div>
    <div class="card">
      <p class="descr">${T('Lots of part-time and seasonal work on Rivet is a great fit for students and newcomers. Use the “Part-time / Temp” filter on Find Work, and turn on availability for the shifts you can take.')}</p>
      <p class="muted sm" style="margin-top:8px">${T('Heads up: you must be authorized to work in the U.S., and minors have limited hours/tasks. This is general info, not legal advice — check the official sources:')}</p>
      <div class="train-links">
        <a class="nav-link" style="color:var(--brand-d);font-weight:700" href="https://www.uscis.gov/i-9-central" target="_blank" rel="noopener noreferrer">USCIS — Work authorization (Form I-9) ↗</a>
        <a class="nav-link" style="color:var(--brand-d);font-weight:700" href="https://www.dol.gov/agencies/whd/youthrules" target="_blank" rel="noopener noreferrer">DOL — Youth & student work rules ↗</a>
      </div>
      <a class="btn-sm" href="/work-authorization" style="margin-top:12px">${icon('globe')} ${T('Work in the U.S. — full guide')}</a>
    </div>
  </section>`;
}

// ---------- Industry Pulse: trends + community board ----------
const PULSE_NEWS = [
  { tag:'Demand', title:'Data-center boom is driving record electrician & HVAC demand', body:'Hyperscale and AI build-outs are pulling thousands of electricians, controls techs and HVAC installers into commercial work — often at premium pay.' },
  { tag:'Wages', title:'Skilled-trade wages keep climbing faster than inflation', body:'Welders, plumbers and pipefitters with current certs are commanding sign-on bonuses and per-diem on travel jobs as the labor crunch continues.' },
  { tag:'Healthcare', title:'CNAs and home-health aides are among the fastest-growing roles', body:'An aging population is fueling steady, flexible demand for certified nursing assistants and caregivers nationwide.' },
  { tag:'Logistics', title:'Warehouse, delivery and CDL roles stay red-hot', body:'E-commerce and regional distribution keep last-mile drivers, forklift operators and warehouse crews in constant demand.' },
];
function pulsePage({ user, trending, posts, totalOpen, companies = [], demandGeo = [], season = [], monthName = '' }) {
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
    ${season.length?`<div class="card season-card">
      <div class="sec-h" style="margin-top:0">${icon('flame','xic')} ${T('In season this')} ${esc(monthName)} <span class="muted sm">${T('hiring climbs for these trades now')}</span></div>
      <div class="season-grid">${season.map(s=>`<span class="season-chip">${tradeEmoji(s.trade)} <b>${esc(TRADES[s.trade]||s.trade)}</b>${s.why?` <span class="muted sm">${T(s.why)}</span>`:''}</span>`).join('')}</div>
    </div>`:''}
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
function publicPortfolio({ worker, profile, creds, portfolio, work = [], rating = {avg:0,count:0}, reviews = [], showUp = {} }) {
  return `<section class="hero pub-hero"><div class="wrap">
      <span class="tag">Verified on Rivet</span>
      <h1>${esc(worker.name)}</h1>
      ${profile.headline?`<p class="lead">${esc(profile.headline)}</p>`:''}
      <div class="chips light">${tradeChips(profile)}</div>
      ${(rating.count||showUp.pct!=null)?`<div class="rating-row light">${rating.count?ratingHead(rating):''} ${showUpBadge(showUp)}</div>`:''}
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
        ${creds.filter(c=>c.verified).map(c=>credRow(c)).join('') || '<p class="muted">No verified credentials listed.</p>'}
      </div>
      <div class="card">
        <div class="sec-h" style="margin-top:0">Work portfolio</div>
        ${mediaGallery(portfolio) || '<p class="muted">No portfolio pieces yet.</p>'}
      </div>
      ${rating.count?`<div class="card"><div class="sec-h" style="margin-top:0">Reviews from employers ${ratingHead(rating)}</div>${reviewList(reviews)}</div>`:''}
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
// ---------- ratings & reviews ----------
function starBar(avg){
  const full = Math.round(Number(avg)||0);
  let s=''; for(let i=1;i<=5;i++) s+=`<span class="star ${i<=full?'on':''}">★</span>`;
  return `<span class="stars">${s}</span>`;
}
function ratingHead(rating){
  const count = rating && rating.count || 0;
  if(!count) return `<span class="rating muted sm">${starBar(0)} ${T('No reviews yet')}</span>`;
  return `<span class="rating">${starBar(rating.avg)} <b>${Number(rating.avg).toFixed(1)}</b> <span class="muted sm">(${count} ${count===1?T('review'):T('reviews')})</span></span>`;
}
function reviewList(items){
  if(!items || !items.length) return `<p class="muted sm">${T('No reviews yet.')}</p>`;
  return `<div class="revlist">${items.map(r=>`<div class="rev">
    <div class="rev-top">${starBar(r.stars)} <b>${esc(r.author_name||'')}</b> <span class="rev-t">${timeAgo(r.created_at)}</span></div>
    ${r.body?`<p class="rev-b">${esc(r.body)}</p>`:''}</div>`).join('')}</div>`;
}
function reviewForm({ action, hidden = {}, label, prompt, safety = false }){
  const h = Object.entries(hidden).map(([k,v])=>`<input type="hidden" name="${esc(k)}" value="${esc(String(v))}">`).join('');
  const opts = [5,4,3,2,1].map(n=>`<option value="${n}">${'★'.repeat(n)} (${n})</option>`).join('');
  const safetySel = safety ? `<select name="safety" aria-label="${T('Site safety')}"><option value="">${T('Site safety?')}</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${T('Safety')} ${n}/5</option>`).join('')}</select>` : '';
  return `<form method="post" action="${action}" class="rev-form">${h}
    <select name="stars" aria-label="${T('Rating')}">${opts}</select>
    ${safetySel}
    <input name="body" placeholder="${esc(prompt||T('Share how it went…'))}" maxlength="400">
    <button class="btn-sm">${label}</button></form>`;
}
function safetyBadge(s){
  if(!s || !s.n) return '';
  return `<span class="rep-badge ${repClass(Math.round(s.avg*20))}" title="${T('Worker-rated site safety')}">${icon('shield')} ${T('Safety')} ${Number(s.avg).toFixed(1)} <span class="rep-n">(${s.n})</span></span>`;
}
function fmtSlot(iso){
  const d = new Date(iso); if(isNaN(d)) return esc(iso);
  return d.toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
// ---------- X-factors: reliability, pay reputation, crew, renewals ----------
function repClass(p){ return p>=90?'good':(p>=75?'mid':'low'); }
function showUpBadge(s){
  if(!s || s.pct==null) return '';
  return `<span class="rep-badge ${repClass(s.pct)}" title="${T('Confirmed start outcomes — showed up vs no-showed')}">${icon('dot')} ${T('Shows up')} ${s.pct}% <span class="rep-n">(${s.starts} ${s.starts===1?T('start'):T('starts')})</span></span>`;
}
function payRepBadge(p){
  if(!p || p.pct==null) return '';
  return `<span class="rep-badge ${repClass(p.pct)}" title="${T('Worker-confirmed pay outcomes')}">${icon('dot')} ${T('Pays on time')} ${p.pct}% <span class="rep-n">(${p.n})</span></span>`;
}
function rehireBadge(n){
  if(!n) return '';
  return `<span class="rep-badge good" title="${T('Workers this employer hired more than once')}">${icon('star')} ${n} ${n===1?T('rehired'):T('rehired')}</span>`;
}
function crewCard({ crew = [], editable = false }){
  const rows = crew.map(m=>`<div class="crew-row"><span class="crew-av">${initials(m.name)}</span>
    <div class="crew-main"><b>${esc(m.name)}</b><span class="muted sm">${esc(TRADES[m.trade]||m.trade||'')}${m.note?` · ${esc(m.note)}`:''}</span></div>
    ${editable?`<form method="post" action="/app/crew/${m.id}/delete"><button class="x" aria-label="${T('Remove')}">✕</button></form>`:''}</div>`).join('');
  return `<div class="card">
    <div class="sec-h" style="margin-top:0">${icon('truck','xic')} ${T('My crew')} <span class="muted sm">${T('people you’d vouch for & bring to a job')}</span></div>
    ${rows || `<p class="muted sm">${editable?T('Add teammates you’ve worked with — employers hiring crews will see you bring a team.'):T('No crew listed yet.')}</p>`}
    ${editable?`<form method="post" action="/app/crew" class="crew-form">
      <input name="name" placeholder="${T('Name')}" maxlength="60" required>
      <select name="trade"><option value="">${T('Trade')}</option>${Object.entries(TRADES).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select>
      <input name="note" placeholder="${T('How you know them (optional)')}" maxlength="80">
      <button class="btn-sm">${T('Add')}</button>
    </form>`:''}
  </div>`;
}
function renewalRadar(creds){
  const now = Date.now();
  const due = creds.filter(c=>c.verified && c.expires).map(c=>{
    const t = Date.parse((String(c.expires).length===7?c.expires+'-01':c.expires)+'T00:00:00Z');
    return { ...c, days: isNaN(t)?9999:Math.round((t-now)/864e5) };
  }).filter(c=>c.days<=180).sort((a,b)=>a.days-b.days);
  if(!due.length) return '';
  return `<div class="card">
    <div class="sec-h" style="margin-top:0">${icon('bell','xic')} ${T('Renewals due')} <span class="muted sm">${T('keep these current to stay hireable')}</span></div>
    ${due.map(c=>{ const urgent=c.days<=30; return `<div class="renew ${urgent?'urgent':''}">
      <div class="renew-main"><b>${esc(c.name)}</b><span class="muted sm">${c.days<0?T('expired'):c.days===0?T('expires today'):`${T('expires in')} ${c.days} ${T('days')}`} · ${esc(c.expires)}</span></div>
      ${TRAINING[c.kind]?`<a class="btn-xs" href="${esc(TRAINING[c.kind].url)}" target="_blank" rel="noopener">${T('Renew ↗')}</a>`:''}
    </div>`; }).join('')}
  </div>`;
}
// Payscale fit: how the worker's ask ($/hr floor) lines up with the job's pay.
function payFitBadge(floor, job, side = 'worker'){
  floor = Number(floor)||0;
  if(job.quotes_ok && !job.pay_max) return `<span class="payfit q">${T('Worker sets the price')}</span>`;
  if(!floor || !job.pay_max) return '';
  if(job.pay_max >= floor)
    return `<span class="payfit good">${icon('dot')} ${side==='recruiter'?`${T('Asks')} $${floor}/hr · ${T('within your range')}`:`${T('Meets your')} $${floor} ${T('floor')}`}</span>`;
  const gap = floor - job.pay_max;
  return `<span class="payfit low">${icon('dot')} ${side==='recruiter'?`${T('Asks')} $${floor}/hr · $${gap} ${T('over budget')}`:`$${gap}/hr ${T('below your')} $${floor} ${T('floor')}`}</span>`;
}
// recruiter-side interview block for a given job/worker
function interviewEmp(iv){
  if(!iv) return '';
  if(iv.status==='confirmed') return `<div class="iv ok">${icon('bell','xic')} ${T('Interview confirmed')}: <b>${fmtSlot(iv.chosen)}</b></div>`;
  const slots = (()=>{try{return JSON.parse(iv.slots)}catch(e){return []}})();
  return `<div class="iv">${icon('bell','xic')} ${T('Interview proposed')} — ${T('waiting on candidate')}: ${slots.map(s=>`<span class="slot-chip">${fmtSlot(s)}</span>`).join('')}</div>`;
}
function interviewProposeForm(jobId, workerId){
  return `<form method="post" action="/console/interviews" class="iv-form">
    <input type="hidden" name="job_id" value="${jobId}"><input type="hidden" name="worker_id" value="${workerId}">
    <div class="iv-slots"><input type="datetime-local" name="slot1" required><input type="datetime-local" name="slot2"><input type="datetime-local" name="slot3"></div>
    <button class="btn-sm">${T('Propose interview times')}</button></form>`;
}
// worker-side interview card
function interviewWorker(iv){
  const slots = (()=>{try{return JSON.parse(iv.slots)}catch(e){return []}})();
  if(iv.status==='confirmed') return `<div class="iv ok">${icon('bell','xic')} ${T('Interview confirmed for')} <b>${fmtSlot(iv.chosen)}</b> — ${esc(iv.company||iv.title||'')}</div>`;
  return `<div class="iv"><div class="iv-h">${icon('bell','xic')} ${T('Interview invite')} — ${esc(iv.company||'')} · <b>${esc(iv.title||'')}</b></div>
    <p class="muted sm">${T('Pick a time that works:')}</p>
    <div class="iv-pick">${slots.map(s=>`<form method="post" action="/app/interviews/${iv.id}/accept"><input type="hidden" name="chosen" value="${esc(s)}"><button class="btn-sm">${fmtSlot(s)}</button></form>`).join('')}</div></div>`;
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
// stylized physical-geography layers (hand-simplified, lon/lat)
const MAP_RIVERS = [
  [[-95.0,47.2],[-92,44],[-91.2,41.5],[-90.2,38.6],[-89.9,35.1],[-91,32.3],[-89.3,29.2]], // Mississippi
  [[-111.5,45.9],[-104,47.9],[-100.8,46.9],[-96.4,42.8],[-94.7,40],[-90.2,38.8]],          // Missouri
  [[-80,40.4],[-84.5,39.1],[-86.8,37.9],[-89,37]],                                          // Ohio
  [[-105.8,40.2],[-108.2,39.1],[-110.5,38.9],[-111.6,36.9],[-114.0,36.0],[-114.6,32.7]],    // Colorado
  [[-106.5,37.8],[-106.6,31.8],[-102,29.3],[-99.5,27.5],[-97.5,26]],                        // Rio Grande
  [[-117,46],[-119.5,46],[-121.2,45.6],[-123.9,46.2]],                                      // Columbia
];
const MAP_MTNS = [ // mountain ranges as clusters of peak points
  [-110,48],[-111,45],[-110.5,42],[-106.5,40],[-107,38],[-108,36],   // Rockies
  [-121,46],[-121.4,43],[-119,38.5],[-118.5,36.5],                   // Cascades/Sierra
  [-80,42],[-81,40],[-82,38],[-83.5,36],[-84,34.6],                  // Appalachians
];
const MAP_FORESTS = [[-122,46.8,30],[-121,44,24],[-90,46.5,26],[-94,47.8,22],[-84,34,26],[-82,36,22],[-72,44,24],[-69,46,20]];
function usMap(points = [], opts = {}){
  const { title='Where your talent is', noun='candidate', emptyMsg='No mapped locations yet.', legend=null, cta='Open', home=null } = opts;
  const MINLON=-125, MAXLON=-66, MINLAT=24, MAXLAT=50, VW=620, VH=350;
  const px = lon => ((lon-MINLON)/(MAXLON-MINLON)*VW).toFixed(1);
  const py = lat => ((MAXLAT-lat)/(MAXLAT-MINLAT)*VH).toFixed(1);
  const PX_PER_MI = VW/((MAXLON-MINLON)*53); // ~0.2 px/mile across the lower-48 projection
  const statePaths = US_STATES.map(s=>`<path class="us-state" d="${s.d}"><title>${esc(s.n)}</title></path>`).join('');
  const cityLayer = MAP_CITIES.map(([nm,lo,la])=>`<g class="us-city"><circle cx="${px(lo)}" cy="${py(la)}" r="1.6"/><text x="${(+px(lo)+4).toFixed(1)}" y="${(+py(la)+3).toFixed(1)}">${esc(nm)}</text></g>`).join('');
  const nfmt = n => n>=10000 ? Math.round(n/1000)+'k' : (n>=1000 ? (n/1000).toFixed(1).replace(/\.0$/,'')+'k' : String(n));
  // subtle river lines only — geographic context, clearly not interactive markers.
  const rivers = MAP_RIVERS.map(r=>`<polyline class="geo-river" points="${r.map(([lo,la])=>`${px(lo)},${py(la)}`).join(' ')}"/>`).join('');
  const total = points.reduce((a,g)=>a+(g.n||0),0);
  // The clickable circles ARE the heatmap: size = volume, soft glow = intensity,
  // the busiest metros gently pulse so the map feels alive (a "real hero").
  const maxN = Math.max(1, ...points.map(g=>g.n||0));
  const dots = points.map((g,i)=>{
    const r = Math.min(26, 9 + Math.sqrt(g.n||1)*0.24);
    const hot = (g.n||0) >= maxN*0.6;
    const cls = `mdot${g.kind==='related'?' related':''}${hot?' hot':''}`;
    const lbl = `${g.city||''}: ${(g.n||0).toLocaleString()} ${noun}${g.n===1?'':'s'} — tap to open`;
    return `<g class="${cls}" tabindex="0" role="button" aria-label="${esc(lbl)}" onclick="rvMapShow(${i})" onkeydown="if(event.key==='Enter')rvMapShow(${i})">
      ${hot?`<circle class="mpulse" cx="${px(g.lon)}" cy="${py(g.lat)}" r="${r.toFixed(1)}"/>`:''}
      <circle class="mdisc" cx="${px(g.lon)}" cy="${py(g.lat)}" r="${r.toFixed(1)}"><title>${esc(lbl)}</title></circle>
      <text x="${px(g.lon)}" y="${(+py(g.lat)+3.6).toFixed(1)}" text-anchor="middle">${nfmt(g.n||0)}</text></g>`;
  }).join('');
  // "You are here": a distinct home marker + commute ring so the national map becomes personal
  const hx = home && home.lat!=null ? +px(home.lon) : null, hy = home && home.lat!=null ? +py(home.lat) : null;
  const ringR = (home && home.commute>0) ? Math.max(8, Math.min(VW, home.commute*PX_PER_MI)) : 0;
  const homeLbl = `${T('You')}${home&&home.city?` · ${esc(home.city)}`:''}${home&&home.commute>0?` · ${T('commute')} ${home.commute} mi`:''}`;
  const homeLayer = hx!=null ? `<g class="mhome" aria-hidden="true">
      ${ringR? `<circle class="mhome-ring" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${ringR.toFixed(1)}"/>`:''}
      <circle class="mhome-pulse" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="6"/>
      <circle class="mhome-dot" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="4.5"><title>${esc(homeLbl)}</title></circle>
    </g>` : '';
  const top = points.slice(0,7).map((g,i)=>`<li onclick="rvMapShow(${i})"><span>${esc(g.city||'—')}${g.dist!=null?` <em class="mi-tag">${g.dist} mi</em>`:''}</span><b>${(g.n||0).toLocaleString()}</b></li>`).join('');
  // escaped per-point payload for the click panel (esc() makes it HTML- and </script>-safe)
  const data = points.map(g=>({ c: esc(g.city||''), n:(g.n||0), items: (g.items||[]).slice(0,12).map(it=>({l:esc(it.label||''),s:esc(it.sub||''),h:esc(it.href||'#')})) }));
  return `<div class="card">
    <div class="sec-h" style="margin-top:0">${esc(title)} <span class="muted">${total.toLocaleString()} ${noun}${total===1?'':'s'}</span></div>
    ${points.length ? `<div class="mapwrap">
      <div class="mapbox">
        <svg class="usmap" id="rvsvg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="US opportunity map">
          <g class="us-states">${statePaths}</g>
          <g class="us-geo"><clipPath id="rvclip"><rect x="0" y="0" width="${VW}" height="${VH}"/></clipPath>
            <g clip-path="url(#rvclip)"><g class="geo-rivers">${rivers}</g></g></g>
          <g class="us-cities">${cityLayer}</g>${dots}${homeLayer}
        </svg>
        <div class="mapzoom">${hx!=null?`<button type="button" class="mz-home" onclick="rvHome()" aria-label="${esc(T('Zoom to me'))}">${icon('pin')}</button>`:''}<button type="button" onclick="rvZoom(.8)" aria-label="Zoom in">${icon('zoomin')}</button><button type="button" onclick="rvZoom(1.25)" aria-label="Zoom out">${icon('zoomout')}</button></div>
      </div>
      <div class="mapside">
        <ul class="maplist">${top}</ul>
        <div class="mappanel" id="rvpanel"><p class="muted sm">${T('Tap a circle to see openings there')}</p></div>
      </div>
    </div>
    ${home && home.reachable>0 ? `<p class="map-near"><span class="mn-dot"></span><b>${home.reachable.toLocaleString()}</b> ${noun}${home.reachable===1?'':'s'} ${T('within')} ${home.commute>0?home.commute:40} ${T('mi of you')}${home.city?` · ${esc(home.city)}`:''} <button type="button" class="mn-link" onclick="rvHome()">${T('Zoom to me')} →</button></p>` : ''}
    <div class="maplegend">
      ${legend || `<span class="lg"><i class="lg-dot"></i> ${esc(noun)}s</span>`}
      ${hx!=null?`<span class="lg"><i class="lg-home"></i> ${T('You')}</span>`:''}
      <span class="lg lg-scale"><i class="ls ls1"></i><i class="ls ls2"></i><i class="ls ls3"></i> ${T('bigger circle = more')}</span>
      <span class="lg muted">${icon('pin')} ${T('Tap any circle to see them')}</span>
    </div>`+`<p class="map-hint sm muted">${total.toLocaleString()} ${noun}${total===1?'':'s'} ${T('across')} ${points.length} ${points.length===1?T('metro'):T('metros')} · ${T('warmer & bigger = more hiring')}</p>`+`
    <script>(function(){
      window.__RVD=${JSON.stringify(data)};window.__RVC=${JSON.stringify(esc(cta))};
      window.__RVHOME=${hx!=null?`{x:${hx.toFixed(1)},y:${hy.toFixed(1)}}`:'null'};
      if(window.__rvmapInit)return;window.__rvmapInit=1;
      window.rvMapShow=function(i){var d=(window.__RVD||[])[i];var p=document.getElementById('rvpanel');if(!d||!p)return;
        var hdr='<div class="mp-h">'+d.c+(d.n?' <span class="mp-n">'+d.n.toLocaleString()+' open</span>':'')+'</div>';
        if(!d.items.length){p.innerHTML=hdr+'<p class="muted sm">No sample roles loaded.</p>';return;}
        p.innerHTML=hdr+d.items.map(function(it){return '<div class="mp-row"><div class="mp-info"><b>'+it.l+'</b><span>'+it.s+'</span></div><a class="mp-cta" href="'+it.h+'">'+window.__RVC+'</a></div>';}).join('')+(d.n>d.items.length?'<p class="muted sm" style="margin-top:8px">+ '+(d.n-d.items.length).toLocaleString()+' more in '+d.c+'</p>':'');};
      window.rvZoom=function(f){var s=document.getElementById('rvsvg');if(!s)return;var vb=(s.getAttribute('viewBox')||'0 0 620 350').split(' ').map(Number);var cx=vb[0]+vb[2]/2,cy=vb[1]+vb[3]/2,nw=Math.max(150,Math.min(620,vb[2]*f)),nh=Math.max(85,Math.min(350,vb[3]*f));s.setAttribute('viewBox',(cx-nw/2).toFixed(1)+' '+(cy-nh/2).toFixed(1)+' '+nw.toFixed(1)+' '+nh.toFixed(1));};
      window.rvHome=function(){var s=document.getElementById('rvsvg');var h=window.__RVHOME;if(!s||!h)return;var nw=260,nh=147;s.setAttribute('viewBox',Math.max(0,Math.min(620-nw,h.x-nw/2)).toFixed(1)+' '+Math.max(0,Math.min(350-nh,h.y-nh/2)).toFixed(1)+' '+nw+' '+nh);};
    })();</script>`
      : `<p class="muted">${esc(emptyMsg)}</p>`}
  </div>`;
}
function empOverview({ user, kpis, funnel, recent, hot, alerts, fillRate, geo = [], isNew = false, talentTotal = 0 }) {
  const maxF = Math.max(1, ...STAGES.map(s=>funnel[s]||0));
  const welcome = isNew ? `<div class="card welcome">
      <div class="welcome-h">${T('Welcome to Crewline')}, ${esc((user.name||'').split(' ')[0])} 👋</div>
      <p>${T('There are')} <b>${talentTotal.toLocaleString()}</b> ${T('verified blue-collar workers ready across the U.S. Post your first job and we’ll match you instantly — see who’s available on the map below.')}</p>
      <a class="btn" href="/console/jobs/new">${T('Post your first job')}</a>
    </div>` : '';
  const funnelBars = STAGES.map(s=>`<div class="fn-row">
      <span class="fn-lbl">${s}</span>
      <div class="fn-bar"><i class="fn-${s.toLowerCase()}" style="width:${Math.round(((funnel[s]||0)/maxF)*100)}%"></i></div>
      <b class="fn-n">${funnel[s]||0}</b>
    </div>`).join('');
  return `<section class="wrap">
    <div class="page-h"><h2>${T('Overview')}</h2><p class="muted">${esc(user.company||user.name)}</p>
      <a class="btn-sm right" href="/console/jobs/new">${T('+ Post a job')}</a></div>
    ${welcome}
    <div class="kpis">
      ${kpi(T('Open jobs'),kpis.openJobs)}
      ${kpi(T('Verified talent pool'), (talentTotal||kpis.pool).toLocaleString())}
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

function empAnalytics({ user, kpis, weekly = [], conv = [], topTrades = [], topJobs = [], avgScore = 0, totalApps = 0, avgDaysToHire = null }){
  const maxW = Math.max(1, ...weekly.map(w=>w.n));
  const weekBars = weekly.map(w=>`<div class="vbar-col">
      <div class="vbar-track"><i class="vbar" style="height:${Math.max(w.n?6:0,Math.round((w.n/maxW)*100))}%"></i></div>
      <span class="vbar-n">${w.n}</span><span class="vbar-l">${esc(w.label)}</span>
    </div>`).join('');
  const convRows = conv.map((c,i)=>{
    const step = i===0 ? 100 : (conv[i-1].reached ? Math.round((c.reached/conv[i-1].reached)*100) : 0);
    return `<div class="fn-row conv">
      <span class="fn-lbl">${esc(c.stage)}</span>
      <div class="fn-bar"><i class="fn-${c.stage.toLowerCase()}" style="width:${c.pct}%"></i></div>
      <b class="fn-n">${c.reached}</b>
      <span class="conv-step ${i&&step<60?'warn':''}">${i?step+'%':'—'}</span>
    </div>`;
  }).join('');
  const maxT = Math.max(1, ...topTrades.map(t=>t.n));
  const tradeRows = topTrades.length ? topTrades.map(t=>`<div class="fn-row">
      <span class="fn-lbl">${esc(TRADES[t.trade]||t.trade)}</span>
      <div class="fn-bar"><i style="width:${Math.round((t.n/maxT)*100)}%;background:var(--brand)"></i></div>
      <b class="fn-n">${t.n}</b></div>`).join('') : `<p class="muted">${T('No applicants yet.')}</p>`;
  const jobRows = topJobs.length ? `<table class="tbl"><tr><th>${T('Job')}</th><th>${T('Applicants')}</th><th>${T('Hired')}</th></tr>
    ${topJobs.map(j=>`<tr><td><a class="cand-link" href="/console/jobs/${j.id}">${esc(j.title)}</a></td><td>${j.n}</td><td>${j.hired}</td></tr>`).join('')}</table>`
    : `<p class="muted">${T('No jobs posted yet.')} <a href="/console/jobs/new">${T('Post a job')}</a></p>`;
  const empty = totalApps===0;
  return `<section class="wrap">
    <div class="page-h"><h2>${T('Analytics')}</h2><p class="muted">${esc(user.company||user.name)} · ${T('hiring performance')}</p>
      <a class="btn-sm right" href="/console/jobs/new">${T('+ Post a job')}</a></div>
    <div class="kpis">
      ${kpi(T('Total applicants'),totalApps)}
      ${kpi(T('In pipeline'),kpis.pipeline)}
      ${kpi(T('Hired'),kpis.hired)}
      ${kpi(T('Offer→hire rate'),kpis.fillRate+'%')}
      ${kpi(T('Avg match score'),avgScore)}
    </div>
    ${empty ? `<div class="card"><p class="muted">${T('Analytics light up once candidates start flowing into your jobs. Post a role and source from Talent Search to get going.')} <a href="/console/jobs/new">${T('Post a job →')}</a></p></div>` : `
    <div class="grid2">
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Applications over time')} <span class="muted">${T('last 8 weeks')}</span></div>
        <div class="vbars">${weekBars}</div>
      </div>
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Funnel conversion')} <span class="muted">${T('reached · step %')}</span></div>
        <div class="funnel">${convRows}</div>
      </div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Top trades by applicants')}</div>
        <div class="funnel">${tradeRows}</div>
      </div>
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Jobs by demand')}</div>
        ${jobRows}
      </div>
    </div>`}
  </section>`;
}

const COMPANY_SIZES = ['1–10','11–50','51–200','201–500','500+'];
function empCompany({ user, saved = false, welcome = false, rating = {avg:0,count:0}, reviews = [], payRep = {}, rehire = 0, safety = {} }) {
  const sizeOpts = `<option value="">Company size</option>`+COMPANY_SIZES.map(s=>`<option ${user.company_size===s?'selected':''}>${s}</option>`).join('');
  return `<section class="wrap narrow">
    ${welcome?`<div class="card welcome"><div class="welcome-h">${T('Welcome to Crewline')} 👋</div><p>${T('First, add your company so candidates trust your jobs. Then post your first role — takes a minute.')}</p></div>`:''}
    <div class="card profile-head">
      <div class="big-av c">${initials(user.company||user.name)}</div>
      <h2>${esc(user.company||'Your company')}</h2>
      <div class="rating-row">${ratingHead(rating)} ${payRepBadge(payRep)} ${rehireBadge(rehire)} ${safetyBadge(safety)}</div>
      <p class="muted">${esc(user.company_city||'')}${user.company_size?` · ${esc(user.company_size)} ${T('employees')}`:''}</p>
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
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('What workers say')} ${ratingHead(rating)}</div>
      ${reviewList(reviews)}
    </div>
  </section>`;
}

function empJobs({ jobs }) {
  const open = jobs.filter(j=>j.status!=='closed').length;
  return `<section class="wrap">
    <div class="page-h"><h2>${T('Job Postings')}</h2><p class="muted">${open} ${T('open')}</p><a class="btn-sm right" href="/console/jobs/new">${T('+ Post a job')}</a></div>
    ${jobs.map(j=>`<div class="jobline ${j.status==='closed'?'is-closed':''}">
      <a class="jl-left" href="/console/jobs/${j.id}"><div class="badge">${tradeEmoji(j.trade)}</div>
        <div><h4>${esc(T(j.title))} ${j.status==='closed'?`<span class="closed-tag">${T('Closed')}</span>`:''}</h4>
          <div class="muted">${esc(j.city)} · $${j.pay_min}–${j.pay_max}/hr · ${esc(T(j.shift))}</div></div></a>
      <div class="jl-nums">
        <div><b>${j.matched}</b><span>${T('matched')}</span></div>
        <div><b>${j.applicants}</b><span>${T('applied')}</span></div>
        <form method="post" action="/console/jobs/${j.id}/${j.status==='closed'?'reopen':'close'}?from=list"><button class="btn-xs ${j.status==='closed'?'':'ghost'}">${j.status==='closed'?T('Reopen'):T('Close')}</button></form>
      </div>
    </div>`).join('') || `<div class="card muted">${T('No jobs yet. Post one to start matching.')}</div>`}
  </section>`;
}

const JOB_TYPES = ['Full-time','Part-time','Contract','Temp','Apprenticeship','Outcome-based'];
const DURATIONS = ['1 day','This weekend','1–2 weeks','1 month','3 months','6+ months','Ongoing'];
const CADENCE = { daily:'Daily pay', weekly:'Weekly pay', biweekly:'Biweekly pay', monthly:'Monthly pay' };
function cadenceBadge(c){ return CADENCE[c] ? `<span class="jtype cad">${T(CADENCE[c])}</span>` : ''; }
const SPONSORSHIP = { authorized:'Requires U.S. work authorization', h2a:'Offers H-2A (agricultural) visa sponsorship', h2b:'Offers H-2B (seasonal) visa sponsorship' };
const WORK_AUTH = { '':'Prefer not to say', authorized:'Authorized to work in the U.S.', need_h2a:'Seeking H-2A (agricultural) sponsorship', need_h2b:'Seeking H-2B (seasonal) sponsorship' };
// Informational sponsorship badge for a job. profile (optional) lets us note a match
// with what the worker is seeking. Never gates anyone out — purely informational.
function sponsorBadge(job, profile){
  const s = (job && job.sponsorship) || 'authorized';
  if(s!=='h2a' && s!=='h2b') return '';
  const label = s==='h2a' ? T('Sponsors H-2A visa') : T('Sponsors H-2B visa');
  const match = profile && ((s==='h2a'&&profile.work_auth==='need_h2a')||(s==='h2b'&&profile.work_auth==='need_h2b'));
  return `<span class="sponsor-badge${match?' match':''}" title="${T('Informational only — not legal advice')}">${icon('globe')} ${label}${match?` · ${T('matches you')}`:''}</span>`;
}
function empJobForm(error='', job=null) {
  const editing = !!job;
  const opts = tradeOptionsGrouped(editing ? job.trade : '');
  const reqSet = new Set(String(editing ? (job.req_creds||'') : '').split(',').map(s=>s.trim()).filter(Boolean));
  const cred = Object.entries(CRED_KINDS).map(([k,v])=>`<label class="ck"><input type="checkbox" name="req_creds" value="${k}" ${reqSet.has(k)?'checked':''}> ${v}</label>`).join('');
  const typeOpts = JOB_TYPES.map(t=>`<option ${editing&&job.employment_type===t?'selected':''}>${t}</option>`).join('');
  const shiftOpts = ['Day','Night','4x10','Any'].map(s=>`<option ${editing&&job.shift===s?'selected':''}>${s}</option>`).join('');
  const v = (k, dflt='') => editing && job[k]!=null ? esc(job[k]) : dflt;
  return `<section class="wrap narrow"><div class="card">
    <h2>${editing?T('Edit job'):T('Post a job')}</h2><p class="muted">${editing?T('Changes update matching and the live posting instantly.'):T("It's matched against the verified talent pool instantly.")}</p>
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="${editing?`/console/jobs/${job.id}/edit`:'/console/jobs/new'}">
      <label>${T('Posting as')} <select name="poster_kind">
        <option value="company" ${editing&&job.poster_kind!=='individual'?'selected':''}>${T('A company / contractor')}</option>
        <option value="individual" ${editing&&job.poster_kind==='individual'?'selected':''}>${T('A homeowner or small business (one-off job)')}</option>
      </select></label>
      <label>${T('Title')} <input name="title" required placeholder="${T('e.g. Fix a leaking faucet')}" value="${v('title')}"></label>
      <div class="row2"><label>${T('Trade')} <select name="trade">${opts}</select></label>
        <label>${T('Employment type')} <select name="employment_type">${typeOpts}</select></label></div>
      <div class="row2"><label>${T('Duration')} <select name="duration"><option value="">${T('Not specified')}</option>${DURATIONS.map(d=>`<option value="${d}" ${editing&&job.duration===d?'selected':''}>${T(d)}</option>`).join('')}</select></label>
        <label>${T('Pay cadence')} <select name="pay_cadence"><option value="">${T('Not specified')}</option>${Object.entries(CADENCE).map(([k,v])=>`<option value="${k}" ${editing&&job.pay_cadence===k?'selected':''}>${T(v)}</option>`).join('')}</select></label></div>
      <label class="ck"><input type="checkbox" name="quotes_ok" value="1" ${editing&&job.quotes_ok?'checked':''}> ${T('Let workers send me a price quote (instead of a fixed pay rate)')}</label>
      <div class="row2"><label>${T('Pay min ($/hr)')} <input type="number" name="pay_min" value="${v('pay_min','36')}"></label>
        <label>${T('Pay max ($/hr)')} <input type="number" name="pay_max" value="${v('pay_max','48')}"></label></div>
      <div class="row2"><label>${T('City')} <input name="city" value="${v('city','Phoenix')}"></label>
        <label>${T('ZIP')} <input name="zip" value="${v('zip','85004')}"></label></div>
      <label>${T('Shift')} <select name="shift">${shiftOpts}</select></label>
      <label>${T('Work authorization')} <select name="sponsorship">${Object.entries(SPONSORSHIP).map(([k,vv])=>`<option value="${k}" ${editing&&job.sponsorship===k?'selected':(k==='authorized'&&!(editing&&job.sponsorship)?'selected':'')}>${T(vv)}</option>`).join('')}</select></label>
      <p class="muted sm" style="margin-top:-4px">${T('If you sponsor H-2A/H-2B workers, candidates seeking that sponsorship will see it. Informational only — not legal advice.')}</p>
      <label class="ck"><input type="checkbox" name="crew_ok" value="1" ${editing&&job.crew_ok?'checked':''}> ${T('Open to crews — a worker can bring vetted teammates')}</label>
      <label class="ck"><input type="checkbox" name="fair_chance" value="1" ${editing&&job.fair_chance?'checked':''}> ${T('Fair-chance friendly — we consider applicants with a record')}</label>
      <label class="ck"><input type="checkbox" name="veteran_ok" value="1" ${editing&&job.veteran_ok?'checked':''}> ${T('Veteran-friendly — military experience valued')}</label>
      <label class="ck"><input type="checkbox" name="transport_provided" value="1" ${editing&&job.transport_provided?'checked':''}> ${T('Transport provided — we get workers to the site')}</label>
      <label class="ck"><input type="checkbox" name="subcontract_ok" value="1" ${editing&&job.subcontract_ok?'checked':''}> ${T('Open to subcontractors / owner-operators (1099)')}</label>
      <label>${T('Required credentials')}</label><div class="ckrow">${cred}</div>
      <label>${T('Description')} <textarea name="descr" rows="3">${v('descr')}</textarea></label>
      <button class="btn full">${editing?T('Save changes'):T('Post & match')}</button>
    </form>
  </div></section>`;
}

const STAGES = ['Sourced','Screened','Interview','Offer','Hired'];
function empPipeline({ job, columns, candidates, jobMedia = [], alerted = 0, sourced = 0, quotes = [] }) {
  const quotesCard = job.quotes_ok ? `<div class="card">
    <div class="sec-h" style="margin-top:0">${T('Price quotes')} <span class="muted sm">${quotes.length} ${quotes.length===1?T('quote'):T('quotes')}</span></div>
    ${quotes.length ? quotes.map(q=>`<div class="quote-row ${q.status}">
      <a class="quote-who cand-link" href="/console/candidates/${q.worker_id}"><span class="av-t">${initials(q.name)}</span>${esc(q.name)}</a>
      <div class="quote-amt">$${q.amount} <span class="muted sm">${T('per '+(q.unit||'job'))}</span></div>
      ${q.note?`<div class="quote-note muted sm">${esc(q.note)}</div>`:''}
      <div class="quote-act">${q.status==='accepted'?`<span class="v ok">${T('Accepted')}</span>`:q.status==='declined'?`<span class="v pending">${T('Not selected')}</span>`:`<form method="post" action="/console/jobs/${job.id}/quotes/${q.id}/accept"><button class="btn-xs">${T('Accept quote')}</button></form>`}</div>
    </div>`).join('') : `<p class="muted sm">${T('No quotes yet — they’ll appear here as workers bid.')}</p>`}
  </div>` : '';
  const cols = STAGES.map(st=>`<div class="col"><div class="col-h">${st} <span>${(columns[st]||[]).length}</span></div>
    ${(columns[st]||[]).map(a=>`<div class="pcard">
        <a class="pc-nm cand-link" href="/console/candidates/${a.worker_id}"><span class="av-t">${initials(a.name)}</span>${esc(a.name)}</a>
        <div class="muted sm">${TRADES[a.trade]||a.trade}</div>
        <div class="pc-ft"><span class="score-tag ${scoreClass(a.score)}">${a.score}</span>
          <form method="post" action="/console/applications/${a.app_id}/stage" class="stageform">
            <select name="stage" onchange="this.form.submit()">${STAGES.map(s=>`<option ${s===st?'selected':''}>${s}</option>`).join('')}</select>
          </form></div>
        ${st==='Hired' ? (a.outcome
          ? `<div class="pc-out ${a.outcome}">${({showed:T('✓ Showed up'),noshow:T('✗ No-showed'),cancelled:T('Cancelled w/ notice')})[a.outcome]||a.outcome}</div>`
          : `<div class="pc-outset"><span class="muted sm">${T('Did they show?')}</span>${[['showed','✓'],['noshow','✗'],['cancelled','~']].map(([v,g])=>`<form method="post" action="/console/applications/${a.app_id}/outcome"><input type="hidden" name="outcome" value="${v}"><button class="btn-xs ${v==='showed'?'':'ghost'}" title="${({showed:T('Showed up'),noshow:T('No-showed'),cancelled:T('Cancelled with notice')})[v]}">${g}</button></form>`).join('')}</div>`) : ''}
      </div>`).join('')}
    </div>`).join('');
  return `<section class="wrap">
    <a class="back" href="/console/jobs">← All jobs</a>
    <div class="page-h"><h2>${esc(T(job.title))} ${job.status==='closed'?`<span class="closed-tag">${T('Closed')}</span>`:''}</h2>
      <p class="muted">$${job.pay_min}–${job.pay_max}/hr · ${esc(job.city)}</p>
      <a class="btn-sm ghost right" href="/console/jobs/${job.id}/edit">${T('Edit')}</a>
      <form method="post" action="/console/jobs/${job.id}/${job.status==='closed'?'reopen':'close'}"><button class="btn-sm ${job.status==='closed'?'':'ghost'}">${job.status==='closed'?T('Reopen job'):T('Close job')}</button></form></div>
    ${job.status==='closed'?`<div class="card warn-card">${T('This job is closed — it’s hidden from worker search and the map. Reopen it to keep matching.')}</div>`:''}
    ${alerted>0?`<div class="ok-card">${icon('bell','xic')} ${alerted} matching worker${alerted===1?'':'s'} with alerts on ${alerted===1?'was':'were'} notified about this job.</div>`:''}
    ${sourced>0?`<div class="ok-card">${icon('spark','xic')} ${T('Sourcing Agent added')} ${sourced} ${sourced===1?T('candidate'):T('candidates')} ${T('to your pipeline.')}</div>`:''}
    <div class="card agent-card row">
      <div><div class="agent-h">${icon('spark','xic')} ${T('Sourcing Agent')}</div>
        <p class="agent-line">${T('Scan all verified workers and auto-add the strongest matches to this pipeline.')}</p></div>
      <form method="post" action="/console/jobs/${job.id}/source"><button class="btn-sm">${T('Auto-source candidates')}</button></form>
    </div>
    ${quotesCard}
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Photos of the work')} <span class="muted sm">${T('candidates see these on the job')}</span></div>
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
  const tradeOpts = `<option value="">${T('All trades')}</option>`+Object.entries(TRADES).map(([k,v])=>`<option value="${k}" ${filters.trade===k?'selected':''}>${esc(T(v))}</option>`).join('');
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
      <table class="tbl wide"><tr><th>${T('Candidate')}</th><th>${T('Trade')}</th><th>${T('Exp')}</th><th>${T('Credentials')}</th><th>${T('Readiness')}</th><th>${T('Pay floor')}</th></tr>
      ${rows.map(w=>`<tr><td><a class="cand-link" href="/console/candidates/${w.id}"><span class="av-t">${initials(w.name)}</span> ${esc(w.name)}</a>${w.available?`<span class="avail-dot" title="${T('Available for work')}">${icon('dot')}</span>`:''}${w.work_today?`<span class="today-chip" title="${T('Can work today')}">${icon('bolt')}</span>`:''}${w.relocate?`<span class="today-chip" title="${T('Open to relocate')}">${icon('send')}</span>`:''}</td>
        <td>${esc(T(TRADES[w.trade]||w.trade))}</td><td>${w.years_exp} ${T('yr')}</td>
        <td>${w.creds.map(c=>`<span class="cred-chip">${esc(c.name)}</span>`).join('')||'<span class="muted">—</span>'}</td>
        <td><span class="score-tag ${scoreClass(w.readiness)}">${w.readiness}</span></td>
        <td>$${w.pay_floor}/hr</td></tr>`).join('') || `<tr><td colspan=6 class="muted">${T('No matches for these filters.')}</td></tr>`}
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
function empCandidate({ worker, profile, creds, matches, apps, messages, meId, notes = [], saved = false, portfolio = [], work = [], rating = {avg:0,count:0}, reviews = [], canReviewJob = null, myReview = null, interviews = {}, screen = null, showUp = {}, crew = [], inviteBack = null }) {
  const stageByJob = {}; for (const a of apps) stageByJob[a.job_id] = a.stage;
  const screenPanel = (jobId) => (screen && screen.jobId===jobId) ? `<div class="iv">
    <div class="iv-h">${icon('spark','xic')} ${T('AI screen')}${screen.ai?'':` <span class="muted sm">(${T('offline')})</span>`}</div>
    <p class="agent-line sm">${esc(screen.summary)}</p>
    <ol class="screen-q">${(screen.questions||[]).map(q=>`<li>${esc(q)}</li>`).join('')}</ol></div>` : '';
  return `<section class="wrap narrow">
    <div class="cand-top"><a class="back" href="/console/search">← ${T('Talent Search')}</a>
      ${inviteBack?`<form method="post" action="/console/candidates/${worker.id}/inviteback"><input type="hidden" name="job_id" value="${inviteBack.jobId}"><button class="btn-sm">${icon('star')} ${T('Invite back')} → ${esc(inviteBack.title)}</button></form>`:''}
      <form method="post" action="/console/candidates/${worker.id}/save">
        <button class="btn-sm ${saved?'':'ghost'}">${saved?T('★ Saved'):T('☆ Save to shortlist')}</button>
      </form>
    </div>
    <div class="card profile-head">
      <div class="big-av">${initials(worker.name)}</div>
      <h2>${esc(worker.name)}</h2>
      ${profile.headline?`<p class="headline">${esc(profile.headline)}</p>`:''}
      <div class="chips">${tradeChips(profile)}</div>
      <p class="muted">${esc(profile.city)} ${esc(profile.zip||'')} · ${profile.years_exp} yrs experience · seeks $${profile.pay_floor}+/hr</p>
      <div class="rating-row">${ratingHead(rating)} ${showUpBadge(showUp)}</div>
      ${profile.available?`<div class="avail-badge">${icon('dot','xic')} ${T('Available for work')}</div>`:`<div class="avail-badge off">${T('Not currently available')}</div>`}${profile.work_today?`<div class="avail-badge today">${icon('bolt','xic')} ${T('Can work today')}</div>`:''}${profile.relocate?`<div class="avail-badge relo">${icon('send','xic')} ${T('Open to relocate')}</div>`:''}${profile.veteran?`<div class="avail-badge vet">${icon('shield','xic')} ${T('Veteran')}</div>`:''}${profile.self_employed?`<div class="avail-badge sub">${icon('hammer','xic')} ${T('Owner-operator · subcontracts')}</div>`:''}
      <div class="ministats">
        <div><b>${profile.readiness}</b><span>READINESS</span></div>
        <div><b>${creds.filter(c=>c.verified).length}</b><span>VERIFIED</span></div>
        <div><b>${creds.length}</b><span>CREDENTIALS</span></div>
      </div>
      ${(profile.about||profile.bio)?`<p class="cand-bio">${esc(profile.about||profile.bio)}</p>`:''}
    </div>
    ${work.length?`<div class="card"><div class="sec-h" style="margin-top:0">${T('Work history')}</div>${workHistoryList(work, false)}</div>`:''}
    ${crew.length?crewCard({crew, editable:false}):''}
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Credential wallet')}</div>
      ${creds.map(c=>credRow(c)).join('') || `<p class="muted">${T('No credentials listed yet.')}</p>`}
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Portfolio')} <a href="/p/${worker.id}" target="_blank" rel="noopener">${T('Public page ↗')}</a> <button class="btn-xs ghost" type="button" onclick="var u=location.origin+'/p/${worker.id}';navigator.clipboard&&navigator.clipboard.writeText(u);this.textContent='${T('Link copied ✓')}'">${T('Copy link')}</button></div>
      ${mediaGallery(portfolio) || '<p class="muted sm">No portfolio pieces yet.</p>'}
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Fit for your jobs')}</div>
      ${matches.length ? matches.map(m=>`<div class="cand-fit">
        <div class="cf-top">
          <div><b>${esc(m.job.title)}</b> <span class="muted sm">$${m.job.pay_min}–${m.job.pay_max}/hr · ${esc(m.job.city)} · ${esc(m.job.shift)}</span></div>
          <span class="score-pill ${scoreClass(m.score)}">${m.score}<small>match</small></span>
        </div>
        ${payFitBadge(profile.pay_floor, m.job, 'recruiter')}
        <div class="breakdown sm">${bd(T('Trade fit'),m.breakdown.trade,45)}${bd(T('Pay'),m.breakdown.pay,20)}${bd(T('Location'),m.breakdown.loc,20)}${bd(T('Credentials'),m.breakdown.cred,15)}</div>
        ${m.missing.length?`<div class="muted sm">Missing: ${m.missing.map(k=>CRED_KINDS[k]||k).join(', ')}</div>`:''}
        <div class="cf-act">${stageByJob[m.job.id]
          ? `<span class="stage-pill">In pipeline · ${esc(stageByJob[m.job.id])}</span>`
          : `<form method="post" action="/console/jobs/${m.job.id}/add"><input type="hidden" name="worker_id" value="${worker.id}"><button class="btn-sm">+ Add to pipeline</button></form>`}</div>
        ${stageByJob[m.job.id] ? `<div class="agent-row">
          <form method="post" action="/console/candidates/${worker.id}/screen"><input type="hidden" name="job_id" value="${m.job.id}"><button class="btn-xs">${icon('spark')} ${T('AI screen')}</button></form>
          ${interviews[m.job.id]?'':`<form method="post" action="/console/candidates/${worker.id}/autoschedule"><input type="hidden" name="job_id" value="${m.job.id}"><button class="btn-xs ghost">${icon('spark')} ${T('Auto-schedule')}</button></form>`}
        </div>` : ''}
        ${screenPanel(m.job.id)}
        ${stageByJob[m.job.id] ? (interviews[m.job.id] ? interviewEmp(interviews[m.job.id]) : interviewProposeForm(m.job.id, worker.id)) : ''}
      </div>`).join('') : `<p class="muted">You have no open jobs yet. <a href="/console/jobs/new">Post a job</a> to see how this candidate fits.</p>`}
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Reviews')} ${ratingHead(rating)}</div>
      ${reviewList(reviews)}
      ${canReviewJob ? (myReview
        ? `<div class="ok-card sm">${T('You rated this hire')} ${starBar(myReview.stars)}</div>`
        : `<div class="rev-cta"><div class="muted sm">${T('You hired this worker — leave a review:')}</div>${reviewForm({action:`/console/candidates/${worker.id}/review`, hidden:{job_id:canReviewJob}, label:T('Submit review'), prompt:T('How was their work?')})}</div>`) : ''}
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
  jobDetail, workerProfile, workerApplications, publicPortfolio, empOverview, empAnalytics, empJobs, empJobForm, empPipeline, empSearch, empCandidate, empShortlist, inbox, ogImage, STAGES, JOB_TYPES, DURATIONS, empCompany, workerTraining, pulsePage, publicJob, workerCoach, agentApplyResult, onboardChat, agentsHub, workHub, SPONSORSHIP };
