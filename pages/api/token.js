export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    // Paso 1: Registrar secret de ElevenLabs
    const res1 = await fetch('https://api.liveavatar.com/v1/secrets', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.LA_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret_type: 'ELEVENLABS_API_KEY',
        secret_value: process.env.ELEVENLABS_API_KEY,
        secret_name: 'ZOE ElevenLabs'
      })
    });
    const data1 = await res1.json();
    if (!data1.data || !data1.data.id) {
      return res.status(500).json({ error: 'Secret error: ' + JSON.stringify(data1) });
    }
    const secretId = data1.data.id;

    // Paso 2: Crear token LITE con ElevenLabs
    const res2 = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.LA_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'LITE',
        avatar_id: process.env.LA_AVATAR_ID,
        elevenlabs_agent_config: {
          secret_id: secretId,
          agent_id: process.env.ELEVENLABS_AGENT_ID
        }
      })
    });
    const data2 = await res2.json();
    if (data2.data && data2.data.session_token) {
      res.json({ token: data2.data.session_token });
    } else {
      res.status(500).json({ error: JSON.stringify(data2) });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
