/**
 * One-time script: load Indian Railways timetable from datameet/railways → Firestore.
 *
 * Source: https://github.com/datameet/railways (free, no API key needed)
 *
 * Usage:
 *   npm install node-fetch firebase-admin   (run once in scripts/)
 *   FIREBASE_SA=path/to/serviceAccount.json node scripts/fetch-timetable.js
 *
 * What it does:
 *   1. Downloads schedules.json (~82 MB, 417k records) from datameet/railways
 *   2. Groups all stops by train number
 *   3. Keeps trains that stop at any of the configured STATIONS
 *   4. Saves to Firestore /timetable/{trainNo}
 *
 * Firestore document shape:
 *   {
 *     trainNo: "17377",
 *     trainName: "BJP MAQ EXP",
 *     stationCodes: ["BJP","RNR","DVG",...],   // for array-contains queries
 *     stoppages: [
 *       { code:"BJP", name:"Bijapur", arr:null, dep:"06:00", day:1 },
 *       { code:"DVG", name:"Davangere", arr:"09:15", dep:"09:17", day:1 },
 *       ...
 *     ],
 *     source: "datameet/railways"
 *   }
 */

const fetch = require('node-fetch');
const admin = require('firebase-admin');
const fs    = require('fs');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const FIREBASE_SA = process.env.FIREBASE_SA;
if (!FIREBASE_SA) { console.error('Set FIREBASE_SA env var (path to service account JSON)'); process.exit(1); }

// Stations to filter — keep any train that stops at at least one of these
const STATIONS = new Set([
  'DVG',  // Davangere
  'RNR',  // Ranibennur
  'HRR',  // Harihar
  'BIRR', // Birur
  'CDH',  // Chikodi Road
  'ASK',  // Arsikere
  'TRR',  // Tarikere
  'KR',   // Kadur
  'CQK',  // Chikkamagaluru
  'UBL',  // Hubballi
  'BGM',  // Belagavi
  'SBC',  // Bangalore City
  'YPR',  // Yesvantpur
]);

const SCHEDULES_URL =
  'https://raw.githubusercontent.com/datameet/railways/master/schedules.json';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function toHHMM(t) {
  if (!t || t === 'None') return null;
  return String(t).slice(0, 5); // "09:15:00" → "09:15"
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const sa = JSON.parse(fs.readFileSync(FIREBASE_SA, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();

  console.log('Step 1: Downloading schedules.json from datameet/railways...');
  const res = await fetch(SCHEDULES_URL);
  if (!res.ok) { console.error(`Download failed: ${res.status} ${res.statusText}`); process.exit(1); }
  const text = await res.text();
  console.log(`  Downloaded ${(text.length / 1e6).toFixed(1)} MB`);

  console.log('\nStep 2: Parsing & grouping by train...');
  const schedules = JSON.parse(text);
  console.log(`  Total records: ${schedules.length}`);

  const trainMap = {}; // trainNo → { trainName, stops[] }

  for (const s of schedules) {
    const trainNo = String(s.train_number || '').trim();
    if (!trainNo) continue;

    if (!trainMap[trainNo]) {
      trainMap[trainNo] = { trainName: (s.train_name || '').trim(), stops: [] };
    }

    trainMap[trainNo].stops.push({
      code: (s.station_code || '').trim().toUpperCase(),
      name: (s.station_name || '').trim(),
      arr:  toHHMM(s.arrival),
      dep:  toHHMM(s.departure),
      day:  Number(s.day) || 1,
    });
  }

  console.log(`  Total unique trains in dataset: ${Object.keys(trainMap).length}`);

  // Keep only trains that stop at one of our stations
  const relevant = Object.entries(trainMap).filter(([, t]) =>
    t.stops.some(s => STATIONS.has(s.code))
  );
  console.log(`  Trains stopping at configured stations: ${relevant.length}`);

  console.log('\nStep 3: Building Firestore documents...');
  const batch = relevant.map(([trainNo, t]) => {
    // Sort all stops by day then time
    const stoppages = t.stops
      .filter(s => s.code)
      .sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return (a.dep || a.arr || '99:99').localeCompare(b.dep || b.arr || '99:99');
      });

    return {
      trainNo,
      trainName: t.trainName,
      stationCodes: [...new Set(stoppages.map(s => s.code))],
      stoppages,
      fetchedAt: new Date().toISOString(),
      source: 'datameet/railways',
    };
  });

  console.log(`\nStep 4: Saving ${batch.length} trains to Firestore /timetable...`);

  const CHUNK = 400;
  for (let i = 0; i < batch.length; i += CHUNK) {
    const chunk = batch.slice(i, i + CHUNK);
    const wb = db.batch();
    chunk.forEach(doc =>
      wb.set(db.collection('timetable').doc(doc.trainNo), doc, { merge: true })
    );
    await wb.commit();
    console.log(`  Saved ${Math.min(i + CHUNK, batch.length)}/${batch.length}`);
  }

  console.log('\nDone! Timetable loaded into Firestore /timetable collection.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
