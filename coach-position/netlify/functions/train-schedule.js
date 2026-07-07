/**
 * Proxy to indianrailapi.com — covers all scheduled Indian Railway stations.
 * Keeps the API key server-side; the PWA calls /.netlify/functions/train-schedule
 *
 * Netlify env var (required): INDIANRAIL_API_KEY
 * Get a free test key at: https://indianrailapi.com
 *
 * Usage:
 *   ?station=RNR     →  all trains at station (timetable)
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

  const apiKey = process.env.INDIANRAIL_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: 'INDIANRAIL_API_KEY not set — register at indianrailapi.com for a free key, then add it to Netlify environment variables.' }),
    };
  }

  const q = event.queryStringParameters || {};
  let url;

  if (q.station) {
    const code = q.station.trim().toUpperCase();
    if (!/^[A-Z]{2,7}$/.test(code)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid station code' }) };
    }
    url = `http://indianrailapi.com/api/v2/AllTrainOnStation/apikey/${encodeURIComponent(apiKey)}/StationCode/${encodeURIComponent(code)}/`;
  } else if (q.train) {
    const trainNo = q.train.trim();
    if (!/^\d{4,5}$/.test(trainNo)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid train number' }) };
    }
    url = `http://indianrailapi.com/api/v2/TrainDetails/apikey/${encodeURIComponent(apiKey)}/TrainNumber/${encodeURIComponent(trainNo)}/`;
  } else {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Provide ?station=RNR or ?train=12431' }) };
  }

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Upstream returned non-JSON — API may be down or key invalid.' }) };
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
