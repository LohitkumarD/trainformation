// Coach Position — pure helpers shared by index.html and the unit tests.
// No DOM or Firebase access in here: everything is a plain function of its
// inputs, so it can be tested with `node --test` (see tests/lib.test.js).
// Loaded as a classic <script> before the app script, so these are globals.

// ─── Date formatting ─────────────────────────────────────────────────────────
function pad2(n) { return String(n).padStart(2, '0'); }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDateOnly(iso) {
  const [y, m, dd] = iso.split('-');
  return `${parseInt(dd,10)} ${MONTHS[parseInt(m,10)-1]} ${y}`;
}
function formatTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
function formatDateTime(date) {
  return `${parseInt(date.getDate(),10)} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ${formatTime(date)}`;
}

// ─── Coach list parsing ──────────────────────────────────────────────────────
function parseCompressed(input) {
  // Commas AND spaces both separate coaches (pasted lists often use spaces)
  const tokens = (input || '').split(/[\s,]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
  const out = [];
  for (const tok of tokens) {
    let m = tok.match(/^(\d+)([A-Z]+\d*)$/);
    if (m) { for (let i = 0; i < parseInt(m[1], 10); i++) out.push(m[2]); continue; }
    m = tok.match(/^([A-Z]+)(\d+)-(?:[A-Z]+)?(\d+)$/);
    if (m) {
      const prefix = m[1];
      let s = parseInt(m[2], 10), e = parseInt(m[3], 10);
      if (s <= e) { for (let i = s; i <= e; i++) out.push(prefix + i); }
      else { for (let i = s; i >= e; i--) out.push(prefix + i); }
      continue;
    }
    out.push(tok);
  }
  return out;
}
// ENG is implicit in the editors — engine is always position 1, never typed by staff
function stripEngRaw(raw) {
  const toks = (raw || '').split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
  while (toks.length && toks[0].toUpperCase() === 'ENG') toks.shift();
  return toks.join(',');
}
function withEng(codes) {
  return (codes.length && codes[0].toUpperCase() === 'ENG') ? codes : ['ENG', ...codes];
}

function classOf(code) {
  if (code === 'ENG') return 'eng';
  if (['LPR', 'VP', 'PWR', 'EOG', 'HOG'].includes(code)) return 'pwr';
  if (/^(GEN|GS|UR)$/.test(code)) return 'gen';
  // AC classes — order matters (most specific first)
  if (/^(BE\d*|3E)$/.test(code)) return 'ac3e';        // 3AC Economy
  if (/^(B\d*|3A)$/.test(code)) return 'ac3';           // 3AC sleeper
  if (/^(A\d*|2A)$/.test(code)) return 'ac2';           // 2AC sleeper
  if (/^(H\d+|HA\d*|1A|M\d*)$/.test(code)) return 'ac1'; // 1AC / composite
  if (/^(E\d*|EC)$/.test(code)) return 'ec';            // Executive Chair Car
  if (/^(C\d*|CC)$/.test(code)) return 'cc';            // AC Chair Car
  if (/^(D\d*|2S)$/.test(code)) return 'd2s';           // 2nd Sitting / D-class
  if (code === 'PC') return 'pc';
  if (/^(S\d+|SL)$/.test(code)) return 'sl';            // Sleeper
  if (/^(SLR|SLRD|LSLR|LSLRD)\d*$/.test(code)) return 'end';
  if (isExtraCode(code)) return 'xtra';                 // sick / repair / empty — not for passengers
  return 'unk';
}

// Expand shorthand coach notations returned by OCR:
//   "7 GEN" → 7 × GEN,  "D5-D1" → D5..D1,  "S1-S6" → S1..S6
function expandCoaches(list) {
  const out = [];
  for (const raw of list) {
    const c = String(raw).toUpperCase().trim();
    const mul = c.match(/^(\d+)\s+([A-Z0-9]+)$/);
    if (mul) {
      const n = Math.min(parseInt(mul[1]), 30);
      for (let i = 0; i < n; i++) out.push(mul[2]);
      continue;
    }
    const rng = c.match(/^([A-Z]{1,3})(\d+)-([A-Z]{1,3})(\d+)$/);
    if (rng && rng[1] === rng[3]) {
      const prefix = rng[1], from = parseInt(rng[2]), to = parseInt(rng[4]);
      const step = from <= to ? 1 : -1;
      for (let i = from; i !== to + step; i += step) out.push(prefix + i);
      continue;
    }
    out.push(c);
  }
  return out;
}

// ─── Formation reversal + comparison ─────────────────────────────────────────
function reverseFormation(codes) {
  if (!codes.length) return codes;
  return codes[0].toUpperCase() === 'ENG'
    ? [codes[0], ...codes.slice(1).reverse()]
    : [...codes].reverse();
}

// Reverse a per-coach array (e.g. changed flags) exactly as reverseFormation
// reverses the matching codes, so flags stay attached to their coaches.
function reverseAligned(codes, arr) {
  if (!arr) return arr;
  return codes.length && String(codes[0]).toUpperCase() === 'ENG'
    ? [arr[0], ...arr.slice(1).reverse()]
    : [...arr].reverse();
}

// Which coaches in `curr` differ from `prev`. Uses the longest common
// subsequence so one inserted/removed coach doesn't flag every coach after it.
// Returns { changed: bool per coach in curr, removed: codes only in prev }.
function lcsDiff(prev, curr) {
  const a = prev.map(c => String(c).toUpperCase());
  const b = curr.map(c => String(c).toUpperCase());
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const changed = new Array(m).fill(false), removed = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) removed.push(prev[i++]);
    else changed[j++] = true;
  }
  while (i < n) removed.push(prev[i++]);
  while (j < m) changed[j++] = true;
  return { changed, removed };
}

// Compare a formation with the previous one. If the same rake was simply
// entered from the other end, report that instead of flagging every coach.
function diffFormation(prev, curr) {
  const direct = { ...lcsDiff(prev, curr), codes: curr };
  const count = d => d.changed.filter(Boolean).length + d.removed.length;
  if (count(direct) === 0) return { ...direct, same: true, reversed: false };
  const rev = { ...lcsDiff(reverseFormation(prev), curr), codes: curr };
  if (count(rev) === 0) return { ...rev, same: true, reversed: true };
  return { ...direct, same: false, reversed: false };
}

// ─── Extra (non-passenger) coaches ───────────────────────────────────────────
// Sick, repair or empty coaches sometimes attached for the day. Staff can type
// these codes in a formation, and the "extra coaches" report inserts them.
const EXTRA_KINDS = { SICK: 'Sick / repair', EMPTY: 'Empty', XTRA: 'Extra' };
function isExtraCode(code) {
  return /^(XTRA|SICK|EMPTY|DMG)\d*$/.test(String(code).toUpperCase());
}

// ─── RailRadar data (normalised) ─────────────────────────────────────────────
// Shrink RailRadar's /v1/trains/{no} reply to what the app uses. Legs are
// split at reversal stations; each leg's formation is RailRadar's scheduled
// order for that leg (engine first).
function normalizeRailRadarTrain(json) {
  const d = json && json.data;
  if (!d || !d.train) return null;
  const t = d.train;
  const split = (cp) => (cp ? String(cp).split('-').map(c => c.trim().toUpperCase()).filter(Boolean) : null);
  const route = Array.isArray(d.route) ? d.route : [];
  const halts = route.filter(r => r.isHalt || r.isReversal).map(r => ({
    c: r.station.code, n: r.station.name,
    a: r.arrival || null, d: r.departure || null,
    ad: r.arrivalDay || null, dd: r.departureDay || null,
    pf: r.platform || null,
    leg: r.isReversal ? (r.legIndex || 0) + 1 : (r.legIndex || 0),
    rev: !!r.isReversal,
  }));
  const revStations = route.filter(r => r.isReversal).map(r => r.station.code);
  const legCount = revStations.length + 1;
  const legs = [];
  for (let L = 0; L < legCount; L++) {
    let cp = null;
    if (L === 0) cp = split(t.coachPosition);
    if (!cp && L > 0) {
      // Formation departing the reversal station that starts this leg
      const r = route.find(x => x.isReversal && (x.legIndex || 0) === L - 1 && x.coachPosition);
      if (r) cp = split(r.coachPosition);
    }
    if (!cp) {
      const r = route.find(x => (x.legIndex || 0) === L && !x.isReversal && x.coachPosition);
      if (r) cp = split(r.coachPosition);
    }
    legs.push(cp || []);
  }
  return {
    no: String(t.number),
    name: t.name || '',
    src: t.source ? t.source.code : '',
    dst: t.destination ? t.destination.code : '',
    runDays: t.runDays || [],
    reversalStations: revStations,
    stops: [t.source ? t.source.code : 'ORIGIN', ...revStations, t.destination ? t.destination.code : 'DESTINATION'],
    legs,
    halts,
  };
}

// Shrink RailRadar's /v1/stations/{code}/trains reply.
function normalizeRailRadarBoard(json) {
  const d = json && json.data;
  if (!d || !d.station) return null;
  return {
    code: d.station.code,
    name: d.station.name || d.station.code,
    trains: (d.trains || []).map(x => ({
      no: String(x.train.number),
      name: x.train.name || '',
      type: x.train.type || '',
      src: x.train.source ? x.train.source.code : '',
      dst: x.train.destination ? x.train.destination.code : '',
      runDays: x.train.runDays || [],
      a: x.stop.arrival || null, d: x.stop.departure || null,
      ad: x.stop.arrivalDay || null, dd: x.stop.departureDay || null,
    })),
  };
}

// Trains from a station board that call there on `date` (a Date), sorted by
// time. runDays are the days the train leaves its origin, so a train that
// reaches this station on day 2 of its run is "today's" if it left yesterday.
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
function trainsOnDate(board, date) {
  if (!board) return [];
  const out = [];
  for (const t of board.trains) {
    const day = t.ad || t.dd || 1;
    const origin = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (day - 1));
    if (!t.runDays.length || t.runDays.includes(DAY_KEYS[origin.getDay()])) out.push(t);
  }
  const mins = (t) => { const [h, m] = String(t.a || t.d || '00:00').split(':').map(Number); return h * 60 + m; };
  return out.sort((x, y) => mins(x) - mins(y));
}

// Which leg a station is on (0-based), from normalised RailRadar data.
// At a reversal station this is the leg that departs from it.
function legOfStation(info, code) {
  if (!info || !code) return null;
  const h = info.halts.find(x => x.c === String(code).toUpperCase());
  return h ? h.leg : null;
}

// ─── Journey legs ────────────────────────────────────────────────────────────
// Build the formation for every leg of a journey.
//   entry:   staff-entered coaches (as seen) or null
//   seenLeg: which leg the entry was seen on (0 = first leg)
//   sched:   normalised RailRadar info, or null
//   revStations/from/to: used when there's no RailRadar data
//   changed: per-coach "changed since last time" flags for the entry
//   extras:  [{ at, end: 'engine'|'rear', count, kind }] — today-only coaches
// Returns { stops, legs: [{codes, flags, source}], boundaries: [{station, type, extras}] }
//   source: 'seen' | 'derived' (flipped from a seen leg) | 'scheduled'
//   type:   'reversal' | 'change' (scheduled formation change) | 'extra'
function computeLegs({ entry = null, seenLeg = 0, sched = null, revStations = [], from = '', to = '', changed = null, extras = [] } = {}) {
  const same = (a, b) => a.length === b.length && a.every((c, i) => String(c).toUpperCase() === String(b[i]).toUpperCase());
  const useSched = !!(sched && sched.legs && sched.legs.length === sched.stops.length - 1 && sched.legs.every(l => l.length));
  let stops = useSched ? [...sched.stops] : [from || 'ORIGIN', ...revStations, to || 'DESTINATION'];
  let n = stops.length - 1;
  let types = [];
  for (let i = 0; i < n - 1; i++) {
    types.push(useSched && !same(reverseFormation(sched.legs[i]), sched.legs[i + 1]) ? 'change' : 'reversal');
  }
  let legs = new Array(n).fill(null);
  if (entry && entry.length) {
    const k = Math.max(0, Math.min(n - 1, seenLeg || 0));
    legs[k] = { codes: [...entry], flags: changed ? [...changed] : null, source: 'seen' };
    for (let i = k; i < n - 1; i++) {
      const cur = legs[i];
      legs[i + 1] = types[i] === 'reversal'
        ? { codes: reverseFormation(cur.codes), flags: reverseAligned(cur.codes, cur.flags), source: cur.source === 'scheduled' ? 'scheduled' : 'derived' }
        : { codes: [...sched.legs[i + 1]], flags: null, source: 'scheduled' };
    }
    for (let i = k - 1; i >= 0; i--) {
      const nxt = legs[i + 1];
      legs[i] = types[i] === 'reversal'
        ? { codes: reverseFormation(nxt.codes), flags: reverseAligned(nxt.codes, nxt.flags), source: nxt.source === 'scheduled' ? 'scheduled' : 'derived' }
        : { codes: [...sched.legs[i]], flags: null, source: 'scheduled' };
    }
  } else if (useSched) {
    legs = sched.legs.map(c => ({ codes: [...c], flags: null, source: 'scheduled' }));
  } else {
    return { stops, legs: [], boundaries: [] };
  }
  let boundaries = types.map((type, i) => ({ station: stops[i + 1], type, extras: [] }));

  for (const ex of (extras || [])) {
    const at = String(ex.at || '').toUpperCase();
    const count = Math.max(0, Math.min(10, parseInt(ex.count, 10) || 0));
    if (!at || !count) continue;
    // j = first leg that carries the extra coaches
    let j = stops.indexOf(at);
    if (j === n) continue;                      // attached at the destination: no effect
    if (j === -1) {
      // Attached at an ordinary halt: split that leg in two there.
      const L = legOfStation(sched, at);
      if (L === null || L >= n) continue;       // station not on this route
      stops.splice(L + 1, 0, at);
      legs.splice(L + 1, 0, { ...legs[L], codes: [...legs[L].codes], flags: legs[L].flags ? [...legs[L].flags] : null });
      boundaries.splice(L, 0, { station: at, type: 'extra', extras: [] });
      types.splice(L, 0, 'extra');
      n += 1;
      j = L + 1;
    }
    if (j > 0) boundaries[j - 1].extras.push({ ...ex, at, count });
    const kind = EXTRA_KINDS[String(ex.kind || '').toUpperCase()] ? String(ex.kind).toUpperCase() : 'XTRA';
    let side = ex.end === 'rear' ? 'rear' : 'engine';
    for (let m = j; m < n; m++) {
      if (m > j && types[m - 1] === 'reversal') side = side === 'engine' ? 'rear' : 'engine';
      const leg = legs[m];
      if (leg.codes.some(isExtraCode)) continue;   // staff already entered them here
      const add = new Array(count).fill(kind);
      const addF = new Array(count).fill(false);
      const pos = side === 'rear' ? leg.codes.length
        : (leg.codes.length && String(leg.codes[0]).toUpperCase() === 'ENG' ? 1 : 0);
      leg.codes.splice(pos, 0, ...add);
      if (leg.flags) leg.flags.splice(pos, 0, ...addF);
      leg.extraAdded = true;
    }
    // Legs before the attach station never had them: strip any that were
    // carried back from a later seen leg.
    for (let m = 0; m < j; m++) {
      const leg = legs[m];
      if (leg.source === 'seen' || !leg.codes.some(isExtraCode)) continue;
      const keep = leg.codes.map(c => !isExtraCode(c));
      leg.codes = leg.codes.filter((_, i) => keep[i]);
      if (leg.flags) leg.flags = leg.flags.filter((_, i) => keep[i]);
    }
  }
  return { stops, legs, boundaries };
}

// ─── HTML + colours ──────────────────────────────────────────────────────────
function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const REV_COLOURS = [
  { c: '#7C3AED', dark: '#5B21B6', soft: '#F3EEFF' }, // purple
  { c: '#0D9488', dark: '#115E59', soft: '#E6F7F5' }, // teal
  { c: '#DB2777', dark: '#9D174D', soft: '#FDEBF3' }, // pink
  { c: '#2563EB', dark: '#1E40AF', soft: '#E8EFFE' }, // blue
];
const LEG0_COLOUR = { c: '#D97706', dark: '#92400E', soft: '#FEF3E2' };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { pad2, MONTHS, formatDateOnly, formatTime, formatDateTime, parseCompressed, stripEngRaw, withEng, classOf, expandCoaches, reverseFormation, reverseAligned, lcsDiff, diffFormation, escapeHtml, REV_COLOURS, LEG0_COLOUR,
    EXTRA_KINDS, isExtraCode, normalizeRailRadarTrain, normalizeRailRadarBoard, trainsOnDate, legOfStation, computeLegs };
}
