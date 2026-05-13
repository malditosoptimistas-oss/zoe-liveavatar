const express = require('express');
const path    = require('path');
const app     = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/token', async (req, res) => {
  try {
    const response = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method:  'POST',
      headers: { 'X-API-KEY': process.env.LA_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      })
    });
    const data = await response.json();
    if (data.data && data.data.session_token) {
      res.json({ token: data.data.session_token });
    } else {
      res.status(500).json({ error: JSON.stringify(data) });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('ZOE corriendo en puerto ' + PORT));
