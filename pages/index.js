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
      agregar('4. SDK cargado. Keys: ' + Object.keys(mod).join(', '));
      const LiveAvatarSession = mod.LiveAvatarSession || mod.default?.LiveAvatarSession;
      if (!LiveAvatarSession) throw new Error('LiveAvatarSession no encontrado en el SDK');
      agregar('5. LiveAvatarSession encontrado');
      const session = new LiveAvatarSession(data.token, { voiceChat: true });
      sesionRef.current = session;
      session.on('stream', (stream) => {
        agregar('EVENTO: stream recibido');
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
      session.on('ready', () => {
        agregar('EVENTO: ready');
        setEstado('live');
      });
      session.on('connecting', () => agregar('EVENTO: connecting'));
      session.on('connected',  () => agregar('EVENTO: connected'));
      session.on('disconnected', (r) => agregar('EVENTO: disconnected → ' + JSON.stringify(r)));
      session.on('stateChange', (s) => agregar('EVENTO: stateChange → ' + JSON.stringify(s)));
      session.on('error', (e) => {
        agregar('ERROR: ' + (e.message || JSON.stringify(e)));
        setEstado('error');
      });
      agregar('6. Iniciando sesión...');
      await session.start();
      agregar('7. session.start() completado');
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
      {estado === 'live' && (
        <div style={{width:'100%',maxWidth:'800px',aspectRatio:'16/9',borderRadius:'16px',overflow:'hidden',marginBottom:'2rem'}}>
          <video ref={videoRef} autoPlay playsInline style={{width:'100%',height:'100%',objectFit:'cover',background:'#0a0a1a'}}/>
        </div>
      )}
      {log.length > 0 && (
        <div style={{width:'100%',maxWidth:'800px',background:'rgba(255,255,255,0.05)',borderRadius:'8px',padding:'1rem',fontSize:'0.75rem',lineHeight:'1.8'}}>
          {log.map((l,i) => <div key={i} style={{color:l.startsWith('ERROR')||l.startsWith('EXCEP')?'#f87171':'rgba(255,255,255,0.6)'}}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
