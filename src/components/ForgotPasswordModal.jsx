import { useState } from 'react';
import { useAuth, firebaseErrorToHebrew } from '../context/AuthContext';

const TEAL      = '#80cded';
const TEAL_DARK = '#4fb8e0';
const GOLD      = '#f3ce1f';

// step: 'email' | 'mock-email' | 'not-found' | 'reset-form' | 'success'

export default function ForgotPasswordModal({ onClose, onRegister }) {
  const { createPasswordResetToken, resetPasswordWithToken } = useAuth();

  const [step,            setStep]    = useState('email');
  const [emailInput,      setEmail]   = useState('');
  const [emailError,      setEmailErr] = useState('');
  const [resetToken,      setToken]   = useState('');
  const [confirmedEmail,  setConfirmedEmail] = useState('');
  const [newPwd,          setNewPwd]  = useState('');
  const [confirmPwd,      setConPwd]  = useState('');
  const [showPwd,         setShowPwd] = useState(false);
  const [pwdErrors,       setPwdErr]  = useState({});
  const [loading,         setLoading] = useState(false);
  const [globalError,     setGlobalError] = useState('');

  // ── Step 1: submit email ───────────────────────────────────────────────────
  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!emailInput.trim()) { setEmailErr('יש להזין כתובת אימייל'); return; }
    if (!/\S+@\S+\.\S+/.test(emailInput)) { setEmailErr('כתובת אימייל לא תקינה'); return; }
    setEmailErr('');
    setLoading(true);
    try {
      const { token, email } = await createPasswordResetToken(emailInput);
      setToken(token);
      setConfirmedEmail(email);
      setStep('mock-email');
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        setConfirmedEmail(emailInput.trim());
        setStep('not-found');
      } else {
        setEmailErr(firebaseErrorToHebrew(err?.code) || 'שגיאה — נסה שוב');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: submit new password ────────────────────────────────────────────
  async function handleResetSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!newPwd)             errs.newPwd    = 'יש להזין סיסמה חדשה';
    else if (newPwd.length < 6) errs.newPwd = 'לפחות 6 תווים';
    if (newPwd !== confirmPwd) errs.confirmPwd = 'הסיסמאות אינן תואמות';
    if (Object.keys(errs).length) { setPwdErr(errs); return; }
    setPwdErr({});
    setGlobalError('');
    setLoading(true);
    try {
      await resetPasswordWithToken(resetToken, newPwd);
      setStep('success');
    } catch (err) {
      setGlobalError(firebaseErrorToHebrew(err?.code) || 'שגיאה — נסה שוב');
    } finally {
      setLoading(false);
    }
  }

  const mockLink = `https://constrak.co.il/reset-password?token=${resetToken}`;

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white', borderRadius: 22,
        width: '100%', maxWidth: 440,
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        animation: 'modal-in 0.26s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* ── STEP 1: email input ───────────────────────────────────────── */}
        {step === 'email' && (
          <>
            <ModalHeader icon="🔑" title="שכחת סיסמה?" subtitle="נשלח לך קישור לאיפוס הסיסמה" onClose={onClose} />
            <form onSubmit={handleEmailSubmit} style={{ padding: '24px 28px 28px' }}>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                הזן את כתובת האימייל שבה נרשמת למערכת. נשלח לך קישור לאיפוס הסיסמה.
              </p>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                כתובת אימייל
              </label>
              <div style={{ position: 'relative', marginBottom: emailError ? 4 : 20 }}>
                <input
                  type="email" value={emailInput}
                  onChange={e => { setEmail(e.target.value); if (emailError) setEmailErr(''); }}
                  placeholder="your@email.com"
                  autoFocus dir="rtl"
                  style={{
                    width: '100%', padding: '11px 40px 11px 14px',
                    border: `1.5px solid ${emailError ? '#fca5a5' : '#e2e8f0'}`,
                    borderRadius: 11, fontSize: 14, color: '#1e293b', outline: 'none',
                    background: emailError ? '#fff8f8' : '#f8fafc', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { if (!emailError) e.target.style.borderColor = TEAL; }}
                  onBlur={e  => { if (!emailError) e.target.style.borderColor = '#e2e8f0'; }}
                />
                <span style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>✉️</span>
              </div>
              {emailError && <p style={{ margin: '4px 0 16px', fontSize: 12, color: '#ef4444' }}>{emailError}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onClose}
                  style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1.5px solid #e2e8f0', background: 'white', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  ביטול
                </button>
                <button type="submit" disabled={loading}
                  style={{ flex: 2, padding: '12px', borderRadius: 11, border: 'none', background: loading ? '#e2e8f0' : `linear-gradient(135deg, ${GOLD}, #e8b800)`, color: loading ? '#94a3b8' : '#1a1a00', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? <><Spin />שולח...</> : 'שלח קישור לאיפוס'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── STEP 2a: mock email sent ──────────────────────────────────── */}
        {step === 'mock-email' && (
          <>
            <ModalHeader icon="✉️" title="קישור לאיפוס נשלח" subtitle="סימולציית שליחת מייל" onClose={onClose} />
            <div style={{ padding: '24px 28px 28px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#166534', display: 'flex', gap: 8 }}>
                <span>✅</span>
                <span>קישור לאיפוס סיסמא נשלח לכתובת האימייל שלך: <strong>{confirmedEmail}</strong></span>
              </div>

              {/* Simulated email card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12, color: '#64748b' }}>
                  <span><strong>מ:</strong> noreply@constrak.co.il</span>
                  <span><strong>אל:</strong> {confirmedEmail}</span>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1e293b', fontSize: 14 }}>איפוס סיסמה ל-CONSTRAK</p>
                  <p style={{ margin: '0 0 14px', color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                    קיבלנו בקשה לאיפוס הסיסמה שלך. לחץ על הכפתור למטה להגדרת סיסמה חדשה:
                  </p>
                  <button
                    onClick={() => setStep('reset-form')}
                    style={{ display: 'block', width: '100%', padding: '11px', background: `linear-gradient(135deg, ${TEAL_DARK}, ${TEAL})`, color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    איפוס סיסמה
                  </button>
                  <p style={{ margin: '10px 0 0', fontSize: 11, color: '#94a3b8', wordBreak: 'break-all' }}>
                    או העתק: <span style={{ color: TEAL_DARK }}>{mockLink}</span>
                  </p>
                </div>
              </div>

              <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 9, padding: '9px 13px', fontSize: 12, color: '#92400e', display: 'flex', gap: 8 }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span>זוהי סימולציה בלבד. במציאות, הקישור היה נשלח לאימייל שלך בתוקף של שעה.</span>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 2b: email not registered ────────────────────────────── */}
        {step === 'not-found' && (
          <>
            <ModalHeader icon="⚠️" title="אינך רשום במערכת" subtitle="" onClose={onClose} />
            <div style={{ padding: '8px 28px 28px' }}>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
                כתובת האימייל <strong>{confirmedEmail}</strong> אינה רשומה במערכת.<br />
                האם תרצה להירשם?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose}
                  style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1.5px solid #e2e8f0', background: 'white', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  ביטול
                </button>
                <button onClick={() => { onClose(); onRegister?.(); }}
                  style={{ flex: 1, padding: '12px', borderRadius: 11, border: 'none', background: `linear-gradient(135deg, ${GOLD}, #e8b800)`, color: '#1a1a00', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  הירשם
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3: reset form ────────────────────────────────────────── */}
        {step === 'reset-form' && (
          <>
            <ModalHeader icon="🔒" title="הגדרת סיסמה חדשה" subtitle={`עבור ${confirmedEmail}`} onClose={onClose} />
            <form onSubmit={handleResetSubmit} style={{ padding: '24px 28px 28px' }}>
              {globalError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, padding: '9px 13px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                  ⚠️ {globalError}
                </div>
              )}
              <PwdField
                label="סיסמה חדשה"
                value={newPwd}
                onChange={v => { setNewPwd(v); setPwdErr(p => ({ ...p, newPwd: '' })); }}
                show={showPwd}
                onToggle={() => setShowPwd(s => !s)}
                placeholder="לפחות 6 תווים"
                error={pwdErrors.newPwd}
              />
              <div style={{ height: 14 }} />
              <PwdField
                label="אישור סיסמה"
                value={confirmPwd}
                onChange={v => { setConPwd(v); setPwdErr(p => ({ ...p, confirmPwd: '' })); }}
                show={showPwd}
                onToggle={() => setShowPwd(s => !s)}
                placeholder="הכנס שוב את הסיסמה"
                error={pwdErrors.confirmPwd}
              />
              <div style={{ height: 24 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep('mock-email')}
                  style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1.5px solid #e2e8f0', background: 'white', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  חזרה
                </button>
                <button type="submit" disabled={loading}
                  style={{ flex: 2, padding: '12px', borderRadius: 11, border: 'none', background: loading ? '#e2e8f0' : `linear-gradient(135deg, ${GOLD}, #e8b800)`, color: loading ? '#94a3b8' : '#1a1a00', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? <><Spin />מאפס...</> : 'אפס סיסמה'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── STEP 4: success ───────────────────────────────────────────── */}
        {step === 'success' && (
          <div style={{ padding: '40px 28px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h3 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#15803d' }}>הסיסמה שונתה בהצלחה!</h3>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
              כעת תוכל להתחבר עם הסיסמה החדשה שלך.
            </p>
            <button
              onClick={onClose}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${GOLD}, #e8b800)`, color: '#1a1a00', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 16px ${GOLD}88` }}
            >
              חזור להתחברות
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.93) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function ModalHeader({ icon, title, subtitle, onClose }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${TEAL_DARK}, ${TEAL})`, padding: '22px 24px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          {icon}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'white' }}>{title}</h3>
          {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{subtitle}</p>}
        </div>
      </div>
      <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: 'white', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        ✕
      </button>
    </div>
  );
}

function PwdField({ label, value, onChange, show, onToggle, placeholder, error }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder} dir="rtl"
          style={{ width: '100%', padding: '11px 40px 11px 40px', border: `1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 11, fontSize: 14, color: '#1e293b', outline: 'none', background: error ? '#fff8f8' : '#f8fafc', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
          onFocus={e => { if (!error) e.target.style.borderColor = TEAL; }}
          onBlur={e  => { if (!error) e.target.style.borderColor = '#e2e8f0'; }}
        />
        <span style={{ position: 'absolute', top: '50%', right: 13, transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🔒</span>
        <button type="button" onClick={onToggle} style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94a3b8', padding: 0 }}>
          {show ? '🙈' : '👁️'}
        </button>
      </div>
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  );
}

function Spin() {
  return <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#555', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
