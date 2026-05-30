'use strict';
/*
 * Rivet x Crewline - matching engine
 * Pure functions, no I/O. Easy to unit-test and tune.
 */

// Canonical trades and their human labels.
const TRADES = {
  electrician:  'Electrician',
  hvac:         'HVAC Technician',
  plumber:      'Plumber',
  controls:     'Controls Technician',
  sheet_metal:  'Sheet Metal',
  solar:        'Solar Installer',
  welder:       'Welder',
  pipefitter:   'Pipefitter',
  cdl_driver:   'CDL Driver',
};

// Adjacent trades score partial credit (skills transfer).
const ADJACENT = {
  electrician: ['controls', 'solar'],
  hvac:        ['controls', 'sheet_metal'],
  controls:    ['electrician', 'hvac'],
  solar:       ['electrician'],
  sheet_metal: ['hvac', 'welder'],
  welder:      ['sheet_metal', 'pipefitter'],
  plumber:     ['pipefitter'],
  pipefitter:  ['plumber', 'welder'],
  cdl_driver:  [],
};

// Credential kinds and labels.
const CRED_KINDS = {
  license:  'State License',
  osha10:   'OSHA 10',
  osha30:   'OSHA 30',
  epa608:   'EPA 608',
  cpr:      'First Aid / CPR',
  forklift: 'Forklift Operator',
  cdl:      'CDL',
};

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/**
 * Job-readiness score (0-100): how "hire-ready" a worker looks.
 * Base + experience + verified credentials. Stored on the worker profile.
 */
function readiness(profile, creds = []) {
  const verified = creds.filter(c => c.verified).length;
  let s = 35;
  s += Math.min(30, (profile.years_exp || 0) * 3);   // up to 30 for experience
  s += Math.min(30, verified * 8);                    // up to 30 for verified creds
  if ((profile.pay_floor || 0) > 0) s += 5;           // engaged / complete profile
  return clamp(Math.round(s));
}

/**
 * Match score (0-100) between a worker (profile + creds) and a job.
 * Symmetric: used for the worker's job feed AND the employer's ranking.
 *  - trade fit (45): exact match, adjacent = partial
 *  - pay fit (20): does the job clear the worker's pay floor
 *  - location (20): same zip > same city > elsewhere
 *  - credential coverage (15): % of required creds the worker holds (verified)
 */
function scoreMatch(profile, creds, job) {
  // trade
  let trade = 0;
  if (profile.trade === job.trade) trade = 45;
  else if ((ADJACENT[job.trade] || []).includes(profile.trade)) trade = 24;

  // pay
  let pay = 0;
  if (job.pay_max >= (profile.pay_floor || 0)) pay = 20;
  else pay = clamp(20 - (profile.pay_floor - job.pay_max) * 2, 0, 20);

  // location
  let loc = 5;
  if (profile.zip && job.zip && profile.zip === job.zip) loc = 20;
  else if (profile.city && job.city &&
           profile.city.toLowerCase() === job.city.toLowerCase()) loc = 16;

  // credentials
  const req = (job.req_creds || '').split(',').map(s => s.trim()).filter(Boolean);
  let credScore = 15;
  if (req.length) {
    const held = new Set(creds.filter(c => c.verified).map(c => c.kind));
    const have = req.filter(k => held.has(k)).length;
    credScore = Math.round((have / req.length) * 15);
  }

  const total = clamp(Math.round(trade + pay + loc + credScore));
  const missing = req.filter(k => !creds.some(c => c.verified && c.kind === k));
  return { score: total, breakdown: { trade, pay, loc, cred: credScore }, missing };
}

module.exports = { TRADES, ADJACENT, CRED_KINDS, readiness, scoreMatch, clamp };
