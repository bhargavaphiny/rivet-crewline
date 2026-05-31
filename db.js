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
    CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_id, read_at);
    CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_id, to_id);
    CREATE INDEX IF NOT EXISTS idx_applications_worker ON applications(worker_id);
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_credentials_user ON credentials(user_id);
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

async function migrate() {
  // additive column migrations (idempotent — errors swallowed when already applied)
  try { await db.exec('ALTER TABLE users ADD COLUMN phone TEXT'); } catch (e) { /* column exists */ }
  try { await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL'); } catch (e) {}
}

async function init() {
  await createSchema();
  await migrate();
  await seed();
  try { await enrichDemo(); } catch (e) { console.error('[db] enrich skipped (non-fatal):', e.message); }
  try { await seedRealism(); } catch (e) { console.error('[db] realism skipped (non-fatal):', e.message); }
  try { await seedMedia(); } catch (e) { console.error('[db] media seed skipped (non-fatal):', e.message); }
}

module.exports = { db, init, hashPassword, verifyPassword, recomputeReadiness };
