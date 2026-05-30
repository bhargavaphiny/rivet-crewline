'use strict';
/*
 * Rivet x Crewline - database layer (Node built-in SQLite, zero deps).
 * Creates the schema on first run and seeds demo data so the demo is populated.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { readiness } = require('./matching');

const DATA_DIR = process.env.RIVET_DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'rivet.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    pass TEXT NOT NULL,
    role TEXT NOT NULL,                 -- 'worker' | 'employer'
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
    stage TEXT DEFAULT 'Sourced',       -- Sourced|Screened|Interview|Offer|Hired
    score INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(job_id, worker_id)
  );
`);

// ---- password helpers (scrypt, no external deps) ----
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

function recomputeReadiness(userId) {
  const p = db.prepare('SELECT * FROM worker_profiles WHERE user_id=?').get(userId);
  if (!p) return;
  const creds = db.prepare('SELECT * FROM credentials WHERE user_id=?').all(userId);
  const r = readiness(p, creds);
  db.prepare('UPDATE worker_profiles SET readiness=? WHERE user_id=?').run(r, userId);
}

// ---- seed (only when empty) ----
function seed() {
  const count = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (count > 0) return;

  const pw = hashPassword('demo1234');
  const insUser = db.prepare('INSERT INTO users(email,pass,role,name,company) VALUES(?,?,?,?,?)');
  const insProf = db.prepare(`INSERT INTO worker_profiles(user_id,trade,years_exp,city,zip,pay_floor,shift,bio)
                              VALUES(?,?,?,?,?,?,?,?)`);
  const insCred = db.prepare('INSERT INTO credentials(user_id,kind,name,verified,expires) VALUES(?,?,?,?,?)');
  const insJob  = db.prepare(`INSERT INTO jobs(employer_id,title,trade,pay_min,pay_max,city,zip,shift,req_creds,descr)
                              VALUES(?,?,?,?,?,?,?,?,?,?)`);
  const insApp  = db.prepare('INSERT INTO applications(job_id,worker_id,stage,score) VALUES(?,?,?,?)');

  // --- Employer (Crewline) ---
  const empId = insUser.run('ops@sunvalley.test', pw, 'employer', 'Dana Ortiz', 'Sun Valley Mechanical').lastInsertRowid;

  const jobs = [
    ['Commercial Electrician','electrician',44,48,'Phoenix','85004','Day','license,osha30','Commercial fit-outs and service. Journeyman card required.'],
    ['HVAC Service Technician','hvac',36,44,'Phoenix','85004','Day','epa608,osha10','Light commercial HVAC service & install.'],
    ['Controls Technician','controls',44,50,'Phoenix','85004','Day','license','PLC / BAS controls for commercial sites.'],
    ['Maintenance Technician','hvac',34,40,'Phoenix','85008','4x10','osha10','Plant maintenance, mechanical + light electrical.'],
  ].map(j => insJob.run(empId, ...j).lastInsertRowid);

  // --- Workers (Rivet) --- [email, name, trade, yrs, zip, floor, shift, creds[[kind,verified,exp]]]
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
    const uid = insUser.run(email, pw, 'worker', name, null).lastInsertRowid;
    insProf.run(uid, trade, yrs, 'Phoenix', zip, floor, shift, `${yrs}-year ${trade} based in Phoenix.`);
    for (const [kind, ver, exp] of creds) {
      insCred.run(uid, kind, require('./matching').CRED_KINDS[kind] || kind, ver, exp);
    }
    recomputeReadiness(uid);
    workerIds[email] = uid;
  }

  // Pre-populate one job's pipeline so the employer demo isn't empty.
  const { scoreMatch } = require('./matching');
  const elecJob = db.prepare('SELECT * FROM jobs WHERE id=?').get(jobs[0]);
  const pre = [['marcus@rivet.test','Interview'],['kim@rivet.test','Screened'],['ray@rivet.test','Sourced']];
  for (const [email, stage] of pre) {
    const uid = workerIds[email];
    const prof = db.prepare('SELECT * FROM worker_profiles WHERE user_id=?').get(uid);
    const creds = db.prepare('SELECT * FROM credentials WHERE user_id=?').all(uid);
    const { score } = scoreMatch(prof, creds, elecJob);
    insApp.run(elecJob.id, uid, stage, score);
  }

  console.log('[db] seeded demo data — employer: ops@sunvalley.test / worker: marcus@rivet.test (pw: demo1234)');
}
seed();

module.exports = { db, hashPassword, verifyPassword, recomputeReadiness };
