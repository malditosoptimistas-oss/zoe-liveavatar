let cachedSecretId = null;
let cachedSecretExpiry = 0;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const required = ['LA_API_KEY', 'LA_AVATAR_ID', 'ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    return res.status(500).json({ error: 'Missing env vars', missing });
  }

  try {
    const ahora = Date.now();
    let secretId = null;

    if (cachedSecretId && ahora < cachedSecretExpiry) {
      secretId = cachedSecretId;
    } else {
      const secretRes = await fetch('https://api.liveavatar.com/v1/secrets', {
        method: 'POST',
        headers: { 'X-API-KEY': process.env.LA_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret_type: 'ELEVENLABS_API_KEY',
          secret_value: process.env.ELEVENLABS_API_KEY,
          secret_name: 'ZOE EL Auto'
        })
      });
      const secretData = await secretRes.json();
      if (!secretData.data || !secretData.data.id) {
        return res.status(500).json({ error: 'Secret error', detail: secretData });
      }
      secretId = secretData.data.id;
      cachedSecretId = secretId;
      cachedSecretExpiry = ahora + (23 * 60 * 60 * 1000);
    }

    const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.LA_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'LITE',
        avatar_id: process.env.LA_AVATAR_ID,
        silence_detection: false,
        elevenlabs_agent_config: {
          secret_id: secretId,
          agent_id: process.env.ELEVENLABS_AGENT_ID
        }
      })
    });

    const tokenData = await tokenRes.json();
    if (tokenData.data && tokenData.data.session_token) {
      return res.json({
        token: tokenData.data.session_token,
        session_id: tokenData.data.session_id,
        mode: 'LITE-ElevenLabs'
      });
    } else {
      return res.status(500).json({ error: JSON.stringify(tokenData) });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
