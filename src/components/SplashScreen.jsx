import { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in'); // 'in' | 'hold' | 'out'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => setPhase('out'), 2200);
    const t3 = setTimeout(() => onDone(), 2800);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, #4fb8e0 0%, #80cded 45%, #a8dff5 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 0.6s ease',
        opacity: phase === 'out' ? 0 : 1,
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 320, height: 320, borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
      }} />
      <div style={{
        position: 'absolute', bottom: -120, left: -60,
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '10%',
        width: 160, height: 160, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />

      {/* Logo block */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.6s ease',
        transform: phase === 'in' ? 'scale(0.7) translateY(20px)' : 'scale(1) translateY(0)',
        opacity: phase === 'in' ? 0 : 1,
      }}>
        {/* Icon */}
        <div style={{
          width: 96, height: 96, borderRadius: 24,
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            {/* Building silhouette */}
            <rect x="8" y="20" width="36" height="28" rx="2" fill="white" fillOpacity="0.9" />
            <polygon points="4,22 26,4 48,22" fill="white" />
            <rect x="16" y="30" width="8" height="8" rx="1" fill="#80cded" />
            <rect x="28" y="30" width="8" height="8" rx="1" fill="#80cded" />
            <rect x="20" y="42" width="12" height="6" rx="1" fill="#80cded" />
            {/* Crane arm */}
            <line x1="38" y1="4" x2="38" y2="22" stroke="#f3ce1f" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="30" y1="4" x2="46" y2="4" stroke="#f3ce1f" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="44" y1="4" x2="44" y2="12" stroke="#f3ce1f" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Brand name */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            margin: 0,
            fontSize: 48,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-1px',
            textShadow: '0 2px 12px rgba(0,0,0,0.15)',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}>
            CON<span style={{ color: '#f3ce1f' }}>STRAK</span>
          </h1>
          <p style={{
            margin: '6px 0 0',
            fontSize: 16,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}>
            ניהול אתרי בנייה
          </p>
        </div>
      </div>

      {/* Loading dots */}
      <div style={{
        position: 'absolute', bottom: 60,
        display: 'flex', gap: 8,
        transition: 'opacity 0.4s',
        opacity: phase === 'out' ? 0 : 1,
      }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'rgba(255,255,255,0.7)',
            animation: `splash-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes splash-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
