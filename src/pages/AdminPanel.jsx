import { useState, useMemo } from 'react';
import { useRoles, ROLES, PERMISSIONS } from '../context/RolesContext';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'users', label: 'משתמשים', icon: '👥' },
  { id: 'permissions', label: 'הרשאות', icon: '🔐' },
];

const PROJECTS_MOCK = [
  { id: '1', name: 'מגדל רמת גן' },
  { id: '2', name: 'שכונת הדר' },
  { id: '3', name: 'פרויקט חיפה' },
  { id: '4', name: 'מרכז לוד' },
];

const SITES_MOCK = [
  { id: '1', name: 'אתר מגדל רמת גן' },
  { id: '2', name: 'אתר שכונת הדר' },
  { id: '3', name: 'אתר חיפה' },
];

export default function AdminPanel() {
  const { systemUsers, createSystemUser, updateSystemUser, deleteSystemUser, toggleStatus, currentSystemUser } = useRoles();
  const { addAuthUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalUser, setModalUser] = useState(null); // null | 'new' | user object
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  function showToast(msg, isError) {
    setToast({ msg, isError });
    setTimeout(() => setToast(''), 3000);
  }

  const filtered = useMemo(() => {
    return systemUsers.filter(u => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [systemUsers, search, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts = {};
    Object.keys(ROLES).forEach(r => { counts[r] = 0; });
    systemUsers.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });
    return counts;
  }, [systemUsers]);

  function handleDelete(user) {
    if (user.id === currentSystemUser?.id) { showToast('לא ניתן למחוק את המשתמש הנוכחי', true); return; }
    setConfirmDelete(user);
  }

  function confirmDeleteUser() {
    deleteSystemUser(confirmDelete.id);
    setConfirmDelete(null);
    showToast('המשתמש נמחק');
  }

  return (
    <div style={{ padding: '24px 28px', minHeight: '100%', background: '#f8fafc' }} dir="rtl">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.isError ? '#fef2f2' : '#1e293b', color: toast.isError ? '#dc2626' : 'white', border: toast.isError ? '1px solid #fecaca' : 'none', padding: '10px 22px', borderRadius: 10, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>מחיקת משתמש</p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', textAlign: 'center' }}>האם למחוק את <strong>{confirmDelete.displayName}</strong>? פעולה זו אינה הפיכה.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'transparent', color: '#374151', fontSize: 14, cursor: 'pointer' }}>ביטול</button>
              <button onClick={confirmDeleteUser} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {/* User modal */}
      {modalUser !== null && (
        <UserModal
          user={modalUser === 'new' ? null : modalUser}
          onClose={() => setModalUser(null)}
          onSave={(data) => {
            if (modalUser === 'new') {
              try {
                const uid = addAuthUser(data.email, data.password, data.displayName);
                createSystemUser({ ...data, id: uid });
                showToast('המשתמש נוצר בהצלחה ✓');
              } catch (err) {
                showToast(err.code === 'auth/email-already-in-use' ? 'אימייל זה כבר קיים במערכת' : 'שגיאה ביצירת משתמש', true);
                return;
              }
            } else {
              updateSystemUser(modalUser.id, data);
              showToast('המשתמש עודכן בהצלחה ✓');
            }
            setModalUser(null);
          }}
        />
      )}

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#1e293b' }}>ניהול משתמשים</h1>
        <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>ניהול הרשאות גישה לכל חברי הצוות</p>
      </div>

      {/* Role stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {Object.values(ROLES).map(role => (
          <div key={role.id} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: `1px solid ${role.border}`, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onClick={() => setRoleFilter(roleFilter === role.id ? 'all' : role.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{role.icon}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: role.color }}>{roleCounts[role.id] ?? 0}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: role.color }}>{role.label}</p>
          </div>
        ))}
        <div style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>👥</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{systemUsers.length}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#64748b' }}>סה"כ משתמשים</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#1e293b' : '#64748b',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם / אימייל..."
              style={{ flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}
            />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, background: 'white', cursor: 'pointer', outline: 'none' }}
            >
              <option value="all">כל התפקידים</option>
              {Object.values(ROLES).map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
            </select>
            <button
              onClick={() => setModalUser('new')}
              style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(79,184,224,0.4)' }}
            >
              + משתמש חדש
            </button>
          </div>

          {/* Users table */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['משתמש', 'תפקיד', 'פרויקטים', 'סטטוס', 'פעולות'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#94a3b8', textAlign: 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: 14 }}>
                      לא נמצאו משתמשים
                    </td>
                  </tr>
                )}
                {filtered.map(u => {
                  const role = ROLES[u.role];
                  const isMe = u.id === currentSystemUser?.id;
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: isMe ? '#fafeff' : 'transparent', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (!isMe) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* User info */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${role?.color ?? '#64748b'}88, ${role?.color ?? '#64748b'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {u.displayName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                              {u.displayName} {isMe && <span style={{ fontSize: 11, color: '#4fb8e0', fontWeight: 400 }}>(אתה)</span>}
                            </p>
                            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td style={{ padding: '12px 16px' }}>
                        {role && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: role.bg, color: role.color, border: `1px solid ${role.border}` }}>
                            {role.icon} {role.label}
                          </span>
                        )}
                      </td>
                      {/* Projects */}
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                        {u.role === 'admin' ? (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>כל הפרויקטים</span>
                        ) : u.assignedProjects?.length ? (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {u.assignedProjects.slice(0, 2).map(pid => {
                              const proj = PROJECTS_MOCK.find(p => p.id === pid);
                              return proj ? (
                                <span key={pid} style={{ padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', fontSize: 11, color: '#475569' }}>
                                  {proj.name}
                                </span>
                              ) : null;
                            })}
                            {u.assignedProjects.length > 2 && <span style={{ fontSize: 11, color: '#94a3b8' }}>+{u.assignedProjects.length - 2}</span>}
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => toggleStatus(u.id)}
                          style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                            background: u.status === 'active' ? '#dcfce7' : '#fee2e2',
                            color: u.status === 'active' ? '#15803d' : '#dc2626',
                          }}
                        >
                          {u.status === 'active' ? '● פעיל' : '● לא פעיל'}
                        </button>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <ActionBtn icon="✏️" title="ערוך" onClick={() => setModalUser(u)} />
                          {!isMe && <ActionBtn icon="🗑️" title="מחק" danger onClick={() => handleDelete(u)} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'permissions' && <PermissionsTab />}
    </div>
  );
}

function ActionBtn({ icon, title, onClick, danger }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0', background: hovered ? (danger ? '#fef2f2' : '#f8fafc') : 'transparent', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
    >
      {icon}
    </button>
  );
}

function PermissionsTab() {
  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <th style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#374151', textAlign: 'right', minWidth: 160 }}>הרשאה</th>
            {Object.values(ROLES).map(r => (
              <th key={r.id} style={{ padding: '14px 12px', fontSize: 12, fontWeight: 700, color: r.color, textAlign: 'center', minWidth: 90 }}>
                <div>{r.icon}</div>
                <div style={{ marginTop: 2 }}>{r.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSIONS.map((perm, i) => (
            <tr key={perm.key} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'transparent' : '#fafafa' }}>
              <td style={{ padding: '12px 18px', fontSize: 14, fontWeight: 600, color: '#374151' }}>{perm.label}</td>
              {[perm.admin, perm.pm, perm.sm, perm.sub, perm.worker].map((val, j) => (
                <td key={j} style={{ padding: '12px 12px', textAlign: 'center' }}>
                  <PermCell value={val} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PermCell({ value }) {
  if (value === true)  return <span style={{ fontSize: 16, color: '#22c55e' }}>✓</span>;
  if (value === false) return <span style={{ fontSize: 16, color: '#e2e8f0' }}>—</span>;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#475569' }}>{value}</span>;
}

// ─── User create/edit modal ────────────────────────────────────────────────────
function UserModal({ user, onClose, onSave }) {
  const isNew = !user;
  const [form, setForm] = useState({
    displayName: user?.displayName ?? '',
    email:       user?.email ?? '',
    phone:       user?.phone ?? '',
    password:    '',
    role:        user?.role ?? 'worker',
    assignedProjects: user?.assignedProjects ?? [],
    assignedSite: user?.assignedSite ?? null,
    trade:       user?.trade ?? '',
  });
  const [errors, setErrors] = useState({});

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  function validate() {
    const e = {};
    if (!form.displayName.trim()) e.displayName = 'שם חובה';
    if (!form.email.trim()) e.email = 'אימייל חובה';
    if (isNew && !form.password) e.password = 'סיסמה חובה';
    if (isNew && form.password && form.password.length < 6) e.password = 'סיסמה חייבת לפחות 6 תווים';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const { password, ...rest } = form;
    if (isNew) onSave({ ...rest, password });
    else onSave(rest);
  }

  function toggleProject(pid) {
    setForm(f => ({
      ...f,
      assignedProjects: f.assignedProjects.includes(pid)
        ? f.assignedProjects.filter(x => x !== pid)
        : [...f.assignedProjects, pid],
    }));
  }

  const selectedRole = ROLES[form.role];
  const needsProjects = ['project_manager', 'site_manager', 'subcontractor'].includes(form.role);
  const needsSite = ['site_manager', 'subcontractor'].includes(form.role);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            {isNew ? '+ משתמש חדש' : `עריכת ${user.displayName}`}
          </h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Role selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>תפקיד *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {Object.values(ROLES).map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => set('role', role.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'right',
                    border: `2px solid ${form.role === role.id ? role.color : '#e2e8f0'}`,
                    background: form.role === role.id ? role.bg : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{role.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: form.role === role.id ? role.color : '#374151' }}>{role.label}</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>{role.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Basic fields */}
          <MField label="שם מלא" error={errors.displayName}>
            <input value={form.displayName} onChange={e => set('displayName', e.target.value)} style={inputStyle(!!errors.displayName)} placeholder="ישראל ישראלי" />
          </MField>

          <MField label="אימייל" error={errors.email}>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} disabled={!isNew} style={{ ...inputStyle(!!errors.email), opacity: isNew ? 1 : 0.6 }} placeholder="user@example.com" />
          </MField>

          <div style={{ display: 'flex', gap: 12 }}>
            {isNew && (
              <MField label="סיסמה" error={errors.password} style={{ flex: 1 }}>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} style={inputStyle(!!errors.password)} placeholder="לפחות 6 תווים" />
              </MField>
            )}
            <MField label="טלפון" style={{ flex: 1 }}>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle(false)} placeholder="050-0000000" />
            </MField>
          </div>

          {/* Trade (for subcontractor) */}
          {form.role === 'subcontractor' && (
            <MField label="מקצוע / תחום">
              <input value={form.trade} onChange={e => set('trade', e.target.value)} style={inputStyle(false)} placeholder="לדוגמה: צביעה, חשמל, אינסטלציה..." />
            </MField>
          )}

          {/* Project assignment */}
          {needsProjects && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>פרויקטים מוקצים</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PROJECTS_MOCK.map(proj => (
                  <label key={proj.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', background: form.assignedProjects.includes(proj.id) ? '#eff6ff' : 'transparent', transition: 'all 0.1s' }}>
                    <input
                      type="checkbox"
                      checked={form.assignedProjects.includes(proj.id)}
                      onChange={() => toggleProject(proj.id)}
                      style={{ accentColor: '#3b82f6', width: 16, height: 16 }}
                    />
                    <span style={{ fontSize: 14, color: '#374151' }}>🏗️ {proj.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Site assignment */}
          {needsSite && (
            <MField label="אתר עבודה">
              <select value={form.assignedSite ?? ''} onChange={e => set('assignedSite', e.target.value || null)} style={{ ...inputStyle(false), appearance: 'auto' }}>
                <option value="">— ללא אתר —</option>
                {SITES_MOCK.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </MField>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'transparent', color: '#374151', fontSize: 14, cursor: 'pointer' }}>
              ביטול
            </button>
            <button type="submit" style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${selectedRole?.color ?? '#4fb8e0'}, ${selectedRole?.color ?? '#80cded'})`, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 12px ${selectedRole?.color ?? '#4fb8e0'}44` }}>
              {isNew ? 'צור משתמש' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };

function inputStyle(hasError) {
  return {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${hasError ? '#ef4444' : '#e2e8f0'}`,
    fontSize: 14, color: '#1e293b', background: '#f8fafc', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };
}

function MField({ label, error, children, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  );
}
