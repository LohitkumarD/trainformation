/**
 * OCR for Coach Position charts via Google Gemini API (free tier).
 * Accepts a base64-encoded image and returns structured CP data.
 *
 * Netlify env var (required): GEMINI_API_KEY
 * Get a free key at: https://aistudio.google.com/apikey
 *
 * POST body: { image: "<base64>", mimeType: "image/jpeg" }
 * Returns:   { trains: [{ trainNo, coaches: ["Engine","SLR","S1",...] }] }
 */
exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'POST required' }) };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'GEMINI_API_KEY not set — get a free key at aistudio.google.com/apikey and add to Netlify env vars.' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { image, mimeType = 'image/jpeg' } = body;
  if (!image) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'image (base64) required' }) };

  const prompt = `This is an Indian Railways coach position / vehicle guidance chart. Extract coach formation and return ONLY valid JSON in this exact format:
{
  "trains": [
    {
      "trainNo": "12345",
      "trainName": "TRAIN NAME",
      "coaches": ["ENG", "SLR", "GEN", "GEN", "GEN", "S1", "S2", "B1", "A1", "GRD"]
    }
  ]
}
Rules:
- trainNo must be the 4-5 digit train number only
- coaches must be in order from engine/loco end to guard end
- CRITICAL: Each coach must be a SEPARATE entry. Never group them.
  - If you see "7 GEN" or "GEN x7" that means 7 individual GEN coaches: ["GEN","GEN","GEN","GEN","GEN","GEN","GEN"]
  - If you see "5 GEN" that means: ["GEN","GEN","GEN","GEN","GEN"]
  - If you see "D5-D1" that means coaches D5,D4,D3,D2,D1 in that order: ["D5","D4","D3","D2","D1"]
  - If you see "S1-S6" that means: ["S1","S2","S3","S4","S5","S6"]
  - If you see a table with rows, each row is one coach — list them all individually
- Coach labels: ENG or LOCO for engine, SLR/LSLRD for luggage+guard, GEN/LS for general, GRD/LPR for guard/brake van
  D1-D12 for DEMU/disabled, S1-S12 for sleeper, B1-B4 for 3AC, A1-A2 for 2AC, H1/HA1 for 1AC, C1 for CC, PC for pantry
- If multiple trains are shown, include all of them
- Return ONLY the JSON, no explanation`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: image } },
            ],
          }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    const result = await res.json();
    if (!res.ok) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: result.error?.message || 'Gemini API error' }) };
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Extract JSON from the response (model may wrap in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Could not parse coach position from image', raw: text }) };
    }

    const data = JSON.parse(jsonMatch[0]);
    return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
