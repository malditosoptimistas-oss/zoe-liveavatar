import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    async function init() {
      const { LiveAvatarSession } = await import('https://esm.run/@heygen/liveavatar-web-sdk');

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
          session = new LiveAvatarSession(data.token, { voiceChat: true, microphoneEnabled: false });
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
              btn.textContent = 'Iniciar sesión en vivo';
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
    }

    init();
  }, []);

  return (
    <>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#060610;font-family:'Inter',sans-serif;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        body::before{content:'';position:fixed;width:700px;height:700px;background:radial-gradient(circle,rgba(79,70,229,0.12) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;}
        .wrap{position:relative;z-index:1;width:100%;max-width:960px;padding:2rem;display:flex;flex-direction:column;align-items:center;}
        .brand{font-size:0.65rem;letter-spacing:8px;text-transform:uppercase;color:rgba(255,255,255,0.2);margin-bottom:1rem;}
        .title{font-size:4.5rem;font-weight:700;letter-spacing:-2px;background:linear-gradient(135deg,#fff 0%,#a78bfa 60%,#7c3aed 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin-bottom:0.4rem;}
        .subtitle{font-size:0.75rem;color:rgba(255,255,255,0.25);letter-spacing:4px;text-transform:uppercase;margin-bottom:2.5rem;}
        .btn{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;padding:18px 56px;border-radius:100px;font-size:1rem;font-family:'Inter',sans-serif;font-weight:600;letter-spacing:1px;cursor:pointer;transition:all 0.3s;box-shadow:0 0 50px rgba(79,70,229,0.5);}
        .btn:hover{transform:scale(1.04);}
        .btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
        .btn-desconectar{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1);padding:10px 28px;border-radius:100px;font-size:0.75rem;font-family:'Inter',sans-serif;font-weight:600;letter-spacing:1px;cursor:pointer;transition:all 0.3s;margin-top:1rem;display:none;}
        .btn-desconectar:hover{background:rgba(255,80,80,0.15);color:rgba(255,100,100,0.8);border-color:rgba(255,80,80,0.3);}
        .status{margin-top:1.5rem;font-size:0.8rem;color:rgba(255,255,255,0.3);letter-spacing:2px;min-height:1.2rem;}
        #container{display:none;width:100%;flex-direction:column;align-items:center;}
        .avatar-wrap{width:100%;aspect-ratio:16/9;border-radius:20px;overflow:hidden;box-shadow:0 0 80px rgba(79,70,229,0.3);position:relative;background:#0a0a1a;}
        #avatar-video{width:100%;height:100%;object-fit:cover;}
        .live-badge{position:absolute;top:14px;left:14px;background:rgba(239,68,68,0.9);color:white;font-size:0.65rem;font-weight:700;letter-spacing:2px;padding:5px 12px;border-radius:100px;display:flex;align-items:center;gap:6px;z-index:10;}
        .live-dot{width:5px;height:5px;background:white;border-radius:50%;animation:pulse 1.5s infinite;}
        .escucha-badge{position:absolute;top:14px;right:14px;background:rgba(79,70,229,0.85);color:white;font-size:0.65rem;font-weight:700;letter-spacing:2px;padding:5px 12px;border-radius:100px;display:none;align-items:center;gap:6px;z-index:10;}
        .escucha-dot{width:5px;height:5px;background:#a78bfa;border-radius:50%;animation:pulse 1s infinite;}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
        .footer{margin-top:1.5rem;font-size:0.7rem;color:rgba(255,255,255,0.15);letter-spacing:2px;text-transform:uppercase;}
        .sponsor{margin-top:0.5rem;font-size:0.6rem;color:rgba(255,255,255,0.1);letter-spacing:3px;text-transform:uppercase;}
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div className="wrap">
        <div className="brand">Malditos Optimistas</div>
        <div className="title">ZOE</div>
        <div className="subtitle">Profesora &amp; Co-conductora IA agéntica</div>
        <div id="start" style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <button className="btn" id="btn">Iniciar sesión en vivo</button>
          <div className="status" id="status"></div>
        </div>
        <div id="container">
          <div className="avatar-wrap">
            <video id="avatar-video" autoPlay playsInline></video>
            <div className="live-badge"><div className="live-dot"></div>EN VIVO</div>
            <div className="escucha-badge" id="escucha-badge"><div className="escucha-dot"></div>ESCUCHANDO</div>
          </div>
          <button className="btn-desconectar" id="btn-desconectar">Finalizar sesión</button>
        </div>
        <div className="footer">Malditos Optimistas &nbsp;·&nbsp; DNews &amp; DGO &nbsp;·&nbsp; Latam</div>
        <div className="sponsor">Sponsor oficial: PAX Assistance</div>
      </div>
    </>
  );
}
