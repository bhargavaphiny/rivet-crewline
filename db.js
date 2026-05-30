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

async function init() {
  await createSchema();
  await seed();
  try { await enrichDemo(); } catch (e) { console.error('[db] enrich skipped (non-fatal):', e.message); }
}

module.exports = { db, init, hashPassword, verifyPassword, recomputeReadiness };
