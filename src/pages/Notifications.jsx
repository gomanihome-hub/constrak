import { useState, useEffect } from 'react';
import { useRoles } from '../context/RolesContext';
import {
  loadAlerts, saveAlerts, ALERT_TYPE_INFO, DEFAULT_SETTINGS,
} from '../data/alertsStore';
import { loadProjects } from '../data/projectsStore';

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

const TRADE_COLORS = {
  'צביעה': '#c2410c', 'אלומיניום': '#1d4ed8', 'קרמיקה': '#7e22ce',
  'גבס': '#6d28d9', 'אינסטלציה': '#0369a1', 'חשמל': '#a16207',
  'גינון': '#166534', 'מסגרות': '#475569', 'ריצוף': '#b45309',
  'בנייה': '#b91c1c', 'טיח': '#57534e', 'נגרות': '#92400e',
};

// ─── NotificationItem ─────────────────────────────────────────────────────────
function NotificationItem({ notif, uid, onMarkRead, onDismiss }) {
  const info    = ALERT_TYPE_INFO[notif.type] ?? ALERT_TYPE_INFO.missing_work_log;
  const isRead  = (notif.readBy ?? []).includes(uid);
  const tradeColor = TRADE_COLORS[notif.contractorTrade] ?? '#475569';

  return (
    <div style={{
      background: isRead ? 'white' : '#fffbf0',
      border: `1.5px solid ${isRead ? '#e2e8f0' : info.border}`,
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      transition: 'all 0.15s', position: 'relative',
    }}>
      {/* Unread dot */}
      {!isRead && (
        <div style={{ position: 'absolute', top: 14, left: 14, width: 8, height: 8, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
      )}

      {/* Type icon */}
      <div style={{ width: 42, height: 42, borderRadius: 10, background: info.bg, border: `1px solid ${info.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {info.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: info.color, background: info.bg, border: `1px solid ${info.border}`, borderRadius: 20, padding: '2px 10px' }}>
            {info.label}
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {fmtDateShort(notif.date)} · {fmtTime(notif.triggeredAt)}
          </span>
          {!isRead && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: '#ef4444', borderRadius: 99, padding: '1px 7px' }}>חדש</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: tradeColor + '22', border: `1px solid ${tradeColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: tradeColor, flexShrink: 0 }}>
              {notif.contractorTrade?.[0] ?? '?'}
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{notif.contractorName}</span>
          </div>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>
          <span style={{ fontSize: 12, color: tradeColor, fontWeight: 600, background: tradeColor + '11', borderRadius: 20, padding: '1px 8px' }}>{notif.contractorTrade}</span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 5 }}>
          <span style={{ fontSize: 13 }}>🏗️</span>
          <span style={{ fontSize: 13, color: '#475569' }}>{notif.projectName}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>· {fmtDate(notif.date)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {!isRead && (
          <button onClick={() => onMarkRead(notif.id)}
            style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✓ נקרא
          </button>
        )}
        <button onClick={() => onDismiss(notif.id)}
          style={{ background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          הסתר
        </button>
      </div>
    </div>
  );
}

// ─── SettingsTab ──────────────────────────────────────────────────────────────
function SettingsTab({ settings, onSave, canConfigure }) {
  const [form, setForm] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [saved, setSaved] = useState(false);

  function set(path, value) {
    setForm(f => {
      const copy = JSON.parse(JSON.stringify(f));
      const keys = path.split('.');
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
    setSaved(false);
  }

  function handleSave() {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputStyle = { border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 11px', fontSize: 13, outline: 'none', background: canConfigure ? 'white' : '#f8fafc', color: '#1e293b', width: 100, boxSizing: 'border-box' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Global card */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', color: 'white', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚙️</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>הגדרות גלובליות</h3>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Global enable */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: canConfigure ? 'pointer' : 'default' }}>
            <div onClick={() => canConfigure && set('globalEnabled', !form.globalEnabled)}
              style={{ width: 44, height: 24, borderRadius: 12, background: form.globalEnabled ? '#22c55e' : '#e2e8f0', position: 'relative', cursor: canConfigure ? 'pointer' : 'default', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, right: form.globalEnabled ? 2 : 20, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'right 0.2s' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>הפעל מערכת התראות אוטומטיות</span>
          </label>

          {/* Default times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, opacity: form.globalEnabled ? 1 : 0.5 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5 }}>🌅 שעת בדיקת תכנון יומי (ברירת מחדל)</label>
              <input type="time" value={form.dayPlanTime} onChange={e => canConfigure && set('dayPlanTime', e.target.value)}
                readOnly={!canConfigure} style={inputStyle} />
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>אם קבלן לא שלח תכנון לפני שעה זו — נשלחת התראה</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5 }}>📋 שעת בדיקת דוח עבודה (ברירת מחדל)</label>
              <input type="time" value={form.workLogTime} onChange={e => canConfigure && set('workLogTime', e.target.value)}
                readOnly={!canConfigure} style={inputStyle} />
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>אם קבלן לא שלח דוח עבודה לפני שעה זו — נשלחת התראה</p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-project settings */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ background: 'linear-gradient(135deg,#4fb8e0,#80cded)', color: 'white', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🏗️</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>הגדרות לפי פרויקט</h3>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {projects.map((project, pi) => {
            const ps = form.projects?.[project.id] ?? DEFAULT_SETTINGS.projects[project.id];
            const projColors = ['#3b82f6','#8b5cf6','#22c55e'];
            const projIcons  = ['🏙️','🏬','🏡'];
            return (
              <div key={project.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                {/* Project header */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 20 }}>{projIcons[pi]}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', flex: 1 }}>{project.name}</span>
                  {/* Enable project toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canConfigure ? 'pointer' : 'default', fontSize: 12, color: '#64748b' }}>
                    <span>התראות:</span>
                    <div onClick={() => canConfigure && set(`projects.${project.id}.enabled`, !ps.enabled)}
                      style={{ width: 36, height: 20, borderRadius: 10, background: ps.enabled && form.globalEnabled ? projColors[pi] : '#e2e8f0', position: 'relative', cursor: canConfigure ? 'pointer' : 'default', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 2, right: ps.enabled ? 2 : 16, width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'right 0.2s' }} />
                    </div>
                    <span style={{ fontWeight: 600, color: ps.enabled ? projColors[pi] : '#94a3b8' }}>{ps.enabled ? 'פעיל' : 'כבוי'}</span>
                  </label>
                </div>

                {/* Project details */}
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12, opacity: (ps.enabled && form.globalEnabled) ? 1 : 0.45 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* Day plan */}
                    <div style={{ padding: '10px 12px', background: '#fef3c7', borderRadius: 10, border: '1px solid #fde68a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>🌅</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>תכנון יומי</span>
                        <label style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: canConfigure ? 'pointer' : 'default' }}>
                          <input type="checkbox" checked={ps.dayPlanEnabled}
                            onChange={e => canConfigure && set(`projects.${project.id}.dayPlanEnabled`, e.target.checked)}
                            style={{ width: 14, height: 14 }} />
                          <span style={{ fontSize: 11, color: '#92400e' }}>פעיל</span>
                        </label>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#78350f' }}>שעת בדיקה מותאמת</label>
                        <input type="time" value={ps.customDayPlanTime || ''} placeholder={form.dayPlanTime}
                          onChange={e => canConfigure && set(`projects.${project.id}.customDayPlanTime`, e.target.value)}
                          readOnly={!canConfigure} style={{ ...inputStyle, background: '#fff', marginTop: 4, display: 'block', width: '100%' }} />
                        {!ps.customDayPlanTime && <p style={{ margin: '3px 0 0', fontSize: 10, color: '#a16207' }}>ישתמש בברירת מחדל ({form.dayPlanTime})</p>}
                      </div>
                    </div>
                    {/* Work log */}
                    <div style={{ padding: '10px 12px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>📋</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>דוח עבודה</span>
                        <label style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: canConfigure ? 'pointer' : 'default' }}>
                          <input type="checkbox" checked={ps.workLogEnabled}
                            onChange={e => canConfigure && set(`projects.${project.id}.workLogEnabled`, e.target.checked)}
                            style={{ width: 14, height: 14 }} />
                          <span style={{ fontSize: 11, color: '#991b1b' }}>פעיל</span>
                        </label>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#7f1d1d' }}>שעת בדיקה מותאמת</label>
                        <input type="time" value={ps.customWorkLogTime || ''} placeholder={form.workLogTime}
                          onChange={e => canConfigure && set(`projects.${project.id}.customWorkLogTime`, e.target.value)}
                          readOnly={!canConfigure} style={{ ...inputStyle, background: '#fff', marginTop: 4, display: 'block', width: '100%' }} />
                        {!ps.customWorkLogTime && <p style={{ margin: '3px 0 0', fontSize: 10, color: '#dc2626' }}>ישתמש בברירת מחדל ({form.workLogTime})</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canConfigure && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button onClick={handleSave}
            style={{ background: saved ? '#22c55e' : 'linear-gradient(135deg,#4fb8e0,#80cded)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,184,224,0.35)', transition: 'background 0.3s' }}>
            {saved ? '✅ הגדרות נשמרו' : '💾 שמור הגדרות'}
          </button>
        </div>
      )}
      {!canConfigure && (
        <div style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
          ⚠️ רק מנהל פרויקט או מנהל מערכת יכולים לשנות הגדרות התראות
        </div>
      )}
    </div>
  );
}

// ─── Main Notifications page ──────────────────────────────────────────────────
export default function Notifications() {
  const { currentSystemUser, can } = useRoles();
  const [alertsData, setAlertsData] = useState(() => loadAlerts());
  const [tab,   setTab]   = useState('notifications');
  const [filterProject,  setFP]  = useState('');
  const [filterType,     setFT]  = useState('');
  const [filterRead,     setFR]  = useState(''); // '' | 'unread' | 'read'
  const [filterDate,     setFD]  = useState('');

  const uid = currentSystemUser?.id ?? '';
  const canConfigure = can.sendBroadcast; // admin or pm
  const [projects, setProjects] = useState(() => loadProjects());

  // Live reload when engine fires
  useEffect(() => {
    function refresh() { setAlertsData(loadAlerts()); }
    window.addEventListener('constrak:alerts', refresh);
    return () => window.removeEventListener('constrak:alerts', refresh);
  }, []);

  useEffect(() => {
    function reloadProjects() { setProjects(loadProjects()); }
    window.addEventListener('constrak:projects', reloadProjects);
    return () => window.removeEventListener('constrak:projects', reloadProjects);
  }, []);

  function markRead(notifId) {
    const updated = {
      ...alertsData,
      notifications: alertsData.notifications.map(n =>
        n.id === notifId && !(n.readBy ?? []).includes(uid)
          ? { ...n, readBy: [...(n.readBy ?? []), uid] }
          : n
      ),
    };
    setAlertsData(updated);
    saveAlerts(updated);
  }

  function markAllRead() {
    const updated = {
      ...alertsData,
      notifications: alertsData.notifications.map(n =>
        (n.readBy ?? []).includes(uid) ? n : { ...n, readBy: [...(n.readBy ?? []), uid] }
      ),
    };
    setAlertsData(updated);
    saveAlerts(updated);
  }

  function dismiss(notifId) {
    const updated = {
      ...alertsData,
      notifications: alertsData.notifications.map(n => n.id === notifId ? { ...n, dismissed: true } : n),
    };
    setAlertsData(updated);
    saveAlerts(updated);
  }

  function clearDismissed() {
    const updated = { ...alertsData, notifications: alertsData.notifications.filter(n => !n.dismissed) };
    setAlertsData(updated);
    saveAlerts(updated);
  }

  function updateSettings(newSettings) {
    const updated = { ...alertsData, settings: newSettings };
    setAlertsData(updated);
    saveAlerts(updated);
  }

  // Filter
  const visible = alertsData.notifications.filter(n => {
    if (n.dismissed) return false;
    if (filterProject && n.projectId !== filterProject) return false;
    if (filterType    && n.type !== filterType)         return false;
    if (filterDate    && n.date !== filterDate)          return false;
    if (filterRead === 'unread' &&  (n.readBy ?? []).includes(uid)) return false;
    if (filterRead === 'read'   && !(n.readBy ?? []).includes(uid)) return false;
    return true;
  }).sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt));

  const totalUnread    = alertsData.notifications.filter(n => !n.dismissed && !(n.readBy ?? []).includes(uid)).length;
  const totalToday     = alertsData.notifications.filter(n => !n.dismissed && n.date === new Date().toISOString().slice(0,10)).length;
  const dismissedCount = alertsData.notifications.filter(n => n.dismissed).length;

  const TABS = [
    { id: 'notifications', label: `התראות${totalUnread > 0 ? ` (${totalUnread})` : ''}` },
    { id: 'settings',      label: 'הגדרות התראות' },
  ];

  return (
    <div style={{ padding: 24, direction: 'rtl', maxWidth: 1000, margin: '0 auto' }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
            🔔 מרכז התראות
            {totalUnread > 0 && (
              <span style={{ background: '#ef4444', color: 'white', borderRadius: 99, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>{totalUnread}</span>
            )}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>התראות אוטומטיות על קבלנים שלא הגישו דיווח</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {totalUnread > 0 && (
            <button onClick={markAllRead}
              style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              ✓ סמן הכל כנקרא
            </button>
          )}
          {dismissedCount > 0 && (
            <button onClick={clearDismissed}
              style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              🗑️ נקה מוסתר ({dismissedCount})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 22 }}>
        {[
          { icon: '🔴', label: 'לא נקראו',  value: totalUnread,  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          { icon: '📅', label: 'היום',       value: totalToday,   color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
          { icon: '📋', label: 'סה"כ נראים', value: visible.length, color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? '#4fb8e0' : '#64748b', borderBottom: tab === t.id ? '2px solid #4fb8e0' : '2px solid transparent',
              fontSize: 14, marginBottom: -2, transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Notifications tab ─────────────────────────────────────────────────── */}
      {tab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filters */}
          <div style={{ background: 'white', borderRadius: 12, padding: '12px 16px', border: '1px solid #e2e8f0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterProject} onChange={e => setFP(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 11px', fontSize: 13, outline: 'none', background: 'white' }}>
              <option value="">כל הפרויקטים</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterType} onChange={e => setFT(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 11px', fontSize: 13, outline: 'none', background: 'white' }}>
              <option value="">כל סוגי ההתראות</option>
              <option value="missing_day_plan">🌅 תכנון יומי חסר</option>
              <option value="missing_work_log">📋 דוח עבודה חסר</option>
            </select>
            <select value={filterRead} onChange={e => setFR(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 11px', fontSize: 13, outline: 'none', background: 'white' }}>
              <option value="">הכל</option>
              <option value="unread">לא נקרא</option>
              <option value="read">נקרא</option>
            </select>
            <input type="date" value={filterDate} onChange={e => setFD(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 11px', fontSize: 13, outline: 'none', background: 'white', direction: 'ltr' }} />
            {(filterProject || filterType || filterRead || filterDate) && (
              <button onClick={() => { setFP(''); setFT(''); setFR(''); setFD(''); }}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                נקה סינון
              </button>
            )}
          </div>

          {/* List */}
          {visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <p style={{ fontSize: 48, margin: '0 0 12px' }}>🔔</p>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                {(filterProject || filterType || filterRead || filterDate) ? 'אין התראות התואמות את הסינון' : 'אין התראות'}
              </p>
              <p style={{ fontSize: 13, margin: '6px 0 0' }}>
                {(filterProject || filterType || filterRead || filterDate)
                  ? 'נסה לשנות את הסינון'
                  : 'המערכת תייצר התראות אוטומטית כשקבלן לא מגיש דיווח בזמן'
                }
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visible.map(notif => (
                <NotificationItem key={notif.id} notif={notif} uid={uid} onMarkRead={markRead} onDismiss={dismiss} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Settings tab ──────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <SettingsTab settings={alertsData.settings} onSave={updateSettings} canConfigure={canConfigure} />
      )}
    </div>
  );
}
