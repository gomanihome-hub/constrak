import { useState, useEffect, useRef } from 'react';
import { projects, tasks, workers } from '../data/mockData';
import { useRoles } from '../context/RolesContext';
import {
  getPendingApprovalsForRole, signReport,
  APPROVAL_CHAIN, APPROVAL_STATUS_INFO, CHAIN_ROLE_LABELS, getNextApproverRole,
} from '../data/reportApprovalStore';

const formatCurrency = (n) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

const statusColors  = { active: 'bg-green-100 text-green-700', planning: 'bg-blue-100 text-blue-700', completed: 'bg-slate-100 text-slate-600', paused: 'bg-yellow-100 text-yellow-700' };
const statusLabels  = { active: 'פעיל', planning: 'תכנון', completed: 'הושלם', paused: 'מושהה' };
const priorityColors = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };
const priorityLabels = { high: 'גבוה', medium: 'בינוני', low: 'נמוך' };
const taskStatusColors = { done: 'bg-green-100 text-green-700', inProgress: 'bg-blue-100 text-blue-700', pending: 'bg-slate-100 text-slate-600' };
const taskStatusLabels = { done: 'הושלם', inProgress: 'בתהליך', pending: 'ממתין' };

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-3xl p-2 rounded-lg ${color}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { currentRole, currentSystemUser } = useRoles();
  const [pendingReports, setPendingReports] = useState([]);
  const [approveModal, setApproveModal]     = useState(null);
  const [signNotes, setSignNotes]           = useState('');
  const [toast, setToast]                   = useState('');

  useEffect(() => {
    function refresh() { setPendingReports(getPendingApprovalsForRole(currentRole)); }
    refresh();
    window.addEventListener('constrak:approvals', refresh);
    return () => window.removeEventListener('constrak:approvals', refresh);
  }, [currentRole]);

  function handleSign() {
    if (!approveModal || !currentSystemUser) return;
    signReport(approveModal.id, currentSystemUser.id, currentSystemUser.displayName, currentRole, signNotes);
    setApproveModal(null);
    setSignNotes('');
    showToast('הדוח אושר בהצלחה ✓');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const totalWorkers   = workers.filter((w) => w.status === 'active').length;
  const openTasks      = tasks.filter((t) => t.status !== 'done').length;
  const totalBudget    = projects.reduce((s, p) => s + p.budget, 0);

  return (
    <div className="p-6 space-y-6" style={{ position: 'relative' }}>

      {/* Toast */}
      <div style={{
        position: 'fixed', top: 80, left: '50%', transform: `translateX(-50%) translateY(${toast ? 0 : -16}px)`,
        opacity: toast ? 1 : 0, transition: 'all 0.3s', background: '#064e3b', color: 'white',
        borderRadius: 12, padding: '12px 20px', fontSize: 14, fontWeight: 600,
        zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', pointerEvents: 'none',
      }}>
        {toast}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🏗️" label="פרויקטים פעילים" value={activeProjects} sub={`מתוך ${projects.length} סה"כ`} color="bg-orange-50" />
        <StatCard icon="👷" label="עובדים פעילים"   value={totalWorkers}   sub="במגרשי העבודה"    color="bg-blue-50" />
        <StatCard icon="✅" label="משימות פתוחות"   value={openTasks}      sub="דורשות טיפול"     color="bg-yellow-50" />
        <StatCard icon="💰" label="סך תקציב"        value={formatCurrency(totalBudget)} sub="בכל הפרויקטים" color="bg-green-50" />
      </div>

      {/* Pending approvals banner */}
      {pendingReports.length > 0 && (
        <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #fde68a' }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#92400e', flex: 1 }}>
              ממתין לאישור שלי
            </h2>
            <span style={{ background: '#d97706', color: 'white', borderRadius: 99, padding: '2px 10px', fontSize: 13, fontWeight: 800 }}>
              {pendingReports.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {pendingReports.map((report, ri) => (
              <div key={report.id} style={{ padding: '14px 20px', borderBottom: ri < pendingReports.length - 1 ? '1px solid #fef3c7' : 'none', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Report info */}
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{report.displayName}</span>
                    {report.trade && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{report.trade}</span>
                    )}
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {new Date(report.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                    {report.workDescription}
                  </p>
                </div>

                {/* Chain progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {APPROVAL_CHAIN.map((role, i) => {
                    const sig = (report.signatures || []).find(s => s.role === role);
                    const isCurrent = !sig && getNextApproverRole(report) === role;
                    return (
                      <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontSize: 13 }}>{sig ? '✅' : isCurrent ? '⏳' : '○'}</span>
                          <span style={{ fontSize: 9, color: sig ? '#16a34a' : isCurrent ? '#d97706' : '#cbd5e1', fontWeight: sig || isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>
                            {CHAIN_ROLE_LABELS[role]}
                          </span>
                        </div>
                        {i < APPROVAL_CHAIN.length - 1 && (
                          <span style={{ color: '#fde68a', fontSize: 11, marginBottom: 14 }}>←</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Sign button */}
                <button
                  onClick={() => { setApproveModal(report); setSignNotes(''); }}
                  style={{ flexShrink: 0, padding: '9px 18px', background: '#d97706', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}
                >
                  ✍️ צפה ואשר
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects overview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">סטטוס פרויקטים</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {projects.map((p) => (
            <div key={p.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status]}`}>
                    {statusLabels[p.status]}
                  </span>
                </div>
                <span className="text-sm text-slate-500">{p.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-orange-400 h-2 rounded-full transition-all" style={{ width: `${p.progress}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                <span>📍 {p.location}</span>
                <span>👷 {p.workers} עובדים</span>
                <span>💰 {formatCurrency(p.spent)} / {formatCurrency(p.budget)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent tasks */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">משימות אחרונות</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {tasks.slice(0, 5).map((t) => (
            <div key={t.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{t.title}</p>
                <p className="text-xs text-slate-400">{t.project} · {t.assignee}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${priorityColors[t.priority]}`}>
                {priorityLabels[t.priority]}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${taskStatusColors[t.status]}`}>
                {taskStatusLabels[t.status]}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">{t.due}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Approval modal */}
      {approveModal && (
        <ApproveModal
          report={approveModal}
          currentRole={currentRole}
          notes={signNotes}
          onNotesChange={setSignNotes}
          onSign={handleSign}
          onClose={() => setApproveModal(null)}
        />
      )}
    </div>
  );
}

// ─── Approval modal ───────────────────────────────────────────────────────────
function ApproveModal({ report, currentRole, notes, onNotesChange, onSign, onClose }) {
  const overlayRef = useRef(null);

  const STATUS_OPTIONS = [
    { value: 'completed', label: 'הושלם',  color: '#22c55e' },
    { value: 'in_progress', label: 'בביצוע', color: '#f59e0b' },
    { value: 'partial',   label: 'חלקי',   color: '#f97316' },
    { value: 'blocked',   label: 'חסום',   color: '#ef4444' },
  ];
  const workStatus = STATUS_OPTIONS.find(o => o.value === report.status);

  return (
    <div
      ref={overlayRef}
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(2px)' }}
    >
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>אישור דוח עבודה</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: 8, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Submitter info */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{report.displayName}</span>
                {report.trade && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 99, background: '#e0f7ff', color: '#0369a1', fontWeight: 600 }}>{report.trade}</span>}
              </div>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {new Date(report.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {workStatus && (
              <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: workStatus.color + '20', color: workStatus.color }}>
                {workStatus.label}
              </span>
            )}
          </div>

          {/* Report details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DetailRow label="תיאור עבודה" value={report.workDescription} multiline />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {report.workersCount && <DetailRow label="מספר פועלים" value={`${report.workersCount} פועלים`} />}
              {report.hoursWorked  && <DetailRow label="שעות עבודה"  value={`${report.hoursWorked} שעות`} />}
            </div>
            {report.materials && <DetailRow label="חומרים" value={report.materials} />}
            {report.issues    && <DetailRow label="בעיות / חסמים" value={report.issues} />}
            {report.notes     && <DetailRow label="הערות" value={report.notes} />}
          </div>

          {/* Approval chain */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#374151' }}>שרשרת אישור</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {APPROVAL_CHAIN.map(role => {
                const sig = (report.signatures || []).find(s => s.role === role);
                const isCurrent = !sig && getNextApproverRole(report) === role;
                return (
                  <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${sig ? '#86efac' : isCurrent ? '#fde68a' : '#f1f5f9'}`, background: sig ? '#f0fdf4' : isCurrent ? '#fffbeb' : '#f8fafc' }}>
                    <span style={{ fontSize: 18 }}>{sig ? '✅' : isCurrent ? '⏳' : '○'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: sig ? '#15803d' : isCurrent ? '#92400e' : '#94a3b8' }}>
                          {CHAIN_ROLE_LABELS[role]}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: 11, background: '#fde68a', color: '#92400e', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
                            תורך לאשר
                          </span>
                        )}
                      </div>
                      {sig && (
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                          {sig.displayName} · {new Date(sig.signedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} {new Date(sig.signedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          {sig.notes && ` · "${sig.notes}"`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>הערות לאישור (אופציונלי)</label>
            <textarea
              value={notes}
              onChange={e => onNotesChange(e.target.value)}
              rows={2}
              placeholder="הוסף הערות אם יש..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', direction: 'rtl' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
            >
              ביטול
            </button>
            <button
              onClick={onSign}
              style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #d97706, #b45309)', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(217,119,6,0.4)' }}
            >
              ✅ אשר ועבר לשלב הבא
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, multiline }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', border: '1px solid #f1f5f9' }}>
      <p style={{ margin: '0 0 3px', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, color: '#1e293b', lineHeight: multiline ? 1.5 : undefined }}>{value}</p>
    </div>
  );
}
