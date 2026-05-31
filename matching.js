'use strict';
/*
 * Rivet x Crewline - matching engine
 * Pure functions, no I/O. Easy to unit-test and tune.
 */

// Canonical trades and their human labels.
const TRADES = {
  electrician:     'Electrician',
  hvac:            'HVAC Technician',
  plumber:         'Plumber',
  pipefitter:      'Pipefitter',
  welder:          'Welder',
  sheet_metal:     'Sheet Metal Worker',
  carpenter:       'Carpenter',
  framer:          'Framer',
  drywall:         'Drywall / Finisher',
  painter:         'Painter',
  roofer:          'Roofer',
  mason:           'Mason / Bricklayer',
  concrete:        'Concrete Finisher',
  flooring:        'Flooring Installer',
  tile:            'Tile Setter',
  glazier:         'Glazier',
  insulation:      'Insulation Installer',
  ironworker:      'Ironworker',
  millwright:      'Millwright',
  boilermaker:     'Boilermaker',
  controls:        'Controls Technician',
  solar:           'Solar Installer',
  low_voltage:     'Low-Voltage / Telecom',
  fire_sprinkler:  'Fire Sprinkler Fitter',
  elevator_tech:   'Elevator Technician',
  heavy_equipment: 'Heavy Equipment Operator',
  crane_operator:  'Crane Operator',
  cdl_driver:      'CDL Driver',
  diesel_mechanic: 'Diesel Mechanic',
  automotive_tech: 'Automotive Technician',
  machinist:       'Machinist / CNC',
  landscaper:      'Landscaper / Groundskeeper',
  locksmith:       'Locksmith',
  facilities:      'Facilities Maintenance',
};

// Adjacent trades score partial credit (skills transfer).
const ADJACENT = {
  electrician:     ['controls', 'solar', 'low_voltage'],
  hvac:            ['controls', 'sheet_metal', 'facilities'],
  plumber:         ['pipefitter', 'fire_sprinkler'],
  pipefitter:      ['plumber', 'welder', 'boilermaker'],
  welder:          ['sheet_metal', 'pipefitter', 'ironworker', 'boilermaker'],
  sheet_metal:     ['hvac', 'welder'],
  carpenter:       ['framer', 'drywall', 'flooring'],
  framer:          ['carpenter', 'roofer'],
  drywall:         ['carpenter', 'painter', 'insulation'],
  painter:         ['drywall'],
  roofer:          ['framer', 'solar'],
  mason:           ['concrete', 'tile'],
  concrete:        ['mason', 'ironworker'],
  flooring:        ['tile', 'carpenter'],
  tile:            ['flooring', 'mason'],
  glazier:         ['carpenter'],
  insulation:      ['drywall'],
  ironworker:      ['welder', 'concrete'],
  millwright:      ['welder', 'machinist', 'facilities'],
  boilermaker:     ['welder', 'pipefitter'],
  controls:        ['electrician', 'hvac'],
  solar:           ['electrician', 'roofer'],
  low_voltage:     ['electrician'],
  fire_sprinkler:  ['plumber', 'pipefitter'],
  elevator_tech:   ['electrician'],
  heavy_equipment: ['crane_operator', 'cdl_driver'],
  crane_operator:  ['heavy_equipment'],
  cdl_driver:      ['heavy_equipment'],
  diesel_mechanic: ['automotive_tech', 'machinist'],
  automotive_tech: ['diesel_mechanic'],
  machinist:       ['millwright', 'diesel_mechanic'],
  landscaper:      [],
  locksmith:       [],
  facilities:      ['hvac', 'electrician', 'millwright'],
};

// Credential kinds and labels (real trade certs).
const CRED_KINDS = {
  license:        'State / Journeyman License',
  osha10:         'OSHA 10',
  osha30:         'OSHA 30',
  nccer:          'NCCER Certified',
  epa608:         'EPA 608 (HVAC)',
  nate:           'NATE (HVAC)',
  aws_welding:    'AWS Welding Cert',
  nccco_crane:    'NCCCO Crane Operator',
  cdl:            'CDL (Class A/B)',
  forklift:       'Forklift Operator',
  aerial_lift:    'Aerial / Scissor Lift',
  confined_space: 'Confined Space Entry',
  fall_protection:'Fall Protection',
  nfpa70e:        'NFPA 70E (Arc Flash)',
  hazwoper:       'HAZWOPER',
  ase:            'ASE (Automotive)',
  epa_lead:       'EPA Lead (RRP)',
  backflow:       'Backflow Prevention',
  med_gas:        'Medical Gas Brazing',
  cpr:            'First Aid / CPR',
  twic:           'TWIC Card',
};

// How to earn each credential — issuer + short path + an official resource link.
const TRAINING = {
  license:        { how: 'Issued by your state licensing board after an apprenticeship and a trade exam. Requirements vary by state and trade.', url: 'https://www.careeronestop.org/Toolkit/Training/find-certifications.aspx' },
  osha10:         { how: 'OSHA 10-hour Outreach safety course. Take it online or in person from an authorized trainer; they issue your card.', url: 'https://www.osha.gov/training/outreach' },
  osha30:         { how: 'OSHA 30-hour Outreach course — deeper safety training, often expected of leads and supervisors.', url: 'https://www.osha.gov/training/outreach' },
  nccer:          { how: 'Industry credential earned through NCCER-accredited training centers: modules plus hands-on performance verification.', url: 'https://www.nccer.org' },
  epa608:         { how: 'Required to handle refrigerants. Pass the EPA Section 608 exam (Type I/II/III or Universal).', url: 'https://www.epa.gov/section608' },
  nate:           { how: 'HVAC competency exams from North American Technician Excellence.', url: 'https://www.natex.org' },
  aws_welding:    { how: 'Welder performance qualification / Certified Welder through an AWS Accredited Test Facility.', url: 'https://www.aws.org' },
  nccco_crane:    { how: 'Crane operator certification from the National Commission for the Certification of Crane Operators.', url: 'https://www.nccco.org' },
  cdl:            { how: 'Commercial Driver’s License from your state DMV — entry-level driver training (ELDT) plus the CDL skills test.', url: 'https://www.fmcsa.dot.gov/registration/commercial-drivers-license' },
  forklift:       { how: 'Powered-industrial-truck operator training and evaluation per OSHA; your employer or a provider certifies you.', url: 'https://www.osha.gov/powered-industrial-trucks' },
  aerial_lift:    { how: 'Aerial / scissor-lift operator training to ANSI and OSHA standards.', url: 'https://www.osha.gov/aerial-lifts' },
  confined_space: { how: 'Confined-space entry training per OSHA 1910.146.', url: 'https://www.osha.gov/confined-spaces' },
  fall_protection:{ how: 'Fall-protection training per OSHA — required for most work at height.', url: 'https://www.osha.gov/fall-protection' },
  nfpa70e:        { how: 'Arc-flash and electrical-safety training to NFPA 70E.', url: 'https://www.nfpa.org' },
  hazwoper:       { how: 'Hazardous Waste Operations & Emergency Response training (24- or 40-hour).', url: 'https://www.osha.gov/hazwoper' },
  ase:            { how: 'Automotive Service Excellence certification exams.', url: 'https://www.ase.com' },
  epa_lead:       { how: 'EPA Lead Renovator (RRP) certification for work on pre-1978 buildings.', url: 'https://www.epa.gov/lead' },
  backflow:       { how: 'Backflow-prevention assembly tester certification (state or ABPA program).', url: 'https://www.careeronestop.org/Toolkit/Training/find-certifications.aspx' },
  med_gas:        { how: 'Medical gas brazing / installer certification (ASSE 6010 series).', url: 'https://www.careeronestop.org/Toolkit/Training/find-certifications.aspx' },
  cpr:            { how: 'First Aid / CPR certification from the American Red Cross or American Heart Association.', url: 'https://www.redcross.org/take-a-class/cpr' },
  twic:           { how: 'Transportation Worker Identification Credential from the TSA — needed for many ports and secure sites.', url: 'https://www.tsa.gov/for-industry/twic' },
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

module.exports = { TRADES, ADJACENT, CRED_KINDS, TRAINING, readiness, scoreMatch, clamp };
