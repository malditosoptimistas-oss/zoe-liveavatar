import { useRef, useState } from 'react';
export default function ZOE() {
  const videoRef  = useRef(null);
  const sesionRef = useRef(null);
  const [estado, setEstado] = useState('idle');
  const [log, setLog]       = useState([]);
  function agregar(msg) {
    setLog(prev => [...prev, msg]);
    console.log(msg);
  }
  async function iniciar() {
    setEstado('connecting');
    setLog([]);
    try {
      agregar('1. Obteniendo token...');
      const res  = await fetch('/api/token');
      const data = await res.json();
      if (data.error) throw new Error('Token error: ' + data.error);
      agregar('2. Token OK');
      agregar('3. Cargando SDK...');
      const mod = await import('@heygen/liveavatar-web-sdk');
      const LiveAvatarSession = mod.LiveAvatarSession;
      const session = new LiveAvatarSession(data.token, { voiceChat: true });
      sesionRef.current = session;

      session.on('session.stream_ready', async () => {
        agregar('STREAM READY');
        await new Promise(r => setTimeout(r, 500));
        try {
          const videoTrack = session._remoteVideoTrack;
          const audioTrack = session._remoteAudioTrack;
          agregar('videoTrack: ' + (videoTrack ? videoTrack.kind || 'ok' : 'null'));
          if (videoTrack && videoRef.current) {
            const stream = new MediaStream();
            if (videoTrack.mediaStreamTrack) stream.addTrack(videoTrack.mediaStreamTrack);
            else if (videoTrack instanceof MediaStreamTrack) stream.addTrack(videoTrack);
            if (audioTrack && audioTrack.mediaStreamTrack) stream.addTrack(audioTrack.mediaStreamTrack);
            videoRef.current.srcObject = stream;
            videoRef.current.muted = false;
            videoRef.current.autoplay = true;
            videoRef.current.play().catch(e => agregar('play error: ' + e.message));
            setEstado('live');
            agregar('VIDEO INICIADO');

            // Reconectar el stream cada 2 segundos si se congela
            setInterval(() => {
              if (videoRef.current && videoRef.current.paused) {
                videoRef.current.play().catch(() => {});
              }
            }, 2000);
          }
        } catch(e) {
          agregar('ERROR stream: ' + e.message);
        }
      });

      session.on('session.state_changed', (s) => agregar('state: ' + s));
      session.on('session.disconnected', (r) => { agregar('disconnected: ' + JSON.stringify(r)); setEstado('error'); });

      agregar('6. Iniciando sesión...');
      await session.start();
      agregar('7. Iniciado');

    } catch(e) {
      agregar('EXCEPCION: ' + e.message);
      setEstado('error');
    }
  }
  return (
    <div style={{minHeight:'100vh',background:'#060610',color:'#fff',fontFamily:'monospace',padding:'2rem',display:'flex',flexDirection:'column',alignItems:'center'}}>
      <div style={{fontSize:'3rem',fontWeight:700,marginBottom:'0.5rem',background:'linear-gradient(135deg,#fff,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ZOE</div>
      <div style={{color:'rgba(255,255,255,0.3)',marginBottom:'2rem',fontSize:'0.8rem',letterSpacing:'3px'}}>MALDITOS OPTIMISTAS</div>
      {(estado === 'idle' || estado === 'error') && (
        <button onClick={iniciar} style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',padding:'16px 48px',borderRadius:'100px',fontSize:'1rem',fontWeight:600,cursor:'pointer',marginBottom:'2rem'}}>
          Iniciar sesión en vivo
        </button>
      )}
      {estado === 'connecting' && (
        <div style={{color:'rgba(255,255,255,0.5)',marginBottom:'2rem',letterSpacing:'3px'}}>CONECTANDO...</div>
      )}
      <div style={{display:estado==='live'?'block':'none',width:'100%',maxWidth:'800px',aspectRatio:'16/9',borderRadius:'16px',overflow:'hidden',marginBottom:'2rem',background:'#0a0a1a'}}>
        <video ref={videoRef} autoPlay playsInline style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      </div>
      {log.length > 0 && (
        <div style={{width:'100%',maxWidth:'800px',background:'rgba(255,255,255,0.05)',borderRadius:'8px',padding:'1rem',fontSize:'0.75rem',lineHeight:'1.8'}}>
          {log.map((l,i) => <div key={i} style={{color:l.startsWith('ERROR')||l.startsWith('EXCEP')?'#f87171':'rgba(255,255,255,0.6)'}}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
