/**
 * RailRadar lookups with a shared Firestore cache, so every train/station is
 * fetched from RailRadar at most once per refresh period no matter how many
 * people open it.
 *
 *   GET ?train=17377   → normalised train info (route, legs, reversal
 *                         stations, scheduled formation per leg, halts +
 *                         platforms). Cached in rr_trains/{no}, refreshed
 *                         after 30 days.
 *   GET ?board=RNR     → normalised list of trains calling at a station.
 *                         Cached in rr_stations/{code}, refreshed after 7 days.
 *   &refresh=1         → force a RailRadar refetch (only if the cached copy
 *                         is over an hour old, so it can't burn the quota).
 *
 * Netlify env vars:
 *   RAILRADAR_API_KEY         — required
 *   FIREBASE_SERVICE_ACCOUNT  — service account JSON (same one push.js
 *                               uses); without it lookups still work, just
 *                               uncached.
 *
 * The cache is written only here, with the service account; Firestore rules
 * let clients read it but not write it.
 */
const { createSign } = require('crypto');
const { normalizeRailRadarTrain, normalizeRailRadarBoard } = require('../../lib.js');

const PROJECT_ID = 'coachposition';
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DAY = 24 * 60 * 60 * 1000;
const TTL = { train: 30 * DAY, board: 7 * DAY };
const MIN_REFRESH_AGE = 60 * 60 * 1000;

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });

let _token = null; // { value, exp } — reused while the function instance is warm
async function getAccessToken() {
  if (_token && _token.exp > Date.now() + 60_000) return _token.value;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: sa.client_email, sub: sa.client_email, aud: TOKEN_URL,
    iat: now, exp: now + 3600, scope: 'https://www.googleapis.com/auth/datastore',
  })}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const jwt = `${unsigned}.${signer.sign(sa.private_key, 'base64url')}`;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token error');
  _token = { value: data.access_token, exp: Date.now() + 3500_000 };
  return _token.value;
}

// Cache docs hold the normalised data as one JSON string + a timestamp,
// which keeps them simple to read from the app too.
async function readCache(path) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null;
  try {
    const res = await fetch(`${FS_BASE}/${path}`, { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
    if (!res.ok) return null;
    const doc = await res.json();
    const json = doc.fields?.json?.stringValue;
    const fetchedAt = Number(doc.fields?.fetchedAt?.integerValue || 0);
    return json ? { data: JSON.parse(json), fetchedAt } : null;
  } catch (e) {
    console.error('[rail-info] cache read failed:', e.message);
    return null;
  }
}

async function writeCache(path, data, fetchedAt) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return;
  try {
    const res = await fetch(`${FS_BASE}/${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        json: { stringValue: JSON.stringify(data) },
        fetchedAt: { integerValue: String(fetchedAt) },
      } }),
    });
    if (!res.ok) console.error('[rail-info] cache write failed:', res.status, await res.text());
  } catch (e) {
    console.error('[rail-info] cache write failed:', e.message);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  const q = event.queryStringParameters || {};

  let kind, id, path, url, normalize;
  if (q.train) {
    id = q.train.trim();
    if (!/^\d{5}$/.test(id)) return reply(400, { error: 'Invalid train number — use 5 digits' });
    kind = 'train'; path = `rr_trains/${id}`; normalize = normalizeRailRadarTrain;
    url = `https://api.railradar.in/v1/trains/${id}`;
  } else if (q.board) {
    id = q.board.trim().toUpperCase();
    if (!/^[A-Z]{2,7}$/.test(id)) return reply(400, { error: 'Invalid station code' });
    kind = 'board'; path = `rr_stations/${id}`; normalize = normalizeRailRadarBoard;
    url = `https://api.railradar.in/v1/stations/${encodeURIComponent(id)}/trains`;
  } else {
    return reply(400, { error: 'Provide ?train=17377 or ?board=RNR' });
  }

  const cached = await readCache(path);
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;
  const wantRefresh = q.refresh === '1' && age > MIN_REFRESH_AGE;
  if (cached && age < TTL[kind] && !wantRefresh) {
    return reply(200, { source: 'cache', fetchedAt: cached.fetchedAt, data: cached.data });
  }

  const apiKey = process.env.RAILRADAR_API_KEY;
  const stale = (why) => cached
    ? reply(200, { source: 'cache', stale: true, warning: why, fetchedAt: cached.fetchedAt, data: cached.data })
    : reply(502, { error: why });
  if (!apiKey) return stale('RAILRADAR_API_KEY not set in Netlify environment variables');

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` } });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { return stale('RailRadar returned non-JSON'); }
    if (res.status === 404) return reply(404, { error: kind === 'train' ? 'Train not found' : 'Station not found' });
    if (!res.ok) return stale(`RailRadar error ${res.status}`);
    const data = normalize(json);
    if (!data) return stale('RailRadar reply missing expected data');
    const fetchedAt = Date.now();
    await writeCache(path, data, fetchedAt);
    return reply(200, { source: 'railradar', fetchedAt, data });
  } catch (e) {
    return stale(e.message);
  }
};
