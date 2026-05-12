import { useState, useMemo, useRef } from 'react';
import { useRoles, ROLES } from '../context/RolesContext';
import { loadMsgs, saveMsgs, PROJECTS, SITES } from '../data/messagesStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeRecipients(msg, systemUsers, myId) {
  return systemUsers.filter(u => {
    if (u.id === myId) return false;
    switch (msg.toScope) {
      case 'broadcast': return true;
      case 'role':      return u.role === msg.toId;
      case 'project':   return (u.assignedProjects ?? []).includes(msg.toId);
      case 'site':      return u.assignedSite === msg.toId;
      default:          return false;
    }
  });
}

function buildTargets(currentRole, systemUser) {
  if (currentRole === 'project_manager') {
    const myProjIds = systemUser?.assignedProjects ?? [];
    return [
      { scope: 'broadcast', id: null,               label: '📢 כל חברי הפרויקטים שלי' },
      { scope: 'role',      id: 'worker',            label: '👷 פועלי הפרויקטים שלי'  },
      { scope: 'role',      id: 'subcontractor',     label: '🔨 קבלני המשנה שלי'       },
      ...PROJECTS.filter(p => myProjIds.includes(p.id))
                 .map(p => ({ scope: 'project', id: p.id, label: `🏗️ ${p.name}` })),
    ];
  }
  // admin
  return [
    { scope: 'broadcast', id: null,               label: '📢 כל המשתמשים'         },
    { scope: 'role',      id: 'worker',            label: '👷 כל הפועלים'           },
    { scope: 'role',      id: 'subcontractor',     label: '🔨 כל קבלני המשנה'       },
    { scope: 'role',      id: 'site_manager',      label: '🦺 כל מנהלי האתר'        },
    { scope: 'role',      id: 'project_manager',   label: '📊 כל מנהלי הפרויקט'    },
    ...PROJECTS.map(p => ({ scope: 'project', id: p.id, label: `🏗️ ${p.name}` })),
    ...SITES.map(s    => ({ scope: 'site',    id: s.id, label: `📍 ${s.name}` })),
  ];
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error(`${file.name}: גדול מדי (מקסימום 5MB)`));
      return;
    }
    const reader = new FileReader();
    reader.onload  = e => resolve({ name: file.name, type: file.type, data: e.target.result });
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
    reader.readAsDataURL(file);
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Megaphone() {
  const { currentSystemUser, currentRole, systemUsers } = useRoles();
  const [msgs, setMsgs]           = useState(() => loadMsgs());
  const [composing, setComposing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const uid = currentSystemUser?.id;

  const sentMsgs = useMemo(() =>
    msgs.filter(m => m.fromId === uid && m.megaphone)
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [msgs, uid]
  );

  const stats = useMemo(() => {
    const total      = sentMsgs.length;
    const recipients = sentMsgs.reduce((s, m) => s + computeRecipients(m, systemUsers, uid).length, 0);
    const reads      = sentMsgs.reduce((s, m) => s + (m.readBy ?? []).filter(id => id !== uid).length, 0);
    return { total, recipients, reads };
  }, [sentMsgs, systemUsers, uid]);

  function refreshMsgs() { setMsgs(loadMsgs()); }

  function handleSend(data) {
    const msg = {
      id:       `msg-${Date.now()}`,
      fromId:   uid,
      fromName: currentSystemUser?.displayName ?? '',
      fromRole: currentRole,
      ...data,
      sentAt:   new Date().toISOString(),
      readBy:   [uid],
      megaphone: true,
    };
    const updated = [msg, ...msgs];
    setMsgs(updated);
    saveMsgs(updated);
    setComposing(false);
    setExpandedId(msg.id);
  }

  const targets = buildTargets(currentRole, currentSystemUser);

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc', padding: '24px 28px' }} dir="rtl">

      {composing && (
        <ComposeModal
          targets={targets}
          systemUsers={systemUsers}
          myId={uid}
          onSend={handleSend}
          onClose={() => setComposing(false)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: 'linear-gradient(135deg, #f3ce1f 0%, #d4a800 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 6px 22px rgba(243,206,31,0.5)',
          }}>
            📢
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.5px' }}>מגפון</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>הודעות תפוצה לפועלים, קבלנים ומנהלים</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={refreshMsgs}
            title="רענן נתוני קריאה"
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            🔄 רענן
          </button>
          <button
            onClick={() => setComposing(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #f3ce1f 0%, #d4a800 100%)',
              color: '#1a1200', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(243,206,31,0.5)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(243,206,31,0.65)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 18px rgba(243,206,31,0.5)'; }}
          >
            <span style={{ fontSize: 18 }}>📢</span>
            שלח הודעת תפוצה
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { icon: '📨', label: 'הודעות נשלחו',  value: stats.total,      color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
          { icon: '👥', label: 'נמענים הגיעו',  value: stats.recipients, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
          { icon: '👁',  label: 'קריאות סה"כ',  value: stats.reads,      color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '18px 20px', border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 30 }}>{s.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: s.color, opacity: 0.7 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Messages list ── */}
      {sentMsgs.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 18, padding: '64px 24px', textAlign: 'center', border: '2px dashed #e2e8f0' }}>
          <div style={{ fontSize: 64, marginBottom: 18 }}>📢</div>
          <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#1e293b' }}>עדיין לא נשלחו הודעות</p>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: '#94a3b8' }}>לחץ למטה כדי לשלוח את הודעת התפוצה הראשונה שלך לצוות</p>
          <button
            onClick={() => setComposing(true)}
            style={{ padding: '13px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #f3ce1f, #d4a800)', color: '#1a1200', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(243,206,31,0.45)' }}
          >
            📢 שלח הודעת תפוצה ראשונה
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sentMsgs.map(msg => {
            const recipients = computeRecipients(msg, systemUsers, uid);
            const readCount  = (msg.readBy ?? []).filter(id => id !== uid).length;
            const pct        = recipients.length > 0 ? Math.round(readCount / recipients.length * 100) : 0;
            return (
              <MessageCard
                key={msg.id}
                msg={msg}
                recipients={recipients}
                readCount={readCount}
                pct={pct}
                isExpanded={expandedId === msg.id}
                onToggle={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Message card ─────────────────────────────────────────────────────────────

function MessageCard({ msg, recipients, readCount, pct, isExpanded, onToggle }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      border: `2px solid ${isExpanded ? '#80cded' : '#e2e8f0'}`,
      overflow: 'hidden',
      transition: 'border-color 0.18s, box-shadow 0.18s',
      boxShadow: isExpanded ? '0 0 0 4px rgba(128,205,237,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'flex-start', gap: 14 }}
      >
        {/* Icon */}
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, #f3ce1f, #d4a800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 3px 10px rgba(243,206,31,0.35)' }}>
          📢
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{msg.subject}</span>
            <ScopeTag msg={msg} />
            {msg.photos?.length > 0 && (
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>
                🖼️ {msg.photos.length}
              </span>
            )}
          </div>
          <p style={{
            margin: '0 0 8px', fontSize: 13, color: '#64748b', lineHeight: 1.5,
            overflow: isExpanded ? 'visible' : 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
            textAlign: 'right',
          }}>
            {msg.body}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#94a3b8', flexWrap: 'wrap' }}>
            <span>📅 {new Date(msg.sentAt).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span>·</span>
            <span>👥 {recipients.length} נמענים</span>
            <span>·</span>
            <span style={{ color: pct >= 75 ? '#15803d' : pct >= 40 ? '#b45309' : '#64748b' }}>
              {readCount} קראו
            </span>
          </div>
        </div>

        {/* Read ring */}
        <ReadRing pct={pct} readCount={readCount} total={recipients.length} />
      </button>

      {/* Photos (expanded only) */}
      {isExpanded && msg.photos?.length > 0 && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f8fafc' }}>
          <p style={{ margin: '14px 0 10px', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>📎 תמונות מצורפות</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {msg.photos.map((photo, i) => (
              <a key={i} href={photo.data} target="_blank" rel="noreferrer">
                <img
                  src={photo.data}
                  alt={photo.name}
                  style={{ width: 110, height: 85, objectFit: 'cover', borderRadius: 10, border: '2px solid #e2e8f0', transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SVG read-ring ────────────────────────────────────────────────────────────

function ReadRing({ pct, readCount, total }) {
  const r    = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 75 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#94a3b8';

  return (
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={56} height={56}>
        <circle cx={28} cy={28} r={r} fill="none" stroke="#f1f5f9" strokeWidth={5} />
        <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
        <text x={28} y={33} textAnchor="middle" fill={color} fontSize={11} fontWeight="800">
          {pct}%
        </text>
      </svg>
      <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{readCount}/{total} נקרא</span>
    </div>
  );
}

// ─── Scope badge ──────────────────────────────────────────────────────────────

function ScopeTag({ msg }) {
  let label, color, bg;
  if (msg.toScope === 'broadcast') {
    label = '📢 כולם'; color = '#1e293b'; bg = '#f1f5f9';
  } else if (msg.toScope === 'role') {
    const r = ROLES[msg.toId];
    label = r ? `${r.icon} ${r.label}` : msg.toId;
    color = r?.color ?? '#64748b'; bg = r?.bg ?? '#f8fafc';
  } else if (msg.toScope === 'project') {
    const p = PROJECTS.find(x => x.id === msg.toId);
    label = `🏗️ ${p?.name ?? msg.toId}`; color = '#1d4ed8'; bg = '#eff6ff';
  } else if (msg.toScope === 'site') {
    const s = SITES.find(x => x.id === msg.toId);
    label = `📍 ${s?.name ?? msg.toId}`; color = '#6d28d9'; bg = '#f5f3ff';
  } else {
    label = msg.toScope; color = '#64748b'; bg = '#f8fafc';
  }

  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color, background: bg, border: `1px solid ${color}30`, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

// ─── Compose modal ────────────────────────────────────────────────────────────

function ComposeModal({ targets, systemUsers, myId, onSend, onClose }) {
  const [form, setForm]           = useState({ toScope: 'broadcast', toId: null, subject: '', body: '' });
  const [photos, setPhotos]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [errors, setErrors]       = useState({});
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef(null);

  function field(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); }

  function handleTargetChange(e) {
    const [scope, id] = e.target.value.split(':');
    setForm(f => ({ ...f, toScope: scope, toId: id ?? null }));
  }

  async function handleFiles(files) {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return;
    const free = 5 - photos.length;
    if (free <= 0) return;
    setUploading(true); setUploadErr('');
    try {
      const added = await Promise.all(imgs.slice(0, free).map(readFileAsBase64));
      setPhotos(p => [...p, ...added]);
    } catch (e) {
      setUploadErr(e.message);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileInput(e) {
    handleFiles(Array.from(e.target.files));
    e.target.value = '';
  }

  const previewCount = useMemo(() =>
    systemUsers.filter(u => {
      if (u.id === myId) return false;
      switch (form.toScope) {
        case 'broadcast': return true;
        case 'role':      return u.role === form.toId;
        case 'project':   return (u.assignedProjects ?? []).includes(form.toId);
        case 'site':      return u.assignedSite === form.toId;
        default:          return false;
      }
    }).length,
    [form.toScope, form.toId, systemUsers, myId]
  );

  function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.subject.trim()) errs.subject = 'נושא חובה';
    if (!form.body.trim())    errs.body    = 'תוכן חובה';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSend({ ...form, photos });
  }

  const targetVal = form.toId ? `${form.toScope}:${form.toId}` : form.toScope;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 22, width: '100%', maxWidth: 600, maxHeight: '94vh', overflow: 'auto', boxShadow: '0 28px 90px rgba(0,0,0,0.4)' }}>

        {/* Dark header */}
        <div style={{ padding: '22px 26px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '22px 22px 0 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #f3ce1f, #d4a800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 16px rgba(243,206,31,0.55)', flexShrink: 0 }}>
            📢
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'white' }}>הודעת תפוצה חדשה</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>ההודעה תופיע בתיבת ההודעות של כל הנמענים</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: 18, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 26px' }}>

          {/* Recipients */}
          <div style={{ marginBottom: 18 }}>
            <label style={LS}>📍 נמענים</label>
            <select value={targetVal} onChange={handleTargetChange} style={IS}>
              {targets.map(t => {
                const val = t.id ? `${t.scope}:${t.id}` : t.scope;
                return <option key={val} value={val}>{t.label}</option>;
              })}
            </select>
            <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: previewCount > 0 ? '#4fb8e0' : '#f59e0b' }}>
              {previewCount > 0 ? `✓ ישלח ל-${previewCount} משתמשים` : '⚠️ אין משתמשים בקטגוריה זו כרגע'}
            </p>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: 16 }}>
            <label style={LS}>
              📝 נושא
              {errors.subject && <span style={{ color: '#ef4444', fontWeight: 400, marginRight: 6 }}>— {errors.subject}</span>}
            </label>
            <input
              value={form.subject}
              onChange={e => field('subject', e.target.value)}
              placeholder="כותרת ההודעה..."
              style={{ ...IS, border: `1.5px solid ${errors.subject ? '#ef4444' : '#e2e8f0'}` }}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...LS, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                💬 תוכן ההודעה
                {errors.body && <span style={{ color: '#ef4444', fontWeight: 400, marginRight: 6 }}>— {errors.body}</span>}
              </span>
              <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 11 }}>{form.body.length} תווים</span>
            </label>
            <textarea
              value={form.body}
              onChange={e => field('body', e.target.value)}
              placeholder="כתוב את תוכן הודעת התפוצה כאן..."
              rows={5}
              style={{ ...IS, resize: 'vertical', minHeight: 120, border: `1.5px solid ${errors.body ? '#ef4444' : '#e2e8f0'}` }}
            />
          </div>

          {/* Photo upload */}
          <div style={{ marginBottom: 24 }}>
            <label style={LS}>
              🖼️ תמונות מצורפות
              <span style={{ color: '#94a3b8', fontWeight: 400, marginRight: 8, fontSize: 11 }}>אופציונלי — עד 5</span>
            </label>

            {/* Drop zone */}
            <div
              onClick={() => photos.length < 5 && fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#4fb8e0' : '#e2e8f0'}`,
                borderRadius: 12, padding: '18px 20px',
                textAlign: 'center',
                cursor: photos.length < 5 ? 'pointer' : 'default',
                background: dragOver ? '#eff9ff' : '#f8fafc',
                transition: 'all 0.15s',
                marginBottom: photos.length > 0 ? 12 : 0,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{uploading ? '⏳' : '📸'}</div>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                {uploading ? 'מעלה תמונות...' :
                 photos.length >= 5 ? 'הגעת למקסימום (5 תמונות)' :
                 'גרור תמונות לכאן, או לחץ לבחירה'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>JPG · PNG · GIF — עד 5MB לתמונה</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileInput}
                disabled={photos.length >= 5}
              />
            </div>

            {uploadErr && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#ef4444' }}>{uploadErr}</p>}

            {/* Thumbnails */}
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {photos.map((photo, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={photo.data}
                      alt={photo.name}
                      style={{ width: 84, height: 66, objectFit: 'cover', borderRadius: 10, border: '2px solid #e2e8f0', display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                      style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#ef4444', border: '2px solid white', color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, padding: 0, lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 18, borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '11px 22px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'transparent', color: '#374151', fontSize: 14, cursor: 'pointer' }}
            >
              ביטול
            </button>
            <button
              type="submit"
              style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #f3ce1f, #d4a800)', color: '#1a1200', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(243,206,31,0.5)' }}
            >
              <span style={{ fontSize: 16 }}>📢</span>
              שלח הודעת תפוצה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const LS = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 };
const IS = {
  width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0',
  fontSize: 14, color: '#1e293b', background: '#f8fafc', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
