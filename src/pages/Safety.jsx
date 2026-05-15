import { useState, useRef, useEffect, useCallback } from 'react';
import { useRoles } from '../context/RolesContext';
import {
  loadSafetyData, saveSafetyData, getActiveRules, getStaleWorkers,
  SAFETY_PROJECTS,
} from '../data/safetyStore';

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Safety() {
  const { currentSystemUser, currentRole, systemUsers } = useRoles();
  const uid         = currentSystemUser?.id ?? '';
  const managerName = currentSystemUser?.displayName ?? 'מנהל';

  const [data,          setData]          = useState(() => loadSafetyData());
  const [tab,           setTab]           = useState('history');
  const [wizardOpen,    setWizardOpen]    = useState(false);
  const [filterProject, setFilterProject] = useState('');
  const [filterWorker,  setFilterWorker]  = useState('');
  const [expandedId,    setExpandedId]    = useState(null);

  function refresh() { setData(loadSafetyData()); }

  const activeRules  = getActiveRules(data);
  const staleWorkers = getStaleWorkers(data);
  const briefings    = data.briefings ?? [];
  const thisMonth    = new Date().toISOString().slice(0, 7);

  const filteredBriefings = briefings
    .filter(b => !filterProject || b.projectId === filterProject)
    .filter(b => !filterWorker  || b.workerName?.includes(filterWorker))
    .sort((a, b) => b.signedAt.localeCompare(a.signedAt));

  const availableProjects = currentRole === 'admin'
    ? SAFETY_PROJECTS
    : SAFETY_PROJECTS.filter(p => (currentSystemUser?.assignedProjects ?? []).includes(p.id));

  const workerUsers = systemUsers.filter(u => u.role === 'worker' && u.status === 'active');

  function handleSaveBriefing(briefing) {
    const d = loadSafetyData();
    d.briefings = [...(d.briefings ?? []), briefing];
    saveSafetyData(d);
    refresh();
    setWizardOpen(false);
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 920, margin: '0 auto', direction: 'rtl' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🛡️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>תדרוך בטיחות</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>ניהול תדרוכי בטיחות ורשימת כללים לעובדי האתר</p>
          </div>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(79,184,224,0.35)' }}
        >
          + תדרוך חדש
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 26 }}>
        <StatCard icon="📋" label="סה״כ תדרוכים"   value={briefings.length}                                           color="#4fb8e0" />
        <StatCard icon="📅" label="החודש הנוכחי"    value={briefings.filter(b => b.signedAt?.startsWith(thisMonth)).length} color="#22c55e" />
        <StatCard icon="⚠️" label="מחייבים חידוש"   value={staleWorkers.length}                                        color={staleWorkers.length ? '#f59e0b' : '#94a3b8'} />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 22 }}>
        {[
          { id: 'history', label: 'היסטוריה תדרוכים' },
          ...(currentRole === 'admin' ? [{ id: 'rules', label: 'ניהול חוקי בטיחות' }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '9px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? '#4fb8e0' : '#64748b', borderBottom: `2px solid ${tab === t.id ? '#4fb8e0' : 'transparent'}`, marginBottom: -2, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── History tab ── */}
      {tab === 'history' && (
        <>
          {/* Re-briefing alert */}
          {staleWorkers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, marginBottom: 18 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: '#92400e' }}>כללי הבטיחות עודכנו — נדרש תדרוך מחדש</p>
                <p style={{ margin: 0, fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                  {staleWorkers.length} עובדים חתמו על גרסה קודמת:{' '}
                  {staleWorkers.slice(0, 4).map(b => b.workerName).join(', ')}
                  {staleWorkers.length > 4 ? ` ועוד ${staleWorkers.length - 4}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13, background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
              <option value="">כל הפרויקטים</option>
              {SAFETY_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={filterWorker} onChange={e => setFilterWorker(e.target.value)} placeholder="חפש שם עובד..." style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13, flex: 1, fontFamily: 'inherit', outline: 'none' }} />
          </div>

          {/* List */}
          {filteredBriefings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🛡️</div>
              <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#64748b' }}>{filterProject || filterWorker ? 'אין תדרוכים התואמים את הסינון' : 'אין תדרוכים עדיין'}</p>
              {!filterProject && !filterWorker && <p style={{ margin: 0, fontSize: 13 }}>לחץ "+ תדרוך חדש" כדי להתחיל</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredBriefings.map(b => (
                <BriefingCard key={b.id} briefing={b} expanded={expandedId === b.id} onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)} currentVersion={data.rulesVersion} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Rules tab (admin) ── */}
      {tab === 'rules' && currentRole === 'admin' && (
        <RulesManager data={data} onSave={refresh} />
      )}

      {/* ── Wizard overlay ── */}
      {wizardOpen && (
        <BriefingWizard
          safetyData={data}
          availableProjects={availableProjects}
          workerUsers={workerUsers}
          managerId={uid}
          managerName={managerName}
          onSave={handleSaveBriefing}
          onClose={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>{label}</p>
      </div>
    </div>
  );
}

// ── BriefingCard ──────────────────────────────────────────────────────────────
function BriefingCard({ briefing: b, expanded, onToggle, currentVersion }) {
  const projectName = SAFETY_PROJECTS.find(p => p.id === b.projectId)?.name ?? b.projectId;
  const isStale     = (b.rulesVersion ?? 0) < (currentVersion ?? 1);
  const signedDate  = new Date(b.signedAt).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${isStale ? '#fde68a' : '#f1f5f9'}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <button onClick={onToggle} style={{ width: '100%', padding: '14px 18px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'right' }}>
        {/* Worker avatar */}
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
          {(b.workerName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{b.workerName}</span>
            <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#f0f9ff', color: '#0369a1' }}>{projectName}</span>
            {isStale && <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#fffbeb', color: '#b45309' }}>⚠️ מחייב חידוש</span>}
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>מנהל: {b.managerName} · {signedDate} · {b.rulesSnapshot?.length ?? 0} כללים</p>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid #f8fafc', padding: '16px 18px', background: '#fafafa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
            {/* Rules snapshot */}
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#334155' }}>כללים שנחתמו:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(b.rulesSnapshot ?? []).map((r, i) => (
                  <div key={r.id ?? i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Signature */}
            {b.signature && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>חתימת עובד</p>
                <img src={b.signature} alt="חתימה" style={{ width: 180, height: 72, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', display: 'block' }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── BriefingWizard ────────────────────────────────────────────────────────────
const STEP_LABELS = ['פרטי התדרוך', 'רשימת בטיחות', 'חתימת עובד'];

function BriefingWizard({ safetyData, availableProjects, workerUsers, managerId, managerName, onSave, onClose }) {
  const [step,     setStep]     = useState(1);
  const [form,     setForm]     = useState({ projectId: availableProjects[0]?.id ?? '', workerId: '', workerName: '' });
  const [checked,  setChecked]  = useState(new Set());
  const [signature, setSig]     = useState(null);

  const activeRules = getActiveRules(safetyData);

  const projectWorkers = workerUsers.filter(u =>
    !form.projectId || (u.assignedProjects ?? []).includes(form.projectId)
  );

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleWorkerSelect(e) {
    const u = workerUsers.find(u => u.id === e.target.value);
    setField('workerId', e.target.value);
    setField('workerName', u?.displayName ?? '');
  }

  function toggleRule(id) {
    setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function checkAll() { setChecked(new Set(activeRules.map(r => r.id))); }
  const allChecked = activeRules.every(r => checked.has(r.id));

  function canGoNext() {
    if (step === 1) return form.projectId && form.workerId;
    if (step === 2) return allChecked;
    if (step === 3) return !!signature;
    return false;
  }

  function handleSave() {
    const briefing = {
      id:            `brief-${Date.now()}`,
      projectId:     form.projectId,
      workerId:      form.workerId,
      workerName:    form.workerName,
      managerId,
      managerName,
      rulesSnapshot: activeRules.map(r => ({ id: r.id, text: r.text })),
      rulesVersion:  safetyData.rulesVersion ?? 1,
      signature,
      signedAt:      new Date().toISOString(),
    };
    onSave(briefing);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>

        {/* Wizard header */}
        <div style={{ padding: '18px 24px 14px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🛡️</span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'white' }}>תדרוך בטיחות חדש</h2>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
          </div>
          {/* Progress steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const done    = step > n;
              const current = step === n;
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#22c55e' : current ? '#f3ce1f' : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: done ? 14 : 12, fontWeight: 700, color: done || current ? '#0f172a' : '#64748b', transition: 'all 0.2s' }}>
                      {done ? '✓' : n}
                    </div>
                    <span style={{ fontSize: 10, color: current ? '#f3ce1f' : done ? '#86efac' : '#475569', whiteSpace: 'nowrap', fontWeight: current ? 700 : 400 }}>{label}</span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: done ? '#22c55e' : 'rgba(255,255,255,0.1)', margin: '0 6px', marginBottom: 18, transition: 'background 0.2s' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={LS}>פרויקט *</label>
                <select value={form.projectId} onChange={e => { setField('projectId', e.target.value); setField('workerId', ''); setField('workerName', ''); }} style={SS}>
                  <option value="">בחר פרויקט</option>
                  {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={LS}>עובד *</label>
                <select value={form.workerId} onChange={handleWorkerSelect} style={SS} disabled={!form.projectId}>
                  <option value="">בחר עובד</option>
                  {(projectWorkers.length > 0 ? projectWorkers : workerUsers).map(u => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
                {form.projectId && projectWorkers.length === 0 && (
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: '#f59e0b' }}>אין עובדים מוקצים לפרויקט זה — מוצגים כל העובדים</p>
                )}
              </div>
              <div>
                <label style={LS}>שם הממונה</label>
                <input value={managerName} readOnly style={{ ...SS, background: '#f8fafc', color: '#64748b', cursor: 'default' }} />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>רשימת כללי בטיחות</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>סמן כל כלל לאחר שהסברת אותו לעובד {form.workerName}</p>
                </div>
                {!allChecked && (
                  <button onClick={checkAll} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#4fb8e0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>סמן הכל</button>
                )}
                {allChecked && <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 700 }}>✓ הכל נסמן</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeRules.map((rule, i) => {
                  const isChecked = checked.has(rule.id);
                  return (
                    <button
                      key={rule.id}
                      onClick={() => toggleRule(rule.id)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 15px', borderRadius: 12, border: `1.5px solid ${isChecked ? '#bbf7d0' : '#e2e8f0'}`, background: isChecked ? '#f0fdf4' : 'white', cursor: 'pointer', textAlign: 'right', transition: 'all 0.12s' }}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isChecked ? '#22c55e' : '#cbd5e1'}`, background: isChecked ? '#22c55e' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, color: 'white', fontSize: 13, fontWeight: 700, transition: 'all 0.12s' }}>
                        {isChecked ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>כלל {i + 1}</span>
                        <p style={{ margin: '2px 0 0', fontSize: 14, color: isChecked ? '#15803d' : '#334155', lineHeight: 1.5 }}>{rule.text}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: '14px 0 0', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                {checked.size} / {activeRules.length} כללים נסמנו
              </p>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 22 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 26 }}>✍️</div>
                <h3 style={{ margin: '0 0 5px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>חתימת עובד</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  {form.workerName} — אנא חתום בתיבה שלהלן לאישור קבלת תדרוך הבטיחות
                </p>
              </div>
              <SignaturePad onConfirm={setSig} confirmed={signature} />
              {signature && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#22c55e', fontSize: 18 }}>✓</span>
                  <p style={{ margin: 0, fontSize: 13, color: '#15803d', fontWeight: 600 }}>החתימה נשמרה — ניתן לשמור את התדרוך</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'white' }}>
          <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {step === 1 ? 'ביטול' : '→ חזור'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[1, 2, 3].map(n => <div key={n} style={{ width: 7, height: 7, borderRadius: '50%', background: step === n ? '#4fb8e0' : '#e2e8f0', transition: 'background 0.2s' }} />)}
          </div>
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canGoNext()} style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: canGoNext() ? 'linear-gradient(135deg, #4fb8e0, #80cded)' : '#e2e8f0', color: canGoNext() ? 'white' : '#94a3b8', fontSize: 13, fontWeight: 700, cursor: canGoNext() ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              הבא ←
            </button>
          ) : (
            <button onClick={handleSave} disabled={!signature} style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: signature ? 'linear-gradient(135deg, #f3ce1f, #e6b800)' : '#e2e8f0', color: signature ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: 700, cursor: signature ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              💾 שמור תדרוך
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SignaturePad ──────────────────────────────────────────────────────────────
function SignaturePad({ onConfirm, confirmed }) {
  const canvasRef  = useRef(null);
  const [drawing,  setDrawing]  = useState(false);
  const [hasLines, setHasLines] = useState(false);

  useEffect(() => {
    // Re-draw confirmed signature if going back/forward
    if (confirmed && canvasRef.current) {
      const img = new Image();
      img.onload = () => canvasRef.current?.getContext('2d')?.drawImage(img, 0, 0);
      img.src = confirmed;
      setHasLines(true);
    }
  }, []); // eslint-disable-line

  function coords(e) {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const src    = e.touches?.[0] ?? e;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  }

  function onStart(e) {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = coords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    setDrawing(true);
    setHasLines(true);
  }

  function onMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = coords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function onEnd() { setDrawing(false); }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasLines(false);
    onConfirm(null);
  }

  function confirm() {
    const canvas = canvasRef.current;
    // Export with white background
    const off = document.createElement('canvas');
    off.width  = canvas.width;
    off.height = canvas.height;
    const ctx  = off.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, off.width, off.height);
    ctx.drawImage(canvas, 0, 0);
    onConfirm(off.toDataURL('image/png'));
  }

  return (
    <div style={{ direction: 'ltr' }}>
      <canvas
        ref={canvasRef}
        width={580}
        height={180}
        style={{ width: '100%', maxWidth: 580, height: 180, border: `2px dashed ${hasLines ? '#4fb8e0' : '#cbd5e1'}`, borderRadius: 14, cursor: 'crosshair', touchAction: 'none', background: 'white', display: 'block', transition: 'border-color 0.2s' }}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end', direction: 'rtl' }}>
        <button onClick={clear} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>נקה</button>
        <button onClick={confirm} disabled={!hasLines} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: hasLines ? 'linear-gradient(135deg, #4fb8e0, #80cded)' : '#e2e8f0', color: hasLines ? 'white' : '#94a3b8', fontSize: 13, fontWeight: 600, cursor: hasLines ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.15s' }}>אשר חתימה ✓</button>
      </div>
    </div>
  );
}

// ── RulesManager ──────────────────────────────────────────────────────────────
function RulesManager({ data, onSave }) {
  const [rules,   setRules]   = useState(() => JSON.parse(JSON.stringify(data.rules ?? [])));
  const [newText, setNewText] = useState('');
  const [dirty,   setDirty]   = useState(false);
  const [toast,   setToast]   = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function markDirty(fn) { setRules(fn); setDirty(true); }

  function editText(id, text)     { markDirty(rs => rs.map(r => r.id === id ? { ...r, text } : r)); }
  function toggleActive(id)       { markDirty(rs => rs.map(r => r.id === id ? { ...r, active: !r.active } : r)); }
  function deleteRule(id)         { markDirty(rs => rs.filter(r => r.id !== id)); }

  function moveRule(id, dir) {
    markDirty(rs => {
      const sorted = [...rs].sort((a, b) => a.order - b.order);
      const idx    = sorted.findIndex(r => r.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= sorted.length) return rs;
      [sorted[idx].order, sorted[newIdx].order] = [sorted[newIdx].order, sorted[idx].order];
      return sorted;
    });
  }

  function addRule() {
    if (!newText.trim()) return;
    const maxOrder = Math.max(0, ...rules.map(r => r.order));
    markDirty(rs => [...rs, { id: `sr-${Date.now()}`, text: newText.trim(), order: maxOrder + 1, active: true }]);
    setNewText('');
  }

  function saveChanges() {
    const d = loadSafetyData();
    // Detect meaningful changes (text, active status, order)
    const oldSig = JSON.stringify((d.rules ?? []).map(r => ({ id: r.id, text: r.text, active: r.active })).sort((a, b) => a.id.localeCompare(b.id)));
    const newSig = JSON.stringify(rules.map(r => ({ id: r.id, text: r.text, active: r.active })).sort((a, b) => a.id.localeCompare(b.id)));
    d.rules = rules;
    if (oldSig !== newSig) {
      d.rulesVersion = (d.rulesVersion ?? 1) + 1;
      showToast(`✓ נשמר — גרסת הכללים עודכנה ל-${d.rulesVersion}. עובדים שתודרכו יצטרכו לחתום מחדש.`);
    } else {
      showToast('✓ השינויים נשמרו');
    }
    saveSafetyData(d);
    setDirty(false);
    onSave();
  }

  const sorted = [...rules].sort((a, b) => a.order - b.order);

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: 'white', padding: '10px 22px', borderRadius: 10, zIndex: 9999, fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.35)', maxWidth: '80vw', textAlign: 'center' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>כללי בטיחות ({rules.filter(r => r.active).length} פעילים)</h3>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>גרסה נוכחית: {data.rulesVersion ?? 1} · שינוי כלל יגרום לבקשת חתימה מחדש</p>
        </div>
        {dirty && (
          <button onClick={saveChanges} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #f3ce1f, #e6b800)', color: '#0f172a', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            💾 שמור שינויים
          </button>
        )}
      </div>

      {/* Rules list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {sorted.map((rule, i) => (
          <div key={rule.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: rule.active ? 'white' : '#f8fafc', borderRadius: 12, border: `1px solid ${rule.active ? '#e2e8f0' : '#f1f5f9'}`, opacity: rule.active ? 1 : 0.6 }}>
            {/* Order arrows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
              <button onClick={() => moveRule(rule.id, -1)} disabled={i === 0}           style={ArrowBtn}>↑</button>
              <button onClick={() => moveRule(rule.id,  1)} disabled={i === sorted.length - 1} style={ArrowBtn}>↓</button>
            </div>
            {/* Rule number */}
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: rule.active ? '#f0f9ff' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', flexShrink: 0, marginTop: 3 }}>{i + 1}</div>
            {/* Text */}
            <textarea
              value={rule.text}
              onChange={e => editText(rule.id, e.target.value)}
              rows={2}
              style={{ flex: 1, border: '1px solid transparent', borderRadius: 8, padding: '3px 6px', fontSize: 13, color: '#334155', background: 'transparent', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none', cursor: 'text' }}
              onFocus={e => e.target.style.border = '1px solid #4fb8e0'}
              onBlur={e => e.target.style.border = '1px solid transparent'}
            />
            {/* Toggle active */}
            <button onClick={() => toggleActive(rule.id)} title={rule.active ? 'השבת כלל' : 'הפעל כלל'} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: rule.active ? '#dcfce7' : '#f1f5f9', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {rule.active ? '✅' : '⬜'}
            </button>
            {/* Delete */}
            <button onClick={() => deleteRule(rule.id)} title="מחק כלל" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#fef2f2', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#dc2626' }}>
              🗑️
            </button>
          </div>
        ))}
      </div>

      {/* Add new rule */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 16px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0' }}>
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="הקלד כלל בטיחות חדש..."
          rows={2}
          style={{ flex: 1, padding: '8px 11px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5 }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addRule(); } }}
        />
        <button onClick={addRule} disabled={!newText.trim()} style={{ alignSelf: 'flex-end', padding: '9px 18px', borderRadius: 9, border: 'none', background: newText.trim() ? 'linear-gradient(135deg, #4fb8e0, #80cded)' : '#e2e8f0', color: newText.trim() ? 'white' : '#94a3b8', fontSize: 13, fontWeight: 700, cursor: newText.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          + הוסף
        </button>
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const LS = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 };
const SS = { width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 14, background: 'white', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' };
const ArrowBtn = { width: 20, height: 20, padding: 0, border: '1px solid #e2e8f0', borderRadius: 5, background: 'white', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' };
