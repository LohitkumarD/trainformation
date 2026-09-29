// Unit tests for coach-position/lib.js — run with `node --test tests/`
// (no dependencies; uses Node's built-in test runner).
const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../coach-position/lib.js');

const L = (s) => s.split(',');
const flagged = (changed) => changed.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);

test('parseCompressed: commas and spaces both separate coaches', () => {
  assert.deepEqual(lib.parseCompressed('eng, slr GEN,s1'), ['ENG', 'SLR', 'GEN', 'S1']);
  assert.deepEqual(lib.parseCompressed(''), []);
  assert.deepEqual(lib.parseCompressed(null), []);
});

test('parseCompressed: count prefix repeats a coach', () => {
  assert.deepEqual(lib.parseCompressed('2GEN,S1'), ['GEN', 'GEN', 'S1']);
});

test('parseCompressed: ascending and descending ranges', () => {
  assert.deepEqual(lib.parseCompressed('S1-S4'), ['S1', 'S2', 'S3', 'S4']);
  assert.deepEqual(lib.parseCompressed('B3-1'), ['B3', 'B2', 'B1']);
  assert.deepEqual(
    lib.parseCompressed('ENG,LPR,2GEN,HA1,A1,B1-B3,PC,S1-S7,GEN,SLRD'),
    ['ENG', 'LPR', 'GEN', 'GEN', 'HA1', 'A1', 'B1', 'B2', 'B3', 'PC',
      'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'GEN', 'SLRD']
  );
});

test('stripEngRaw / withEng: engine is implicit at position 1', () => {
  assert.equal(lib.stripEngRaw('ENG, eng,SLR,GEN'), 'SLR,GEN');
  assert.equal(lib.stripEngRaw('SLR GEN'), 'SLR,GEN');
  assert.deepEqual(lib.withEng(['SLR', 'GEN']), ['ENG', 'SLR', 'GEN']);
  assert.deepEqual(lib.withEng(['ENG', 'SLR']), ['ENG', 'SLR']);
});

test('expandCoaches: OCR shorthand', () => {
  assert.deepEqual(lib.expandCoaches(['3 GEN']), ['GEN', 'GEN', 'GEN']);
  assert.deepEqual(lib.expandCoaches(['D3-D1']), ['D3', 'D2', 'D1']);
  assert.deepEqual(lib.expandCoaches(['s1-s3', 'a1']), ['S1', 'S2', 'S3', 'A1']);
  assert.equal(lib.expandCoaches(['99 GEN']).length, 30, 'repeat count is capped at 30');
});

test('classOf: colour class per coach type', () => {
  const cases = {
    ENG: 'eng', LPR: 'pwr', EOG: 'pwr', GEN: 'gen', UR: 'gen',
    BE1: 'ac3e', B1: 'ac3', '3A': 'ac3', A1: 'ac2', HA1: 'ac1', H1: 'ac1',
    E1: 'ec', C1: 'cc', D1: 'd2s', PC: 'pc', S7: 'sl', SL: 'sl',
    SLR: 'end', SLRD: 'end', LSLRD: 'end', XYZ: 'unk',
  };
  for (const [code, cls] of Object.entries(cases)) assert.equal(lib.classOf(code), cls, code);
});

test('reverseFormation: engine stays first, the rest flips', () => {
  assert.deepEqual(lib.reverseFormation(L('ENG,A,B,C')), L('ENG,C,B,A'));
  assert.deepEqual(lib.reverseFormation(L('A,B,C')), L('C,B,A'));
  assert.deepEqual(lib.reverseFormation([]), []);
});

test('reverseAligned: flags move with their coaches', () => {
  const codes = L('ENG,A,B,C');
  const flags = [false, true, false, false]; // A changed
  const rc = lib.reverseFormation(codes);
  const rf = lib.reverseAligned(codes, flags);
  assert.equal(rc[rf.indexOf(true)], 'A');
  assert.equal(lib.reverseAligned(codes, null), null);
});

test('diffFormation: identical formation', () => {
  const d = lib.diffFormation(L('ENG,SLR,GEN,S1,S2,GRD'), L('ENG,SLR,GEN,S1,S2,GRD'));
  assert.equal(d.same, true);
  assert.equal(d.reversed, false);
});

test('diffFormation: inserted coach flags only that coach', () => {
  const d = lib.diffFormation(L('ENG,SLR,GEN,S1,S2,S3,B1,GRD'), L('ENG,SLR,GEN,S1,S7,S2,S3,B1,GRD'));
  assert.equal(d.same, false);
  assert.deepEqual(flagged(d.changed), [4]);
  assert.deepEqual(d.removed, []);
});

test('diffFormation: removed coach is reported, nothing flagged', () => {
  const d = lib.diffFormation(L('ENG,SLR,GEN,S1,S2,S3,B1,GRD'), L('ENG,SLR,GEN,S1,S3,B1,GRD'));
  assert.deepEqual(flagged(d.changed), []);
  assert.deepEqual(d.removed, ['S2']);
});

test('diffFormation: swapped coach', () => {
  const d = lib.diffFormation(L('ENG,SLR,GEN,S1,S2,GRD'), L('ENG,SLR,GEN,B1,S2,GRD'));
  assert.deepEqual(flagged(d.changed), [3]);
  assert.deepEqual(d.removed, ['S1']);
});

test('diffFormation: same rake entered from the other end', () => {
  const d = lib.diffFormation(L('ENG,SLR,GEN,S1,S2,GRD'), L('ENG,GRD,S2,S1,GEN,SLR'));
  assert.equal(d.same, true);
  assert.equal(d.reversed, true);
});

test('diffFormation: comparison is case-insensitive', () => {
  assert.equal(lib.diffFormation(L('ENG,s1'), L('ENG,S1')).same, true);
});

test('escapeHtml', () => {
  assert.equal(lib.escapeHtml(`<b>"GDG" & 'UBL'</b>`), '&lt;b&gt;&quot;GDG&quot; &amp; &#39;UBL&#39;&lt;/b&gt;');
});

test('date formatting', () => {
  assert.equal(lib.pad2(5), '05');
  assert.equal(lib.formatDateOnly('2026-09-29'), '29 Sep 2026');
  assert.equal(lib.formatDateTime(new Date(2026, 8, 29, 7, 5)), '29 Sep 2026 07:05');
});

test('reversal colours are plain hex (html2canvas cannot paint color-mix etc.)', () => {
  for (const c of [...lib.REV_COLOURS, lib.LEG0_COLOUR]) {
    for (const v of [c.c, c.dark, c.soft]) assert.match(v, /^#[0-9A-F]{6}$/i);
  }
});
