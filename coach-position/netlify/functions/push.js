// Netlify serverless function — sends a push notification via FCM legacy API.
// Required env var in Netlify dashboard: FCM_SERVER_KEY
// (Firebase Console → Project Settings → Cloud Messaging → Server key)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const FCM_KEY = process.env.FCM_SERVER_KEY;
  if (!FCM_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'FCM_SERVER_KEY env var not set' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { token, tokens, title, body } = payload;
  if (!title) {
    return { statusCode: 400, body: JSON.stringify({ error: 'title is required' }) };
  }

  // Support single token or array of tokens
  const allTokens = tokens || (token ? [token] : []);
  if (!allTokens.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'token or tokens[] required' }) };
  }

  const notification = { title, body: body || '' };
  const webpush = {
    notification: { ...notification, icon: '/icon.svg', badge: '/icon.svg' },
    fcm_options: { link: '/' }
  };

  // Send to all tokens (fan-out individually for reliability)
  const results = await Promise.allSettled(
    allTokens.map(tk =>
      fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${FCM_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: tk, notification, webpush }),
      }).then(r => r.json())
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ sent: allTokens.length, results }),
  };
};
