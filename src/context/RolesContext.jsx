import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';

const STORE_KEY       = 'constrak_system_users';
const AUTH_USERS_KEY  = 'constrak_auth_users';   // written by AuthContext.register()

// ─── Role definitions ─────────────────────────────────────────────────────────
export const ROLES = {
  admin:           { id: 'admin',           label: 'מנהל מערכת',  icon: '👑', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', desc: 'גישה מלאה — ניהול משתמשים, פרויקטים וכל הנתונים' },
  project_manager: { id: 'project_manager', label: 'מנהל פרויקט', icon: '📊', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', desc: 'ניהול פרויקטים מוקצים — צוותים, משימות, תקציב' },
  site_manager:    { id: 'site_manager',    label: 'מנהל עבודה',  icon: '🦺', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', desc: 'ניהול אתר עבודה ספציפי — עובדים, ביצוע ויומן' },
  subcontractor:   { id: 'subcontractor',   label: 'קבלן משנה',   icon: '🔨', color: '#b45309', bg: '#fffbeb', border: '#fde68a', desc: 'הגשת דוחות עבודה יומיים לאתר שלהם בלבד' },
  worker:          { id: 'worker',          label: 'פועל',         icon: '👷', color: '#475569', bg: '#f8fafc', border: '#e2e8f0', desc: "כניסה ויציאה יומית בלבד — צ'ק-אין" },
};

// ─── Permissions matrix ───────────────────────────────────────────────────────
export const PERMISSIONS = [
  { key: 'viewDashboard',  label: 'לוח בקרה',        admin: 'מלא',    pm: 'מוגבל',    sm: 'האתר שלו', sub: false,    worker: false    },
  { key: 'viewProjects',   label: 'פרויקטים',         admin: 'הכל',    pm: 'מוקצים',   sm: 'אחד',      sub: false,    worker: false    },
  { key: 'viewTasks',      label: 'משימות',            admin: true,     pm: true,       sm: true,       sub: false,    worker: 'מוקצות' },
  { key: 'viewWorkers',    label: 'עובדים',            admin: true,     pm: true,       sm: true,       sub: false,    worker: false    },
  { key: 'viewMaterials',  label: 'חומרים',            admin: true,     pm: true,       sm: false,      sub: false,    worker: false    },
  { key: 'viewWorkLog',    label: 'יומן עבודה',        admin: 'הכל',    pm: true,       sm: true,       sub: 'שלהם',   worker: false    },
  { key: 'viewMessages',   label: 'הודעות',            admin: true,     pm: true,       sm: true,       sub: true,     worker: true     },
  { key: 'submitReport',   label: 'הגשת דוח יומי',    admin: false,    pm: false,      sm: false,      sub: true,     worker: true     },
  { key: 'checkIn',        label: "כניסה/יציאה מאתר", admin: false,    pm: false,      sm: false,      sub: false,    worker: true     },
  { key: 'manageUsers',    label: 'ניהול משתמשים',    admin: true,     pm: false,      sm: false,      sub: false,    worker: false    },
];

// ─── Seed users ───────────────────────────────────────────────────────────────
const SEED_SYSTEM_USERS = [
  { id: 'demo-001',       email: 'demo@constrak.co.il',    displayName: 'משתמש דמו',    phone: '050-1234567', role: 'admin',           assignedProjects: [],          assignedSite: null, status: 'active', createdAt: '2026-01-01' },
  { id: 'admin-001',      email: 'admin@constrak.co.il',   displayName: 'מנהל מערכת',  phone: '052-9876543', role: 'admin',           assignedProjects: [],          assignedSite: null, status: 'active', createdAt: '2026-01-01' },
  { id: 'pm-001',         email: 'pm@constrak.co.il',      displayName: 'יוסי כהן',     phone: '054-1111111', role: 'project_manager', assignedProjects: ['1', '2'],  assignedSite: null, status: 'active', createdAt: '2026-02-01' },
  { id: 'sm-001',         email: 'sm@constrak.co.il',      displayName: 'דנה לוי',      phone: '058-2222222', role: 'site_manager',    assignedProjects: ['1'],       assignedSite: '1',  status: 'active', createdAt: '2026-02-15' },
  { id: 'sub-001',        email: 'sub@constrak.co.il',     displayName: 'דוד כהן',      phone: '050-3333333', role: 'subcontractor',   assignedProjects: ['1'],       assignedSite: '1',  status: 'active', trade: 'צביעה', createdAt: '2026-03-10' },
  { id: 'worker-001',     email: 'worker@constrak.co.il',  displayName: 'גבי מזרחי',    phone: '052-4444444', role: 'worker',          assignedProjects: ['1'],       assignedSite: '1',  status: 'active', createdAt: '2026-03-15' },
  { id: 'google-mock-001',    email: 'google.demo@gmail.com',      displayName: 'Google Demo',   phone: '', role: 'project_manager', assignedProjects: ['1', '3'],  assignedSite: null, status: 'active', createdAt: '2026-03-01' },
  { id: 'facebook-mock-001',  email: 'facebook.demo@example.com',  displayName: 'Facebook Demo', phone: '', role: 'site_manager',    assignedProjects: ['2'],       assignedSite: '2',  status: 'active', createdAt: '2026-03-01' },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
function defaultSystemEntry(au) {
  return {
    id:               au.uid,
    email:            au.email,
    displayName:      au.displayName || au.email,
    phone:            '',
    role:             'worker',
    assignedProjects: [],
    assignedSite:     null,
    status:           'active',
    createdAt:        new Date().toISOString().slice(0, 10),
  };
}

function loadSystemUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');

    // Build base: seeds merged with any saved overrides / extras
    let base;
    if (!stored) {
      base = [...SEED_SYSTEM_USERS];
    } else {
      const overrides = new Map(stored.map(u => [u.id, u]));
      const merged = SEED_SYSTEM_USERS.map(s => overrides.has(s.id) ? { ...s, ...overrides.get(s.id) } : s);
      const extras = stored.filter(u => !SEED_SYSTEM_USERS.find(s => s.id === u.id));
      base = [...merged, ...extras];
    }

    // Pull in any users registered via AuthContext that aren't already tracked here
    const authExtras = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    const existingIds    = new Set(base.map(u => u.id));
    const existingEmails = new Set(base.map(u => u.email?.toLowerCase()).filter(Boolean));
    for (const au of authExtras) {
      if (!existingIds.has(au.uid) && !existingEmails.has(au.email?.toLowerCase())) {
        base.push(defaultSystemEntry(au));
      }
    }

    return base;
  } catch {
    return SEED_SYSTEM_USERS;
  }
}

function saveSystemUsers(users) {
  localStorage.setItem(STORE_KEY, JSON.stringify(users));
}

// ─── Context ──────────────────────────────────────────────────────────────────
const RolesContext = createContext(null);

export function RolesProvider({ children }) {
  const { user } = useAuth();
  const [systemUsers, setSystemUsers] = useState(() => loadSystemUsers());

  // On every login/logout: rescan constrak_auth_users so ALL self-registered users
  // appear immediately in the admin panel (not just the currently logged-in one).
  useEffect(() => {
    setSystemUsers(prev => {
      const authExtras = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
      const existingIds    = new Set(prev.map(u => u.id));
      const existingEmails = new Set(prev.map(u => u.email?.toLowerCase()).filter(Boolean));

      const toAdd = [];
      for (const au of authExtras) {
        if (!existingIds.has(au.uid) && !existingEmails.has(au.email?.toLowerCase())) {
          toAdd.push(defaultSystemEntry(au));
        }
      }

      // Also ensure the current user has a system profile
      if (user) {
        const alreadyTracked =
          existingIds.has(user.uid) ||
          existingEmails.has(user.email?.toLowerCase()) ||
          toAdd.find(u => u.id === user.uid);
        if (!alreadyTracked) {
          toAdd.push(defaultSystemEntry(user));
        }
      }

      if (toAdd.length === 0) return prev;
      const updated = [...prev, ...toAdd];
      saveSystemUsers(updated);
      return updated;
    });
  }, [user]);

  // The logged-in user's system profile (role, assigned projects, etc.)
  const currentSystemUser = useMemo(() => {
    if (!user) return null;
    return (
      systemUsers.find(u => u.id === user.uid) ||
      systemUsers.find(u => u.email?.toLowerCase() === user.email?.toLowerCase()) ||
      // Fallback: unrecognised user gets worker role
      { id: user.uid, email: user.email, displayName: user.displayName, phone: '', role: 'worker', assignedProjects: [], assignedSite: null, status: 'active', createdAt: new Date().toISOString().slice(0, 10) }
    );
  }, [user, systemUsers]);

  const currentRole = currentSystemUser?.role ?? 'worker';

  // What the current user can do
  const can = useMemo(() => ({
    viewDashboard:  ['admin','project_manager','site_manager'].includes(currentRole),
    viewProjects:   ['admin','project_manager','site_manager'].includes(currentRole),
    viewTasks:      ['admin','project_manager','site_manager'].includes(currentRole),
    viewWorkers:    ['admin','project_manager','site_manager'].includes(currentRole),
    viewMaterials:  ['admin','project_manager'].includes(currentRole),
    viewWorkLog:    ['admin','project_manager','site_manager'].includes(currentRole),
    viewMessages:   true,  // everyone sees messages addressed to them
    sendMessage:    ['admin','project_manager','site_manager'].includes(currentRole),
    sendBroadcast:  ['admin','project_manager'].includes(currentRole),
    submitReport:   currentRole === 'subcontractor',
    workerReport:   currentRole === 'worker',
    checkIn:        currentRole === 'worker',
    viewAdminPanel: currentRole === 'admin',
    manageUsers:    currentRole === 'admin',
  }), [currentRole]);

  // Returns null (= all) for admin, otherwise the list of project ID strings
  function getAssignedProjectIds() {
    if (currentRole === 'admin') return null;
    return currentSystemUser?.assignedProjects ?? [];
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function _save(users) { setSystemUsers(users); saveSystemUsers(users); }

  function createSystemUser(data) {
    const u = { ...data, id: data.id ?? `user-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10), status: 'active' };
    _save([...systemUsers, u]);
    return u;
  }

  function updateSystemUser(id, changes) {
    _save(systemUsers.map(u => u.id === id ? { ...u, ...changes } : u));
  }

  function deleteSystemUser(id) {
    _save(systemUsers.filter(u => u.id !== id));
  }

  function toggleStatus(id) {
    _save(systemUsers.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
  }

  return (
    <RolesContext.Provider value={{
      systemUsers, currentSystemUser, currentRole, can,
      getAssignedProjectIds,
      createSystemUser, updateSystemUser, deleteSystemUser, toggleStatus,
    }}>
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  const ctx = useContext(RolesContext);
  if (!ctx) throw new Error('useRoles must be used inside RolesProvider');
  return ctx;
}
