/**
 * Proxy to IndianRailAPI.com TrainSchedule endpoint.
 * Keeps the API key server-side; the PWA calls /.netlify/functions/train-schedule?train=12431
 *
 * Netlify env var required: INDIAN_RAIL_API_KEY
 * Get a free key at: https://indianrailapi.com/developers
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

  const trainNo = (event.queryStringParameters || {}).train;
  if (!trainNo || !/^\d{4,5}$/.test(trainNo)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Provide a valid 4- or 5-digit train number as ?train=12431' }),
    };
  }

  const apiKey = process.env.INDIAN_RAIL_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: 'Schedule service not configured — INDIAN_RAIL_API_KEY missing' }),
    };
  }

  try {
    const url =
      `https://indianrailapi.com/api/v2/TrainSchedule/apikey/${encodeURIComponent(apiKey)}/TrainNumber/${encodeURIComponent(trainNo)}/`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();

    let data;
    try { data = JSON.parse(text); } catch {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Upstream returned non-JSON' }) };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
