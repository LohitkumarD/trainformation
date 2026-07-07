/**
 * Proxy to IndianRailAPI.com — keeps API key server-side.
 *
 * Netlify env var required: INDIAN_RAIL_API_KEY
 * Get a free key at: https://indianrailapi.com/developers
 *
 * Usage:
 *   /.netlify/functions/train-schedule?station=DVG        → all trains at station
 *   /.netlify/functions/train-schedule?train=12431        → full route/schedule
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

  const apiKey = process.env.INDIAN_RAIL_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: 'Schedule service not configured — set INDIAN_RAIL_API_KEY in Netlify environment variables' }),
    };
  }

  const q = event.queryStringParameters || {};
  let url;

  if (q.station) {
    const code = q.station.trim().toUpperCase();
    if (!/^[A-Z]{2,6}$/.test(code)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid station code' }) };
    }
    url = `https://indianrailapi.com/api/v2/AllTrainOnStation/apikey/${encodeURIComponent(apiKey)}/StationCode/${encodeURIComponent(code)}/`;
  } else if (q.train) {
    const trainNo = q.train.trim();
    if (!/^\d{4,5}$/.test(trainNo)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid train number' }) };
    }
    url = `https://indianrailapi.com/api/v2/TrainSchedule/apikey/${encodeURIComponent(apiKey)}/TrainNumber/${encodeURIComponent(trainNo)}/`;
  } else {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Provide ?station=DVG or ?train=12431' }) };
  }

  try {
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
