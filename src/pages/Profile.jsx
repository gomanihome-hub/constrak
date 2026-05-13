import { useState, useRef, useEffect } from 'react';
import { useAuth, firebaseErrorToHebrew } from '../context/AuthContext';
import { useRoles, ROLES } from '../context/RolesContext';
import { DOC_PROJECTS } from '../data/documentsStore';

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDateTime(iso) {
  if (!iso) return 'לא זמין';
  return new Date(iso).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function ProfileAvatar({ photoURL, initials, size, onClick, editable }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block', cursor: editable ? 'pointer' : 'default' }} onClick={onClick}>
      {photoURL
        ? <img src={photoURL} alt={initials}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', display: 'block' }} />
        : <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#4fb8e0,#80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: size * 0.35, border: '4px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', flexShrink: 0 }}>
            {initials || '?'}
          </div>
      }
      {editable && (
        <div style={{ position: 'absolute', bottom: 4, left: 4, width: 28, height: 28, borderRadius: '50%', background: '#f3ce1f', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.25)', fontSize: 14 }}>
          📷
        </div>
      )}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, icon, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '9px 13px',
  fontSize: 14, outline: 'none', direction: 'rtl', color: '#1e293b',
  background: 'white', transition: 'border-color 0.15s',
  width: '100%', boxSizing: 'border-box',
};
const inputFocusStyle = { borderColor: '#4fb8e0', boxShadow: '0 0 0 3px rgba(79,184,224,0.12)' };
const readonlyStyle   = { ...inputStyle, background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' };

function Input({ value, onChange, placeholder, type = 'text', readOnly, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      readOnly={readOnly} {...rest}
      style={{ ...(readOnly ? readonlyStyle : inputStyle), ...(focused && !readOnly ? inputFocusStyle : {}) }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  const colors = { success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' }, error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' }, info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' } };
  const c = colors[type] ?? colors.info;
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 2000, background: c.bg, border: `1px solid ${c.border}`, color: c.text, borderRadius: 12, padding: '12px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 14, fontWeight: 600, direction: 'rtl', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 360 }}>
      <span>{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, fontSize: 16, marginRight: 'auto', lineHeight: 1 }}>✕</button>
    </div>
  );
}

// ─── Main Profile page ────────────────────────────────────────────────────────
export default function Profile({ setActivePage }) {
  const { user, updateProfile, changePassword, resendVerification } = useAuth();
  const { currentSystemUser, currentRole, updateCurrentUserProfile, getAssignedProjectIds } = useRoles();
  const roleInfo = ROLES[currentRole];

  const [toast, setToast]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [pwdSaving, setPwd]   = useState(false);
  const [resending, setRe]    = useState(false);
  const [resentDone, setReDone] = useState(false);

  // Personal info fields
  const [displayName, setName]    = useState(user?.displayName ?? '');
  const [phone, setPhone]         = useState(currentSystemUser?.phone ?? '');
  const [company, setCompany]     = useState(currentSystemUser?.company ?? '');
  const [photoPreview, setPhoto]  = useState(user?.photoURL ?? null);

  // Password fields
  const [currentPwd, setCurPwd] = useState('');
  const [newPwd,     setNewPwd] = useState('');
  const [confirmPwd, setConPwd] = useState('');
  const [showPwds,   setShowP]  = useState(false);
  const [pwdErrors,  setPwdErr] = useState({});

  const photoInputRef = useRef(null);
  const MAX_PHOTO = 3 * 1024 * 1024;

  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const assignedIds   = getAssignedProjectIds();
  const assignedProjects = assignedIds === null
    ? DOC_PROJECTS
    : DOC_PROJECTS.filter(p => assignedIds.includes(p.id));

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO) { showToast('התמונה גדולה מדי — מקסימום 3MB', 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast('נא לבחור קובץ תמונה', 'error'); return; }
    const dataUrl = await readFileAsDataUrl(file);
    setPhoto(dataUrl);
    e.target.value = '';
  }

  function removePhoto() {
    setPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  async function handleSaveProfile() {
    if (!displayName.trim()) { showToast('השם המלא הוא שדה חובה', 'error'); return; }
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim(), photoURL: photoPreview });
      updateCurrentUserProfile({ phone: phone.trim(), company: company.trim(), displayName: displayName.trim() });
      showToast('הפרופיל עודכן בהצלחה', 'success');
    } catch (err) {
      showToast(firebaseErrorToHebrew(err?.code) || 'שגיאה בשמירה', 'error');
    } finally {
      setSaving(false);
    }
  }

  function validatePassword() {
    const errs = {};
    if (!currentPwd)        errs.current  = 'נא להזין את הסיסמה הנוכחית';
    if (!newPwd)            errs.new      = 'נא להזין סיסמה חדשה';
    else if (newPwd.length < 6) errs.new  = 'הסיסמה חייבת להכיל לפחות 6 תווים';
    if (newPwd !== confirmPwd) errs.confirm = 'הסיסמאות אינן תואמות';
    setPwdErr(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleChangePassword() {
    if (!validatePassword()) return;
    setPwd(true);
    try {
      await changePassword(currentPwd, newPwd);
      showToast('הסיסמה שונתה בהצלחה', 'success');
      setCurPwd(''); setNewPwd(''); setConPwd(''); setPwdErr({});
    } catch (err) {
      if (err?.code === 'auth/wrong-password') setPwdErr(p => ({ ...p, current: 'הסיסמה הנוכחית שגויה' }));
      else showToast(firebaseErrorToHebrew(err?.code) || 'שגיאה בשינוי סיסמה', 'error');
    } finally {
      setPwd(false);
    }
  }

  async function handleResend() {
    setRe(true);
    try {
      await resendVerification();
      setReDone(true);
      showToast('אימייל אימות נשלח!', 'info');
    } finally {
      setRe(false);
    }
  }

  const isSocialLogin = user?.provider === 'google' || user?.provider === 'facebook';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', direction: 'rtl' }}>
      {/* Hero banner */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#4fb8e0 100%)', padding: '32px 32px 72px' }}>
        <button onClick={() => setActivePage?.('dashboard')}
          style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          ◀ חזרה
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            <ProfileAvatar photoURL={photoPreview} initials={initials} size={96} editable onClick={() => photoInputRef.current?.click()} />
            {photoPreview && (
              <button onClick={removePhoto} style={{ display: 'block', marginTop: 6, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                הסר תמונה
              </button>
            )}
          </div>
          <div style={{ color: 'white', paddingBottom: 4 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800 }}>{displayName || 'משתמש'}</h2>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {roleInfo && (
                <span style={{ background: roleInfo.bg, color: roleInfo.color, border: `1px solid ${roleInfo.border}`, borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                  {roleInfo.icon} {roleInfo.label}
                </span>
              )}
              {user?.emailVerified
                ? <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>✅ אימייל מאומת</span>
                : <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>⚠️ אימייל לא מאומת</span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Content cards — pulled up over the banner */}
      <div style={{ maxWidth: 900, margin: '-40px auto 40px', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Personal info */}
        <Card title="פרטים אישיים" icon="👤">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
            <Field label="שם מלא *">
              <Input value={displayName} onChange={e => setName(e.target.value)} placeholder="שם מלא" />
            </Field>
            <Field label="כתובת אימייל">
              <Input value={user?.email ?? ''} readOnly placeholder="אימייל" />
            </Field>
            <Field label="טלפון">
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" type="tel" />
            </Field>
            <Field label="חברה / ארגון">
              <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="שם החברה" />
            </Field>
          </div>

          {/* Email verification row */}
          {!user?.emailVerified && !isSocialLogin && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18 }}>📧</span>
              <p style={{ margin: 0, fontSize: 13, color: '#713f12', flex: 1 }}>
                האימייל שלך עדיין לא אומת. {resentDone ? 'שלחנו לך אימייל אימות.' : 'שלח אימייל לאימות כתובת המייל.'}
              </p>
              {!resentDone && (
                <button onClick={handleResend} disabled={resending}
                  style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 700, cursor: resending ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  {resending ? 'שולח...' : 'שלח אימות'}
                </button>
              )}
            </div>
          )}

          {/* Last login */}
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 15 }}>🕐</span>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              <strong style={{ color: '#334155' }}>כניסה אחרונה: </strong>
              {fmtDateTime(user?.lastLoginAt)}
            </p>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-start' }}>
            <button onClick={handleSaveProfile} disabled={saving}
              style={{ background: saving ? '#93c5fd' : 'linear-gradient(135deg,#4fb8e0,#80cded)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 28px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, boxShadow: '0 2px 8px rgba(79,184,224,0.35)' }}>
              {saving ? 'שומר...' : '💾 שמור שינויים'}
            </button>
          </div>
        </Card>

        {/* Security */}
        <Card title="אבטחה ■ שינוי סיסמה" icon="🔒">
          {isSocialLogin
            ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b', padding: '8px 0' }}>
                <span style={{ fontSize: 24 }}>{user.provider === 'google' ? '🔵' : '🔷'}</span>
                <p style={{ margin: 0, fontSize: 14 }}>
                  הכניסה שלך מנוהלת על ידי {user.provider === 'google' ? 'Google' : 'Facebook'}.
                  שינוי סיסמה אינו זמין למשתמשי {user.provider === 'google' ? 'Google' : 'Facebook'}.
                </p>
              </div>
            )
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
                  <Field label="סיסמה נוכחית">
                    <div style={{ position: 'relative' }}>
                      <Input value={currentPwd} onChange={e => setCurPwd(e.target.value)} type={showPwds ? 'text' : 'password'} placeholder="••••••••" />
                      {pwdErrors.current && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{pwdErrors.current}</p>}
                    </div>
                  </Field>
                  <Field label="סיסמה חדשה">
                    <Input value={newPwd} onChange={e => setNewPwd(e.target.value)} type={showPwds ? 'text' : 'password'} placeholder="לפחות 6 תווים" />
                    {pwdErrors.new && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{pwdErrors.new}</p>}
                  </Field>
                  <Field label="אישור סיסמה חדשה">
                    <Input value={confirmPwd} onChange={e => setConPwd(e.target.value)} type={showPwds ? 'text' : 'password'} placeholder="••••••••" />
                    {pwdErrors.confirm && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{pwdErrors.confirm}</p>}
                  </Field>
                </div>

                {/* password strength */}
                {newPwd.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>חוזק:</span>
                    {['#ef4444','#f97316','#eab308','#22c55e'].map((c, i) => (
                      <div key={i} style={{ height: 5, flex: 1, borderRadius: 99, background: newPwd.length > i * 3 ? c : '#e2e8f0', maxWidth: 60 }} />
                    ))}
                    <span style={{ fontSize: 11, color: newPwd.length < 6 ? '#ef4444' : newPwd.length < 10 ? '#f97316' : '#22c55e' }}>
                      {newPwd.length < 6 ? 'חלשה' : newPwd.length < 10 ? 'בינונית' : 'חזקה'}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={handleChangePassword} disabled={pwdSaving}
                    style={{ background: pwdSaving ? '#93c5fd' : '#1e293b', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, cursor: pwdSaving ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                    {pwdSaving ? 'משנה...' : '🔐 שנה סיסמה'}
                  </button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showPwds} onChange={e => setShowP(e.target.checked)} />
                    הצג סיסמאות
                  </label>
                </div>
              </div>
            )
          }
        </Card>

        {/* Projects */}
        <Card title="פרויקטים מוקצים" icon="🏗️">
          {assignedProjects.length === 0
            ? <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>אין פרויקטים מוקצים</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {assignedIds === null && (
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#4fb8e0', fontWeight: 600 }}>
                    👑 כמנהל מערכת יש לך גישה לכל הפרויקטים
                  </p>
                )}
                {assignedProjects.map((p, i) => {
                  const icons = ['🏙️','🏬','🏡'];
                  const colors = ['#3b82f6','#8b5cf6','#22c55e'];
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <span style={{ fontSize: 22 }}>{icons[i % icons.length]}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{p.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>מזהה פרויקט: {p.id}</p>
                      </div>
                      <span style={{ background: colors[i % colors.length] + '22', color: colors[i % colors.length], borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>פעיל</span>
                    </div>
                  );
                })}
              </div>
            )
          }
        </Card>

        {/* Account info */}
        <Card title="פרטי חשבון" icon="ℹ️">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
            {[
              { label: 'מזהה משתמש', value: user?.uid ?? '—' },
              { label: 'ספק כניסה',  value: user?.provider === 'google' ? '🔵 Google' : user?.provider === 'facebook' ? '🔷 Facebook' : '📧 אימייל/סיסמה' },
              { label: 'תאריך יצירת חשבון', value: currentSystemUser?.createdAt ? new Date(currentSystemUser.createdAt).toLocaleDateString('he-IL') : '—' },
              { label: 'סטטוס',      value: currentSystemUser?.status === 'active' ? '🟢 פעיל' : '🔴 לא פעיל' },
            ].map(row => (
              <div key={row.label} style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <p style={{ margin: '0 0 3px', fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{row.label}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#334155', fontWeight: 600, wordBreak: 'break-all' }}>{row.value}</p>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
