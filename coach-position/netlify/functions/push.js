// Netlify serverless function — sends push via FCM HTTP v1 API.
//
// Required Netlify env var:
//   FIREBASE_SERVICE_ACCOUNT  — the full service account JSON (as a string)
//   Get it: Firebase Console → Project Settings → Service Accounts
//            → Generate new private key → copy entire file contents
//
// No npm packages needed — uses Node.js built-in crypto + https.

const { createSign } = require('crypto');

const PROJECT_ID = 'coachposition';
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

// Build a signed JWT and exchange it for a short-lived OAuth2 bearer token
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
    scope: SCOPE,
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

async function sendOne(accessToken, token, title, body) {
  const res = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body: body || '' },
        webpush: {
          notification: {
            title,
            body: body || '',
            icon: '/icon.svg',
            badge: '/icon.svg',
            requireInteraction: false,
          },
          fcm_options: { link: '/' },
        },
      },
    }),
  });
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saRaw) {
    return { statusCode: 500, body: JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT env var not set' }) };
  }

  let sa, payload;
  try {
    sa = JSON.parse(saRaw);
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { token, tokens, title, body } = payload;
  if (!title) return { statusCode: 400, body: JSON.stringify({ error: 'title required' }) };

  const allTokens = tokens || (token ? [token] : []);
  if (!allTokens.length) return { statusCode: 400, body: JSON.stringify({ error: 'token or tokens[] required' }) };

  try {
    const accessToken = await getAccessToken(sa);
    const results = await Promise.allSettled(
      allTokens.map(tk => sendOne(accessToken, tk, title, body))
    );
    return { statusCode: 200, body: JSON.stringify({ sent: allTokens.length, results }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
