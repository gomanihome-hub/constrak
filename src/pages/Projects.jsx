import { useState, useRef, useEffect } from 'react';
import { useRoles } from '../context/RolesContext';
import { loadProjects, saveProjects, generateProjectId } from '../data/projectsStore';

const ORANGE      = '#f97316';
const ORANGE_DARK = '#ea580c';

const formatCurrency = (n) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

const STATUS_COLOR = {
  active:    { text: '#15803d', bg: '#dcfce7', border: '#86efac', label: 'פעיל' },
  planning:  { text: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', label: 'תכנון' },
  completed: { text: '#475569', bg: '#f1f5f9', border: '#cbd5e1', label: 'הושלם' },
  paused:    { text: '#92400e', bg: '#fef3c7', border: '#fde68a', label: 'מושהה' },
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Projects() {
  const { systemUsers, can } = useRoles();
  const [projects,   setProjects]   = useState(() => loadProjects());
  const [filter,     setFilter]     = useState('all');
  const [view,       setView]       = useState('cards');
  const [showModal,  setShowModal]  = useState(false);

  useEffect(() => {
    const reload = () => setProjects(loadProjects());
    window.addEventListener('constrak:projects', reload);
    return () => window.removeEventListener('constrak:projects', reload);
  }, []);

  function handleCreate(project) {
    const updated = [...projects, project];
    saveProjects(updated);
    setProjects(updated);
    setShowModal(false);
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  const managers = systemUsers.filter(u =>
    ['admin', 'project_manager', 'site_manager'].includes(u.role) && u.status === 'active'
  );

  return (
    <div className="p-6 space-y-5" dir="rtl">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'planning', 'completed', 'paused'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}>
              {{ all: 'הכל', active: 'פעיל', planning: 'תכנון', completed: 'הושלם', paused: 'מושהה' }[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('cards')}
            className={`p-2 rounded-lg text-sm ${view === 'cards' ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-500 border border-slate-200'}`}>
            ⊞
          </button>
          <button onClick={() => setView('list')}
            className={`p-2 rounded-lg text-sm ${view === 'list' ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-500 border border-slate-200'}`}>
            ☰
          </button>
          {can.viewAdminPanel && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
              + פרויקט חדש
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center">
          <p className="text-5xl mb-4">🏗️</p>
          <p className="text-lg font-semibold text-slate-700 mb-1">אין פרויקטים עדיין</p>
          <p className="text-sm text-slate-400 mb-6">
            {filter !== 'all'
              ? 'אין פרויקטים בסינון זה'
              : 'לחץ על "פרויקט חדש" כדי להתחיל'}
          </p>
          {filter === 'all' && can.viewAdminPanel && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
              + פרויקט חדש
            </button>
          )}
        </div>
      )}

      {/* Cards */}
      {view === 'cards' && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-4">
          {filtered.map(p => <ProjectCard key={p.id} p={p} />)}
        </div>
      )}

      {/* List */}
      {view === 'list' && filtered.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-right">
                {['שם פרויקט', 'מנהל', 'סטטוס', 'התקדמות', 'תאריך התחלה'].map(h => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => {
                const sc = STATUS_COLOR[p.status] ?? STATUS_COLOR.planning;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProjectAvatar p={p} size={32} />
                        <div>
                          <p className="font-medium text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.manager || '—'}</td>
                    <td className="px-4 py-3">
                      <span style={{ color: sc.text, background: sc.bg, border: `1px solid ${sc.border}` }}
                        className="text-xs px-2 py-0.5 rounded-full font-medium">
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-16">
                          <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${p.progress ?? 0}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-8">{p.progress ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.startDate || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New project modal */}
      {showModal && (
        <NewProjectModal
          managers={managers}
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─── Project avatar (logo or initials fallback) ───────────────────────────────
function ProjectAvatar({ p, size = 48 }) {
  if (p.logoUrl) {
    return (
      <img
        src={p.logoUrl}
        alt={p.name}
        style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }}
      />
    );
  }
  const initials = p.name ? p.name.trim().slice(0, 2) : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: 'linear-gradient(135deg, #fed7aa, #fdba74)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#9a3412',
    }}>
      {initials}
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({ p }) {
  const sc = STATUS_COLOR[p.status] ?? STATUS_COLOR.planning;
  const progress = p.progress ?? 0;
  const budget   = p.budget ?? 0;
  const spent    = p.spent  ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ProjectAvatar p={p} size={48} />
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-base leading-tight truncate">{p.name}</h3>
            {p.location && <p className="text-sm text-slate-500 mt-0.5 truncate">📍 {p.location}</p>}
          </div>
        </div>
        <span style={{ color: sc.text, background: sc.bg, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}
          className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0">
          {sc.label}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>התקדמות</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div className="bg-orange-400 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Budget */}
      {budget > 0 ? (
        <div className="mb-4 bg-slate-50 rounded-lg p-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>תקציב</span>
            <span>{budget > 0 ? Math.round((spent / budget) * 100) : 0}% נוצל</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span className="text-slate-700">{formatCurrency(spent)}</span>
            <span className="text-slate-400">/ {formatCurrency(budget)}</span>
          </div>
        </div>
      ) : (
        <div className="mb-4 bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400">תקציב טרם הוגדר</p>
        </div>
      )}

      {/* Tasks */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center bg-green-50 rounded-lg p-2">
          <p className="text-lg font-bold text-green-600">{p.tasks?.done ?? 0}</p>
          <p className="text-xs text-green-500">הושלמו</p>
        </div>
        <div className="text-center bg-blue-50 rounded-lg p-2">
          <p className="text-lg font-bold text-blue-600">{p.tasks?.inProgress ?? 0}</p>
          <p className="text-xs text-blue-500">בתהליך</p>
        </div>
        <div className="text-center bg-slate-50 rounded-lg p-2">
          <p className="text-lg font-bold text-slate-600">{p.tasks?.pending ?? 0}</p>
          <p className="text-xs text-slate-400">ממתינות</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-100 pt-3">
        <span>👷 {p.manager || 'לא הוקצה'}</span>
        <span>🗓️ {p.startDate || '—'}</span>
      </div>
    </div>
  );
}

// ─── New project modal ────────────────────────────────────────────────────────
function NewProjectModal({ managers, onSave, onClose }) {
  const [name,        setName]        = useState('');
  const [address,     setAddress]     = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [managerId,   setManagerId]   = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoData,    setLogoData]    = useState(null);
  const [errors,      setErrors]      = useState({});
  const [saving,      setSaving]      = useState(false);
  const fileRef = useRef();

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'גודל הקובץ לא יעלה על 2MB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setLogoPreview(ev.target.result);
      setLogoData(ev.target.result);
      setErrors(prev => ({ ...prev, logo: undefined }));
    };
    reader.readAsDataURL(file);
  }

  function validate() {
    const errs = {};
    if (!name.trim())    errs.name      = 'שדה חובה';
    if (!address.trim()) errs.address   = 'שדה חובה';
    if (!startDate)      errs.startDate = 'שדה חובה';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    const manager = managers.find(m => m.id === managerId);
    onSave({
      id:        generateProjectId(),
      name:      name.trim(),
      location:  address.trim(),
      startDate,
      endDate:   '',
      status:    'planning',
      progress:  0,
      budget:    0,
      spent:     0,
      manager:   manager?.displayName ?? '',
      managerId: managerId || null,
      workers:   0,
      tasks:     { total: 0, done: 0, inProgress: 0, pending: 0 },
      logoUrl:   logoData,
      createdAt: new Date().toISOString(),
    });
  }

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const inp = (hasError) => ({
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: 10, fontSize: 14, color: '#1e293b',
    outline: 'none', background: hasError ? '#fff5f5' : '#f8fafc',
    direction: 'rtl',
  });

  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' };
  const errStyle   = { fontSize: 11, color: '#dc2626', marginTop: 4 };

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir="rtl"
        style={{ background:'white', borderRadius:20, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', display:'flex', flexDirection:'column' }}
      >
        {/* Header */}
        <div style={{ padding:'24px 28px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>🏗️</span>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:'#1e293b' }}>פרויקט חדש</h2>
          </div>
          <button
            onClick={onClose}
            style={{ width:34, height:34, borderRadius:10, border:'1.5px solid #e2e8f0', background:'white', cursor:'pointer', fontSize:18, color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center' }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding:'20px 28px 28px', display:'flex', flexDirection:'column', gap:18 }}>

          {/* Logo upload */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'16px', background:'#f8fafc', borderRadius:14, border:'1.5px dashed #e2e8f0' }}>
            <div
              style={{ width:88, height:88, borderRadius:16, border:'2px solid #e2e8f0', overflow:'hidden', cursor:'pointer', background:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}
              onClick={() => fileRef.current?.click()}
            >
              {logoPreview
                ? <img src={logoPreview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:36 }}>🏗️</span>
              }
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{ fontSize:13, fontWeight:600, color:ORANGE_DARK, background:'#fff7ed', border:`1.5px solid #fed7aa`, borderRadius:8, padding:'6px 16px', cursor:'pointer' }}
            >
              {logoPreview ? 'החלף תמונה' : 'העלה לוגו / תמונה'}
            </button>
            <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>PNG, JPG עד 2MB</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display:'none' }} />
            {errors.logo && <p style={errStyle}>{errors.logo}</p>}
          </div>

          {/* Project name */}
          <div>
            <label style={labelStyle}>שם הפרויקט <span style={{ color:'#ef4444' }}>*</span></label>
            <input
              style={inp(errors.name)}
              value={name}
              onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
              placeholder="לדוגמה: מגדל רמת גן"
            />
            {errors.name && <p style={errStyle}>{errors.name}</p>}
          </div>

          {/* Address */}
          <div>
            <label style={labelStyle}>כתובת <span style={{ color:'#ef4444' }}>*</span></label>
            <input
              style={inp(errors.address)}
              value={address}
              onChange={e => { setAddress(e.target.value); setErrors(prev => ({ ...prev, address: undefined })); }}
              placeholder="עיר, רחוב ומספר"
            />
            {errors.address && <p style={errStyle}>{errors.address}</p>}
          </div>

          {/* Start date */}
          <div>
            <label style={labelStyle}>תאריך התחלה <span style={{ color:'#ef4444' }}>*</span></label>
            <input
              type="date"
              style={inp(errors.startDate)}
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setErrors(prev => ({ ...prev, startDate: undefined })); }}
            />
            {errors.startDate && <p style={errStyle}>{errors.startDate}</p>}
          </div>

          {/* Project manager */}
          <div>
            <label style={labelStyle}>מנהל פרויקט</label>
            <select
              style={{ ...inp(false), appearance:'none', cursor:'pointer' }}
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
            >
              <option value="">— בחר מנהל —</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
            {managers.length === 0 && (
              <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>הוסף מנהלי פרויקט בלוח הניהול כדי לבצע הקצאה</p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:4, borderTop:'1px solid #f1f5f9', marginTop:4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding:'10px 20px', borderRadius:10, border:'1.5px solid #e2e8f0', background:'white', color:'#64748b', fontSize:14, fontWeight:600, cursor:'pointer' }}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding:'10px 24px', borderRadius:10, border:'none', background: saving ? '#fdba74' : ORANGE, color:'white', fontSize:14, fontWeight:700, cursor: saving ? 'default' : 'pointer', transition:'background 0.15s' }}
            >
              {saving ? '...' : 'צור פרויקט'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
