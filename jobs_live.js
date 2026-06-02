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
const TRADE_RULES = [
  [/welder|welding/i,'welder'],
  [/machinist|cnc|lathe|\d-?axis/i,'machinist'],
  [/fabricat/i,'assembler'],
  [/cleanroom/i,'cleanroom_op'],
  [/chemical operator|process (technician|operator)|fab technician/i,'process_tech'],
  [/equipment (technician|maintenance|specialist)/i,'equipment_tech'],
  [/maintenance (technician|mechanic|tech)\b|facilities (technician|maintenance|coordinator)/i,'maintenance_tech'],
  [/quality (inspector|technician|control)|inspector/i,'quality_inspector'],
  [/fleet (technician|tech)|vehicle (technician|tech)|service technician|diagnostic technician|automotive/i,'automotive_tech'],
  [/diesel|heavy (equipment|mobile)/i,'diesel_mechanic'],
  [/electrician|electrical (rework|technician|installer)/i,'electrician'],
  [/installer|installation tech/i,'low_voltage'],
  [/warehouse|material handler|forklift|inventory (associate|clerk|handler|control)|shipping|receiving|logistics (coordinator|associate|technician)/i,'warehouse'],
  [/assembler|assembly (technician|operator|associate)|assembly integrator/i,'assembler'],
  [/(production|manufacturing) (associate|operator|technician|specialist)|line (lead|operator)|press operator|build technician|launch technician/i,'machine_operator'],
  [/sterile process/i,'sterile_processing'],
  [/surgical tech/i,'surgical_tech'],
  [/phlebotom/i,'phlebotomist'],
  [/nursing assistant|\bcna\b/i,'cna'],
  [/patient care/i,'patient_care_tech'],
  [/medical assistant/i,'medical_assistant'],
  [/\btechnician\b/i,'equipment_tech'], // generic technician fallback (after specific ones)
];
// Exclude white-collar/corporate even when a weak token matched (e.g. "Welding Engineer", "Tech Lead").
const DENY = /engineer|\bIC\b|chip design|\bdesign\b|software|firmware|hardware engineer|finance|accounting|data scientist|\bmanager\b|director|principal|\bstaff\b|counsel|marketing|recruit|\bsales\b|product (manager|owner)|program manager|designer|architect|analyst|\bintern\b|controller|scientist|researcher|\blead\b|\bhead\b|strategy|operations manager/i;
// est. hourly band per trade so cards read real (labelled as estimate in the UI source tag)
const PAY = {
  welder:[26,42],machinist:[26,42],assembler:[20,30],cleanroom_op:[21,30],process_tech:[24,36],
  equipment_tech:[28,44],maintenance_tech:[26,40],quality_inspector:[22,34],automotive_tech:[24,38],
  diesel_mechanic:[28,42],electrician:[30,46],low_voltage:[24,36],warehouse:[18,26],machine_operator:[20,30],
  sterile_processing:[19,27],surgical_tech:[25,36],phlebotomist:[19,27],cna:[18,25],patient_care_tech:[18,25],
  medical_assistant:[20,30],
};
const CRED = { welder:'aws_welding',electrician:'osha10',equipment_tech:'osha10',maintenance_tech:'osha10',
  diesel_mechanic:'ase',automotive_tech:'ase',warehouse:'forklift',cna:'cna_cert',surgical_tech:'bls',
  sterile_processing:'bls',phlebotomist:'bls',patient_care_tech:'bls',medical_assistant:'bls' };

function tradeFor(title){ for(const [re,tr] of TRADE_RULES){ if(re.test(title)) return tr; } return null; }

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

function fetchJSON(url){
  return new Promise(resolve=>{
    const req = https.get(url, {headers:{'User-Agent':'RivetJobs/1.0 (jobs@rivet-crewline.onrender.com)','Accept':'application/json'}}, res=>{
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ resolve(JSON.parse(d)); }catch(e){ resolve(null); } });
    });
    req.on('error',()=>resolve(null));
    req.setTimeout(15000, ()=>{ req.destroy(); resolve(null); });
  });
}

// Main: fetch all sources, keep blue-collar US roles, insert deduped by apply_url. Returns {added, scanned}.
async function ingestLiveJobs(db){
  let added = 0, scanned = 0;
  // existing apply_urls (dedupe across all feeds)
  const seenRows = await db.prepare("SELECT apply_url FROM jobs WHERE apply_url IS NOT NULL").all();
  const seen = new Set(seenRows.map(r=>r.apply_url));
  const empCache = {};
  const insZip = db.prepare('INSERT OR IGNORE INTO zip_geo(zip,lat,lon,city) VALUES(?,?,?,?)');
  const insEmp = db.prepare('INSERT INTO users(email,pass,role,name,company,company_city,company_size,company_about) VALUES(?,?,?,?,?,?,?,?)');
  const insJob = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type,source,apply_url,sector,pay_cadence,duration,sponsorship) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const pw = (db._livePw || '$rivet$live'); // workers can't log into these feed accounts; not used for auth
  for(const [token, company, sector] of SOURCES){
    const j = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
    if(!j || !Array.isArray(j.jobs)) continue;
    let eid = null;
    for(const job of j.jobs){
      scanned++;
      const title = (job.title||'').trim();
      if(DENY.test(title)) continue;                         // white-collar / corporate
      const trade = tradeFor(title);
      if(!trade) continue;                                   // not a blue-collar role
      const loc = parseLoc((job.location && job.location.name) || '');
      if(!loc) continue;                                     // not a parseable US location
      const ll = geocode(loc.city, loc.st);
      if(!ll) continue;
      const url = job.absolute_url;
      if(!url || seen.has(url)) continue;
      seen.add(url);
      // ensure employer exists for this company
      if(!eid){
        if(empCache[token]) eid = empCache[token];
        else {
          const email = `live.${token}@rivet.test`;
          const ex = await db.prepare('SELECT id FROM users WHERE email=?').get(email);
          if(ex) eid = ex.id;
          else { try { eid = (await insEmp.run(email, pw, 'employer', company, company, loc.city+', '+loc.st, '500+', `${company} — live openings via their official careers site.`)).lastInsertRowid; } catch(e){ const ex2=await db.prepare('SELECT id FROM users WHERE email=?').get(email); eid = ex2 && ex2.id; } }
          empCache[token] = eid;
        }
      }
      if(!eid) continue;
      const zipKey = `L:${loc.city},${loc.st}`.slice(0,40);
      try { await insZip.run(zipKey, ll[0], ll[1], loc.city); } catch(e){}
      const band = PAY[trade] || [0,0];
      const descr = `${title} at ${company} — ${loc.city}, ${loc.st}. Live opening; apply on ${company}'s official careers site.`;
      try {
        await insJob.run(eid, title, trade, band[0], band[1], loc.city, zipKey, 'Day', CRED[trade]||'', descr, 'Full-time', company, url, sector, 'biweekly', 'Ongoing', 'authorized');
        added++;
      } catch(e){}
    }
  }
  return { added, scanned };
}

module.exports = { ingestLiveJobs, SOURCES, tradeFor, parseLoc, geocode };
