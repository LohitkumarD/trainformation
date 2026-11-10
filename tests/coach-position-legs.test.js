// Tests for the RailRadar normalisers and the journey-legs model in
// coach-position/lib.js. Fixtures are trimmed from real RailRadar replies
// (train 17392 and 17377, station RNR) — only the fields the app reads.
const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../coach-position/lib.js');

const halt = (code, leg, extra = {}) => ({ station: { code, name: code }, isHalt: true, legIndex: leg, isReversal: false, ...extra });

const T17392 = { data: {
  train: { number: '17392', name: 'KSR Bengaluru Express', source: { code: 'SNNR' }, destination: { code: 'SBC' },
    runDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    coachPosition: 'ENG-SLRD-GEN-GEN-S1-S2-S3-S4-S5-GEN-GEN-GEN-GEN-SLRD' },
  route: [
    halt('SNNR', 0, { departure: '13:40', coachPosition: 'ENG-SLRD-GEN-GEN-S1-S2-S3-S4-S5-GEN-GEN-GEN-GEN-SLRD' }),
    halt('GDG', 0, { arrival: '16:33', departure: '16:35', platform: '1', coachPosition: 'ENG-SLRD-GEN-GEN-S1-S2-S3-S4-S5-GEN-GEN-GEN-GEN-SLRD' }),
    { station: { code: 'NVD', name: 'NVD' }, isHalt: false, legIndex: 0, isReversal: false },
    halt('UBL', 0, { isReversal: true, arrival: '18:10', departure: '18:45', platform: '6', coachPosition: 'ENG-SLRD-GEN-GEN-GEN-GEN-S5-S4-S3-S2-S1-GEN-GEN-SLRD' }),
    halt('RNR', 1, { isReversed: true, arrival: '20:51', departure: '20:53', platform: '3', coachPosition: 'ENG-SLRD-GEN-GEN-GEN-GEN-S5-S4-S3-S2-S1-GEN-GEN-SLRD' }),
    halt('SBC', 1, { arrival: '03:50', arrivalDay: 2, coachPosition: 'ENG-SLRD-GEN-GEN-GEN-GEN-S5-S4-S3-S2-S1-GEN-GEN-SLRD' }),
  ] } };

const T17377 = { data: {
  train: { number: '17377', name: 'Mangaluru Central Express', source: { code: 'BJP' }, destination: { code: 'MAQ' },
    runDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    coachPosition: 'ENG-SLRD-GEN-GEN-S6-S5-S4-S3-S2-S1-B2-B1-A1-GEN-GEN-LPR' },
  route: [
    halt('BJP', 0, { departure: '15:15', coachPosition: 'ENG-SLRD-GEN-GEN-S6-S5-S4-S3-S2-S1-B2-B1-A1-GEN-GEN-LPR' }),
    halt('GDG', 0, { isReversal: true, coachPosition: 'ENG-LPR-GEN-GEN-A1-B1-B2-S1-S2-S3-S4-S5-S6-GEN-GEN-SLRD' }),
    halt('NGR', 1, { coachPosition: 'ENG-LPR-GEN-GEN-A1-B1-B2-S1-S2-S3-S4-S5-S6-GEN-GEN-SLRD' }),
    halt('UBL', 1, { isReversal: true, coachPosition: 'ENG-SLRD-GEN-GEN-S6-S5-S4-S3-S2-S1-B2-B1-A1-GEN-GEN-LPR' }),
    halt('RNR', 2, { arrival: '22:53', departure: '22:55', platform: '3', coachPosition: 'ENG-SLRD-GEN-GEN-S6-S5-S4-S3-S2-S1-B2-B1-A1-GEN-GEN-LPR' }),
    halt('MAQ', 2, { arrival: '10:00', arrivalDay: 2 }),
  ] } };

const D = (s) => s.split('-');
const L0_17392 = D('ENG-SLRD-GEN-GEN-S1-S2-S3-S4-S5-GEN-GEN-GEN-GEN-SLRD');
const L1_17392 = D('ENG-SLRD-GEN-GEN-GEN-GEN-S5-S4-S3-S2-S1-GEN-GEN-SLRD');

test('normalizeRailRadarTrain: stops, legs and halts for 17392', () => {
  const n = lib.normalizeRailRadarTrain(T17392);
  assert.equal(n.no, '17392');
  assert.deepEqual(n.reversalStations, ['UBL']);
  assert.deepEqual(n.stops, ['SNNR', 'UBL', 'SBC']);
  assert.deepEqual(n.legs, [L0_17392, L1_17392]);
  assert.equal(n.halts.find(h => h.c === 'NVD'), undefined, 'non-halts are dropped');
  assert.equal(lib.legOfStation(n, 'GDG'), 0);
  assert.equal(lib.legOfStation(n, 'UBL'), 1, 'a reversal station belongs to the leg departing it');
  assert.equal(lib.legOfStation(n, 'rnr'), 1);
  assert.equal(lib.legOfStation(n, 'XYZ'), null);
  assert.equal(n.halts.find(h => h.c === 'RNR').pf, '3');
});

test('normalizeRailRadarTrain: two reversals (17377)', () => {
  const n = lib.normalizeRailRadarTrain(T17377);
  assert.deepEqual(n.stops, ['BJP', 'GDG', 'UBL', 'MAQ']);
  assert.equal(n.legs.length, 3);
  assert.deepEqual(n.legs[2], n.legs[0]);
  assert.equal(lib.legOfStation(n, 'RNR'), 2);
  assert.equal(lib.normalizeRailRadarTrain({ success: false }), null);
});

test('computeLegs: no staff entry → scheduled legs from RailRadar', () => {
  const sched = lib.normalizeRailRadarTrain(T17392);
  const m = lib.computeLegs({ sched });
  assert.deepEqual(m.stops, ['SNNR', 'UBL', 'SBC']);
  assert.deepEqual(m.legs.map(l => l.source), ['scheduled', 'scheduled']);
  assert.deepEqual(m.boundaries, [{ station: 'UBL', type: 'reversal', extras: [] }]);
});

test('computeLegs: staff at RNR enter what they see on leg 2; leg 1 is derived', () => {
  const sched = lib.normalizeRailRadarTrain(T17392);
  // Today's real formation differs from the schedule (extra S6)
  const seen = D('ENG-SLRD-GEN-GEN-GEN-GEN-S6-S5-S4-S3-S2-S1-GEN-GEN-SLRD');
  const m = lib.computeLegs({ entry: seen, seenLeg: lib.legOfStation(sched, 'RNR'), sched });
  assert.equal(m.legs[1].source, 'seen');
  assert.deepEqual(m.legs[1].codes, seen);
  assert.equal(m.legs[0].source, 'derived');
  assert.deepEqual(m.legs[0].codes, lib.reverseFormation(seen));
});

test('computeLegs: entry on the last of three legs flips back twice', () => {
  const sched = lib.normalizeRailRadarTrain(T17377);
  const seen = sched.legs[2];
  const m = lib.computeLegs({ entry: seen, seenLeg: 2, sched });
  assert.deepEqual(m.legs.map(l => l.source), ['derived', 'derived', 'seen']);
  assert.deepEqual(m.legs[0].codes, seen);
  assert.deepEqual(m.legs[1].codes, sched.legs[1]);
});

test('computeLegs: changed-coach flags follow the coaches onto other legs', () => {
  const sched = lib.normalizeRailRadarTrain(T17392);
  const flags = L0_17392.map(c => c === 'S3');
  const m = lib.computeLegs({ entry: L0_17392, seenLeg: 0, sched, changed: flags });
  const i = m.legs[1].flags.indexOf(true);
  assert.equal(m.legs[1].codes[i], 'S3');
});

test('computeLegs: 2 sick coaches added at UBL behind the engine', () => {
  const sched = lib.normalizeRailRadarTrain(T17392);
  const m = lib.computeLegs({ entry: L0_17392, seenLeg: 0, sched,
    extras: [{ at: 'UBL', end: 'engine', count: 2, kind: 'SICK' }] });
  assert.deepEqual(m.legs[0].codes, L0_17392, 'leg before UBL unchanged');
  assert.deepEqual(m.legs[1].codes.slice(0, 3), ['ENG', 'SICK', 'SICK']);
  assert.equal(m.legs[1].codes.length, L0_17392.length + 2);
  assert.equal(m.boundaries[0].extras.length, 1);
});

test('computeLegs: extras at an ordinary halt split the leg; they move to the rear after a reversal', () => {
  const sched = lib.normalizeRailRadarTrain(T17392);
  const m = lib.computeLegs({ entry: L0_17392, seenLeg: 0, sched,
    extras: [{ at: 'GDG', end: 'engine', count: 1, kind: 'EMPTY' }] });
  assert.deepEqual(m.stops, ['SNNR', 'GDG', 'UBL', 'SBC']);
  assert.deepEqual(m.boundaries.map(b => b.type), ['extra', 'reversal']);
  assert.deepEqual(m.legs[1].codes.slice(0, 2), ['ENG', 'EMPTY']);
  assert.equal(m.legs[2].codes[m.legs[2].codes.length - 1], 'EMPTY');
});

test('computeLegs: extras already typed in by staff are not added twice, and are stripped before the attach station', () => {
  const sched = lib.normalizeRailRadarTrain(T17392);
  const seen = ['ENG', 'SICK', 'SICK', ...L1_17392.slice(1)];
  const m = lib.computeLegs({ entry: seen, seenLeg: 1, sched,
    extras: [{ at: 'UBL', end: 'engine', count: 2, kind: 'SICK' }] });
  assert.deepEqual(m.legs[1].codes, seen);
  assert.ok(!m.legs[0].codes.some(lib.isExtraCode), 'no extras before UBL');
  assert.equal(m.legs[0].codes.length, L0_17392.length);
});

test('computeLegs: a scheduled non-reversal formation change uses the schedule across it', () => {
  // Synthetic: 9 coaches on leg 1, 18 after a scheduled attach at X
  const nine = ['ENG', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const eighteen = [...nine, 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];
  const sched = { stops: ['O', 'X', 'Z'], legs: [nine, eighteen], halts: [] };
  const m = lib.computeLegs({ entry: nine, seenLeg: 0, sched });
  assert.equal(m.boundaries[0].type, 'change');
  assert.equal(m.legs[1].source, 'scheduled');
  assert.equal(m.legs[1].codes.length, 19);
});

test('computeLegs: without RailRadar data, falls back to the admin reversal list', () => {
  const m = lib.computeLegs({ entry: L0_17392, seenLeg: 0, revStations: ['UBL'], from: 'SNNR', to: 'SBC' });
  assert.deepEqual(m.stops, ['SNNR', 'UBL', 'SBC']);
  assert.deepEqual(m.legs[1].codes, L1_17392);
  assert.deepEqual(lib.computeLegs({}).legs, []);
});

test('isExtraCode / classOf for non-passenger coaches', () => {
  for (const c of ['SICK', 'XTRA', 'EMPTY', 'dmg', 'SICK2']) assert.ok(lib.isExtraCode(c), c);
  assert.ok(!lib.isExtraCode('S1'));
  assert.equal(lib.classOf('SICK'), 'xtra');
});

test('normalizeRailRadarBoard + trainsOnDate', () => {
  const board = lib.normalizeRailRadarBoard({ data: { station: { code: 'RNR', name: 'Ranibennur' }, trains: [
    { train: { number: '17377', name: 'Mangaluru Central Express', source: { code: 'BJP' }, destination: { code: 'MAQ' }, runDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
      stop: { arrival: '22:53', departure: '22:55', arrivalDay: 1, departureDay: 1 } },
    { train: { number: '12781', name: 'Swarna Jayanti', source: { code: 'MYS' }, destination: { code: 'NZM' }, runDays: ['fri'] },
      stop: { arrival: '01:08', departure: '01:10', arrivalDay: 2, departureDay: 2 } },
    { train: { number: '12726', name: 'Siddhaganga', source: { code: 'DWR' }, destination: { code: 'SBC' }, runDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
      stop: { arrival: '07:39', departure: '07:40', arrivalDay: 1, departureDay: 1 } },
  ] } });
  assert.equal(board.name, 'Ranibennur');
  assert.equal(board.trains.length, 3);
  // Saturday 3 Oct 2026: 12781 left Mysuru on Friday, reaches RNR at 01:08 Saturday
  const sat = lib.trainsOnDate(board, new Date(2026, 9, 3));
  assert.deepEqual(sat.map(t => t.no), ['12781', '12726', '17377'], 'sorted by time');
  // Friday: 12781 hasn't reached RNR yet (it arrives after midnight)
  const fri = lib.trainsOnDate(board, new Date(2026, 9, 2));
  assert.deepEqual(fri.map(t => t.no), ['12726', '17377']);
});

test('journey dates: addDays / journeyDateFor', () => {
  assert.equal(lib.addDays('2026-09-30', -1), '2026-09-29');
  assert.equal(lib.addDays('2026-10-01', -2), '2026-09-29');
  assert.equal(lib.addDays('2026-12-31', 1), '2027-01-01');
  // 17302 reaches RNR on day 2 → the 30 Sep call belongs to the 29 Sep journey
  assert.equal(lib.journeyDateFor('2026-09-30', 2), '2026-09-29');
  assert.equal(lib.journeyDateFor('2026-09-30', 1), '2026-09-30');
  assert.equal(lib.journeyDateFor('2026-09-30', undefined), '2026-09-30');
});

test('suggestJourneyDate: overnight train reaching RNR at 00:15 on day 2 (17302)', () => {
  const at = (d, h, m) => new Date(2026, 8, d, h, m);
  assert.equal(lib.suggestJourneyDate(2, '00:15', at(29, 21, 0)), '2026-09-29', 'evening before: tonight\'s arrival');
  assert.equal(lib.suggestJourneyDate(2, '00:15', at(30, 0, 5)), '2026-09-29', 'just before arrival');
  assert.equal(lib.suggestJourneyDate(2, '00:15', at(30, 1, 0)), '2026-09-29', 'shortly after arrival');
  assert.equal(lib.suggestJourneyDate(2, '00:15', at(30, 20, 0)), '2026-09-30', 'next evening: next journey');
});

test('suggestJourneyDate: same-day train (17377 at 22:53) keeps today', () => {
  const at = (h, m) => new Date(2026, 8, 29, h, m);
  assert.equal(lib.suggestJourneyDate(1, '22:53', at(10, 0)), '2026-09-29');
  assert.equal(lib.suggestJourneyDate(1, '22:53', at(23, 30)), '2026-09-29');
});
