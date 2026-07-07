/**
 * Proxy to RapidAPI → IRCTC1 API (irctc1.p.rapidapi.com)
 * Keeps the API key server-side; the PWA calls /.netlify/functions/train-schedule
 *
 * Netlify env var required: RAPIDAPI_KEY
 * Get a free key (500 calls/month) at: https://rapidapi.com/IRCTCAPI/api/irctc1
 *
 * Usage:
 *   ?station=DVG     →  getTrainsAtStation
 *   ?train=12431     →  getTrainSchedule
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

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: 'Schedule service not configured — set RAPIDAPI_KEY in Netlify environment variables. Get a free key at rapidapi.com/IRCTCAPI/api/irctc1' }),
    };
  }

  const q = event.queryStringParameters || {};
  let url;

  if (q.station) {
    const code = q.station.trim().toUpperCase();
    if (!/^[A-Z]{2,7}$/.test(code)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid station code' }) };
    }
    url = `https://irctc1.p.rapidapi.com/api/v3/getTrainsAtStation?stationCode=${encodeURIComponent(code)}`;
  } else if (q.train) {
    const trainNo = q.train.trim();
    if (!/^\d{4,5}$/.test(trainNo)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid train number' }) };
    }
    url = `https://irctc1.p.rapidapi.com/api/v3/getTrainSchedule?trainNo=${encodeURIComponent(trainNo)}&timezone=UTC%2B05%3A30`;
  } else {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Provide ?station=DVG or ?train=12431' }) };
  }

  try {
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'irctc1.p.rapidapi.com',
      },
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Upstream returned non-JSON' }) };
    }
    if (res.status === 429) {
      return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'API rate limit reached — free plan allows 500 calls/month' }) };
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
