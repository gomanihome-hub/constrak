import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { APPROVAL_CHAIN, APPROVAL_STATUS_INFO, CHAIN_ROLE_LABELS } from '../data/reportApprovalStore';

const STORE_KEY = 'constrak_sub_reports';
const STATUS_OPTIONS = [
  { value: 'completed', label: 'הושלם', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { value: 'in_progress', label: 'בביצוע', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { value: 'partial', label: 'חלקי', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { value: 'blocked', label: 'חסום', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function loadReports() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { return []; }
}

function saveReports(list) { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }

export default function MyReport() {
  const { user, logout } = useAuth();
  const { currentSystemUser } = useRoles();
  const [reports, setReports] = useState(() => loadReports());
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    date: todayStr(),
    workDescription: '',
    workersCount: '',
    hoursWorked: '',
    status: 'completed',
    notes: '',
    materials: '',
    issues: '',
  });

  const displayName = currentSystemUser?.displayName || user?.displayName || 'קבלן';
  const trade = currentSystemUser?.trade || 'קבלן משנה';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const myReports = reports.filter(r => r.userId === (currentSystemUser?.id ?? user?.uid)).sort((a, b) => b.date.localeCompare(a.date));
  const todayReport = myReports.find(r => r.date === todayStr());

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.workDescription.trim()) { showToast('נא למלא תיאור עבודה'); return; }
    const userId = currentSystemUser?.id ?? user?.uid;
    const report = {
      id: `rep-${Date.now()}`,
      userId,
      displayName,
      trade,
      ...form,
      submittedAt: new Date().toISOString(),
      approvalStatus: 'pending',
      signatures: [{
        role: 'subcontractor',
        userId,
        displayName,
        signedAt: new Date().toISOString(),
        notes: '',
      }],
    };
    const updated = [...reports, report];
    setReports(updated);
    saveReports(updated);
    setShowForm(false);
    setForm({ date: todayStr(), workDescription: '', workersCount: '', hoursWorked: '', status: 'completed', notes: '', materials: '', issues: '' });
    showToast('הדוח הוגש בהצלחה ✓');
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: 'white', padding: '10px 20px', borderRadius: 10, zIndex: 9999, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏛️</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#f3ce1f', WebkitTextStroke: '0.3px #c9a800' }}>קונסטרק</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'white' }}>
              {initials}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{displayName}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>🔨 {trade}</p>
            </div>
          </div>
          <button onClick={logout} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
            יציאה
          </button>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 680, width: '100%', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>הגשת דוח עבודה יומי</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
            {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Today's status */}
        {!todayReport && !showForm && (
          <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '2px dashed #e2e8f0', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>לא הוגש דוח להיום</p>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#94a3b8' }}>הגש את דוח העבודה היומי שלך</p>
            <button
              onClick={() => setShowForm(true)}
              style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(79,184,224,0.4)' }}
            >
              + הגש דוח יומי
            </button>
          </div>
        )}

        {todayReport && !showForm && (
          <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '2px solid #22c55e', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#15803d' }}>דוח היום הוגש</p>
                <p style={{ margin: 0, fontSize: 12, color: '#86efac' }}>הוגש ב-{new Date(todayReport.submittedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {(() => {
                const s = STATUS_OPTIONS.find(o => o.value === todayReport.status);
                return s ? (
                  <span style={{ marginRight: 'auto', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                ) : null;
              })()}
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151' }}>{todayReport.workDescription}</p>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b' }}>
              {todayReport.workersCount && <span>👷 {todayReport.workersCount} פועלים</span>}
              {todayReport.hoursWorked && <span>⏱️ {todayReport.hoursWorked} שעות</span>}
            </div>
          </div>
        )}

        {/* Report form */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>דוח עבודה יומי</h2>

            {/* Status selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>סטטוס עבודה *</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                    style={{
                      padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: `2px solid ${form.status === opt.value ? opt.color : '#e2e8f0'}`,
                      background: form.status === opt.value ? opt.bg : 'transparent',
                      color: form.status === opt.value ? opt.color : '#64748b',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="תיאור העבודה שבוצעה *" required>
              <textarea
                value={form.workDescription}
                onChange={e => setForm(f => ({ ...f, workDescription: e.target.value }))}
                rows={3}
                placeholder="תאר את העבודה שבוצעה היום..."
                style={inputStyle}
              />
            </Field>

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="מספר פועלים">
                <input type="number" min="0" value={form.workersCount} onChange={e => setForm(f => ({ ...f, workersCount: e.target.value }))} placeholder="0" style={{ ...inputStyle, width: '100%' }} />
              </Field>
              <Field label="שעות עבודה">
                <input type="number" min="0" max="24" step="0.5" value={form.hoursWorked} onChange={e => setForm(f => ({ ...f, hoursWorked: e.target.value }))} placeholder="0" style={{ ...inputStyle, width: '100%' }} />
              </Field>
            </div>

            <Field label="חומרים שנוצלו">
              <input type="text" value={form.materials} onChange={e => setForm(f => ({ ...f, materials: e.target.value }))} placeholder='לדוגמה: 20 ק"ג צבע, 5 מ"ר גבס...' style={inputStyle} />
            </Field>

            <Field label="בעיות או חסמים">
              <textarea
                value={form.issues}
                onChange={e => setForm(f => ({ ...f, issues: e.target.value }))}
                rows={2}
                placeholder="האם היו בעיות? חסרים? מה עיכב את העבודה?"
                style={inputStyle}
              />
            </Field>

            <Field label="הערות נוספות">
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="הערות חופשיות..."
                style={inputStyle}
              />
            </Field>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>
                ביטול
              </button>
              <button type="submit" style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(79,184,224,0.4)' }}>
                הגש דוח
              </button>
            </div>
          </form>
        )}

        {/* History */}
        {myReports.length > 0 && (
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>דוחות קודמים</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myReports.map(report => {
                const s = STATUS_OPTIONS.find(o => o.value === report.status);
                const aInfo = APPROVAL_STATUS_INFO[report.approvalStatus] ?? APPROVAL_STATUS_INFO.draft;
                const signedRoles = new Set((report.signatures || []).map(sig => sig.role));
                return (
                  <div key={report.id} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: `1px solid ${aInfo.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                            {new Date(report.date).toLocaleDateString('he-IL', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          {s && (
                            <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
                              {s.label}
                            </span>
                          )}
                          <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: aInfo.bg, color: aInfo.color, border: `1px solid ${aInfo.border}` }}>
                            {aInfo.icon} {aInfo.label}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>{report.workDescription}</p>
                      </div>
                      <span style={{ fontSize: 11, color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                        {new Date(report.submittedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {/* Approval chain progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                      {APPROVAL_CHAIN.map((role, i) => {
                        const sig = (report.signatures || []).find(s => s.role === role);
                        const isSigned = !!sig;
                        return (
                          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <div title={sig ? `אושר ב-${new Date(sig.signedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : ''} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ fontSize: 14 }}>{isSigned ? '✅' : '○'}</span>
                              <span style={{ fontSize: 9, color: isSigned ? '#16a34a' : '#94a3b8', fontWeight: isSigned ? 700 : 400, whiteSpace: 'nowrap' }}>
                                {CHAIN_ROLE_LABELS[role]}
                              </span>
                            </div>
                            {i < APPROVAL_CHAIN.length - 1 && (
                              <span style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 14 }}>←</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
  fontSize: 14, color: '#1e293b', background: '#f8fafc', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical',
};

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}
