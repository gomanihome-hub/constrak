import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoles, ROLES } from '../context/RolesContext';
import { getUnreadAlertCount } from '../data/alertsStore';

const pageTitles = {
  dashboard: 'לוח בקרה',
  projects:  'ניהול פרויקטים',
  tasks:     'משימות',
  workers:   'עובדים',
  materials: 'ניהול חומרים',
  worklog:   'יומן עבודה יומי',
  admin:     'ניהול משתמשים',
  profile:        'הפרופיל שלי',
  notifications:  'מרכז התראות',
  documents: 'מסמכי פרויקט',
  chat:      "צ'אט",
  safety:    'תדרוך בטיחות',
  messages:  'הודעות',
  megaphone: 'מגפון',
};

export default function Header({ activePage, setActivePage }) {
  const { user, logout } = useAuth();
  const { currentRole, currentSystemUser } = useRoles();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [alertUnread, setAlertUnread] = useState(0);
  const menuRef = useRef(null);

  useEffect(() => {
    const uid = currentSystemUser?.id;
    if (!uid) return;
    function refresh() { setAlertUnread(getUnreadAlertCount(uid)); }
    refresh();
    window.addEventListener('constrak:alerts', refresh);
    return () => window.removeEventListener('constrak:alerts', refresh);
  }, [currentSystemUser?.id]);

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'משתמש';
  const initials    = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const roleInfo    = ROLES[currentRole];

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{pageTitles[activePage] ?? ''}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{today}</p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActivePage?.('notifications')}
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="התראות"
        >
          <span className="text-xl">🔔</span>
          {alertUnread > 0 && (
            <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, background: '#ef4444', color: 'white', borderRadius: 99, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
              {alertUnread > 9 ? '9+' : alertUnread}
            </span>
          )}
        </button>
        <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
          <span className="text-xl">⚙️</span>
        </button>
        <div className="w-px h-8 bg-slate-200" />

        {/* User menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 10px', borderRadius: 12,
              border: '1.5px solid transparent',
              background: menuOpen ? '#f1f5f9' : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            onMouseLeave={(e) => { if (!menuOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
          >
            <Avatar user={user} initials={initials} size={36} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>{displayName}</p>
                {roleInfo && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                    background: roleInfo.bg, color: roleInfo.color, border: `1px solid ${roleInfo.border}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {roleInfo.icon} {roleInfo.label}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.2 }}>{user?.email}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#94a3b8', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }}>
              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0,
              minWidth: 240, background: 'white',
              borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid #e2e8f0', overflow: 'hidden', zIndex: 100,
            }}>
              {/* User info header */}
              <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar user={user} initials={initials} size={44} />
                <div style={{ textAlign: 'right', minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                  <p style={{ margin: '2px 0 4px', fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                  {roleInfo && (
                    <span style={{
                      display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px',
                      borderRadius: 99, background: roleInfo.bg, color: roleInfo.color, border: `1px solid ${roleInfo.border}`,
                    }}>
                      {roleInfo.icon} {roleInfo.label}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ padding: '6px' }}>
                <MenuItem icon="👤" label="הפרופיל שלי" onClick={() => { setMenuOpen(false); setActivePage?.('profile'); }} />
                <MenuItem icon="🔒" label="שינוי סיסמה"  onClick={() => { setMenuOpen(false); setActivePage?.('profile'); }} />
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', padding: '6px' }}>
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#ef4444', fontWeight: 500, textAlign: 'right', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 16 }}>🚪</span>
                  <span>יציאה מהמערכת</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Avatar({ user, initials, size }) {
  const TEAL = '#80cded';
  const TEAL_DARK = '#4fb8e0';
  if (user?.photoURL) {
    return (
      <img src={user.photoURL} alt={initials} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${TEAL_DARK}, ${TEAL})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 700, fontSize: size * 0.38, border: '2px solid #e2e8f0',
    }}>
      {initials || '?'}
    </div>
  );
}

function MenuItem({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', background: hovered ? '#f8fafc' : 'transparent', cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 400, textAlign: 'right', transition: 'background 0.15s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
