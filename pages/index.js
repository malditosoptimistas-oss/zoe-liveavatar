import { useEffect, useRef, useState } from 'react';

export default function ZOE() {
  const videoRef   = useRef(null);
  const sessionRef = useRef(null);
  const [estado, setEstado] = useState('idle');
  const [error, setError]   = useState('');

  async function iniciar() {
    setEstado('connecting');
    try {
      const res  = await fetch('/api/token');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const { LiveAvatarSession } = await import('@heygen/liveavatar-web-sdk');
      const session = new LiveAvatarSession(data.token, { voiceChat: true });
      sessionRef.current = session;

      session.on('stream', (stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
      session.on('ready', () => setEstado('live'));
      session.on('error', (e) => { setError(e.message); setEstado('error'); });

      await session.start();
    } catch(e) {
      setError(e.message);
      setEstado('error');
    }
  }

  return (
    <>
      <style>{`*{margin:0;padding:0;box-sizing:border-box;}body{background:#060610;font-family:Inter,sans-serif;color:#fff;}`}</style>
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',position:'relative'}}>
        <div style={{position:'fixed',width:'700px',height:'700px',background:'radial-gradient(circle,rgba(79,70,229,0.12) 0%,transparent 70%)',top:'50%',left:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:'960px',display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:'0.65rem',letterSpacing:'8px',textTransform:'uppercase',color:'rgba(255,255,255,0.2)',marginBottom:'1rem'}}>Malditos Optimistas</div>
          <div style={{fontSize:'4.5rem',fontWeight:700,letterSpacing:'-2px',background:'linear-gradient(135deg,#fff 0%,#a78bfa 60%,#7c3aed 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',lineHeight:1,marginBottom:'0.4rem'}}>ZOE</div>
          <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.25)',letterSpacing:'4px',textTransform:'uppercase',marginBottom:'2.5rem'}}>Co-conductora IA agéntica</div>

          {(estado === 'idle' || estado === 'error') && (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
              <button onClick={iniciar} style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',padding:'18px 56px',borderRadius:'100px',fontSize:'1rem',fontWeight:600,letterSpacing:'1px',cursor:'pointer',boxShadow:'0 0 50px rgba(79,70,229,0.5)'}}>
                Iniciar sesión en vivo
              </button>
              {error && <div style={{marginTop:'1rem',color:'rgba(239,68,68,0.8)',fontSize:'0.8rem'}}>{error}</div>}
            </div>
          )}

          {estado === 'connecting' && (
            <div style={{color:'rgba(255,255,255,0.4)',letterSpacing:'3px',fontSize:'0.8rem'}}>CONECTANDO...</div>
          )}

          {estado === 'live' && (
            <div style={{width:'100%',aspectRatio:'16/9',borderRadius:'20px',overflow:'hidden',boxShadow:'0 0 80px rgba(79,70,229,0.3)',position:'relative',background:'#0a0a1a'}}>
              <video ref={videoRef} autoPlay playsInline style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              <div style={{position:'absolute',top:'14px',left:'14px',background:'rgba(239,68,68,0.9)',color:'white',fontSize:'0.65rem',fontWeight:700,letterSpacing:'2px',padding:'5px 12px',borderRadius:'100px',display:'flex',alignItems:'center',gap:'6px'}}>
                <div style={{width:'5px',height:'5px',background:'white',borderRadius:'50%',animation:'pulse 1.5s infinite'}}/>EN VIVO
              </div>
            </div>
          )}

          <div style={{marginTop:'1.5rem',fontSize:'0.7rem',color:'rgba(255,255,255,0.15)',letterSpacing:'2px',textTransform:'uppercase'}}>Malditos Optimistas · DNews & DGO · Latam</div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}`}</style>
    </>
  );
}
