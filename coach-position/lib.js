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
  module.exports = { pad2, MONTHS, formatDateOnly, formatTime, formatDateTime, parseCompressed, stripEngRaw, withEng, classOf, expandCoaches, reverseFormation, reverseAligned, lcsDiff, diffFormation, escapeHtml, REV_COLOURS, LEG0_COLOUR };
}
