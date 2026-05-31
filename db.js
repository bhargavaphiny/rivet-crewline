'use strict';
/*
 * Rivet x Crewline - database layer (libSQL / Turso).
 * - Local dev: uses a local SQLite file (file:data/rivet.db) — no account needed.
 * - Production: set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) to a Turso DB so data persists.
 * Same SQLite SQL dialect either way. All calls are async.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@libsql/client');
const { readiness } = require('./matching');

const DATA_DIR = process.env.RIVET_DATA_DIR || path.join(__dirname, 'data');

let url, authToken;
if (process.env.TURSO_DATABASE_URL) {
  url = process.env.TURSO_DATABASE_URL;
  authToken = process.env.TURSO_AUTH_TOKEN || undefined;
} else {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  url = 'file:' + path.join(DATA_DIR, 'rivet.db');
}
const client = createClient(authToken ? { url, authToken } : { url });

// Normalize a libSQL Row into a plain object keyed by column name (safe to spread).
function toObj(row, columns) {
  if (!row) return undefined;
  const o = {};
  for (const c of columns) o[c] = row[c];
  return o;
}

// Thin wrapper preserving the prepare(sql).get/all/run(...args) shape, but async.
const db = {
  prepare(sql) {
    return {
      async get(...args) {
        const r = await client.execute({ sql, args });
        return toObj(r.rows[0], r.columns);
      },
      async all(...args) {
        const r = await client.execute({ sql, args });
        return r.rows.map((row) => toObj(row, r.columns));
      },
      async run(...args) {
        const r = await client.execute({ sql, args });
        return {
          lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : undefined,
          changes: r.rowsAffected,
        };
      },
    };
  },
  async exec(sql) {
    await client.executeMultiple(sql);
  },
};

// ---- password helpers (scrypt) ----
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, salt, 32).toString('hex');
  return `${salt}:${h}`;
}
function verifyPassword(pw, stored) {
  const [salt, h] = String(stored).split(':');
  if (!salt || !h) return false;
  const test = crypto.scryptSync(pw, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(h, 'hex'));
}

async function recomputeReadiness(userId) {
  const p = await db.prepare('SELECT * FROM worker_profiles WHERE user_id=?').get(userId);
  if (!p) return;
  const creds = await db.prepare('SELECT * FROM credentials WHERE user_id=?').all(userId);
  const r = readiness(p, creds);
  await db.prepare('UPDATE worker_profiles SET readiness=? WHERE user_id=?').run(r, userId);
}

async function createSchema() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      pass TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS worker_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      trade TEXT, years_exp INTEGER DEFAULT 0,
      city TEXT, zip TEXT,
      pay_floor INTEGER DEFAULT 0, shift TEXT DEFAULT 'Any',
      readiness INTEGER DEFAULT 0, bio TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      kind TEXT, name TEXT,
      verified INTEGER DEFAULT 0, expires TEXT
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id INTEGER REFERENCES users(id),
      title TEXT, trade TEXT,
      pay_min INTEGER, pay_max INTEGER,
      city TEXT, zip TEXT, shift TEXT DEFAULT 'Day',
      req_creds TEXT DEFAULT '', descr TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id),
      worker_id INTEGER REFERENCES users(id),
      stage TEXT DEFAULT 'Sourced',
      score INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(job_id, worker_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id INTEGER REFERENCES users(id),
      to_id INTEGER REFERENCES users(id),
      body TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER REFERENCES users(id),
      worker_id INTEGER REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS saved_jobs (
      worker_id INTEGER REFERENCES users(id),
      job_id INTEGER REFERENCES jobs(id),
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(worker_id, job_id)
    );
    CREATE TABLE IF NOT EXISTS saved_candidates (
      employer_id INTEGER REFERENCES users(id),
      worker_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(employer_id, worker_id)
    );
    CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE IF NOT EXISTS otp (
      phone TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires TEXT NOT NULL,
      role TEXT, name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      target TEXT NOT NULL,
      job_id INTEGER,
      kind TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT, caption TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_media_portfolio ON media(user_id, target);
    CREATE INDEX IF NOT EXISTS idx_media_job ON media(job_id);
    CREATE TABLE IF NOT EXISTS zip_geo (
      zip TEXT PRIMARY KEY, lat REAL, lon REAL, city TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS work_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      employer TEXT, role TEXT, trade TEXT,
      city TEXT, start_year INTEGER, end_year INTEGER, current INTEGER DEFAULT 0,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_work_history_user ON work_history(user_id);
    CREATE TABLE IF NOT EXISTS translations (
      lang TEXT NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL,
      PRIMARY KEY (lang, src)
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER, author_name TEXT, trade TEXT,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER REFERENCES users(id),
      author_name TEXT,
      subject_id INTEGER REFERENCES users(id),
      subject_kind TEXT NOT NULL,
      stars INTEGER NOT NULL,
      body TEXT DEFAULT '',
      job_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(author_id, subject_id, job_id)
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_subject ON reviews(subject_id, subject_kind);
    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id),
      worker_id INTEGER REFERENCES users(id),
      employer_id INTEGER REFERENCES users(id),
      slots TEXT NOT NULL,
      chosen TEXT,
      status TEXT DEFAULT 'proposed',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id),
      worker_id INTEGER REFERENCES users(id),
      amount REAL NOT NULL, unit TEXT DEFAULT 'job',
      note TEXT DEFAULT '', status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(job_id, worker_id)
    );
    CREATE INDEX IF NOT EXISTS idx_quotes_job ON quotes(job_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_worker ON quotes(worker_id);
    CREATE TABLE IF NOT EXISTS crew_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL, trade TEXT, note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_crew_worker ON crew_members(worker_id);
    CREATE INDEX IF NOT EXISTS idx_interviews_worker ON interviews(worker_id, status);
    CREATE INDEX IF NOT EXISTS idx_interviews_job ON interviews(job_id);
    CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_id, read_at);
    CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_id, to_id);
    CREATE INDEX IF NOT EXISTS idx_applications_worker ON applications(worker_id);
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_credentials_user ON credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_trade ON jobs(trade);
    CREATE INDEX IF NOT EXISTS idx_worker_profiles_zip ON worker_profiles(zip);
  `);
}

// ---- seed (only when empty) ----
async function seed() {
  const count = (await db.prepare('SELECT COUNT(*) c FROM users').get()).c;
  if (count > 0) return;

  const pw = hashPassword('demo1234');
  const insUser = db.prepare('INSERT INTO users(email,pass,role,name,company) VALUES(?,?,?,?,?)');
  const insProf = db.prepare(`INSERT INTO worker_profiles(user_id,trade,years_exp,city,zip,pay_floor,shift,bio)
                              VALUES(?,?,?,?,?,?,?,?)`);
  const insCred = db.prepare('INSERT INTO credentials(user_id,kind,name,verified,expires) VALUES(?,?,?,?,?)');
  const insJob  = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr)
                              VALUES(?,?,?,?,?,?,?,?,?,?)`);
  const insApp  = db.prepare('INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,?,?)');
  const { scoreMatch, CRED_KINDS } = require('./matching');

  // --- Employer (Crewline) ---
  const empId = (await insUser.run('ops@sunvalley.test', pw, 'employer', 'Dana Ortiz', 'Sun Valley Mechanical')).lastInsertRowid;

  const jobDefs = [
    ['Commercial Electrician','electrician',44,48,'Phoenix','85004','Day','license,osha30','Commercial fit-outs and service. Journeyman card required.'],
    ['HVAC Service Technician','hvac',36,44,'Phoenix','85004','Day','epa608,osha10','Light commercial HVAC service & install.'],
    ['Controls Technician','controls',44,50,'Phoenix','85004','Day','license','PLC / BAS controls for commercial sites.'],
    ['Maintenance Technician','hvac',34,40,'Phoenix','85008','4x10','osha10','Plant maintenance, mechanical + light electrical.'],
  ];
  const jobs = [];
  for (const j of jobDefs) jobs.push((await insJob.run(empId, ...j)).lastInsertRowid);

  // --- Workers (Rivet) ---
  const workers = [
    ['marcus@rivet.test','Marcus Reyes','electrician',8,'85004',42,'Day',
      [['license',1,'2027-06'],['osha30',1,'2026-12'],['cpr',1,'2026-07']]],
    ['andre@rivet.test','Andre Cole','hvac',8,'85004',36,'Day',
      [['epa608',1,'2028-01'],['osha10',1,'2027-03']]],
    ['lupe@rivet.test','Lupe Flores','sheet_metal',6,'85008',31,'Day',
      [['osha30',1,'2026-11']]],
    ['ray@rivet.test','Ray Banks','controls',6,'85004',40,'Day',
      [['license',1,'2027-02'],['osha10',1,'2026-09']]],
    ['diego@rivet.test','Diego Vega','hvac',3,'85008',28,'Day',
      [['osha10',1,'2027-05']]],
    ['kim@rivet.test','Kim Park','electrician',10,'85004',45,'Day',
      [['license',1,'2026-10'],['osha30',1,'2027-01']]],
  ];

  const workerIds = {};
  for (const [email,name,trade,yrs,zip,floor,shift,creds] of workers) {
    const uid = (await insUser.run(email, pw, 'worker', name, null)).lastInsertRowid;
    await insProf.run(uid, trade, yrs, 'Phoenix', zip, floor, shift, `${yrs}-year ${trade} based in Phoenix.`);
    for (const [kind, ver, exp] of creds) {
      await insCred.run(uid, kind, CRED_KINDS[kind] || kind, ver, exp);
    }
    await recomputeReadiness(uid);
    workerIds[email] = uid;
  }

  // Pre-populate one job's pipeline so the employer demo isn't empty.
  const elecJob = await db.prepare('SELECT * FROM jobs WHERE id=?').get(jobs[0]);
  const pre = [['marcus@rivet.test','Interview'],['kim@rivet.test','Screened'],['ray@rivet.test','Sourced']];
  for (const [email, stage] of pre) {
    const uid = workerIds[email];
    const prof = await db.prepare('SELECT * FROM worker_profiles WHERE user_id=?').get(uid);
    const creds = await db.prepare('SELECT * FROM credentials WHERE user_id=?').all(uid);
    const { score } = scoreMatch(prof, creds, elecJob);
    await insApp.run(elecJob.id, uid, stage, score);
  }

  console.log('[db] seeded demo data — employer: ops@sunvalley.test / worker: marcus@rivet.test (pw: demo1234)');
}

// ---- enrichment: extra employer/jobs/workers for a fuller demo (idempotent, additive) ----
async function enrichDemo() {
  const sentinel = await db.prepare('SELECT 1 FROM users WHERE email=?').get('tasha@rivet.test');
  if (sentinel) return; // already enriched

  const { CRED_KINDS } = require('./matching');
  const pw = hashPassword('demo1234');
  const insUser = db.prepare('INSERT INTO users(email,pass,role,name,company) VALUES(?,?,?,?,?)');
  const insProf = db.prepare(`INSERT INTO worker_profiles(user_id,trade,years_exp,city,zip,pay_floor,shift,bio)
                              VALUES(?,?,?,?,?,?,?,?)`);
  const insCred = db.prepare('INSERT INTO credentials(user_id,kind,name,verified,expires) VALUES(?,?,?,?,?)');
  const insJob  = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr)
                              VALUES(?,?,?,?,?,?,?,?,?,?)`);

  const empId = (await insUser.run('hr@coppermountain.test', pw, 'employer', 'Marco Diaz', 'Copper Mountain Builders')).lastInsertRowid;
  const jobDefs = [
    ['Commercial Plumber','plumber',40,46,'Phoenix','85008','Day','license','Commercial service & repipes. Journeyman card required.'],
    ['Structural Welder','welder',38,46,'Phoenix','85008','4x10','osha10','Structural steel for commercial builds. FCAW/SMAW.'],
    ['Solar Installer','solar',30,38,'Tempe','85281','Day','osha10','Rooftop PV installs across the East Valley.'],
    ['Equipment Driver (CDL)','cdl_driver',28,34,'Phoenix','85004','Day','cdl','Material delivery between yard and job sites.'],
    ['Pipefitter','pipefitter',40,48,'Phoenix','85008','Day','osha30','Industrial process piping; some welding a plus.'],
  ];
  for (const j of jobDefs) await insJob.run(empId, ...j);

  // [email, name, trade, yrs, city, zip, floor, shift, creds[[kind,verified,exp]]]
  const workers = [
    ['tasha@rivet.test','Tasha Brooks','plumber',7,'Phoenix','85008',38,'Day',
      [['license',1,'2027-09'],['osha10',1,'2026-12']]],
    ['omar@rivet.test','Omar Haddad','welder',9,'Phoenix','85008',40,'4x10',
      [['osha30',1,'2027-04'],['forklift',1,'2028-02']]],
    ['nina@rivet.test','Nina Castillo','solar',4,'Tempe','85281',30,'Day',
      [['osha10',1,'2027-07']]],
    ['will@rivet.test','Will Torres','cdl_driver',5,'Phoenix','85004',27,'Day',
      [['cdl',1,'2028-06']]],
    ['sam@rivet.test','Sam Okafor','pipefitter',6,'Phoenix','85008',39,'Day',
      [['osha30',1,'2027-02'],['osha10',1,'2027-02']]],
  ];
  for (const [email,name,trade,yrs,city,zip,floor,shift,creds] of workers) {
    const uid = (await insUser.run(email, pw, 'worker', name, null)).lastInsertRowid;
    await insProf.run(uid, trade, yrs, city, zip, floor, shift, `${yrs}-year ${trade} based in ${city}.`);
    for (const [kind, ver, exp] of creds) {
      await insCred.run(uid, kind, CRED_KINDS[kind] || kind, ver, exp);
    }
    await recomputeReadiness(uid);
  }

  console.log('[db] enriched demo data — +1 employer, +5 jobs, +5 workers across more trades');
}

async function metaGet(k){ const r = await db.prepare('SELECT v FROM meta WHERE k=?').get(k); return r ? r.v : null; }
async function metaSet(k,v){ await db.prepare('INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k, String(v)); }

// ---- realism pass: backdated pipeline activity + a live conversation (idempotent via meta flag) ----
async function seedRealism(){
  if (await metaGet('realism_v1')) return;
  const { scoreMatch } = require('./matching');
  const emp = await db.prepare("SELECT id FROM users WHERE email='ops@sunvalley.test'").get();
  if (!emp) { await metaSet('realism_v1','1'); return; }
  const jobByTitle = {};
  for (const j of await db.prepare('SELECT * FROM jobs WHERE employer_id=?').all(emp.id)) jobByTitle[j.title] = j;
  const wId = async (email) => { const u = await db.prepare('SELECT id FROM users WHERE email=?').get(email); return u && u.id; };

  // backdated applications across stages so the funnel + activity look alive
  const appsToAdd = [
    ['Andre Cole','andre@rivet.test','HVAC Service Technician','Hired','-7 days'],
    ['Diego Vega','diego@rivet.test','HVAC Service Technician','Offer','-3 days'],
    ['Lupe Flores','lupe@rivet.test','Maintenance Technician','Screened','-30 hours'],
    ['Andre Cole','andre@rivet.test','Maintenance Technician','Sourced','-5 hours'],
  ];
  for (const [, email, title, stage, when] of appsToAdd){
    const job = jobByTitle[title]; const uid = await wId(email);
    if (!job || !uid) continue;
    const prof = await db.prepare('SELECT * FROM worker_profiles WHERE user_id=?').get(uid);
    const creds = await db.prepare('SELECT * FROM credentials WHERE user_id=?').all(uid);
    const { score } = scoreMatch(prof, creds, job);
    try {
      await db.prepare(`INSERT INTO applications(job_id,worker_id,stage,score,created_at)
        VALUES(?,?,?,?,datetime('now',?))`).run(job.id, uid, stage, score, when);
    } catch(e){}
  }

  // a pre-seeded conversation so the inbox isn't empty in the demo (marked read)
  const andre = await wId('andre@rivet.test');
  if (andre){
    const convo = [
      [emp.id, andre, 'Hi Andre — your HVAC card looks strong. Are you open to a light-commercial service role?', '-2 days'],
      [andre, emp.id, 'Yes! I hold EPA 608 and OSHA 10. Days work best for me — what does it pay?', '-44 hours'],
      [emp.id, andre, 'Great fit. $36–44/hr DOE. I just moved you to the pipeline — let’s set up a call.', '-40 hours'],
    ];
    for (const [from, to, body, when] of convo){
      try {
        await db.prepare(`INSERT INTO messages(from_id,to_id,body,read_at,created_at)
          VALUES(?,?,?,datetime('now',?),datetime('now',?))`).run(from, to, body, when, when);
      } catch(e){}
    }
  }

  await metaSet('realism_v1','1');
  console.log('[db] realism pass applied — backdated pipeline activity + sample conversation');
}

// ---- demo media: portfolio pieces + job photos (idempotent) ----
async function seedMedia(){
  if (await metaGet('media_v1')) return;
  const wId = async (email) => { const u = await db.prepare('SELECT id FROM users WHERE email=?').get(email); return u && u.id; };
  const img = (seed) => `https://picsum.photos/seed/${seed}/640/420`;
  const portfolio = [
    ['marcus@rivet.test','rivet-panel','Commercial panel upgrade','480V service, downtown Phoenix fit-out'],
    ['marcus@rivet.test','rivet-conduit','Conduit run — warehouse','EMT runs + lighting circuits'],
    ['andre@rivet.test','rivet-rtu','Rooftop RTU replacement','5-ton unit swap, light commercial'],
    ['kim@rivet.test','rivet-switchgear','Switchgear install','Tenant improvement project'],
  ];
  for (const [email, seed, title, caption] of portfolio){
    const uid = await wId(email); if(!uid) continue;
    try { await db.prepare("INSERT INTO media(user_id,target,kind,url,title,caption) VALUES(?,'portfolio','image',?,?,?)").run(uid, img(seed), title, caption); } catch(e){}
  }
  const emp = await db.prepare("SELECT id FROM users WHERE email='ops@sunvalley.test'").get();
  if (emp){
    const jobPhotos = [
      ['Commercial Electrician','crew-panelroom','Panel room — scope','Existing gear to be replaced'],
      ['HVAC Service Technician','crew-rooftop','Rooftop units','3 RTUs needing service'],
    ];
    for (const [title, seed, mt, mc] of jobPhotos){
      const job = await db.prepare('SELECT id FROM jobs WHERE employer_id=? AND title=?').get(emp.id, title);
      if(!job) continue;
      try { await db.prepare("INSERT INTO media(user_id,target,job_id,kind,url,title,caption) VALUES(?,'job',?,'image',?,?,?)").run(emp.id, job.id, img(seed), mt, mc); } catch(e){}
    }
  }
  await metaSet('media_v1','1');
  console.log('[db] demo media seeded — portfolio pieces + job photos');
}

// ---- richer portfolios: more pieces across more workers + a sample video (idempotent) ----
async function seedMedia2(){
  if (await metaGet('media_v2')) return;
  const wId = async (email) => { const u = await db.prepare('SELECT id FROM users WHERE email=?').get(email); return u && u.id; };
  const img = (seed) => `https://picsum.photos/seed/${seed}/640/420`;
  const pieces = [
    ['marcus@rivet.test','image',img('rivet-solar1'),'Rooftop PV array','24-panel commercial install, East Valley'],
    ['marcus@rivet.test','video','https://www.youtube.com/watch?v=dQw4w9WgXcQ','Walkthrough: service upgrade','Short site walkthrough'],
    ['andre@rivet.test','image',img('rivet-split'),'Mini-split install','Multi-zone, light commercial'],
    ['andre@rivet.test','image',img('rivet-ducts'),'Duct fabrication','Sheet-metal trunk line'],
    ['tasha@rivet.test','image',img('rivet-repipe'),'Commercial repipe','Copper repipe, retail TI'],
    ['tasha@rivet.test','image',img('rivet-fixtures'),'Fixture rough-in','Restroom block, ground-up'],
    ['omar@rivet.test','image',img('rivet-weld1'),'Structural steel','Moment connections, FCAW'],
    ['omar@rivet.test','image',img('rivet-weld2'),'Pipe weld — stainless','TIG root, sanitary line'],
    ['will@rivet.test','image',img('rivet-loader'),'Site material run','Loader + flatbed delivery'],
    ['nina@rivet.test','image',img('rivet-pv2'),'Ground-mount PV','Inverter commissioning'],
  ];
  for (const [email, kind, url, title, caption] of pieces){
    const uid = await wId(email); if(!uid) continue;
    try { await db.prepare("INSERT INTO media(user_id,target,kind,url,title,caption) VALUES(?,'portfolio',?,?,?,?)").run(uid, kind, url, title, caption); } catch(e){}
  }
  await metaSet('media_v2','1');
  console.log('[db] richer portfolio media seeded');
}

// ---- demo work history + multi-trade + headlines/about (idempotent) ----
async function seedExperience(){
  if (await metaGet('experience_v1')) return;
  const wId = async (email) => { const u = await db.prepare('SELECT id FROM users WHERE email=?').get(email); return u && u.id; };
  // [email, tradesCsv, headline, about]
  const profiles = [
    ['marcus@rivet.test','electrician,solar,low_voltage','Journeyman electrician — commercial & solar','15 years running commercial fit-outs, service upgrades, and rooftop PV across the Valley. OSHA-30, clean record, lead-ready.'],
    ['andre@rivet.test','hvac,controls','HVAC service tech — light commercial & controls','EPA 608 Universal. RTUs, splits, and building controls. Days preferred, available now.'],
    ['tasha@rivet.test','plumber,pipefitter','Journeyman plumber — commercial repipes','Commercial service, repipes, and process piping. Journeyman card + OSHA 10.'],
    ['omar@rivet.test','welder,pipefitter,ironworker','Structural & pipe welder — FCAW/SMAW/TIG','9 years structural steel and process piping. AWS-tested, comfortable at height.'],
    ['will@rivet.test','cdl_driver,heavy_equipment','CDL driver & equipment operator','Class A CDL. Material delivery, skid steer, and loader experience.'],
  ];
  for (const [email, trades, headline, about] of profiles){
    const uid = await wId(email); if(!uid) continue;
    const first = trades.split(',')[0];
    try { await db.prepare('UPDATE worker_profiles SET trades=?, headline=?, about=?, trade=? WHERE user_id=?').run(trades, headline, about, first, uid); } catch(e){}
  }
  // [email, employer, role, trade, city, start_year, end_year(null=current), description]
  const history = [
    ['marcus@rivet.test','Copper Mountain Builders','Lead Electrician','electrician','Phoenix',2019,null,'Run crews of 4–6 on commercial fit-outs and service upgrades; pull permits and coordinate inspections.'],
    ['marcus@rivet.test','SunRay Solar','Solar Installer','solar','Tempe',2016,2019,'Rooftop and ground-mount PV installs; string sizing and inverter commissioning.'],
    ['marcus@rivet.test','Apprenticeship — IEC','Apprentice Electrician','electrician','Phoenix',2012,2016,'Completed 4-year apprenticeship; residential and light commercial.'],
    ['andre@rivet.test','Sun Valley Facilities','HVAC Service Technician','hvac','Phoenix',2020,null,'Service and repair RTUs, splits, and chillers for light-commercial accounts.'],
    ['andre@rivet.test','Desert Air Mechanical','HVAC Installer','hvac','Mesa',2017,2020,'New-construction installs and changeouts; brazing and startup.'],
    ['tasha@rivet.test','Valley Plumbing Co.','Journeyman Plumber','plumber','Phoenix',2018,null,'Commercial service, repipes, and fixture rough-in.'],
    ['tasha@rivet.test','Industrial Piping LLC','Pipefitter','pipefitter','Phoenix',2015,2018,'Process piping for food & beverage plants.'],
    ['omar@rivet.test','Steelworks AZ','Structural Welder','welder','Phoenix',2018,null,'Structural steel for commercial builds; FCAW and SMAW, certified.'],
    ['omar@rivet.test','Phoenix Pipe & Fab','Pipe Welder','pipefitter','Phoenix',2015,2018,'TIG/SMAW on carbon and stainless process lines.'],
    ['will@rivet.test','Copper Mountain Builders','CDL Driver','cdl_driver','Phoenix',2021,null,'Material delivery between yard and active job sites.'],
  ];
  for (const [email, employer, role, trade, city, sy, ey, desc] of history){
    const uid = await wId(email); if(!uid) continue;
    try {
      await db.prepare(`INSERT INTO work_history(user_id,employer,role,trade,city,start_year,end_year,current,description)
        VALUES(?,?,?,?,?,?,?,?,?)`).run(uid, employer, role, trade, city, sy, ey, ey?0:1, desc);
    } catch(e){}
  }
  await metaSet('experience_v1','1');
  console.log('[db] demo work history + multi-trade profiles seeded');
}

// ---- give demo jobs varied employment types (idempotent) ----
async function seedJobTypes(){
  if (await metaGet('jobtypes_v1')) return;
  const map = {
    'Solar Installer':'Contract',
    'Equipment Driver (CDL)':'Temp',
    'Pipefitter':'Contract',
    'Structural Welder':'Outcome-based',
  };
  for (const [title, type] of Object.entries(map)){
    try { await db.prepare('UPDATE jobs SET employment_type=? WHERE title=?').run(type, title); } catch(e){}
  }
  await metaSet('jobtypes_v1','1');
  console.log('[db] demo job employment types seeded');
}

// ---- demo company profiles (idempotent) ----
async function seedCompanies(){
  if (await metaGet('company_v1')) return;
  const rows = [
    ['ops@sunvalley.test','Sun Valley Mechanical','Phoenix, AZ','51–200','https://example.com/sunvalley',
      'Commercial HVAC and electrical contractor serving the Phoenix metro since 2004. We run union and merit crews, pay weekly, and promote from within — most of our foremen started as apprentices here.'],
    ['hr@coppermountain.test','Copper Mountain Builders','Phoenix, AZ','201–500','https://example.com/coppermountain',
      'Ground-up commercial and industrial general contractor. Steady pipeline of work across the Valley, strong safety record, and a real apprenticeship-to-journeyman track.'],
  ];
  for (const [email,name,city,size,site,about] of rows){
    try { await db.prepare('UPDATE users SET company=?,company_city=?,company_size=?,company_website=?,company_about=? WHERE email=?')
      .run(name, city, size, site, about, email); } catch(e){}
  }
  await metaSet('company_v1','1');
  console.log('[db] demo company profiles seeded');
}

// ---- BIG realistic seed: many workers + jobs across US cities so it looks populated (idempotent) ----
async function seedBig(){
  if (await metaGet('bigseed_v1')) return;
  const { CRED_KINDS } = require('./matching');
  const pw = hashPassword('demo1234');

  // city zips with coordinates so maps + distance work nationwide
  const cities = [
    ['77002',29.7589,-95.3677,'Houston'],['75201',32.7876,-96.7990,'Dallas'],['78701',30.2711,-97.7437,'Austin'],
    ['78205',29.4252,-98.4946,'San Antonio'],['80202',39.7525,-104.9995,'Denver'],['30303',33.7525,-84.3896,'Atlanta'],
    ['60601',41.8855,-87.6221,'Chicago'],['89101',36.1716,-115.1391,'Las Vegas'],['90012',34.0614,-118.2385,'Los Angeles'],
    ['98101',47.6109,-122.3340,'Seattle'],['33130',25.7677,-80.1976,'Miami'],['37203',36.1512,-86.7905,'Nashville'],
    ['28202',35.2271,-80.8431,'Charlotte'],['78216',29.5180,-98.4920,'San Antonio'],['43215',39.9612,-82.9988,'Columbus'],
    ['64106',39.1010,-94.5780,'Kansas City'],['84101',40.7608,-111.8910,'Salt Lake City'],['97204',45.5183,-122.6750,'Portland'],
    ['33602',27.9506,-82.4572,'Tampa'],['55401',44.9850,-93.2690,'Minneapolis'],['48226',42.3314,-83.0458,'Detroit'],
  ];
  for (const [zip,lat,lon,city] of cities){
    try { await db.prepare('INSERT OR IGNORE INTO zip_geo(zip,lat,lon,city) VALUES(?,?,?,?)').run(zip,lat,lon,city); } catch(e){}
  }

  // a few more employers in different metros, each with a company profile
  const insEmp = db.prepare('INSERT INTO users(email,pass,role,name,company,company_city,company_size,company_about) VALUES(?,?,?,?,?,?,?,?)');
  const employers = [
    ['hr@lonestarmech.test','Bianca Reyes','Lone Star Mechanical','Houston, TX','201–500','Industrial mechanical and process-piping contractor across the Gulf Coast. Per-diem on travel jobs, weekly pay.'],
    ['ops@summitelectric.test','Grant Holloway','Summit Electric','Denver, CO','51–200','Commercial electrical and solar across the Front Range. Strong apprenticeship program and year-round work.'],
    ['talent@peachstatebuild.test','Dana Wills','Peach State Builders','Atlanta, GA','500+','Ground-up commercial GC in the Southeast. Multiple active sites, real advancement, safety-first culture.'],
    ['crew@pacifictrades.test','Hiro Tanaka','Pacific Trades Group','Seattle, WA','51–200','Mechanical and sheet-metal specialists for data centers and hospitals. Premium pay for certified techs.'],
  ];
  const empIds = {};
  for (const [email,name,co,city,size,about] of employers){
    try { empIds[email] = (await insEmp.run(email,pw,'employer',name,co,city,size,about)).lastInsertRowid; } catch(e){}
  }

  // jobs across metros
  const insJob = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type) VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
  const jobs = [
    ['hr@lonestarmech.test','Industrial Pipefitter','pipefitter',38,48,'Houston','77002','Day','osha30','Refinery turnaround — process piping, some travel.','Contract'],
    ['hr@lonestarmech.test','Structural Welder','welder',40,52,'Houston','77002','4x10','aws_welding','6G certified welders for vessel work.','Contract'],
    ['hr@lonestarmech.test','Millwright','millwright',36,46,'Houston','77002','Day','osha10','Rotating equipment install + alignment.','Full-time'],
    ['ops@summitelectric.test','Commercial Electrician','electrician',34,46,'Denver','80202','Day','license','TI and ground-up commercial. Journeyman card required.','Full-time'],
    ['ops@summitelectric.test','Solar Installer','solar',28,38,'Denver','80202','Day','osha10','Rooftop + ground-mount PV across the Front Range.','Full-time'],
    ['ops@summitelectric.test','Low-Voltage Tech','low_voltage',26,34,'Denver','80202','Day','','Structured cabling, access control, AV.','Full-time'],
    ['talent@peachstatebuild.test','Concrete Finisher','concrete',26,34,'Atlanta','30303','Day','osha10','Flatwork and tilt-up on commercial sites.','Full-time'],
    ['talent@peachstatebuild.test','Carpenter','carpenter',28,38,'Atlanta','30303','Day','','Form work and rough framing, ground-up.','Full-time'],
    ['talent@peachstatebuild.test','Heavy Equipment Operator','heavy_equipment',30,42,'Atlanta','30303','Day','','Excavator and dozer on sitework.','Full-time'],
    ['crew@pacifictrades.test','HVAC Installer','hvac',34,46,'Seattle','98101','Day','epa608','Data-center mechanical installs.','Full-time'],
    ['crew@pacifictrades.test','Sheet Metal Worker','sheet_metal',32,44,'Seattle','98101','Day','osha10','Duct fabrication and install.','Full-time'],
    ['crew@pacifictrades.test','Controls Technician','controls',38,50,'Seattle','98101','Day','','Building automation + controls commissioning.','Full-time'],
  ];
  for (const [email,title,trade,lo,hi,city,zip,shift,creds,descr,etype] of jobs){
    const eid = empIds[email]; if(!eid) continue;
    try { await insJob.run(eid,title,trade,lo,hi,city,zip,shift,creds,descr,etype); } catch(e){}
  }

  // many workers across metros (multi-trade where natural)
  const insUser = db.prepare('INSERT INTO users(email,pass,role,name,phone) VALUES(?,?,?,?,?)');
  const insProf = db.prepare(`INSERT INTO worker_profiles(user_id,trade,trades,headline,about,years_exp,city,zip,pay_floor,shift,available,work_today,relocate,alerts) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insCred = db.prepare('INSERT INTO credentials(user_id,kind,name,verified,expires) VALUES(?,?,?,?,?)');
  const insWH   = db.prepare(`INSERT INTO work_history(user_id,employer,role,trade,city,start_year,end_year,current,description) VALUES(?,?,?,?,?,?,?,?,?)`);
  // [name, tradesCsv, yrs, city, zip, floor, shift, avail, today, relo, creds[[k,exp]], headline]
  const W = [
    ['Marisol Vega','electrician,solar',8,'Houston','77002',36,'Day',1,0,1,[['license','2027-05'],['osha30','2027-01']],'Journeyman electrician — commercial & solar'],
    ['DeShawn Carter','welder,pipefitter',11,'Houston','77002',42,'4x10',1,1,1,[['aws_welding','2028-03'],['osha30','2027-08']],'6G pipe & structural welder'],
    ['Tony Marchetti','pipefitter',14,'Houston','77002',44,'Day',1,0,0,[['osha30','2027-02']],'Industrial pipefitter — refinery turnarounds'],
    ['Priya Nair','hvac,controls',7,'Dallas','75201',34,'Day',1,0,1,[['epa608','2027-06'],['nate','2027-06']],'HVAC + building controls technician'],
    ['Cody Burnett','carpenter,framer',9,'Dallas','75201',30,'Day',1,1,0,[['osha10','2026-12']],'Commercial carpenter & framer'],
    ['Aaliyah Brooks','electrician',6,'Austin','78701',33,'Day',1,0,1,[['license','2028-01']],'Commercial electrician'],
    ['Mateo Guerra','concrete,mason',12,'San Antonio','78205',28,'Day',1,1,0,[['osha10','2027-04']],'Concrete finisher & mason'],
    ['Hannah Lunderberg','solar,low_voltage',5,'Denver','80202',30,'Day',1,0,1,[['osha10','2027-09']],'Solar + low-voltage installer'],
    ['Grady Olsen','electrician,low_voltage',10,'Denver','80202',38,'Day',1,0,0,[['license','2027-07'],['nfpa70e','2027-07']],'Master electrician — controls & power'],
    ['Tasha Greenwood','hvac',4,'Atlanta','30303',29,'Day',1,1,1,[['epa608','2028-02']],'HVAC service tech'],
    ['Marcus Bell','heavy_equipment,cdl_driver',13,'Atlanta','30303',32,'Day',1,0,0,[['cdl','2028-06']],'Operator & CDL driver'],
    ['Lena Kowalski','carpenter',8,'Chicago','60601',31,'Day',1,0,1,[['osha30','2027-03']],'Finish & commercial carpenter'],
    ['Reggie Daniels','ironworker,welder',15,'Chicago','60601',40,'4x10',1,0,0,[['aws_welding','2027-11'],['osha30','2027-11']],'Structural ironworker'],
    ['Sofia Reyes','plumber,pipefitter',9,'Las Vegas','89101',35,'Day',1,1,1,[['license','2027-10']],'Commercial plumber'],
    ['Brandon Pike','sheet_metal,hvac',7,'Las Vegas','89101',33,'Day',1,0,0,[['osha10','2027-05']],'Sheet metal & HVAC'],
    ['Yusuf Ahmed','electrician',6,'Los Angeles','90012',37,'Day',1,0,1,[['license','2028-04']],'Commercial electrician'],
    ['Camila Torres','painter,drywall',5,'Los Angeles','90012',26,'Day',1,1,0,[['osha10','2026-11']],'Drywall finisher & painter'],
    ['Erik Nyland','hvac,controls',12,'Seattle','98101',40,'Day',1,0,1,[['epa608','2027-12'],['nate','2027-12']],'Senior HVAC + controls tech'],
    ['Nadia Petrov','sheet_metal',8,'Seattle','98101',35,'Day',1,0,0,[['osha10','2027-06']],'Sheet metal journeyman'],
    ['Caleb Foster','welder',6,'Nashville','37203',34,'4x10',1,1,1,[['aws_welding','2027-09']],'Structural welder'],
    ['Imani Wright','electrician,solar',9,'Charlotte','28202',36,'Day',1,0,1,[['license','2027-08'],['osha10','2027-08']],'Electrician — commercial & PV'],
    ['Diego Salazar','plumber',11,'Tampa','33602',34,'Day',1,0,0,[['license','2027-03'],['backflow','2027-03']],'Master plumber'],
    ['Holly Bergstrom','carpenter,framer',7,'Minneapolis','55401',31,'Day',1,1,1,[['osha10','2027-07']],'Carpenter & framer'],
    ['Andre Lewis','diesel_mechanic,heavy_equipment',10,'Detroit','48226',33,'Day',1,0,0,[['ase','2028-01']],'Diesel mechanic & operator'],
  ];
  for (const [name,trades,yrs,city,zip,floor,shift,avail,today,relo,creds,headline] of W){
    const email = name.toLowerCase().replace(/[^a-z]+/g,'.')+'@rivet.test';
    let uid; try { uid = (await insUser.run(email,pw,'worker',name,null)).lastInsertRowid; } catch(e){ continue; }
    const first = trades.split(',')[0];
    const about = `${yrs}-year ${first.replace(/_/g,' ')} based in ${city}. Reliable, safety-first, and ready to start.`;
    try { await insProf.run(uid,first,trades,headline,about,yrs,city,zip,floor,shift,avail,today,relo,1); } catch(e){ continue; }
    for (const [k,exp] of creds){ try { await insCred.run(uid,k,CRED_KINDS[k]||k,1,exp); } catch(e){} }
    try { await insWH.run(uid,`${city} Trades Co.`,headline.split('—')[0].trim(),first,city,2026-Math.min(yrs,12),null,1,`Lead ${first.replace(/_/g,' ')} work across ${city}.`); } catch(e){}
    try { await recomputeReadiness(uid); } catch(e){}
  }
  await metaSet('bigseed_v1','1');
  console.log('[db] BIG seed applied — +4 employers, +12 jobs, +24 workers across US metros');
}

// ---- broaden beyond construction: healthcare, ag, food, logistics, cleaning, security (idempotent) ----
async function seedCategories(){
  if (await metaGet('categories_v1')) return;
  const pw = hashPassword('demo1234');
  const insEmp = db.prepare('INSERT INTO users(email,pass,role,name,company,company_city,company_size,company_about) VALUES(?,?,?,?,?,?,?,?)');
  const employers = [
    ['staffing@valleycare.test','Renee Park','Valley Care Staffing','Phoenix, AZ','201–500','Healthcare staffing for clinics, hospitals and home care across Arizona. Weekly pay, flexible shifts, real advancement into nursing.'],
    ['jobs@sunorchards.test','Hector Ramos','Sun Orchards','Fresno, CA','500+','Family-run citrus and stone-fruit grower. Seasonal and year-round crews, housing assistance, safe transport to fields.'],
    ['hr@mesarestaurants.test','Dana Cho','Mesa Restaurant Group','Las Vegas, NV','201–500','12 restaurants across the valley. Cooks, servers and bar staff — paid training, shift meals, fast promotion.'],
    ['ops@swiftlogistics.test','Marcus Lin','Swift Logistics','Dallas, TX','500+','Regional warehousing and last-mile delivery. Climate-controlled DCs, predictable schedules, sign-on bonus.'],
    ['careers@shieldsafe.test','Tasha Owens','ShieldSafe Security','Atlanta, GA','201–500','Licensed guard services for commercial and event sites. Paid guard-card training and uniforms provided.'],
  ];
  const eid = {};
  for (const [email,name,co,city,size,about] of employers){
    try { eid[email] = (await insEmp.run(email,pw,'employer',name,co,city,size,about)).lastInsertRowid; } catch(e){}
  }
  const insJob = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type) VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
  const jobs = [
    ['staffing@valleycare.test','Certified Nursing Assistant (CNA)','cna',20,27,'Phoenix','85004','Day','cna_cert','Long-term care facility, day and noc shifts. CNA cert + BLS required.','Full-time'],
    ['staffing@valleycare.test','Home Health Aide','caregiver',18,23,'Phoenix','85008','Day','hha','In-home care for seniors; mileage reimbursed. HHA cert a plus.','Part-time'],
    ['staffing@valleycare.test','Medical Assistant','medical_assistant',19,25,'Phoenix','85021','Day','bls','Front + back office MA for a busy clinic.','Full-time'],
    ['staffing@valleycare.test','Phlebotomist','phlebotomist',19,24,'Phoenix','85004','Day','bls','Outpatient draws; high volume. Certification required.','Full-time'],
    ['jobs@sunorchards.test','Fruit Picker — Citrus','fruit_picker',16,21,'Phoenix','85008','Day','','Seasonal harvest crews; piece-rate bonuses. Transport provided.','Temp'],
    ['jobs@sunorchards.test','Farm Laborer','farmworker',16,20,'Phoenix','85021','Day','','Irrigation, pruning and harvest support. Year-round.','Full-time'],
    ['hr@mesarestaurants.test','Line Cook','cook',18,24,'Las Vegas','89101','Night','food_handler','High-volume kitchen; grill and saute stations.','Full-time'],
    ['hr@mesarestaurants.test','Server / Waiter','server',12,12,'Las Vegas','89101','Night','food_handler','Tipped position (avg $28+/hr with tips). Food handler card required.','Part-time'],
    ['hr@mesarestaurants.test','Dishwasher','dishwasher',15,18,'Las Vegas','89101','Night','','Back of house; reliable hours, shift meals.','Part-time'],
    ['hr@mesarestaurants.test','Bartender','bartender',14,16,'Las Vegas','89101','Night','servsafe','Craft cocktail bar; tips on top. ServSafe alcohol a plus.','Full-time'],
    ['ops@swiftlogistics.test','Warehouse Associate','warehouse',18,23,'Dallas','75201','Day','forklift','Pick/pack/ship; forklift cert a plus. Sign-on bonus.','Full-time'],
    ['ops@swiftlogistics.test','Delivery Driver (non-CDL)','delivery_driver',20,26,'Dallas','75201','Day','','Last-mile box truck routes; home daily.','Full-time'],
    ['ops@swiftlogistics.test','Mover / Furniture','mover',18,24,'Dallas','75201','Day','','Residential + commercial moves. Lift 50+ lbs.','Full-time'],
    ['careers@shieldsafe.test','Security Guard','security_guard',17,22,'Atlanta','30303','Any','guard_card','Commercial site patrol; guard card training provided.','Full-time'],
    ['careers@shieldsafe.test','Janitor / Custodian','janitor',16,20,'Atlanta','30303','Night','','Nightly commercial cleaning routes.','Full-time'],
  ];
  for (const [email,title,trade,lo,hi,city,zip,shift,creds,descr,etype] of jobs){
    const id = eid[email]; if(!id) continue;
    try { await insJob.run(id,title,trade,lo,hi,city,zip,shift,creds,descr,etype); } catch(e){}
  }
  // a few workers in the new categories so talent search/maps look real
  const insUser = db.prepare('INSERT INTO users(email,pass,role,name) VALUES(?,?,?,?)');
  const insProf = db.prepare(`INSERT INTO worker_profiles(user_id,trade,trades,headline,about,years_exp,city,zip,pay_floor,shift,available,work_today,relocate,alerts) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insCred = db.prepare('INSERT INTO credentials(user_id,kind,name,verified,expires) VALUES(?,?,?,?,?)');
  const { CRED_KINDS } = require('./matching');
  const W = [
    ['Gloria Mendez','cna,caregiver',6,'Phoenix','85004',22,'Day',[['cna_cert','2027-09'],['bls','2027-01']],'CNA + caregiver — long-term care'],
    ['Luis Fuentes','fruit_picker,farmworker',9,'Phoenix','85008',17,'Day',[],'Harvest crew lead — citrus & stone fruit'],
    ['Mina Patel','cook,server',5,'Las Vegas','89101',18,'Night',[['food_handler','2027-05']],'Line cook — high volume'],
    ['Trey Jackson','warehouse,mover',4,'Dallas','75201',19,'Day',[['forklift','2028-02']],'Warehouse + forklift'],
    ['Sandra Webb','security_guard',7,'Atlanta','30303',18,'Any',[['guard_card','2027-11']],'Licensed security officer'],
  ];
  for (const [name,trades,yrs,city,zip,floor,shift,creds,headline] of W){
    const email = name.toLowerCase().replace(/[^a-z]+/g,'.')+'@rivet.test';
    let uid; try { uid = (await insUser.run(email,pw,'worker',name)).lastInsertRowid; } catch(e){ continue; }
    const first = trades.split(',')[0];
    try { await insProf.run(uid,first,trades,headline,`${yrs}-year ${first.replace(/_/g,' ')} in ${city}. Reliable and ready to start.`,yrs,city,zip,floor,shift,1,0,0,1); } catch(e){ continue; }
    for (const [k,exp] of creds){ try { await insCred.run(uid,k,CRED_KINDS[k]||k,1,exp); } catch(e){} }
    try { await recomputeReadiness(uid); } catch(e){}
  }
  await metaSet('categories_v1','1');
  console.log('[db] category expansion seeded — +5 employers, +15 jobs, +5 workers (healthcare/ag/food/logistics/security)');
}

// ---- seed a few community board posts (idempotent) ----
async function seedPosts(){
  if (await metaGet('posts_v1')) return;
  const posts = [
    ['Marcus Lee','electrician','Anyone else seeing data-center work blow up around Phoenix? Three GCs called me this week. Get your OSHA 30 if you don\'t have it — every one of them asked.','-2 days'],
    ['Andre Cole','hvac','EPA 608 Universal paid off big. Light-commercial service pays $6/hr more than resi here. Worth the exam.','-3 days'],
    ['Gloria Mendez','cna','Home health is hiring like crazy and the schedules are flexible. If you have your CNA + BLS you can pick your shifts right now.','-30 hours'],
    ['DeShawn Carter','welder','6G cert is the difference between $28 and $42/hr on pipe work. Travel jobs pay per-diem on top. Don\'t sleep on it.','-5 days'],
    ['Sofia Reyes','plumber','Backflow certification opened up a whole side income for me doing annual tests. Quick class, steady demand.','-12 hours'],
  ];
  for (const [name, trade, body, when] of posts){
    try { await db.prepare(`INSERT INTO posts(author_id,author_name,trade,body,created_at) VALUES(NULL,?,?,?,datetime('now',?))`).run(name, trade, body, when); } catch(e){}
  }
  await metaSet('posts_v1','1');
  console.log('[db] community posts seeded');
}

// ---- local density (Phoenix metro) + gig/ag/food sub-roles (idempotent) ----
async function seedLocalGig(){
  if (await metaGet('localgig_v1')) return;
  const metroZips = [
    ['85225',33.3062,-111.8413,'Chandler'],['85295',33.2826,-111.7890,'Gilbert'],
    ['85281',33.4255,-111.9400,'Tempe'],['85201',33.4361,-111.8344,'Mesa'],
    ['85251',33.4942,-111.9261,'Scottsdale'],['85301',33.5387,-112.1860,'Glendale'],
    ['85308',33.6539,-112.2010,'Glendale'],['85234',33.3528,-111.7890,'Gilbert'],
  ];
  for (const [zip,lat,lon,city] of metroZips){ try { await db.prepare('INSERT OR IGNORE INTO zip_geo(zip,lat,lon,city) VALUES(?,?,?,?)').run(zip,lat,lon,city); } catch(e){} }
  const pw = hashPassword('demo1234');
  const insEmp = db.prepare('INSERT INTO users(email,pass,role,name,company,company_city,company_size,company_about) VALUES(?,?,?,?,?,?,?,?)');
  let eid;
  try { eid = (await insEmp.run('crew@phxmetrolabor.test',pw,'employer','Rosa Aguilar','Phoenix Metro Labor','Phoenix, AZ','51–200','Local staffing for the Phoenix metro — trades, hospitality, warehouse and gig crews. Same-week starts, daily and weekly pay.')).lastInsertRowid; } catch(e){}
  if(!eid) { await metaSet('localgig_v1','1'); return; }
  const insJob = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type) VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
  // dense, local Phoenix-metro openings across trades + new sub-roles
  const J = [
    ['Residential Electrician','electrician',30,40,'Mesa','85201','Day','license','Service + remodels across the East Valley.','Full-time'],
    ['HVAC Install Helper','hvac',22,28,'Chandler','85225','Day','','Ride-along installs; will train toward EPA 608.','Full-time'],
    ['Apprentice Plumber','plumber',20,26,'Gilbert','85295','Day','','Learn the trade with a licensed journeyman.','Apprenticeship'],
    ['Drywall Finisher','drywall',24,30,'Tempe','85281','Day','','Tract homes; steady year-round work.','Full-time'],
    ['Concrete Laborer','concrete',20,26,'Glendale','85301','Day','osha10','Flatwork crews; early starts.','Full-time'],
    ['Landscaper','landscaper',17,22,'Scottsdale','85251','Day','','Commercial grounds maintenance.','Full-time'],
    ['Handyman (1099)','handyman',28,45,'Phoenix','85004','Any','','Pick your jobs — repairs, installs, mounts. Bring your own tools.','Outcome-based'],
    ['Junk Removal Crew','junk_removal',18,24,'Mesa','85201','Day','','Lift + haul; tips on top.','Part-time'],
    ['Pressure Washing Tech','pressure_wash',19,26,'Chandler','85225','Day','','Driveways + storefronts; equipment provided.','Full-time'],
    ['Pool Service Tech','pool_service',20,27,'Gilbert','85295','Day','','Residential route; truck provided.','Full-time'],
    ['Gig Courier','gig_courier',18,28,'Phoenix','85008','Any','','Flexible delivery blocks; use your own vehicle.','Outcome-based'],
    ['Event Setup Crew','event_setup',17,22,'Glendale','85308','Any','','Stadium + convention events; nights/weekends.','Temp'],
    ['Irrigation Technician','irrigation_tech',22,29,'Scottsdale','85251','Day','','Install + repair drip/sprinkler systems.','Full-time'],
    ['Packing / Sorting','packing_shed',16,20,'Phoenix','85021','Night','','Produce packing line; overtime available.','Temp'],
    ['Prep Cook','prep_cook',17,21,'Tempe','85281','Day','food_handler','Scratch kitchen; growth to line cook.','Full-time'],
    ['Host / Hostess','host',16,18,'Scottsdale','85251','Night','','Front of house; tips shared.','Part-time'],
    ['Warehouse Associate','warehouse',19,24,'Phoenix','85008','Day','forklift','Pick/pack; forklift a plus.','Full-time'],
    ['Caregiver (part-time)','caregiver',18,23,'Mesa','85201','Day','hha','In-home senior care; flexible shifts — student-friendly.','Part-time'],
  ];
  for (const [title,trade,lo,hi,city,zip,shift,creds,descr,etype] of J){
    try { await insJob.run(eid,title,trade,lo,hi,city,zip,shift,creds,descr,etype); } catch(e){}
  }
  await metaSet('localgig_v1','1');
  console.log('[db] local metro + gig/ag/food seed applied — +1 employer, +18 local jobs');
}

// ---- external/partner jobs: apply on the source site (idempotent) ----
async function seedExternal(){
  if (await metaGet('external_v1')) return;
  const pw = hashPassword('demo1234');
  let eid;
  try { eid = (await db.prepare('INSERT INTO users(email,pass,role,name,company,company_city,company_about) VALUES(?,?,?,?,?,?,?)')
    .run('feed@rivet.test',pw,'employer','Rivet Job Network','Rivet Job Network','U.S.','Aggregated openings from union halls, government and partner job boards. Apply on the source site.')).lastInsertRowid; } catch(e){}
  if(!eid){ await metaSet('external_v1','1'); return; }
  const insJob = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type,source,apply_url) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  // [title,trade,lo,hi,city,zip,shift,creds,descr,etype,source,apply_url] — apply_url = real search/landing pages
  const X = [
    ['Apprentice Electrician (IBEW)','electrician',22,30,'Chicago','60601','Day','','Union apprenticeship via your local IBEW hall. Apply through the union.','Apprenticeship','IBEW','https://www.ibew.org/Tools/Find-Local-Union'],
    ['Federal Maintenance Mechanic','facilities',24,34,'Denver','80202','Day','','Federal facilities role. Apply on the official USAJOBS portal.','Full-time','USAJOBS','https://www.usajobs.gov/Search/Results?k=maintenance%20mechanic'],
    ['Union Carpenter','carpenter',28,40,'Seattle','98101','Day','osha10','Commercial carpentry through the regional carpenters union.','Full-time','Carpenters Union','https://www.carpenters.org/'],
    ['CDL-A Driver (regional)','cdl_driver',26,34,'Dallas','75201','Day','cdl','Regional routes; multiple carriers hiring now.','Full-time','Indeed','https://www.indeed.com/jobs?q=cdl-a+driver&l=Dallas%2C+TX'],
    ['HVAC Service Technician','hvac',25,36,'Atlanta','30303','Day','epa608','Light-commercial service openings from partner employers.','Full-time','ZipRecruiter','https://www.ziprecruiter.com/Jobs/Hvac-Service-Technician'],
  ];
  for (const r of X){ try { await insJob.run(eid, ...r); } catch(e){} }
  await metaSet('external_v1','1');
  console.log('[db] external/partner jobs seeded — +5 jobs with source apply links');
}

// ---- USAJOBS federal trades feed: real Wage-Grade openings, apply on usajobs.gov (idempotent, no API key) ----
async function seedUsajobs(){
  if (await metaGet('usajobs_v1')) return;
  const eid = (await db.prepare("SELECT id FROM users WHERE email='feed@rivet.test'").get() || {}).id;
  if(!eid){ await metaSet('usajobs_v1','1'); return; }
  // city zips so these map nationwide (add any not already seeded)
  const zips = [
    ['20001',38.9101,-77.0147,'Washington'],['23508',36.8857,-76.3057,'Norfolk'],
    ['96818',21.3469,-157.9389,'Honolulu'],['80045',39.7447,-104.8389,'Aurora'],
    ['78234',29.4600,-98.4400,'San Antonio'],['92134',32.7050,-117.1490,'San Diego'],
  ];
  for(const [zip,lat,lon,city] of zips){ try { await db.prepare('INSERT OR IGNORE INTO zip_geo(zip,lat,lon,city) VALUES(?,?,?,?)').run(zip,lat,lon,city); } catch(e){} }
  const insJob = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type,source,apply_url) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const search = (k,l) => `https://www.usajobs.gov/Search/Results?k=${encodeURIComponent(k)}&l=${encodeURIComponent(l)}&hp=public`;
  // [title, trade, lo, hi, city, zip, shift, creds, descr, etype, keyword, location]
  const F = [
    ['Maintenance Mechanic (WG-4749)','facilities',26,36,'Washington','20001','Day','','Federal facility maintenance — mechanical, plumbing and light electrical. Federal benefits.','Full-time','maintenance mechanic','Washington, DC'],
    ['Electrician (WG-2805)','electrician',32,44,'San Diego','92134','Day','license','Navy base electrical install and repair. Journeyman-level Wage Grade role.','Full-time','electrician','San Diego, CA'],
    ['Pipefitter / Plumber (WG-4206)','plumber',30,42,'Norfolk','23508','Day','','Shipyard piping systems install and repair. Federal apprenticeship-to-journeyman track.','Full-time','pipefitter','Norfolk, VA'],
    ['HVAC Mechanic (WG-5306)','hvac',30,42,'Aurora','80045','Day','epa608','Air-conditioning equipment mechanic at a federal medical center.','Full-time','air conditioning equipment mechanic','Aurora, CO'],
    ['Welder (WG-3703)','welder',31,43,'Norfolk','23508','4x10','aws_welding','Shipyard structural and pipe welding. 6G a plus.','Full-time','welder','Norfolk, VA'],
    ['Carpenter (WG-4607)','carpenter',28,38,'Honolulu','96818','Day','','Air Force base carpentry — repair, forming and finish work.','Full-time','carpenter','Honolulu, HI'],
    ['Heavy Mobile Equipment Mechanic (WG-5803)','diesel_mechanic',30,42,'San Antonio','78234','Day','','Army installation heavy-equipment and diesel repair.','Full-time','heavy mobile equipment mechanic','San Antonio, TX'],
    ['Motor Vehicle Operator (WG-5703)','cdl_driver',24,33,'Washington','20001','Day','cdl','Federal CDL driving and material transport. Class A required.','Full-time','motor vehicle operator','Washington, DC'],
  ];
  for(const [title,trade,lo,hi,city,zip,shift,creds,descr,etype,k,l] of F){
    try { await insJob.run(eid,title,trade,lo,hi,city,zip,shift,creds,descr,etype,'USAJOBS',search(k,l)); } catch(e){}
  }
  await metaSet('usajobs_v1','1');
  console.log('[db] USAJOBS federal trades feed seeded — +8 Wage-Grade jobs linking to usajobs.gov');
}

// ---- deeper backdated activity for the demo employer so analytics/charts look alive (idempotent) ----
async function seedActivity2(){
  if (await metaGet('activity_v2')) return;
  const { scoreMatch } = require('./matching');
  const emp = await db.prepare("SELECT id FROM users WHERE email='ops@sunvalley.test'").get();
  if(!emp){ await metaSet('activity_v2','1'); return; }
  const jobs = await db.prepare('SELECT * FROM jobs WHERE employer_id=?').all(emp.id);
  if(!jobs.length){ await metaSet('activity_v2','1'); return; }
  const jobByTitle = {}; for(const j of jobs) jobByTitle[j.title] = j;
  const wId = async (email) => { const u = await db.prepare('SELECT id FROM users WHERE email=?').get(email); return u && u.id; };
  // a rotating pool of seeded workers that exist across the big/category seeds
  const pool = ['marcus@rivet.test','kim@rivet.test','ray@rivet.test','diego@rivet.test','lupe@rivet.test','andre@rivet.test',
    'marisol.vega@rivet.test','aaliyah.brooks@rivet.test','yusuf.ahmed@rivet.test','grady.olsen@rivet.test',
    'imani.wright@rivet.test','priya.nair@rivet.test','erik.nyland@rivet.test','brandon.pike@rivet.test'];
  // spread ~26 applications over the last 8 weeks across stages so the over-time + funnel charts are rich
  // [workerEmail, jobTitle, stage, when]
  const rows = [
    ['marisol.vega@rivet.test','Commercial Electrician','Hired','-54 days'],
    ['kim@rivet.test','Commercial Electrician','Hired','-47 days'],
    ['yusuf.ahmed@rivet.test','Commercial Electrician','Offer','-12 days'],
    ['aaliyah.brooks@rivet.test','Commercial Electrician','Interview','-9 days'],
    ['grady.olsen@rivet.test','Commercial Electrician','Interview','-6 days'],
    ['imani.wright@rivet.test','Commercial Electrician','Screened','-4 days'],
    ['ray@rivet.test','Commercial Electrician','Screened','-2 days'],
    ['marcus@rivet.test','Commercial Electrician','Sourced','-30 hours'],
    ['andre@rivet.test','HVAC Service Technician','Hired','-49 days'],
    ['priya.nair@rivet.test','HVAC Service Technician','Offer','-15 days'],
    ['erik.nyland@rivet.test','HVAC Service Technician','Interview','-11 days'],
    ['brandon.pike@rivet.test','HVAC Service Technician','Screened','-7 days'],
    ['diego@rivet.test','HVAC Service Technician','Screened','-3 days'],
    ['lupe@rivet.test','HVAC Service Technician','Sourced','-20 hours'],
    ['ray@rivet.test','Controls Technician','Hired','-40 days'],
    ['grady.olsen@rivet.test','Controls Technician','Interview','-18 days'],
    ['erik.nyland@rivet.test','Controls Technician','Interview','-10 days'],
    ['priya.nair@rivet.test','Controls Technician','Screened','-5 days'],
    ['kim@rivet.test','Controls Technician','Sourced','-2 days'],
    ['diego@rivet.test','Maintenance Technician','Offer','-22 days'],
    ['lupe@rivet.test','Maintenance Technician','Interview','-16 days'],
    ['andre@rivet.test','Maintenance Technician','Screened','-8 days'],
    ['brandon.pike@rivet.test','Maintenance Technician','Sourced','-3 days'],
    ['marisol.vega@rivet.test','Maintenance Technician','Sourced','-1 days'],
  ];
  for(const [email,title,stage,when] of rows){
    const job = jobByTitle[title]; const uid = await wId(email);
    if(!job || !uid) continue;
    const prof = await db.prepare('SELECT * FROM worker_profiles WHERE user_id=?').get(uid);
    const creds = await db.prepare('SELECT * FROM credentials WHERE user_id=?').all(uid);
    let score = 70; try { score = scoreMatch(prof, creds, job).score; } catch(e){}
    try {
      await db.prepare(`INSERT INTO applications(job_id,worker_id,stage,score,created_at)
        VALUES(?,?,?,?,datetime('now',?))`).run(job.id, uid, stage, score, when);
    } catch(e){}
  }
  await metaSet('activity_v2','1');
  console.log('[db] deeper demo activity seeded — backdated applications across 8 weeks for analytics');
}

// ---- demo reviews (two-sided) + a sample interview so the features aren't empty (idempotent) ----
async function seedReviews(){
  if (await metaGet('reviews_v1')) return;
  const uid = async (email) => { const u = await db.prepare('SELECT id,name,company FROM users WHERE email=?').get(email); return u; };
  const job = async (empId,title) => (await db.prepare('SELECT id FROM jobs WHERE employer_id=? AND title=?').get(empId,title) || {}).id;
  const ins = db.prepare(`INSERT INTO reviews(author_id,author_name,subject_id,subject_kind,stars,body,job_id,created_at) VALUES(?,?,?,?,?,?,?,datetime('now',?))`);
  const sun = await uid('ops@sunvalley.test'), copper = await uid('hr@coppermountain.test');
  const marcus = await uid('marcus@rivet.test'), andre = await uid('andre@rivet.test'), kim = await uid('kim@rivet.test'),
        tasha = await uid('tasha@rivet.test'), omar = await uid('omar@rivet.test');
  // employer -> worker
  const empReviews = [
    [sun, marcus, 5, 'Marcus ran our downtown fit-out lead and never missed an inspection. Hire again in a heartbeat.', await job(sun&&sun.id,'Commercial Electrician'), '-45 days'],
    [sun, andre, 5, 'Showed up early, EPA-608 work was clean, great with our service customers.', await job(sun&&sun.id,'HVAC Service Technician'), '-40 days'],
    [sun, kim, 4, 'Strong journeyman. Knocked the TI work out fast; would bring back on the next phase.', await job(sun&&sun.id,'Commercial Electrician'), '-30 days'],
    [copper, tasha, 5, 'Best plumber we’ve had on a commercial repipe — organized and safety-first.', null, '-25 days'],
    [copper, omar, 5, 'AWS-tested and it shows. Tight welds, comfortable at height.', null, '-20 days'],
  ];
  // worker -> employer (company)
  const workerReviews = [
    [marcus, sun, 5, 'Paid weekly like they said, good crews, foreman actually listens. Solid shop.', await job(sun&&sun.id,'Commercial Electrician'), '-44 days'],
    [andre, sun, 5, 'Steady hours and real overtime. They promote from within — that’s rare.', await job(sun&&sun.id,'HVAC Service Technician'), '-39 days'],
    [tasha, copper, 4, 'Big pipeline of work and safety is taken seriously. Tools list was clear up front.', null, '-24 days'],
  ];
  for(const [a, s, stars, body, jid, when] of empReviews){
    if(!a || !s) continue;
    try { await ins.run(a.id, a.company||a.name, s.id, 'worker', stars, body, jid||null, when); } catch(e){}
  }
  for(const [a, s, stars, body, jid, when] of workerReviews){
    if(!a || !s) continue;
    try { await ins.run(a.id, a.name, s.id, 'employer', stars, body, jid||null, when); } catch(e){}
  }
  // a confirmed sample interview so the scheduling UI isn't empty in the demo
  if(sun && kim){
    const jid = await job(sun.id,'Commercial Electrician');
    if(jid){
      const d = new Date(Date.now()+2*864e5); d.setHours(10,0,0,0);
      const slots = JSON.stringify([d.toISOString()]);
      try { await db.prepare(`INSERT INTO interviews(job_id,worker_id,employer_id,slots,chosen,status,created_at) VALUES(?,?,?,?,?,?,datetime('now','-1 days'))`)
        .run(jid, kim.id, sun.id, slots, d.toISOString(), 'confirmed'); } catch(e){}
    }
  }
  await metaSet('reviews_v1','1');
  console.log('[db] demo reviews + sample interview seeded');
}
async function seedSafety(){
  if (await metaGet('safety_v1')) return;
  // backfill a site-safety rating on existing worker→employer reviews
  try { await db.exec("UPDATE reviews SET safety = CASE WHEN stars>=5 THEN 5 WHEN stars=4 THEN 4 ELSE 4 END WHERE subject_kind='employer' AND safety IS NULL"); } catch(e){}
  await metaSet('safety_v1','1');
  console.log('[db] safety pulse backfilled on employer reviews');
}

// ---- X-factors demo data: show-up outcomes, pay outcomes, crews, crew-open jobs (idempotent) ----
async function seedXfactors(){
  if (await metaGet('xfactors_v1')) return;
  // Hired applications get a real outcome + pay record (mostly good, a little texture).
  const hired = await db.prepare("SELECT id FROM applications WHERE stage='Hired' ORDER BY id").all();
  hired.forEach(()=>{}); // (no-op to keep lints calm)
  for(let i=0;i<hired.length;i++){
    const out = (i%7===5) ? 'noshow' : ((i%11===9) ? 'cancelled' : 'showed');
    const pay = (i%6===4) ? 'late' : 'ontime';
    try { await db.prepare('UPDATE applications SET outcome=?, pay_outcome=? WHERE id=?').run(out, pay, hired[i].id); } catch(e){}
  }
  // a couple of crews so "brings a crew" shows in the demo
  const wId = async (email)=>{ const u=await db.prepare('SELECT id FROM users WHERE email=?').get(email); return u&&u.id; };
  const crews = [
    ['marcus@rivet.test', [['Tony Marchetti','pipefitter','Worked together 3 yrs at Copper Mountain'],['Ray Banks','controls','Reliable, OSHA-30']]],
    ['omar@rivet.test', [['DeShawn Carter','welder','6G, travels for work'],['Sam Okafor','pipefitter','Fast, clean welds']]],
  ];
  for(const [email, members] of crews){
    const uid = await wId(email); if(!uid) continue;
    for(const [name,trade,note] of members){
      try { await db.prepare('INSERT INTO crew_members(worker_id,name,trade,note) VALUES(?,?,?,?)').run(uid, name, trade, note); } catch(e){}
    }
  }
  // mark some jobs open to crews (crew-friendly trades)
  try { await db.exec("UPDATE jobs SET crew_ok=1 WHERE trade IN ('welder','pipefitter','concrete','carpenter','framer','ironworker','fruit_picker','farmworker','event_setup','landscaper')"); } catch(e){}
  await metaSet('xfactors_v1','1');
  console.log('[db] X-factors seeded — show-up + pay outcomes, crews, crew-open jobs');
}

// ---- homeowners / small businesses post one-off jobs that workers quote a price on (idempotent) ----
async function seedHomeowner(){
  if (await metaGet('homeowner_v1')) return;
  const pw = hashPassword('demo1234');
  const insU = db.prepare('INSERT INTO users(email,pass,role,name,company_city) VALUES(?,?,?,?,?)');
  let h1, h2;
  try { h1 = (await insU.run('linda.homeowner@rivet.test',pw,'employer','Linda Powell','Phoenix, AZ')).lastInsertRowid; } catch(e){}
  try { h2 = (await insU.run('cafe.mesa@rivet.test',pw,'employer','Mesa Corner Café','Mesa, AZ')).lastInsertRowid; } catch(e){}
  const insJob = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr,employment_type,poster_kind,quotes_ok)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  // [poster,title,trade,city,zip,descr,etype]
  const jobs = [
    [h1,'Fix a leaking kitchen faucet','plumber','Phoenix','85004','Single-handle faucet drips at the base. Have the replacement part. ~1 hour job.','Outcome-based'],
    [h1,'Replace 3 ceiling fans','handyman','Phoenix','85004','Swap 3 old fans for new ones I already bought. Ladder work. This weekend.','Outcome-based'],
    [h1,'Repair backyard fence section','handyman','Phoenix','85004','~12 ft of wood fence blew down. Need it re-set and re-attached.','Outcome-based'],
    [h2,'Walk-in cooler not holding temp','hvac','Mesa','85201','Small café — walk-in cooler warming up. Need a refrigeration tech ASAP.','Outcome-based'],
    [h2,'Monthly hood + vent cleaning','janitor','Mesa','85201','Kitchen exhaust hood cleaning, recurring monthly. Quote per visit.','Part-time'],
  ];
  const jobIds = [];
  for(const [poster,title,trade,city,zip,descr,etype] of jobs){
    if(!poster) continue;
    try { const r = await insJob.run(poster,title,trade,0,0,city,zip,'Any','',descr,etype,'individual',1); jobIds.push(r.lastInsertRowid); } catch(e){}
  }
  // a few seeded quotes so the bidding UI isn't empty
  const wId = async (email)=>{ const u=await db.prepare('SELECT id FROM users WHERE email=?').get(email); return u&&u.id; };
  const insQ = db.prepare('INSERT INTO quotes(job_id,worker_id,amount,unit,note,status) VALUES(?,?,?,?,?,?)');
  if(jobIds[0]){ // faucet
    const t=await wId('tasha@rivet.test'); if(t){ try{ await insQ.run(jobIds[0],t,120,'job','Can come by tomorrow morning, parts included if needed.','pending'); }catch(e){} }
  }
  if(jobIds[1]){ // ceiling fans
    const m=await wId('marcus@rivet.test'); if(m){ try{ await insQ.run(jobIds[1],m,75,'job','$25/fan, about 2 hours total. Bring my own ladder.','pending'); }catch(e){} }
    const h=await wId('diego@rivet.test'); if(h){ try{ await insQ.run(jobIds[1],h,90,'job','Available Saturday.','pending'); }catch(e){} }
  }
  await metaSet('homeowner_v1','1');
  console.log('[db] homeowner/individual quote jobs seeded — +2 posters, +'+jobIds.length+' one-off jobs');
}

async function migrate() {
  // additive column migrations (idempotent — errors swallowed when already applied)
  try { await db.exec('ALTER TABLE users ADD COLUMN phone TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN available INTEGER DEFAULT 1'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN work_today INTEGER DEFAULT 0'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN alerts INTEGER DEFAULT 0'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN trades TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN headline TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN about TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec("ALTER TABLE jobs ADD COLUMN employment_type TEXT DEFAULT 'Full-time'"); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN relocate INTEGER DEFAULT 0'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN has_tools INTEGER DEFAULT 0'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN has_transport INTEGER DEFAULT 0'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN bilingual INTEGER DEFAULT 0'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN custom_trade TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec("ALTER TABLE jobs ADD COLUMN source TEXT DEFAULT 'Rivet'"); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE jobs ADD COLUMN apply_url TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE users ADD COLUMN company_about TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE users ADD COLUMN company_website TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE users ADD COLUMN company_city TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE users ADD COLUMN company_size TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE credentials ADD COLUMN proof_url TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec("ALTER TABLE credentials ADD COLUMN verify_status TEXT DEFAULT 'unverified'"); } catch (e) { /* column exists */ }
  try { await db.exec("ALTER TABLE jobs ADD COLUMN sponsorship TEXT DEFAULT 'authorized'"); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN work_auth TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec('ALTER TABLE applications ADD COLUMN outcome TEXT'); } catch (e) { /* showed/noshow/cancelled */ }
  try { await db.exec('ALTER TABLE applications ADD COLUMN pay_outcome TEXT'); } catch (e) { /* ontime/late/short/unpaid */ }
  try { await db.exec('ALTER TABLE jobs ADD COLUMN crew_ok INTEGER DEFAULT 0'); } catch (e) { /* column exists */ }
  try { await db.exec("ALTER TABLE jobs ADD COLUMN poster_kind TEXT DEFAULT 'company'"); } catch (e) { /* company|individual */ }
  try { await db.exec('ALTER TABLE jobs ADD COLUMN quotes_ok INTEGER DEFAULT 0'); } catch (e) { /* accepts price quotes */ }
  try { await db.exec('ALTER TABLE jobs ADD COLUMN duration TEXT'); } catch (e) { /* e.g. 2 weeks, 3 months, ongoing */ }
  try { await db.exec('ALTER TABLE jobs ADD COLUMN fair_chance INTEGER DEFAULT 0'); } catch (e) { /* considers applicants with records */ }
  try { await db.exec('ALTER TABLE jobs ADD COLUMN veteran_ok INTEGER DEFAULT 0'); } catch (e) { /* veteran-friendly */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN veteran INTEGER DEFAULT 0'); } catch (e) { /* worker is a veteran */ }
  try { await db.exec('ALTER TABLE jobs ADD COLUMN transport_provided INTEGER DEFAULT 0'); } catch (e) { /* employer offers a ride/shuttle */ }
  try { await db.exec('ALTER TABLE worker_profiles ADD COLUMN commute_mi INTEGER DEFAULT 0'); } catch (e) { /* max miles willing to travel; 0 = no limit */ }
  try { await db.exec('ALTER TABLE reviews ADD COLUMN safety INTEGER'); } catch (e) { /* worker-rated site safety 1-5 */ }
}

async function seedZips() {
  const zips = [
    ['85004', 33.4515, -112.0712, 'Phoenix'],
    ['85008', 33.4664, -111.9870, 'Phoenix'],
    ['85021', 33.5650, -112.0890, 'Phoenix'],
    ['85281', 33.4255, -111.9400, 'Tempe'],
    ['85251', 33.4942, -111.9261, 'Scottsdale'],
    ['85201', 33.4361, -111.8344, 'Mesa'],
    ['85301', 33.5387, -112.1860, 'Glendale'],
  ];
  for (const [zip, lat, lon, city] of zips) {
    try { await db.prepare('INSERT OR IGNORE INTO zip_geo(zip,lat,lon,city) VALUES(?,?,?,?)').run(zip, lat, lon, city); } catch(e){}
  }
}

async function init() {
  await createSchema();
  await migrate();
  await seed();
  try { await seedZips(); } catch (e) { console.error('[db] zip seed skipped (non-fatal):', e.message); }
  try {
    if(!(await metaGet('today_v1'))){
      for(const email of ['andre@rivet.test','tasha@rivet.test']){
        const u = await db.prepare('SELECT id FROM users WHERE email=?').get(email);
        if(u) await db.prepare('UPDATE worker_profiles SET work_today=1 WHERE user_id=?').run(u.id);
      }
      await metaSet('today_v1','1');
    }
  } catch (e) { console.error('[db] today seed skipped (non-fatal):', e.message); }
  try {
    if(!(await metaGet('alerts_v1'))){
      const setAlert = async (email, phone)=>{
        const u = await db.prepare('SELECT id FROM users WHERE email=?').get(email);
        if(u){ await db.prepare('UPDATE users SET phone=COALESCE(phone,?) WHERE id=?').run(phone, u.id);
               await db.prepare('UPDATE worker_profiles SET alerts=1 WHERE user_id=?').run(u.id); }
      };
      await setAlert('marcus@rivet.test','+15550101001');
      await setAlert('andre@rivet.test','+15550101002');
      await metaSet('alerts_v1','1');
    }
  } catch (e) { console.error('[db] alerts seed skipped (non-fatal):', e.message); }
  try { await enrichDemo(); } catch (e) { console.error('[db] enrich skipped (non-fatal):', e.message); }
  try { await seedRealism(); } catch (e) { console.error('[db] realism skipped (non-fatal):', e.message); }
  try { await seedMedia(); } catch (e) { console.error('[db] media seed skipped (non-fatal):', e.message); }
  try { await seedMedia2(); } catch (e) { console.error('[db] media2 seed skipped (non-fatal):', e.message); }
  try { await seedExperience(); } catch (e) { console.error('[db] experience seed skipped (non-fatal):', e.message); }
  try { await seedJobTypes(); } catch (e) { console.error('[db] job-types seed skipped (non-fatal):', e.message); }
  try { await seedCompanies(); } catch (e) { console.error('[db] company seed skipped (non-fatal):', e.message); }
  try { await seedBig(); } catch (e) { console.error('[db] big seed skipped (non-fatal):', e.message); }
  try { await seedCategories(); } catch (e) { console.error('[db] category seed skipped (non-fatal):', e.message); }
  try { await seedPosts(); } catch (e) { console.error('[db] posts seed skipped (non-fatal):', e.message); }
  try { await seedLocalGig(); } catch (e) { console.error('[db] localgig seed skipped (non-fatal):', e.message); }
  try { await seedExternal(); } catch (e) { console.error('[db] external seed skipped (non-fatal):', e.message); }
  try { await seedUsajobs(); } catch (e) { console.error('[db] usajobs seed skipped (non-fatal):', e.message); }
  try { await seedActivity2(); } catch (e) { console.error('[db] activity2 seed skipped (non-fatal):', e.message); }
  try { await seedReviews(); } catch (e) { console.error('[db] reviews seed skipped (non-fatal):', e.message); }
  try { await seedSafety(); } catch (e) { console.error('[db] safety seed skipped (non-fatal):', e.message); }
  try { await seedXfactors(); } catch (e) { console.error('[db] xfactors seed skipped (non-fatal):', e.message); }
  try { await seedHomeowner(); } catch (e) { console.error('[db] homeowner seed skipped (non-fatal):', e.message); }
  try {
    if(!(await metaGet('rehire_v1'))){
      // make one Sun Valley worker a repeat hire so the "rehires its crew" stat shows
      const emp = await db.prepare("SELECT id FROM users WHERE email='ops@sunvalley.test'").get();
      const w = await db.prepare("SELECT id FROM users WHERE email='kim@rivet.test'").get();
      if(emp && w){
        for(const title of ['Commercial Electrician','Controls Technician']){
          const j = await db.prepare('SELECT id FROM jobs WHERE employer_id=? AND title=?').get(emp.id, title);
          if(j){ try { await db.prepare("INSERT INTO applications(job_id,worker_id,stage,score,outcome) VALUES(?,?,'Hired',92,'showed') ON CONFLICT(job_id,worker_id) DO UPDATE SET stage='Hired', outcome=COALESCE(applications.outcome,'showed')").run(j.id, w.id); } catch(e){} }
        }
      }
      await metaSet('rehire_v1','1');
    }
  } catch (e) { console.error('[db] rehire seed skipped (non-fatal):', e.message); }
  try {
    if(!(await metaGet('inclusion_v1'))){
      // fair-chance: trades & roles where second-chance hiring is common and impactful
      await db.exec("UPDATE jobs SET fair_chance=1 WHERE trade IN ('warehouse','mover','janitor','landscaper','concrete','demolition','dishwasher','prep_cook','delivery_driver','junk_removal','packing_shed','welder','pipefitter')");
      await db.exec("UPDATE jobs SET veteran_ok=1 WHERE trade IN ('electrician','hvac','welder','diesel_mechanic','heavy_equipment','security_guard','cdl_driver','facilities','controls','low_voltage')");
      for(const email of ['will@rivet.test','omar@rivet.test','marcus.bell@rivet.test']){
        const u = await db.prepare('SELECT id FROM users WHERE email=?').get(email);
        if(u) await db.prepare('UPDATE worker_profiles SET veteran=1 WHERE user_id=?').run(u.id);
      }
      await metaSet('inclusion_v1','1');
    }
  } catch (e) { console.error('[db] inclusion seed skipped (non-fatal):', e.message); }
  try {
    if(!(await metaGet('transport_v1'))){
      // ag / seasonal / event / warehouse roles that commonly shuttle workers to the site
      await db.exec("UPDATE jobs SET transport_provided=1 WHERE trade IN ('fruit_picker','farmworker','packing_shed','event_setup','irrigation_tech','nursery_worker','ranch_hand','warehouse')");
      await metaSet('transport_v1','1');
    }
  } catch (e) { console.error('[db] transport seed skipped (non-fatal):', e.message); }
  try {
    if(!(await metaGet('duration_v1'))){
      await db.exec("UPDATE jobs SET duration='3 months' WHERE employment_type='Contract' AND duration IS NULL");
      await db.exec("UPDATE jobs SET duration='2 weeks' WHERE employment_type='Temp' AND duration IS NULL");
      await db.exec("UPDATE jobs SET duration='Ongoing' WHERE employment_type IN ('Full-time','Part-time') AND duration IS NULL");
      await db.exec("UPDATE jobs SET duration='1–2 weeks' WHERE employment_type='Outcome-based' AND quotes_ok=0 AND duration IS NULL");
      await db.exec("UPDATE jobs SET duration='1 day' WHERE quotes_ok=1 AND duration IS NULL");
      await metaSet('duration_v1','1');
    }
  } catch (e) { console.error('[db] duration seed skipped (non-fatal):', e.message); }
  try {
    if(!(await metaGet('sponsorship_v2'))){
      // Recompute cleanly by trade (no employment_type sweep, which mis-tagged Temp jobs).
      // Agricultural roles → H-2A; seasonal non-ag (hospitality/landscaping/events) → H-2B.
      await db.exec("UPDATE jobs SET sponsorship='authorized'");
      await db.exec("UPDATE jobs SET sponsorship='h2a' WHERE trade IN ('fruit_picker','farmworker','irrigation_tech','packing_shed','ranch_hand','nursery_worker')");
      await db.exec("UPDATE jobs SET sponsorship='h2b' WHERE trade IN ('landscaper','event_setup','housekeeper','host','server','busser','dishwasher','bartender')");
      await metaSet('sponsorship_v2','1');
    }
  } catch (e) { console.error('[db] sponsorship seed skipped (non-fatal):', e.message); }
  try {
    if(!(await metaGet('credstatus_v1'))){
      await db.exec("UPDATE credentials SET verify_status='verified' WHERE verified=1");
      await db.exec("UPDATE credentials SET verify_status='unverified' WHERE verified=0 AND (verify_status IS NULL OR verify_status='')");
      await metaSet('credstatus_v1','1');
    }
  } catch (e) { console.error('[db] cred-status backfill skipped (non-fatal):', e.message); }
  try {
    if(!(await metaGet('xfactor_v1'))){
      // own tools (most trades), reliable transport, bilingual — high-signal flags for recruiters
      await db.exec("UPDATE worker_profiles SET has_tools=1 WHERE trade IN ('electrician','plumber','hvac','carpenter','welder','pipefitter','tile','painter','locksmith','appliance_repair')");
      await db.exec("UPDATE worker_profiles SET has_transport=1 WHERE trade IN ('electrician','hvac','plumber','cdl_driver','delivery_driver','caregiver','cna','pest_control','appliance_repair','heavy_equipment')");
      for(const email of ['marcus@rivet.test','gloria.mendez@rivet.test','luis.fuentes@rivet.test','sofia.reyes@rivet.test','mina.patel@rivet.test','marisol.vega@rivet.test']){
        const u = await db.prepare('SELECT id FROM users WHERE email=?').get(email);
        if(u) await db.prepare('UPDATE worker_profiles SET bilingual=1 WHERE user_id=?').run(u.id);
      }
      await metaSet('xfactor_v1','1');
    }
  } catch (e) { console.error('[db] xfactor seed skipped (non-fatal):', e.message); }
  try {
    if(!(await metaGet('relocate_v1'))){
      for(const email of ['omar@rivet.test','will@rivet.test','sam@rivet.test']){
        const u = await db.prepare('SELECT id FROM users WHERE email=?').get(email);
        if(u) await db.prepare('UPDATE worker_profiles SET relocate=1 WHERE user_id=?').run(u.id);
      }
      await metaSet('relocate_v1','1');
    }
  } catch (e) { console.error('[db] relocate seed skipped (non-fatal):', e.message); }
}

module.exports = { db, init, hashPassword, verifyPassword, recomputeReadiness };
