import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import EmailVerificationModal from './EmailVerificationModal';

export default function EmailVerificationBanner() {
  const { user, sendVerificationEmail } = useAuth();
  const [modal, setModal] = useState(null); // null | { token, email }
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Don't render for verified users or when no user
  if (!user || user.emailVerified) return null;

  function handleResend() {
    if (sending) return;
    setSending(true);
    setSent(false);
    setTimeout(() => {
      const result = sendVerificationEmail();
      if (result) {
        setModal(result);
        setSent(true);
      }
      setSending(false);
    }, 600);
  }

  return (
    <>
      <div
        dir="rtl"
        style={{
          background: 'linear-gradient(135deg, #fef9c3, #fef3c7)',
          borderBottom: '1px solid #fde68a',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontWeight: 500 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <span>האימייל שלך לא אומת. אמת את כתובת האימייל כדי להנות מגישה מלאה.</span>
        </div>
        <button
          onClick={handleResend}
          disabled={sending}
          style={{
            flexShrink: 0,
            padding: '6px 16px',
            background: sending ? '#e5e7eb' : '#f3ce1f',
            color: sending ? '#9ca3af' : '#1a1a00',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: sending ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s, transform 0.15s',
            display: 'flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { if (!sending) e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
        >
          {sending ? (
            <>
              <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #9ca3af', borderTopColor: '#4b5563', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              שולח...
            </>
          ) : (
            'שלח מחדש'
          )}
        </button>
      </div>

      {modal && (
        <EmailVerificationModal
          token={modal.token}
          email={modal.email}
          onVerified={() => setModal(null)}
          onClose={() => setModal(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
