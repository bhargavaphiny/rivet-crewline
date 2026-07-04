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
  // manufacturing & semiconductor
  equipment_tech:  'Equipment Maintenance Technician',
  process_tech:    'Process / Fab Technician',
  cleanroom_op:    'Cleanroom Operator',
  machine_operator:'Machine Operator',
  assembler:       'Assembler / Production',
  maintenance_tech:'Industrial Maintenance Tech',
  quality_inspector:'Quality Inspector',
  // ---- semiconductor depth (real fab disciplines) ----
  wafer_fab_op:    'Wafer Fab Operator',
  photolith_tech:  'Photolithography Technician',
  etch_tech:       'Etch Technician',
  deposition_tech: 'Deposition Technician (CVD/PVD)',
  cmp_tech:        'CMP Technician',
  implant_tech:    'Ion Implant Technician',
  diffusion_tech:  'Diffusion / Furnace Technician',
  metrology_tech:  'Metrology / Inspection Technician',
  test_tech:       'Wafer Test / Probe Technician',
  packaging_tech:  'Assembly & Packaging Technician',
  fab_facilities:  'Fab Facilities Technician',
  cal_tech:        'Calibration Technician',
  // ---- manufacturing depth ----
  tool_die:        'Tool & Die Maker',
  injection_molding:'Injection Molding Technician',
  press_operator:  'Press / Stamping Operator',
  material_handler:'Material Handler',
  robotics_tech:   'Automation / Robotics Technician',
  fabricator:      'Metal Fabricator',
  lab_tech:        'Quality Lab Technician',
  // healthcare sub-roles
  patient_care_tech:'Patient Care Technician',
  sterile_processing:'Sterile Processing Tech',
  surgical_tech:   'Surgical Technologist',
  // ---- healthcare depth ----
  lpn:             'Licensed Practical Nurse (LPN/LVN)',
  pharmacy_tech:   'Pharmacy Technician',
  radiology_tech:  'Radiologic Technologist',
  med_lab_tech:    'Medical Lab Technician',
  dental_assistant:'Dental Assistant',
  monitor_tech:    'Telemetry / Monitor Technician',
  behavioral_tech: 'Behavioral Health Technician',
  pt_aide:         'Physical Therapy Aide',
  dietary_aide:    'Dietary Aide',
};

// Two-level navigation: category → trade keys (every trade appears once; rest fall to "Other").
const CATEGORIES = {
  'Construction & trades': ['electrician','hvac','plumber','pipefitter','welder','sheet_metal','carpenter','framer','drywall','painter','roofer','mason','concrete','flooring','tile','glazier','insulation','ironworker','boilermaker','controls','solar','low_voltage','fire_sprinkler','elevator_tech','millwright'],
  'Drivers & logistics': ['cdl_driver','delivery_driver','heavy_equipment','crane_operator','warehouse','mover','gig_courier'],
  'Mechanical & repair': ['diesel_mechanic','automotive_tech','machinist','appliance_repair','locksmith','facilities'],
  'Manufacturing & semiconductor': ['equipment_tech','process_tech','cleanroom_op','wafer_fab_op','photolith_tech','etch_tech','deposition_tech','cmp_tech','implant_tech','diffusion_tech','metrology_tech','test_tech','packaging_tech','fab_facilities','cal_tech','machine_operator','assembler','maintenance_tech','quality_inspector','tool_die','injection_molding','press_operator','material_handler','robotics_tech','fabricator','lab_tech'],
  'Healthcare & care': ['cna','caregiver','medical_assistant','phlebotomist','emt','patient_care_tech','sterile_processing','surgical_tech','lpn','pharmacy_tech','radiology_tech','med_lab_tech','dental_assistant','monitor_tech','behavioral_tech','pt_aide','dietary_aide'],
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
  // ---- semiconductor: every sub-discipline cross-matches the fab's core tech roles ----
  equipment_tech:  ['process_tech','maintenance_tech','cleanroom_op','cal_tech'],
  process_tech:    ['equipment_tech','cleanroom_op','wafer_fab_op','etch_tech','deposition_tech','diffusion_tech'],
  cleanroom_op:    ['wafer_fab_op','process_tech','assembler','packaging_tech'],
  wafer_fab_op:    ['cleanroom_op','process_tech','machine_operator','packaging_tech'],
  photolith_tech:  ['process_tech','etch_tech','metrology_tech','equipment_tech'],
  etch_tech:       ['process_tech','deposition_tech','equipment_tech','photolith_tech'],
  deposition_tech: ['process_tech','etch_tech','diffusion_tech','equipment_tech'],
  cmp_tech:        ['process_tech','equipment_tech','metrology_tech'],
  implant_tech:    ['process_tech','equipment_tech','diffusion_tech'],
  diffusion_tech:  ['process_tech','deposition_tech','equipment_tech'],
  metrology_tech:  ['quality_inspector','process_tech','test_tech','cal_tech'],
  test_tech:       ['metrology_tech','quality_inspector','equipment_tech','packaging_tech'],
  packaging_tech:  ['assembler','cleanroom_op','test_tech','machine_operator'],
  fab_facilities:  ['facilities','maintenance_tech','equipment_tech','hvac'],
  cal_tech:        ['metrology_tech','equipment_tech','quality_inspector'],
  // ---- manufacturing: core production roles cross-match ----
  machine_operator:['assembler','press_operator','injection_molding','material_handler','production'],
  assembler:       ['machine_operator','packaging_tech','material_handler','wafer_fab_op'],
  maintenance_tech:['equipment_tech','millwright','facilities','robotics_tech','electrician'],
  quality_inspector:['metrology_tech','lab_tech','test_tech','cal_tech'],
  tool_die:        ['machinist','fabricator','press_operator'],
  injection_molding:['machine_operator','press_operator','assembler'],
  press_operator:  ['machine_operator','tool_die','assembler'],
  material_handler:['warehouse','assembler','machine_operator'],
  robotics_tech:   ['maintenance_tech','controls','equipment_tech','electrician'],
  fabricator:      ['welder','sheet_metal','machinist','tool_die'],
  lab_tech:        ['quality_inspector','metrology_tech','med_lab_tech'],
  // ---- healthcare: care + clinical-support roles cross-match ----
  lpn:             ['cna','patient_care_tech','medical_assistant','monitor_tech'],
  pharmacy_tech:   ['medical_assistant','sterile_processing'],
  radiology_tech:  ['med_lab_tech','patient_care_tech','surgical_tech'],
  med_lab_tech:    ['lab_tech','phlebotomist','quality_inspector'],
  dental_assistant:['medical_assistant','sterile_processing'],
  monitor_tech:    ['patient_care_tech','cna','lpn'],
  behavioral_tech: ['cna','caregiver','patient_care_tech'],
  pt_aide:         ['cna','patient_care_tech','caregiver'],
  dietary_aide:    ['caregiver','cook','janitor'],
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

// Seasonal demand: which trades heat up each month (hand-built, US blue-collar patterns).
// month index 0=Jan … 11=Dec.
const SEASON = {
  0:['hvac','facilities','appliance_repair'], 1:['hvac','facilities','plumber'],
  2:['landscaper','concrete','carpenter','painter'], 3:['landscaper','roofer','concrete','solar'],
  4:['roofer','concrete','hvac','solar'], 5:['hvac','roofer','event_setup','fruit_picker'],
  6:['hvac','roofer','fruit_picker','farmworker'], 7:['hvac','fruit_picker','farmworker','packing_shed'],
  8:['farmworker','fruit_picker','packing_shed','carpenter'], 9:['farmworker','packing_shed','warehouse','roofer'],
  10:['warehouse','delivery_driver','security_guard','event_setup'], 11:['hvac','facilities','warehouse','delivery_driver'],
};
const SEASON_WHY = {
  hvac:'AC + heating season', roofer:'dry-weather roofing', concrete:'pour season', landscaper:'growing season',
  solar:'install season', fruit_picker:'harvest', farmworker:'harvest', packing_shed:'harvest packing',
  warehouse:'retail peak', delivery_driver:'retail peak', security_guard:'event & holiday season',
  event_setup:'event season', facilities:'winter building loads', carpenter:'build season',
  painter:'exterior season', plumber:'frozen-pipe season', appliance_repair:'winter demand',
};
function seasonalTrades(month){ return (SEASON[((month%12)+12)%12]||[]).slice(); }

// Market tightness: how hard each trade is to staff nationally (documented US blue-collar
// shortages). >1 = employers struggle to fill / workers have leverage; ~1 = balanced;
// <1 = more competitive for the worker. Hand-set from public labor-market reporting (BLS/ABC).
const TRADE_DEMAND = {
  electrician:2.3, welder:2.2, pipefitter:2.2, hvac:2.1, plumber:2.0, ironworker:2.0,
  boilermaker:2.0, sheet_metal:1.9, millwright:1.9, machinist:1.8, controls:1.9,
  fire_sprinkler:1.9, elevator_tech:2.1, diesel_mechanic:1.9, cdl_driver:1.9, crane_operator:1.9,
  heavy_equipment:1.8, solar:1.7, roofer:1.7, mason:1.7, carpenter:1.6, framer:1.6,
  glazier:1.6, automotive_tech:1.6, low_voltage:1.7, tile:1.5, concrete:1.5, drywall:1.4,
  insulation:1.4, flooring:1.4, facilities:1.4, appliance_repair:1.5, irrigation_tech:1.4,
  pest_control:1.3, locksmith:1.4, painter:1.3, handyman:1.3, pool_service:1.3,
  cna:1.6, caregiver:1.6, medical_assistant:1.5, phlebotomist:1.4, emt:1.7,
  landscaper:1.2, farmworker:1.2, fruit_picker:1.2, ranch_hand:1.2, nursery_worker:1.2,
  packing_shed:1.1, cook:1.3, prep_cook:1.2, server:1.0, bartender:1.0, dishwasher:0.95,
  busser:0.95, host:0.95, barback:0.95, warehouse:1.05, delivery_driver:1.1, mover:1.0,
  janitor:1.1, housekeeper:1.05, security_guard:1.1, pressure_wash:1.1, junk_removal:1.0,
  gig_courier:1.0, event_setup:1.05,
  equipment_tech:2.2, process_tech:2.0, cleanroom_op:1.6, machine_operator:1.3, assembler:1.15,
  maintenance_tech:1.9, quality_inspector:1.4, patient_care_tech:1.6, sterile_processing:1.6, surgical_tech:1.8,
};
// Blend the documented national tightness with our live job/worker mix in a metro/trade,
// dampening sparse-seed swings with a sqrt. Returns platform-scale demand vs supply + a level.
function marketBalance(trade, realJobs = 0, realWorkers = 0){
  const f = TRADE_DEMAND[trade] || 1.3;
  // national shortage factor leads; live mix only nudges it (4th-root dampens sparse-seed swings)
  const ratio = Math.min(3, +(f * Math.pow((realJobs + 3) / (realWorkers + 3), 0.25)).toFixed(2));
  const supply = Math.round(realWorkers * 180 + 600);
  const demand = Math.round(supply * ratio);
  const level = ratio >= 2.0 ? 'vtight' : ratio >= 1.5 ? 'tight' : ratio >= 1.05 ? 'bal' : 'comp';
  return { trade, demand, supply, ratio, gap: demand - supply, level };
}
const BALANCE_LABEL = { vtight:'Very short-staffed', tight:'Short-staffed', bal:'Balanced', comp:'Competitive' };

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

const TRADE_CAT = {};
for(const [cat, list] of Object.entries(CATEGORIES)) for(const t of list) TRADE_CAT[t] = cat;
function tradeCategory(t){ return TRADE_CAT[t] || 'Other'; }

module.exports = { TRADES, ADJACENT, CATEGORIES, CRED_KINDS, TRAINING, STATE_MIN_WAGE, STATE_NAME, CITY_STATE, stateForCity, localRules, readiness, scoreMatch, clamp, SEASON_WHY, seasonalTrades, marketBalance, BALANCE_LABEL, TRADE_DEMAND, tradeCategory, TRADE_CAT };
