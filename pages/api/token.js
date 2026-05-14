export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  
  const required = ['LA_API_KEY', 'LA_AVATAR_ID', 'ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    return res.status(500).json({ error: 'Missing env vars', missing });
  }
  
  try {
    // Paso 1: Registrar secret de ElevenLabs (cada vez es OK, se reutiliza por contenido)
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
    const secretId = secretData.data.id;
    
    // Paso 2: Crear token LITE con elevenlabs_agent_config
    const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.LA_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode:      'LITE',
        avatar_id: process.env.LA_AVATAR_ID,
        elevenlabs_agent_config: {
          secret_id: secretId,
          agent_id:  process.env.ELEVENLABS_AGENT_ID
        }
      })
    });
    const tokenData = await tokenRes.json();
    
    if (tokenData.data && tokenData.data.session_token) {
      res.json({ 
        token: tokenData.data.session_token,
        session_id: tokenData.data.session_id,
        mode: 'LITE-ElevenLabs'
      });
    } else {
      res.status(500).json({ error: JSON.stringify(tokenData) });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
