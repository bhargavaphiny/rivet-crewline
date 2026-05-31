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
  // healthcare & care
  cna:             'CNA / Nursing Assistant',
  caregiver:       'Caregiver / Home Health Aide',
  medical_assistant:'Medical Assistant',
  phlebotomist:    'Phlebotomist',
  emt:             'EMT / Paramedic',
  // agriculture
  farmworker:      'Farmworker / Ag Laborer',
  fruit_picker:    'Fruit / Crop Picker',
  // food service
  cook:            'Cook / Line Cook',
  server:          'Server / Waiter',
  dishwasher:      'Dishwasher',
  bartender:       'Bartender',
  // logistics & warehouse
  warehouse:       'Warehouse Associate',
  delivery_driver: 'Delivery Driver',
  mover:           'Mover / Furniture',
  // facilities, cleaning & safety
  janitor:         'Janitor / Custodian',
  housekeeper:     'Housekeeper',
  security_guard:  'Security Guard',
  pest_control:    'Pest Control Technician',
  appliance_repair:'Appliance Repair Tech',
  // agriculture sub-roles
  irrigation_tech: 'Irrigation Technician',
  packing_shed:    'Packing / Sorting',
  ranch_hand:      'Ranch Hand',
  nursery_worker:  'Nursery Worker',
  // food-service sub-roles
  prep_cook:       'Prep Cook',
  busser:          'Busser',
  host:            'Host / Hostess',
  barback:         'Barback',
  // freelance & gig
  handyman:        'Handyman',
  junk_removal:    'Junk Removal',
  pressure_wash:   'Pressure Washing',
  pool_service:    'Pool Service Tech',
  gig_courier:     'Courier / Gig Delivery',
  event_setup:     'Event Setup Crew',
};

// Two-level navigation: category → trade keys (every trade appears once; rest fall to "Other").
const CATEGORIES = {
  'Construction & trades': ['electrician','hvac','plumber','pipefitter','welder','sheet_metal','carpenter','framer','drywall','painter','roofer','mason','concrete','flooring','tile','glazier','insulation','ironworker','boilermaker','controls','solar','low_voltage','fire_sprinkler','elevator_tech','millwright'],
  'Drivers & logistics': ['cdl_driver','delivery_driver','heavy_equipment','crane_operator','warehouse','mover','gig_courier'],
  'Mechanical & repair': ['diesel_mechanic','automotive_tech','machinist','appliance_repair','locksmith','facilities'],
  'Healthcare & care': ['cna','caregiver','medical_assistant','phlebotomist','emt'],
  'Food service': ['cook','prep_cook','server','busser','host','dishwasher','bartender','barback'],
  'Agriculture': ['farmworker','fruit_picker','irrigation_tech','packing_shed','ranch_hand','nursery_worker','landscaper'],
  'Cleaning & facilities': ['janitor','housekeeper','pressure_wash','pool_service'],
  'Security': ['security_guard','pest_control'],
  'Freelance & gig': ['handyman','junk_removal','event_setup'],
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
  landscaper:      ['farmworker'],
  locksmith:       [],
  facilities:      ['hvac', 'electrician', 'millwright', 'janitor'],
  cna:             ['caregiver', 'medical_assistant', 'emt'],
  caregiver:       ['cna', 'housekeeper'],
  medical_assistant:['cna', 'phlebotomist'],
  phlebotomist:    ['medical_assistant'],
  emt:             ['cna'],
  farmworker:      ['fruit_picker', 'landscaper'],
  fruit_picker:    ['farmworker'],
  cook:            ['dishwasher', 'server'],
  server:          ['bartender', 'cook'],
  dishwasher:      ['cook'],
  bartender:       ['server'],
  warehouse:       ['mover', 'delivery_driver'],
  delivery_driver: ['cdl_driver', 'mover'],
  mover:           ['warehouse', 'delivery_driver'],
  janitor:         ['housekeeper', 'facilities'],
  housekeeper:     ['janitor', 'caregiver'],
  security_guard:  [],
  pest_control:    ['landscaper'],
  appliance_repair:['facilities', 'hvac'],
  irrigation_tech: ['landscaper', 'farmworker', 'plumber'],
  packing_shed:    ['farmworker', 'warehouse'],
  ranch_hand:      ['farmworker'],
  nursery_worker:  ['landscaper', 'farmworker'],
  prep_cook:       ['cook', 'dishwasher'],
  busser:          ['server', 'dishwasher'],
  host:            ['server'],
  barback:         ['bartender', 'busser'],
  handyman:        ['carpenter', 'facilities', 'painter'],
  junk_removal:    ['mover', 'landscaper'],
  pressure_wash:   ['janitor', 'painter'],
  pool_service:    ['facilities', 'plumber'],
  gig_courier:     ['delivery_driver'],
  event_setup:     ['mover', 'janitor'],
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
  cna_cert:       'CNA Certification',
  bls:            'BLS (Healthcare CPR)',
  hha:            'Home Health Aide Cert',
  food_handler:   'Food Handler Card',
  servsafe:       'ServSafe',
  guard_card:     'Security Guard Card',
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
  cna_cert:       { how: 'State-approved CNA course + competency exam; lists you on the state nurse-aide registry.', url: 'https://www.careeronestop.org/Toolkit/Training/find-certifications.aspx' },
  bls:            { how: 'Basic Life Support (healthcare CPR) from the American Heart Association or Red Cross.', url: 'https://www.redcross.org/take-a-class/cpr/cpr-certification' },
  hha:            { how: 'Home Health Aide certification — short training program, often employer-provided.', url: 'https://www.careeronestop.org/Toolkit/Training/find-certifications.aspx' },
  food_handler:   { how: 'Food Handler card — short online course + test, required by most counties for food service.', url: 'https://www.statefoodsafety.com' },
  servsafe:       { how: 'ServSafe Food Handler / Manager certification from the National Restaurant Association.', url: 'https://www.servsafe.com' },
  guard_card:     { how: 'State security guard license (e.g., a "guard card") — training hours + background check.', url: 'https://www.careeronestop.org/Toolkit/Training/find-certifications.aspx' },
};

// State minimum wages (approx. 2025 $/hr) + the city→state lookup for seeded metros.
// Used to show local pay floor + basic labor rules on each job card.
const FEDERAL_MIN_WAGE = 7.25;
const STATE_MIN_WAGE = {
  AZ:14.70, CA:16.50, TX:7.25, CO:14.81, GA:7.25, IL:15.00, NV:12.00, WA:16.66,
  FL:13.00, TN:7.25, NC:7.25, OH:10.70, MO:13.75, UT:7.25, OR:15.05, MN:11.13, MI:10.56, NY:16.50, PA:7.25,
  VA:12.41, HI:14.00, DC:17.50, MA:15.00,
};
const STATE_NAME = {
  AZ:'Arizona', CA:'California', TX:'Texas', CO:'Colorado', GA:'Georgia', IL:'Illinois', NV:'Nevada',
  WA:'Washington', FL:'Florida', TN:'Tennessee', NC:'North Carolina', OH:'Ohio', MO:'Missouri',
  UT:'Utah', OR:'Oregon', MN:'Minnesota', MI:'Michigan', NY:'New York', PA:'Pennsylvania',
  VA:'Virginia', HI:'Hawaii', DC:'Washington, D.C.', MA:'Massachusetts',
};
const CITY_STATE = {
  Phoenix:'AZ', Tempe:'AZ', Mesa:'AZ', Scottsdale:'AZ', Glendale:'AZ', Chandler:'AZ', Gilbert:'AZ', Aurora:'CO',
  Fresno:'CA', 'Los Angeles':'CA', 'San Francisco':'CA', 'San Diego':'CA',
  Houston:'TX', Dallas:'TX', Austin:'TX', 'San Antonio':'TX',
  Denver:'CO', Atlanta:'GA', Chicago:'IL', 'Las Vegas':'NV', Seattle:'WA',
  Miami:'FL', Tampa:'FL', Nashville:'TN', Charlotte:'NC', Columbus:'OH',
  'Kansas City':'MO', 'Salt Lake City':'UT', Portland:'OR', Minneapolis:'MN', Detroit:'MI',
  Washington:'DC', Norfolk:'VA', Honolulu:'HI', Boston:'MA',
};
// City / metro minimum wages that exceed their state floor (approx. 2025 $/hr).
const CITY_MIN_WAGE = {
  Seattle:20.76, 'San Francisco':18.67, 'Los Angeles':17.28, Denver:18.81, Chicago:16.20,
  'New York':16.50, Flagstaff:17.85, Tucson:14.25, Portland:15.95, Minneapolis:15.97, Tempe:15.00,
};
function stateForCity(city){ return CITY_STATE[String(city||'').trim()] || null; }
// Always returns a rules object: known city → state/city wage; unknown → federal floor.
function localRules(city){
  const name = String(city||'').trim();
  const st = stateForCity(name);
  if(!st){
    return {
      state: null, stateName: 'U.S.', city: name,
      stateWage: FEDERAL_MIN_WAGE, cityWage: 0, minWage: FEDERAL_MIN_WAGE,
      level: 'Federal floor', cityApplies: false, federal: true,
      overtime: 'Overtime (1.5×) after 40 hrs/week',
    };
  }
  const stateWage = STATE_MIN_WAGE[st] || FEDERAL_MIN_WAGE;
  const cityWage = CITY_MIN_WAGE[name] || 0;
  const cityApplies = cityWage > stateWage;
  return {
    state: st, stateName: STATE_NAME[st]||st, city: name,
    stateWage, cityWage, minWage: cityApplies ? cityWage : stateWage,
    level: cityApplies ? `${name} (city)` : `${STATE_NAME[st]||st} (state)`,
    cityApplies, federal: false, overtime: 'Overtime (1.5×) after 40 hrs/week',
  };
}

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

  // pay — quote/"name your price" jobs have no fixed rate, so there's no mismatch to penalize
  let pay = 0;
  if (job.quotes_ok || !job.pay_max) pay = 20;
  else if (job.pay_max >= (profile.pay_floor || 0)) pay = 20;
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

module.exports = { TRADES, ADJACENT, CATEGORIES, CRED_KINDS, TRAINING, STATE_MIN_WAGE, STATE_NAME, CITY_STATE, stateForCity, localRules, readiness, scoreMatch, clamp };
