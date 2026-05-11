import { useState } from 'react';
import { useAuth, firebaseErrorToHebrew, DEMO_CREDENTIALS } from '../context/AuthContext';

const TEAL = '#80cded';
const TEAL_DARK = '#4fb8e0';
const GOLD = '#f3ce1f';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function Spinner() {
  return (
    <span style={{ display:'inline-block', width:16, height:16, border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
  );
}

export default function LoginPage({ onRegister }) {
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(null); // null | 'email' | 'google' | 'facebook'
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('יש למלא אימייל וסיסמה'); return; }
    setError('');
    setLoading('email');
    try {
      await login(email, password);
    } catch (err) {
      const msg = firebaseErrorToHebrew(err.code);
      if (msg) setError(msg);
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading('google');
    try {
      await loginWithGoogle();
    } catch (err) {
      const msg = firebaseErrorToHebrew(err.code);
      if (msg) setError(msg);
    } finally {
      setLoading(null);
    }
  }

  async function handleFacebook() {
    setError('');
    setLoading('facebook');
    try {
      await loginWithFacebook();
    } catch (err) {
      const msg = firebaseErrorToHebrew(err.code);
      if (msg) setError(msg);
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  function fillDemo() {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError('');
  }

  return (
    <div dir="rtl" style={{ minHeight:'100vh', display:'flex', fontFamily:"'Segoe UI', system-ui, sans-serif", background:`linear-gradient(160deg, #4fb8e0 0%, ${TEAL} 50%, #c2ebf8 100%)` }}>

      {/* Decorative left panel */}
      <div className="hidden md:flex" style={{ flex:1, flexDirection:'column', alignItems:'center', justifyContent:'center', padding:48, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-100, left:-100, width:400, height:400, borderRadius:'50%', background:'rgba(255,255,255,0.07)' }} />
        <div style={{ position:'absolute', bottom:-80, right:-60, width:300, height:300, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div style={{ textAlign:'center', position:'relative', zIndex:1 }}>
          <BrandLogo size={120} />
          <h1 style={{ margin:'28px 0 0', fontSize:52, fontWeight:800, color:'white', letterSpacing:'-1.5px', textShadow:'0 2px 12px rgba(0,0,0,0.15)' }}>
            CON<span style={{ color:GOLD }}>STRAK</span>
          </h1>
          <p style={{ margin:'10px 0 0', fontSize:16, color:'rgba(255,255,255,0.85)', letterSpacing:'3px', fontWeight:500 }}>ניהול אתרי בנייה</p>
          <div style={{ marginTop:48, display:'flex', flexDirection:'column', gap:16, textAlign:'right' }}>
            {[['🏗️','ניהול פרויקטים בזמן אמת'],['👷','מעקב עובדים ומשמרות'],['📦','בקרת חומרים ומלאי'],['📊','דוחות וניתוחים מתקדמים']].map(([icon,text]) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:12, color:'rgba(255,255,255,0.9)', fontSize:15 }}>
                <span style={{ fontSize:20 }}>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login card */}
      <div style={{ width:'100%', maxWidth:460, display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'rgba(255,255,255,0.08)', backdropFilter:'blur(2px)' }}>
        <div style={{ width:'100%', background:'white', borderRadius:24, padding:'40px 36px', boxShadow:'0 20px 60px rgba(0,0,0,0.18)' }}>

          {/* Mobile logo */}
          <div className="flex md:hidden" style={{ justifyContent:'center', marginBottom:28, flexDirection:'column', alignItems:'center', gap:10 }}>
            <div style={{ width:56, height:56, borderRadius:14, background:`linear-gradient(135deg, ${TEAL_DARK}, ${TEAL})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BrandIcon size={32} />
            </div>
            <span style={{ fontSize:22, fontWeight:800, color:'#1e293b' }}>CON<span style={{ color:TEAL_DARK }}>STRAK</span></span>
          </div>

          <div style={{ marginBottom:20, textAlign:'right' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <h2 style={{ margin:0, fontSize:26, fontWeight:700, color:'#1e293b' }}>כניסה למערכת</h2>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.5px', color:'#92400e', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:20, padding:'3px 10px' }}>
                מצב דמו
              </span>
            </div>
            <p style={{ margin:'6px 0 0', fontSize:14, color:'#64748b' }}>ברוכים השבים לקונסטרק</p>
          </div>

          {/* Demo credentials hint */}
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 14px', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
              <button
                type="button"
                onClick={fillDemo}
                style={{ fontSize:12, fontWeight:700, color:'#92400e', background:'#fde68a', border:'none', borderRadius:8, padding:'5px 12px', cursor:'pointer', whiteSpace:'nowrap', transition:'background 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fcd34d'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fde68a'; }}
              >
                מלא אוטומטית
              </button>
              <div style={{ textAlign:'right' }}>
                <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#92400e' }}>🔑 פרטי כניסה לדמו</p>
                <p style={{ margin:'3px 0 0', fontSize:11, color:'#a16207', fontFamily:'monospace', direction:'ltr', textAlign:'left' }}>
                  {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', color:'#dc2626', fontSize:14, marginBottom:20, textAlign:'right' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <InputField label="אימייל" icon="✉️" type="email" value={email} onChange={setEmail} placeholder="your@email.com" />

            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <button type="button" style={{ fontSize:13, color:TEAL_DARK, background:'none', border:'none', cursor:'pointer', padding:0, fontWeight:500 }}>שכחתי סיסמה</button>
                <label style={{ fontSize:13, fontWeight:600, color:'#374151' }}>סיסמה</label>
              </div>
              <div style={{ position:'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="הכנס סיסמה" dir="rtl"
                  style={{ width:'100%', padding:'12px 42px 12px 42px', border:`1.5px solid ${password ? TEAL : '#e2e8f0'}`, borderRadius:12, fontSize:14, color:'#1e293b', outline:'none', background:'#f8fafc', boxSizing:'border-box', transition:'border-color 0.2s' }}
                  onFocus={(e) => { e.target.style.borderColor = TEAL; }}
                  onBlur={(e)  => { e.target.style.borderColor = password ? TEAL : '#e2e8f0'; }}
                />
                <span style={{ position:'absolute', top:'50%', right:14, transform:'translateY(-50%)', fontSize:17, pointerEvents:'none' }}>🔒</span>
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position:'absolute', top:'50%', left:12, transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:15, color:'#94a3b8', padding:0 }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <GoldButton loading={loading === 'email'} disabled={busy}>כניסה למערכת</GoldButton>
          </form>

          <Divider label="או התחבר עם" />

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <SocialButton onClick={handleGoogle} loading={loading === 'google'} disabled={busy}
              style={{ background:'white', color:'#3c4043', border:'1.5px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}
              hoverStyle={{ background:'#f8fafc', borderColor:'#cbd5e1' }}>
              <GoogleIcon /><span>כניסה עם Google</span>
            </SocialButton>

            <SocialButton onClick={handleFacebook} loading={loading === 'facebook'} disabled={busy}
              style={{ background:'#1877F2', color:'white', border:'none', boxShadow:'0 2px 8px rgba(24,119,242,0.35)' }}
              hoverStyle={{ background:'#166FE5' }}>
              <FacebookIcon /><span>כניסה עם Facebook</span>
            </SocialButton>
          </div>

          <p style={{ textAlign:'center', marginTop:24, fontSize:13, color:'#64748b' }}>
            אין לך חשבון?{' '}
            <button type="button" onClick={onRegister} style={{ color:TEAL_DARK, fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:13 }}>
              צור חשבון חדש
            </button>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function InputField({ label, icon, type = 'text', value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} dir="rtl"
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width:'100%', padding:'12px 42px 12px 14px', border:`1.5px solid ${focused || value ? TEAL : '#e2e8f0'}`, borderRadius:12, fontSize:14, color:'#1e293b', outline:'none', background:'#f8fafc', boxSizing:'border-box', transition:'border-color 0.2s' }}
        />
        <span style={{ position:'absolute', top:'50%', right:14, transform:'translateY(-50%)', fontSize:17, pointerEvents:'none' }}>{icon}</span>
      </div>
    </div>
  );
}

function GoldButton({ loading, disabled, children }) {
  return (
    <button type="submit" disabled={disabled}
      style={{ width:'100%', padding:'13px', background: disabled && !loading ? '#e2e8f0' : `linear-gradient(135deg, ${GOLD}, #e8b800)`, color: disabled && !loading ? '#94a3b8' : '#1a1a00', border:'none', borderRadius:12, fontSize:16, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer', boxShadow: disabled ? 'none' : `0 4px 16px ${GOLD}88`, transition:'all 0.2s' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
    >
      {loading ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><Spinner />מתחבר...</span> : children}
    </button>
  );
}

function SocialButton({ onClick, loading, disabled, style, hoverStyle, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width:'100%', padding:'12px', borderRadius:12, fontSize:14, fontWeight:600, cursor: disabled ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'all 0.2s', opacity: disabled && !loading ? 0.6 : 1, ...style, ...(hovered && !disabled ? hoverStyle : {}) }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      {loading ? <><Spinner /><span>מתחבר...</span></> : children}
    </button>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'22px 0' }}>
      <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
      <span style={{ fontSize:13, color:'#94a3b8', whiteSpace:'nowrap' }}>{label}</span>
      <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
    </div>
  );
}

function BrandLogo({ size }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.23, background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', boxShadow:'0 12px 40px rgba(0,0,0,0.15)' }}>
      <BrandIcon size={size * 0.57} />
    </div>
  );
}

function BrandIcon({ size }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 52 52" fill="none">
      <rect x="8" y="20" width="36" height="28" rx="2" fill="white" fillOpacity="0.9" />
      <polygon points="4,22 26,4 48,22" fill="white" />
      <rect x="16" y="30" width="8" height="8" rx="1" fill={TEAL} />
      <rect x="28" y="30" width="8" height="8" rx="1" fill={TEAL} />
      <rect x="20" y="42" width="12" height="6" rx="1" fill={TEAL} />
      <line x1="38" y1="4" x2="38" y2="22" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="4" x2="46" y2="4" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="44" y1="4" x2="44" y2="12" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
