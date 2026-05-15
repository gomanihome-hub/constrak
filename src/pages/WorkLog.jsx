import { useState, useEffect, useRef } from 'react';
import { subcontractors } from '../data/mockData';
import {
  loadReports,
  APPROVAL_CHAIN,
  CHAIN_ROLE_LABELS,
} from '../data/reportApprovalStore';

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL      = '#80cded';
const TEAL_DARK = '#4fb8e0';
const GOLD      = '#f3ce1f';

const TRADE_STYLE = {
  'צביעה':      { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  'אלומיניום':  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'קרמיקה':    { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  'גבס':       { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  'אינסטלציה': { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  'חשמל':      { bg: '#fefce8', text: '#a16207', border: '#fde68a' },
  'גינון':     { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  'מסגרות':    { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
  'ריצוף':     { bg: '#fff8f0', text: '#b45309', border: '#fed7aa' },
  'בנייה':     { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  'טיח':       { bg: '#fafaf9', text: '#57534e', border: '#d6d3d1' },
  'נגרות':     { bg: '#fdf4e7', text: '#92400e', border: '#fcd34d' },
};

const WEATHER = [
  { icon: '☀️', temp: 27, desc: 'שמשי וחם',    uv: 'UV גבוה' },
  { icon: '🌤️', temp: 24, desc: 'מעונן חלקית', uv: 'UV בינוני' },
  { icon: '⛅',  temp: 21, desc: 'מעונן',         uv: 'UV נמוך' },
  { icon: '🌧️', temp: 17, desc: 'גשום',          uv: 'UV נמוך' },
  { icon: '🌬️', temp: 20, desc: 'רוח חזקה',      uv: 'UV בינוני' },
  { icon: '☀️', temp: 26, desc: 'שמשי',          uv: 'UV גבוה' },
  { icon: '🌤️', temp: 23, desc: 'נעים',          uv: 'UV בינוני' },
];

const SAMPLE_NOTES = [
  'עבודה ללא בעיות, קצב רגיל',
  'התקדמות טובה, צפי לסיום בזמן',
  'עיכוב קל — ממתינים לחומרים',
  'עבודה בקצב מלא',
  'ממתינים לאישור מהנדס לשלב הבא',
  'הושלמה עבודה בקומה, עוברים לבאה',
  'נדרש תיאום עם קבלן נוסף',
];

const ALL_TRADES    = ['צביעה','אלומיניום','קרמיקה','גבס','אינסטלציה','חשמל','גינון','מסגרות','ריצוף','בנייה','טיח','נגרות'];
const ALL_PROJECTS  = ['פרויקט מגדל הים','שיפוץ בית ספר אלון','מרכז קניות הצפון'];

const WORK_STATUS_INFO = {
  completed:   { label: 'הושלם',  color: '#16a34a' },
  in_progress: { label: 'בביצוע', color: '#d97706' },
  partial:     { label: 'חלקי',   color: '#ea580c' },
  blocked:     { label: 'חסום',   color: '#dc2626' },
};

// ─── Data generation ──────────────────────────────────────────────────────────
function buildEntries(date) {
  const today   = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const seed    = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const todayReported = new Set([0, 1, 2, 5, 7, 9, 10]);

  return subcontractors.map((sc, i) => {
    const reported = isToday ? todayReported.has(i) : ((seed + i * 13) % 10) >= 4;
    const hour = 7 + ((seed + i * 3) % 3);
    const min  = (seed * (i + 1)) % 60;
    return {
      id:         sc.id,
      name:       sc.name,
      company:    sc.company,
      trade:      sc.trade,
      phone:      sc.phone,
      project:    sc.project,
      workers:    2 + ((seed + i * 7) % 7),
      status:     reported ? 'reported' : 'not_reported',
      reportTime: reported ? `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}` : null,
      notes:      reported ? SAMPLE_NOTES[(seed + i) % SAMPLE_NOTES.length] : '',
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// ─── PDF export ───────────────────────────────────────────────────────────────
function exportReportPDF(report) {
  const sigs = report.signatures || [];
  const sigsHTML = APPROVAL_CHAIN.map(role => {
    const sig = sigs.find(s => s.role === role);
    if (!sig) return '';
    return `
      <div style="display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">
        <div style="width:32px;height:32px;border-radius:50%;background:#f0fdf4;border:2px solid #86efac;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✅</div>
        <div>
          <div style="font-weight:700;font-size:14px;">${CHAIN_ROLE_LABELS[role]}</div>
          <div style="font-size:13px;color:#475569;">${sig.displayName}</div>
          <div style="font-size:12px;color:#94a3b8;">${fmtDateTime(sig.signedAt)}</div>
          ${sig.notes ? `<div style="margin-top:4px;font-size:13px;color:#374151;background:#f8fafc;padding:6px 8px;border-radius:6px;">${sig.notes}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  const workStatusLabel = WORK_STATUS_INFO[report.status]?.label ?? report.status ?? '—';

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>דוח יומי – ${report.displayName} – ${report.date}</title>
<style>
  body{font-family:Arial,sans-serif;margin:32px;color:#1e293b;direction:rtl;font-size:14px;}
  h1{font-size:22px;font-weight:800;margin-bottom:4px;}
  .sub{color:#64748b;font-size:14px;margin-bottom:24px;}
  .badge{display:inline-block;background:#f0fdf4;color:#16a34a;border:1.5px solid #86efac;border-radius:20px;padding:4px 14px;font-weight:700;font-size:13px;margin-bottom:20px;}
  .section-title{font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:20px 0 10px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
  .field{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;}
  .label{font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:3px;}
  .value{font-size:14px;font-weight:700;}
  .block{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:10px;}
  .footer{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;}
  @media print{body{margin:16px;}}
</style>
</head>
<body>
<h1>דוח יומי</h1>
<div class="sub">הוגש על-ידי ${report.displayName} (${report.trade}) &bull; ${report.date}</div>
<span class="badge">✅ מאושר במלואו</span>

<div class="section-title">פרטי הדוח</div>
<div class="grid">
  <div class="field"><div class="label">תאריך</div><div class="value">${report.date}</div></div>
  <div class="field"><div class="label">סטטוס עבודה</div><div class="value">${workStatusLabel}</div></div>
  <div class="field"><div class="label">מספר פועלים</div><div class="value">${report.workersCount || '—'}</div></div>
  <div class="field"><div class="label">שעות עבודה</div><div class="value">${report.hoursWorked || '—'}</div></div>
</div>

<div class="block"><div class="label">תיאור עבודה</div><div style="line-height:1.5;">${report.workDescription || '—'}</div></div>
${report.materials ? `<div class="block"><div class="label">חומרים בשימוש</div><div>${report.materials}</div></div>` : ''}
${report.issues    ? `<div class="block"><div class="label">בעיות ועיכובים</div><div>${report.issues}</div></div>` : ''}
${report.notes     ? `<div class="block"><div class="label">הערות</div><div>${report.notes}</div></div>` : ''}

<div class="section-title">שרשרת אישורים</div>
${sigsHTML}

<div class="footer">הוגש: ${fmtDateTime(report.submittedAt)} | מערכת Constrak</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('אפשר את חלונות הקופצים להדפסה'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WorkLog() {
  const [selectedDate,    setSelectedDate]    = useState(() => new Date());
  const [entries,         setEntries]         = useState(() => buildEntries(new Date()));
  const [filter,          setFilter]          = useState('all');
  const [remindersSent,   setRemindersSent]   = useState(new Set());
  const [batchSent,       setBatchSent]       = useState(false);
  const [toast,           setToast]           = useState({ visible: false, msg: '', ok: true });
  const [showAdd,         setShowAdd]         = useState(false);
  const [viewEntry,       setViewEntry]       = useState(null);

  // submitted daily reports from localStorage
  const [allReports,    setAllReports]    = useState(() => loadReports());
  const [reportFilter,  setReportFilter]  = useState('all');
  const [viewReport,    setViewReport]    = useState(null);

  useEffect(() => {
    setEntries(buildEntries(selectedDate));
    setRemindersSent(new Set());
    setBatchSent(false);
  }, [selectedDate.toDateString()]);

  useEffect(() => {
    const reload = () => setAllReports(loadReports());
    window.addEventListener('constrak:approvals', reload);
    return () => window.removeEventListener('constrak:approvals', reload);
  }, []);

  function changeDate(delta) {
    setSelectedDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + delta); return nd; });
  }

  function showToast(msg, ok = true) {
    setToast({ visible: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3200);
  }

  function sendReminder(id, name) {
    setRemindersSent(s => new Set([...s, id]));
    showToast(`✓ תזכורת נשלחה בהצלחה ל${name}`);
  }

  function sendBatchReminder() {
    const unreported = entries.filter(e => e.status === 'not_reported' && !remindersSent.has(e.id));
    unreported.forEach(e => setRemindersSent(s => new Set([...s, e.id])));
    setBatchSent(true);
    showToast(`✓ תזכורת נשלחה ל-${unreported.length} קבלנים שלא דיווחו`);
  }

  function addEntry(entry) {
    setEntries(prev => [...prev, { ...entry, id: Date.now() }]);
    showToast(`✓ "${entry.name}" נוסף בהצלחה ליומן`);
  }

  const total           = entries.reduce((s, e) => s + e.workers, 0);
  const reported        = entries.filter(e => e.status === 'reported');
  const unreported      = entries.filter(e => e.status === 'not_reported');
  const pendingReminders = unreported.filter(e => !remindersSent.has(e.id)).length;

  const filtered = filter === 'reported'     ? reported
                 : filter === 'not_reported' ? unreported
                 : entries;

  const pendingReports  = allReports.filter(r => r.approvalStatus === 'pending');
  const approvedReports = allReports.filter(r => r.approvalStatus === 'approved');
  const filteredReports = reportFilter === 'pending'  ? pendingReports
                        : reportFilter === 'approved' ? approvedReports
                        : allReports;

  const weather  = WEATHER[selectedDate.getDay()];
  const isToday  = selectedDate.toDateString() === new Date().toDateString();
  const isFuture = selectedDate > new Date();

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>

      {/* ── Toast ── */}
      <div style={{
        position: 'fixed', top: 80, left: '50%', transform: `translateX(-50%) translateY(${toast.visible ? 0 : -16}px)`,
        opacity: toast.visible ? 1 : 0, transition: 'all 0.3s ease',
        background: toast.ok ? '#064e3b' : '#7f1d1d',
        color: 'white', borderRadius: 12, padding: '12px 20px',
        fontSize: 14, fontWeight: 600, zIndex: 200,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        {toast.msg}
      </div>

      {/* ── Date bar ── */}
      <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NavArrow dir="prev" onClick={() => changeDate(-1)} />
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
              {selectedDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {isToday && (
              <span style={{ fontSize: 11, color: TEAL_DARK, fontWeight: 700, background: '#e0f7ff', borderRadius: 20, padding: '2px 10px', marginTop: 4, display: 'inline-block' }}>
                היום
              </span>
            )}
          </div>
          <NavArrow dir="next" onClick={() => changeDate(1)} disabled={isFuture} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isToday && (
            <button onClick={() => setSelectedDate(new Date())}
              style={{ fontSize: 12, fontWeight: 600, color: TEAL_DARK, background: '#e0f7ff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
              חזור להיום
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', borderRadius: 12, padding: '8px 14px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 28 }}>{weather.icon}</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#1e293b', lineHeight: 1.1 }}>{weather.temp}°C</p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.2 }}>{weather.desc}</p>
            </div>
            <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: 12, marginRight: 2 }}>
              <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>📍 אתר</p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{weather.uv}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <SummaryCard icon="👷" value={total} label="פועלים באתר היום" color={TEAL} bg="#f0fbff" border="#b3e8fa" />
        <SummaryCard icon="✅" value={reported.length} label="קבלנים דיווחו" color="#16a34a" bg="#f0fdf4" border="#bbf7d0"
          sub={`${reported.reduce((s,e)=>s+e.workers,0)} פועלים מדווחים`} />
        <SummaryCard icon="⏳" value={unreported.length} label="טרם דיווחו" color="#dc2626" bg="#fef2f2" border="#fecaca"
          sub={pendingReminders > 0 ? `${pendingReminders} ממתינים לתזכורת` : 'כולם קיבלו תזכורת'} />
      </div>

      {/* ── Action bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, background: 'white', padding: 4, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          {[
            { id: 'all',          label: `הכל (${entries.length})` },
            { id: 'reported',     label: `✅ דיווחו (${reported.length})` },
            { id: 'not_reported', label: `⏳ לא דיווחו (${unreported.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              style={{ padding: '7px 14px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: filter === tab.id ? TEAL : 'transparent',
                color:      filter === tab.id ? 'white' : '#64748b',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {pendingReminders > 0 && (
          <button onClick={sendBatchReminder}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: batchSent ? '#f0fdf4' : '#1e293b', color: batchSent ? '#16a34a' : 'white', border: `1.5px solid ${batchSent ? '#86efac' : '#1e293b'}`, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
            <span>{batchSent ? '✓' : '🔔'}</span>
            <span>{batchSent ? 'תזכורות נשלחו' : `שלח תזכורת לכולם (${pendingReminders})`}</span>
          </button>
        )}
      </div>

      {/* ── Contractor list ── */}
      {filtered.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 16, padding: '48px 24px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>📋</p>
          <p style={{ margin: 0, fontWeight: 600 }}>אין רשומות להצגה</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(entry => (
            <ContractorCard key={entry.id} entry={entry} reminderSent={remindersSent.has(entry.id)}
              onReminder={() => sendReminder(entry.id, entry.name)}
              onView={() => setViewEntry(entry)} />
          ))}
        </div>
      )}

      {/* ── Submitted daily reports ── */}
      <div style={{ marginTop: 8 }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📋</span>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
              דוחות יומיים מוגשים
            </h2>
            {approvedReports.length > 0 && (
              <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                {approvedReports.length} מאושרים
              </span>
            )}
          </div>

          {/* Report filter tabs */}
          <div style={{ display: 'flex', gap: 6, background: 'white', padding: 4, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            {[
              { id: 'all',      label: `הכל (${allReports.length})` },
              { id: 'pending',  label: `⏳ ממתין לאישור (${pendingReports.length})` },
              { id: 'approved', label: `✅ מאושר (${approvedReports.length})` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setReportFilter(tab.id)}
                style={{ padding: '7px 14px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: reportFilter === tab.id ? TEAL : 'transparent',
                  color:      reportFilter === tab.id ? 'white' : '#64748b',
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {allReports.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, padding: '36px 24px', textAlign: 'center', border: '1.5px dashed #e2e8f0', color: '#94a3b8' }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>📝</p>
            <p style={{ margin: 0, fontWeight: 600 }}>טרם הוגשו דוחות יומיים</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>קבלנים יגישו דוחות מהעמוד "הדוח שלי"</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, padding: '36px 24px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>🔍</p>
            <p style={{ margin: 0, fontWeight: 600 }}>אין דוחות בסינון זה</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredReports.map(rep => (
              <SubmittedReportCard key={rep.id} report={rep} onView={() => setViewReport(rep)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Floating add button ── */}
      <button
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed', bottom: 28, left: 28, zIndex: 100,
          width: 56, height: 56, borderRadius: '50%',
          background: `linear-gradient(135deg, ${GOLD}, #e8b800)`,
          color: '#1a1a00', border: 'none', cursor: 'pointer',
          fontSize: 26, fontWeight: 700, lineHeight: 1,
          boxShadow: `0 6px 20px ${GOLD}99`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        title="הוסף רשומה חדשה"
      >
        +
      </button>

      {/* ── Modals ── */}
      {showAdd    && <AddEntryModal onClose={() => setShowAdd(false)} onSave={entry => { addEntry(entry); setShowAdd(false); }} />}
      {viewEntry  && <ViewReportModal entry={viewEntry} onClose={() => setViewEntry(null)} />}
      {viewReport && <ReportDetailModal report={viewReport} onClose={() => setViewReport(null)} />}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavArrow({ dir, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid #e2e8f0', background: hov && !disabled ? '#f1f5f9' : 'white', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 16, color: disabled ? '#cbd5e1' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
      {dir === 'prev' ? '▶' : '◀'}
    </button>
  );
}

function SummaryCard({ icon, value, label, color, bg, border, sub }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 16, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600, color: '#475569' }}>{label}</p>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>{sub}</p>}
    </div>
  );
}

function TradeAvatar({ trade }) {
  const style = TRADE_STYLE[trade] ?? { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: style.bg, border: `1.5px solid ${style.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 18, fontWeight: 800, color: style.text, fontFamily: 'system-ui, sans-serif' }}>
        {trade.charAt(0)}
      </span>
    </div>
  );
}

function TradeBadge({ trade }) {
  const style = TRADE_STYLE[trade] ?? { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: style.bg, color: style.text, border: `1px solid ${style.border}`, whiteSpace: 'nowrap' }}>
      {trade}
    </span>
  );
}

function ContractorCard({ entry, reminderSent, onReminder, onView }) {
  const [hov, setHov] = useState(false);
  const rep = entry.status === 'reported';

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: 'white', borderRadius: 14, border: `1.5px solid ${hov ? (rep ? '#86efac' : '#fca5a5') : '#e2e8f0'}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s', boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.03)', flexWrap: 'wrap' }}>
      <div style={{ width: 4, height: 44, borderRadius: 4, background: rep ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
      <TradeAvatar trade={entry.trade} />

      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{entry.name}</span>
          <TradeBadge trade={entry.trade} />
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>{entry.company}</p>
        <p style={{ margin: '1px 0 0', fontSize: 11, color: '#cbd5e1', direction: 'ltr', textAlign: 'right' }}>{entry.phone}</p>
      </div>

      <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: 100 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>פרויקט</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: '#475569' }}>{entry.project.replace('פרויקט ', '')}</p>
      </div>

      <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: 72 }}>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{entry.workers}</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>פועלים</p>
      </div>

      <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: 110 }}>
        {rep ? (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '4px 10px' }}>
              <span>✅</span> דיווח התקבל
            </span>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>🕐 {entry.reportTime}</p>
          </>
        ) : (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 20, padding: '4px 10px' }}>
              <span>⏳</span> טרם דיווח
            </span>
            {reminderSent && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#16a34a' }}>🔔 תזכורת נשלחה</p>}
          </>
        )}
      </div>

      <div style={{ flex: '0 0 auto' }}>
        {rep ? (
          <ActionBtn onClick={onView} color={TEAL} textColor="white">צפה בדוח</ActionBtn>
        ) : (
          <ActionBtn onClick={reminderSent ? undefined : onReminder}
            color={reminderSent ? '#f0fdf4' : '#1e293b'} textColor={reminderSent ? '#16a34a' : 'white'}
            border={reminderSent ? '#86efac' : undefined} disabled={reminderSent}>
            {reminderSent ? '✓ נשלחה' : '🔔 תזכורת'}
          </ActionBtn>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, color, textColor, border, disabled, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${border ?? color}`, background: hov && !disabled ? color + 'dd' : color, color: textColor, fontSize: 12, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

// ─── Submitted Report Card ─────────────────────────────────────────────────────
function SubmittedReportCard({ report, onView }) {
  const [hov, setHov] = useState(false);
  const isApproved = report.approvalStatus === 'approved';
  const trStyle = TRADE_STYLE[report.trade] ?? { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  const sigs = report.signatures || [];
  const signedRoles = new Set(sigs.map(s => s.role));

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: isApproved ? '#f0fdf4' : 'white',
        borderRadius: 14,
        border: `1.5px solid ${hov ? (isApproved ? '#4ade80' : '#fbbf24') : (isApproved ? '#86efac' : '#e2e8f0')}`,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all 0.15s',
        boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.03)',
        flexWrap: 'wrap',
      }}>
      {/* Status strip */}
      <div style={{ width: 4, height: 44, borderRadius: 4, background: isApproved ? '#16a34a' : '#d97706', flexShrink: 0 }} />

      {/* Trade avatar */}
      <div style={{ width: 44, height: 44, borderRadius: 12, background: trStyle.bg, border: `1.5px solid ${trStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: trStyle.text }}>{(report.trade || '?').charAt(0)}</span>
      </div>

      {/* Name + trade + date */}
      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{report.displayName}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: trStyle.bg, color: trStyle.text, border: `1px solid ${trStyle.border}`, whiteSpace: 'nowrap' }}>{report.trade}</span>
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>תאריך: {report.date}</p>
      </div>

      {/* Approval chain stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        {APPROVAL_CHAIN.map((role, i) => (
          <span key={role} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {i > 0 && <span style={{ fontSize: 10, color: '#cbd5e1' }}>←</span>}
            <span title={CHAIN_ROLE_LABELS[role]} style={{
              width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
              background: signedRoles.has(role) ? '#dcfce7' : '#f8fafc',
              border: `2px solid ${signedRoles.has(role) ? '#86efac' : '#e2e8f0'}`,
              color: signedRoles.has(role) ? '#16a34a' : '#cbd5e1',
            }}>
              {signedRoles.has(role) ? '✓' : '○'}
            </span>
          </span>
        ))}
      </div>

      {/* Approval status badge */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
        color: isApproved ? '#16a34a' : '#d97706',
        background: isApproved ? '#dcfce7' : '#fffbeb',
        border: `1.5px solid ${isApproved ? '#86efac' : '#fde68a'}`,
        borderRadius: 20, padding: '4px 12px', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {isApproved ? '✅ מאושר במלואו' : '⏳ ממתין לאישור'}
      </span>

      <ActionBtn onClick={onView} color={TEAL} textColor="white">צפה בדוח</ActionBtn>
    </div>
  );
}

// ─── Report Detail Modal ──────────────────────────────────────────────────────
function ReportDetailModal({ report, onClose }) {
  const isApproved = report.approvalStatus === 'approved';
  const sigs = report.signatures || [];
  const signedRoles = new Set(sigs.map(s => s.role));
  const workStatus = WORK_STATUS_INFO[report.status];

  return (
    <Overlay onClose={onClose} maxWidth={580}>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', padding: 4, borderRadius: 8 }}>✕</button>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>דוח יומי</h3>
        </div>

        {/* Submitter row */}
        <div style={{ background: '#f8fafc', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#e0f7ff', border: `1.5px solid #b3e8fa`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: TEAL_DARK }}>{(report.displayName || '?').charAt(0)}</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{report.displayName}</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>{report.trade} • {report.date}</p>
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700,
            color: isApproved ? '#16a34a' : '#d97706',
            background: isApproved ? '#dcfce7' : '#fffbeb',
            border: `1.5px solid ${isApproved ? '#86efac' : '#fde68a'}`,
            borderRadius: 20, padding: '5px 14px',
          }}>
            {isApproved ? '✅ מאושר במלואו' : '⏳ ממתין לאישור'}
          </span>
        </div>

        {/* Fields grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            { label: '📅 תאריך', value: report.date },
            { label: '📊 סטטוס עבודה', value: workStatus ? <span style={{ color: workStatus.color, fontWeight: 700 }}>{workStatus.label}</span> : report.status },
            { label: '👷 מספר פועלים', value: report.workersCount || '—' },
            { label: '🕐 שעות עבודה',  value: report.hoursWorked  || '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Text fields */}
        {[
          { label: '📝 תיאור עבודה',   value: report.workDescription },
          { label: '🔧 חומרים בשימוש', value: report.materials },
          { label: '⚠️ בעיות ועיכובים', value: report.issues },
          { label: '💬 הערות',          value: report.notes },
        ].filter(f => f.value).map(({ label, value }) => (
          <div key={label} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{value}</p>
          </div>
        ))}

        {/* Signatures timeline */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            שרשרת אישורים
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {APPROVAL_CHAIN.map(role => {
              const sig = sigs.find(s => s.role === role);
              const done = !!sig;
              return (
                <div key={role} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '12px 14px', borderRadius: 12,
                  background: done ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${done ? '#bbf7d0' : '#e2e8f0'}`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: done ? '#dcfce7' : '#f1f5f9',
                    border: `2px solid ${done ? '#86efac' : '#e2e8f0'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {done ? '✅' : '○'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: done ? '#166534' : '#94a3b8' }}>
                        {CHAIN_ROLE_LABELS[role]}
                      </span>
                      {done && <span style={{ fontSize: 11, color: '#64748b' }}>{fmtDateTime(sig.signedAt)}</span>}
                    </div>
                    {done && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#374151' }}>{sig.displayName}</p>}
                    {done && sig.notes && (
                      <div style={{ marginTop: 6, background: 'white', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#374151' }}>
                        💬 {sig.notes}
                      </div>
                    )}
                    {!done && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#cbd5e1' }}>טרם אושר</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
            סגור
          </button>
          {isApproved && (
            <button onClick={() => exportReportPDF(report)}
              style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span>📄</span> ייצוא PDF
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// ─── Add Entry Modal ──────────────────────────────────────────────────────────
function AddEntryModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', company: '', trade: 'צביעה', phone: '', project: ALL_PROJECTS[0],
    workers: 2, status: 'not_reported', reportTime: '', notes: '',
  });

  function set(k)  { return e => setForm(f => ({ ...f, [k]: e.target.value })); }
  function setN(k) { return e => setForm(f => ({ ...f, [k]: Number(e.target.value) })); }

  function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name:       form.name.trim(),
      company:    form.company.trim(),
      trade:      form.trade,
      phone:      form.phone.trim(),
      project:    form.project,
      workers:    form.workers,
      status:     form.status,
      reportTime: form.status === 'reported' ? (form.reportTime || new Date().toTimeString().slice(0,5)) : null,
      notes:      form.notes.trim(),
    });
  }

  return (
    <Overlay onClose={onClose}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', padding: 4, borderRadius: 8 }}>✕</button>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>הוספת רשומה חדשה</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ModalField label="שם קבלן *" value={form.name}    onChange={set('name')}    placeholder="שם הקבלן" required />
          <ModalField label="חברה"       value={form.company} onChange={set('company')} placeholder="שם החברה" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ModalSelect label="ענף"     value={form.trade}   onChange={set('trade')}   options={ALL_TRADES} />
          <ModalSelect label="פרויקט" value={form.project} onChange={set('project')} options={ALL_PROJECTS} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ModalField label="טלפון" type="tel" value={form.phone} onChange={set('phone')} placeholder="050-0000000" />
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>מספר פועלים</label>
            <input type="number" min={1} max={99} value={form.workers} onChange={setN('workers')}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 18, fontWeight: 700, color: '#1e293b', outline: 'none', background: '#f8fafc', boxSizing: 'border-box', textAlign: 'center' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>סטטוס דיווח</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { val: 'reported',     label: '✅ דיווח התקבל',  activeColor: '#16a34a', activeBg: '#f0fdf4', activeBorder: '#86efac' },
              { val: 'not_reported', label: '⏳ טרם דיווח',    activeColor: '#dc2626', activeBg: '#fef2f2', activeBorder: '#fecaca' },
            ].map(opt => (
              <button key={opt.val} type="button" onClick={() => setForm(f => ({ ...f, status: opt.val }))}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${form.status === opt.val ? opt.activeBorder : '#e2e8f0'}`, background: form.status === opt.val ? opt.activeBg : 'white', color: form.status === opt.val ? opt.activeColor : '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {form.status === 'reported' && (
          <ModalField label="שעת דיווח" type="time" value={form.reportTime} onChange={set('reportTime')} />
        )}

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>הערות</label>
          <textarea value={form.notes} onChange={set('notes')} placeholder="הוסף הערות לגבי העבודה היומית..." rows={3}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', background: '#f8fafc', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', direction: 'rtl' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
            ביטול
          </button>
          <button type="submit"
            style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${GOLD}, #e8b800)`, fontSize: 14, fontWeight: 700, color: '#1a1a00', cursor: 'pointer', boxShadow: `0 4px 12px ${GOLD}66` }}>
            הוסף ליומן
          </button>
        </div>
      </form>
    </Overlay>
  );
}

// ─── View Report Modal (legacy contractor entry) ──────────────────────────────
function ViewReportModal({ entry, onClose }) {
  return (
    <Overlay onClose={onClose} maxWidth={420}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', padding: 4, borderRadius: 8 }}>✕</button>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>פרטי דיווח יומי</h3>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 14, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid #e2e8f0' }}>
          <TradeAvatar trade={entry.trade} />
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{entry.name}</p>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>{entry.company}</p>
            <div style={{ marginTop: 6 }}><TradeBadge trade={entry.trade} /></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: '🏗️ פרויקט',    value: entry.project },
            { label: '👷 פועלים',    value: `${entry.workers} עובדים` },
            { label: '🕐 שעת דיווח', value: entry.reportTime },
            { label: '📞 טלפון',     value: entry.phone, ltr: true },
          ].map(({ label, value, ltr }) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', border: '1px solid #f1f5f9' }}>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#1e293b', direction: ltr ? 'ltr' : undefined, textAlign: ltr ? 'right' : undefined }}>{value}</p>
            </div>
          ))}
        </div>

        {entry.notes && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#92400e' }}>📝 הערות</p>
            <p style={{ margin: 0, fontSize: 14, color: '#78350f' }}>{entry.notes}</p>
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 20, padding: '6px 16px' }}>
            ✅ דיווח התקבל בשעה {entry.reportTime}
          </span>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function Overlay({ children, onClose, maxWidth = 520 }) {
  const ref = useRef(null);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(2px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} style={{ background: 'white', borderRadius: 20, padding: '28px 28px', width: '100%', maxWidth, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function ModalField({ label, type = 'text', value, onChange, placeholder, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} dir="rtl"
        style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${focused || value ? TEAL : '#e2e8f0'}`, borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', background: '#f8fafc', boxSizing: 'border-box', transition: 'border-color 0.15s' }} />
    </div>
  );
}

function ModalSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={onChange} dir="rtl"
        style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${TEAL}`, borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', background: '#f8fafc', boxSizing: 'border-box', cursor: 'pointer', appearance: 'none' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
