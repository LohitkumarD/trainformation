/**
 * Proxy to RailRadar API — covers 10,000+ Indian Railway stations.
 * Keeps the API key server-side; the PWA calls /.netlify/functions/train-schedule
 *
 * Netlify env var (required): RAILRADAR_API_KEY
 * Get a free key (300 req/day) at: https://railradar.in
 *
 * Usage:
 *   ?station=RNR     →  live trains at station
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

  const apiKey = process.env.RAILRADAR_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: 'RAILRADAR_API_KEY not set — register at railradar.in for a free key (300 req/day), then add it to Netlify environment variables.' }),
    };
  }

  const q = event.queryStringParameters || {};

  if (!q.station) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Provide ?station=RNR' }) };
  }

  const code = q.station.trim().toUpperCase();
  if (!/^[A-Z]{2,7}$/.test(code)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid station code' }) };
  }

  const url = `https://api.railradar.in/v1/stations/${encodeURIComponent(code)}/live`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Upstream returned non-JSON — API may be down or key invalid.' }) };
    }
    if (res.status === 401 || res.status === 403) {
      return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'RAILRADAR_API_KEY is invalid — check your key at railradar.in' }) };
    }
    return { statusCode: res.status, headers: CORS, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
