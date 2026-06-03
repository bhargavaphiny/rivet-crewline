'use strict';
/*
 * Real blue-collar (non-IT) job ingestion from LICENSED public job-aggregator APIs.
 * Every provider is key-gated via env vars — dormant (and harmless) until keys are set:
 *   - Adzuna:   ADZUNA_APP_ID + ADZUNA_APP_KEY        (https://developer.adzuna.com)
 *   - USAJOBS:  USAJOBS_KEY [+ USAJOBS_EMAIL]          (https://developer.usajobs.gov)
 *   - Jooble:   JOOBLE_KEY                             (https://jooble.org/api/about)
 * All jobs carry a real apply_url. No scraping, no ToS issues. NON-IT roles only
 * (filtered by the shared blue-collar title matcher + white-collar/IT DENY list).
 */
const https = require('https');
const { tradeFor, geocode, parseLoc, PAY, CRED, DENY } = require('./jobs_live');

// ---- tiny HTTP helpers ----
function httpJSON(url, { method = 'GET', headers = {}, body = null } = {}){
  return new Promise(resolve=>{
    let u; try { u = new URL(url); } catch(e){ return resolve(null); }
    const opts = { method, hostname:u.hostname, path:u.pathname+u.search,
      headers:{ 'Accept':'application/json', 'User-Agent':'RivetJobs/1.0 (jobs@rivet-crewline.onrender.com)', ...headers } };
    const req = https.request(opts, res=>{ let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ resolve(JSON.parse(d)); }catch(e){ resolve(null); } }); });
    req.on('error',()=>resolve(null));
    req.setTimeout(15000, ()=>{ req.destroy(); resolve(null); });
    if(body) req.write(typeof body==='string'?body:JSON.stringify(body));
    req.end();
  });
}
const toHourly = n => { n = Number(n)||0; if(!n) return 0; return n > 400 ? Math.round(n/2080) : Math.round(n); };

// ---- shared DB writers (mirror jobs_live insert shape) ----
function makeWriters(db){
  const insZip = db.prepare('INSERT OR IGNORE INTO zip_geo(zip,lat,lon,city) VALUES(?,?,?,?)');
  const insEmp = db.prepare('INSERT INTO users(email,pass,role,name,company,company_city,company_size,company_about) VALUES(?,?,?,?,?,?,?,?)');
  const insJob = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type,source,apply_url,sector,pay_cadence,duration,sponsorship) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const empCache = {};
  async function employer(slug, company, cityst){
    if(empCache[slug]) return empCache[slug];
    const email = `agg.${slug}@rivet.live`.slice(0,80);
    const ex = await db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if(ex){ empCache[slug]=ex.id; return ex.id; }
    try { const id = (await insEmp.run(email,'$rivet$agg','employer',company,company,cityst||'','—',`${company} — live openings aggregated from public job boards.`)).lastInsertRowid; empCache[slug]=id; return id; }
    catch(e){ const ex2 = await db.prepare('SELECT id FROM users WHERE email=?').get(email); if(ex2){ empCache[slug]=ex2.id; return ex2.id; } return null; }
  }
  return { insZip, insJob, employer };
}

// ---- Adzuna: GTM-first. Categories limited to the GTM sectors (manufacturing + healthcare);
// semiconductor has no category so it's covered by deep keyword queries below. ----
const ADZUNA_CATS = [
  ['manufacturing-jobs','manufacturing'], ['healthcare-nursing-jobs','healthcare'],
];
// Keyword queries to feed sectors the category API misses (healthcare blue-collar, semiconductor).
// GTM depth, semiconductor-FIRST (priority order semi > manufacturing > healthcare), interleaved
// so the priority sector still gets budget if the free tier throttles mid-run.
const ADZUNA_KW = [
  ['semiconductor technician','semiconductor'],['CNC machinist','manufacturing'],['certified nursing assistant','healthcare'],
  ['fab technician','semiconductor'],['welder fabricator','manufacturing'],['patient care technician','healthcare'],
  ['cleanroom technician','semiconductor'],['assembly technician','manufacturing'],['medical assistant','healthcare'],
  ['semiconductor process technician','semiconductor'],['production maintenance technician','manufacturing'],['sterile processing','healthcare'],
  ['wafer fabrication technician','semiconductor'],['quality inspector','manufacturing'],['surgical technician','healthcare'],
  ['photolithography technician','semiconductor'],['phlebotomist','healthcare'],
  ['etch deposition technician','semiconductor'],['caregiver','healthcare'],
  ['metrology technician','semiconductor'],['home health aide','healthcare'],
  ['ion implant technician','semiconductor'],['semiconductor equipment maintenance','semiconductor'],
];
async function ingestAdzuna(db, w, seen, touched=[]){
  const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
  if(!id || !key) return { added:0, scanned:0 };
  let added=0, scanned=0;
  const handle = async (rows, sector) => {
    for(const r of rows){
      scanned++;
      const title = String(r.title||'').replace(/<[^>]+>/g,'').trim();
      if(!title || DENY.test(title)) continue;
      const sec = typeof sector==='function' ? sector(title) : sector;
      const trade = tradeFor(title); if(!trade) continue;
      const apply = r.redirect_url; if(!apply) continue; touched.push(apply); if(seen.has(apply)) continue;
      const area = (r.location && Array.isArray(r.location.area)) ? r.location.area : [];
      const display = (r.location && r.location.display_name) || area.slice(1).reverse().join(', ');
      const loc = parseLoc(display) || (area.length>=3 ? parseLoc(`${area[area.length-1]}, ${area[1]}`) : null);
      let lat = r.latitude, lon = r.longitude, city = loc && loc.city, st = loc && loc.st;
      if((lat==null||lon==null) && city && st){ const ll = geocode(city, st); if(ll){ lat=ll[0]; lon=ll[1]; } }
      if(lat==null || lon==null || !city) continue;
      seen.add(apply);
      const company = (r.company && r.company.display_name) || 'Employer';
      const slug = String(company).toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40) || 'employer';
      const eid = await w.employer(slug, company, `${city}, ${st||''}`); if(!eid) continue;
      const zipKey = `AZ:${city},${st||''}`.slice(0,40);
      try { await w.insZip.run(zipKey, lat, lon, city); } catch(e){}
      let lo = toHourly(r.salary_min), hi = toHourly(r.salary_max);
      if(!lo || !hi){ const band = PAY[trade]||[18,30]; lo = lo||band[0]; hi = hi||band[1]; }
      const descr = `${title} — ${company}, ${city}${st?', '+st:''}. Live opening; apply on the employer's site (via Adzuna).`;
      try { await w.insJob.run(eid,title,trade,lo,hi,city,zipKey,'Day',CRED[trade]||'',descr,'Full-time',company,apply,sec,'biweekly','Ongoing','authorized'); added++; } catch(e){}
    }
  };
  // Only genuine fab signals → semiconductor; generic "process/maintenance technician" → manufacturing.
  const semiSectorOf = t => /semiconductor|wafer|\bfab\b|cleanroom|photolith|\blitho\b|\betch\b|\bcvd\b|\bpvd\b|deposition|ion implant|epitax|\bcmp\b|nanofab|microelectronic/i.test(t) ? 'semiconductor' : 'manufacturing';
  const base = `https://api.adzuna.com/v1/api/jobs/us/search`;
  const auth = `app_id=${id}&app_key=${key}&results_per_page=50&content-type=application/json&max_days_old=30`;
  for(const [cat, sector] of ADZUNA_CATS){
    for(let page=1; page<=3; page++){
      const j = await httpJSON(`${base}/${page}?${auth}&category=${cat}`);
      const rows = j && Array.isArray(j.results) ? j.results : null;
      if(!rows || !rows.length) break;
      await handle(rows, sector);
      if(rows.length < 50) break;
    }
  }
  for(const [term, sector] of ADZUNA_KW){
    const sectorOf = sector==='semiconductor' ? semiSectorOf : sector;
    for(let page=1; page<=2; page++){
      const j = await httpJSON(`${base}/${page}?${auth}&what=${encodeURIComponent(term)}`);
      const rows = j && Array.isArray(j.results) ? j.results : null;
      if(!rows || !rows.length) break;
      await handle(rows, sectorOf);
      if(rows.length < 50) break;
    }
  }
  return { added, scanned };
}

// ---- USAJOBS: federal non-IT roles by keyword (huge real trades/health/maintenance pool) ----
const USAJOBS_TERMS = ['nursing assistant','medical support assistant','maintenance mechanic','electrician','welding','plumber','pipefitter','heavy mobile equipment','motor vehicle operator','food service','custodian','warehouse','machinist','laborer','hvac','boiler'];
async function ingestUsajobs(db, w, seen, touched=[]){
  const key = process.env.USAJOBS_KEY; if(!key) return { added:0, scanned:0 };
  const email = process.env.USAJOBS_EMAIL || 'jobs@rivet-crewline.onrender.com';
  const headers = { 'Host':'data.usajobs.gov', 'User-Agent':email, 'Authorization-Key':key };
  let added=0, scanned=0;
  for(const term of USAJOBS_TERMS){
    for(let page=1; page<=2; page++){
      const url = `https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(term)}&ResultsPerPage=50&Page=${page}`;
      const j = await httpJSON(url, { headers });
      const items = j && j.SearchResult && Array.isArray(j.SearchResult.SearchResultItems) ? j.SearchResult.SearchResultItems : null;
      if(!items || !items.length) break;
      for(const it of items){
        scanned++;
        const d = it.MatchedObjectDescriptor || {};
        const title = String(d.PositionTitle||'').trim();
        if(!title || DENY.test(title)) continue;
        const trade = tradeFor(title); if(!trade) continue;
        const apply = (Array.isArray(d.ApplyURI) && d.ApplyURI[0]) || d.PositionURI; if(!apply) continue; touched.push(apply); if(seen.has(apply)) continue;
        const pl = (Array.isArray(d.PositionLocation) && d.PositionLocation[0]) || null;
        let city = pl && pl.CityName, st = pl && (pl.CountrySubDivisionCode || '');
        let lat = pl && pl.Latitude, lon = pl && pl.Longitude;
        if(st && st.length>2){ const m = parseLoc(`X, ${st}`); st = m ? m.st : st; }
        if((lat==null||lon==null) && city && st){ const ll = geocode(city, st); if(ll){ lat=ll[0]; lon=ll[1]; } }
        if(lat==null || lon==null || !city) continue;
        seen.add(apply);
        const company = d.OrganizationName || 'U.S. Federal Government';
        const eid = await w.employer('usajobs-'+String(company).toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,30), company, `${city}, ${st}`); if(!eid) continue;
        const zipKey = `UJ:${city},${st}`.slice(0,40);
        try { await w.insZip.run(zipKey, lat, lon, city); } catch(e){}
        let lo=0, hi=0; const rem = Array.isArray(d.PositionRemuneration) && d.PositionRemuneration[0];
        if(rem){ const per = rem.RateIntervalCode==='Per Hour'||rem.RateIntervalCode==='PH'; lo = per?Math.round(Number(rem.MinimumRange)||0):toHourly(rem.MinimumRange); hi = per?Math.round(Number(rem.MaximumRange)||0):toHourly(rem.MaximumRange); }
        if(!lo||!hi){ const band = PAY[trade]||[18,30]; lo=lo||band[0]; hi=hi||band[1]; }
        const descr = `${title} — ${company}, ${city}, ${st}. Federal opening; apply on USAJOBS.`;
        try { await w.insJob.run(eid,title,trade,lo,hi,city,zipKey,'Day',CRED[trade]||'',descr,'Full-time',company,apply,'government','biweekly','Ongoing','authorized'); added++; } catch(e){}
      }
      if(items.length < 50) break;
    }
  }
  return { added, scanned };
}

// ---- Jooble: aggregator (POST). Each keyword group is tagged to a sector so keys deepen sector pages. ----
// GTM-first, semiconductor leading. (Non-GTM groups dropped — depth in the 3 sectors first.)
const JOOBLE_TERMS = [
  ['semiconductor equipment technician cleanroom wafer fab','semiconductor'],
  ['semiconductor process technician etch deposition photolithography','semiconductor'],
  ['CNC machinist welder fabricator assembler','manufacturing'],
  ['production operator maintenance technician quality inspector','manufacturing'],
  ['CNA caregiver home health aide','healthcare'],
  ['medical assistant phlebotomist patient care technician','healthcare'],
  ['sterile processing surgical technician','healthcare'],
];
async function ingestJooble(db, w, seen, touched=[]){
  const key = process.env.JOOBLE_KEY; if(!key) return { added:0, scanned:0 };
  let added=0, scanned=0;
  for(const [kw, sector] of JOOBLE_TERMS){
    for(let page=1; page<=3; page++){
      const j = await httpJSON(`https://jooble.org/api/${key}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:{ keywords:kw, location:'United States', page } });
      const rows = j && Array.isArray(j.jobs) ? j.jobs : null;
      if(!rows || !rows.length) break;
      for(const r of rows){
        scanned++;
        const title = String(r.title||'').trim();
        if(!title || DENY.test(title)) continue;
        const trade = tradeFor(title); if(!trade) continue;
        const apply = r.link; if(!apply) continue; touched.push(apply); if(seen.has(apply)) continue;
        const loc = parseLoc(r.location||''); if(!loc) continue;
        const ll = geocode(loc.city, loc.st); if(!ll) continue;
        seen.add(apply);
        const company = r.company || 'Employer';
        const slug = 'jb-'+String(company).toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,32);
        const eid = await w.employer(slug, company, `${loc.city}, ${loc.st}`); if(!eid) continue;
        const zipKey = `JB:${loc.city},${loc.st}`.slice(0,40);
        try { await w.insZip.run(zipKey, ll[0], ll[1], loc.city); } catch(e){}
        const band = PAY[trade]||[18,30];
        const descr = `${title} — ${company}, ${loc.city}, ${loc.st}. Live opening; apply on the employer's site (via Jooble).`;
        try { await w.insJob.run(eid,title,trade,band[0],band[1],loc.city,zipKey,'Day',CRED[trade]||'',descr,'Full-time',company,apply,sector,'biweekly','Ongoing','authorized'); added++; } catch(e){}
      }
      if(rows.length < 10) break;
    }
  }
  return { added, scanned };
}

function aggregatorsConfigured(){
  return !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) || !!process.env.USAJOBS_KEY || !!process.env.JOOBLE_KEY;
}

async function ingestAggregators(db){
  const w = makeWriters(db);
  const seenRows = await db.prepare("SELECT apply_url FROM jobs WHERE apply_url IS NOT NULL").all();
  const seen = new Set(seenRows.map(r=>r.apply_url));
  const touched = []; // every apply_url seen live in a feed this run → for freshness refresh
  const providers = {};
  for(const [name, fn] of [['adzuna',ingestAdzuna],['usajobs',ingestUsajobs],['jooble',ingestJooble]]){
    try { providers[name] = await fn(db, w, seen, touched); } catch(e){ providers[name] = { added:0, scanned:0, error:e.message }; }
  }
  const added = Object.values(providers).reduce((a,p)=>a+(p.added||0),0);
  const scanned = Object.values(providers).reduce((a,p)=>a+(p.scanned||0),0);
  return { added, scanned, providers, touched };
}

module.exports = { ingestAggregators, aggregatorsConfigured };
