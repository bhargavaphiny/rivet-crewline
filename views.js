'use strict';
/*
 * Rivet x Crewline - server-side HTML views.
 * Plain template-literal rendering. No template engine, no client framework.
 */
const { TRADES, CRED_KINDS, TRAINING, CATEGORIES, BALANCE_LABEL: M_BALANCE_LABEL } = require('./matching');
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
  mic:     { f:0, p:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>' },
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
  equipment_tech:'wrench',process_tech:'layers',cleanroom_op:'box',machine_operator:'toolbox',assembler:'box',
  maintenance_tech:'wrench',quality_inspector:'check',patient_care_tech:'heart',sterile_processing:'shield',surgical_tech:'cross',
};

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const initials = name => esc((name||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase());

// ---------- i18n (en / es) ----------
let LANG = 'en';
function setLang(l){ LANG = (l === 'es') ? 'es' : 'en'; }
const I18N = {
  en: {
    nav_login:'Log in', nav_get_started:'Get started', nav_home:'Home', nav_find_work:'Jobs', nav_industries:'Industries', nav_careers:'Careers', nav_shifts:'Shifts',
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
    nav_login:'Entrar', nav_get_started:'Empezar', nav_home:'Inicio', nav_find_work:'Empleos', nav_industries:'Industrias', nav_careers:'Carreras', nav_shifts:'Turnos',
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
  'You':'Tú','commute':'traslado','within':'a menos de','mi of you':'mi de ti','Zoom to me':'Acercar a mí','Within reach':'A tu alcance','View all US':'Ver todo EE. UU.','Near me':'Cerca de mí','Opportunity map':'Mapa de oportunidades','Tap a pin to see openings there':'Toca un pin para ver las vacantes ahí','Tap any pin to see them':'Toca cualquier pin para verlos','Number on a pin = openings · tap to see them':'El número en el pin = vacantes · toca para verlas',
  'Filter by type':'Filtrar por tipo','All types':'Todos los tipos','No openings in this type here.':'No hay vacantes de este tipo aquí.',
  'AI mock interview':'Entrevista simulada con IA','Practice the interview for this job':'Practica la entrevista para este empleo','Question':'Pregunta','of':'de','Complete':'Completo','ready':'listo','Strongest':'Lo más fuerte','Work on':'Mejora','Practice again':'Practicar de nuevo','Apply to this job →':'Postúlate a este empleo →','See matching jobs →':'Ver empleos compatibles →','Answer':'Responder','Speak':'Hablar','Type or tap the mic and speak your answer…':'Escribe o toca el micrófono y di tu respuesta…','Back to the job':'Volver al empleo','Needs work':'A mejorar','Solid':'Sólido','Strong':'Fuerte','You’re interview-ready. Go get it.':'Estás listo para la entrevista. ¡A por ello!','Solid — a little polish and you’re there.':'Bien — un poco de pulido y lo tienes.','Good start — a few reps will get you ready.':'Buen comienzo — con algo de práctica estarás listo.',
  'Construction & trades':'Construcción y oficios','Drivers & logistics':'Conductores y logística','Mechanical & repair':'Mecánica y reparación',
  'Healthcare & care':'Salud y cuidado','Food service':'Servicio de comida','Agriculture':'Agricultura',
  'Cleaning & facilities':'Limpieza e instalaciones','Security':'Seguridad','Freelance & gig':'Independiente y por encargo','Manufacturing & semiconductor':'Manufactura y semiconductores',
  'Semiconductor':'Semiconductores','Manufacturing':'Manufactura','Healthcare':'Salud','Your other trades':'Tus otros oficios','Other trades':'Otros oficios',
  'Sourced':'Captado','Screened':'Filtrado','Interview':'Entrevista','Offer':'Oferta','Match':'Coincidencia','Pipeline':'Flujo','All jobs':'Todos los empleos',
  'matching worker with alerts on was notified about this job.':'trabajador compatible con alertas activas fue notificado sobre este empleo.',
  'matching workers with alerts on were notified about this job.':'trabajadores compatibles con alertas activas fueron notificados sobre este empleo.',
  'Add photos or a video of the site / work to be done — it helps candidates self-qualify.':'Agrega fotos o un video del sitio / trabajo a realizar — ayuda a los candidatos a autocalificarse.',
  'Image URL or YouTube / Vimeo link':'URL de imagen o enlace de YouTube / Vimeo','Title — e.g. Rooftop unit replacement':'Título — p. ej. Reemplazo de unidad en azotea',
  'Short caption (optional)':'Descripción breve (opcional)','Add photo / video':'Agregar foto / video',
  'Recommended candidates (not yet in pipeline)':'Candidatos recomendados (aún no en el flujo)','No more candidates to recommend.':'No hay más candidatos para recomendar.',
  'Supply vs demand':'Oferta vs demanda','where workers have the most leverage':'dónde los trabajadores tienen más ventaja',
  'Live openings vs available workers, weighted by national trade shortages.':'Vacantes activas vs trabajadores disponibles, ponderado por la escasez nacional de oficios.',
  'available workers':'trabajadores disponibles','workers':'trabajadores','demand':'demanda',
  'Estimate blends Rivet activity with public labor data.':'La estimación combina la actividad de Rivet con datos públicos de empleo.',
  'Very short-staffed':'Muy escaso de personal','Short-staffed':'Escaso de personal','Balanced':'Equilibrado','Competitive':'Competitivo','vs supply':'vs oferta',
  'This trade is very short-staffed nationwide. Move fast — bump pay or widen your radius to fill it.':'Este oficio tiene mucha escasez de personal a nivel nacional. Actúa rápido — sube el pago o amplía tu radio para cubrirlo.',
  'Short-staffed trade — hiring is competitive. A pay bump or wider radius will speed up your fill.':'Oficio con escasez — contratar es competitivo. Subir el pago o ampliar el radio acelerará la contratación.',
  'Balanced market. Standard effort should fill this role at a fair rate.':'Mercado equilibrado. Un esfuerzo normal debería cubrir este puesto a una tarifa justa.',
  'Lots of available workers for this trade — expect strong applicant flow.':'Muchos trabajadores disponibles para este oficio — espera un buen flujo de solicitantes.',
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
    nav = `<a class="nav-link ${active==='sectors'?'on':''}" href="/sectors">${t('nav_industries')}</a>
           <a class="nav-link ${active==='careers'?'on':''}" href="/careers">${t('nav_careers')}</a>
           <a class="nav-link" href="/login">${t('nav_login')}</a>
           <a class="btn-sm" href="/signup">${t('nav_get_started')}</a>${langTg}`;
  } else if ((user.mode || user.role) === 'worker') {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    const msg = `<a class="nav-link ${active==='msgs'?'on':''}" href="/app/messages">${t('nav_messages')}${user.unread?`<span class="ndot">${user.unread}</span>`:''}</a>`;
    const offers = `<a class="nav-link ${active==='offers'?'on':''}" href="/app/offers">${T('Offers')}${user.offers?`<span class="ndot hot">${user.offers}</span>`:''}</a>`;
    nav = `${L('/app',t('nav_home'),'home')}${L('/app/jobs',t('nav_find_work'),'jobs')}${offers}${L('/app/shifts',t('nav_shifts'),'shifts')}${L('/app/agents',t('nav_agents'),'agents')}${L('/app/profile',t('nav_work_card'),'profile')}${L('/app/applications',t('nav_applications'),'apps')}${L('/app/grow',T('Grow'),'grow')}${L('/pulse',t('nav_pulse'),'pulse')}${msg}
           ${modeTg('work')}
           <span class="who">${initials(user.name)}</span>
           <a class="nav-link" href="/logout">${t('nav_logout')}</a>${langTg}`;
  } else {
    const L = (h,l,k)=>`<a class="nav-link ${active===k?'on':''}" href="${h}">${l}</a>`;
    const msg = `<a class="nav-link ${active==='msgs'?'on':''}" href="/console/messages">${t('nav_messages')}${user.unread?`<span class="ndot">${user.unread}</span>`:''}</a>`;
    nav = `${L('/console',t('nav_overview'),'ov')}${L('/console/search',t('nav_talent'),'search')}${L('/console/jobs',t('nav_jobs'),'jobs')}${L('/console/shifts',t('nav_shifts'),'shifts')}${L('/console/agents',t('nav_agents'),'agents')}${L('/console/analytics',t('nav_analytics'),'analytics')}${L('/pulse',t('nav_pulse'),'pulse')}${msg}
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
  <link rel="stylesheet" href="/vendor/leaflet/leaflet.css">
  <link rel="stylesheet" href="/vendor/markercluster/MarkerCluster.css">
  <script src="/vendor/leaflet/leaflet.js"></script>
  <script src="/vendor/markercluster/leaflet.markercluster.js"></script>
  <link rel="stylesheet" href="/styles.css?v=102">
  </head><body>
  <a class="skip" href="#main">Skip to main content</a>
  <header class="topbar"><div class="bar wrap">${brand}<nav aria-label="Primary">${nav}</nav></div></header>
  ${flash?`<div class="flash wrap">${esc(flash)}</div>`:''}
  <main id="main">${body}</main>
  ${user ? voiceAgent(user.mode || user.role) : ''}
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
function authForm(kind, { role = 'worker', error = '', google = false, ref = '', refName = '' } = {}) {
  const isSignup = kind === 'signup';
  const refQ = ref ? '&ref='+encodeURIComponent(ref) : '';
  const googleBtn = google ? `
      <a class="gbtn full" id="gbtn" href="/auth/google?role=${esc(role)}">
        <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
        ${t('auth_google')}
      </a>` : '';
  const phoneBtn = `
      <a class="gbtn full" id="phonebtn" href="/phone?role=${esc(role)}${refQ}">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="#13212B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
        ${t('auth_phone')}
      </a>`;
  const googleBlock = `${googleBtn}${phoneBtn}<div class="or"><span>${t('auth_or')}</span></div>`;
  return `<section class="wrap narrow">
    <div class="card auth">
      <h2>${isSignup?t('auth_create'):t('auth_welcome')}</h2>
      ${ref&&refName&&isSignup?`<div class="crew-invite">${icon('spark','xic')} ${T('You’re joining')} <b>${esc(refName)}</b>${T('’s crew on Rivet — free for workers, always.')}</div>`:''}
      ${error?`<div class="err">${esc(error)}</div>`:''}
      ${googleBlock}
      <form method="post" action="/${kind}">
        ${ref?`<input type="hidden" name="ref" value="${esc(ref)}">`:''}
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
// GTM-focused trade groups for the worker picker — Semiconductor → Manufacturing → Healthcare.
// (CATEGORIES stays untouched for map colors, tagging, and recruiter breadth.)
const PICKER_GROUPS = {
  'Semiconductor': ['equipment_tech','process_tech','cleanroom_op'],
  'Manufacturing': ['machine_operator','assembler','maintenance_tech','quality_inspector','machinist','welder','electrician','controls','millwright','sheet_metal','facilities'],
  'Healthcare': ['cna','caregiver','medical_assistant','patient_care_tech','phlebotomist','emt','sterile_processing','surgical_tech'],
};
function tradeCheckboxes(selected = []) {
  const sel = new Set(selected);
  const chip = k => `<label class="tradechk"><input type="checkbox" name="trades" value="${k}" ${sel.has(k)?'checked':''}><span>${tradeEmoji(k)} ${TRADES[k]||k}</span></label>`;
  const seen = new Set();
  let html = '';
  for(const [cat, keys] of Object.entries(PICKER_GROUPS)){
    const ks = keys.filter(k=>TRADES[k]); ks.forEach(k=>seen.add(k));
    if(!ks.length) continue;
    html += `<div class="tradecat">${T(cat)}</div><div class="tradegrid">${ks.map(chip).join('')}</div>`;
  }
  // Never silently drop a trade a worker already picked outside the three GTM sectors.
  const extra = [...sel].filter(k=>!seen.has(k) && TRADES[k]);
  if(extra.length) html += `<div class="tradecat">${T('Your other trades')}</div><div class="tradegrid">${extra.map(chip).join('')}</div>`;
  return html;
}
function workerOnboard(error='') {
  return `<section class="wrap narrow"><div class="card">
    <h2>${T('Set up your Work Card')}</h2>
    <p class="muted">${T('About 2 minutes. It’s what employers see — and it unlocks your real job matches near you. Free, always.')}</p>
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="/app/onboard">
      <label>Headline <input name="headline" maxlength="80" placeholder="e.g. Equipment maintenance tech — semiconductor fab"></label>
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
function workerHome({ user, profile, creds, matches, workCount = 0, portCount = 0, jobsGeo = null, isNew = false, coach = null, needZip = false, seasonHint = null, inbound = null }) {
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
      ${xToggle('/app/extra', profile.open_to_extra, 'bolt', T('Open to extra work ✓'), T('I want extra / multiple jobs'), '/app')}
    </div>
    ${welcome}
    ${inbound && inbound.count ? `<a class="offer-banner" href="/app/offers">${icon('bell','xic')}
      <span><b>${inbound.pending?`${inbound.pending} ${inbound.pending===1?T('employer wants to interview you'):T('employers want to interview you')}`:`${inbound.count} ${inbound.count===1?T('employer is interested in you'):T('employers are interested in you')}`}</b>
      — ${T('verified employers came to you')}</span> <span class="invite-go">${T('View')} →</span></a>` : ''}
    <a class="invite-cta" href="/app/invite">${icon('spark','xic')} <span><b>${T('Invite your crew')}</b> — ${T('bring the people you work with; get hired as a team')}</span> <span class="invite-go">${T('Invite')} →</span></a>
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

// ---------- Career-advancement ladders (real US progressions + typical pay per rung) ----------
// Each rung: t=title, k=trade key if it maps to a Rivet trade (current-rung detection), pay, add=what unlocks it.
const LADDERS = {
  cna: [{t:'CNA',k:'cna',pay:'$18–25/hr'},{t:'Patient Care Tech',k:'patient_care_tech',pay:'$18–25/hr',add:'EKG + phlebotomy skills (on-the-job)'},{t:'LPN',pay:'~$59k/yr',add:'LPN program + NCLEX-PN'},{t:'RN',pay:'~$86k/yr',add:'ADN/BSN + NCLEX-RN'}],
  patient_care_tech: [{t:'CNA',k:'cna',pay:'$18–25/hr'},{t:'Patient Care Tech',k:'patient_care_tech',pay:'$18–25/hr'},{t:'LPN',pay:'~$59k/yr',add:'LPN program + NCLEX-PN'},{t:'RN',pay:'~$86k/yr',add:'ADN/BSN + NCLEX-RN'}],
  medical_assistant: [{t:'Medical Assistant',k:'medical_assistant',pay:'$20–30/hr'},{t:'Lead MA',pay:'+$3–5/hr',add:'experience + leadership'},{t:'LPN / RN',pay:'$59k–86k/yr',add:'nursing program'}],
  phlebotomist: [{t:'Phlebotomist',k:'phlebotomist',pay:'$19–27/hr'},{t:'Lab Assistant',pay:'+$2–4/hr',add:'lab experience'},{t:'Medical Lab Technician',pay:'~$57k/yr',add:'MLT associate + ASCP'}],
  surgical_tech: [{t:'Surgical Tech',k:'surgical_tech',pay:'$25–36/hr'},{t:'Certified (CST)',pay:'+$2–4/hr',add:'CST cert (NBSTSA)'},{t:'Surgical First Assistant',pay:'~$70k+/yr',add:'CSFA program'}],
  sterile_processing: [{t:'Sterile Processing Tech',k:'sterile_processing',pay:'$19–27/hr'},{t:'Certified (CRCST)',pay:'+$2–4/hr',add:'CRCST (HSPA)'},{t:'Lead / Supervisor',pay:'+$5–8/hr',add:'experience + leadership'}],
  cleanroom_op: [{t:'Cleanroom Operator',k:'cleanroom_op',pay:'$21–30/hr'},{t:'Process Technician',k:'process_tech',pay:'$24–36/hr',add:'process training on the job'},{t:'Equipment Technician',k:'equipment_tech',pay:'$28–44/hr',add:'equipment-maintenance skills'},{t:'Process Engineer',pay:'$90k+/yr',add:'associate/bachelor + experience'}],
  process_tech: [{t:'Cleanroom Operator',k:'cleanroom_op',pay:'$21–30/hr'},{t:'Process Technician',k:'process_tech',pay:'$24–36/hr'},{t:'Equipment Technician',k:'equipment_tech',pay:'$28–44/hr',add:'equipment-maintenance skills'},{t:'Process Engineer',pay:'$90k+/yr',add:'associate/bachelor + experience'}],
  equipment_tech: [{t:'Equipment Technician',k:'equipment_tech',pay:'$28–44/hr'},{t:'Senior / Lead Tech',pay:'+$4–8/hr',add:'tenure + advanced training'},{t:'Maintenance Supervisor',pay:'$75k+/yr',add:'leadership'},{t:'Reliability / Controls Engineer',pay:'$95k+/yr',add:'degree / deep experience'}],
  maintenance_tech: [{t:'Maintenance Tech',k:'maintenance_tech',pay:'$26–40/hr'},{t:'Lead Tech',pay:'+$4–8/hr',add:'multi-craft skills (electrical, hydraulics, PLC)'},{t:'Facilities / Reliability Engineer',pay:'$90k+/yr',add:'degree / experience'}],
  machinist: [{t:'Machinist',k:'machinist',pay:'$26–42/hr'},{t:'CNC Programmer',pay:'+$5–10/hr',add:'CAM / G-code + NIMS'},{t:'Tool & Die Maker',pay:'$63k+/yr',add:'apprenticeship'},{t:'Shop Lead',pay:'+$8/hr',add:'leadership'}],
  welder: [{t:'Welder',k:'welder',pay:'$26–42/hr'},{t:'Certified / 6G Welder',pay:'+$4–10/hr',add:'AWS cert + all positions'},{t:'Welding Inspector (CWI)',pay:'$70k+/yr',add:'AWS CWI'},{t:'Welding Supervisor',pay:'+$10/hr',add:'leadership'}],
  assembler: [{t:'Assembler',k:'assembler',pay:'$20–30/hr'},{t:'Lead Assembler',pay:'+$3–5/hr',add:'tenure'},{t:'Quality Inspector',k:'quality_inspector',pay:'$22–34/hr',add:'GD&T + gauges'},{t:'Manufacturing Technician',pay:'$28–44/hr',add:'equipment / maintenance training'}],
  machine_operator: [{t:'Machine Operator',k:'machine_operator',pay:'$20–30/hr'},{t:'Line Lead',pay:'+$3–5/hr',add:'tenure'},{t:'Maintenance Tech',k:'maintenance_tech',pay:'$26–40/hr',add:'OSHA + mechanical skills'},{t:'Maintenance Supervisor',pay:'$70k+/yr',add:'leadership'}],
  quality_inspector: [{t:'Quality Inspector',k:'quality_inspector',pay:'$22–34/hr'},{t:'QA Technician',pay:'+$3–6/hr',add:'ASQ + SPC'},{t:'Quality Engineer',pay:'$75k+/yr',add:'degree / CQE'}],
  electrician: [{t:'Apprentice',pay:'$18–26/hr'},{t:'Journeyman Electrician',k:'electrician',pay:'$30–46/hr',add:'apprenticeship + license'},{t:'Master Electrician',pay:'+$8–12/hr',add:'master exam + hours'},{t:'Electrical Contractor',pay:'$90k+/yr',add:'contractor license + business'}],
  hvac: [{t:'HVAC Installer',pay:'$20–30/hr'},{t:'HVAC Service Tech',k:'hvac',pay:'$26–42/hr',add:'EPA 608 + experience'},{t:'Lead Tech',pay:'+$5–8/hr',add:'NATE + leadership'},{t:'HVAC Contractor',pay:'$85k+/yr',add:'contractor license'}],
  automotive_tech: [{t:'Auto Technician',k:'automotive_tech',pay:'$24–40/hr'},{t:'ASE Master Tech',pay:'+$6–10/hr',add:'ASE Master certs'},{t:'Shop Foreman',pay:'+$8/hr',add:'leadership'},{t:'Service Manager',pay:'$70k+/yr',add:'management'}],
};
// Real "how people actually climb" advice per sector (Rivet guidance — not fake user posts).
const CLIMB_TIPS = {
  healthcare: ['Ask your employer about tuition reimbursement — many hospitals pay for CNA→LPN→RN school if you stay.','Pick up float/per-diem shifts in new units (ER, OR, ICU) to build the skills that get you promoted.','Get BLS and any unit certs early — they’re fast, cheap, and bump your pay and options.'],
  semiconductor: ['Volunteer for cross-training on new tools — equipment techs out-earn operators and it’s learned on the job.','Keep spotless SPC/recipe documentation and zero contamination — that’s what gets you moved into process roles.','Ask about the fab’s tuition or apprenticeship program — many pay for an associate degree toward engineering.'],
  manufacturing: ['Learn to read blueprints/GD&T and run the measuring tools — the fastest jump from operator to tech or quality.','Add a safety + trade cert (OSHA 30, NIMS, AWS) — multi-skilled techs get the maintenance and lead roles.','Say yes to PM and troubleshooting tasks — that’s how operators become maintenance techs (+$8–15/hr).'],
};
// ---------- Grow: career-advancement hub — climb the ladder, even while you're working ----------
function growHub({ profile, trade, reco, marketJobs = 0, avgHr = 0 }){
  if(!trade) return `<section class="wrap narrow"><div class="sec-h big">${icon('spark','xic')} ${T('Grow')}</div>
    <div class="card muted">${T('Add your trade to your Work Card and your coach will map your path up — the next rung, the credential that gets you there, and how to train for it.')} <a href="/app/profile">${T('Set up my Work Card')}</a></div></section>`;
  const label = TRADES[trade]||trade;
  const ladder = LADDERS[trade];
  const r = ROLE_BLS[trade]; const sec = r ? r.sector : '';
  const curIdx = ladder ? ladder.findIndex(x=>x.k===trade) : -1;
  const next = (ladder && curIdx>=0 && curIdx<ladder.length-1) ? ladder[curIdx+1] : null;
  const cred = reco && reco.topCred;
  return `<section class="wrap narrow">
    <a class="back" href="/app">← ${T('Home')}</a>
    <div class="sec-h big">${icon('spark','xic')} ${T('Grow')} <span class="muted">${esc(label)}</span></div>
    <div class="card agent-card">
      <div class="agent-h">${icon('bolt','xic')} ${T('Your next move')}</div>
      ${cred ? `<p class="agent-line big">${T('Add')} <b>${esc(cred.label)}</b> — ${T('unlocks')} ${cred.jobsUnlocked} ${T('more jobs near you')}${cred.payDelta>0?` ${T('at')} +$${cred.payDelta}/hr`:''}.</p>
        <div class="grow-cta">${cred.url?`<a class="btn-sm" href="${esc(cred.url)}" target="_blank" rel="noopener noreferrer">${T('How to earn it ↗')}</a>`:''}<a class="btn-sm ghost" href="/app/learn/interview?trade=${trade}">${T('Practice the interview')}</a></div>`
        : next ? `<p class="agent-line big">${T('Your next rung:')} <b>${esc(next.t)}</b> (${esc(next.pay)})${next.add?` — ${T('to get there:')} ${esc(next.add)}`:''}.</p>`
        : `<p class="agent-line big">${marketJobs?`${marketJobs} ${esc(label)} ${T('jobs are open near you')}${avgHr?` ${T('averaging')} ~$${avgHr}/hr`:''}. `:''}${T('Keep your skills sharp and climb.')}</p>`}
    </div>
    ${ladder ? `<div class="card"><div class="sec-h" style="margin-top:0">${T('Your career ladder')}</div>
      <div class="ladder">${ladder.map((x,i)=>`<div class="rung ${i===curIdx?'cur':''}${i===curIdx+1?' nextr':''}">
        <div class="rung-dot">${i<curIdx?icon('check'):(i===curIdx?'●':(i===curIdx+1?'→':'○'))}</div>
        <div class="rung-main"><div class="rung-top">${x.k&&ROLE_BLS[x.k]?`<a class="cand-link" href="/careers/${x.k}"><b>${esc(x.t)}</b></a>`:`<b>${esc(x.t)}</b>`} <span class="rung-pay">${esc(x.pay)}</span>${i===curIdx?`<span class="chip sm green">${T('You are here')}</span>`:''}</div>
          ${x.add&&i>curIdx?`<div class="muted sm">${T('To reach:')} ${esc(x.add)}</div>`:''}</div></div>`).join('')}</div>
      <p class="muted sm" style="margin-top:8px">${T('Typical U.S. pay — your market and employer vary. Source: BLS + industry.')}</p></div>` : ''}
    ${LEARN_TRACKS[trade] ? `<div class="card"><div class="sec-h" style="margin-top:0">${T('Keep getting better — 10 minutes at a time')}</div>
      ${learnVideo(trade, LEARN_TRACKS[trade].vid)}
      <div class="track-links">
        <a class="track-link prep" href="/app/learn/interview?trade=${trade}">${icon('spark')} ${T('AI interview rep')}</a>
        <a class="track-link" href="/app/prep${PREP_FOR[trade]?'/'+PREP_FOR[trade]:''}">${icon('star')} ${T('Practice for your credential')}</a>
        ${skillKeyFor(trade)?`<a class="track-link" href="/app/skillcheck/${skillKeyFor(trade)}">${icon('shield')} ${T('Take the Skill Check — earn a verified badge')}</a>`:''}
        ${ROLE_BLS[trade]?`<a class="track-link" href="/careers/${trade}">${icon('shield')} ${T('Full career guide')} →</a>`:''}
      </div></div>` : ''}
    ${sec&&CLIMB_TIPS[sec]?`<div class="card"><div class="sec-h" style="margin-top:0">${T('How people climb — from those who’ve done it')}</div>
      <ul class="climb-tips">${CLIMB_TIPS[sec].map(tip=>`<li>${icon('check')} ${T(tip)}</li>`).join('')}</ul>
      <div class="track-links" style="margin-top:6px">
        <a class="track-link" href="/pulse">${icon('spark')} ${T('Ask your trade community')} →</a>
        <a class="track-link" href="/app/invite">${icon('send')} ${T('Invite your crew — grow together')} →</a>
      </div></div>`:''}
    <a class="invite-cta" href="/app/earn">${icon('star','xic')} <span><b>${T('Earn while you learn')}</b> — ${T('real employers near you who train you on the job, plus paid programs')}</span> <span class="invite-go">${T('Open')} →</span></a>
    <div class="card" style="display:none">
      <div class="sec-h" style="margin-top:0">${T('Earn while you learn')}</div>
      <p class="muted sm" style="margin-top:-4px">${T('Get paid to train up — registered apprenticeships and employer-funded programs near you.')}</p>
      <div class="track-links">
        <a class="track-link" href="https://www.apprenticeship.gov/apprenticeship-job-finder?keyword=${encodeURIComponent(label)}" target="_blank" rel="noopener noreferrer">${icon('star')} ${T('Find a paid apprenticeship ↗')}</a>
        ${sec==='manufacturing'?`<a class="track-link" href="https://fame-usa.com/" target="_blank" rel="noopener noreferrer">${icon('star')} ${T('FAME earn-and-learn ↗')}</a>`:''}
        <a class="track-link" href="https://www.careeronestop.org/Toolkit/Training/find-local-training.aspx" target="_blank" rel="noopener noreferrer">${icon('star')} ${T('Free / low-cost training near you ↗')}</a>
      </div>
    </div>
  </section>`;
}
// ---------- Earn while you learn: real "will-train" jobs from the live board + official paid programs ----------
function earnLearn({ trade, jobs = [], tuitionJobs = [] }){
  const label = TRADES[trade]||trade;
  const sec = ROLE_BLS[trade] ? ROLE_BLS[trade].sector : '';
  const credKey = PREP_FOR[trade];
  const credName = credKey && CRED_QUIZ[credKey] ? CRED_QUIZ[credKey].label.replace(/ —.*$/,'') : '';
  const jobCard = (j, badge)=>`<div class="card app-card"><div class="job-row"><div class="badge">${tradeEmoji(j.trade)}</div>
    <div class="job-main"><h4>${esc(T(j.title))}</h4><div class="muted">${esc(j.company||'')} · ${esc(j.city||'')} · $${j.pay_min}–${j.pay_max}/hr</div>${badge?`<span class="match-chip" style="background:rgba(31,169,113,.13);color:#157a52;margin-top:4px;display:inline-block">${badge}</span>`:''}</div></div>
    <div class="app-act">${j.apply_url?`<a class="btn-sm" href="${esc(j.apply_url)}" target="_blank" rel="noopener noreferrer">${T('Apply')} ↗</a>`:`<a class="btn-sm" href="/app/jobs/${j.id}">${T('View')} →</a>`}</div></div>`;
  const askScript = `Hi — I’m excited about this role. I’m working to level up as a ${label||'skilled worker'} and earn my certifications. Do you offer tuition reimbursement, paid certification, or a registered apprenticeship? I’m committed to staying and putting it to work here.`;
  return `<section class="wrap narrow">
    <a class="back" href="/app/grow">← ${T('Grow')}</a>
    <div class="sec-h big">${icon('star','xic')} ${T('Get your training paid for')}${trade?` <span class="muted">${esc(label)}</span>`:''}</div>
    <p class="muted">${T('Three real ways to skill up without debt — employers who fund it, official earn-and-learn programs, and the public funding most workers never claim.')}</p>
    ${tuitionJobs.length?`<div class="sec-h">${icon('star','xic')} ${tuitionJobs.length} ${T('employers near you who’ll pay for your training')}</div>
      <p class="muted sm" style="margin-top:-6px">${T('These openings mention tuition help, paid certification, or sponsored training.')}</p>
      ${tuitionJobs.map(j=>jobCard(j, T('Pays for training'))).join('')}`:''}
    ${jobs.length?`<div class="sec-h">${jobs.length} ${T('“will-train” / entry openings near you')}</div>
      <p class="muted sm" style="margin-top:-6px">${T('Get hired first — these employers train you on the job, no experience needed.')}</p>
      ${jobs.map(j=>jobCard(j, null)).join('')}`
      : (tuitionJobs.length?'':`<div class="card muted">${T('No “will-train” postings in your trade right now — the official programs below pay you to learn.')}</div>`)}
    <div class="card"><div class="sec-h" style="margin-top:0">${icon('send','xic')} ${T('Ask any employer — most say yes if you ask')}</div>
      <p class="muted sm" style="margin-top:-2px">${T('Tuition help is common but you usually have to ask. Copy this and send it in your application or interview:')}</p>
      <div class="ask-script" id="askScript">${esc(askScript)}</div>
      <button class="btn-sm" type="button" onclick="var t=document.getElementById('askScript').innerText;if(navigator.clipboard){navigator.clipboard.writeText(t);this.textContent='${T('Copied ✓')}'}">${icon('send')} ${T('Copy the script')}</button>
      ${credKey?`<a class="btn-sm ghost" href="/app/prep/${credKey}" style="margin-left:6px">${T('Practice for your')} ${esc(credName)} →</a>`:''}
    </div>
    <div class="card"><div class="sec-h" style="margin-top:0">${T('Official programs that pay you to learn')}</div>
      <div class="track-links">
        <a class="track-link" href="https://www.apprenticeship.gov/apprenticeship-job-finder?keyword=${encodeURIComponent(label||'')}" target="_blank" rel="noopener noreferrer">${icon('star')} ${T('Registered apprenticeships (apprenticeship.gov) ↗')}</a>
        ${sec==='manufacturing'?`<a class="track-link" href="https://fame-usa.com/" target="_blank" rel="noopener noreferrer">${icon('star')} ${T('FAME earn-and-learn (manufacturing) ↗')}</a>`:''}
        ${sec==='healthcare'?`<a class="track-link" href="https://www.careeronestop.org/Toolkit/Training/find-scholarships.aspx" target="_blank" rel="noopener noreferrer">${icon('star')} ${T('Healthcare scholarships & tuition help ↗')}</a>`:''}
        <a class="track-link" href="https://www.careeronestop.org/Toolkit/Training/find-local-training.aspx" target="_blank" rel="noopener noreferrer">${icon('star')} ${T('Free / WIOA-funded local training ↗')}</a>
      </div>
      <p class="muted sm" style="margin-top:8px">${T('Tip: in any interview, ask if the employer pays for training or tuition — many do, and it’s how people climb without debt.')}</p>
    </div>
  </section>`;
}
// ---------- In-app credential practice quizzes (study practice, clearly not the official exam) ----------
const CRED_QUIZ = {
  osha10: { label:'OSHA 10 — Safety', qs:[
    { q:'What does PPE stand for?', o:['Personal Protective Equipment','Public Protection Enforcement','Plant Production Efficiency'], a:0, e:'PPE = Personal Protective Equipment — hard hat, eye/ear protection, gloves, etc.' },
    { q:'The #1 cause of construction deaths (“Fatal Four”) is:', o:['Loud noise','Falls','Paperwork'], a:1, e:'Falls lead OSHA’s Fatal Four, then struck-by, caught-in/between, and electrocution.' },
    { q:'Lockout/Tagout (LOTO) is used to:', o:['Lock the breakroom','Control hazardous energy during service','Track overtime'], a:1, e:'LOTO isolates and locks out energy so a machine can’t start while you service it.' },
    { q:'A Safety Data Sheet (SDS) tells you:', o:['The lunch menu','A chemical’s hazards and safe handling','Your pay rate'], a:1, e:'An SDS lists hazards, safe handling, required PPE, and first aid for a chemical.' },
    { q:'If you’re unsure a task is safe, you should:', o:['Do it fast','Stop and ask your supervisor','Skip your PPE'], a:1, e:'Stop-work authority: when in doubt, stop and ask. No job is worth an injury.' },
  ]},
  cna_cert: { label:'CNA Basics', qs:[
    { q:'The single most important infection-control step is:', o:['Wearing cologne','Hand hygiene','Charting fast'], a:1, e:'Hand hygiene is the #1 way to stop the spread of infection.' },
    { q:'“ADLs” stands for:', o:['Advanced Drug Lists','Activities of Daily Living','Automated Data Logs'], a:1, e:'ADLs = bathing, dressing, eating, toileting, mobility — the daily care CNAs assist with.' },
    { q:'Before any procedure with a resident you should:', o:['Start right away','Identify them and explain what you’ll do','Close the blinds'], a:1, e:'Always verify identity and explain — it protects safety and dignity.' },
    { q:'To prevent pressure injuries you should:', o:['Keep one position','Reposition regularly, keep skin clean & dry','Limit water'], a:1, e:'Scheduled repositioning plus clean, dry skin prevents bed sores.' },
    { q:'A confused resident becomes combative. First you:', o:['Restrain them','Stay calm, keep everyone safe, get help','Argue back'], a:1, e:'Stay calm, ensure safety, de-escalate, and call for help — never restrain improperly.' },
  ]},
  bls: { label:'BLS / CPR', qs:[
    { q:'Adult CPR compression rate is:', o:['60–80/min','100–120/min','200+/min'], a:1, e:'Push 100–120/min, ~2 inches deep, letting the chest fully recoil.' },
    { q:'The CPR sequence is:', o:['A-B-C','C-A-B (Compressions, Airway, Breathing)','Breaths only'], a:1, e:'Start compressions first — C-A-B.' },
    { q:'When an AED arrives you should:', o:['Wait for a doctor','Turn it on and follow the prompts','Ignore it'], a:1, e:'Power it on and follow the voice prompts — AEDs are built for lay rescuers.' },
    { q:'Minimize pauses in compressions because:', o:['It saves battery','Blood flow to the brain stops when you pause','It looks better'], a:1, e:'Keep interruptions under 10 seconds — every pause stops circulation.' },
  ]},
  forklift: { label:'Forklift Safety', qs:[
    { q:'Before each shift you must:', o:['Honk twice','Do a pre-operation inspection','Wash it'], a:1, e:'OSHA requires a daily pre-op check: brakes, horn, forks, leaks, tires.' },
    { q:'When traveling with a load, forks should be:', o:['Raised high','Low and tilted back','Pointed up'], a:1, e:'Carry low and tilted back for stability and visibility.' },
    { q:'A pedestrian steps into your path. You:', o:['Speed up','Stop and sound the horn','Raise the forks'], a:1, e:'Pedestrians have the right of way — stop, horn, proceed only when clear.' },
    { q:'The “stability triangle” helps prevent:', o:['Speeding tickets','Tip-overs','Flat tires'], a:1, e:'Keeping the center of gravity inside the stability triangle prevents tip-overs.' },
  ]},
  aws_welding: { label:'Welding Fundamentals', qs:[
    { q:'TIG welding is also called:', o:['GMAW','GTAW','SMAW'], a:1, e:'TIG = GTAW. MIG = GMAW, Stick = SMAW.' },
    { q:'The main eye hazard when welding is:', o:['Dust','Arc flash / UV radiation','Cold air'], a:1, e:'The arc emits intense UV — use the correct shade lens to prevent “arc eye.”' },
    { q:'A 6G pipe weld is performed at:', o:['Flat','45° fixed pipe (the hardest)','Horizontal'], a:1, e:'6G is a 45° fixed pipe — passing it qualifies you for most other positions.' },
    { q:'Porosity in a weld is caused by:', o:['Good shielding','Gas trapped in the weld','Slow pay'], a:1, e:'Porosity = trapped gas, often from poor shielding gas or contamination.' },
  ]},
  epa608: { label:'EPA 608 — Refrigerant', qs:[
    { q:'EPA 608 is required to:', o:['Drive a van','Handle refrigerants','Read a thermostat'], a:1, e:'Section 608 certification is legally required to service refrigerant-containing equipment.' },
    { q:'Venting most refrigerants to the air is:', o:['Encouraged','Illegal','Required'], a:1, e:'Knowingly venting is illegal — refrigerant must be recovered.' },
    { q:'Measuring superheat/subcooling helps you:', o:['Calculate overtime','Charge & diagnose a system','Weld pipe'], a:1, e:'It tells you if a system is correctly charged and helps diagnose faults.' },
  ]},
};
// trade → the credential quiz most relevant to it
const PREP_FOR = { cna:'cna_cert', patient_care_tech:'bls', surgical_tech:'bls', sterile_processing:'bls', medical_assistant:'bls',
  welder:'aws_welding', hvac:'epa608', warehouse:'forklift', machine_operator:'forklift',
  equipment_tech:'osha10', maintenance_tech:'osha10', electrician:'osha10', machinist:'osha10', assembler:'osha10', quality_inspector:'osha10', process_tech:'osha10', cleanroom_op:'osha10' };
function gradeQuiz(credKey, body){
  const quiz = CRED_QUIZ[credKey]; if(!quiz) return null;
  let score=0; const graded = quiz.qs.map((q,i)=>{ const chosen = Number(body['q'+i]); const correct = chosen===q.a; if(correct) score++;
    return { q:q.q, correct, correctText:q.o[q.a], chosenText:isNaN(chosen)?'':q.o[chosen], e:q.e }; });
  return { score, total:quiz.qs.length, graded };
}
function credPrepIndex(){
  return `<section class="wrap narrow">
    <a class="back" href="/app/grow">← ${T('Grow')}</a>
    <div class="sec-h big">${icon('star','xic')} ${T('Credential practice')} <span class="muted">${T('free study quizzes')}</span></div>
    <p class="muted sm">${T('Build confidence before the real exam. Quick, free, and you can retake any time.')}</p>
    <div class="track-grid">${Object.entries(CRED_QUIZ).map(([k,q])=>`<a class="card track-card" href="/app/prep/${k}">
      <div class="track-h"><span class="trend-ic">${icon('star')}</span><div><b>${esc(q.label)}</b><div class="muted sm">${q.qs.length} ${T('questions')}</div></div></div>
      <span class="sector-go">${T('Start practice')} →</span></a>`).join('')}</div>
  </section>`;
}
function credPrep(credKey, result){
  const quiz = CRED_QUIZ[credKey];
  if(!quiz) return `<section class="wrap narrow"><div class="card muted">${T('No practice quiz for that yet.')} <a href="/app/prep">${T('See all quizzes')}</a></div></section>`;
  if(result){
    const {score, total, graded} = result; const pct = Math.round(score/total*100);
    return `<section class="wrap narrow">
      <a class="back" href="/app/prep">← ${T('All quizzes')}</a>
      <div class="card agent-card" style="text-align:center"><div class="agent-h" style="justify-content:center">${icon('star','xic')} ${esc(quiz.label)}</div>
        <div class="verdict-ring ${pct>=80?'rate-strong':pct>=60?'rate-solid':'rate-weak'}" style="margin:10px auto"><b>${pct}%</b><span>${score}/${total}</span></div>
        <p class="agent-line">${pct>=80?T('Strong — you’re ready to sit the real exam.'):pct>=60?T('Close — review your misses and try again.'):T('Keep practicing — read each explanation below.')}</p></div>
      ${graded.map((g,i)=>`<div class="card quiz-r ${g.correct?'ok':'no'}">
        <div class="q-q"><b>${i+1}.</b> ${esc(g.q)}</div>
        <div class="q-a">${g.correct?icon('check')+' '+T('Correct'):'✗ '+T('Correct answer:')+' '} <b>${esc(g.correctText)}</b>${!g.correct&&g.chosenText?` · ${T('you chose:')} ${esc(g.chosenText)}`:''}</div>
        <p class="muted sm">${esc(g.e)}</p></div>`).join('')}
      <div class="grow-cta"><a class="btn-sm" href="/app/prep/${credKey}">${T('Try again')}</a><a class="btn-sm ghost" href="/app/training">${T('How to earn it for real ↗')}</a></div>
    </section>`;
  }
  return `<section class="wrap narrow">
    <a class="back" href="/app/prep">← ${T('All quizzes')}</a>
    <div class="sec-h big">${icon('star','xic')} ${esc(quiz.label)} <span class="muted">${T('practice quiz')}</span></div>
    <p class="muted sm">${T('Study practice to build confidence — not the official exam.')}</p>
    <form method="post" action="/app/prep/${credKey}">
      ${quiz.qs.map((q,i)=>`<div class="card quiz-q"><div class="q-q"><b>${i+1}.</b> ${esc(q.q)}</div>
        ${q.o.map((opt,j)=>`<label class="q-opt"><input type="radio" name="q${i}" value="${j}" required> <span>${esc(opt)}</span></label>`).join('')}</div>`).join('')}
      <button class="btn full">${T('Check my answers')}</button>
    </form>
  </section>`;
}
// ---------- Hands-on Skill Checks (situational, on-the-job judgment employers screen for) ----------
const SKILL_SCENARIOS = {
  cna: { label:'CNA — On the floor', sector:'Healthcare', qs:[
    { q:'You walk in and find a resident on the floor next to their bed, awake and talking. First move?', o:['Lift them back into bed quickly','Don’t move them — check for injury and call the nurse','Help them walk to the bathroom'], a:1, e:'Never move a fallen resident before assessing. Check responsiveness/injury and get the nurse — moving them can worsen a fracture.' },
    { q:'A resident refuses their morning bath. You:', o:['Bathe them anyway — it’s on the care plan','Respect the refusal, document it, and report to the nurse','Skip it and say nothing'], a:1, e:'Residents have the right to refuse. Honor it, document, and notify the nurse so the plan can adapt.' },
    { q:'You’re transferring a resident and feel a sharp pull in your back. You:', o:['Push through to finish','Stop, use a gait belt / get a second person, and use your legs','Bend faster next time'], a:1, e:'Stop before injury. Proper body mechanics, a gait belt, and a two-person assist protect you and the resident.' },
    { q:'A resident’s call light has been on for a while but it’s not your assignment. You:', o:['Ignore it — not your hall','Answer it or find who can right away','Turn it off and move on'], a:1, e:'Answer or get help immediately — an unanswered light can mean a fall or emergency. Never just silence it.' },
    { q:'Before helping a resident eat, the most important check is:', o:['That the TV is on','Their identity, positioning (upright), and any swallowing precautions','The room temperature'], a:1, e:'Verify the right resident, sit them upright, and follow any aspiration/diet orders — wrong diet or position can be life-threatening.' },
  ]},
  medical_assistant: { label:'Medical Assistant — In the clinic', sector:'Healthcare', qs:[
    { q:'You’re about to room a patient. The chart says “Jane Smith” but two Jane Smiths are scheduled. You:', o:['Take the first one you see','Verify two identifiers (name + DOB) before proceeding','Ask the front desk to guess'], a:1, e:'Always confirm two patient identifiers (e.g., full name and date of birth) to prevent wrong-patient errors.' },
    { q:'A patient’s blood pressure reads 210/120 and they have a headache. You:', o:['Record it and continue rooming','Flag the provider immediately — this may be a hypertensive emergency','Re-take it in an hour'], a:1, e:'That’s a critical value. Notify the provider right away; don’t sit on it.' },
    { q:'You drew a tube of blood. The needle is now exposed. You:', o:['Recap it by hand','Activate the safety device and drop it straight into the sharps container','Set it on the tray for later'], a:1, e:'Never recap by hand. Engage the safety and dispose in the sharps container immediately to prevent needlesticks.' },
    { q:'A patient asks for their lab results. The provider hasn’t reviewed them. You:', o:['Read the values to them','Explain results are released after the provider reviews, and route the request','Tell them everything looks fine'], a:1, e:'MAs don’t interpret or release un-reviewed results. Route to the provider; don’t reassure or diagnose.' },
    { q:'Before giving an injection the provider ordered, you should confirm the:', o:['Patient’s parking spot','Five rights: right patient, drug, dose, route, time','Waiting-room count'], a:1, e:'The “five rights” of medication administration prevent the most common and dangerous errors.' },
  ]},
  machine_operator: { label:'Machine Operator — On the line', sector:'Manufacturing', qs:[
    { q:'A guard on your machine is loose and rattling at start of shift. You:', o:['Run the job — quota is tight','Tag it out and report it before running','Tape it down'], a:1, e:'A defeated/loose guard is a serious hazard. Lock/tag out and report — never run an unguarded machine.' },
    { q:'You need to clear a jam inside the machine. First step:', o:['Reach in while it idles','Lockout/Tagout — isolate and verify zero energy','Hit it with a tool'], a:1, e:'LOTO before reaching in. “Idling” machines can cycle and amputate. Verify zero energy first.' },
    { q:'Your parts start drifting toward the edge of tolerance. You:', o:['Keep running until they fail','Stop, flag it, and check tooling/setup before more scrap','Ship them anyway'], a:1, e:'Catch drift early — stop, alert the lead, and correct the cause to avoid a batch of scrap or a recall.' },
    { q:'You’re asked to run a job you’ve never been trained on. You:', o:['Wing it','Ask for training / sign-off before running','Refuse and walk off'], a:1, e:'Run only what you’re qualified on. Ask for proper training and sign-off — safety and quality depend on it.' },
    { q:'Loose sleeves near rotating equipment are:', o:['Fine if you’re careful','A snag/entanglement hazard — roll them and remove gloves/jewelry as required','Required PPE'], a:1, e:'Rotating machinery and loose clothing/gloves/jewelry cause entanglement injuries. Follow the dress code.' },
  ]},
  maintenance_tech: { label:'Maintenance Tech — Service call', sector:'Manufacturing', qs:[
    { q:'A line goes down and production is pushing you to “just jump the interlock.” You:', o:['Bypass it to restore the line','Refuse — interlocks are safety devices; diagnose properly','Bypass and tell no one'], a:1, e:'Never defeat a safety interlock to chase uptime. It exists to prevent injury; fix the real fault.' },
    { q:'Before opening an electrical panel to work on it, you:', o:['Assume it’s dead','Lockout/Tagout and verify de-energized with a meter','Wear gloves and hope'], a:1, e:'LOTO and test-before-touch. Verify zero energy with a meter — assumptions kill.' },
    { q:'You finish a repair and have one bolt left over. You:', o:['Toss it — close enough','Stop and find where it goes before releasing the machine','Leave it on the floor'], a:1, e:'A leftover fastener means an incomplete/incorrect reassembly. Resolve it before returning equipment to service.' },
    { q:'A pressurized hydraulic line needs work. First you:', o:['Crack the fitting under pressure','Relieve/bleed the stored pressure, then service','Cut it fast'], a:1, e:'Stored hydraulic/pneumatic energy is dangerous. Relieve pressure (part of LOTO) before opening lines.' },
    { q:'You smell something hot/electrical near a motor. You:', o:['Keep working nearby','Investigate safely and de-energize if needed; report it','Spray water on it'], a:1, e:'Burning smells signal failing insulation/bearings. Investigate, de-energize, and report before it becomes a fire.' },
  ]},
  welder: { label:'Welder — In the booth', sector:'Manufacturing', qs:[
    { q:'You’re about to weld on a used drum that held unknown liquid. You:', o:['Weld it — it looks empty','Never weld a closed/used container until purged and confirmed safe','Rinse with water and weld'], a:1, e:'Sealed/used containers can explode from residual vapors. They must be properly purged/inerted and verified first.' },
    { q:'Welding in a tight, enclosed tank. The key hazard to manage is:', o:['Boredom','Fume buildup / oxygen displacement — ventilation & a permit','Bad lighting'], a:1, e:'Confined spaces need ventilation, monitoring, and a permit. Fumes and shielding gas can displace oxygen.' },
    { q:'After welding, a coworker walks up without a shield as you strike an arc. You:', o:['Keep going','Warn them and pause — arc flash causes eye burns','Tell them to look away fast'], a:1, e:'Protect bystanders from arc flash (“arc eye”). Warn, screen the area, and pause until they’re shielded.' },
    { q:'Your weld shows porosity and undercut on inspection. You:', o:['Grind and hide it','Identify the cause (gas/technique), fix it, and re-weld to spec','Paint over it'], a:1, e:'Cosmetic cover-ups fail in service. Find the root cause, repair to the WPS, and re-inspect.' },
    { q:'Hot work near combustibles requires:', o:['Nothing special','A fire watch, cleared area, and extinguisher on hand','Just speed'], a:1, e:'Hot-work permits require removing/covering combustibles, a fire watch, and extinguishing capability.' },
  ]},
  cleanroom_op: { label:'Cleanroom Operator — In the fab', sector:'Semiconductor', qs:[
    { q:'You realize your glove brushed the floor before handling a wafer carrier. You:', o:['Continue — it looked clean','Change gloves — contamination ruins yield','Wipe glove on your gown'], a:1, e:'A single particle can scrap wafers. Any suspected contamination = change gloves immediately.' },
    { q:'Proper gowning order matters because:', o:['It’s tradition','Wrong order contaminates the suit and the room','It’s faster'], a:1, e:'Gowning is sequenced (cleanest last, face/hair contained) to keep particles off you and the cleanroom.' },
    { q:'You smell a faint chemical odor near a wet bench. You:', o:['Keep working','Stop, alert EHS/supervisor, and follow the chemical response plan','Open a window'], a:1, e:'Fab chemicals (HF, solvents) are extremely hazardous. Any odor/leak = evacuate area per protocol and report — never improvise.' },
    { q:'Hydrofluoric acid (HF) exposure is dangerous because it:', o:['Just stings briefly','Can be painless at first but cause deep tissue/bone damage — needs calcium gluconate','Washes off easily'], a:1, e:'HF can be deceptively painless initially yet life-threatening. Know the calcium gluconate first-aid and report immediately.' },
    { q:'You’re asked to bring a cardboard box into the cleanroom. You:', o:['Carry it in','Refuse — cardboard sheds particles; use approved cleanroom materials','Tape it shut first'], a:1, e:'Cardboard and regular paper shed particles. Only cleanroom-rated materials enter the fab.' },
  ]},
  equipment_tech: { label:'Equipment Tech — Tool down', sector:'Semiconductor', qs:[
    { q:'A process tool is down and the fab is pushing for a fast restart. The tool uses toxic gas. You:', o:['Restart and skip the purge','Follow the full LOTO + gas purge/abatement procedure, no shortcuts','Vent the line to the room'], a:1, e:'Toxic/pyrophoric gases demand the full purge and LOTO. Shortcuts risk a release — production pressure never overrides it.' },
    { q:'Before maintenance inside a tool with RF and high voltage, you:', o:['Trust the indicator light','LOTO, verify de-energized, and follow the EMO/RF lockout steps','Work fast around it'], a:1, e:'RF/HV energy is lethal. Lock out, verify with a meter, and follow the tool-specific energy-control procedure.' },
    { q:'You finish a repair. Before releasing the tool to production you:', o:['Hand it back immediately','Run qualification/verification and document the work','Skip docs to save time'], a:1, e:'Qual the tool and record the maintenance — undocumented or unverified work causes silent yield loss and safety gaps.' },
    { q:'You see another tech reach into a tool that isn’t locked out. You:', o:['Mind your business','Stop the work — speak up; an un-LOTO’d tool can energize','Assume they know best'], a:1, e:'Stop-work authority applies to everyone. Speaking up on an un-locked-out tool can save a life.' },
    { q:'A pyrophoric gas line needs to be opened. The non-negotiable first step is:', o:['Open it in air','Purge/inert the line per procedure before exposure','Light a match to test'], a:1, e:'Pyrophorics ignite on contact with air. The line must be purged/inerted per the documented procedure first.' },
  ]},
  quality_inspector: { label:'Quality Inspector — At the gate', sector:'Manufacturing', qs:[
    { q:'A borderline part is just outside spec but the line is behind. The lead says “ship it.” You:', o:['Ship it to help the line','Hold it — out-of-spec is a fail; escalate per the quality process','Change the measurement'], a:1, e:'Quality holds the line. Out-of-spec is a nonconformance — document, quarantine, and escalate; don’t bend the gate.' },
    { q:'Your gauge is past its calibration-due date. You:', o:['Use it anyway','Pull it from service and use a calibrated gauge','Estimate by eye'], a:1, e:'Measurements from an out-of-cal gauge are invalid. Use only in-calibration tools and tag the bad one.' },
    { q:'You find a defect that earlier inspection missed on shipped lots. You:', o:['Stay quiet','Trigger containment/traceability for affected lots and report','Fix only new parts'], a:1, e:'A discovered escape needs containment, traceability, and notification — possibly a recall. Silence risks customers and the company.' },
    { q:'“First-article inspection” exists to:', o:['Slow you down','Verify a new setup makes good parts before a full run','Test the inspector'], a:1, e:'FAI confirms the process/setup is correct before committing to a full run — catching errors at part #1, not #1000.' },
    { q:'A production worker pressures you to pass their parts. You:', o:['Pass to avoid conflict','Stay objective — judge to the spec, not the person','Reject everything to be safe'], a:1, e:'Inspection must be impartial and based on the spec and data — not social pressure in either direction.' },
  ]},
};
// trade → nearest skill-check scenario set
const SKILL_FOR = { cna:'cna', patient_care_tech:'cna', home_health_aide:'cna', caregiver:'cna', med_tech:'cna',
  medical_assistant:'medical_assistant', surgical_tech:'medical_assistant', sterile_processing:'medical_assistant', phlebotomist:'medical_assistant', pharmacy_tech:'medical_assistant',
  machine_operator:'machine_operator', assembler:'machine_operator', production_worker:'machine_operator', warehouse:'machine_operator', forklift_operator:'machine_operator', machinist:'machine_operator',
  maintenance_tech:'maintenance_tech', equipment_maintenance:'maintenance_tech', millwright:'maintenance_tech', industrial_mechanic:'maintenance_tech', electrician:'maintenance_tech', hvac:'maintenance_tech',
  welder:'welder', fabricator:'welder', boilermaker:'welder', pipefitter:'welder',
  cleanroom_op:'cleanroom_op', wafer_fab:'cleanroom_op', process_tech:'cleanroom_op', semiconductor_tech:'cleanroom_op',
  equipment_tech:'equipment_tech', equipment_engineer:'equipment_tech', field_service:'equipment_tech',
  quality_inspector:'quality_inspector', qa_tech:'quality_inspector', metrology:'quality_inspector', inspector:'quality_inspector' };
const skillKeyFor = (trade)=> SKILL_FOR[trade] || (SKILL_SCENARIOS[trade] ? trade : null);
function parseSkillchecks(profile){ try { return JSON.parse(profile.skillchecks||'[]'); } catch(e){ return []; } }
// Skill-verified badge row — shows on the Work Card, public profile, and to recruiters.
function skillVerifiedRow(profile){
  const sk = parseSkillchecks(profile).filter(k=>SKILL_SCENARIOS[k]);
  if(!sk.length) return '';
  return `<div class="sv-row">${sk.map(k=>`<span class="sv-badge">${icon('shield','xic')} ${esc((SKILL_SCENARIOS[k].label.split(' — ')[0]))} ${T('Skill-verified')}</span>`).join('')}</div>`;
}
function gradeSkill(key, body){
  const set = SKILL_SCENARIOS[key]; if(!set) return null;
  let score=0; const graded = set.qs.map((q,i)=>{ const chosen = Number(body['q'+i]); const correct = chosen===q.a; if(correct) score++;
    return { q:q.q, correct, correctText:q.o[q.a], chosenText:isNaN(chosen)?'':q.o[chosen], e:q.e }; });
  const pass = score >= Math.ceil(set.qs.length*0.8);
  return { score, total:set.qs.length, graded, pass };
}
function skillCheckIndex(passed = []){
  const ps = new Set(passed);
  const sectors = {};
  for(const [k,s] of Object.entries(SKILL_SCENARIOS)){ (sectors[s.sector]=sectors[s.sector]||[]).push([k,s]); }
  return `<section class="wrap narrow">
    <a class="back" href="/app/grow">← ${T('Grow')}</a>
    <div class="sec-h big">${icon('shield','xic')} ${T('Skill Checks')} <span class="muted">${T('prove you can do the job')}</span></div>
    <p class="muted sm">${T('Real on-the-job scenarios — safety, judgment, and the calls employers actually screen for. Pass one and earn a “Skill-verified” badge on your Work Card that recruiters can see.')}</p>
    ${Object.entries(sectors).map(([sec,list])=>`<div class="sec-h" style="margin-top:14px">${esc(T(sec))}</div>
      <div class="track-grid">${list.map(([k,s])=>`<a class="card track-card ${ps.has(k)?'done':''}" href="/app/skillcheck/${k}">
        <div class="track-h"><span class="trend-ic">${ps.has(k)?icon('check'):icon('shield')}</span><div><b>${esc(s.label)}</b><div class="muted sm">${s.qs.length} ${T('scenarios')}${ps.has(k)?` · <b style="color:#157a52">${T('Verified ✓')}</b>`:''}</div></div></div>
        <span class="sector-go">${ps.has(k)?T('Review'):T('Start')} →</span></a>`).join('')}</div>`).join('')}
  </section>`;
}
function skillCheck(key, result, passedBefore = false){
  const set = SKILL_SCENARIOS[key];
  if(!set) return `<section class="wrap narrow"><div class="card muted">${T('No skill check for that trade yet.')} <a href="/app/skillcheck">${T('See all skill checks')}</a></div></section>`;
  if(result){
    const {score, total, graded, pass} = result; const pct = Math.round(score/total*100);
    return `<section class="wrap narrow">
      <a class="back" href="/app/skillcheck">← ${T('All skill checks')}</a>
      <div class="card agent-card" style="text-align:center"><div class="agent-h" style="justify-content:center">${icon('shield','xic')} ${esc(set.label)}</div>
        <div class="verdict-ring ${pass?'rate-strong':pct>=60?'rate-solid':'rate-weak'}" style="margin:10px auto"><b>${pct}%</b><span>${score}/${total}</span></div>
        <p class="agent-line">${pass?T('Passed — “Skill-verified” is now on your Work Card. Employers searching your trade will see it.'):T('Not yet — review each scenario below and retake. You’ve got this.')}</p>
        ${pass?`<a class="btn-sm" href="/app/profile">${T('See it on my Work Card →')}</a>`:''}</div>
      ${graded.map((g,i)=>`<div class="card quiz-r ${g.correct?'ok':'no'}">
        <div class="q-q"><b>${i+1}.</b> ${esc(g.q)}</div>
        <div class="q-a">${g.correct?icon('check')+' '+T('Correct'):'✗ '+T('Best answer:')+' '} <b>${esc(g.correctText)}</b>${!g.correct&&g.chosenText?` · ${T('you chose:')} ${esc(g.chosenText)}`:''}</div>
        <p class="muted sm">${esc(g.e)}</p></div>`).join('')}
      <div class="grow-cta"><a class="btn-sm" href="/app/skillcheck/${key}">${T('Retake')}</a><a class="btn-sm ghost" href="/app/skillcheck">${T('Other skill checks')}</a></div>
    </section>`;
  }
  return `<section class="wrap narrow">
    <a class="back" href="/app/skillcheck">← ${T('All skill checks')}</a>
    <div class="sec-h big">${icon('shield','xic')} ${esc(set.label)} ${passedBefore?`<span class="match-chip" style="background:rgba(31,169,113,.14);color:#157a52">${T('Verified ✓')}</span>`:''}</div>
    <p class="muted sm">${T('Pick the best on-the-job call for each. Pass 4 of 5 to earn the badge. No time limit — you can retake any time.')}</p>
    <form method="post" action="/app/skillcheck/${key}">
      ${set.qs.map((q,i)=>`<div class="card quiz-q"><div class="q-q"><b>${i+1}.</b> ${esc(q.q)}</div>
        ${q.o.map((opt,j)=>`<label class="q-opt"><input type="radio" name="q${i}" value="${j}" required> <span>${esc(opt)}</span></label>`).join('')}</div>`).join('')}
      <button class="btn full">${T('Submit my answers')}</button>
    </form>
  </section>`;
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
    ${reco && reco.topCred ? `<div class="sec-h">${T('Your highest-impact next credential')}</div>${credCard(reco.topCred, true)}` : (reco && reco.trade ? '' : `<div class="card muted">${T('Add your trade and ZIP to your Work Card and your coach will map the fastest way to more jobs.')} <a href="/app/profile">${T('Set up my Work Card')}</a></div>`)}
    ${reco && reco.alternatives && reco.alternatives.length ? `<div class="sec-h">${T('Other credentials worth earning')}</div>${reco.alternatives.map(c=>credCard(c,false)).join('')}` : ''}
    ${reco && reco.trade && LEARN_TRACKS[reco.trade] ? `<div class="sec-h">${T('Train for it — free')}</div>
      <div class="card">
        ${learnVideo(reco.trade, LEARN_TRACKS[reco.trade].vid)}
        <div class="track-links">
          <a class="track-link prep" href="/app/learn/interview?trade=${reco.trade}">${icon('spark')} ${T('Practice the AI interview')}</a>
          ${ROLE_BLS[reco.trade]?`<a class="track-link" href="/careers/${reco.trade}">${icon('star')} ${T('Full career guide')} →</a>`:''}
          <a class="track-link" href="/app/jobs">${icon('pin')} ${T('See open jobs near me')} →</a>
        </div>
      </div>` : ''}
  </section>`;
}

function invitePage({ user, link, joined = 0, sent = false }){
  const msg = encodeURIComponent('Join me on Rivet — real blue-collar jobs near you, free for workers. '+link);
  return `<section class="wrap narrow">
    <a class="back" href="/app">← ${T('Home')}</a>
    <div class="card agent-card">
      <div class="agent-h">${icon('spark','xic')} ${T('Invite your crew')}</div>
      <p class="agent-line">${T('The fastest way to better work is to bring the people you already work with. Invite your crew — when they join, employers can hire you as a team.')}</p>
      ${joined?`<p class="muted sm">${joined} ${joined===1?T('teammate has joined'):T('teammates have joined')} ${T('from your invites')} 🎉</p>`:''}
    </div>
    ${sent?`<div class="ok-card">${T('Invite sent ✓')}</div>`:''}
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Your invite link')}</div>
      <div class="invite-link"><input id="invlink" readonly value="${esc(link)}"><button class="btn-sm" type="button" onclick="try{navigator.clipboard.writeText(document.getElementById('invlink').value);this.textContent='${T('Copied ✓')}'}catch(e){}">${T('Copy')}</button></div>
      <div class="invite-share">
        <a class="track-link" href="sms:?&body=${msg}">${icon('bell')} ${T('Text it')}</a>
        <a class="track-link" href="https://wa.me/?text=${msg}" target="_blank" rel="noopener noreferrer">${T('WhatsApp')}</a>
      </div>
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Or send a text invite')}</div>
      <form method="post" action="/app/invite/sms" class="crew-form">
        <input name="phone" inputmode="tel" placeholder="${T('Teammate’s phone number')}" required>
        <button class="btn-sm">${T('Send invite')}</button>
      </form>
      <p class="muted sm">${T('We’ll text them your link — one invite, no spam.')}</p>
    </div>
  </section>`;
}
function agentApplyResult({ applied = [], matches = [], already = 0, total = 0 }){
  const card = (a, ext) => `<div class="card app-card">
      <div class="job-row"><div class="badge">${tradeEmoji(a.trade)}</div>
        <div class="job-main"><h4>${esc(T(a.title))}</h4>
          <div class="muted">${esc(a.company||'')} · ${esc(a.city)} · $${a.pay_min}–${a.pay_max}/hr${a.distance!=null?` · <b class="dist">${a.distance} ${T('mi away')}</b>`:''}</div></div>
        <span class="score-tag ${scoreClass(a.score)}">${a.score}</span></div>
      ${ext?`<div class="app-act"><a class="btn-sm" href="${esc(a.apply_url)}" target="_blank" rel="noopener noreferrer">${T('Apply')} ↗</a><form method="post" action="/app/jobs/${a.id}/save"><button class="btn-sm ghost">☆ ${T('Save')}</button></form></div>`:''}
    </div>`;
  const headline = applied.length
    ? `${T('Done — I applied you to')} ${applied.length} ${applied.length===1?T('job'):T('jobs')}${matches.length?` ${T('and found')} ${matches.length} ${T('more great matches to apply to in one tap')}`:''}.`
    : (matches.length ? `${T('I found your')} ${matches.length} ${T('best real matches near you — apply in one tap.')}`
      : (already?T('You’re already on your best matches — nothing new right now.'):T('Add your trade and ZIP to your Work Card and I’ll match you to real jobs near you.')));
  return `<section class="wrap narrow">
    <a class="back" href="/app/jobs">← ${T('Find work')}</a>
    <div class="card agent-card">
      <div class="agent-h">${icon('spark','xic')} ${T('Apply Agent')}</div>
      <p class="agent-line big">${headline}</p>
      <p class="muted sm">${T('Ranked on your trade, pay, location and credentials — across every real opening on Rivet.')}</p>
    </div>
    ${applied.length?`<div class="sec-h">${T('Applied for you')}</div>${applied.map(a=>card(a,false)).join('')}<a class="btn-sm" href="/app/applications">${T('View all applications')}</a>`:''}
    ${matches.length?`<div class="sec-h">${T('Your best matches — apply now')}</div>${matches.map(a=>card(a,true)).join('')}`:''}
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
    { title:T('Apply Agent'), desc:T('Ranks every real opening on Rivet by your trade, pay, location and credentials — applies you to Rivet jobs and hands you one-tap apply links for the rest.'), action:`<form method="post" action="/app/agent/apply">${' '}<button class="btn-sm">${T('Find my matches')}</button></form>` },
    { title:T('Onboarding Agent'), desc:T('Builds your Work Card by chat — just answer in your own words, English or Spanish.'), action:`<a class="btn-sm" href="/app/onboard/chat">${T('Start chat')}</a>` },
  ];
  const recruiter = [
    { title:T('Sourcing Agent'), desc:T('Ranks verified workers for your hardest-to-fill roles and verifies every credential against its official public registry.'), action:`<a class="btn-sm" href="/console/source">${T('Open Sourcing →')}</a>` },
    { title:T('Screening Agent'), desc:T('Reads a candidate’s verified Work Card against your job, then writes tailored screening questions and a clear fit summary — in seconds.'), action:`<a class="btn-sm" href="/console/search">${T('Open a candidate →')}</a>` },
    { title:T('Scheduling Agent'), desc:T('Proposes three interview times to a pipelined candidate and messages them automatically — one click, no back-and-forth.'), action:`<a class="btn-sm" href="/console/search">${T('Open a candidate →')}</a>` },
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
  // Lead with the three GTM sectors, then keep the rest available under "Other".
  for(const [cat, keys] of Object.entries(PICKER_GROUPS)){
    const ks = keys.filter(k=>TRADES[k]); ks.forEach(k=>seen.add(k));
    if(!ks.length) continue;
    html += `<optgroup label="${esc(cat)}">${ks.map(k=>`<option value="${k}" ${sel===k?'selected':''}>${esc(TRADES[k])}</option>`).join('')}</optgroup>`;
  }
  const rest = Object.keys(TRADES).filter(k=>!seen.has(k));
  if(rest.length) html += `<optgroup label="Other trades">${rest.map(k=>`<option value="${k}" ${sel===k?'selected':''}>${esc(TRADES[k])}</option>`).join('')}</optgroup>`;
  return html;
}

function credRow(c, editable = false){
  const st = c.verify_status || (c.verified ? 'verified' : 'unverified');
  const soon = c.verified && c.expires && c.expires < '2026-08';
  const ic = st==='verified' ? `<span class="cred-st ok">${icon('check')}</span>`
    : (st==='review' ? `<span class="cred-st rev"></span>` : `<span class="cred-st un"></span>`);
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
function workerJobs({ matches, total = null, filters = {}, jobsGeo = null, needZip = false }) {
  if(total==null) total = matches.length;
  const zipBanner = needZip ? `<a class="zip-banner" href="/app/profile">${icon('pin','xic')} ${T('Add your ZIP to your Work Card to see how far each job is.')}</a>` : '';
  const tradeOpts = `<option value="">${T('All trades')}</option>`+Object.entries(TRADES).map(([k,v])=>`<option value="${k}" ${filters.trade===k?'selected':''}>${esc(T(v))}</option>`).join('');
  const shifts = ['Day','Night','4x10','Any'];
  const shiftOpts = `<option value="">${T('Any shift')}</option>`+shifts.map(s=>`<option value="${s}" ${filters.shift===s?'selected':''}>${esc(T(s))}</option>`).join('');
  const typeOpts = `<option value="">${T('Any type')}</option>`+JOB_TYPES.map(t=>`<option value="${t}" ${filters.jtype===t?'selected':''}>${esc(T(t))}</option>`).join('');
  const active = (filters.q||filters.trade||filters.city||filters.minpay||filters.shift||filters.jtype);
  return `<section class="wrap">
    <div class="sec-h big">${T('Find work')} <span class="muted">${total} ${total===1?T('job'):T('jobs')}${active?' · '+T('filtered'):' · '+T('ranked by fit')}${total>matches.length?' · '+T('showing top')+' '+matches.length:''}</span></div>
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
// "Is this job worth it?" — the worker-protection trust verdict. Composes real signals so a
// vulnerable worker never wastes effort on a ghost listing, an agency, or an underpaying job.
function trustVerdict(job, sig = {}){
  const { rating = {avg:0,count:0}, pay = {}, rehire = 0, safety = {avg:0,n:0}, payFloor = 0, marketHr = 0 } = sig;
  const reasons = [];
  const company = String(job.company||'');
  const external = !!(job.apply_url && /^https?:\/\//i.test(job.apply_url));
  const agency = /staffing|staff |agency|temp\b|temps\b|labor ready|labour|recruit/i.test(company);
  if(agency) reasons.push(['warn', T('Staffing agency — confirm who you’d actually work for and the real pay.')]);
  else if(external) reasons.push(['ok', `${T('Listed directly on')} ${esc(company)}${T('’s official careers site')}`]);
  else if(job.company_about) reasons.push(['ok', T('Verified employer with a real company profile')]);
  else if(job.poster_kind==='individual') reasons.push(['info', T('Individual/homeowner posting — agree on scope and pay up front.')]);
  else reasons.push(['info', T('Newer employer — limited history yet.')]);
  if(pay && pay.n>0) reasons.push([pay.pct>=90?'ok':'warn', `${T('Pays on time')} — ${pay.pct}% (${pay.n})`]);
  if(safety && safety.n>0) reasons.push([safety.avg>=4?'ok':'warn', `${T('Site safety')} ${safety.avg.toFixed(1)}/5 (${safety.n})`]);
  if(rehire>0) reasons.push(['ok', `${rehire} ${rehire===1?T('worker came back for more'):T('workers came back for more')}`]);
  if(rating && rating.count>0) reasons.push([rating.avg>=4?'ok':'info', `${rating.avg.toFixed(1)}/5 ${T('from')} ${rating.count} ${T('workers')}`]);
  if(marketHr && job.pay_max) reasons.push([job.pay_max>=marketHr?'ok':'warn', job.pay_max>=marketHr ? `${T('Pay is at/above the national median')} (~$${marketHr}/hr)` : `${T('Below the typical')} ~$${marketHr}/hr — ${T('worth negotiating')}`]);
  if(payFloor && job.pay_max && job.pay_max>=payFloor) reasons.push(['ok', T('Meets your pay floor')]);
  const warns = reasons.filter(r=>r[0]==='warn').length, oks = reasons.filter(r=>r[0]==='ok').length;
  const level = warns>=2 ? 'caution' : (oks>=2 && warns===0) ? 'trusted' : 'solid';
  const label = level==='trusted' ? T('Looks trustworthy') : level==='caution' ? T('Proceed carefully — check these') : T('Reasonable — a few unknowns');
  return { level, label, reasons };
}
function trustCard(v){
  if(!v || !v.reasons.length) return '';
  const ic = {ok:'check',warn:'warn',info:'dot'};
  return `<div class="card trust-card ${v.level}">
    <div class="trust-h"><span class="trust-badge ${v.level}">${v.level==='trusted'?icon('shield'):v.level==='caution'?icon('warn'):icon('dot')} ${esc(v.label)}</span>
      <span class="muted sm">${T('Is this job worth it?')}</span></div>
    <ul class="trust-list">${v.reasons.map(([k,t])=>`<li class="tr-${k}">${icon(ic[k]||'dot')} <span>${t}</span></li>`).join('')}</ul>
  </div>`;
}
function jobDetail({ job, match, applied, saved = false, jobMedia = [], distance = null, rules = null, empRating = {avg:0,count:0}, workAuth = '', empPay = {}, myQuote = null, payFloor = 0, empRehire = 0, empSafety = {}, payMarket = null }) {
  const _trust = trustCard(trustVerdict(job, { rating:empRating, pay:empPay, rehire:empRehire, safety:empSafety, payFloor, marketHr: ROLE_BLS[job.trade]?Math.round(ROLE_BLS[job.trade].med/2080):0 }));
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
          ${marketPayBar(payMarket, job.trade)}
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
      ${_trust}
      <a class="btn full gameplan-cta" href="/app/land/${job.id}">${icon('spark')} ${T('Get your game plan to land this job')}</a>
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
      <a class="btn full ghost iv-cta" href="/app/learn/interview?job=${job.id}">${icon('spark')} ${T('Practice the interview for this job')}</a>
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
// Reverse marketplace — "Employers want to interview you" (the Incredible-Health model for blue-collar)
function workerOffers({ requests = [], interested = [], pending = 0, count = 0 }){
  const proposed = requests.filter(r=>r.status==='proposed');
  const confirmed = requests.filter(r=>r.status==='confirmed');
  return `<section class="wrap">
    <div class="offers-hero ${count?'live':''}">
      <div class="oh-ic">${icon('bell','xic')}</div>
      <div><div class="oh-t">${count?`${count} ${count===1?T('employer wants you'):T('employers want you')}`:T('Employers will reach out here')}</div>
        <p class="muted sm" style="margin:2px 0 0">${count?T('On Rivet, verified employers come to you. Accept an interview time and you’re in — no application needed.'):T('Complete your Work Card and turn on availability — employers search candidates here and reach out directly.')}</p></div>
    </div>
    ${proposed.length ? `<div class="sec-h big">${icon('bell','xic')} ${T('Interview requests')} <span class="hot-ct">${proposed.length}</span></div>
      ${proposed.map(iv=>`<div class="card offer-card hot">
        <div class="oc-top"><div class="badge">${tradeEmoji(iv.trade)}</div>
          <div class="oc-main"><h4>${esc(iv.title||T('Interview'))}</h4>
            <div class="muted">${esc(iv.company||T('An employer'))}${iv.city?` · ${esc(iv.city)}`:''}${iv.pay_min?` · $${iv.pay_min}–${iv.pay_max}/hr`:''}</div></div>
          <span class="match-chip">${T('Wants to interview you')}</span></div>
        ${interviewWorker(iv)}
        <div class="oc-act"><a class="btn-xs ghost" href="/app/messages">${T('Message employer')}</a></div>
      </div>`).join('')}` : ''}
    ${confirmed.length ? `<div class="sec-h big" style="margin-top:22px">${T('Confirmed interviews')}</div>
      ${confirmed.map(iv=>`<div class="card offer-card ok"><div class="oc-top"><div class="badge">${tradeEmoji(iv.trade)}</div>
        <div class="oc-main"><h4>${esc(iv.title||'')}</h4><div class="muted">${esc(iv.company||'')}</div></div></div>${interviewWorker(iv)}</div>`).join('')}` : ''}
    ${interested.length ? `<div class="sec-h big" style="margin-top:22px">${T('Employers interested in you')} <span class="hot-ct soft">${interested.length}</span></div>
      <p class="muted sm" style="margin-top:-6px">${T('These employers saved your Work Card. Message them to get on their radar before the interview request.')}</p>
      ${interested.map(e=>`<div class="card offer-card"><div class="oc-top"><div class="badge">${icon('company','xic')}</div>
        <div class="oc-main"><h4>${esc(e.company||T('An employer'))}</h4>
          <div class="muted">${e.open_jobs?`${e.open_jobs} ${e.open_jobs===1?T('open role'):T('open roles')}`:T('Saved your Work Card')}${e.sample_job?` · ${esc(e.sample_job)}`:''}</div></div>
          <span class="match-chip soft">${T('Saved you')}</span></div>
        ${e.open_jobs?`<div class="oc-act"><a class="btn-xs ghost" href="/app/jobs">${T('See their open roles →')}</a></div>`:''}
      </div>`).join('')}` : ''}
    ${!count && !confirmed.length ? `<div class="card" style="margin-top:16px">
      <div class="sec-h" style="margin-top:0">${T('Get found faster')}</div>
      <div class="track-links">
        <a class="track-link" href="/app/profile">${icon('star')} ${T('Finish your Work Card →')}</a>
        <a class="track-link" href="/app/credentials">${icon('shield')} ${T('Verify a credential →')}</a>
        <a class="track-link" href="/app/jobs">${icon('search')} ${T('Apply to open roles →')}</a>
      </div></div>` : ''}
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
// The full set of worker "x-factors" — signals that help match more jobs and rank higher.
const XFACTORS = [
  ['/app/available','available','dot','Available for work'],
  ['/app/work-today','work_today','bolt','Can work today'],
  ['/app/relocate','relocate','send','Open to relocate'],
  ['/app/tools','has_tools','toolbox','I have my own tools'],
  ['/app/transport','has_transport','truck','I have reliable transport'],
  ['/app/bilingual','bilingual','globe','Bilingual'],
  ['/app/veteran','veteran','shield','Veteran'],
  ['/app/subcontract','self_employed','hammer','Subcontract-ready (1099)'],
  ['/app/extra','open_to_extra','bolt','Open to extra / multiple jobs'],
  ['/app/alerts','alerts','bell','Text me new job alerts'],
];
// Badges for the x-factors that are ON — the at-a-glance "why hire me" strip.
function xfactorBadges(profile){
  const on = XFACTORS.filter(([,col])=>profile && profile[col]).filter(([,col])=>col!=='alerts');
  if(!on.length) return '';
  return `<div class="xf-badges">${on.map(([,,ic,l])=>`<span class="xf-badge">${icon(ic)} ${T(l)}</span>`).join('')}</div>`;
}
// Work Card completeness → drives workers to beef it up.
function workCardStrength(profile, creds, work, portfolio){
  const checks = [
    ['Add a headline', !!profile.headline, '/app/profile'],
    ['Pick your trades', tradesOf(profile).length>0, '/app/profile'],
    ['Add your ZIP', !!profile.zip, '/app/profile'],
    ['Write your About', !!(profile.about && profile.about.length>20), '/app/profile'],
    ['Add a credential', (creds||[]).length>0, '/app/profile'],
    ['Add past work history', (work||[]).length>0, '/app/profile'],
    ['Add a portfolio photo', (portfolio||[]).length>0, '/app/profile'],
    ['Turn on your strengths', XFACTORS.some(([,c])=>profile && profile[c] && c!=='alerts'), '/app/profile'],
  ];
  const done = checks.filter(c=>c[1]).length, pct = Math.round(done/checks.length*100);
  const next = checks.filter(c=>!c[1]).slice(0,3);
  return `<div class="wc-strength">
    <div class="wc-str-top"><b>${T('Work Card strength')}</b><span>${pct}%</span></div>
    <div class="wc-bar"><i style="width:${pct}%"></i></div>
    ${next.length?`<div class="wc-todo">${T('To stand out')}: ${next.map(c=>`<span>${T(c[0])}</span>`).join('')}</div>`:`<div class="wc-todo done">${icon('check')} ${T('Your card is complete — you’ll match more and rank higher.')}</div>`}
  </div>`;
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
      ${xfactorBadges(profile)}
      ${skillVerifiedRow(profile)}
      <div class="share-row">
        <button class="btn-sm" type="button" onclick="var u=location.origin+'/p/${user.id}';if(navigator.share){navigator.share({title:'My Rivet Work Card',url:u})}else if(navigator.clipboard){navigator.clipboard.writeText(u);this.textContent='${T('Link copied ✓')}'}">${icon('send')} ${T('Share my Work Card')}</button>
        <a class="btn-sm ghost" href="/p/${user.id}" target="_blank" rel="noopener">${T('Preview ↗')}</a>
      </div>
      <p class="muted sm share-hint">${T('One link with your trades, credentials, reviews & portfolio — text it to any employer.')}</p>
      <div class="ministats">
        <div><b>${profile.readiness}</b><span>${T('READINESS')}</span></div>
        <div><b>${creds.filter(c=>c.verified).length}</b><span>${T('VERIFIED')}</span></div>
        <div><b>${work.length}</b><span>${T('PAST JOBS')}</span></div>
        <div><b>${portfolio.length}</b><span>${T('PHOTOS')}</span></div>
      </div>
      ${workCardStrength(profile, creds, work, portfolio)}
      <form method="post" action="/app/available" class="avail-form">
        <button class="btn-sm tgl ${profile.available?'':'ghost'}">${icon('dot','xic')}<span>${profile.available?T('Available for work — tap to pause'):T('Paused — tap to go available')}</span></button>
      </form>
    </div>
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('What makes you stand out')}</div>
      <p class="muted sm" style="margin-top:-4px">${T('Flip on everything that’s true — each one matches you to more jobs and ranks you higher with employers.')}</p>
      <div class="xf-grid">${XFACTORS.map(([action,col,ic,label])=>xToggle(action, profile[col], ic, T(label), T(label), '/app/profile')).join('')}</div>
    </div>
    <div class="col2"><div class="colstack">
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Trades, location & details')}</div>
      ${error?`<div class="err">${esc(error)}</div>`:''}
      <form method="post" action="/app/profile/details">
        <label>${T('Headline')} <input name="headline" maxlength="80" value="${esc(profile.headline||'')}" placeholder="${T('e.g. Equipment maintenance tech — semiconductor fab')}"></label>
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
// Curated career tracks for the roles that are actually hiring on Rivet right now.
// why=one-liner, pay=typical hourly, cert=[label,url], vid=YouTube search, qs=interview bank.
const LEARN_TRACKS = {
  equipment_tech: { why:'Keep the machines that build everything running — the #1 role hiring on Rivet right now.', pay:'$28–44/hr', cert:['OSHA 10 + manufacturer training','https://www.osha.gov/training/outreach'], vid:'equipment maintenance technician day in the life', qs:['Walk me through how you troubleshoot a machine that stopped mid-shift.','How do you follow a lockout/tagout (LOTO) procedure?','Tell me about a time you prevented downtime with preventive maintenance.','How comfortable are you reading electrical and pneumatic schematics?'] },
  maintenance_tech: { why:'Industrial maintenance techs are in demand at every plant and DC.', pay:'$26–40/hr', cert:['OSHA 30','https://www.osha.gov/training/outreach'], vid:'industrial maintenance technician training', qs:['What PMs do you run on conveyors or pumps?','Describe a hydraulic or pneumatic repair you’ve done.','How do you prioritize when three machines are down at once?','What’s your experience with PLCs?'] },
  machinist: { why:'CNC machinists make precision parts for aerospace, EVs and chips.', pay:'$26–42/hr', cert:['NIMS Machining','https://www.nims-skills.org'], vid:'cnc machinist day in the life', qs:['How do you read a blueprint and set tolerances?','Walk me through setting up a CNC mill or lathe.','How do you use calipers and micrometers to verify a part?','Tell me about a time you scrapped a part — what did you learn?'] },
  welder: { why:'Welders are chronically short-staffed — shipyards, aerospace, structural.', pay:'$26–42/hr', cert:['AWS Certified Welder','https://www.aws.org/certification'], vid:'aws welding certification test 3g 4g', qs:['Which processes are you certified in — MIG, TIG, stick, flux-core?','What positions can you weld (1G–6G)?','How do you read a welding symbol on a drawing?','How do you prep and inspect a weld for porosity or undercut?'] },
  electrician: { why:'Data-center and EV buildouts are pulling electricians at premium pay.', pay:'$30–46/hr', cert:['Electrical apprenticeship + OSHA 10','https://www.electricaltrainingalliance.org'], vid:'electrician apprenticeship explained', qs:['Are you a helper, apprentice, or journeyman — and licensed where?','How do you work safely around energized equipment / arc-flash?','Walk me through bending and running conduit.','How do you troubleshoot a circuit that keeps tripping?'] },
  machine_operator: { why:'Production operators are the entry door into manufacturing — train on the job.', pay:'$20–30/hr', cert:['OSHA 10 (helpful, not required)','https://www.osha.gov/training/outreach'], vid:'production machine operator job', qs:['Are you comfortable standing and on rotating shifts?','How do you keep quality consistent over a long run?','Describe following a work instruction or SOP exactly.','How do you handle a machine fault — stop, tag, escalate?'] },
  assembler: { why:'Assemblers build EVs, rockets, robots and electronics.', pay:'$20–30/hr', cert:['IPC-A-610 (electronics)','https://www.ipc.org/ipc-certification'], vid:'assembly technician manufacturing', qs:['Have you used hand and power tools to spec?','How do you follow torque specs and a build sheet?','Tell me about doing repetitive work with high accuracy.','Comfortable with soldering or harnessing?'] },
  quality_inspector: { why:'Quality inspectors keep parts to spec — every plant needs them.', pay:'$22–34/hr', cert:['ASQ Certified Quality Inspector','https://asq.org/cert'], vid:'quality inspector manufacturing measuring tools', qs:['How do you use calipers, micrometers, and gauges?','What’s your experience reading GD&T?','Walk me through a first-article inspection.','What do you do when a lot fails inspection?'] },
  automotive_tech: { why:'Service & fleet technicians keep vehicles (and robotaxis) on the road.', pay:'$24–40/hr', cert:['ASE Certification','https://www.ase.com'], vid:'automotive technician ASE day in the life', qs:['Which ASE areas are you certified in?','Walk me through diagnosing a no-start.','How do you use a scan tool and read codes?','Do you have your own tools?'] },
  hvac: { why:'HVAC techs ride the data-center and housing demand wave.', pay:'$28–42/hr', cert:['EPA 608','https://www.epa.gov/section608'], vid:'hvac technician epa 608 explained', qs:['Do you hold EPA 608 (which type)?','How do you charge a system and check superheat/subcooling?','Walk me through diagnosing no cooling.','Comfortable on rooftops and in tight spaces?'] },
  process_tech: { why:'Fab/process techs run the tools that make semiconductors — CHIPS Act boom.', pay:'$24–36/hr', cert:['Employer cleanroom training','https://www.semi.org'], vid:'semiconductor process technician fab', qs:['Are you okay gowning up and working in a cleanroom?','How do you follow a detailed process recipe exactly?','How do you document and escalate an out-of-spec reading?','Comfortable on 12-hour rotating shifts?'] },
  cna: { why:'CNAs are the fastest path into healthcare — huge, steady demand.', pay:'$18–25/hr', cert:['State CNA certification','https://www.redcross.org/take-a-class/nurse-assistant-training'], vid:'CNA day in the life certified nursing assistant', qs:['Are you certified in your state — and is it current?','How do you help with ADLs while protecting dignity?','How do you handle a combative or confused patient?','Tell me about teamwork on a busy floor.'] },
  sterile_processing: { why:'Sterile processing techs keep ORs running — strong hospital demand.', pay:'$19–27/hr', cert:['CRCST (HSPA)','https://myhspa.org'], vid:'sterile processing technician day in the life', qs:['Do you hold CRCST or are you working toward it?','Walk me through decontamination → assembly → sterilization.','How do you track instrument trays and counts?','How do you handle a recall or failed biological indicator?'] },
  cleanroom_op: { why:'Cleanroom operators are the entry door into the CHIPS-Act fab boom — paid training, no degree.', pay:'$21–30/hr', cert:['Employer cleanroom training / SEMI','https://www.semi.org'], vid:'cleanroom operator semiconductor', qs:['Are you comfortable gowning up and working in a cleanroom a full shift?','How do you follow a process recipe exactly and log every reading?','How do you keep contamination out — no makeup, careful movements?','Comfortable on 12-hour rotating day/night shifts?'] },
  patient_care_tech: { why:'PCTs are the hospital-floor step above CNA — a fast ladder toward LPN/RN.', pay:'$18–25/hr', cert:['CNA certification + employer training','https://www.redcross.org/take-a-class/nurse-assistant-training'], vid:'patient care technician day in the life', qs:['Are you a current, certified CNA?','How do you take vitals and run an EKG accurately?','How do you support nurses on a busy floor while keeping patients safe?','Tell me about staying calm in an emergency.'] },
  surgical_tech: { why:'Surgical techs run the OR sterile field — high respect, faster-than-average growth.', pay:'$25–36/hr', cert:['CST (NBSTSA)','https://www.nbstsa.org'], vid:'surgical technologist day in the life', qs:['Are you CST-certified or working toward it?','Walk me through setting up and protecting the sterile field.','How do you pass instruments and anticipate the surgeon’s needs?','How do you handle an instrument/sponge count discrepancy?'] },
  medical_assistant: { why:'MAs are the fastest-growing clinic role and open the whole healthcare ladder.', pay:'$20–30/hr', cert:['CMA (AAMA) or RMA','https://www.aama-ntl.org'], vid:'medical assistant day in the life', qs:['Are you a certified MA (CMA/RMA)?','How do you room a patient and take accurate vitals?','Comfortable with injections, EKGs and blood draws?','How do you work in an EHR and protect patient privacy?'] },
  phlebotomist: { why:'Phlebotomy is one of the fastest healthcare entries — months of training, not years.', pay:'$19–27/hr', cert:['Phlebotomy Technician (NHA CPT)','https://www.nhanow.com/certifications/phlebotomy-technician'], vid:'phlebotomist day in the life', qs:['Are you a certified phlebotomy technician (CPT)?','How do you perform a venipuncture and handle a difficult stick?','How do you calm a nervous patient?','How do you label and handle samples to avoid mix-ups?'] },
};
// Real labor-market data per role — U.S. Bureau of Labor Statistics, Occupational Outlook Handbook (May 2024).
// med=median annual wage, low/high=10th–90th pctile, growth=2024–34 projection, openings=avg/yr.
const ROLE_BLS = {
  equipment_tech:   {sector:'manufacturing',med:63510,low:44430,high:91620,growth:'+13%',gl:'much faster than average',openings:'54,200',edu:'High-school diploma + on-the-job training',what:'Install, maintain and repair the factory machinery and automated systems that keep production lines running.',advance:'Lead tech → maintenance supervisor → reliability / controls engineer.',url:'https://www.bls.gov/ooh/installation-maintenance-and-repair/industrial-machinery-mechanics-and-maintenance-workers-and-millwrights.htm'},
  maintenance_tech: {sector:'manufacturing',med:63510,low:44430,high:91620,growth:'+13%',gl:'much faster than average',openings:'54,200',edu:'High-school diploma + on-the-job training',what:'Keep plant equipment, conveyors and utilities running with preventive maintenance and fast repairs.',advance:'Maintenance tech → lead → facilities / reliability engineer.',url:'https://www.bls.gov/ooh/installation-maintenance-and-repair/industrial-machinery-mechanics-and-maintenance-workers-and-millwrights.htm'},
  machinist:        {sector:'manufacturing',med:56150,low:38100,high:78760,growth:'steady',gl:'~34,200 openings/yr as machinists retire',openings:'34,200',edu:'High-school diploma + apprenticeship or vocational program',what:'Set up and run lathes, mills and CNC machines to make precision metal parts to blueprint tolerances.',advance:'Machinist → CNC programmer → tool & die maker ($63k+) → shop lead.',url:'https://www.bls.gov/ooh/production/machinists-and-tool-and-die-makers.htm'},
  welder:           {sector:'manufacturing',med:51000,low:38130,high:75850,growth:'+2%',gl:'steady — ~45,600 openings/yr',openings:'45,600',edu:'High-school diploma + welding program / certification',what:'Join metal with MIG, TIG, stick or flux-core for structures, pipe, ships, rockets and more.',advance:'Certified / 6G welder → welding inspector (CWI) → welding supervisor.',url:'https://www.bls.gov/ooh/production/welders-cutters-solderers-and-brazers.htm'},
  electrician:      {sector:'manufacturing',med:62350,low:0,high:0,growth:'+9%',gl:'much faster than average',openings:'81,000',edu:'High-school diploma + paid apprenticeship',what:'Install and maintain electrical systems in plants, data centers, job sites and homes.',advance:'Apprentice → journeyman → master electrician → contractor.',url:'https://www.bls.gov/ooh/construction-and-extraction/electricians.htm'},
  machine_operator: {sector:'manufacturing',med:43570,low:32270,high:63490,growth:'entry-level',gl:'one of the highest-volume roles — ~198,800 openings/yr',openings:'198,800',edu:'High-school diploma; trained on the job',what:'Run the production machines and lines that build vehicles, batteries, electronics and goods.',advance:'Operator → line lead → maintenance or quality technician.',url:'https://www.bls.gov/ooh/production/assemblers-and-fabricators.htm'},
  assembler:        {sector:'manufacturing',med:43570,low:32270,high:63490,growth:'high-volume',gl:'~198,800 openings/yr',openings:'198,800',edu:'High-school diploma; trained on the job',what:'Build finished products and sub-assemblies — EVs, rockets, robots, electronics — by hand and with tools.',advance:'Assembler → lead → quality inspector or technician.',url:'https://www.bls.gov/ooh/production/assemblers-and-fabricators.htm'},
  quality_inspector:{sector:'manufacturing',med:47460,low:34590,high:75510,growth:'steady',gl:'~69,900 openings/yr',openings:'69,900',edu:'High-school diploma + on-the-job training',what:'Measure and test parts with gauges, calipers and GD&T so only in-spec product ships.',advance:'Inspector → QA technician → quality engineer.',url:'https://www.bls.gov/ooh/production/quality-control-inspectors.htm'},
  automotive_tech:  {sector:'manufacturing',med:49670,low:0,high:0,growth:'+4%',gl:'about as fast as average — ~70,000 openings/yr',openings:'70,000',edu:'Postsecondary award or on-the-job training',what:'Diagnose, repair and maintain cars, fleets and increasingly EVs and robotaxis.',advance:'Tech → ASE Master → shop foreman → service manager.',url:'https://www.bls.gov/ooh/installation-maintenance-and-repair/automotive-service-technicians-and-mechanics.htm'},
  hvac:             {sector:'manufacturing',med:59810,low:39130,high:91020,growth:'+9%',gl:'faster than average',openings:'~40,000',edu:'Postsecondary program + EPA 608',what:'Install and service heating, cooling and refrigeration — surging with data centers and housing.',advance:'Installer → service tech → lead → contractor.',url:'https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm'},
  process_tech:     {sector:'semiconductor',med:51180,low:35980,high:87190,growth:'+11%',gl:'much faster than average — CHIPS Act buildout',openings:'3,900',edu:'Certificate or associate degree; some on-the-job',what:'Operate and monitor the tools that fabricate semiconductor wafers in a cleanroom.',advance:'Process tech → equipment tech → process engineer.',url:'https://www.bls.gov/ooh/production/semiconductor-processing-technicians.htm'},
  cleanroom_op:     {sector:'semiconductor',med:51180,low:35980,high:87190,growth:'+11%',gl:'much faster than average — CHIPS Act buildout',openings:'3,900',edu:'High-school diploma + cleanroom training',what:'Run wafer-processing steps in a cleanroom, following exact recipes and logging results.',advance:'Operator → process tech → equipment tech.',url:'https://www.bls.gov/ooh/production/semiconductor-processing-technicians.htm'},
  cna:              {sector:'healthcare',med:37700,low:0,high:0,growth:'+2%',gl:'one of the largest healthcare roles — ~211,800 openings/yr',openings:'211,800',edu:'State-approved CNA program (weeks) + competency exam',what:'Provide hands-on daily care — mobility, bathing, vitals — in hospitals and long-term care.',advance:'CNA → patient-care tech → LPN → RN.',url:'https://www.bls.gov/ooh/healthcare/nursing-assistants.htm'},
  patient_care_tech:{sector:'healthcare',med:37700,low:0,high:0,growth:'+2%',gl:'huge, steady demand — ~211,800 openings/yr',openings:'211,800',edu:'CNA certification + employer training',what:'Support nurses with patient care, vitals, EKGs and phlebotomy on hospital floors.',advance:'PCT → LPN → RN.',url:'https://www.bls.gov/ooh/healthcare/nursing-assistants.htm'},
  surgical_tech:    {sector:'healthcare',med:62830,low:43290,high:90700,growth:'+5%',gl:'faster than average',openings:'8,700',edu:'Postsecondary certificate/associate + certification',what:'Prep the OR, instruments and patients and assist the surgical team during operations.',advance:'Surgical tech → first assistant → OR coordinator.',url:'https://www.bls.gov/ooh/healthcare/surgical-technologists.htm'},
  medical_assistant:{sector:'healthcare',med:44200,low:0,high:0,growth:'+12%',gl:'much faster than average',openings:'112,300',edu:'Postsecondary certificate (~1 year)',what:'Handle clinical and admin tasks in clinics — vitals, EHR, prep, injections.',advance:'MA → lead MA → LPN/RN or office manager.',url:'https://www.bls.gov/ooh/healthcare/medical-assistants.htm'},
  phlebotomist:     {sector:'healthcare',med:43660,low:34860,high:57750,growth:'+6%',gl:'faster than average',openings:'18,400',edu:'Postsecondary certificate (months)',what:'Draw blood for tests, donations and research and manage the samples.',advance:'Phlebotomist → lab assistant → medical lab technician.',url:'https://www.bls.gov/ooh/healthcare/phlebotomists.htm'},
  sterile_processing:{sector:'healthcare',med:47000,low:0,high:0,growth:'steady',gl:'steady hospital demand',openings:'—',edu:'Certificate + CRCST certification',what:'Decontaminate, assemble and sterilize surgical instruments so every OR tray is safe.',advance:'Tech → lead → sterile-processing supervisor.',url:'https://www.bls.gov/ooh/healthcare/'},
};
// The truth a job board never tells you: what the work is really like, and how to start from zero.
const APR = 'https://www.apprenticeship.gov/apprenticeship-job-finder';
const COS = 'https://www.careeronestop.org/Toolkit/Training/find-local-training.aspx';
const ROLE_DEEP = {
  equipment_tech:{ reality:'Fabs and plants run 24/7, so expect 12-hour compressed shifts — often 3 on / 3 off, so you get long stretches off. You’re on your feet, around tools, robots and high-voltage, with strict safety (lockout/tagout, PPE).', thrive:'you’re a hands-on problem-solver who stays calm when a line goes down', onramp:'Many start with a 1–2 week employer or community-college “quick start,” then learn the rest paid on the job. Registered apprenticeships pay you from day one with progressive raises.', link:APR, linkLabel:'Find a paid apprenticeship ↗' },
  maintenance_tech:{ reality:'You keep the plant alive — preventive rounds plus fast fixes when something breaks. Rotating shifts and on-call are common; lots of walking, climbing and overtime if you want it.', thrive:'you like variety and being the person everyone calls when it breaks', onramp:'FAME and registered apprenticeships let you earn a paycheck while you train into a multi-skilled tech (electrical, hydraulics, robotics) — no debt.', link:'https://fame-usa.com/', linkLabel:'Explore FAME earn-and-learn ↗' },
  process_tech:{ reality:'You work inside a cleanroom in a full “bunny suit” — no makeup or cologne, careful methodical work running exact recipes. Usually 12-hour rotating day/night shifts. Quiet, spotless, climate-controlled.', thrive:'you’re detail-obsessed and comfortable following procedures exactly', onramp:'Programs like the 10-day Semiconductor Technician Quick Start train you with zero experience — often free to residents and ending in a guaranteed interview with a local fab.', link:COS, linkLabel:'Find a semiconductor program near you ↗' },
  cleanroom_op:{ reality:'Gowning up and working in a cleanroom: precise, repetitive steps, logging every reading, 12-hour rotating shifts. Calm and climate-controlled, but you must follow the recipe to the letter.', thrive:'you value structure, cleanliness and steady routine', onramp:'A short (1–2 week) fab “quick start” gets you in the door with no experience; you grow into process and equipment tech roles from there.', link:COS, linkLabel:'Find a semiconductor program near you ↗' },
  machinist:{ reality:'Shop or plant floor — coolant, metal chips, ear protection. Precision work to thousandths of an inch; one- or two-shift operations with overtime common.', thrive:'you like making real, precise parts and reading a blueprint', onramp:'Registered machining apprenticeships (and NIMS programs) pay you to learn manual then CNC. Two years in you’re running your own machines.', link:APR, linkLabel:'Find a paid apprenticeship ↗' },
  welder:{ reality:'Hot, bright, hands-on — structural, pipe, ships, aerospace. Some shops are climate-controlled, field work isn’t. Overtime and travel/per-diem pay are common for certified welders.', thrive:'you want a skill you can take anywhere and get paid more as you certify', onramp:'A welding certificate or apprenticeship runs months, not years; pass an AWS test and your pay jumps. Many programs are WIOA-funded (free).', link:COS, linkLabel:'Find a welding program near you ↗' },
  assembler:{ reality:'Build line for EVs, rockets, robots, electronics — standing, repetitive, precise work to a build sheet, often with torque specs and soldering. Day or swing shifts; clean indoor environment.', thrive:'you’re reliable, steady-handed and like seeing a product come together', onramp:'This is the most common entry door in manufacturing — most employers train you on the job. Show up reliable and you move up to lead or technician fast.', link:APR, linkLabel:'Find an entry-level apprenticeship ↗' },
  machine_operator:{ reality:'Run and tend production machines on a 24/7 line — standing, rotating shifts, watching quality and clearing jams. Loud but climate-controlled; overtime usually available.', thrive:'you’re dependable and steady on a routine', onramp:'No experience needed — employers train operators on the job. It’s the fastest paycheck into manufacturing and a launchpad to maintenance or quality.', link:APR, linkLabel:'Find an entry-level apprenticeship ↗' },
  quality_inspector:{ reality:'Measure and test parts with calipers, micrometers and gauges; read blueprints/GD&T. Mostly indoor, day shift, methodical and clean — you’re the last line before product ships.', thrive:'you’re meticulous and like being the one who catches the problem', onramp:'Often a step up from operator/assembler with on-the-job training; an ASQ inspector certificate accelerates it.', link:COS, linkLabel:'Find quality training near you ↗' },
  electrician:{ reality:'Plants, data centers, job sites and homes — physical, problem-solving work with real hazards (you train hard on arc-flash safety). Mostly day shift; strong overtime on big builds.', thrive:'you’re a logical troubleshooter who respects safety', onramp:'A registered electrical apprenticeship is the classic path — 4–5 years, paid from day one with raises, ending as a licensed journeyman with no school debt.', link:APR, linkLabel:'Find an electrical apprenticeship ↗' },
  hvac:{ reality:'In attics, on rooftops, in mechanical rooms — hot and cold, hands-on. Busy seasons mean long days; data-center and housing demand keeps it steady. Mostly day shift, some on-call.', thrive:'you like variety, being mobile, and solving comfort problems', onramp:'A short HVAC program + EPA 608 gets you started; apprenticeships pay while you train. Demand is booming.', link:COS, linkLabel:'Find an HVAC program near you ↗' },
  automotive_tech:{ reality:'Shop floor — lifts, tools, your own toolbox over time. Day shift mostly; pay often climbs with ASE certs and flat-rate efficiency. Increasingly EV and software diagnostics.', thrive:'you love figuring out why something won’t run', onramp:'A postsecondary auto program or dealer apprenticeship gets you in; stack ASE certs to climb to Master Tech.', link:COS, linkLabel:'Find an auto-tech program near you ↗' },
  cna:{ reality:'You’re on your feet a full shift — lifting and moving people, helping with the hardest, most human moments. 8- or 12-hour shifts including nights and weekends. Emotionally heavy, deeply meaningful.', thrive:'you’re patient, strong, and genuinely care about people', onramp:'CNA training is short — 4–12 weeks (employer-sponsored often 3–6). Many hospitals and nursing homes pay for it free in exchange for a work commitment; WIOA grants cover the rest.', link:COS, linkLabel:'Find free/low-cost CNA training near you ↗' },
  patient_care_tech:{ reality:'Hospital floors — fast-paced, on your feet, supporting nurses with vitals, EKGs, draws and patient care. 12-hour shifts including nights/weekends. Intense but you’re part of a team that matters.', thrive:'you stay calm under pressure and like a busy, purposeful day', onramp:'Start as a CNA (a few weeks, often free), then add PCT skills on the job or a short course — a direct ladder toward LPN/RN.', link:COS, linkLabel:'Find free/low-cost training near you ↗' },
  surgical_tech:{ reality:'In the OR — sterile, focused, on your feet for long cases, prepping instruments and assisting the team. Day shift with on-call rotations. High-stakes, high-respect work.', thrive:'you’re calm, precise and unflappable under pressure', onramp:'A surgical-tech certificate/associate program (about 12–24 months) plus certification gets you in; some hospitals sponsor it.', link:COS, linkLabel:'Find a surgical-tech program near you ↗' },
  medical_assistant:{ reality:'Clinic pace — rooming patients, vitals, EHR, injections, front-and-back office. Mostly weekday day shifts. Great first step that opens the whole healthcare ladder.', thrive:'you’re organized, friendly and like steady daytime hours', onramp:'A medical-assistant certificate runs about a year (some accelerated); WIOA and employer programs can fund it.', link:COS, linkLabel:'Find an MA program near you ↗' },
  phlebotomist:{ reality:'Draw blood all shift — steady hands, good with nervous patients, lots of brief human interactions. Hospital, lab or mobile; mostly day shifts.', thrive:'you’re calm, friendly and don’t mind needles', onramp:'One of the fastest healthcare entries — a phlebotomy certificate takes months, and many programs are low-cost or WIOA-funded.', link:COS, linkLabel:'Find a phlebotomy program near you ↗' },
  sterile_processing:{ reality:'Behind the scenes of the OR — decontaminate, assemble and sterilize instrument trays. Methodical, standards-driven, often early or evening shifts. No patient contact if that’s your preference.', thrive:'you’re detail-driven and like clear procedures', onramp:'A sterile-processing certificate + CRCST gets you in; some hospitals train and certify you on the job.', link:COS, linkLabel:'Find a sterile-processing program near you ↗' },
};
function ytSearch(q){ return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q); }
// Real, curated "day in the life" / training videos per role (verified YouTube IDs).
const ROLE_VIDEO = {
  process_tech:'6hy8_mQB1Hk', cleanroom_op:'B5nvSSvSnXo', equipment_tech:'WOhE31hxvtI',
  machinist:'z4XXutxFpx4', machine_operator:'L96D7c9tNIQ', welder:'CuDwydMjgGg', hvac:'qGDqbJCeiXc',
  electrician:'lifunadBZ3U', maintenance_tech:'lmMi3ACL-Jk',
  cna:'Dc_sQpfhKfc', patient_care_tech:'Dc_sQpfhKfc', surgical_tech:'RuSx08nMfME', medical_assistant:'s-lM2uwiwyQ',
  phlebotomist:'tvTG8DD4q2Y', sterile_processing:'i2TvrUa-C_Q',
};
// Embed the real curated video if we have one; otherwise fall back to a YouTube topic search.
function learnVideo(trade, searchTerm){
  const id = ROLE_VIDEO[trade];
  if(id) return `<div class="lv-wrap"><iframe class="lv-frame" src="https://www.youtube-nocookie.com/embed/${id}" title="${T('Day in the life')}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  return `<a class="track-link vid" href="${ytSearch(searchTerm||trade)}" target="_blank" rel="noopener noreferrer">${icon('star')} ${T('Watch: day in the life')}</a>`;
}
function learnTrackCard(key){
  const t = LEARN_TRACKS[key]; if(!t) return '';
  return `<div class="card track-card">
    <div class="track-h"><span class="trend-ic">${tradeEmoji(key)}</span><div><b>${ROLE_BLS[key]?`<a class="cand-link" href="/careers/${key}">${esc(TRADES[key]||key)}</a>`:esc(TRADES[key]||key)}</b><div class="muted sm">${t.pay} · ${T('hiring now')}</div></div></div>
    <p class="track-why">${T(t.why)}</p>
    ${learnVideo(key, t.vid)}
    <div class="track-links">
      <a class="track-link" href="${esc(t.cert[1])}" target="_blank" rel="noopener noreferrer">${icon('shield')} ${esc(t.cert[0])} ↗</a>
      <a class="track-link prep" href="/app/learn/interview?trade=${key}">${icon('spark')} ${T('Practice the interview')}</a>
    </div>
  </div>`;
}
// Kickass AI interview: job/role-aware, scores every answer, ends with a readiness verdict.
// state = { trade, jobId, company, questions:[...], history:[{q,a,rating,tip}], qi, done, verdict }
const RATE_META = { strong:['Strong','rate-strong'], solid:['Solid','rate-solid'], weak:['Needs work','rate-weak'] };
// Per-sector "what good looks like" so the interview teaches, not just quizzes.
const IV_AIM = {
  semiconductor: 'Show you follow process recipes exactly, keep the cleanroom contamination-free, document and escalate out-of-spec readings, and can handle 12-hour rotating shifts.',
  manufacturing: 'Lead with safety (lockout/tagout, PPE), reading blueprints/specs and using measuring tools, precision, and a specific time you prevented downtime or scrap — with a number.',
  healthcare: 'Center patient safety and dignity, staying calm under pressure, your current certification, and teamwork on a busy floor — with a real example.',
};
function mockInterview(st){
  const { trade, jobId='', company='', questions=[], history=[], qi=0, done=false, verdict=null, aiOn=false } = st;
  const label = TRADES[trade] || trade;
  const total = questions.length || (history.length + 1);
  const curQ = done ? null : questions[qi];
  const ctx = company ? `${esc(label)} · ${esc(company)}` : esc(label);
  const turn = (h)=>`<div class="iv-turn">
      <div class="iv-q">${icon('spark')} ${esc(h.q)}</div>
      <div class="iv-a">${esc(h.a)}</div>
      <div class="iv-fb"><span class="rate-chip ${RATE_META[h.rating]?RATE_META[h.rating][1]:'rate-solid'}">${T((RATE_META[h.rating]||RATE_META.solid)[0])}</span> <span>${esc(h.tip)}</span></div>
    </div>`;
  return `<section class="wrap narrow">
    <a class="back" href="${jobId?`/app/jobs/${jobId}`:'/app/training'}">← ${jobId?T('Back to the job'):T('Back to Learn')}</a>
    <div class="sec-h big">${icon('spark','xic')} ${T('AI mock interview')} <span class="muted">${ctx}</span></div>
    <div class="iv-progress"><div class="iv-bar"><i style="width:${Math.round((history.length/Math.max(total,1))*100)}%"></i></div>
      <span class="muted sm">${done?T('Complete'):`${T('Question')} ${history.length+1} ${T('of')} ${total}`}</span></div>
    ${history.map(turn).join('')}
    ${done ? `<div class="card verdict-card">
        <div class="verdict-ring ${verdict.cls}"><b>${verdict.score}</b><span>${T('ready')}</span></div>
        <div class="verdict-body">
          <div class="verdict-h">${T(verdict.headline)}</div>
          <p class="verdict-good">${icon('check')} ${T('Strongest')}: ${esc(verdict.good)}</p>
          <p class="verdict-fix">${icon('spark')} ${T('Work on')}: ${esc(verdict.fix)}</p>
          <div class="verdict-cta">
            <a class="btn-sm ghost" href="/app/learn/interview?trade=${esc(trade)}${jobId?`&job=${esc(jobId)}`:''}">${T('Practice again')}</a>
            ${jobId?`<a class="btn-sm" href="/app/jobs/${jobId}">${T('Apply to this job →')}</a>`:`<a class="btn-sm" href="/app/jobs">${T('See matching jobs →')}</a>`}
          </div>
        </div>
      </div>`
    : `<div class="card iv-current">
        <div class="iv-q big">${icon('spark')} ${esc(curQ||'')}</div>
        ${(()=>{ const sec = ROLE_BLS[trade] && ROLE_BLS[trade].sector; const aim = IV_AIM[sec]; return aim?`<div class="iv-aim">${icon('star')} <b>${T('What a strong answer shows')}:</b> ${T(aim)}</div>`:''; })()}
        <form method="post" action="/app/learn/interview" class="iv-answer">
          <input type="hidden" name="trade" value="${esc(trade)}">
          <input type="hidden" name="job" value="${esc(jobId)}">
          <input type="hidden" name="qi" value="${qi}">
          <input type="hidden" name="history" value="${esc(JSON.stringify(history))}">
          <textarea name="answer" id="ivans" rows="3" placeholder="${T('Type or tap the mic and speak your answer…')}" required maxlength="900" autofocus></textarea>
          <div class="iv-actions">
            <button type="button" class="mic-btn" id="micbtn" aria-label="${esc(T('Speak your answer'))}">${icon('bell')} <span>${T('Speak')}</span></button>
            <button class="btn">${T('Answer')} →</button>
          </div>
        </form>
        <p class="muted sm">${T('Answer like the real thing — use STAR (Situation, Task, Action, Result) and a specific example. The coach scores each answer.')}${aiOn?'':` ${T('(Offline coach: scored on specifics & detail.)')}`}</p>
      </div>
      <script>(function(){var b=document.getElementById('micbtn'),a=document.getElementById('ivans');
        var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
        if(!SR||!b){if(b)b.style.display='none';return;}
        var rec=new SR();rec.lang=(document.documentElement.lang||'en').indexOf('es')===0?'es-US':'en-US';rec.interimResults=true;rec.continuous=true;var base='',on=false;
        rec.onresult=function(e){var s='';for(var i=e.resultIndex;i<e.results.length;i++)s+=e.results[i][0].transcript;a.value=(base?base+' ':'')+s;};
        rec.onend=function(){on=false;b.classList.remove('rec');};
        b.onclick=function(){if(on){rec.stop();return;}base=a.value.trim();try{rec.start();on=true;b.classList.add('rec');}catch(e){}};
      })();</script>`}
  </section>`;
}
function workerTraining({ have = [], hiring = [] }) {
  const haveSet = new Set(have);
  const all = Object.keys(TRAINING);
  const todo = all.filter(k=>!haveSet.has(k));
  const done = all.filter(k=>haveSet.has(k));
  return `<section class="wrap">
    <div class="sec-h big">${T('Learn & get hired')} <span class="muted">${T('Real career tracks for the roles hiring on Rivet right now')}</span></div>
    ${(()=>{ const keys=(hiring&&hiring.length?hiring:Object.keys(LEARN_TRACKS)).filter(k=>LEARN_TRACKS[k]).slice(0,8); return keys.length?`
    <div class="sec-h" style="margin-top:4px">${icon('flame','xic')} ${T('Career tracks — hiring now')}</div>
    <div class="track-grid">${keys.map(learnTrackCard).join('')}</div>`:''; })()}
    <div class="card info-card" style="margin-top:18px">${T('Certifications are the fastest way to stand out. Every one you add to your Work Card is verified and boosts how you match to jobs. Below is how to earn each — most can be done online or through a local provider.')}</div>
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

// ---------- "Land This Job": the worker co-pilot — qualify → plan → practice → apply ----------
function landJob({ job, company = '', score = 0, breakdown = {}, missing = [], readiness = 0, haveCreds = [], distance = null, applied = false, external = false, trust = '' }){
  const trade = job.trade, role = TRADES[trade] || trade;
  const qualifies = score >= 70 && missing.length === 0;
  const ring = score>=80 ? 'rate-strong' : score>=60 ? 'rate-solid' : 'rate-weak';
  const have = [];
  if((breakdown.trade||0) >= 30) have.push(T('Your trade matches this role'));
  if(distance!=null && distance<=60) have.push(`${T('Within range')} — ${distance} mi`);
  haveCreds.slice(0,4).forEach(c=>have.push(`${esc(CRED_KINDS[c]||c)} ✓`));
  if(readiness) have.push(`${T('Readiness')} ${readiness}/100`);
  if(!have.length) have.push(T('You’ve started your Work Card'));
  const planCards = missing.map(k=>{ const tr = TRAINING[k]; return `<div class="plan-step"><span class="plan-n">${icon('shield')}</span>
      <div class="plan-b"><b>${esc(CRED_KINDS[k]||k)}</b><p class="muted sm">${tr?esc(tr.how):T('Add this credential to qualify.')}</p>
      ${tr&&tr.url?`<a class="btn-xs" href="${esc(tr.url)}" target="_blank" rel="noopener noreferrer">${T('How to earn it ↗')}</a>`:''}</div></div>`; }).join('');
  return `<section class="wrap narrow">
    <a class="back" href="/app/jobs/${job.id}">← ${T('Back to the job')}</a>
    <div class="sec-h big">${T('Your game plan')} <span class="muted">${esc(role)}${company?` · ${esc(company)}`:''}</span></div>
    <div class="card verdict-card land-hero">
      <div class="verdict-ring ${ring}"><b>${score}</b><span>${T('match')}</span></div>
      <div class="verdict-body"><div class="verdict-h">${qualifies?T('You qualify — go for it.'):T('You’re close. Here’s how to lock it in.')}</div>
        <p class="muted sm">$${job.pay_min}–${job.pay_max}/hr · ${esc(job.city)}${distance!=null?` · ${distance} mi`:''}</p></div>
    </div>
    ${trust}
    <div class="grid2">
      <div class="card"><div class="sec-h" style="margin-top:0">${icon('check','xic')} ${T('What you’ve got')}</div>
        <ul class="land-list">${have.map(h=>`<li>${h}</li>`).join('')}</ul></div>
      <div class="card"><div class="sec-h" style="margin-top:0">${icon('spark','xic')} ${T('Close the gap')}</div>
        ${missing.length?`<div class="plan-steps">${planCards}</div><a class="btn-sm" href="/app/training" style="margin-top:10px">${T('See all training →')}</a>`:`<p class="muted">${T('You meet the credential requirements. Nice.')}</p>`}</div>
    </div>
    <div class="card agent-card row"><div><div class="agent-h">${icon('spark','xic')} ${T('Practice the interview')}</div>
      <p class="agent-line">${T('A scored mock interview for this exact role and employer — your readiness verdict in 5 minutes.')}</p></div>
      <a class="btn-sm" href="/app/learn/interview?job=${job.id}">${T('Start mock interview →')}</a></div>
    <div class="card agent-card row"><div><div class="agent-h">${icon('check','xic')} ${applied?T('Applied ✓'):T('Apply with your verified Work Card')}</div>
      <p class="agent-line">${T('The employer sees your checked credentials and Show-Up Score.')}</p></div>
      ${applied?`<span class="v ok">${T('Applied')}</span>`:external?`<a class="btn-sm" href="${esc(job.apply_url)}" target="_blank" rel="noopener noreferrer">${T('Apply on')} ${esc(job.source)} ↗</a>`:`<form method="post" action="/app/jobs/${job.id}/apply"><button class="btn-sm">${T('Apply now')}</button></form>`}</div>
  </section>`;
}

// ---------- Verified shift & contract marketplace (the money engine) ----------
function fmtShiftDate(d){ try { return new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); } catch(e){ return d; } }
function t12(hm){ const [h,m] = String(hm).split(':').map(Number); const ap = h>=12?'p':'a'; const hh = ((h+11)%12)+1; return hh + (m?(':'+String(m).padStart(2,'0')):'') + ap; }
function shiftHours(s){ const [a,b]=String(s.start_time).split(':').map(Number); const [c,d]=String(s.end_time).split(':').map(Number); let h=(c+d/60)-(a+b/60); if(h<=0)h+=24; return Math.round(h*10)/10; }
function shiftCard(s){
  const hrs = shiftHours(s), earn = Math.round((s.pay_rate||0)*hrs);
  const kl = {'per-diem':T('Per-diem'),'contract':T('Contract'),'travel':T('Travel')}[s.kind] || s.kind;
  return `<div class="card shift-card ${s.kind}">
    <div class="shift-top"><span class="shift-kind ${s.kind}">${kl}</span>${s.urgent?`<span class="shift-urgent">${icon('flame')} ${T('Fills fast')}</span>`:''}${s.mine?`<span class="shift-fit">${T('Your trade')}</span>`:''}</div>
    <div class="shift-title">${tradeEmoji(s.trade)} ${esc(s.title)}</div>
    <div class="muted sm">${esc(s.company||'')} · ${esc(s.city||'')}${s.distance!=null?` · ${s.distance} mi`:''}</div>
    <div class="shift-when">${icon('bell')} ${fmtShiftDate(s.date)} · ${t12(s.start_time)}–${t12(s.end_time)} <span class="muted">(${hrs} ${T('hrs')})</span></div>
    <div class="shift-pay"><b>$${s.pay_rate}/hr</b> <span class="muted sm">· ~$${earn.toLocaleString()} ${T('this shift')} · ${T('paid next day')}</span></div>
    <div class="shift-foot">
      ${s.claimed?`<span class="v ok">${T('Claimed ✓')}</span>`:s.status==='filled'?`<span class="muted sm">${T('Just filled')}</span>`:`<form method="post" action="/app/shifts/${s.id}/claim"><button class="btn-sm">${T('Claim shift')} →</button></form>`}
      <span class="shift-noagency">${icon('check')} ${T('No agency cut')}</span>
    </div>
  </div>`;
}
function shiftsBoard({ shifts = [], showUp = null, claims = [], conflict = false, openToExtra = false }){
  let weekPanel = '';
  if(claims.length){
    const byDate = {}; let total=0, hoursTotal=0;
    claims.forEach(c=>{ const h=shiftHours(c); const earn=Math.round((c.pay_rate||0)*h); total+=earn; hoursTotal+=h; (byDate[c.date]=byDate[c.date]||[]).push({...c,earn}); });
    const days = Object.keys(byDate).sort();
    weekPanel = `<div class="card week-card">
      <div class="week-h"><div><div class="agent-h">${icon('check','xic')} ${T('My week')}</div>
        <p class="muted sm" style="margin:2px 0 0">${claims.length} ${claims.length===1?T('gig'):T('gigs')} · ${hoursTotal} ${T('hrs')} · ${days.length} ${days.length===1?T('employer'):T('employers')}</p></div>
        <div class="week-earn"><b>~$${total.toLocaleString()}</b><span>${T('projected')}</span></div></div>
      ${days.map(d=>`<div class="week-day"><span class="week-date">${fmtShiftDate(d)}</span><div class="week-gigs">${byDate[d].map(g=>`<span class="week-gig">${tradeEmoji(g.trade)} ${esc(g.company)} · ${t12(g.start_time)}–${t12(g.end_time)} · <b>$${g.earn}</b></span>`).join('')}</div></div>`).join('')}
      <p class="muted sm" style="margin-top:8px">${T('Stack as many as you can work — Rivet keeps your schedule clear of double-bookings.')}</p>
    </div>`;
  }
  return `<section class="wrap">
    <div class="sec-h big">${icon('bolt','xic')} ${T('Open shifts & contracts')} <span class="muted">${T('Get paid this week — no agency, no résumé')}</span></div>
    ${conflict?`<div class="warn-card">${T('That shift overlaps one you already claimed — pick a different time so you’re not double-booked.')}</div>`:''}
    <div class="card shift-banner"><div class="sb-txt">${T('Verified workers claim open shifts straight from the employer — per-diem, contract and travel. Stack multiple jobs, keep your full rate; we cut out the staffing agency.')}</div>
      ${showUp!=null?`<span class="shift-su">${icon('check')} ${T('Your Show-Up Score')}: <b>${showUp}%</b></span>`:`<span class="shift-su muted sm">${T('Verify your Work Card to claim faster')}</span>`}</div>
    ${weekPanel}
    ${shifts.length?`<div class="grid3 shift-grid">${shifts.map(shiftCard).join('')}</div>`:`<p class="muted">${T('No open shifts right now — check back soon.')}</p>`}
  </section>`;
}

// ---------- Public-registry Sourcing Agent (recruiter) ----------
// Maps a credential to its OFFICIAL public verification source. We never scrape — we point
// the recruiter to the authoritative registry/board so they can verify a claim themselves.
const REGISTRY = {
  cna_cert:   { src:'State Nurse Aide Registry', url:'https://www.careeronestop.org/Toolkit/Training/find-certifications.aspx', state:true },
  hha:        { src:'State Home Health Aide Registry', url:'https://www.careeronestop.org/Toolkit/Training/find-certifications.aspx', state:true },
  bls:        { src:'AHA CPR/BLS eCard', url:'https://www.heart.org/en/cpr/course-formats/ecards', state:false },
  cpr:        { src:'AHA CPR eCard', url:'https://www.heart.org/en/cpr/course-formats/ecards', state:false },
  license:    { src:'State licensing board', url:'https://www.careeronestop.org/Toolkit/Training/find-licenses.aspx', state:true },
  aws_welding:{ src:'AWS Certified Welder', url:'https://www.aws.org/certification', state:false },
  nate:       { src:'NATE technician registry', url:'https://natex.org', state:false },
  ase:        { src:'ASE certification', url:'https://www.ase.com', state:false },
  nccer:      { src:'NCCER registry', url:'https://www.nccer.org', state:false },
  nccco_crane:{ src:'NCCCO crane operator', url:'https://www.nccco.org', state:false },
  osha10:     { src:'OSHA Outreach card', url:'https://www.osha.gov/training/outreach', state:false },
  osha30:     { src:'OSHA Outreach card', url:'https://www.osha.gov/training/outreach', state:false },
  epa608:     { src:'EPA Section 608', url:'https://www.epa.gov/section608', state:false },
  cdl:        { src:'State DMV / FMCSA', url:'https://www.fmcsa.dot.gov', state:true },
  twic:       { src:'TSA TWIC', url:'https://www.tsa.gov/for-industry/twic', state:false },
  guard_card: { src:'State security guard registry', url:'https://www.careeronestop.org/Toolkit/Training/find-licenses.aspx', state:true },
};
function regFor(kind){
  return REGISTRY[kind] || { src:(CRED_KINDS[kind]||kind), url:(TRAINING[kind]&&TRAINING[kind].url)||'https://www.careeronestop.org/Toolkit/Training/find-certifications.aspx', state:false };
}
function registryChips(creds = []){
  if(!creds.length) return `<span class="muted sm">${T('No verified credentials on file yet.')}</span>`;
  return creds.map(c=>{ const r=regFor(c.kind); return `<a class="reg-chip ${c.verified?'v':''}" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" title="${T('Verify on the official public registry')}">${c.verified?icon('check'):icon('shield')} ${esc(CRED_KINDS[c.kind]||c.kind)} <span class="reg-src">${T('verify')} · ${esc(r.src)}${r.state?` (${T('state')})`:''} ↗</span></a>`; }).join('');
}
// roles: [{trade,label,demand:{ratio,level},open}]  leads: [{id,name,city,trade,readiness,vcount,creds,score,available}]
function sourcingAgent({ roles = [], picked = '', pickedLabel = '', leads = [], market = null, sourcedCount = 0, jobsForRole = [] }){
  const lvlLabel = { vtight:T('Very short-staffed'), tight:T('Short-staffed'), bal:T('Balanced'), comp:T('Competitive') };
  const roleRows = roles.map(r=>`<a class="src-role ${r.trade===picked?'on':''} ${r.demand.level}" href="/console/source?trade=${r.trade}">
      <span class="trend-ic">${tradeEmoji(r.trade)}</span>
      <span class="src-role-main"><b>${esc(r.label)}</b><span class="bal-chip ${r.demand.level}">${lvlLabel[r.demand.level]}</span></span>
      <span class="src-role-num">${r.demand.ratio}× <small>${T('demand')}</small>${r.open?` · ${r.open} ${T('avail.')}`:''}</span>
    </a>`).join('');
  const leadCards = leads.map(w=>`<div class="card src-lead">
      <div class="src-lead-h">
        <a class="cand-link" href="/console/candidates/${w.id}"><span class="av-t">${initials(w.name)}</span><b>${esc(w.name)}</b></a>
        <span class="score-tag ${scoreClass(w.score)}">${w.score}</span>
      </div>
      <div class="muted sm">${tradeEmoji(w.trade)} ${esc(TRADES[w.trade]||w.trade)} · ${esc(w.city||'—')} · ${T('readiness')} ${w.readiness||0}${w.available?` · <span class="v ok">${T('available')}</span>`:''}</div>
      <div class="reg-row">${registryChips(w.creds)}</div>
      <div class="src-lead-ft">
        <a class="btn-xs" href="/console/candidates/${w.id}">${T('View Work Card')} →</a>
        <form method="post" action="/console/candidates/${w.id}/save"><input type="hidden" name="from" value="source"><input type="hidden" name="trade" value="${picked}"><button class="btn-xs ghost">★ ${T('Shortlist')}</button></form>
      </div>
    </div>`).join('');
  return `<section class="wrap">
    <div class="page-h"><h2>${icon('spark','xic')} ${T('Sourcing Agent')}</h2>
      <p class="muted">${T('Find verified talent for the roles where hiring is hardest — and verify every credential against its official public registry.')}</p></div>
    ${sourcedCount?`<div class="ok-card">${T('Added')} ${sourcedCount} ${T('candidate(s) to your pipeline.')}</div>`:''}
    <div class="src-grid">
      <div class="card src-roles">
        <div class="sec-h" style="margin-top:0">${icon('bolt','xic')} ${T('Where you can win')}</div>
        <p class="muted sm" style="margin-top:-4px">${T('Ranked by how short-staffed the role is nationally — the tighter the market, the more your filled seat is worth.')}</p>
        ${roleRows || `<p class="muted sm">${T('Post a job to see demand for your roles.')}</p>`}
      </div>
      <div class="src-main">
        ${picked ? `
          ${market?`<div class="card mkt-card ${market.level}"><div class="mkt-h"><span class="bal-chip ${market.level}">${lvlLabel[market.level]}</span> <b>${esc(pickedLabel)}</b> <span class="muted sm">· ${market.ratio}× ${T('demand vs supply')}</span></div>
            <p class="mkt-advice">${T('Verified, registry-checked candidates ranked by fit. Move on the top few fast — this role is hard to fill.')}</p></div>`:''}
          ${jobsForRole.length?`<form method="post" action="/console/source/auto" class="src-auto"><input type="hidden" name="trade" value="${picked}">
            <label class="sm">${T('One-click: add the top matches to')} <select name="job_id">${jobsForRole.map(j=>`<option value="${j.id}">${esc(T(j.title))}</option>`).join('')}</select></label>
            <button class="btn-sm">${T('Source top 5 →')}</button></form>`:''}
          <div class="sec-h">${leads.length} ${T('verified candidates')} — ${esc(pickedLabel)}</div>
          ${leadCards || `<div class="card muted">${T('No verified candidates for this role yet. Try a nearby trade, or post the role to attract applicants.')}</div>`}
        ` : `<div class="card src-empty"><div class="agent-h">${icon('spark','xic')} ${T('Pick a role to source')}</div>
          <p class="muted">${T('Choose a high-demand role on the left. The agent ranks every verified worker by fit, shows their credentials, and links each one to its official public registry so you can verify before you reach out.')}</p>
          <p class="muted sm">${T('Sources: state Nurse Aide registries, state licensing boards, AWS / NATE / ASE / NCCER / NCCCO / OSHA registries, AHA eCards. We link to official sources only — no scraping.')}</p></div>`}
      </div>
    </div>
  </section>`;
}

// ---------- Employer: post a shift + claims dashboard ----------
const SHIFT_KINDS = { 'per-diem':'Per-diem (single shift)', 'contract':'Contract (multi-day)', 'travel':'Travel assignment' };
function empShiftForm(error='', v={}){
  const opts = tradeOptionsGrouped(v.trade||'');
  const val = (k,d='') => v[k]!=null && v[k]!=='' ? esc(v[k]) : d;
  return `<section class="wrap narrow"><div class="card">
    <a class="back" href="/console/shifts">← ${T('My shifts')}</a>
    <h2>${T('Post a shift')}</h2><p class="muted">${T('Open shifts go straight to verified, ready-to-work crews — they keep their full rate, you skip the staffing agency.')}</p>
    ${error?`<div class="err">${esc(error)}</div>`:''}
    <form method="post" action="/console/shifts/new">
      <label>${T('Title')} <input name="title" required placeholder="${T('e.g. CNA — NOC shift')}" value="${val('title')}"></label>
      <label>${T('Role / trade')} <select name="trade">${opts}</select></label>
      <div class="row2"><label>${T('Type')} <select name="kind">${Object.entries(SHIFT_KINDS).map(([k,l])=>`<option value="${k}" ${v.kind===k?'selected':''}>${T(l)}</option>`).join('')}</select></label>
        <label>${T('Pay ($/hr)')} <input type="number" step="0.5" name="pay_rate" required value="${val('pay_rate','24')}"></label></div>
      <div class="row2"><label>${T('City')} <input name="city" value="${val('city','Phoenix')}"></label>
        <label>${T('ZIP')} <input name="zip" value="${val('zip','85004')}"></label></div>
      <div class="row2"><label>${T('Date')} <input type="date" name="date" required value="${val('date')}"></label>
        <label>${T('Openings')} <input type="number" name="slots" min="1" value="${val('slots','1')}"></label></div>
      <div class="row2"><label>${T('Start')} <input type="time" name="start_time" required value="${val('start_time','07:00')}"></label>
        <label>${T('End')} <input type="time" name="end_time" required value="${val('end_time','15:00')}"></label></div>
      <label class="ck"><input type="checkbox" name="urgent" value="1" ${v.urgent?'checked':''}> ${T('Mark urgent — needs to fill fast')}</label>
      <label>${T('Notes')} <textarea name="descr" rows="2" placeholder="${T('Unit, parking, what to bring…')}">${val('descr')}</textarea></label>
      <button class="btn full">${T('Post shift')}</button>
    </form>
  </div></section>`;
}
function empShifts({ shifts = [] }){
  const open = shifts.filter(s=>s.status==='open').length;
  const totalClaims = shifts.reduce((a,s)=>a+(s.claimants?s.claimants.length:0),0);
  const card = s => {
    const hrs = shiftHours(s), filled = s.claimants?s.claimants.length:0, slots = s.slots||1;
    const kl = SHIFT_KINDS[s.kind] ? T(SHIFT_KINDS[s.kind]) : s.kind;
    return `<div class="card emp-shift ${s.status}">
      <div class="shift-top"><span class="shift-kind ${s.kind}">${esc(String(kl).split(' (')[0])}</span>${s.urgent?`<span class="shift-urgent">${icon('flame')} ${T('Urgent')}</span>`:''}${s.status!=='open'?`<span class="closed-tag">${s.status==='filled'?T('Filled'):T('Closed')}</span>`:''}</div>
      <div class="shift-title">${tradeEmoji(s.trade)} ${esc(s.title)}</div>
      <div class="muted sm">${fmtShiftDate(s.date)} · ${t12(s.start_time)}–${t12(s.end_time)} (${hrs} ${T('hrs')}) · $${s.pay_rate}/hr · ${esc(s.city||'')}</div>
      <div class="emp-shift-fill"><b>${filled}/${slots}</b> ${T('claimed')} <div class="fillbar"><span style="width:${Math.min(100,Math.round(filled/slots*100))}%"></span></div></div>
      ${filled?`<div class="claimant-row">${s.claimants.map(c=>`<a class="cand-link sm" href="/console/candidates/${c.worker_id}"><span class="av-t">${initials(c.name)}</span>${esc(c.name)}${c.show_up!=null?` · ${c.show_up}%`:''}</a>`).join('')}</div>`:`<p class="muted sm">${T('No claims yet — verified workers see this on their Shifts board.')}</p>`}
      <div class="emp-shift-ft">${s.status==='open'?`<form method="post" action="/console/shifts/${s.id}/close"><button class="btn-xs ghost">${T('Close')}</button></form>`:''}</div>
    </div>`;
  };
  return `<section class="wrap">
    <div class="page-h"><h2>${icon('bolt','xic')} ${T('Shifts & contracts')}</h2><p class="muted">${open} ${T('open')} · ${totalClaims} ${T('claimed')}</p>
      <a class="btn-sm right" href="/console/shifts/new">${T('+ Post a shift')}</a></div>
    <div class="card shift-banner"><div class="sb-txt">${T('Post per-diem, contract or travel shifts to verified, job-ready workers. They claim in one tap with a verified Work Card — no agency markup, you pay them direct.')}</div></div>
    ${shifts.length?`<div class="grid3 shift-grid">${shifts.map(card).join('')}</div>`:`<div class="card src-empty"><div class="agent-h">${icon('bolt','xic')} ${T('No shifts posted yet')}</div><p class="muted">${T('Post your first open shift — it goes straight to verified crews who can start now.')}</p><a class="btn-sm" href="/console/shifts/new">${T('+ Post a shift')}</a></div>`}
  </section>`;
}

// ---------- Voice-guided 0-click agent (client-side intent → action) ----------
function voiceAgent(mode){
  const isEmp = mode==='employer';
  // intent table the browser uses to map a spoken phrase → an action with no clicks
  const intents = isEmp ? [
    {re:'post (a )?(job|position|role)', url:'/console/jobs/new', say:'Opening Post a job'},
    {re:'post (a )?shift|new shift|add (a )?shift', url:'/console/shifts/new', say:'Opening Post a shift'},
    {re:'shift|per ?diem|contract|claim', url:'/console/shifts', say:'Opening your shifts'},
    {re:'sourc|find (me )?(candidates|talent|workers)|who can i hire', url:'/console/source', say:'Opening the Sourcing Agent'},
    {re:'talent|candidate|search|pool', url:'/console/search', say:'Opening Talent Search'},
    {re:'job|posting|listing', url:'/console/jobs', say:'Opening your jobs'},
    {re:'analytic|report|funnel|metric', url:'/console/analytics', say:'Opening analytics'},
    {re:'message|inbox|chat', url:'/console/messages', say:'Opening messages'},
    {re:'agent', url:'/console/agents', say:'Opening agents'},
    {re:'home|overview|dashboard', url:'/console', say:'Going to your overview'},
  ] : [
    {re:'shift|gig|per ?diem|extra work|this weekend|tonight', url:'/app/shifts', say:'Opening open shifts near you'},
    {re:'job|work near|find work|hiring', url:'/app/jobs', say:'Opening jobs near you'},
    {re:'apply for me|auto.?apply|apply me|match me', url:'/app/agent/apply', post:true, say:'Finding and applying you to your best matches'},
    {re:'coach|what should i learn|which (cert|credential)|earn more', url:'/app/coach', say:'Opening your Career Coach'},
    {re:'interview|practice|mock', url:'/app/learn/interview', say:'Opening the mock interview'},
    {re:'train|certif|class|course', url:'/app/training', say:'Opening training'},
    {re:'work card|profile|my card|resume', url:'/app/profile', say:'Opening your Work Card'},
    {re:'applicat|status|where am i', url:'/app/applications', say:'Opening your applications'},
    {re:'message|inbox|chat', url:'/app/messages', say:'Opening messages'},
    {re:'home|main', url:'/app', say:'Going home'},
  ];
  // role keyword search (worker only): "find welder jobs", "cna shifts"
  const roleHints = Object.entries(TRADES).map(([k,v])=>[k, v.toLowerCase()]);
  return `
  <button id="va-fab" class="va-fab" aria-label="${T('Voice assistant')}" title="${T('Talk to Rivet')}">${icon('mic')}</button>
  <div id="va-panel" class="va-panel" hidden>
    <div class="va-h">${icon('mic','xic')} <b>${T('Voice assistant')}</b><button id="va-x" class="va-x" aria-label="${T('Close')}">×</button></div>
    <div id="va-status" class="va-status muted sm">${T('Tap the mic and say what you want — “open shifts”, “find welder jobs”, “practice interview”.')}</div>
    <div id="va-heard" class="va-heard" hidden></div>
    <div class="va-row">
      <button id="va-mic" class="va-mic">${icon('mic')} <span>${T('Hold to talk')}</span></button>
    </div>
    <form id="va-form" class="va-typed"><input id="va-text" placeholder="${T('…or type a command')}" autocomplete="off"><button class="btn-xs">${T('Go')}</button></form>
    <div class="va-tips muted sm">${(isEmp?['post a shift','source CNAs','talent search','analytics']:['open shifts','find electrician jobs','practice interview','career coach']).map(x=>`<button class="va-chip" data-cmd="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  </div>
  <script>(function(){
    var INTENTS=${JSON.stringify(intents)}, ROLES=${JSON.stringify(roleHints)}, WORKER=${isEmp?'false':'true'};
    var fab=document.getElementById('va-fab'), panel=document.getElementById('va-panel'),
        statusEl=document.getElementById('va-status'), heard=document.getElementById('va-heard'),
        micBtn=document.getElementById('va-mic'), form=document.getElementById('va-form'), text=document.getElementById('va-text');
    function open(){ panel.hidden=false; fab.classList.add('on'); } function close(){ panel.hidden=true; fab.classList.remove('on'); }
    fab.onclick=function(){ panel.hidden?open():close(); };
    document.getElementById('va-x').onclick=close;
    function speak(t){ try{ if(window.speechSynthesis){ var u=new SpeechSynthesisUtterance(t); u.rate=1.05; speechSynthesis.cancel(); speechSynthesis.speak(u);} }catch(e){} }
    function go(url,say,post){ statusEl.textContent=say+'…'; speak(say); setTimeout(function(){ if(post){ var f=document.createElement('form'); f.method='POST'; f.action=url; document.body.appendChild(f); f.submit(); } else { location.href=url; } }, 650); }
    function route(raw){
      var q=(raw||'').toLowerCase().trim(); if(!q) return;
      heard.hidden=false; heard.textContent='"'+raw+'"';
      // role-specific search wins if a trade is named alongside job/shift
      var role=null; for(var i=0;i<ROLES.length;i++){ if(q.indexOf(ROLES[i][1])>=0){ role=ROLES[i]; break; } }
      if(WORKER && role && /shift|gig|per ?diem/.test(q)) return go('/app/shifts','Finding '+role[1]+' shifts');
      if(WORKER && role) return go('/app/jobs?q='+encodeURIComponent(role[0]),'Finding '+role[1]+' jobs');
      if(!WORKER && role) return go('/console/source?trade='+encodeURIComponent(role[0]),'Sourcing '+role[1]+' candidates');
      for(var j=0;j<INTENTS.length;j++){ if(new RegExp(INTENTS[j].re).test(q)) return go(INTENTS[j].url, INTENTS[j].say, INTENTS[j].post); }
      statusEl.textContent='Hmm, try “'+(WORKER?'open shifts':'post a shift')+'” or “'+(WORKER?'find welder jobs':'source CNAs')+'”.';
      speak('Sorry, I did not catch that. Try again.');
    }
    form.onsubmit=function(e){ e.preventDefault(); route(text.value); };
    Array.prototype.forEach.call(document.querySelectorAll('.va-chip'), function(c){ c.onclick=function(){ route(c.getAttribute('data-cmd')); }; });
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ micBtn.disabled=true; micBtn.querySelector('span').textContent='${T('Type a command (mic not supported)')}'; return; }
    var rec=new SR(); rec.lang='${LANG==='es'?'es-ES':'en-US'}'; rec.interimResults=true; rec.maxAlternatives=1; var finalT='';
    function start(){ try{ finalT=''; rec.start(); micBtn.classList.add('live'); statusEl.textContent='Listening…'; }catch(e){} }
    function stop(){ try{ rec.stop(); }catch(e){} micBtn.classList.remove('live'); }
    rec.onresult=function(ev){ var s=''; for(var i=ev.resultIndex;i<ev.results.length;i++){ s+=ev.results[i][0].transcript; if(ev.results[i].isFinal) finalT+=ev.results[i][0].transcript; } heard.hidden=false; heard.textContent='"'+(finalT||s)+'"'; };
    rec.onend=function(){ micBtn.classList.remove('live'); if(finalT.trim()) route(finalT); };
    micBtn.onmousedown=start; micBtn.onmouseup=stop; micBtn.onmouseleave=function(){ if(micBtn.classList.contains('live')) stop(); };
    micBtn.ontouchstart=function(e){ e.preventDefault(); start(); }; micBtn.ontouchend=function(e){ e.preventDefault(); stop(); };
    micBtn.onclick=function(){ if(!micBtn.classList.contains('live')) start(); };
  })();</script>`;
}

// ---------- Career guides: everything about each role (real BLS data + Rivet hiring) ----------
function careerGuide({ trade, employers = [], metros = [], openCount = 0 }){
  const r = ROLE_BLS[trade], lt = LEARN_TRACKS[trade];
  const label = TRADES[trade] || trade;
  const sm = r ? SECTOR_META[r.sector] : null;
  const hr = r ? Math.round(r.med/2080) : 0;
  return `<section class="wrap">
    <a class="back" href="/careers">← ${T('All career guides')}</a>
    <div class="card guide-hero" style="--sc:${sm?sm.color:'#E8923A'}">
      <div class="guide-top"><span class="trend-ic">${tradeEmoji(trade)}</span>
        <div><h1>${esc(label)}</h1>${sm?`<a class="guide-sector" href="/sectors/${r.sector}">${sm.emoji} ${T(sm.label)}</a>`:''}</div></div>
      ${r?`<p class="guide-what">${T(r.what)}</p>
      <div class="guide-kpis">
        <div class="skpi"><b>$${r.med.toLocaleString()}</b><span>${T('median/yr')} · ~$${hr}/hr</span></div>
        <div class="skpi"><b>${esc(r.growth)}</b><span>${T('jobs by 2034')}</span></div>
        <div class="skpi"><b>${esc(r.openings)}</b><span>${T('U.S. openings/yr')}</span></div>
        ${openCount?`<div class="skpi"><b>${openCount}</b><span>${T('open now on Rivet')}</span></div>`:''}
      </div>
      <p class="muted sm">${T(r.gl)}.${r.low?` ${T('Range')} $${r.low.toLocaleString()}–$${r.high.toLocaleString()}.`:''} <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${T('Source: U.S. BLS')} ↗</a></p>`:''}
      <div class="sector-cta"><a class="btn" href="/signup?role=worker">${T('Get matched to')} ${esc(label)} ${T('jobs')}</a><a class="btn ghost" href="/app/learn/interview?trade=${trade}">${T('Practice the interview')}</a></div>
    </div>
    <div class="grid2">
      <div class="card"><div class="sec-h" style="margin-top:0">${T('How to start')}</div>
        ${r?`<p class="g-row"><b>${T('Typical entry')}:</b> ${T(r.edu)}</p>`:''}
        ${lt?`<p class="g-row"><b>${T('Credential that pays off')}:</b> <a href="${esc(lt.cert[1])}" target="_blank" rel="noopener noreferrer">${esc(lt.cert[0])} ↗</a></p>`:''}
        ${r?`<p class="g-row"><b>${T('Path up')}:</b> ${T(r.advance)}</p>`:''}
        <a class="btn-sm" href="/app/training" style="margin-top:10px">${T('Get certified on Rivet →')}</a>
      </div>
      <div class="card"><div class="sec-h" style="margin-top:0">${T('Learn the role')}</div>
        ${lt?learnVideo(trade, lt.vid):''}
        <a class="track-link prep" href="/app/learn/interview?trade=${trade}" style="margin-top:8px">${icon('spark')} ${T('AI mock interview')}</a>
        ${lt?`<div style="margin-top:12px"><b class="sm">${T('You may be asked:')}</b><ul class="iv-qs">${lt.qs.slice(0,3).map(q=>`<li>${T(q)}</li>`).join('')}</ul></div>`:''}
      </div>
    </div>
    ${(()=>{ const d = ROLE_DEEP[trade]; if(!d) return ''; return `<div class="grid2">
      <div class="card reality-card"><div class="sec-h" style="margin-top:0">${icon('warn','xic')} ${T('What it’s really like')}</div>
        <p class="reality-txt">${T(d.reality)}</p>
        <p class="reality-thrive">${icon('star')} <b>${T('You’ll thrive if')}</b> ${T(d.thrive)}.</p>
      </div>
      <div class="card onramp-card"><div class="sec-h" style="margin-top:0">${icon('spark','xic')} ${T('Start from zero — your fastest way in')}</div>
        <p class="reality-txt">${T(d.onramp)}</p>
        <a class="btn-sm" href="${esc(d.link)}" target="_blank" rel="noopener noreferrer" style="margin-top:8px">${T(d.linkLabel)}</a>
        <p class="muted sm" style="margin-top:8px">${T('No experience needed for many of these paths — and several are free or paid while you learn.')}</p>
      </div>
    </div>`; })()}
    ${employers.length?`<div class="card"><div class="sec-h" style="margin-top:0">${T('Who’s hiring')} — ${esc(label)}</div>
      <div class="emp-chips">${employers.slice(0,12).map(e=>`<span class="emp-chip">${icon('building')} ${esc(e.company)} <b>${e.n}</b></span>`).join('')}</div></div>`:''}
    ${metros.length?`<div class="card"><div class="sec-h" style="margin-top:0">${T('Where the jobs are')}</div>
      <div class="emp-chips">${metros.slice(0,14).map(m=>`<span class="emp-chip">${icon('pin')} ${esc(m.city)} <b>${m.n}</b></span>`).join('')}</div></div>`:''}
    <p class="muted sm" style="margin-top:6px">${T('Pay & outlook: U.S. Bureau of Labor Statistics, Occupational Outlook Handbook (May 2024). Hiring data: live openings on Rivet.')}</p>
  </section>`;
}
function careerHub(items = []){
  const bySec = {semiconductor:[],manufacturing:[],healthcare:[]};
  items.forEach(it=>{ const r=ROLE_BLS[it.trade]; if(r&&bySec[r.sector]) bySec[r.sector].push(it); });
  return `<section class="wrap">
    <div class="sec-h big">${T('Career guides')} <span class="muted">${T('Everything about the jobs we place')}</span></div>
    <p class="muted" style="margin:-6px 0 16px;max-width:640px">${T('Real U.S. Bureau of Labor Statistics pay & outlook, the credentials that matter, who’s hiring, where, and a mock interview — for every role on Rivet.')}</p>
    ${Object.entries(bySec).map(([sec,list])=>{ if(!list.length) return ''; const sm=SECTOR_META[sec]; return `<div class="sec-h">${sm.emoji} ${T(sm.label)}</div>
      <div class="track-grid">${list.map(it=>{ const r=ROLE_BLS[it.trade]; return `<a class="card track-card" href="/careers/${it.trade}">
        <div class="track-h"><span class="trend-ic">${tradeEmoji(it.trade)}</span><div><b>${esc(TRADES[it.trade]||it.trade)}</b><div class="muted sm">$${r.med.toLocaleString()}/yr · ${esc(r.growth)}${it.openCount?` · ${it.openCount} ${T('open')}`:''}</div></div></div>
        <p class="track-why">${T(r.what)}</p><span class="sector-go">${T('Full guide')} →</span></a>`; }).join('')}</div>`; }).join('')}
  </section>`;
}

// ---------- Industry Pulse: trends + community board ----------
const PULSE_NEWS = [
  { tag:'Demand', title:'Data-center boom is driving record electrician & HVAC demand', body:'Hyperscale and AI build-outs are pulling thousands of electricians, controls techs and HVAC installers into commercial work — often at premium pay.' },
  { tag:'Wages', title:'Skilled-trade wages keep climbing faster than inflation', body:'Welders, plumbers and pipefitters with current certs are commanding sign-on bonuses and per-diem on travel jobs as the labor crunch continues.' },
  { tag:'Healthcare', title:'CNAs and home-health aides are among the fastest-growing roles', body:'An aging population is fueling steady, flexible demand for certified nursing assistants and caregivers nationwide.' },
  { tag:'Logistics', title:'Warehouse, delivery and CDL roles stay red-hot', body:'E-commerce and regional distribution keep last-mile drivers, forklift operators and warehouse crews in constant demand.' },
];
function pulsePage({ user, trending, posts, totalOpen, companies = [], demandGeo = [], season = [], monthName = '', balance = [] }) {
  const maxDem = Math.max(1, ...balance.map(b=>b.demand));
  const balRows = balance.map(b=>`<div class="bal-row">
      <span class="trend-ic">${tradeEmoji(b.trade)}</span>
      <div class="bal-main">
        <div class="bal-top"><b>${esc(TRADES[b.trade]||b.trade)}</b><span class="bal-chip ${b.level}">${T(M_BALANCE_LABEL[b.level]||'Balanced')}</span></div>
        <div class="bal-bar" role="img" aria-label="${b.demand.toLocaleString()} ${T('jobs')}, ${b.supply.toLocaleString()} ${T('workers')}">
          <i class="bal-d" style="width:${Math.round(b.demand/maxDem*100)}%"></i>
          <i class="bal-s" style="width:${Math.round(b.supply/maxDem*100)}%"></i></div>
        <div class="bal-nums sm"><span class="bd">${b.demand.toLocaleString()} ${T('open jobs')}</span> <span class="muted">vs</span> <span class="bs">${b.supply.toLocaleString()} ${T('workers')}</span> · <b>${b.ratio}×</b> ${T('demand')}</div>
      </div>
    </div>`).join('');
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
    ${balance.length?`<div class="card">
      <div class="sec-h" style="margin-top:0">${icon('flame','xic')} ${T('Supply vs demand')} <span class="muted">${T('where workers have the most leverage')}</span></div>
      <p class="muted sm" style="margin:-2px 0 12px">${T('Live openings vs available workers, weighted by national trade shortages.')}</p>
      <div class="bal-legend sm muted"><span><i class="bal-key d"></i> ${T('open jobs')}</span><span><i class="bal-key s"></i> ${T('available workers')}</span></div>
      ${balRows}
      <p class="muted sm" style="margin-top:10px">${T('Estimate blends Rivet activity with public labor data.')} <a href="https://www.bls.gov/ooh/" target="_blank" rel="noopener noreferrer">BLS ↗</a></p>
    </div>`:''}
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
      ${skillVerifiedRow(profile)}
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
// Market pay percentile — where this job sits vs. our real open-job pay corpus for the trade.
function marketPayBar(pm, trade){
  if(!pm) return '';
  const tl = (TRADES[trade]||trade||'').toLowerCase();
  const pos = Math.max(4, Math.min(96, pm.pct));
  return `<div class="paymkt ${pm.cls}">
    <div class="pm-top">${icon('chart','xic')} <b>${T(pm.label)}</b> <span class="muted sm">${T('among')} ${pm.n} ${esc(tl)} ${T('jobs on Rivet')}</span></div>
    <div class="pm-bar"><span class="pm-fill" style="width:${pos}%"></span><i class="pm-you" style="left:${pos}%"></i></div>
    <div class="pm-scale"><span>$${pm.p25}</span><span>${T('median')} $${pm.p50}/hr</span><span>$${pm.p75}+</span></div>
  </div>`;
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
let _rvMapSeq = 0;
// distinct color per job category so pins read as "different types of work"
const CAT_COLOR = {
  'Construction & trades':'#E8923A','Drivers & logistics':'#2B6EC9','Mechanical & repair':'#6D5BD0',
  'Healthcare & care':'#E0556E','Food service':'#0FA9AE','Agriculture':'#7E9B2F',
  'Cleaning & facilities':'#C77DBB','Security':'#5A6B7B','Freelance & gig':'#D98C2B','Manufacturing & semiconductor':'#3F7CAC','Other':'#8A8A8A',
};
const CAT_ICON = {
  'Construction & trades':'hammer','Drivers & logistics':'truck','Mechanical & repair':'wrench',
  'Healthcare & care':'heart','Food service':'utensils','Agriculture':'leaf',
  'Cleaning & facilities':'spray','Security':'shield','Freelance & gig':'toolbox','Manufacturing & semiconductor':'layers','Other':'dot',
};
// SVG path + fill-flag per category, embedded inside each map pin for fast type scanning
const CAT_ICON_DATA = Object.fromEntries(Object.entries(CAT_ICON).map(([cat,nm])=>{
  const g = ICONS[nm] || ICONS.dot; return [cat, {p:g.p, f:g.f?1:0}];
}));
function usMap(points = [], opts = {}){
  const { title='Where your talent is', noun='candidate', emptyMsg='No mapped locations yet.', legend=null, cta='Open', home=null } = opts;
  const id = 'rvmap'+(++_rvMapSeq);
  const total = points.reduce((a,g)=>a+(g.n||0),0);
  const top = points.slice(0,7).map((g,i)=>`<li class="${g.near?'near':''}" onclick="${id}_show(${i})"><span>${g.near?'<i class="ml-pin"></i>':''}${esc(g.city||'—')}${g.dist!=null?` <em class="mi-tag">${g.dist} mi</em>`:''}</span><b>${(g.n||0).toLocaleString()}</b></li>`).join('');
  // categories present across the map → filter options + legend
  const catAgg = {};
  points.forEach(g=>(g.cats||[]).forEach(c=>{ catAgg[c.k]=(catAgg[c.k]||0)+c.n; }));
  const catList = Object.entries(catAgg).sort((a,b)=>b[1]-a[1]).map(([k])=>k);
  // per-point payload for Leaflet markers + the click panel (esc() keeps it HTML/</script>-safe)
  const data = points.map(g=>({
    c: esc(g.city||''), n:(g.n||0), lat:g.lat, lon:g.lon, near:!!g.near, dist:(g.dist==null?null:g.dist),
    cats:(g.cats||[]).map(c=>({k:c.k, n:c.n})),
    bal: g.bal ? {t:esc(g.bal.trade||''), lv:g.bal.level, lb:T(g.bal.label||'Balanced'), r:g.bal.ratio} : null,
    items:(g.items||[]).slice(0,12).map(it=>({l:esc(it.label||''),s:esc(it.sub||''),h:esc(it.href||'#')}))
  }));
  const homeJS = (home && home.lat!=null)
    ? JSON.stringify({lat:home.lat, lon:home.lon, commute:home.commute||0, city:esc(home.city||''), reachable:home.reachable||0})
    : 'null';
  const hasHome = home && home.lat!=null;
  const filterUI = catList.length>1 ? `<div class="map-tools">
      <label class="mt-label" for="${id}_filter">${T('Filter by type')}</label>
      <select id="${id}_filter" class="map-filter" onchange="${id}_apply(this.value)">
        <option value="">${T('All types')}</option>
        ${catList.map(k=>`<option value="${esc(k)}">${T(k)}</option>`).join('')}
      </select></div>` : '';
  const catLegend = catList.length
    ? catList.slice(0,7).map(k=>`<span class="lg"><i style="background:${CAT_COLOR[k]||'#8A8A8A'}"></i> ${T(k)}</span>`).join('')
    : (legend || `<span class="lg"><i class="lg-dot"></i> ${esc(noun)}s</span>`);
  return `<div class="card">
    <div class="sec-h" style="margin-top:0">${esc(title)} <span class="muted">${total.toLocaleString()} ${noun}${total===1?'':'s'}</span></div>
    ${points.length ? `${filterUI}<div class="mapwrap">
      <div class="mapbox">
        <div id="${id}" class="leafmap" role="application" aria-label="${esc(T('Opportunity map'))}"></div>
        ${hasHome?`<button type="button" class="leaf-near" onclick="${id}_home()">${icon('pin')} ${T('Near me')}</button>`:''}
      </div>
      <div class="mapside">
        <ul class="maplist" id="${id}_list">${top}</ul>
        <div class="mappanel" id="${id}_panel"><p class="muted sm">${T('Tap a pin to see openings there')}</p></div>
      </div>
    </div>
    ${home && home.reachable>0 ? `<p class="map-near"><span class="mn-dot"></span><b>${home.reachable.toLocaleString()}</b> ${noun}${home.reachable===1?'':'s'} ${T('within')} ${home.commute>0?home.commute:40} ${T('mi of you')}${home.city?` · ${esc(home.city)}`:''} <button type="button" class="mn-link" onclick="${id}_home()">${T('Near me')} →</button></p>` : ''}
    <div class="maplegend">
      ${catLegend}
      ${hasHome?`<span class="lg"><i class="lg-home"></i> ${T('You')}</span><span class="lg"><i class="lg-near"></i> ${T('Within reach')}</span>`:''}
      <span class="lg muted">${icon('pin')} ${T('Number on a pin = openings · tap to see them')}</span>
    </div>`+`<p class="map-hint sm muted">${total.toLocaleString()} ${noun}${total===1?'':'s'} ${T('across')} ${points.length} ${points.length===1?T('metro'):T('metros')}</p>`+`
    <script>(function(){
      if(typeof L==='undefined'){var w=document.getElementById('${id}');if(w)w.innerHTML='<p class="muted sm" style="padding:14px">Map failed to load.</p>';return;}
      var pts=${JSON.stringify(data)}, cta=${JSON.stringify(esc(cta))}, home=${homeJS}, CAT=${JSON.stringify(CAT_COLOR)}, CATIC=${JSON.stringify(CAT_ICON_DATA)};
      var youTxt=${JSON.stringify(T('You'))}, demandTxt=${JSON.stringify(T('demand'))}, emptyCat=${JSON.stringify(T('No openings in this type here.'))};
      var map=L.map('${id}',{scrollWheelZoom:false});
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:18,attribution:'&copy; OpenStreetMap, &copy; CARTO'}).addTo(map);
      var panel=document.getElementById('${id}_panel');
      function nf(n){return n>=10000?Math.round(n/1000)+'k':(n>=1000?(n/1000).toFixed(1).replace(/\\.0$/,'')+'k':String(n));}
      function catCount(d,cat){ if(!cat) return d.n||0; var e=(d.cats||[]).filter(function(c){return c.k===cat;})[0]; return e?e.n:0; }
      function pinCat(d){ return (d.cats&&d.cats[0]&&d.cats[0].k)||''; }
      function pinColor(d){ return CAT[pinCat(d)]||'#E8923A'; }
      function glyph(cat,col){ var g=CATIC[cat]; if(!g) return ''; return '<g transform="translate(16 16) scale(0.5) translate(-12 -12)" fill="'+(g.f?col:'none')+'" stroke="'+(g.f?'none':col)+'" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+g.p+'</g>'; }
      function makeIcon(d,cnt,col,cat){
        var s=d.near?1.14:1, w=Math.round(32*s), h=Math.round(42*s);
        var svg='<svg width="'+w+'" height="'+h+'" viewBox="0 0 32 42"><path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="'+col+'" stroke="#fff" stroke-width="2"/><circle cx="16" cy="16" r="10" fill="#fff" fill-opacity="0.96"/>'+glyph(cat,col)+'</svg>';
        var html='<div class="jpin-in">'+svg+(cnt?'<span class="jpin-ct">'+nf(cnt)+'</span>':'')+'</div>';
        return L.divIcon({className:'jobpin'+(d.near?' near':''),html:html,iconSize:[w,h],iconAnchor:[w/2,h]});
      }
      function show(i){var d=pts[i];if(!d||!panel)return;
        var hdr='<div class="mp-h">'+d.c+(d.n?' <span class="mp-n">'+d.n.toLocaleString()+' open</span>':'')+'</div>';
        var bal=d.bal?'<div class="mp-bal"><span class="bal-chip '+d.bal.lv+'">'+d.bal.lb+'</span> <span class="muted sm">'+d.bal.t+' · '+d.bal.r+'× '+demandTxt+'</span></div>':'';
        panel.innerHTML=hdr+bal+(d.items.length?d.items.map(function(it){return '<div class="mp-row"><div class="mp-info"><b>'+it.l+'</b><span>'+it.s+'</span></div><a class="mp-cta" href="'+it.h+'">'+cta+'</a></div>';}).join(''):'<p class="muted sm">No sample roles.</p>')+(d.n>d.items.length?'<p class="muted sm" style="margin-top:8px">+ '+(d.n-d.items.length).toLocaleString()+' more in '+d.c+'</p>':'');}
      window['${id}_show']=show;
      function rebuildList(cat){var ul=document.getElementById('${id}_list');if(!ul)return;
        var arr=[];pts.forEach(function(d,i){var c=catCount(d,cat);if(c>0)arr.push({d:d,i:i,c:c});});
        arr.sort(function(a,b){return (b.d.near?1:0)-(a.d.near?1:0) || (a.d.near?(a.d.dist-b.d.dist):(b.c-a.c));});
        ul.innerHTML=arr.slice(0,8).map(function(o){return '<li class="'+(o.d.near?'near':'')+'" onclick="${id}_show('+o.i+')"><span>'+(o.d.near?'<i class="ml-pin"></i>':'')+o.d.c+(o.d.dist!=null?' <em class="mi-tag">'+o.d.dist+' mi</em>':'')+'</span><b>'+o.c.toLocaleString()+'</b></li>';}).join('')||'<li class="muted">'+emptyCat+'</li>';}
      // Cluster overlapping metros so the map never looks crowded; zoom into a region to split them.
      // National view clusters more aggressively (bigger radius, splits at a lower zoom) than the local map.
      var cluster = L.markerClusterGroup ? L.markerClusterGroup({
        maxClusterRadius:${hasHome?40:60}, showCoverageOnHover:false, spiderfyOnMaxZoom:true, chunkedLoading:true,
        disableClusteringAtZoom:${hasHome?11:6},
        iconCreateFunction:function(c){ var ms=c.getAllChildMarkers(), sum=0,i; for(i=0;i<ms.length;i++) sum+=(ms[i].__n||0);
          var z=sum>=10000?48:sum>=1000?42:36; return L.divIcon({className:'jclust',html:'<div class="jc-b" style="width:'+z+'px;height:'+z+'px">'+nf(sum)+'</div>',iconSize:[z,z]}); }
      }) : null;
      if(cluster) map.addLayer(cluster);
      function addM(m){ if(cluster) cluster.addLayer(m); else m.addTo(map); }
      function clearM(){ if(cluster) cluster.clearLayers(); else markers.forEach(function(o){map.removeLayer(o.m);}); }
      var markers=[], bounds=[], cont=[];
      var natl=${hasHome?'false':'true'}; // national/pre-login view: frame the lower-48
      function inFrame(d){ return d.lon>=-125&&d.lon<=-66&&d.lat>=24&&d.lat<=50; }
      pts.forEach(function(d,i){
        if(d.lat==null||d.lon==null||!isFinite(+d.lat)||!isFinite(+d.lon))return;
        if(natl && !inFrame(d))return; // skip AK/HI/territories so no stray pin floats off-frame
        var m=L.marker([d.lat,d.lon],{icon:makeIcon(d,d.n||0,pinColor(d),pinCat(d))});
        m.__n=d.n||0;
        m.bindTooltip(d.c+': '+(d.n||0).toLocaleString()+(d.near?' · near you':''),{direction:'top'});
        m.on('click',function(){show(i);});
        addM(m); markers.push({m:m,d:d});
        bounds.push([d.lat,d.lon]);
        if(inFrame(d)) cont.push([d.lat,d.lon]); // lower-48 framing
      });
      window['${id}_apply']=function(cat){
        clearM();
        markers.forEach(function(o){var d=o.d,cnt=catCount(d,cat),vis=!cat||cnt>0,kc=cat||pinCat(d),col=cat?(CAT[cat]||'#E8923A'):pinColor(d);
          if(vis){o.m.setIcon(makeIcon(d,cnt,col,kc));o.m.__n=cnt;addM(o.m);}});
        rebuildList(cat);
      };
      if(home){
        if(home.commute>0){L.circle([home.lat,home.lon],{radius:home.commute*1609,color:'#2B6EC9',weight:1.2,dashArray:'5 5',fillColor:'#2B6EC9',fillOpacity:.06}).addTo(map);}
        L.circleMarker([home.lat,home.lon],{radius:7,color:'#fff',weight:2.5,fillColor:'#2B6EC9',fillOpacity:1}).addTo(map).bindTooltip(youTxt,{direction:'top',permanent:false});
      }
      window['${id}_home']=function(){ if(home) map.setView([home.lat,home.lon], 9, {animate:true}); };
      var fit = cont.length>1 ? cont : bounds;
      if(home && home.reachable>0){ map.setView([home.lat,home.lon], 8); }
      else if(fit.length>1){ map.fitBounds(fit,{padding:[28,28],maxZoom:7}); }
      else if(fit.length===1){ map.setView(fit[0], 6); }
      else { map.setView([39.5,-98.35], 4); }
      setTimeout(function(){map.invalidateSize();},80);
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
function empPipeline({ job, columns, candidates, jobMedia = [], alerted = 0, sourced = 0, quotes = [], market = null }) {
  const mktAdvice = {
    vtight: T('This trade is very short-staffed nationwide. Move fast — bump pay or widen your radius to fill it.'),
    tight: T('Short-staffed trade — hiring is competitive. A pay bump or wider radius will speed up your fill.'),
    bal: T('Balanced market. Standard effort should fill this role at a fair rate.'),
    comp: T('Lots of available workers for this trade — expect strong applicant flow.'),
  };
  const marketCard = market ? `<div class="card mkt-card ${market.level}">
    <div class="mkt-h"><span class="bal-chip ${market.level}">${T(market.label)}</span> <b>${esc(market.trade)}</b> <span class="muted sm">· ${market.ratio}× ${T('demand')} ${T('vs supply')}</span></div>
    <p class="mkt-advice">${mktAdvice[market.level]||''}</p>
  </div>` : '';
  const quotesCard = job.quotes_ok ? `<div class="card">
    <div class="sec-h" style="margin-top:0">${T('Price quotes')} <span class="muted sm">${quotes.length} ${quotes.length===1?T('quote'):T('quotes')}</span></div>
    ${quotes.length ? quotes.map(q=>`<div class="quote-row ${q.status}">
      <a class="quote-who cand-link" href="/console/candidates/${q.worker_id}"><span class="av-t">${initials(q.name)}</span>${esc(q.name)}</a>
      <div class="quote-amt">$${q.amount} <span class="muted sm">${T('per '+(q.unit||'job'))}</span></div>
      ${q.note?`<div class="quote-note muted sm">${esc(q.note)}</div>`:''}
      <div class="quote-act">${q.status==='accepted'?`<span class="v ok">${T('Accepted')}</span>`:q.status==='declined'?`<span class="v pending">${T('Not selected')}</span>`:`<form method="post" action="/console/jobs/${job.id}/quotes/${q.id}/accept"><button class="btn-xs">${T('Accept quote')}</button></form>`}</div>
    </div>`).join('') : `<p class="muted sm">${T('No quotes yet — they’ll appear here as workers bid.')}</p>`}
  </div>` : '';
  const cols = STAGES.map(st=>`<div class="col"><div class="col-h">${T(st)} <span>${(columns[st]||[]).length}</span></div>
    ${(columns[st]||[]).map(a=>`<div class="pcard">
        <a class="pc-nm cand-link" href="/console/candidates/${a.worker_id}"><span class="av-t">${initials(a.name)}</span>${esc(a.name)}</a>
        <div class="muted sm">${TRADES[a.trade]||a.trade}</div>
        <div class="pc-ft"><span class="score-tag ${scoreClass(a.score)}">${a.score}</span>
          <form method="post" action="/console/applications/${a.app_id}/stage" class="stageform">
            <select name="stage" onchange="this.form.submit()">${STAGES.map(s=>`<option value="${s}" ${s===st?'selected':''}>${T(s)}</option>`).join('')}</select>
          </form></div>
        ${st==='Hired' ? (a.outcome
          ? `<div class="pc-out ${a.outcome}">${({showed:T('✓ Showed up'),noshow:T('✗ No-showed'),cancelled:T('Cancelled w/ notice')})[a.outcome]||a.outcome}</div>`
          : `<div class="pc-outset"><span class="muted sm">${T('Did they show?')}</span>${[['showed','✓'],['noshow','✗'],['cancelled','~']].map(([v,g])=>`<form method="post" action="/console/applications/${a.app_id}/outcome"><input type="hidden" name="outcome" value="${v}"><button class="btn-xs ${v==='showed'?'':'ghost'}" title="${({showed:T('Showed up'),noshow:T('No-showed'),cancelled:T('Cancelled with notice')})[v]}">${g}</button></form>`).join('')}</div>`) : ''}
      </div>`).join('')}
    </div>`).join('');
  return `<section class="wrap">
    <a class="back" href="/console/jobs">← ${T('All jobs')}</a>
    <div class="page-h"><h2>${esc(T(job.title))} ${job.status==='closed'?`<span class="closed-tag">${T('Closed')}</span>`:''}</h2>
      <p class="muted">$${job.pay_min}–${job.pay_max}/hr · ${esc(job.city)}</p>
      <a class="btn-sm ghost right" href="/console/jobs/${job.id}/edit">${T('Edit')}</a>
      <form method="post" action="/console/jobs/${job.id}/${job.status==='closed'?'reopen':'close'}"><button class="btn-sm ${job.status==='closed'?'':'ghost'}">${job.status==='closed'?T('Reopen job'):T('Close job')}</button></form></div>
    ${marketCard}
    ${job.status==='closed'?`<div class="card warn-card">${T('This job is closed — it’s hidden from worker search and the map. Reopen it to keep matching.')}</div>`:''}
    ${alerted>0?`<div class="ok-card">${icon('bell','xic')} ${alerted} ${alerted===1?T('matching worker with alerts on was notified about this job.'):T('matching workers with alerts on were notified about this job.')}</div>`:''}
    ${sourced>0?`<div class="ok-card">${icon('spark','xic')} ${T('Sourcing Agent added')} ${sourced} ${sourced===1?T('candidate'):T('candidates')} ${T('to your pipeline.')}</div>`:''}
    <div class="card agent-card row">
      <div><div class="agent-h">${icon('spark','xic')} ${T('Sourcing Agent')}</div>
        <p class="agent-line">${T('Scan all verified workers and auto-add the strongest matches to this pipeline.')}</p></div>
      <form method="post" action="/console/jobs/${job.id}/source"><button class="btn-sm">${T('Auto-source candidates')}</button></form>
    </div>
    ${quotesCard}
    <div class="card">
      <div class="sec-h" style="margin-top:0">${T('Photos of the work')} <span class="muted sm">${T('candidates see these on the job')}</span></div>
      ${mediaGallery(jobMedia, {deletable:true, base:`/console/jobs/${job.id}/media`}) || `<p class="muted sm">${T('Add photos or a video of the site / work to be done — it helps candidates self-qualify.')}</p>`}
      <form method="post" action="/console/jobs/${job.id}/media" class="port-form">
        <input name="url" placeholder="${T('Image URL or YouTube / Vimeo link')}" required>
        <input name="title" placeholder="${T('Title — e.g. Rooftop unit replacement')}">
        <input name="caption" placeholder="${T('Short caption (optional)')}">
        <button class="btn-sm">${T('Add photo / video')}</button>
      </form>
    </div>
    <div class="kanban">${cols}</div>
    <div class="card" style="margin-top:18px">
      <div class="sec-h" style="margin-top:0">${T('Recommended candidates (not yet in pipeline)')}</div>
      <table class="tbl"><tr><th>${T('Candidate')}</th><th>${T('Trade')}</th><th>${T('Match')}</th><th>${T('Readiness')}</th><th></th></tr>
      ${candidates.map(c=>`<tr><td><a class="cand-link" href="/console/candidates/${c.user_id}"><span class="av-t">${initials(c.name)}</span> ${esc(c.name)}</a></td>
        <td>${TRADES[c.trade]||c.trade}</td>
        <td><span class="score-tag ${scoreClass(c.score)}">${c.score}</span></td>
        <td>${c.readiness}</td>
        <td><form method="post" action="/console/jobs/${job.id}/add"><input type="hidden" name="worker_id" value="${c.user_id}"><button class="btn-sm">+ ${T('Pipeline')}</button></form></td>
      </tr>`).join('') || `<tr><td colspan=5 class="muted">${T('No more candidates to recommend.')}</td></tr>`}
      </table>
    </div>
  </section>`;
}

function empSearch({ rows, filters }) {
  const tradeOpts = `<option value="">${T('All trades')}</option>`+Object.entries(TRADES).map(([k,v])=>`<option value="${k}" ${filters.trade===k?'selected':''}>${esc(T(v))}</option>`).join('');
  return `<section class="wrap">
    <div class="page-h"><h2>${T('Talent Search')}</h2><p class="muted">${rows.length} ${T('candidates')}</p>
      <a class="btn-sm right ghost" href="/console/shortlist">★ Shortlist</a></div>
    <div class="card disclaimer" style="margin-bottom:14px">${icon('spark','xic')} ${T('Rivet is brand-new — our verified worker pool is growing every day. Post a job to attract candidates, or use the Sourcing Agent to find and verify talent from public registries while the pool fills out.')}</div>
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
      ${skillVerifiedRow(profile)}
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

// ---------- GTM sector pages (Manufacturing / Healthcare / Semiconductor) ----------
const SECTOR_META = {
  semiconductor: { label:'Semiconductor', emoji:'🔬', color:'#3F7CAC',
    tag:'Build the chips that power America',
    blurb:'The CHIPS Act is funding the biggest semiconductor build-out in U.S. history — fabs nationwide need equipment, process and facilities technicians. Paid training, no four-year degree required. Browse the real openings below.' },
  manufacturing: { label:'Manufacturing', emoji:'🏭', color:'#E8923A',
    tag:'Make the things that move the world',
    blurb:'From EVs to jet engines, American manufacturers need welders, machinists, assemblers and maintenance techs. Real wages, real benefits, real ladders. Every role below is a live opening with a direct apply link.' },
  healthcare: { label:'Healthcare', emoji:'🏥', color:'#E0556E',
    tag:'Frontline healthcare careers',
    blurb:'Hospitals and clinics are short-staffed nationwide. Start as a CNA, patient-care, sterile-processing or surgical tech — with a clear path up to nursing. Browse the real openings below.' },
};
function sectorHub(cards = []){
  return `<section class="wrap">
    <div class="sec-h big">${T('Industries we serve')} <span class="muted">${T('Real openings, verified workers, AI matching')}</span></div>
    <p class="muted" style="margin:-6px 0 18px;max-width:640px">${T('We package Rivet for the sectors hiring hardest right now — with real employers, sector-specific credentials, and a talent pool built for each industry.')}</p>
    <div class="grid3">
      ${cards.map(c=>{const m=SECTOR_META[c.key];return `<a class="card sector-card" href="/sectors/${c.key}" style="--sc:${m.color}">
        <div class="sector-emoji">${m.emoji}</div>
        <div class="sector-nm">${T(m.label)}</div>
        <p class="muted sm">${T(m.tag)}</p>
        <div class="sector-stats"><span><b>${(c.count||0).toLocaleString()}</b> ${T('live openings')}</span><span><b>${c.employers}</b> ${T('top employers')}</span>${c.payHi?`<span><b>$${c.payLo}–${c.payHi}</b>/hr</span>`:''}</div>
        <span class="sector-go">${T('Explore')} ${m.label} →</span>
      </a>`;}).join('')}
    </div>
    ${whyRivetBlock()}
  </section>`;
}
function sectorPage({ key, count, metros, payLo, payHi, employers = [], roles = [], geo = [] }){
  const m = SECTOR_META[key];
  return `<section class="wrap">
    <a class="back" href="/sectors">← ${T('All industries')}</a>
    <div class="card sector-hero" style="--sc:${m.color}">
      <div class="sector-hero-emoji">${m.emoji}</div>
      <h1>${T(m.label)} ${T('jobs on Rivet')}</h1>
      <p class="sector-tag">${T(m.tag)}</p>
      <p class="sector-blurb">${T(m.blurb)}</p>
      ${count===0?`<p class="muted sm" style="margin-top:-4px">${T('We’re actively adding verified openings in this sector right now — check back soon, or sign up to get alerted the moment they land.')}</p>`:''}
      <div class="sector-kpis">
        <div class="skpi"><b>${count.toLocaleString()}</b><span>${T('live openings on Rivet')}</span></div>
        <div class="skpi"><b>${employers.length}</b><span>${T('hiring employers')}</span></div>
        <div class="skpi"><b>${metros}</b><span>${T('metros')}</span></div>
        ${payHi?`<div class="skpi"><b>$${payLo}–${payHi}</b><span>${T('typical pay/hr')}</span></div>`:''}
      </div>
      <div class="sector-cta"><a class="btn" href="/signup?role=worker">${T('Find these jobs')}</a><a class="btn ghost" href="/signup?role=employer">${T('Hire for this sector')}</a></div>
    </div>
    ${geo.length ? usMap(geo, {title:`${T('Where')} ${T(m.label)} ${T('is hiring')}`, noun:T('job'), cta:T('View')}) : ''}
    <div class="grid2">
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Top employers hiring now')}</div>
        ${employers.length ? employers.slice(0,10).map((e,i)=>`<div class="trend-row">
          <span class="trend-rank">${i+1}</span>
          <span class="trend-ic">${icon('building','tic')}</span>
          <div class="trend-main"><div class="trend-nm">${esc(e.company)}</div><div class="muted sm">${esc(e.city||'')}</div></div>
          <b class="trend-n">${e.n}</b></div>`).join('') : `<p class="muted">${T('No employers yet.')}</p>`}
      </div>
      <div class="card">
        <div class="sec-h" style="margin-top:0">${T('Roles in demand')}</div>
        <div class="role-grid">${roles.slice(0,12).map(r=>`<a class="role-chip" href="${ROLE_BLS[r.trade]?`/careers/${r.trade}`:`/sectors/${key}`}">${tradeEmoji(r.trade)} <span>${esc(TRADES[r.trade]||r.trade)}</span><b>${r.n}</b></a>`).join('') || `<p class="muted">${T('No roles yet.')}</p>`}</div>
        <p class="muted sm" style="margin-top:10px">${T('Credentials we verify for this sector help you stand out — add them to your Work Card.')}</p>
      </div>
    </div>
    ${whyRivetBlock()}
    <div class="card cta-band"><div><b>${T('Ready to get hired in')} ${T(m.label)}?</b><p class="muted sm" style="margin:4px 0 0">${T('Build a verified Work Card in minutes — it’s free for workers, always.')}</p></div>
      <a class="btn" href="/signup?role=worker">${T('Get started')}</a></div>
  </section>`;
}
function whyRivetBlock(){
  const rows = [
    ['shield', T('Verified Work Card'), T('Credentials checked — OSHA, CDL, EPA, licenses. Not an anonymous listing.')],
    ['spark', T('AI matching, not searching'), T('We score fit on trade, pay, location and credentials and surface the best — you don’t dig through spam.')],
    ['check', T('Trust both ways'), T('Show-Up Score, Paid-Like-Promised, and two-sided ratings keep everyone honest.')],
    ['pin', T('Built for the trades'), T('Bilingual, mobile-first, and free for workers — unlike generic job boards.')],
  ];
  return `<div class="card whyrivet">
    <div class="sec-h" style="margin-top:0">${T('Why Rivet, not Craigslist or Indeed')}</div>
    <div class="why-grid">${rows.map(([ic,h,b])=>`<div class="why-item"><span class="why-ic">${icon(ic)}</span><div><b>${h}</b><p class="muted sm">${b}</p></div></div>`).join('')}</div>
  </div>`;
}

module.exports = { setLang, setEs, drainEsMisses, layout, landing, authForm, phoneStart, phoneVerify, workerOnboard, workerHome, workerJobs,
  jobDetail, workerProfile, workerApplications, workerOffers, publicPortfolio, empOverview, empAnalytics, empJobs, empJobForm, empPipeline, empSearch, empCandidate, empShortlist, inbox, ogImage, STAGES, JOB_TYPES, DURATIONS, empCompany, workerTraining, pulsePage, publicJob, workerCoach, agentApplyResult, onboardChat, agentsHub, workHub, SPONSORSHIP, SECTOR_META, sectorHub, sectorPage, mockInterview, LEARN_TRACKS, ROLE_BLS, careerHub, careerGuide, landJob, trustVerdict, trustCard, earnLearn, credPrep, credPrepIndex, gradeQuiz, skillCheckIndex, skillCheck, gradeSkill, skillKeyFor, parseSkillchecks, skillVerifiedRow, growHub, invitePage, shiftsBoard, sourcingAgent, empShifts, empShiftForm, voiceAgent, SHIFT_KINDS, REGISTRY };
