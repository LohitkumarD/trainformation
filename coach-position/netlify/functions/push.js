// Netlify serverless function — sends push via FCM HTTP v1 API.
//
// Required Netlify env var:
//   FIREBASE_SERVICE_ACCOUNT  — the full service account JSON (as a string)
//   Get it: Firebase Console → Project Settings → Service Accounts → Generate new private key
//
// POST body (single token):  { token, title, body }
// POST body (broadcast):     { broadcast: true, title, body }
//   — broadcast reads all /fcm_tokens docs from Firestore and sends to all

const { createSign, randomBytes } = require('crypto');

const PROJECT_ID = 'coachposition';
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
// Both FCM + Firestore scopes so one token works for reading tokens + sending
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore';
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email, aud: TOKEN_URL,
    iat: now, exp: now + 3600, scope: SCOPE,
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const sig = signer.sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${sig}`;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Fetch all FCM tokens from a Firestore collection (handles pagination).
// `registered` reflects whether the device was signed in as staff/admin at
// the time it registered for push — lets a broadcast report who it actually
// reached, not just how many devices.
async function fetchAllTokens(accessToken, collection = 'fcm_tokens') {
  const entries = []; // [{docName, token, registered}]
  let pageToken = '';
  do {
    const url = `${FS_BASE}/${collection}?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    if (data.documents) {
      for (const doc of data.documents) {
        const t = doc.fields?.token?.stringValue;
        if (t) entries.push({ docName: doc.name, token: t, registered: !!doc.fields?.registered?.booleanValue });
      }
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return entries;
}

async function deleteDoc(accessToken, docName) {
  await fetch(`https://firestore.googleapis.com/v1/${docName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}

async function sendOne(accessToken, token, title, body, nid) {
  const res = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body: body || '' },
        webpush: {
          notification: { title, body: body || '', icon: '/icon.svg', badge: '/icon.svg', requireInteraction: false },
          fcm_options: { link: nid ? `/?nid=${nid}` : '/' },
        },
      },
    }),
  });
  return res.json();
}

// Firestore REST field-value wrapper
function fv(v) {
  if (typeof v === 'number') return { integerValue: String(Math.trunc(v)) };
  return { stringValue: String(v == null ? '' : v) };
}

async function logNotification(accessToken, nid, { kind, title, body, trainNo, sent, failed, total, sentRegistered, sentAnonymous }) {
  try {
    await fetch(`${FS_BASE}/notification_log?documentId=${nid}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          kind: fv(kind || 'direct'),
          title: fv(title),
          body: fv(body || ''),
          trainNo: fv(trainNo || ''),
          sentAt: { timestampValue: new Date().toISOString() },
          sent: fv(sent), failed: fv(failed), total: fv(total),
          sentRegistered: fv(sentRegistered || 0), sentAnonymous: fv(sentAnonymous || 0),
          openCount: fv(0),
        },
      }),
    });
  } catch (_) { /* logging is best-effort */ }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };

  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saRaw) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT not set' }) };

  let sa, payload;
  try { sa = JSON.parse(saRaw); payload = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { token, tokens, broadcast, title, body, trainNo } = payload;
  if (!title) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'title required' }) };

  const nid = randomBytes(9).toString('hex');
  const kind = payload.kind || (broadcast ? 'broadcast' : payload.target === 'admin' ? 'admin' : 'direct');

  try {
    const accessToken = await getAccessToken(sa);

    let entries; // [{docName, token, registered}]
    if (broadcast) {
      entries = await fetchAllTokens(accessToken, 'fcm_tokens');
    } else if (payload.target === 'admin') {
      // admin_fcm_tokens only ever holds signed-in admins
      entries = (await fetchAllTokens(accessToken, 'admin_fcm_tokens')).map(e => ({ ...e, registered: true }));
    } else {
      const allTokens = tokens || (token ? [token] : []);
      if (!allTokens.length) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'token or tokens[] required' }) };
      entries = allTokens.map(t => ({ docName: null, token: t, registered: null })); // targeted sends — registration status unknown here
    }

    if (!entries.length) {
      await logNotification(accessToken, nid, { kind, title, body, trainNo, sent: 0, failed: 0, total: 0 });
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ sent: 0, failed: 0, total: 0, nid }) };
    }

    // Send in parallel batches of 50
    const BATCH = 50;
    let sent = 0, failed = 0, sentRegistered = 0, sentAnonymous = 0;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(e => sendOne(accessToken, e.token, title, body, nid))
      );
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === 'fulfilled') {
          const d = r.value;
          if (d.error?.details?.[0]?.errorCode === 'UNREGISTERED' ||
              d.error?.details?.[0]?.errorCode === 'INVALID_ARGUMENT') {
            // Clean up stale token
            if (batch[j].docName) deleteDoc(accessToken, batch[j].docName);
            failed++;
          } else {
            sent++;
            if (batch[j].registered === true) sentRegistered++;
            else if (batch[j].registered === false) sentAnonymous++;
          }
        } else {
          failed++;
        }
      }
    }

    await logNotification(accessToken, nid, { kind, title, body, trainNo, sent, failed, total: entries.length, sentRegistered, sentAnonymous });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ sent, failed, total: entries.length, sentRegistered, sentAnonymous, nid }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
