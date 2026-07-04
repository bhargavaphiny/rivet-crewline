'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { readiness, scoreMatch } = require('../matching');

test('readiness: floors and rewards experience + verified creds', () => {
  const newbie = readiness({ years_exp: 0, pay_floor: 0 }, []);
  assert.ok(newbie >= 35 && newbie <= 40, `base readiness ~35, got ${newbie}`);

  const veteran = readiness(
    { years_exp: 10, pay_floor: 40 },
    [{ verified: 1 }, { verified: 1 }, { verified: 1 }, { verified: 1 }]
  );
  assert.ok(veteran >= 90, `experienced + 4 creds should be high, got ${veteran}`);
  assert.ok(veteran <= 100, 'never exceeds 100');
});

test('readiness: unverified credentials do not count', () => {
  const a = readiness({ years_exp: 5, pay_floor: 30 }, [{ verified: 0 }, { verified: 0 }]);
  const b = readiness({ years_exp: 5, pay_floor: 30 }, []);
  assert.strictEqual(a, b, 'unverified creds add nothing');
});

test('scoreMatch: perfect fit scores at the top', () => {
  const worker = { trade: 'electrician', zip: '85004', city: 'Phoenix', pay_floor: 40 };
  const creds = [{ kind: 'license', verified: 1 }, { kind: 'osha30', verified: 1 }];
  const job = { trade: 'electrician', zip: '85004', city: 'Phoenix', pay_min: 44, pay_max: 48, req_creds: 'license,osha30' };
  const r = scoreMatch(worker, creds, job);
  assert.strictEqual(r.score, 100, `exact trade + zip + pay + all creds = 100, got ${r.score}`);
  assert.deepStrictEqual(r.missing, [], 'nothing missing');
  assert.strictEqual(r.breakdown.trade, 45);
});

test('scoreMatch: adjacent trade gets partial credit, not full', () => {
  const worker = { trade: 'controls', zip: '85004', city: 'Phoenix', pay_floor: 30 };
  const job = { trade: 'electrician', zip: '85004', city: 'Phoenix', pay_min: 40, pay_max: 48, req_creds: '' };
  const r = scoreMatch(worker, [], job);
  assert.strictEqual(r.breakdown.trade, 24, 'adjacent = 24');
  assert.ok(r.score < 100 && r.score > 50);
});

test('scoreMatch: unrelated trade scores zero on trade fit', () => {
  const worker = { trade: 'cdl_driver', zip: '85004', city: 'Phoenix', pay_floor: 30 };
  const job = { trade: 'electrician', zip: '85004', city: 'Phoenix', pay_min: 40, pay_max: 48, req_creds: '' };
  const r = scoreMatch(worker, [], job);
  assert.strictEqual(r.breakdown.trade, 0);
});

test('scoreMatch: missing required credentials are reported', () => {
  const worker = { trade: 'hvac', zip: '85004', city: 'Phoenix', pay_floor: 30 };
  const creds = [{ kind: 'osha10', verified: 1 }]; // has osha10, missing epa608
  const job = { trade: 'hvac', zip: '85004', city: 'Phoenix', pay_min: 40, pay_max: 44, req_creds: 'epa608,osha10' };
  const r = scoreMatch(worker, creds, job);
  assert.deepStrictEqual(r.missing, ['epa608']);
  assert.strictEqual(r.breakdown.cred, 8, 'half of 15, rounded');
});

test('scoreMatch: pay below the worker floor reduces the pay component', () => {
  const worker = { trade: 'welder', zip: '85008', city: 'Phoenix', pay_floor: 50 };
  const job = { trade: 'welder', zip: '85008', city: 'Phoenix', pay_min: 30, pay_max: 40, req_creds: '' };
  const r = scoreMatch(worker, [], job);
  assert.ok(r.breakdown.pay < 20, `pay below floor should dock points, got ${r.breakdown.pay}`);
});

test('scoreMatch: location tiers (zip > city > elsewhere)', () => {
  const base = { trade: 'plumber', pay_floor: 30 };
  const job = { trade: 'plumber', zip: '85004', city: 'Phoenix', pay_min: 40, pay_max: 46, req_creds: '' };
  const sameZip = scoreMatch({ ...base, zip: '85004', city: 'Phoenix' }, [], job).breakdown.loc;
  const sameCity = scoreMatch({ ...base, zip: '99999', city: 'Phoenix' }, [], job).breakdown.loc;
  const elsewhere = scoreMatch({ ...base, zip: '99999', city: 'Tucson' }, [], job).breakdown.loc;
  assert.ok(sameZip > sameCity && sameCity > elsewhere, `${sameZip} > ${sameCity} > ${elsewhere}`);
});
