import { LiveAvatarSession } from 'https://esm.run/@heygen/liveavatar-web-sdk';

let keepAliveInterval = null;
let session = null;
let recognition = null;
let escuchandoZoe = false;
let timeoutZoe = null;
let desconectadoManualmente = false;

function iniciarDeteccionZoe() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  recognition = new SR();
  recognition.lang = 'es-419';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript.toLowerCase();
      if (/\bzo[eé]\b/i.test(t)) activarEscuchaZoe();
    }
  };
  recognition.onerror = () => setTimeout(() => { try { recognition.start(); } catch(e) {} }, 1000);
  recognition.onend = () => setTimeout(() => { try { recognition.start(); } catch(e) {} }, 300);
  try { recognition.start(); } catch(e) {}
}

function activarEscuchaZoe() {
  if (escuchandoZoe) { clearTimeout(timeoutZoe); }
  else {
    escuchandoZoe = true;
    document.getElementById('escucha-badge').style.display = 'flex';
    if (session && session.setMicrophoneEnabled) session.setMicrophoneEnabled(true);
  }
  timeoutZoe = setTimeout(() => {
    escuchandoZoe = false;
    document.getElementById('escucha-badge').style.display = 'none';
    if (session && session.setMicrophoneEnabled) session.setMicrophoneEnabled(false);
  }, 15000);
}

document.getElementById('btn-desconectar').onclick = function() {
  desconectadoManualmente = true;
  clearInterval(keepAliveInterval);
  if (recognition) { try { recognition.stop(); } catch(e) {} }
  if (session) { try { session.stop(); } catch(e) {} }
  document.getElementById('start').style.display = 'flex';
  document.getElementById('container').style.display = 'none';
  document.getElementById('btn').disabled = false;
  document.getElementById('btn').textContent = 'Iniciar sesión en vivo';
  document.getElementById('btn-desconectar').style.display = 'none';
};

document.getElementById('btn').onclick = async function() {
  desconectadoManualmente = false;
  const btn = document.getElementById('btn');
  const status = document.getElementById('status');
  btn.disabled = true;
  btn.textContent = 'Conectando...';
  status.textContent = 'OBTENIENDO TOKEN...';
  try {
    const res = await fetch('/api/token');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    status.textContent = 'INICIANDO AVATAR...';
    session = new LiveAvatarSession(data.token, { voiceChat: true, microphoneEnabled: true });
    session.on('stream', (stream) => { document.getElementById('avatar-video').srcObject = stream; });
    session.on('ready', () => {
      document.getElementById('start').style.display = 'none';
      document.getElementById('container').style.display = 'flex';
      document.getElementById('btn-desconectar').style.display = 'block';
      iniciarDeteccionZoe();
      const sessionId = data.session_id;
      keepAliveInterval = setInterval(async () => {
        try {
          await fetch('/api/keepalive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
          });
        } catch(e) {}
      }, 30000);
    });
    session.on('error', (e) => {
      status.textContent = 'Error: ' + e.message;
      btn.disabled = false;
      btn.textContent = 'Reintentar';
      clearInterval(keepAliveInterval);
      document.getElementById('btn-desconectar').style.display = 'none';
      if (recognition) { try { recognition.stop(); } catch(err) {} }
    });
    session.on('disconnected', () => {
      clearInterval(keepAliveInterval);
      document.getElementById('btn-desconectar').style.display = 'none';
      if (recognition) { try { recognition.stop(); } catch(err) {} }
      if (!desconectadoManualmente) {
        document.getElementById('start').style.display = 'flex';
        document.getElementById('container').style.display = 'none';
        btn.disabled = false;
        btn.textContent = 'Reintentar';
      }
    });
    await session.start();
  } catch(e) {
    status.textContent = 'Error: ' + e.message;
    btn.disabled = false;
    btn.textContent = 'Reintentar';
    clearInterval(keepAliveInterval);
  }
};
