const rateMap = new Map();

let cachedSecretId = null;
let cachedSecretExpiry = 0;

export default async function handler(req, res) {

  // SEGURIDAD 1 — CORS restringido a tu dominio
  const origin = req.headers.origin || '';
  const allowed = [
    'https://zoe-liveavatar.vercel.app',
    'https://zoe-liveavatar-git-main-zoe-ia-s-projects.vercel.app'
  ];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://zoe-liveavatar.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // SEGURIDAD 2 — Bloquear orígenes no autorizados
  if (origin && !allowed.includes(origin)) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  // SEGURIDAD 3 — Rate limiting: máximo 10 sesiones por IP por hora
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, reset: now + 3600000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000; }
  entry.count++;
  rateMap.set(ip, entry);
  if (entry.count > 10) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta en unos minutos.' });
  }

  // SEGURIDAD 4 — Verificar variables de entorno
  const required = ['LA_API_KEY', 'LA_AVATAR_ID', 'ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    return res.status(500).json({ error: 'Configuración incompleta' }); // no revelar qué falta
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
        return res.status(500).json({ error: 'Error al inicializar sesión' }); // no revelar detalle
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
        max_session_duration: 1200,
        is_sandbox: false,
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
      return res.status(500).json({ error: 'No se pudo iniciar la sesión' }); // no revelar detalle
    }

  } catch(e) {
    return res.status(500).json({ error: 'Error interno del servidor' }); // no revelar e.message
  }
}
