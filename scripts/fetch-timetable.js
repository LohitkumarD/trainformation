/**
 * One-time script: fetch train schedules from RapidAPI and save to Firestore.
 *
 * Setup:
 *   npm install node-fetch firebase-admin   (run once in this folder)
 *
 * Usage:
 *   RAPIDAPI_KEY=your_key \
 *   FIREBASE_SA=path/to/serviceAccount.json \
 *   node scripts/fetch-timetable.js
 *
 * What it does:
 *   1. For each station code in STATIONS list → fetch all trains at that station
 *   2. Collect unique train numbers across all stations
 *   3. For each train → fetch full stoppage schedule
 *   4. Save to Firestore /timetable/{trainNo}
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
 *     ]
 *   }
 */

const fetch = require('node-fetch');
const admin = require('firebase-admin');
const fs = require('fs');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const FIREBASE_SA  = process.env.FIREBASE_SA;   // path to service account JSON

if (!RAPIDAPI_KEY) { console.error('Set RAPIDAPI_KEY env var'); process.exit(1); }
if (!FIREBASE_SA)  { console.error('Set FIREBASE_SA env var (path to service account JSON)'); process.exit(1); }

// Add/remove station codes for your area
const STATIONS = [
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
];

const RAPIDAPI_HOST = 'irctc1.p.rapidapi.com';
const HEADERS = {
  'x-rapidapi-key':  RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
};

// ─── API CALLS ────────────────────────────────────────────────────────────────

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getTrainsAtStation(stationCode) {
  // getLiveStation with hours=240 (~10 days) discovers all trains at this station
  const url = `https://${RAPIDAPI_HOST}/api/v3/getLiveStation?stationCode=${stationCode}&hours=240`;
  const res = await fetch(url, { headers: HEADERS });
  const json = await res.json();
  if (!json.status) { console.warn(`  ⚠ No data for station ${stationCode}:`, json.message || ''); return []; }
  return (json.data || []).map(t => ({
    trainNo:   String(t.train_number || t.trainNo || t.trainNumber || '').trim(),
    trainName: (t.train_name || t.trainName || '').trim(),
  })).filter(t => t.trainNo);
}

async function getTrainSchedule(trainNo) {
  const url = `https://${RAPIDAPI_HOST}/api/v3/getTrainSchedule?trainNo=${trainNo}`;
  const res = await fetch(url, { headers: HEADERS });
  const json = await res.json();
  if (!json.status) { console.warn(`  ⚠ No schedule for ${trainNo}:`, json.message || ''); return null; }
  return json.data || null;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  // Init Firebase Admin
  const sa = JSON.parse(fs.readFileSync(FIREBASE_SA, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();

  console.log('Step 1: Fetching trains at each station...\n');

  const trainMap = {}; // trainNo → trainName

  for (const code of STATIONS) {
    process.stdout.write(`  Station ${code} ... `);
    try {
      const trains = await getTrainsAtStation(code);
      trains.forEach(t => { if (!trainMap[t.trainNo]) trainMap[t.trainNo] = t.trainName; });
      console.log(`${trains.length} trains`);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
    await sleep(300); // be kind to the API
  }

  const allTrainNos = Object.keys(trainMap);
  console.log(`\nTotal unique trains: ${allTrainNos.length}\n`);
  console.log('Step 2: Fetching full schedule for each train...\n');

  const batch = [];
  let done = 0;

  for (const trainNo of allTrainNos) {
    process.stdout.write(`  [${++done}/${allTrainNos.length}] Train ${trainNo} ... `);
    try {
      const schedule = await getTrainSchedule(trainNo);
      if (!schedule || !schedule.length) { console.log('no data'); continue; }

      const stoppages = schedule.map(s => ({
        code: (s.station_code || s.stationCode || '').trim().toUpperCase(),
        name: (s.station_name || s.stationName || '').trim(),
        arr:  s.arrival_time   || s.arrivalTime  || null,
        dep:  s.departure_time || s.departureTime || null,
        day:  s.day_count      || s.dayCount      || 1,
      })).filter(s => s.code);

      const stationCodes = [...new Set(stoppages.map(s => s.code))];

      batch.push({
        trainNo,
        trainName: trainMap[trainNo] || '',
        stationCodes,
        stoppages,
        fetchedAt: new Date().toISOString(),
      });

      console.log(`${stoppages.length} stops`);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
    await sleep(300);
  }

  console.log(`\nStep 3: Saving ${batch.length} trains to Firestore...\n`);

  // Write in chunks of 500 (Firestore batch limit)
  const CHUNK = 400;
  for (let i = 0; i < batch.length; i += CHUNK) {
    const chunk = batch.slice(i, i + CHUNK);
    const wb = db.batch();
    chunk.forEach(doc => {
      wb.set(db.collection('timetable').doc(doc.trainNo), doc, { merge: true });
    });
    await wb.commit();
    console.log(`  Saved ${i + chunk.length}/${batch.length}`);
  }

  console.log('\nDone! Timetable loaded into Firestore /timetable collection.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
