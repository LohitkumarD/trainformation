/**
 * Import train data from CSV → Firestore /trains collection.
 *
 * Usage:
 *   node scripts/import-trains.js path/to/Coach_Position.csv
 *
 * Requires FIREBASE_SA env var pointing to service account JSON,
 * or place serviceAccount.json in the scripts/ folder.
 *
 * The CSV is the "All trains" / "Cleaned Trains" export from the
 * Coach Position Google Sheet. Columns (0-indexed):
 *   0: Sr | 1: Train No | 2: Start Date | 3: Name | 4: Type
 *   5: Src Name | 6: Src Code | 7: Dst Name | 8: Dst Code
 *   9: PRS Classes | 10: UTS/GEN | 11: Pantry
 *  12: Sched arrival | 15: Sched departure
 *  18: Platform
 *
 * Duplicate train numbers are deduplicated — first clean occurrence wins.
 */

const fs   = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = process.env.FIREBASE_SA || path.join(__dirname, 'serviceAccount.json');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(sa))) });
const db = admin.firestore();

// Minimal CSV parser — handles quoted fields containing commas
function parseCSV(text) {
  const rows = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim()) continue;
    const fields = [];
    let inQ = false, cur = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { fields.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    fields.push(cur.trim());
    rows.push(fields);
  }
  return rows;
}

// Extract HH:MM from "04-07-2026 00:15", "00:15", or "04-Jul 00:15*"
function extractTime(val) {
  if (!val || val === '-' || val === '') return '';
  const m = val.match(/(\d{1,2}:\d{2})/);
  if (!m) return '';
  const [h, min] = m[1].split(':');
  return h.padStart(2, '0') + ':' + min;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/import-trains.js <path/to/Coach_Position.csv>');
    process.exit(1);
  }

  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(text);

  const seen  = new Set();
  const trains = [];

  for (const row of rows) {
    if (row.length < 10) continue;
    const trainNo = row[1]?.trim();
    // Skip header rows or non-numeric train numbers
    if (!trainNo || !/^\d{4,6}$/.test(trainNo)) continue;
    if (seen.has(trainNo)) continue;

    const arr = extractTime(row[12]);
    const dep = extractTime(row[15]);

    // Skip rows where BOTH are blank (likely cancelled header entries)
    if (!arr && !dep) {
      // Try next occurrence instead of skipping entirely — mark as seen
      // so duplicates don't get added but this one still might contribute
      // a time. For simplicity: just store with empty times and move on.
    }

    seen.add(trainNo);

    const classes = [row[9], row[10]].filter(Boolean).join(' ').replace(/"/g, '').trim();

    trains.push({
      no:      trainNo,
      name:    (row[3] || '').trim(),
      type:    (row[4] || '').trim(),
      srcName: (row[5] || '').trim(),
      srcCode: (row[6] || '').trim(),
      dstName: (row[7] || '').trim(),
      dstCode: (row[8] || '').trim(),
      classes,
      pantry:  (row[11] || '').trim().toUpperCase() === 'PC',
      arr,
      dep,
      station: 'SBC',
    });
  }

  console.log(`Parsed ${trains.length} unique trains from ${rows.length} rows.`);

  // Batch-write — Firestore max 500 per batch
  let written = 0;
  for (let i = 0; i < trains.length; i += 500) {
    const batch = db.batch();
    for (const t of trains.slice(i, i + 500)) {
      batch.set(db.collection('trains').doc(t.no), t);
    }
    await batch.commit();
    written += Math.min(500, trains.length - i);
    console.log(`  Uploaded ${written}/${trains.length}…`);
  }

  console.log(`Done. ${trains.length} trains written to Firestore /trains collection.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
