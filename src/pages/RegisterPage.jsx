import { useState } from 'react';
import { useAuth, firebaseErrorToHebrew } from '../context/AuthContext';
import EmailVerificationModal from '../components/EmailVerificationModal';

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

function Spinner({ dark }) {
  return <span style={{ display:'inline-block', width:16, height:16, border:`2px solid ${dark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.4)'}`, borderTopColor: dark ? '#555' : 'white', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />;
}

function FieldInput({ icon, type = 'text', value, onChange, placeholder, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{ position:'relative' }}>
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} dir="rtl"
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width:'100%', padding:'11px 38px 11px 14px', border:`1.5px solid ${error ? '#fca5a5' : focused || value ? TEAL : '#e2e8f0'}`, borderRadius:11, fontSize:14, color:'#1e293b', outline:'none', background: error ? '#fff8f8' : '#f8fafc', boxSizing:'border-box', transition:'border-color 0.2s' }}
        />
        <span style={{ position:'absolute', top:'50%', right:11, transform:'translateY(-50%)', fontSize:15, pointerEvents:'none' }}>{icon}</span>
      </div>
      {error && <p style={{ margin:'4px 0 0', fontSize:12, color:'#ef4444' }}>{error}</p>}
    </div>
  );
}

function PasswordInput({ value, onChange, show, onToggle, placeholder, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{ position:'relative' }}>
        <input
          type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} dir="rtl"
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width:'100%', padding:'11px 38px 11px 38px', border:`1.5px solid ${error ? '#fca5a5' : focused || value ? TEAL : '#e2e8f0'}`, borderRadius:11, fontSize:14, color:'#1e293b', outline:'none', background: error ? '#fff8f8' : '#f8fafc', boxSizing:'border-box', transition:'border-color 0.2s' }}
        />
        <span style={{ position:'absolute', top:'50%', right:11, transform:'translateY(-50%)', fontSize:15, pointerEvents:'none' }}>🔒</span>
        <button type="button" onClick={onToggle}
          style={{ position:'absolute', top:'50%', left:10, transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:15, color:'#94a3b8', padding:0 }}>
          {show ? '🙈' : '👁️'}
        </button>
      </div>
      {error && <p style={{ margin:'4px 0 0', fontSize:12, color:'#ef4444' }}>{error}</p>}
    </div>
  );
}

export default function RegisterPage({ onLogin }) {
  const { register, loginWithGoogle, loginWithFacebook } = useAuth();

  const [form, setForm] = useState({ fullName:'', email:'', phone:'', company:'', password:'', confirmPassword:'' });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(null); // null | 'email' | 'google' | 'facebook'
  const [errors, setErrors]           = useState({});
  const [globalError, setGlobalError] = useState('');
  const [verifyModal, setVerifyModal] = useState(null); // null | { token, email }

  function set(field) { return (val) => setForm((f) => ({ ...f, [field]: val })); }

  function validate() {
    const e = {};
    if (!form.fullName.trim())              e.fullName = 'שדה חובה';
    if (!form.email.trim())                 e.email = 'שדה חובה';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'אימייל לא תקין';
    if (!form.password)                     e.password = 'שדה חובה';
    else if (form.password.length < 6)      e.password = 'לפחות 6 תווים';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'הסיסמאות אינן תואמות';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    setErrors({});
    setGlobalError('');
    setLoading('email');
    try {
      const verification = await register(form.email, form.password, form.fullName);
      // Show mock verification email popup immediately after registration
      if (verification) setVerifyModal(verification);
    } catch (err) {
      const msg = firebaseErrorToHebrew(err.code);
      if (msg) setGlobalError(msg);
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setGlobalError('');
    setLoading('google');
    try {
      await loginWithGoogle();
    } catch (err) {
      const msg = firebaseErrorToHebrew(err.code);
      if (msg) setGlobalError(msg);
    } finally {
      setLoading(null);
    }
  }

  async function handleFacebook() {
    setGlobalError('');
    setLoading('facebook');
    try {
      await loginWithFacebook();
    } catch (err) {
      const msg = firebaseErrorToHebrew(err.code);
      if (msg) setGlobalError(msg);
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

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
            {[['🚀','הצטרף לאלפי קבלנים וחברות בנייה'],['🔐','אבטחת מידע ברמה הגבוהה ביותר'],['📱','גישה מכל מכשיר בכל זמן'],['🆓','ניסיון חינם למשך 30 יום']].map(([icon,text]) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:12, color:'rgba(255,255,255,0.9)', fontSize:15 }}>
                <span style={{ fontSize:20 }}>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Register card */}
      <div style={{ width:'100%', maxWidth:480, display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'rgba(255,255,255,0.08)', backdropFilter:'blur(2px)' }}>
        <div style={{ width:'100%', background:'white', borderRadius:24, padding:'36px 36px', boxShadow:'0 20px 60px rgba(0,0,0,0.18)' }}>

          {/* Mobile logo */}
          <div className="flex md:hidden" style={{ justifyContent:'center', marginBottom:24, flexDirection:'column', alignItems:'center', gap:10 }}>
            <div style={{ width:56, height:56, borderRadius:14, background:`linear-gradient(135deg, ${TEAL_DARK}, ${TEAL})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BrandIcon size={32} />
            </div>
            <span style={{ fontSize:22, fontWeight:800, color:'#1e293b' }}>CON<span style={{ color:TEAL_DARK }}>STRAK</span></span>
          </div>

          <div style={{ marginBottom:24, textAlign:'right' }}>
            <h2 style={{ margin:0, fontSize:24, fontWeight:700, color:'#1e293b' }}>יצירת חשבון חדש</h2>
            <p style={{ margin:'6px 0 0', fontSize:14, color:'#64748b' }}>הצטרף לקונסטרק וייעל את ניהול האתרים שלך</p>
          </div>

          {globalError && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', color:'#dc2626', fontSize:14, marginBottom:18, textAlign:'right' }}>
              ⚠️ {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>שם מלא <Req /></label>
              <FieldInput icon="👤" value={form.fullName} onChange={set('fullName')} placeholder="ישראל ישראלי" error={errors.fullName} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>אימייל <Req /></label>
              <FieldInput icon="✉️" type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" error={errors.email} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>טלפון</label>
                <FieldInput icon="📞" type="tel" value={form.phone} onChange={set('phone')} placeholder="050-0000000" />
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>חברה / קבלן</label>
                <FieldInput icon="🏢" value={form.company} onChange={set('company')} placeholder="שם החברה" />
              </div>
            </div>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>סיסמה <Req /></label>
              <PasswordInput value={form.password} onChange={set('password')} show={showPass} onToggle={() => setShowPass(!showPass)} placeholder="לפחות 6 תווים" error={errors.password} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>אימות סיסמה <Req /></label>
              <PasswordInput value={form.confirmPassword} onChange={set('confirmPassword')} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} placeholder="הכנס שוב את הסיסמה" error={errors.confirmPassword} />
            </div>
            <label style={{ display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" required style={{ accentColor:TEAL, width:15, height:15, marginTop:1, flexShrink:0 }} />
              <span style={{ fontSize:12, color:'#64748b', lineHeight:1.5 }}>
                אני מסכים/ה ל<InlineLink>תנאי השימוש</InlineLink> ול<InlineLink>מדיניות הפרטיות</InlineLink>
              </span>
            </label>

            <button type="submit" disabled={busy}
              style={{ width:'100%', padding:'13px', background: busy ? '#e2e8f0' : `linear-gradient(135deg, ${GOLD}, #e8b800)`, color: busy ? '#94a3b8' : '#1a1a00', border:'none', borderRadius:12, fontSize:16, fontWeight:700, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: busy ? 'none' : `0 4px 16px ${GOLD}88`, transition:'all 0.2s', marginTop:2 }}
              onMouseEnter={(e) => { if (!busy) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
            >
              {loading === 'email'
                ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><Spinner dark />יוצר חשבון...</span>
                : 'צור חשבון'}
            </button>
          </form>

          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'18px 0' }}>
            <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
            <span style={{ fontSize:13, color:'#94a3b8', whiteSpace:'nowrap' }}>או הירשם עם</span>
            <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <SocialBtn onClick={handleGoogle} loading={loading === 'google'} disabled={busy}
              bg="white" color="#3c4043" border="1.5px solid #e2e8f0" hoverBg="#f8fafc">
              <GoogleIcon /><span>Google</span>
            </SocialBtn>
            <SocialBtn onClick={handleFacebook} loading={loading === 'facebook'} disabled={busy}
              bg="#1877F2" color="white" border="none" hoverBg="#166FE5">
              <FacebookIcon /><span>Facebook</span>
            </SocialBtn>
          </div>

          <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#64748b' }}>
            כבר יש לך חשבון?{' '}
            <button type="button" onClick={onLogin}
              style={{ color:TEAL_DARK, fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:13 }}>
              כניסה למערכת
            </button>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {verifyModal && (
        <EmailVerificationModal
          token={verifyModal.token}
          email={verifyModal.email}
          onVerified={() => setVerifyModal(null)}
          onClose={() => setVerifyModal(null)}
        />
      )}
    </div>
  );
}

function Req() {
  return <span style={{ color:'#ef4444' }}>*</span>;
}

function InlineLink({ children }) {
  return (
    <button type="button" style={{ color:TEAL_DARK, fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:'0 2px', fontSize:12 }}>
      {children}
    </button>
  );
}

function SocialBtn({ onClick, loading, disabled, bg, color, border, hoverBg, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ flex:1, padding:'11px', background: hovered && !disabled ? hoverBg : bg, color, border, borderRadius:12, fontSize:13, fontWeight:600, cursor: disabled ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background 0.2s', opacity: disabled && !loading ? 0.6 : 1 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      {loading ? <><Spinner dark={bg === 'white'} /><span>...</span></> : children}
    </button>
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
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
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
