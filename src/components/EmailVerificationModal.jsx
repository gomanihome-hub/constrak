import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function EmailVerificationModal({ token, email, onVerified, onClose }) {
  const { verifyEmailWithToken } = useAuth();
  const [verified, setVerified] = useState(false);

  function handleVerify() {
    const ok = verifyEmailWithToken(token);
    if (ok) {
      setVerified(true);
      setTimeout(onVerified, 1400);
    }
  }

  const mockLink = `https://constrak.co.il/verify?token=${token}`;

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white',
        borderRadius: 20,
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        animation: 'modal-in 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* Modal header */}
        <div style={{
          background: 'linear-gradient(135deg, #4fb8e0, #80cded)',
          padding: '24px 24px 20px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>
              ✉️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'white' }}>אימות כתובת אימייל</h3>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>סימולציית שליחת מייל</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
            width: 30, height: 30, cursor: 'pointer', color: 'white', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {verified ? (
            /* Success state */
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
              <h4 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#15803d' }}>האימייל אומת בהצלחה!</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>הבאנר יוסר ותוכל להשתמש במערכת באופן מלא.</p>
            </div>
          ) : (
            <>
              {/* Simulated email card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '18px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: '#64748b' }}>
                  <span><strong>מ:</strong> noreply@constrak.co.il</span>
                  <span><strong>אל:</strong> {email}</span>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#1e293b', fontSize: 15 }}>ברוכים הבאים ל-CONSTRAK!</p>
                  <p style={{ margin: '0 0 14px', color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                    כדי להשלים את ההרשמה ולאמת את כתובת האימייל שלך, לחץ על הכפתור למטה:
                  </p>
                  {/* Simulated CTA inside "email" */}
                  <button
                    onClick={handleVerify}
                    style={{
                      display: 'block', width: '100%',
                      padding: '11px',
                      background: 'linear-gradient(135deg, #4fb8e0, #80cded)',
                      color: 'white', border: 'none', borderRadius: 9,
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      marginBottom: 12,
                    }}
                  >
                    אמת כתובת אימייל
                  </button>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, wordBreak: 'break-all' }}>
                    או העתק את הקישור: <span style={{ color: '#4fb8e0' }}>{mockLink}</span>
                  </p>
                </div>
              </div>

              <div style={{
                background: '#fefce8',
                border: '1px solid #fde68a',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 12,
                color: '#92400e',
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                <span>זוהי סימולציה בלבד. במערכת אמיתית, הלינק היה נשלח לאימייל {email}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}
