import { createContext, useContext, useState } from 'react';

// ─── Storage keys ────────────────────────────────────────────────────────────
const SESSION_KEY    = 'constrak_auth_user';
const USERS_KEY      = 'constrak_auth_users';
const SYS_USERS_KEY  = 'constrak_system_users';

// ─── Default admin account (always exists, cannot be removed) ────────────────
export const ADMIN_UID = 'admin-001';

const SEED_USERS = [
  { uid: ADMIN_UID, email: 'admin@constrak.co.il', password: 'Admin1234', displayName: 'מנהל מערכת', photoURL: null, emailVerified: true },
];

// UIDs from the old demo dataset — purged automatically from legacy localStorage
const LEGACY_DEMO_UIDS = new Set([
  'demo-001', 'pm-001', 'sm-001', 'sub-001', 'worker-001',
  'google-mock-001', 'facebook-mock-001',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function getAllUsers() {
  try {
    const extra = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    // Strip legacy demo entries; extras take precedence for admin password overrides
    const cleanExtra = extra.filter(u => !LEGACY_DEMO_UIDS.has(u.uid));
    const extraUids  = new Set(cleanExtra.map(u => u.uid));
    const seeds      = SEED_USERS.filter(s => !extraUids.has(s.uid));
    return [...seeds, ...cleanExtra];
  } catch {
    return [...SEED_USERS];
  }
}

function registerUser(user) {
  try {
    const extra = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const filtered = extra.filter(u => u.uid !== user.uid);
    localStorage.setItem(USERS_KEY, JSON.stringify([...filtered, user]));
  } catch {
    localStorage.setItem(USERS_KEY, JSON.stringify([user]));
  }
}

function persistSession(user) {
  const { uid, email, displayName, photoURL, provider, emailVerified, lastLoginAt } = user;
  const slim = { uid, email, displayName, photoURL, provider, emailVerified: emailVerified ?? false, lastLoginAt: lastLoginAt ?? null };
  localStorage.setItem(SESSION_KEY, JSON.stringify(slim));
  return slim;
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // localStorage is synchronous — no async loading phase needed
  const [user, setUser] = useState(() => readSession());
  const authLoading = false;

  async function login(email, password) {
    await delay(700);
    const users = getAllUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found)               throw { code: 'auth/user-not-found' };
    if (found.password !== password) throw { code: 'auth/wrong-password' };

    // Block login if user status is inactive in system users
    try {
      const sysData = JSON.parse(localStorage.getItem(SYS_USERS_KEY) || '[]');
      const sysUser = sysData.find(su =>
        su.id === found.uid || su.email?.toLowerCase() === found.email?.toLowerCase()
      );
      if (sysUser?.status === 'inactive') throw { code: 'auth/user-disabled' };
    } catch (e) {
      if (e?.code) throw e;
    }

    setUser(persistSession({ ...found, provider: 'email', lastLoginAt: new Date().toISOString() }));
  }

  async function register(email, password, displayName) {
    await delay(900);
    const users = getAllUsers();
    if (users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
      throw { code: 'auth/email-already-in-use' };
    if (password.length < 6) throw { code: 'auth/weak-password' };
    const newUser = { uid: `user-${Date.now()}`, email: email.trim(), password, displayName, photoURL: null, provider: 'email', emailVerified: false, lastLoginAt: new Date().toISOString() };
    registerUser(newUser);
    setUser(persistSession(newUser));
  }

  async function loginWithGoogle() {
    await delay(600);
    setUser(persistSession({
      uid: 'google-mock-001', email: 'google.demo@gmail.com',
      displayName: 'Google Demo', photoURL: null, provider: 'google',
    }));
  }

  async function loginWithFacebook() {
    await delay(600);
    setUser(persistSession({
      uid: 'facebook-mock-001', email: 'facebook.demo@example.com',
      displayName: 'Facebook Demo', photoURL: null, provider: 'facebook',
    }));
  }

  // Called by admin to reset any user's password (without knowing the old one)
  function resetPassword(uid, newPassword) {
    if (!newPassword || newPassword.length < 6) throw { code: 'auth/weak-password' };
    const target = getAllUsers().find(u => u.uid === uid);
    if (!target) throw { code: 'auth/user-not-found' };
    // Upsert into extras so the override takes effect (prioritised over seed default)
    try {
      const extra = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      const filtered = extra.filter(u => u.uid !== uid);
      localStorage.setItem(USERS_KEY, JSON.stringify([...filtered, { ...target, password: newPassword }]));
    } catch {
      throw { code: 'auth/internal-error' };
    }
  }

  // Called by admin panel to create a user account without logging in as them
  function addAuthUser(email, password, displayName) {
    const users = getAllUsers();
    if (users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
      throw { code: 'auth/email-already-in-use' };
    const newUser = { uid: `user-${Date.now()}`, email: email.trim(), password, displayName, photoURL: null, provider: 'email' };
    registerUser(newUser);
    return newUser.uid;
  }

  async function updateProfile({ displayName, photoURL }) {
    await delay(300);
    if (!user) return;
    const allUsers = getAllUsers();
    const found = allUsers.find(u => u.uid === user.uid) ?? { uid: user.uid, email: user.email, password: '', emailVerified: user.emailVerified };
    const updated = { ...found };
    if (displayName !== undefined) updated.displayName = displayName;
    if (photoURL    !== undefined) updated.photoURL    = photoURL;
    registerUser(updated);
    setUser(persistSession({ ...user, ...updated }));
  }

  async function changePassword(currentPassword, newPassword) {
    await delay(500);
    if (!user) throw { code: 'auth/user-not-found' };
    const allUsers = getAllUsers();
    const found = allUsers.find(u => u.uid === user.uid);
    if (!found)                     throw { code: 'auth/user-not-found' };
    if (found.password !== currentPassword) throw { code: 'auth/wrong-password' };
    if (newPassword.length < 6)     throw { code: 'auth/weak-password' };
    registerUser({ ...found, password: newPassword });
  }

  async function resendVerification() {
    await delay(800);
    return true;
  }

  async function logout() {
    await delay(150);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, login, register, loginWithGoogle, loginWithFacebook, logout, addAuthUser, resetPassword, updateProfile, changePassword, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// Maps mock error codes (identical to Firebase codes) → Hebrew strings
export function firebaseErrorToHebrew(code) {
  const map = {
    'auth/user-not-found':       'משתמש לא נמצא — בדוק את כתובת האימייל',
    'auth/wrong-password':       'סיסמה שגויה',
    'auth/invalid-credential':   'שם משתמש או סיסמה שגויים',
    'auth/invalid-email':        'כתובת אימייל לא תקינה',
    'auth/email-already-in-use': 'האימייל כבר רשום במערכת',
    'auth/weak-password':        'הסיסמה חלשה מדי — לפחות 6 תווים',
    'auth/too-many-requests':    'יותר מדי ניסיונות. נסה שוב מאוחר יותר',
    'auth/network-request-failed': 'שגיאת רשת — בדוק את החיבור',
    'auth/user-disabled':        'חשבון זה חסום — פנה למנהל המערכת',
    'auth/popup-closed-by-user': '',
    'auth/cancelled-popup-request': '',
    'auth/internal-error':       'שגיאה פנימית — נסה שוב',
  };
  return map[code] ?? 'שגיאה בהתחברות — נסה שוב';
}
