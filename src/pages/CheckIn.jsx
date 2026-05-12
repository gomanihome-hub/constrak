import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { loadTasks, saveTasks, PRIORITY, STATUS } from '../data/tasksStore';
import { loadMsgs, saveMsgs, isVisibleTo, markRead, roleLabel } from '../data/messagesStore';

// ── Worker daily-report storage ───────────────────────────────────────────────
const REPORTS_KEY = 'constrak_worker_reports';
function loadReports() {
  try { return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]'); }
  catch { return []; }
}
function saveReports(r) { localStorage.setItem(REPORTS_KEY, JSON.stringify(r)); }

// ── Check-in storage ──────────────────────────────────────────────────────────
const CHECKINS_KEY = 'constrak_checkins';
function loadCheckins() {
  try { return JSON.parse(localStorage.getItem(CHECKINS_KEY) || '[]'); }
  catch { return []; }
}
function saveCheckins(c) { localStorage.setItem(CHECKINS_KEY, JSON.stringify(c)); }

function todayStr() { return new Date().toISOString().slice(0, 10); }

const TABS = [
  { id: 'checkin',  label: 'נוכחות',    icon: '🏠' },
  { id: 'tasks',    label: 'משימות',    icon: '✅' },
  { id: 'messages', label: 'הודעות',    icon: '💬' },
  { id: 'report',   label: 'דיווח יומי', icon: '📋' },
];

export default function CheckIn() {
  const { user, logout } = useAuth();
  const { currentSystemUser } = useRoles();

  const [activeTab, setActiveTab] = useState('checkin');
  const [checkins,  setCheckins]  = useState(() => loadCheckins());
  const [tasks,     setTasks]     = useState(() => loadTasks());
  const [msgs,      setMsgs]      = useState(() => loadMsgs());
  const [reports,   setReports]   = useState(() => loadReports());
  const [now,       setNow]       = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const uid         = currentSystemUser?.id ?? user?.uid;
  const displayName = currentSystemUser?.displayName || user?.displayName || 'פועל';
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Derived data
  const myTasks    = useMemo(() => tasks.filter(t => t.assignedTo === uid), [tasks, uid]);
  const myMsgs     = useMemo(() =>
    msgs.filter(m => isVisibleTo(m, currentSystemUser, 'worker'))
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [msgs, currentSystemUser]
  );
  const myReports  = useMemo(() =>
    reports.filter(r => r.userId === uid).sort((a, b) => b.date.localeCompare(a.date)),
    [reports, uid]
  );
  const unread     = myMsgs.filter(m => !m.readBy.includes(uid)).length;
  const pending    = myTasks.filter(t => t.status !== 'done').length;

  // ── Check-in handlers ────────────────────────────────────────────────────
  const today           = todayStr();
  const todayCheckins   = checkins.filter(c => c.date === today && c.userId === uid);
  const lastEntry       = todayCheckins[todayCheckins.length - 1];
  const isCheckedIn     = lastEntry?.type === 'in' && !lastEntry?.out;

  let totalMinutes = 0;
  todayCheckins.forEach(c => {
    if (c.type === 'in') {
      const inT  = new Date(c.time);
      const outT = c.out ? new Date(c.out) : (isCheckedIn && c.id === lastEntry?.id ? now : null);
      if (outT) totalMinutes += (outT - inT) / 60000;
    }
  });

  function handleCheckIn() {
    const entry = { id: `ci-${Date.now()}`, userId: uid, date: today, type: 'in', time: new Date().toISOString(), out: null };
    const updated = [...checkins, entry];
    setCheckins(updated); saveCheckins(updated);
  }
  function handleCheckOut() {
    const updated = checkins.map(c => c.id === lastEntry?.id ? { ...c, out: new Date().toISOString() } : c);
    setCheckins(updated); saveCheckins(updated);
  }

  // ── Task handler ──────────────────────────────────────────────────────────
  function cycleTaskStatus(taskId) {
    const order = ['pending', 'in_progress', 'done'];
    const updated = tasks.map(t => {
      if (t.id !== taskId) return t;
      const idx = order.indexOf(t.status);
      return { ...t, status: order[(idx + 1) % order.length] };
    });
    setTasks(updated); saveTasks(updated);
  }

  // ── Message handler ───────────────────────────────────────────────────────
  function handleReadMsg(msgId) {
    const updated = markRead(msgs, msgId, uid);
    setMsgs(updated); saveMsgs(updated);
  }

  // ── Report handler ────────────────────────────────────────────────────────
  function submitReport(formData) {
    const entry = { id: `wrep-${Date.now()}`, userId: uid, displayName, ...formData, submittedAt: new Date().toISOString() };
    const updated = [...reports, entry];
    setReports(updated); saveReports(updated);
  }

  // ── Badge helper ──────────────────────────────────────────────────────────
  const badges = { tasks: pending || null, messages: unread || null };

  const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏛️</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f3ce1f' }}>קונסטרק</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'white' }}>
            {initials}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'white', lineHeight: 1.2 }}>{displayName}</p>
            <p style={{ margin: 0, fontSize: 10, color: '#475569', lineHeight: 1.2 }}>👷 פועל</p>
          </div>
          <button onClick={logout} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
            יציאה
          </button>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'checkin'  && <TabCheckin  isCheckedIn={isCheckedIn} handleCheckIn={handleCheckIn} handleCheckOut={handleCheckOut} timeStr={timeStr} dateStr={dateStr} lastEntry={lastEntry} totalMinutes={totalMinutes} todayCheckins={todayCheckins} checkins={checkins} uid={uid} today={today} />}
        {activeTab === 'tasks'    && <TabTasks    tasks={myTasks} onCycle={cycleTaskStatus} />}
        {activeTab === 'messages' && <TabMessages msgs={myMsgs} uid={uid} onRead={handleReadMsg} />}
        {activeTab === 'report'   && <TabReport   reports={myReports} onSubmit={submitReport} />}
      </div>

      {/* ── Bottom nav ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.95)', display: 'flex', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px 4px 12px', border: 'none', cursor: 'pointer',
              background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              position: 'relative',
              borderTop: `2px solid ${activeTab === tab.id ? '#4fb8e0' : 'transparent'}`,
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: activeTab === tab.id ? 700 : 400, color: activeTab === tab.id ? '#4fb8e0' : '#475569' }}>
              {tab.label}
            </span>
            {badges[tab.id] && (
              <span style={{ position: 'absolute', top: 6, right: '50%', transform: 'translateX(8px)', background: '#ef4444', color: 'white', borderRadius: 99, fontSize: 9, fontWeight: 700, padding: '1px 5px', minWidth: 14, textAlign: 'center' }}>
                {badges[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: נוכחות (Check-in)
// ─────────────────────────────────────────────────────────────────────────────
function TabCheckin({ isCheckedIn, handleCheckIn, handleCheckOut, timeStr, dateStr, lastEntry, totalMinutes, todayCheckins, checkins, uid, today }) {
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins  = Math.floor(totalMinutes % 60);

  const recentDays = [];
  for (let i = 0; i < 7; i++) {
    const d  = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const dc = checkins.filter(c => c.date === ds && c.userId === uid);
    if (dc.length > 0 || i === 0)
      recentDays.push({ date: ds, label: d.toLocaleDateString('he-IL', { weekday: 'short', month: 'short', day: 'numeric' }), checkins: dc });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px 20px', gap: 24 }}>
      {/* Clock */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 58, fontWeight: 700, color: 'white', letterSpacing: '-2px', fontFamily: 'monospace' }}>{timeStr}</div>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>{dateStr}</p>
      </div>

      {/* Status */}
      <div style={{ background: isCheckedIn ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', border: `2px solid ${isCheckedIn ? '#22c55e' : 'rgba(255,255,255,0.08)'}`, borderRadius: 18, padding: '20px 36px', textAlign: 'center', minWidth: 240 }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>{isCheckedIn ? '✅' : '⏸️'}</div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: isCheckedIn ? '#4ade80' : '#64748b' }}>{isCheckedIn ? 'נמצא באתר' : 'מחוץ לאתר'}</p>
        {isCheckedIn && lastEntry && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#86efac' }}>כניסה: {new Date(lastEntry.time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>}
        {totalMinutes > 0 && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#475569' }}>סה"כ היום: {totalHours}:{String(totalMins).padStart(2, '0')} שעות</p>}
      </div>

      {/* Button */}
      {!isCheckedIn ? (
        <CircleBtn color="#22c55e" shadow="rgba(34,197,94,0.4)" onClick={handleCheckIn} icon="🟢" label="כניסה לאתר" />
      ) : (
        <CircleBtn color="#ef4444" shadow="rgba(239,68,68,0.4)" onClick={handleCheckOut} icon="🔴" label="יציאה מהאתר" />
      )}

      {/* Today log */}
      {todayCheckins.length > 0 && (
        <div style={{ width: '100%', maxWidth: 380, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>רשומות היום</p>
          {todayCheckins.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>{c.out ? `יציאה: ${new Date(c.out).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : <span style={{ color: '#4ade80' }}>עדיין באתר</span>}</span>
              <span style={{ color: '#94a3b8' }}>כניסה: {new Date(c.time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}

      {/* History chips */}
      <div style={{ width: '100%', maxWidth: 380 }}>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#334155' }}>7 ימים אחרונים</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {recentDays.map(({ date, label, checkins: dc }) => {
            const has     = dc.some(c => c.type === 'in');
            const isToday = date === today;
            return (
              <div key={date} style={{ padding: '5px 12px', borderRadius: 99, fontSize: 11, background: isToday ? 'rgba(79,184,224,0.12)' : has ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isToday ? '#4fb8e0' : has ? '#22c55e' : 'rgba(255,255,255,0.07)'}`, color: isToday ? '#7dd3fc' : has ? '#4ade80' : '#334155' }}>
                {label} {has ? '✓' : isToday ? '' : '—'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CircleBtn({ color, shadow, onClick, icon, label }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ width: 180, height: 180, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}cc)`, border: `4px solid ${color}44`, boxShadow: `0 0 ${hov ? 60 : 36}px ${shadow}`, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, transform: hov ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.15s' }}
    >
      <span style={{ fontSize: 32 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: משימות (Tasks)
// ─────────────────────────────────────────────────────────────────────────────
function TabTasks({ tasks, onCycle }) {
  const [expanded, setExpanded] = useState(null);

  if (tasks.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: '#475569' }}>
      <span style={{ fontSize: 48 }}>✅</span>
      <p style={{ margin: 0, fontSize: 15 }}>אין משימות פתוחות</p>
    </div>
  );

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480, margin: '0 auto', width: '100%' }}>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#475569' }}>
        {tasks.filter(t => t.status !== 'done').length} משימות פתוחות מתוך {tasks.length}
      </p>
      {tasks.map(task => {
        const st  = STATUS[task.status]  ?? STATUS.pending;
        const pr  = PRIORITY[task.priority] ?? PRIORITY.medium;
        const isOpen = expanded === task.id;
        return (
          <div key={task.id} style={{ background: task.status === 'done' ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.05)', borderRadius: 14, border: `1px solid ${task.status === 'done' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.09)'}`, overflow: 'hidden' }}>
            {/* Card header */}
            <button
              onClick={() => setExpanded(isOpen ? null : task.id)}
              style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: task.status === 'done' ? '#475569' : 'white', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Badge label={st.label}  color={st.color}  dark />
                  <Badge label={pr.label}  color={pr.color}  dark />
                  {task.dueDate && <Badge label={`עד ${task.dueDate}`} color="#64748b" dark />}
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#475569' }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Expanded */}
            {isOpen && (
              <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {task.description && <p style={{ margin: '12px 0 8px', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{task.description}</p>}
                <p style={{ margin: '0 0 14px', fontSize: 12, color: '#475569' }}>הוקצה ע"י: {task.assignedByName}</p>
                <button
                  onClick={() => onCycle(task.id)}
                  style={{ padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: task.status === 'done' ? 'rgba(148,163,184,0.15)' : task.status === 'in_progress' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)', color: task.status === 'done' ? '#64748b' : task.status === 'in_progress' ? '#4ade80' : '#60a5fa' }}
                >
                  {task.status === 'pending'     && '▶ התחל ביצוע'}
                  {task.status === 'in_progress' && '✓ סמן כהושלם'}
                  {task.status === 'done'         && '↩ החזר לביצוע'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: הודעות (Messages)
// ─────────────────────────────────────────────────────────────────────────────
function TabMessages({ msgs, uid, onRead }) {
  const [selected, setSelected] = useState(null);

  function handleSelect(msg) {
    setSelected(msg);
    if (!msg.readBy.includes(uid)) onRead(msg.id);
  }

  if (msgs.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: '#475569' }}>
      <span style={{ fontSize: 48 }}>📭</span>
      <p style={{ margin: 0, fontSize: 15 }}>אין הודעות</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {selected ? (
        /* Message detail */
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 18px' }}>
          <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: '#4fb8e0', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0 }}>← חזרה לרשימה</button>
          <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: 'white' }}>{selected.subject}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
            <span style={{ fontSize: 16 }}>{ROLE_ICONS[selected.fromRole] ?? '👤'}</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{selected.fromName}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>{roleLabel(selected.fromRole)} · {new Date(selected.sentAt).toLocaleDateString('he-IL', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selected.body}</p>

          {selected.photos?.length > 0 && (
            <div style={{ marginTop: 18, padding: '12px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: '#475569' }}>📎 תמונות מצורפות</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selected.photos.map((photo, i) => (
                  <a key={i} href={photo.data} target="_blank" rel="noreferrer">
                    <img
                      src={photo.data}
                      alt={photo.name}
                      style={{ width: 96, height: 74, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', display: 'block' }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Message list */
        <div style={{ flex: 1, overflow: 'auto' }}>
          {msgs.map(msg => {
            const isUnread = !msg.readBy.includes(uid);
            return (
              <button
                key={msg.id}
                onClick={() => handleSelect(msg)}
                style={{ width: '100%', padding: '14px 18px', background: isUnread ? 'rgba(79,184,224,0.05)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'flex-start', gap: 10 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {ROLE_ICONS[msg.fromRole] ?? '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    {isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4fb8e0', display: 'inline-block', flexShrink: 0 }} />}
                    <span style={{ fontSize: 14, fontWeight: isUnread ? 700 : 500, color: isUnread ? 'white' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{msg.subject}</span>
                    <span style={{ fontSize: 10, color: '#334155', whiteSpace: 'nowrap', flexShrink: 0 }}>{new Date(msg.sentAt).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.fromName} · {msg.body.slice(0, 60)}{msg.body.length > 60 ? '...' : ''}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ROLE_ICONS = { admin: '👑', project_manager: '📊', site_manager: '🦺', subcontractor: '🔨', worker: '👷' };

// ─────────────────────────────────────────────────────────────────────────────
// Tab: דיווח יומי (Daily Report)
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_STATUS = [
  { value: 'completed',  label: 'הושלם',  color: '#22c55e' },
  { value: 'in_progress', label: 'בביצוע', color: '#3b82f6' },
  { value: 'partial',    label: 'חלקי',   color: '#f59e0b' },
];

function TabReport({ reports, onSubmit }) {
  const today      = todayStr();
  const todayRep   = reports.find(r => r.date === today);
  const [showForm, setShowForm] = useState(false);
  const [toast,    setToast]    = useState('');
  const [form, setForm] = useState({ date: today, description: '', hoursWorked: '', status: 'completed', notes: '' });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) { setToast('נא למלא תיאור עבודה'); setTimeout(() => setToast(''), 3000); return; }
    onSubmit(form);
    setShowForm(false);
    setToast('הדיווח נשלח בהצלחה ✓');
    setTimeout(() => setToast(''), 3000);
  }

  const statusColor = s => REPORT_STATUS.find(o => o.value === s)?.color ?? '#94a3b8';
  const statusLabel = s => REPORT_STATUS.find(o => o.value === s)?.label ?? s;

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 20px', borderRadius: 10, zIndex: 9999, fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: 'white' }}>דיווח יומי</h2>
        <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>{new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Today status */}
      {!showForm && !todayRep && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
          <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>לא הוגש דיווח להיום</p>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: '#475569' }}>שלח את סיכום יום העבודה שלך</p>
          <button
            onClick={() => setShowForm(true)}
            style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            + הגש דיווח יומי
          </button>
        </div>
      )}

      {todayRep && !showForm && (
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '2px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#4ade80' }}>הדיווח הוגש</p>
              <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>הוגש ב-{new Date(todayRep.submittedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <span style={{ marginRight: 'auto', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: `${statusColor(todayRep.status)}22`, color: statusColor(todayRep.status) }}>
              {statusLabel(todayRep.status)}
            </span>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{todayRep.description}</p>
          {todayRep.hoursWorked && <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>⏱️ {todayRep.hoursWorked} שעות עבודה</p>}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: 'white' }}>סיכום יום עבודה</h3>

          {/* Status */}
          <div style={{ marginBottom: 16 }}>
            <label style={LS}>סטטוס</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {REPORT_STATUS.map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => set('status', opt.value)}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: `2px solid ${form.status === opt.value ? opt.color : 'rgba(255,255,255,0.1)'}`, background: form.status === opt.value ? `${opt.color}22` : 'transparent', color: form.status === opt.value ? opt.color : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={LS}>מה עשית היום? *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="תאר את העבודה שביצעת..." style={IS} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={LS}>שעות עבודה</label>
            <input type="number" min="0" max="24" step="0.5" value={form.hoursWorked} onChange={e => set('hoursWorked', e.target.value)} placeholder="0" style={IS} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={LS}>הערות</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="בעיות, הערות חופשיות..." style={IS} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>ביטול</button>
            <button type="submit" style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>שלח דיווח</button>
          </div>
        </form>
      )}

      {/* History */}
      {reports.length > 1 || (reports.length === 1 && !todayRep) ? (
        <div>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#334155' }}>דיווחים קודמים</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reports.filter(r => r.date !== today).slice(0, 5).map(r => (
              <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{new Date(r.date).toLocaleDateString('he-IL', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span style={{ padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: `${statusColor(r.status)}22`, color: statusColor(r.status) }}>{statusLabel(r.status)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</p>
                </div>
                {r.hoursWorked && <span style={{ fontSize: 11, color: '#334155', whiteSpace: 'nowrap' }}>⏱️ {r.hoursWorked}h</span>}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function Badge({ label, color, dark }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: dark ? `${color}22` : undefined, color, border: dark ? `1px solid ${color}44` : undefined }}>
      {label}
    </span>
  );
}

const LS = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 };
const IS = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.05)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' };
