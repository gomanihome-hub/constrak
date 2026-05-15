import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { projects, subcontractors } from '../data/mockData';
import { loadReports, APPROVAL_CHAIN, CHAIN_ROLE_LABELS } from '../data/reportApprovalStore';
import { loadTasks } from '../data/tasksStore';

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL      = '#80cded';
const TEAL_DARK = '#4fb8e0';
const GOLD      = '#f3ce1f';
const GREEN     = '#22c55e';
const RED       = '#ef4444';

const PIE_COLORS = [TEAL_DARK, '#f97316', GREEN, RED, '#8b5cf6', GOLD];

const ALL_PROJECTS_OPT = [
  { id: 'all', name: 'כל הפרויקטים' },
  ...projects.map(p => ({ id: String(p.id), name: p.name })),
];

// ─── Data helpers ─────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }

function dateRange(from, to) {
  const days = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function shortDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return fmtDate(iso) + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// Build daily worker count from subcontractors mock (same seed logic as WorkLog)
function buildDayWorkers(dateStr) {
  const date = new Date(dateStr);
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return subcontractors.reduce((sum, sc, i) => {
    const reported = ((seed + i * 13) % 10) >= 4;
    return sum + (reported ? 2 + ((seed + i * 7) % 7) : 0);
  }, 0);
}

function buildDayReported(dateStr) {
  const date = new Date(dateStr);
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return subcontractors.filter((_, i) => ((seed + i * 13) % 10) >= 4).length;
}

// PDF builder
function buildPrintWindow(title, bodyHTML) {
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;margin:32px;color:#1e293b;direction:rtl;font-size:13px;}
  h1{font-size:20px;font-weight:800;margin:0 0 4px;}
  .sub{color:#64748b;margin-bottom:20px;font-size:13px;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:right;}
  th{background:#f8fafc;font-weight:700;font-size:12px;color:#64748b;}
  .badge{display:inline-block;border-radius:20px;padding:2px 10px;font-weight:700;font-size:11px;}
  .section{margin:20px 0 8px;font-size:14px;font-weight:700;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:4px;}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;}
  @media print{body{margin:16px;}}
</style>
</head>
<body>
<h1>${title}</h1>
<div class="sub">הופק ב-${fmtDateTime(new Date().toISOString())} | מערכת Constrak</div>
${bodyHTML}
<div class="footer">Constrak – מערכת ניהול בנייה</div>
</body>
</html>`;
  const win = window.open('', '_blank');
  if (!win) { alert('אפשר חלונות קופצים להדפסה'); return null; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
  return win;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Reports() {
  const today      = todayStr();
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0, 10);

  const [projectFilter, setProjectFilter] = useState('all');
  const [dateFrom,      setDateFrom]      = useState(twoWeeksAgoStr);
  const [dateTo,        setDateTo]        = useState(today);
  const [activeReport,  setActiveReport]  = useState(null); // 'daily'|'workers'|'exceptions'|'kpi'
  const [dailyDate,     setDailyDate]     = useState(today);
  const [emailSent,     setEmailSent]     = useState(false);

  const allReports = useMemo(() => loadReports(), []);
  const allTasks   = useMemo(() => loadTasks(),   []);

  // Reports filtered by date range + project
  const filteredReports = useMemo(() => allReports.filter(r => {
    const inRange = r.date >= dateFrom && r.date <= dateTo;
    const inProj  = projectFilter === 'all' || r.project === projectFilter;
    return inRange && inProj;
  }), [allReports, dateFrom, dateTo, projectFilter]);

  // ── Summary counters ────────────────────────────────────────────────────────
  const todaySeed = (() => {
    const d = new Date(today);
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  })();
  const todayReportedCount = subcontractors.filter((_, i) => ((todaySeed + i * 13) % 10) >= 4).length;
  const todayTotalCount    = subcontractors.length;
  const totalWorkersToday  = subcontractors.reduce((sum, sc, i) => {
    const reported = ((todaySeed + i * 13) % 10) >= 4;
    return sum + (reported ? 2 + ((todaySeed + i * 7) % 7) : 0);
  }, 0);
  const totalHoursAll = filteredReports.reduce((s, r) => s + (Number(r.hoursWorked) || 0), 0);
  const openTasks     = allTasks.filter(t => t.status !== 'done').length;
  const compliance    = todayTotalCount > 0 ? Math.round((todayReportedCount / todayTotalCount) * 100) : 0;

  // ── Chart data ──────────────────────────────────────────────────────────────
  const days = useMemo(() => dateRange(dateFrom, dateTo).slice(-14), [dateFrom, dateTo]);

  const workersPerDay = useMemo(() => days.map(d => ({
    date: shortDate(d),
    'פועלים': buildDayWorkers(d),
  })), [days]);

  const hoursPerDay = useMemo(() => {
    const byDate = {};
    filteredReports.forEach(r => {
      byDate[r.date] = (byDate[r.date] || 0) + (Number(r.hoursWorked) || 0);
    });
    return days.map(d => ({
      date: shortDate(d),
      'שעות': byDate[d] ?? Math.round(60 + Math.random() * 40),
    }));
  }, [days, filteredReports]);

  const pieData = [
    { name: 'דיווחו', value: todayReportedCount },
    { name: 'לא דיווחו', value: todayTotalCount - todayReportedCount },
  ];

  const projectCompletion = projects.map(p => ({
    name: p.name.replace('פרויקט ', '').replace('שיפוץ ', '').replace('מרכז ', ''),
    'התקדמות בפועל': p.progress,
    'יעד': 100,
  }));

  // ── Report content generators ───────────────────────────────────────────────
  const dailyReports = useMemo(() =>
    allReports.filter(r => r.date === dailyDate)
  , [allReports, dailyDate]);

  const workersByTrade = useMemo(() => {
    const map = {};
    subcontractors.forEach(sc => {
      if (!map[sc.trade]) map[sc.trade] = { trade: sc.trade, count: 0, workers: 0, companies: [] };
      map[sc.trade].count++;
      map[sc.trade].workers += 2 + ((todaySeed + subcontractors.indexOf(sc) * 7) % 7);
      if (!map[sc.trade].companies.includes(sc.company)) map[sc.trade].companies.push(sc.company);
    });
    return Object.values(map).sort((a, b) => b.workers - a.workers);
  }, [todaySeed]);

  const exceptionReports = useMemo(() =>
    filteredReports.filter(r => r.issues || r.status === 'blocked' || r.approvalStatus === 'pending')
  , [filteredReports]);

  const kpiData = projects.map(p => ({
    ...p,
    tasksOpen: p.tasks.total - p.tasks.done,
    tasksDone: p.tasks.done,
    budgetUsed: Math.round((p.spent / p.budget) * 100),
  }));

  // ── PDF exports ──────────────────────────────────────────────────────────────
  function exportDailySummary() {
    const rows = dailyReports.map(r =>
      `<tr><td>${r.displayName}</td><td>${r.trade}</td><td>${r.workersCount||'—'}</td><td>${r.hoursWorked||'—'}</td><td>${r.status||'—'}</td><td>${r.approvalStatus==='approved'?'✅ מאושר':'⏳ ממתין'}</td></tr>`
    ).join('');
    buildPrintWindow(`דוח יומי – ${dailyDate}`, `
      <div class="section">סיכום יום ${fmtDate(dailyDate)}</div>
      <table><thead><tr><th>שם</th><th>ענף</th><th>פועלים</th><th>שעות</th><th>סטטוס</th><th>אישור</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8">אין דוחות לתאריך זה</td></tr>'}</tbody></table>
      <p><strong>סה"כ דוחות:</strong> ${dailyReports.length} | <strong>מאושרים:</strong> ${dailyReports.filter(r=>r.approvalStatus==='approved').length}</p>`);
  }

  function exportWorkersReport() {
    const rows = workersByTrade.map(t =>
      `<tr><td>${t.trade}</td><td>${t.count}</td><td>${t.workers}</td><td>${t.companies.join(', ')}</td></tr>`
    ).join('');
    buildPrintWindow('דוח כוח אדם לפי ענף', `
      <div class="section">כוח אדם לפי ענף – ${fmtDate(today)}</div>
      <table><thead><tr><th>ענף</th><th>קבלנים</th><th>פועלים</th><th>חברות</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p><strong>סה"כ פועלים:</strong> ${totalWorkersToday}</p>`);
  }

  function exportExceptions() {
    const rows = exceptionReports.map(r =>
      `<tr><td>${r.date}</td><td>${r.displayName}</td><td>${r.trade}</td><td>${r.issues||'—'}</td><td>${r.status}</td></tr>`
    ).join('');
    buildPrintWindow('דוח חריגות', `
      <div class="section">חריגות בתקופה ${fmtDate(dateFrom)} – ${fmtDate(dateTo)}</div>
      <table><thead><tr><th>תאריך</th><th>שם</th><th>ענף</th><th>בעיה</th><th>סטטוס</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8">אין חריגות בתקופה זו</td></tr>'}</tbody></table>`);
  }

  function exportKPI() {
    const rows = kpiData.map(p =>
      `<tr><td>${p.name}</td><td>${p.progress}%</td><td>${p.tasksDone}/${p.tasks.total}</td><td>${p.budgetUsed}%</td><td>${p.status==='active'?'פעיל':'תכנון'}</td></tr>`
    ).join('');
    buildPrintWindow('דוח KPI – ביצוע מול יעד', `
      <div class="section">ביצוע לעומת יעד לפי פרויקט</div>
      <table><thead><tr><th>פרויקט</th><th>התקדמות</th><th>משימות</th><th>תקציב</th><th>סטטוס</th></tr></thead>
      <tbody>${rows}</tbody></table>`);
  }

  function sendEmail() {
    const subject = encodeURIComponent(`דוח Constrak – ${fmtDate(today)}`);
    const body = encodeURIComponent(
      `שלום,\n\nמצורף דוח מצב ליום ${fmtDate(today)}.\n\nסיכום:\n` +
      `• פועלים באתר: ${totalWorkersToday}\n` +
      `• ציות לדיווח: ${compliance}%\n` +
      `• משימות פתוחות: ${openTasks}\n` +
      `• שעות עבודה (תקופה): ${totalHoursAll}\n\n` +
      `מערכת Constrak`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  }

  return (
    <div dir="rtl" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page title ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28 }}>📊</span>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>דוחות וסטטיסטיקות</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>ניתוח נתוני האתר, ביצוע לעומת יעד וייצוא דוחות</p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>סינון:</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>פרויקט</label>
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} dir="rtl"
            style={{ padding: '7px 12px', border: `1.5px solid ${TEAL}`, borderRadius: 10, fontSize: 13, color: '#1e293b', background: 'white', cursor: 'pointer', outline: 'none' }}>
            {ALL_PROJECTS_OPT.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>מתאריך</label>
          <input type="date" value={dateFrom} max={dateTo} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '7px 12px', border: `1.5px solid ${TEAL}`, borderRadius: 10, fontSize: 13, color: '#1e293b', background: 'white', outline: 'none', cursor: 'pointer' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>עד תאריך</label>
          <input type="date" value={dateTo} min={dateFrom} max={today} onChange={e => setDateTo(e.target.value)}
            style={{ padding: '7px 12px', border: `1.5px solid ${TEAL}`, borderRadius: 10, fontSize: 13, color: '#1e293b', background: 'white', outline: 'none', cursor: 'pointer' }} />
        </div>

        <button onClick={() => { setDateFrom(twoWeeksAgoStr); setDateTo(today); setProjectFilter('all'); }}
          style={{ padding: '7px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
          אפס
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 1: Summary counters                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      <SectionTitle icon="📈" title="סיכום יומי" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard icon="👷" value={totalWorkersToday} label="פועלים באתר היום"
          color={TEAL_DARK} bg="#f0fbff" border="#b3e8fa"
          sub={`מתוך ${subcontractors.reduce((s,sc,i)=>s+2+((todaySeed+i*7)%7),0)} פוטנציאל`} />
        <KpiCard icon="🕐" value={totalHoursAll || '—'} label={totalHoursAll ? 'שעות עבודה (תקופה)' : 'שעות עבודה'}
          color="#7c3aed" bg="#f5f3ff" border="#ddd6fe"
          sub={`${filteredReports.length} דוחות מוגשים`} />
        <KpiCard icon="✅" value={openTasks} label="משימות פתוחות"
          color="#d97706" bg="#fffbeb" border="#fde68a"
          sub={`מתוך ${allTasks.length} סה"כ`} />
        <KpiCard icon="📊" value={`${compliance}%`} label="ציות לדיווח היום"
          color={compliance >= 70 ? '#16a34a' : compliance >= 40 ? '#d97706' : '#dc2626'}
          bg={compliance >= 70 ? '#f0fdf4' : compliance >= 40 ? '#fffbeb' : '#fef2f2'}
          border={compliance >= 70 ? '#86efac' : compliance >= 40 ? '#fde68a' : '#fecaca'}
          sub={`${todayReportedCount} מתוך ${todayTotalCount} דיווחו`} />
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 2: Charts                                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      <SectionTitle icon="📉" title="גרפים וניתוח" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Bar chart: workers per day */}
        <ChartCard title="פועלים לפי יום" sub="מספר פועלים בכל יום בתקופה הנבחרת">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workersPerDay} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, direction: 'rtl' }}
                formatter={(v) => [`${v} פועלים`, 'כמות']} />
              <Bar dataKey="פועלים" fill={TEAL_DARK} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Line chart: work hours per day */}
        <ChartCard title="שעות עבודה לפי יום" sub="סה״כ שעות עבודה מדווחות ביום">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hoursPerDay} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, direction: 'rtl' }}
                formatter={(v) => [`${v} שעות`, 'סה"כ']} />
              <Line type="monotone" dataKey="שעות" stroke={GOLD} strokeWidth={2.5} dot={{ fill: GOLD, r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Pie chart: reported vs not */}
        <ChartCard title="דיווחים – היום" sub="קבלנים שדיווחו מול שלא דיווחו">
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={[TEAL_DARK, '#f1f5f9'][i]} stroke={['#4fb8e0cc','#cbd5e1'][i]} strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, direction: 'rtl' }}
                  formatter={(v, n) => [`${v} קבלנים`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: TEAL_DARK, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{todayReportedCount}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>דיווחו</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: '#e2e8f0', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{todayTotalCount - todayReportedCount}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>לא דיווחו</p>
                </div>
              </div>
              <div style={{ background: compliance >= 70 ? '#f0fdf4' : '#fffbeb', borderRadius: 10, padding: '8px 12px', border: `1.5px solid ${compliance >= 70 ? '#86efac' : '#fde68a'}` }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: compliance >= 70 ? '#16a34a' : '#d97706', lineHeight: 1 }}>{compliance}%</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>ציות לדיווח</p>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Bar chart: project completion */}
        <ChartCard title="התקדמות פרויקטים" sub="אחוז השלמה בפועל לכל פרויקט">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projectCompletion} layout="vertical" margin={{ top: 5, right: 40, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={90} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, direction: 'rtl' }}
                formatter={(v, n) => [`${v}%`, n === 'התקדמות בפועל' ? 'בפועל' : 'יעד']} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="יעד" fill="#f1f5f9" radius={[0, 4, 4, 0]} />
              <Bar dataKey="התקדמות בפועל" fill={TEAL_DARK} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 3: Reports list                                */}
      {/* ═══════════════════════════════════════════════════════ */}
      <SectionTitle icon="📋" title="דוחות מפורטים" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Daily summary */}
        <ReportPanel
          id="daily"
          active={activeReport}
          onToggle={id => setActiveReport(a => a === id ? null : id)}
          icon="📅"
          title="דוח סיכום יומי"
          desc="סיכום כל הדיווחים ליום נבחר — קבלנים, ענפים, שעות וסטטוס אישור"
          onExport={exportDailySummary}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>בחר תאריך:</label>
            <input type="date" value={dailyDate} max={today} onChange={e => setDailyDate(e.target.value)}
              style={{ padding: '7px 12px', border: `1.5px solid ${TEAL}`, borderRadius: 10, fontSize: 13, color: '#1e293b', background: 'white', outline: 'none' }} />
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              {dailyReports.length} דוחות מוגשים
            </span>
          </div>
          {dailyReports.length === 0 ? (
            <EmptyState msg="אין דוחות מוגשים לתאריך זה" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['שם','ענף','פועלים','שעות','סטטוס עבודה','אישור'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b', fontSize: 12, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyReports.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{r.displayName}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{r.trade}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{r.workersCount || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.hoursWorked || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <WorkStatusBadge status={r.status} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <ApprovalBadge status={r.approvalStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportPanel>

        {/* Workers report */}
        <ReportPanel
          id="workers"
          active={activeReport}
          onToggle={id => setActiveReport(a => a === id ? null : id)}
          icon="👷"
          title="דוח כוח אדם"
          desc="פועלים וקבלנים לפי ענף ותפקיד — מספרים, חברות ושעות מוערכות"
          onExport={exportWorkersReport}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['ענף','קבלנים','פועלים','שעות מוערכות','חברות'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b', fontSize: 12, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workersByTrade.map((t, i) => (
                  <tr key={t.trade} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>{t.trade}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{t.count}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: TEAL_DARK }}>{t.workers}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{t.workers * 8}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{t.companies.join(' • ')}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f0fbff', fontWeight: 700, borderTop: '2px solid #b3e8fa' }}>
                  <td style={{ padding: '10px 12px', color: TEAL_DARK }}>סה"כ</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{workersByTrade.reduce((s,t)=>s+t.count,0)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: TEAL_DARK }}>{totalWorkersToday}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{totalWorkersToday * 8}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </ReportPanel>

        {/* Exceptions report */}
        <ReportPanel
          id="exceptions"
          active={activeReport}
          onToggle={id => setActiveReport(a => a === id ? null : id)}
          icon="⚠️"
          title="דוח חריגות"
          desc="כל האירועים הלא-מתוכננים: חסימות, עיכובים, בעיות שדווחו"
          badgeCount={exceptionReports.length}
          onExport={exportExceptions}
        >
          {exceptionReports.length === 0 ? (
            <EmptyState icon="✅" msg="אין חריגות בתקופה הנבחרת" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exceptionReports.map(r => (
                <div key={r.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{r.displayName}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{r.trade}</span>
                      <span style={{ fontSize: 11, color: '#b45309', background: '#fef3c7', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>{r.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <WorkStatusBadge status={r.status} />
                      <ApprovalBadge status={r.approvalStatus} />
                    </div>
                  </div>
                  {r.issues && (
                    <p style={{ margin: 0, fontSize: 13, color: '#78350f' }}>⚠️ {r.issues}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ReportPanel>

        {/* KPI report */}
        <ReportPanel
          id="kpi"
          active={activeReport}
          onToggle={id => setActiveReport(a => a === id ? null : id)}
          icon="🎯"
          title="דוח KPI – ביצוע מול יעד"
          desc="השוואת התקדמות בפועל מול יעד מתוכנן לפי פרויקט — משימות, תקציב והתקדמות"
          onExport={exportKPI}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {kpiData.map(p => (
              <div key={p.id} style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{p.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{p.location} • {p.manager}</p>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '4px 12px',
                    background: p.status === 'active' ? '#f0fdf4' : '#fffbeb',
                    color: p.status === 'active' ? '#16a34a' : '#d97706',
                    border: `1px solid ${p.status === 'active' ? '#86efac' : '#fde68a'}`,
                  }}>
                    {p.status === 'active' ? '🟢 פעיל' : '🟡 תכנון'}
                  </span>
                </div>

                {/* KPI grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'התקדמות',     value: `${p.progress}%`, color: TEAL_DARK },
                    { label: 'תקציב',       value: `${p.budgetUsed}%`, color: p.budgetUsed > 85 ? RED : '#16a34a' },
                    { label: 'משימות שהושלמו', value: `${p.tasksDone}/${p.tasks.total}`, color: '#7c3aed' },
                    { label: 'פועלים',      value: p.workers, color: '#d97706' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'white', borderRadius: 10, padding: '10px 12px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <ProgressBar label="התקדמות בפועל" pct={p.progress} color={TEAL_DARK} />
                  <ProgressBar label="ניצול תקציב"   pct={p.budgetUsed} color={p.budgetUsed > 85 ? RED : '#16a34a'} />
                  <ProgressBar label="השלמת משימות"  pct={Math.round((p.tasksDone / p.tasks.total) * 100)} color="#7c3aed" />
                </div>
              </div>
            ))}
          </div>
        </ReportPanel>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 4: Export                                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      <SectionTitle icon="📤" title="ייצוא ושיתוף" />
      <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1e293b' }}>ייצוא כל הדוחות</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>ייצא את כל ארבעת הדוחות לPDF, או שלח סיכום במייל</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <ExportBtn icon="📄" label="ייצוא PDF — יומי"    onClick={exportDailySummary} color="#1e293b" />
          <ExportBtn icon="📄" label="ייצוא PDF — כוח אדם" onClick={exportWorkersReport} color="#1e293b" />
          <ExportBtn icon="📄" label="ייצוא PDF — חריגות"  onClick={exportExceptions}   color="#1e293b" />
          <ExportBtn icon="📄" label="ייצוא PDF — KPI"     onClick={exportKPI}           color="#1e293b" />
          <ExportBtn
            icon={emailSent ? '✅' : '✉️'}
            label={emailSent ? 'נשלח!' : 'שלח סיכום במייל'}
            onClick={sendEmail}
            color={emailSent ? '#16a34a' : GOLD}
            textColor={emailSent ? 'white' : '#1a1a00'}
          />
        </div>
      </div>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
    </div>
  );
}

function KpiCard({ icon, value, label, color, bg, border, sub }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 26 }}>{icon}</span>
        <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#475569' }}>{label}</p>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, sub, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{title}</p>
      {sub && <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94a3b8' }}>{sub}</p>}
      {children}
    </div>
  );
}

function ReportPanel({ id, active, onToggle, icon, title, desc, badgeCount, onExport, children }) {
  const open = active === id;
  return (
    <div style={{ background: 'white', borderRadius: 16, border: `1.5px solid ${open ? TEAL : '#e2e8f0'}`, overflow: 'hidden', transition: 'border-color 0.2s', boxShadow: open ? `0 4px 20px ${TEAL}22` : '0 1px 3px rgba(0,0,0,0.03)' }}>
      <button onClick={() => onToggle(id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{title}</p>
            {badgeCount > 0 && (
              <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                {badgeCount}
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{desc}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {open && (
            <button onClick={e => { e.stopPropagation(); onExport(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <span>📄</span> PDF
            </button>
          )}
          <span style={{ fontSize: 16, color: '#94a3b8', transform: `rotate(${open ? 90 : -90}deg)`, transition: 'transform 0.2s', display: 'inline-block' }}>◀</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ height: 1, background: '#f1f5f9', marginBottom: 16 }} />
          {children}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ label, pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: '#64748b', width: 100, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, width: 36, textAlign: 'left' }}>{pct}%</span>
    </div>
  );
}

function WorkStatusBadge({ status }) {
  const map = {
    completed:   { label: 'הושלם',  color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
    in_progress: { label: 'בביצוע', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    partial:     { label: 'חלקי',   color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
    blocked:     { label: 'חסום',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  };
  const s = map[status] ?? map.in_progress;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function ApprovalBadge({ status }) {
  const approved = status === 'approved';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: approved ? '#f0fdf4' : '#fffbeb',
      color: approved ? '#16a34a' : '#d97706',
      border: `1px solid ${approved ? '#86efac' : '#fde68a'}`,
      whiteSpace: 'nowrap',
    }}>
      {approved ? '✅ מאושר' : '⏳ ממתין'}
    </span>
  );
}

function EmptyState({ icon = '📋', msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 24px', color: '#94a3b8' }}>
      <p style={{ fontSize: 28, margin: '0 0 8px' }}>{icon}</p>
      <p style={{ margin: 0, fontWeight: 600 }}>{msg}</p>
    </div>
  );
}

function ExportBtn({ icon, label, onClick, color, textColor = 'white' }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 16px', borderRadius: 12,
        border: `1.5px solid ${color}`,
        background: hov ? color : 'white',
        color: hov ? textColor : color,
        fontSize: 13, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}>
      <span>{icon}</span> {label}
    </button>
  );
}
