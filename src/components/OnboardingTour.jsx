import { useState } from 'react';

const SLIDES = [
  {
    title: 'ברוכים הבאים ל-CONSTRAK',
    description:
      'פלטפורמה מקיפה לניהול אתרי בנייה – כל הכלים שצריך לנהל פרויקטים, עובדים וחומרים במקום אחד.',
    illustration: (
      <svg width="200" height="160" viewBox="0 0 200 160" fill="none">
        <rect width="200" height="160" rx="16" fill="rgba(255,255,255,0.12)" />
        <rect x="0" y="120" width="200" height="40" rx="0" fill="rgba(255,255,255,0.08)" />
        <rect x="55" y="45" width="70" height="75" rx="3" fill="rgba(255,255,255,0.85)" />
        <polygon points="45,48 90,20 135,48" fill="white" />
        <rect x="65" y="58" width="14" height="14" rx="2" fill="#80cded" />
        <rect x="88" y="58" width="14" height="14" rx="2" fill="#80cded" />
        <rect x="111" y="58" width="14" height="14" rx="2" fill="#80cded" />
        <rect x="65" y="80" width="14" height="14" rx="2" fill="#80cded" />
        <rect x="111" y="80" width="14" height="14" rx="2" fill="#80cded" />
        <rect x="83" y="95" width="14" height="25" rx="2" fill="#4fb8e0" />
        <line x1="148" y1="15" x2="148" y2="75" stroke="#f3ce1f" strokeWidth="4" strokeLinecap="round" />
        <line x1="130" y1="15" x2="170" y2="15" stroke="#f3ce1f" strokeWidth="4" strokeLinecap="round" />
        <line x1="166" y1="15" x2="166" y2="35" stroke="#f3ce1f" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="144" y="75" width="8" height="45" rx="2" fill="#f3ce1f" />
        <ellipse cx="32" cy="98" rx="18" ry="8" fill="#f3ce1f" />
        <ellipse cx="32" cy="96" rx="13" ry="9" fill="#f3ce1f" />
        <rect x="27" y="105" width="10" height="18" rx="3" fill="rgba(255,255,255,0.7)" />
        <circle cx="18" cy="30" r="3" fill="rgba(255,255,255,0.5)" />
        <circle cx="172" cy="50" r="2" fill="rgba(255,255,255,0.4)" />
        <circle cx="160" cy="90" r="2.5" fill="rgba(255,255,255,0.3)" />
      </svg>
    ),
  },
  {
    title: 'יומן עבודה יומי',
    description:
      'תעד פעילויות עבודה, עקוב אחר שעות ועדכן התקדמות פרויקטים בקלות – הכל נשמר ונגיש בכל רגע.',
    illustration: (
      <svg width="200" height="160" viewBox="0 0 200 160" fill="none">
        <rect width="200" height="160" rx="16" fill="rgba(255,255,255,0.12)" />
        <rect x="45" y="25" width="110" height="120" rx="8" fill="rgba(255,255,255,0.9)" />
        <rect x="75" y="18" width="50" height="18" rx="9" fill="rgba(255,255,255,0.6)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
        <rect x="58" y="52" width="84" height="7" rx="3.5" fill="#80cded" />
        {[72, 90, 108, 126].map((y, i) => (
          <g key={i}>
            <rect x="58" y={y} width="60" height="5" rx="2.5" fill={i < 3 ? 'rgba(79,184,224,0.4)' : 'rgba(200,200,200,0.4)'} />
            {i < 3 ? (
              <g>
                <circle cx="134" cy={y + 2.5} r="6" fill="#4fb8e0" />
                <polyline points={`130,${y + 2.5} 133,${y + 5.5} 138,${y - 0.5}`} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ) : (
              <circle cx="134" cy={y + 2.5} r="6" fill="rgba(200,200,200,0.4)" stroke="rgba(200,200,200,0.6)" strokeWidth="1.5" />
            )}
          </g>
        ))}
        <g transform="rotate(-30, 155, 115)">
          <rect x="147" y="90" width="10" height="40" rx="2" fill="#f3ce1f" />
          <polygon points="147,130 157,130 152,143" fill="rgba(255,255,255,0.8)" />
          <rect x="147" y="88" width="10" height="6" rx="1" fill="rgba(255,255,255,0.5)" />
        </g>
        <circle cx="168" cy="35" r="18" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <line x1="168" y1="35" x2="168" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="168" y1="35" x2="175" y2="40" stroke="#f3ce1f" strokeWidth="2" strokeLinecap="round" />
        <circle cx="168" cy="35" r="2" fill="white" />
      </svg>
    ),
  },
  {
    title: 'תקשורת צוות בזמן אמת',
    description:
      'שלח הודעות לצוות, שתף עדכונים חשובים ושמור על תקשורת פתוחה עם כל הגורמים באתר – בכל זמן ומכל מקום.',
    illustration: (
      <svg width="200" height="160" viewBox="0 0 200 160" fill="none">
        <rect width="200" height="160" rx="16" fill="rgba(255,255,255,0.12)" />
        <rect x="20" y="30" width="110" height="44" rx="14" fill="rgba(255,255,255,0.9)" />
        <polygon points="38,74 28,86 56,74" fill="rgba(255,255,255,0.9)" />
        <rect x="32" y="43" width="70" height="6" rx="3" fill="#80cded" />
        <rect x="32" y="56" width="50" height="6" rx="3" fill="rgba(79,184,224,0.4)" />
        <rect x="70" y="95" width="110" height="44" rx="14" fill="rgba(243,206,31,0.9)" />
        <polygon points="143,95 163,83 163,95" fill="rgba(243,206,31,0.9)" />
        <rect x="82" y="108" width="86" height="6" rx="3" fill="rgba(255,255,255,0.8)" />
        <rect x="82" y="121" width="60" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
        <circle cx="30" cy="100" r="16" fill="#4fb8e0" stroke="white" strokeWidth="2" />
        <circle cx="30" cy="96" r="6" fill="white" />
        <ellipse cx="30" cy="112" rx="10" ry="6" fill="white" />
        <circle cx="170" cy="60" r="16" fill="#f3ce1f" stroke="white" strokeWidth="2" />
        <circle cx="170" cy="56" r="6" fill="white" />
        <ellipse cx="170" cy="72" rx="10" ry="6" fill="white" />
        <circle cx="100" cy="148" r="4" fill="rgba(255,255,255,0.8)" />
        <circle cx="114" cy="148" r="4" fill="rgba(255,255,255,0.5)" />
        <circle cx="128" cy="148" r="4" fill="rgba(255,255,255,0.3)" />
      </svg>
    ),
  },
];

function storageKey(uid) {
  return `constrak_onboarding_${uid}`;
}

export function hasCompletedOnboarding(uid) {
  return localStorage.getItem(storageKey(uid)) === 'true';
}

// userId: the logged-in user's uid
// onSkip: called when user skips — does NOT persist, tour shows again next login
// onComplete: called when user clicks "הבנתי, אל תציג שוב" — persists permanently
export default function OnboardingTour({ userId, onSkip, onComplete }) {
  const [slide, setSlide] = useState(0);
  const [exiting, setExiting] = useState(false);

  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  function skip() {
    setExiting(true);
    setTimeout(onSkip, 380);
  }

  function complete() {
    localStorage.setItem(storageKey(userId), 'true');
    setExiting(true);
    setTimeout(onComplete, 380);
  }

  function next() {
    setSlide(s => s + 1);
  }

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'linear-gradient(160deg, #4fb8e0 0%, #80cded 45%, #a8dff5 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 0.38s ease',
        opacity: exiting ? 0 : 1,
        padding: '24px 20px',
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -60, width: 380, height: 380, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

      {/* Slide card */}
      <div
        key={slide}
        style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: 28,
          padding: '40px 36px 32px',
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          animation: 'slide-in 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Illustration */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          {current.illustration}
        </div>

        {/* Title */}
        <h2 style={{
          margin: '0 0 14px',
          fontSize: 26,
          fontWeight: 800,
          color: 'white',
          textShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          lineHeight: 1.3,
        }}>
          {current.title}
        </h2>

        {/* Description */}
        <p style={{
          margin: '0 0 32px',
          fontSize: 16,
          color: 'rgba(255,255,255,0.88)',
          lineHeight: 1.7,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
          {current.description}
        </p>

        {/* Primary action button */}
        <button
          onClick={isLast ? complete : next}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            border: 'none',
            background: '#f3ce1f',
            color: '#1a2a3a',
            fontSize: isLast ? 15 : 17,
            fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.2px',
            boxShadow: '0 4px 20px rgba(243,206,31,0.4)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(243,206,31,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(243,206,31,0.4)'; }}
        >
          {isLast ? 'הבנתי, אל תציג שוב' : 'הבא'}
        </button>

        {/* Skip button — on every slide, does NOT persist */}
        <button
          onClick={skip}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '10px 0',
            borderRadius: 12,
            border: '1.5px solid rgba(255,255,255,0.45)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            transition: 'background 0.18s, color 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
        >
          דלג
        </button>
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === slide ? 28 : 10,
              height: 10,
              borderRadius: 5,
              background: i === slide ? '#f3ce1f' : 'rgba(255,255,255,0.45)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
