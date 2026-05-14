export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  
  const requiredEnv = ['LA_API_KEY', 'LA_AVATAR_ID', 'LA_VOICE_ID', 'LA_CONTEXT_ID', 'LA_LLM_ID'];
  const missing = requiredEnv.filter(k => !process.env[k]);
  if (missing.length > 0) {
    return res.status(500).json({ error: 'Missing env vars', missing });
  }
  
  try {
    const payload = {
      avatar_id: process.env.LA_AVATAR_ID,
      avatar_persona: {
        voice_id:   process.env.LA_VOICE_ID,
        context_id: process.env.LA_CONTEXT_ID,
        language:   'es'
      },
      mode:                 'FULL',
      is_sandbox:           false,
      interactivity_type:   'CONVERSATIONAL',
      llm_configuration_id: process.env.LA_LLM_ID
    };
    
    const response = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.LA_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    
    if (data.data && data.data.session_token) {
      res.json({ 
        token: data.data.session_token,
        debug: { llm_id_sent: process.env.LA_LLM_ID }
      });
    } else {
      res.status(500).json({ error: JSON.stringify(data) });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
