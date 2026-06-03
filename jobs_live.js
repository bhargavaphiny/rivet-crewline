'use strict';
// Live job ingestion from companies' own PUBLIC job-board APIs (Greenhouse — keyless, legitimate).
// Real, current postings across our GTM sectors. No scraping, no API key, no ToS issues.
const https = require('https');

// Curated real companies on Greenhouse, tagged by GTM sector. 404s are skipped harmlessly.
const SOURCES = [
  // ---- Manufacturing (advanced / EV / aerospace / robotics / energy) ----
  ['lucidmotors','Lucid Motors','manufacturing'],['redwoodmaterials','Redwood Materials','manufacturing'],
  ['nuro','Nuro','manufacturing'],['waymo','Waymo','manufacturing'],['rocketlab','Rocket Lab','manufacturing'],
  ['relativity','Relativity Space','manufacturing'],['formlabs','Formlabs','manufacturing'],
  ['figureai','Figure','manufacturing'],['figure','Figure','manufacturing'],['apptronik','Apptronik','manufacturing'],
  ['pathrobotics','Path Robotics','manufacturing'],['agilityrobotics','Agility Robotics','manufacturing'],
  ['chargepoint','ChargePoint','manufacturing'],['markforged','Markforged','manufacturing'],
  ['solidpower','Solid Power','manufacturing'],['skydio','Skydio','manufacturing'],['zipline','Zipline','manufacturing'],
  ['kodiakrobotics','Kodiak Robotics','manufacturing'],['aurora','Aurora','manufacturing'],
  ['ouster','Ouster','manufacturing'],['symbotic','Symbotic','manufacturing'],['locusrobotics','Locus Robotics','manufacturing'],
  ['berkshiregrey','Berkshire Grey','manufacturing'],['cobaltrobotics','Cobalt Robotics','manufacturing'],
  ['bearrobotics','Bear Robotics','manufacturing'],['dexterity','Dexterity','manufacturing'],
  ['velo3d','VELO3D','manufacturing'],['desktopmetal','Desktop Metal','manufacturing'],['brightmachines','Bright Machines','manufacturing'],
  // ---- Semiconductor ----
  ['tenstorrent','Tenstorrent','semiconductor'],['psiquantum','PsiQuantum','semiconductor'],
  ['lightmatter','Lightmatter','semiconductor'],['groq','Groq','semiconductor'],['cerebras','Cerebras','semiconductor'],
  ['sambanovasystems','SambaNova','semiconductor'],['ayarlabs','Ayar Labs','semiconductor'],['etched','Etched','semiconductor'],
  ['syntiant','Syntiant','semiconductor'],['rigetti','Rigetti','semiconductor'],['atomcomputing','Atom Computing','semiconductor'],
  ['group14','Group14','semiconductor'],
  // ---- Healthcare ----
  ['headway','Headway','healthcare'],['forward','Forward','healthcare'],['galileo','Galileo','healthcare'],
  ['carbonhealth','Carbon Health','healthcare'],['devotedhealth','Devoted Health','healthcare'],
  ['includedhealth','Included Health','healthcare'],['cityblock','Cityblock Health','healthcare'],
  ['medely','Medely','healthcare'],['vivianhealth','Vivian Health','healthcare'],
  // ---- more advanced manufacturing / energy / aerospace / robotics (real Greenhouse boards) ----
  ['archer','Archer Aviation','manufacturing'],['jobyaviation','Joby Aviation','manufacturing'],
  ['betatechnologies','BETA Technologies','manufacturing'],['wisk','Wisk Aero','manufacturing'],
  ['zeroavia','ZeroAvia','manufacturing'],['universalhydrogen','Universal Hydrogen','manufacturing'],
  ['enovix','Enovix','manufacturing'],['factorialenergy','Factorial Energy','manufacturing'],
  ['bostonmetal','Boston Metal','manufacturing'],['geckorobotics','Gecko Robotics','manufacturing'],
  ['chefrobotics','Chef Robotics','manufacturing'],['collaborativerobotics','Collaborative Robotics','manufacturing'],
  ['diligentrobotics','Diligent Robotics','manufacturing'],['saronic','Saronic','manufacturing'],
  ['hermeus','Hermeus','manufacturing'],['ursamajor','Ursa Major','manufacturing'],
  ['stokespace','Stoke Space','manufacturing'],['k2space','K2 Space','manufacturing'],
  ['muonspace','Muon Space','manufacturing'],['evgo','EVgo','manufacturing'],
  ['baseload','Base Power','manufacturing'],['fervo','Fervo Energy','manufacturing'],
  ['crusoeenergy','Crusoe','manufacturing'],['scaleai','Scale','manufacturing'],
  ['dmatrix','d-Matrix','semiconductor'],['rivosinc','Rivos','semiconductor'],
  ['celestialai','Celestial AI','semiconductor'],['extropic','Extropic','semiconductor'],
  ['normalcomputing','Normal Computing','semiconductor'],['untether','Untether AI','semiconductor'],
];

// Title → trade. Order matters (first match wins). Drives the "is this blue-collar?" gate too.
// Covers every blue-collar sector so aggregator feeds (Adzuna/USAJOBS/Jooble) classify correctly.
const TRADE_RULES = [
  // ---- healthcare support ----
  [/sterile process|\bspd\b tech|central (service|sterile)/i,'sterile_processing'],
  [/surgical tech|surg tech|\bor\b tech|operating room tech/i,'surgical_tech'],
  [/phlebotom/i,'phlebotomist'],
  [/patient care tech|\bpct\b/i,'patient_care_tech'],
  [/nurse(s)? aide|nursing assistant|\bcna\b|certified nurse|geriatric aide/i,'cna'],
  [/home health|caregiver|care giver|personal care (aide|assistant)|\bpca\b|direct support|\bdsp\b|resident (aide|assistant)|companion care/i,'caregiver'],
  [/medical assistant|clinical assistant|\bcma\b/i,'medical_assistant'],
  [/pharmacy tech/i,'medical_assistant'],
  [/\bemt\b|paramedic|emergency medical/i,'emt'],
  // ---- skilled trades ----
  [/welder|welding|fabricat(or|ion)/i,'welder'],
  [/\bhvac\b|hvac\/?r|refrigerat|air condition/i,'hvac'],
  [/pipefitter|steamfitter|pipe fitter/i,'pipefitter'],
  [/plumber|plumbing/i,'plumber'],
  [/sprinkler fitter|fire sprinkler|fire protection (fitter|tech)/i,'fire_sprinkler'],
  [/electrician|electrical (rework|technician|installer|apprentice|helper)|journeyman electric/i,'electrician'],
  [/low ?voltage|alarm install|security system install|structured cabling|fiber (tech|splic)/i,'low_voltage'],
  [/ironworker|iron worker|rebar|structural steel/i,'ironworker'],
  [/sheet ?metal/i,'sheet_metal'],
  [/boilermaker/i,'boilermaker'],
  [/millwright/i,'millwright'],
  [/elevator (tech|mechanic|constructor)/i,'elevator_tech'],
  [/glazier|glass install/i,'glazier'],
  [/insulation|insulator/i,'insulation'],
  [/drywall|sheetrock|\btaper\b/i,'drywall'],
  [/\bmason\b|bricklayer|block ?layer/i,'mason'],
  [/concrete|cement (mason|finisher)/i,'concrete'],
  [/roofer|roofing/i,'roofer'],
  [/tile setter|\btiler\b/i,'tile'],
  [/floor(ing| install| layer| installer)|carpet install/i,'flooring'],
  [/carpenter|framer|framing carpenter|finish carpenter/i,'carpenter'],
  [/painter|painting|coatings applicator/i,'painter'],
  [/solar (install|tech|pv|panel)|photovoltaic|\bpv\b install/i,'solar'],
  // ---- machining / manufacturing ----
  [/machinist|\bcnc\b|lathe|mill operator|\d-?axis|tool ?maker|\bgrinder\b/i,'machinist'],
  [/cleanroom/i,'cleanroom_op'],
  [/chemical operator|process (technician|operator|tech)|fab (technician|operator)|wafer/i,'process_tech'],
  [/equipment (technician|maintenance|specialist)|field service tech|tool (tech|install)/i,'equipment_tech'],
  [/maintenance (technician|mechanic|tech|worker|associate)|facilities (technician|maintenance|mechanic)|building (engineer|maintenance)|general maintenance|maintenance person/i,'maintenance_tech'],
  [/quality (inspector|technician|control|assurance tech)|\bqc\b inspector|\binspector\b/i,'quality_inspector'],
  [/assembler|assembly (technician|operator|associate|worker)|electro.?mechanical assembler/i,'assembler'],
  [/(production|manufacturing) (associate|operator|technician|worker|specialist)|machine operator|press operator|line (lead|operator|worker)|extrusion|injection mold|packaging operator|mixer operator|blow mold/i,'machine_operator'],
  // ---- automotive / heavy equipment ----
  [/diesel|heavy (equipment|mobile|duty) (mechanic|tech)/i,'diesel_mechanic'],
  [/automotive|auto (tech|mechanic)|vehicle (technician|mechanic|tech)|service technician|lube tech|tire tech|\bmechanic\b/i,'automotive_tech'],
  [/crane operator|crane op/i,'crane_operator'],
  [/heavy equipment operator|equipment operator|excavator|loader operator|\bgrader\b|\bdozer\b|backhoe/i,'heavy_equipment'],
  // ---- logistics / driving ----
  [/\bcdl\b|truck driver|tractor[- ]trailer|class a driver|\botr\b|delivery driver|\bdriver\b/i,'cdl_driver'],
  [/courier|last mile|route driver/i,'delivery_driver'],
  [/\bmover\b|moving (helper|crew)|relocation specialist/i,'mover'],
  [/warehouse|material handler|forklift|inventory (associate|clerk|handler|control|specialist)|shipping|receiving|order (selector|picker|puller)|\bpicker\b|\bpacker\b|stocker|fulfillment|distribution (associate|center)|logistics (coordinator|associate|technician|specialist)/i,'warehouse'],
  // ---- food / hospitality ----
  [/line cook|prep cook|\bcook\b|kitchen (staff|crew|associate)/i,'cook'],
  [/dishwasher|\bsteward\b/i,'dishwasher'],
  [/server|waiter|waitress|barista|bartender|food service|\bbusser\b|host(ess)?/i,'server'],
  // ---- facility / grounds / other ----
  [/janitor|custodian|cleaner|housekeep|custodial|\bporter\b|environmental services|\bevs\b/i,'janitor'],
  [/security (guard|officer)|\bguard\b|loss prevention/i,'security_guard'],
  [/landscap|groundskeeper|grounds (crew|keeper)|\blawn\b|irrigation tech/i,'landscaper'],
  [/pest control|exterminator/i,'pest_control'],
  [/locksmith/i,'locksmith'],
  [/appliance (repair|tech)/i,'appliance_repair'],
  [/facilities (coordinator|associate|worker)|facility tech/i,'facilities'],
  // ---- generic fallbacks (after everything specific) ----
  [/\btechnician\b/i,'equipment_tech'],
  [/\boperator\b/i,'machine_operator'],
  [/\blaborer\b|general labor|day labor|\bcrew member\b/i,'warehouse'],
];
// Exclude white-collar / IT / corporate even when a weak token matched (e.g. "Welding Engineer").
// Deliberately does NOT deny lead/head/specialist/coordinator — those are real blue-collar titles.
const DENY = /\bengineer\b|software|firmware|\bdeveloper\b|\bdevops\b|\bsre\b|data scientist|machine learning|\bfinance\b|accountant|\bmanager\b|\bdirector\b|\bvp\b|\bhead of\b|\bchief\b|president|principal|counsel|attorney|paralegal|marketing|\brecruit\w*|\bsales\b|account executive|product (manager|owner|designer)|program manager|project manager|\bdesigner\b|\bux\b|\barchitect\b|\banalyst\b|\bintern\b|controller|\bscientist\b|researcher|strategy|business development|\bconsultant\b|underwriter|people partner|copywriter|content writer|information security|cyber ?security|\bciso\b/i;
// est. hourly band per trade so cards read real (labelled as estimate when the feed gives no pay)
const PAY = {
  welder:[26,42],machinist:[26,42],assembler:[20,30],cleanroom_op:[21,30],process_tech:[24,36],
  equipment_tech:[28,44],maintenance_tech:[26,40],quality_inspector:[22,34],automotive_tech:[24,38],
  diesel_mechanic:[28,42],electrician:[30,46],low_voltage:[22,34],warehouse:[18,26],machine_operator:[20,30],
  sterile_processing:[19,27],surgical_tech:[25,36],phlebotomist:[19,27],cna:[18,25],patient_care_tech:[18,25],
  medical_assistant:[20,30],hvac:[26,42],plumber:[28,46],pipefitter:[30,48],millwright:[30,48],
  ironworker:[28,44],sheet_metal:[26,40],boilermaker:[30,48],elevator_tech:[34,55],carpenter:[24,40],
  mason:[24,40],concrete:[22,36],roofer:[20,34],painter:[20,32],drywall:[22,34],tile:[22,36],
  flooring:[20,34],glazier:[24,38],insulation:[20,32],solar:[22,36],fire_sprinkler:[28,44],
  crane_operator:[30,48],heavy_equipment:[24,40],cdl_driver:[22,34],delivery_driver:[18,26],mover:[17,26],
  cook:[16,24],prep_cook:[15,21],server:[12,22],dishwasher:[14,18],janitor:[15,22],housekeeper:[15,21],
  security_guard:[16,24],caregiver:[15,22],emt:[17,28],landscaper:[16,24],pest_control:[18,28],
  locksmith:[20,32],appliance_repair:[22,36],facilities:[20,32],
};
const CRED = { welder:'aws_welding',electrician:'osha10',equipment_tech:'osha10',maintenance_tech:'osha10',
  diesel_mechanic:'ase',automotive_tech:'ase',warehouse:'forklift',cna:'cna_cert',surgical_tech:'bls',
  sterile_processing:'bls',phlebotomist:'bls',patient_care_tech:'bls',medical_assistant:'bls',
  hvac:'epa608',plumber:'license',pipefitter:'license',cdl_driver:'cdl',crane_operator:'nccco_crane',
  caregiver:'hha',emt:'bls',security_guard:'guard_card',cook:'food_handler',server:'food_handler',
  ironworker:'osha10',millwright:'osha10',solar:'osha10',fire_sprinkler:'osha30',roofer:'fall_protection' };

function tradeFor(title){ for(const [re,tr] of TRADE_RULES){ if(re.test(title)) return tr; } return null; }

// Tidy feed titles that bake in store numbers / city,state (e.g. "Barista, Austin, TX, #1630").
function cleanTitle(t){
  let s = String(t||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  s = s.replace(/\s*[,\-–]\s*#\s*\d+\s*$/i,'');              // trailing store number
  s = s.replace(/\s*,\s*[A-Za-z .'\/]+,\s*[A-Z]{2}\s*$/,''); // trailing ", City, ST"
  s = s.replace(/\s*,\s*[A-Z]{2}\s*$/,'');                   // trailing ", ST"
  return s.trim();
}

// ---- geocoding: precise for major metros, state-centroid fallback so every US job maps ----
const STATE_CENTROID = {
  AL:[32.8,-86.8],AK:[64.2,-149.5],AZ:[34.2,-111.7],AR:[34.9,-92.4],CA:[37.2,-119.7],CO:[39.0,-105.5],
  CT:[41.6,-72.7],DE:[39.0,-75.5],FL:[28.6,-81.5],GA:[32.6,-83.4],HI:[20.8,-156.3],ID:[44.4,-114.6],
  IL:[40.0,-89.2],IN:[39.9,-86.3],IA:[42.0,-93.5],KS:[38.5,-98.4],KY:[37.5,-85.3],LA:[31.0,-92.0],
  ME:[45.4,-69.2],MD:[39.0,-76.8],MA:[42.3,-71.8],MI:[44.3,-85.4],MN:[46.3,-94.3],MS:[32.7,-89.7],
  MO:[38.4,-92.5],MT:[46.9,-110.4],NE:[41.5,-99.8],NV:[39.3,-116.6],NH:[43.7,-71.6],NJ:[40.1,-74.7],
  NM:[34.4,-106.1],NY:[42.9,-75.5],NC:[35.6,-79.4],ND:[47.5,-100.5],OH:[40.3,-82.8],OK:[35.6,-97.5],
  OR:[44.0,-120.5],PA:[40.9,-77.8],RI:[41.7,-71.5],SC:[33.9,-80.9],SD:[44.4,-100.2],TN:[35.9,-86.4],
  TX:[31.5,-99.3],UT:[39.3,-111.7],VT:[44.1,-72.7],VA:[37.5,-78.9],WA:[47.4,-120.5],WV:[38.6,-80.7],
  WI:[44.6,-89.9],WY:[43.0,-107.6],DC:[38.9,-77.0],
};
const CITY_LL = {
  'Costa Mesa,CA':[33.64,-117.92],'Chicago,IL':[41.88,-87.63],'Riviera Beach,FL':[26.78,-80.06],
  'Casa Grande,AZ':[32.88,-111.76],'McCarran,NV':[39.55,-119.74],'Reno,NV':[39.53,-119.81],
  'Long Beach,CA':[33.77,-118.19],'Middle River,MD':[39.33,-76.44],'Billerica,MA':[42.56,-71.27],
  'Somerville,MA':[42.39,-71.10],'Boston,MA':[42.36,-71.06],'Madison,WI':[43.07,-89.40],
  'San Jose,CA':[37.34,-121.89],'Sunnyvale,CA':[37.37,-122.04],'Fremont,CA':[37.55,-121.99],
  'Palo Alto,CA':[37.44,-122.14],'Mountain View,CA':[37.39,-122.08],'San Francisco,CA':[37.77,-122.42],
  'Austin,TX':[30.27,-97.74],'Houston,TX':[29.76,-95.37],'Dallas,TX':[32.78,-96.80],
  'Phoenix,AZ':[33.45,-112.07],'Chandler,AZ':[33.30,-111.84],'Mesa,AZ':[33.42,-111.83],
  'Seattle,WA':[47.61,-122.33],'Denver,CO':[39.74,-104.99],'Detroit,MI':[42.33,-83.05],
  'Columbus,OH':[39.96,-83.00],'Cincinnati,OH':[39.10,-84.51],'Nashville,TN':[36.16,-86.78],
  'Atlanta,GA':[33.75,-84.39],'Charlotte,NC':[35.23,-80.84],'Raleigh,NC':[35.78,-78.64],
  'Pittsburgh,PA':[40.44,-79.99],'New York,NY':[40.71,-74.01],'Brooklyn,NY':[40.65,-73.95],
  'Los Angeles,CA':[34.05,-118.24],'San Diego,CA':[32.72,-117.16],'Sacramento,CA':[38.58,-121.49],
  'Hawthorne,CA':[33.92,-118.35],'Torrance,CA':[33.84,-118.34],'Irvine,CA':[33.68,-117.83],
  'Portland,OR':[45.52,-122.68],'Salt Lake City,UT':[40.76,-111.89],'Boulder,CO':[40.01,-105.27],
  'Minneapolis,MN':[44.98,-93.27],'Tempe,AZ':[33.43,-111.94],'Waltham,MA':[42.38,-71.24],
  'Bloomington,MN':[44.84,-93.30],'Wilsonville,OR':[45.30,-122.77],'Bothell,WA':[47.76,-122.21],
};
function geocode(city, st){
  if(!st) return null;
  return CITY_LL[`${city},${st}`] || STATE_CENTROID[st] || null;
}
const STATE_NAMES = {'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA','colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV','new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD','tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA','washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY','district of columbia':'DC'};
// parse "City, ST" / "City, State" / "City, ST, USA" / "City, State, United States"; first US location wins
function parseLoc(name){
  if(!name) return null;
  const first = String(name).split(/;|\/|\bor\b/i)[0].trim();           // multi-loc → take first
  const parts = first.split(',').map(s=>s.trim()).filter(Boolean);
  if(parts.length < 2) return null;
  let city = parts[0];
  let stRaw = parts[1];
  let st = /^[A-Z]{2}$/.test(stRaw) ? stRaw : STATE_NAMES[stRaw.toLowerCase()];
  if(!st && parts.length >= 3){ const s3 = parts[2]; st = /^[A-Z]{2}$/.test(s3)?s3:STATE_NAMES[s3.toLowerCase()]; }
  if(!st) return null;
  return { city, st };
}

function fetchJSON(url, headers){
  return new Promise(resolve=>{
    const req = https.get(url, {headers:{'User-Agent':'RivetJobs/1.0 (jobs@rivet-crewline.onrender.com)','Accept':'application/json', ...(headers||{})}}, res=>{
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ resolve(JSON.parse(d)); }catch(e){ resolve(null); } });
    });
    req.on('error',()=>resolve(null));
    req.setTimeout(15000, ()=>{ req.destroy(); resolve(null); });
  });
}

// Additional KEYLESS public ATS boards with real blue-collar (non-IT) volume — probed live,
// kept only the ones that actually return US blue-collar roles. (provider, token, company, sector)
const EXTRA_SOURCES = [
  ['lever','gopuff','Gopuff','logistics'],
  ['lever','veho','Veho','logistics'],
  ['lever','everlywell','Everly Health','healthcare'],
  ['ashby','clipboard','Clipboard Health','healthcare'],
  ['smartrecruiters','Securitas','Securitas','security'],
  ['smartrecruiters','Sodexo','Sodexo','facilities'],
  ['smartrecruiters','Continental','Continental','manufacturing'],
  ['smartrecruiters','WesternDigital','Western Digital','manufacturing'],
  ['smartrecruiters','Equinox','Equinox','facilities'],
  ['smartrecruiters','Aramark','Aramark','facilities'],
  ['smartrecruiters','Penske','Penske','logistics'],
];

// KEYLESS Workday public career feeds (the public CXS API that powers their careers sites) —
// the real source for SEMICONDUCTOR fabs + HOSPITAL SYSTEMS. (tenant, company, sector, opts)
// Only employers whose location format parses accurately are included (verified by live probing).
const WD_SOURCES = [
  ['globalfoundries','GlobalFoundries','semiconductor',{host:'globalfoundries.wd1.myworkdayjobs.com',site:'External'}],
  ['amat','Applied Materials','semiconductor',{host:'amat.wd1.myworkdayjobs.com',site:'External'}],
  ['intel','Intel','semiconductor',{host:'intel.wd1.myworkdayjobs.com',site:'External'}],
  ['micron','Micron','semiconductor',{host:'micron.wd1.myworkdayjobs.com',site:'External'}],
  ['analogdevices','Analog Devices','semiconductor',{host:'analogdevices.wd1.myworkdayjobs.com',site:'External'}],
  ['kla','KLA','semiconductor',{host:'kla.wd1.myworkdayjobs.com',site:'Search'}],
  ['trinityhealth','Trinity Health','healthcare',{host:'trinityhealth.wd1.myworkdayjobs.com',site:'Jobs'}],
  ['sutterhealth','Sutter Health','healthcare',{host:'sutterhealth.wd1.myworkdayjobs.com',site:'SH',defaultState:'CA'}],
];

// POST helper for Workday CXS endpoints.
function fetchJSONPost(host, path, body){
  return new Promise(resolve=>{
    const data = JSON.stringify(body);
    const req = https.request({hostname:host, path, method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'Mozilla/5.0 RivetJobs/1.0'}}, res=>{
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ resolve(JSON.parse(d)); }catch(e){ resolve(null); } });
    });
    req.on('error',()=>resolve(null));
    req.setTimeout(15000, ()=>{ req.destroy(); resolve(null); });
    req.write(data); req.end();
  });
}
const isCountryTok = t => /^(u\.?s\.?a?|usa|united states.*)$/i.test(String(t).trim());
// Loose location parse for varied Workday formats: "ST - City", "US, State, City", "USA - A - B", "City, ST".
function parseLocLoose(raw){
  raw = String(raw||'').trim();
  let m = raw.match(/^([A-Z]{2})\s*-\s*(.+)$/);
  if(m && m[1]!=='US' && STATE_ABBR.has(m[1])) return { st:m[1], city:m[2].trim() };
  const toks = raw.split(/[,\-–\/]/).map(s=>s.trim()).filter(Boolean);
  let st=null, i=-1;
  for(let k=0;k<toks.length;k++){ const t=toks[k]; if(/^[A-Z]{2}$/.test(t)&&t!=='US'&&STATE_ABBR.has(t)){st=t;i=k;break;} const c=STATE_NAMES[t.toLowerCase()]; if(c){st=c;i=k;break;} }
  if(!st) return null;
  let city=null;
  if(i+1<toks.length && !isCountryTok(toks[i+1])) city=toks[i+1];
  else if(i-1>=0 && !isCountryTok(toks[i-1]) && !/^[A-Z]{2}$/.test(toks[i-1]) && !STATE_NAMES[toks[i-1].toLowerCase()]) city=toks[i-1];
  if(!city || /america|united|^\d/i.test(city)) return null;
  return { city, st };
}
// Workday location → {city,st} (US only). Falls back to a per-source defaultState for bare-city feeds.
function workdayLoc(text, defState){
  if(!text) return null;
  const raw = String(text).trim();
  if(/locations?$/i.test(raw) || /\bremote\b|work from home|virtual|multiple/i.test(raw)) return null; // multi/remote
  const p = parseLocLoose(raw);
  if(p) return p;
  if(defState){
    let city = raw.replace(/\(.*?\)/g,'').replace(/^[A-Z]{2}\s*-\s*/,'').split(/\s{2,}|,|\|/)[0].trim();
    if(!city || /\d/.test(city) || city.length<2) return null;
    return { city, st:defState };
  }
  return null;
}
const STATE_ABBR = new Set(Object.values({'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA','colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV','newhampshire':'NH','newjersey':'NJ','newmexico':'NM','newyork':'NY','northcarolina':'NC','northdakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA','rhodeisland':'RI','southcarolina':'SC','southdakota':'SD','tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA','washington':'WA','westvirginia':'WV','wisconsin':'WI','wyoming':'WY','dc':'DC'}));

// Normalize one company's public board to [{title,url,city,st,lat,lon}] — US roles only.
async function fetchProvider(provider, token, opts){
  try {
    if(provider==='workday'){
      const o = opts||{}; if(!o.host || !o.site) return [];
      const out=[];
      for(let off=0; off<240; off+=20){
        const j = await fetchJSONPost(o.host, `/wday/cxs/${token}/${o.site}/jobs`, {appliedFacets:{}, limit:20, offset:off, searchText:''});
        const rows = j && Array.isArray(j.jobPostings) ? j.jobPostings : [];
        if(!rows.length) break;
        for(const x of rows){ const loc = workdayLoc(x.locationsText, o.defaultState); if(!loc) continue;
          out.push({ title:(x.title||'').trim(), url: x.externalPath?`https://${o.host}/en-US/${o.site}${x.externalPath}`:null, city:loc.city, st:loc.st }); }
        if(rows.length < 20) break;
      }
      return out;
    }
    if(provider==='greenhouse'){
      const j = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
      if(!j || !Array.isArray(j.jobs)) return [];
      return j.jobs.map(x=>{ const loc=parseLoc((x.location&&x.location.name)||'')||{}; return {title:(x.title||'').trim(), url:x.absolute_url, city:loc.city, st:loc.st}; });
    }
    if(provider==='lever'){
      const a = await fetchJSON(`https://api.lever.co/v0/postings/${token}?mode=json`);
      if(!Array.isArray(a)) return [];
      return a.filter(x=>!x.country || x.country==='US').map(x=>{ const loc=parseLoc((x.categories&&x.categories.location)||'')||{}; return {title:(x.text||'').trim(), url:x.hostedUrl||x.applyUrl, city:loc.city, st:loc.st}; });
    }
    if(provider==='ashby'){
      const j = await fetchJSON(`https://api.ashbyhq.com/posting-api/job-board/${token}`);
      if(!j || !Array.isArray(j.jobs)) return [];
      return j.jobs.map(x=>{ const loc=parseLoc(x.location||'')||{}; return {title:(x.title||'').trim(), url:x.jobUrl||x.applyUrl, city:loc.city, st:loc.st}; });
    }
    if(provider==='smartrecruiters'){
      const out=[];
      for(let off=0; off<400; off+=100){
        const j = await fetchJSON(`https://api.smartrecruiters.com/v1/companies/${token}/postings?limit=100&offset=${off}`);
        const rows = j && Array.isArray(j.content) ? j.content : [];
        if(!rows.length) break;
        for(const x of rows){ const L=x.location||{}; if(String(L.country||'').toLowerCase()!=='us') continue;
          out.push({ title:(x.name||'').trim(), url:`https://jobs.smartrecruiters.com/${token}/${x.id}`, city:L.city, st:L.region,
            lat: L.latitude!=null?parseFloat(L.latitude):null, lon: L.longitude!=null?parseFloat(L.longitude):null }); }
        if(rows.length < 100) break;
      }
      return out;
    }
  } catch(e){}
  return [];
}

// Filter to a real blue-collar US role, geocode, ensure employer, insert. Returns 1 if added.
async function processJob(ctx, empKey, company, sector, item){
  let { title, url, city, st, lat, lon } = item;
  title = cleanTitle(title);
  if(!title || ctx.DENY.test(title)) return 0;
  const trade = tradeFor(title); if(!trade) return 0;
  if(!url || ctx.seen.has(url)) return 0;
  if(lat==null || lon==null){ if(!city || !st) return 0; const ll=geocode(city,st); if(!ll) return 0; lat=ll[0]; lon=ll[1]; }
  if(!city || isNaN(lat) || isNaN(lon)) return 0;
  ctx.seen.add(url);
  let eid = ctx.empCache[empKey];
  if(!eid){
    const email = `live.${empKey}@rivet.test`.slice(0,80);
    const ex = await ctx.db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if(ex) eid = ex.id;
    else { try { eid = (await ctx.insEmp.run(email, ctx.pw, 'employer', company, company, `${city}, ${st||''}`, '500+', `${company} — live openings via their official careers site.`)).lastInsertRowid; } catch(e){ const ex2=await ctx.db.prepare('SELECT id FROM users WHERE email=?').get(email); eid = ex2 && ex2.id; } }
    ctx.empCache[empKey] = eid;
  }
  if(!eid) return 0;
  const zipKey = `L:${city},${st||''}`.slice(0,40);
  try { await ctx.insZip.run(zipKey, lat, lon, city); } catch(e){}
  const band = PAY[trade] || [18,30];
  const descr = `${title} at ${company} — ${city}${st?', '+st:''}. Live opening; apply on ${company}'s official careers site.`;
  try { await ctx.insJob.run(eid, title, trade, band[0], band[1], city, zipKey, 'Day', CRED[trade]||'', descr, 'Full-time', company, url, sector, 'biweekly', 'Ongoing', 'authorized'); return 1; } catch(e){ return 0; }
}

// Main: fetch every keyless source, keep blue-collar US roles, insert deduped by apply_url.
async function ingestLiveJobs(db){
  let added = 0, scanned = 0;
  const seenRows = await db.prepare("SELECT apply_url FROM jobs WHERE apply_url IS NOT NULL").all();
  const ctx = {
    db, DENY, seen: new Set(seenRows.map(r=>r.apply_url)), empCache: {}, pw: '$rivet$live',
    insZip: db.prepare('INSERT OR IGNORE INTO zip_geo(zip,lat,lon,city) VALUES(?,?,?,?)'),
    insEmp: db.prepare('INSERT INTO users(email,pass,role,name,company,company_city,company_size,company_about) VALUES(?,?,?,?,?,?,?,?)'),
    insJob: db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type,source,apply_url,sector,pay_cadence,duration,sponsorship) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  };
  const all = SOURCES.map(([t,c,s])=>['greenhouse',t,c,s,null])
    .concat(EXTRA_SOURCES.map(([p,t,c,s])=>[p,t,c,s,null]))
    .concat(WD_SOURCES.map(([t,c,s,o])=>['workday',t,c,s,o]));
  for(const [provider, token, company, sector, opts] of all){
    const items = await fetchProvider(provider, token, opts);
    scanned += items.length;
    const empKey = provider==='greenhouse' ? token : `${provider}-${token}`;
    for(const it of items){ added += await processJob(ctx, empKey, company, sector, it); }
  }
  return { added, scanned };
}

// One-time tidy of already-ingested live titles (idempotent; cleans rows from before cleanTitle).
async function normalizeTitles(db){
  const rows = await db.prepare("SELECT id,title FROM jobs WHERE apply_url IS NOT NULL").all();
  let n=0;
  for(const r of rows){ const c=cleanTitle(r.title); if(c && c!==r.title){ try { await db.prepare('UPDATE jobs SET title=? WHERE id=?').run(c, r.id); n++; } catch(e){} } }
  return n;
}

module.exports = { ingestLiveJobs, normalizeTitles, SOURCES, EXTRA_SOURCES, WD_SOURCES, fetchProvider, tradeFor, cleanTitle, parseLoc, parseLocLoose, workdayLoc, geocode, PAY, CRED, DENY, TRADE_RULES, fetchJSON };
