import { useRef, useState } from 'react';
export default function ZOE() {
  const videoRef  = useRef(null);
  const sesionRef = useRef(null);
  const [estado, setEstado] = useState('idle');

  async function iniciar() {
    setEstado('connecting');
    try {
      const res  = await fetch('/api/token');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const mod = await import('@heygen/liveavatar-web-sdk');
      const session = new mod.LiveAvatarSession(data.token, { voiceChat: true });
      sesionRef.current = session;

      session.on('session.stream_ready', async () => {
        await new Promise(r => setTimeout(r, 1000));
        try {
          const room = session.room;
          if (!room) return;

          const attachTrack = (track) => {
            if (track.kind === 'video') {
              track.attach(videoRef.current);
              setEstado('live');
            } else if (track.kind === 'audio') {
              const a = track.attach();
              document.body.appendChild(a);
            }
          };

          room.remoteParticipants.forEach((participant) => {
            participant.trackPublications.forEach((pub) => {
              if (pub.isSubscribed && pub.track) attachTrack(pub.track);
            });
          });

          room.on('trackSubscribed', (track) => attachTrack(track));

          await room.localParticipant.setMicrophoneEnabled(true);
        } catch(e) { console.error(e); setEstado('idle'); }
      });

      session.on('session.disconnected', () => setEstado('idle'));
      await session.start();
    } catch(e) {
      console.error(e);
      setEstado('idle');
    }
  }

  async function reconectar() {
    if (sesionRef.current) {
      try { await sesionRef.current.stop(); } catch(e) {}
      sesionRef.current = null;
    }
    setEstado('idle');
    setTimeout(() => iniciar(), 500);
  }

  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#060610; font-family:Inter,sans-serif; color:#fff; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      `}</style>
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',position:'relative'}}>
        <div style={{position:'fixed',width:'700px',height:'700px',background:'radial-gradient(circle,rgba(79,70,229,0.12) 0%,transparent 70%)',top:'50%',left:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:'960px',display:'flex',flexDirection:'column',alignItems:'center'}}>

          <div style={{fontSize:'0.65rem',letterSpacing:'8px',textTransform:'uppercase',color:'rgba(255,255,255,0.2)',marginBottom:'1rem'}}>Malditos Optimistas</div>
          <div style={{fontSize:'4.5rem',fontWeight:700,letterSpacing:'-2px',background:'linear-gradient(135deg,#fff 0%,#a78bfa 60%,#7c3aed 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',lineHeight:1,marginBottom:'0.4rem'}}>ZOE</div>
          <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.25)',letterSpacing:'4px',textTransform:'uppercase',marginBottom:'2.5rem'}}>Co-conductora IA agéntica</div>

          {estado === 'idle' && (
            <button onClick={iniciar} style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',padding:'18px 56px',borderRadius:'100px',fontSize:'1rem',fontWeight:600,letterSpacing:'1px',cursor:'pointer',boxShadow:'0 0 50px rgba(79,70,229,0.5)'}}>
              Iniciar sesión en vivo
            </button>
          )}

          {estado === 'connecting' && (
            <div style={{color:'rgba(255,255,255,0.4)',letterSpacing:'3px',fontSize:'0.8rem'}}>CONECTANDO...</div>
          )}

          <div style={{display:estado==='live'?'flex':'none',width:'100%',flexDirection:'column',alignItems:'center',gap:'1.5rem'}}>
            <div style={{width:'100%',aspectRatio:'16/9',borderRadius:'20px',overflow:'hidden',boxShadow:'0 0 80px rgba(79,70,229,0.3)',position:'relative',background:'#0a0a1a'}}>
              <video ref={videoRef} autoPlay playsInline style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              <div style={{position:'absolute',top:'14px',left:'14px',background:'rgba(239,68,68,0.9)',color:'white',fontSize:'0.65rem',fontWeight:700,letterSpacing:'2px',padding:'5px 12px',borderRadius:'100px',display:'flex',alignItems:'center',gap:'6px'}}>
                <div style={{width:'5px',height:'5px',background:'white',borderRadius:'50%',animation:'pulse 1.5s infinite'}}/>EN VIVO
              </div>
            </div>
            <button onClick={reconectar} style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.15)',padding:'10px 32px',borderRadius:'100px',fontSize:'0.8rem',cursor:'pointer',letterSpacing:'2px'}}>
              RECONECTAR
            </button>
          </div>

          <div style={{marginTop:'1.5rem',fontSize:'0.7rem',color:'rgba(255,255,255,0.15)',letterSpacing:'2px',textTransform:'uppercase'}}>Malditos Optimistas · DNews & DGO · Latam</div>
        </div>
      </div>
    </>
  );
}
