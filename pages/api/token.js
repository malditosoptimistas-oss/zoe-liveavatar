let cachedSecretId = null;
let cachedSecretExpiry = 0;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const required = ['LA_API_KEY', 'LA_AVATAR_ID'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    return res.status(500).json({ error: 'Missing env vars', missing });
  }

  try {
    const payload = {
      mode: 'LITE',
      avatar_id: process.env.LA_AVATAR_ID,
    };

    // Si hay LLM config ID usar ese (Google Apps Script)
    if (process.env.LA_LLM_ID) {
      payload.llm_configuration_id = process.env.LA_LLM_ID;
    }

    // Si hay ElevenLabs configurado, agregarlo
    if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID) {
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
        if (secretData.data && secretData.data.id) {
          secretId = secretData.data.id;
          cachedSecretId = secretId;
          cachedSecretExpiry = ahora + (23 * 60 * 60 * 1000);
        }
      }

      if (secretId) {
        payload.elevenlabs_agent_config = {
          secret_id: secretId,
          agent_id: process.env.ELEVENLABS_AGENT_ID
        };
      }
    }

    const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.LA_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const tokenData = await tokenRes.json();

    if (tokenData.data && tokenData.data.session_token) {
      return res.json({
        token: tokenData.data.session_token,
        session_id: tokenData.data.session_id,
        mode: 'LITE'
      });
    } else {
      return res.status(500).json({ error: JSON.stringify(tokenData) });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
