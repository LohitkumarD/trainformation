/**
 * Proxy to erail.in API — covers ALL 22,000+ Indian Railway stations.
 * Keeps the API key server-side; the PWA calls /.netlify/functions/train-schedule
 *
 * Netlify env var (optional): ERAIL_API_KEY
 * Get a free key at: http://api.erail.in/auth/register
 * (works without a key using the public demo access, but may be rate-limited)
 *
 * Usage:
 *   ?station=RNR     →  trains at station
 *   ?train=12431     →  train schedule/route
 */
exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  // Use registered key if available, otherwise try public access
  const apiKey = process.env.ERAIL_API_KEY || '0';

  const q = event.queryStringParameters || {};
  let url;

  if (q.station) {
    const code = q.station.trim().toUpperCase();
    if (!/^[A-Z]{2,7}$/.test(code)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid station code' }) };
    }
    url = `https://api.erail.in/trains-at-station/?Station=${encodeURIComponent(code)}&APIKey=${encodeURIComponent(apiKey)}`;
  } else if (q.train) {
    const trainNo = q.train.trim();
    if (!/^\d{4,5}$/.test(trainNo)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid train number' }) };
    }
    url = `https://api.erail.in/train/?TrainNo=${encodeURIComponent(trainNo)}&APIKey=${encodeURIComponent(apiKey)}`;
  } else {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Provide ?station=RNR or ?train=12431' }) };
  }

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Upstream returned non-JSON. erail.in API may be down or key invalid.' }) };
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
