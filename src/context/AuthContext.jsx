import { createContext, useContext, useState } from 'react';

// ─── Storage keys ────────────────────────────────────────────────────────────
const SESSION_KEY    = 'constrak_auth_user';
const USERS_KEY      = 'constrak_auth_users';
const SYS_USERS_KEY  = 'constrak_system_users';

// ─── Pre-seeded demo accounts ─────────────────────────────────────────────────
const SEED_USERS = [
  { uid: 'demo-001',    email: 'demo@constrak.co.il',    password: 'demo123',   displayName: 'משתמש דמו',    photoURL: null },
  { uid: 'admin-001',   email: 'admin@constrak.co.il',   password: 'admin123',  displayName: 'מנהל מערכת',  photoURL: null },
  { uid: 'pm-001',      email: 'pm@constrak.co.il',      password: 'pm123',     displayName: 'יוסי כהן',     photoURL: null },
  { uid: 'sm-001',      email: 'sm@constrak.co.il',      password: 'sm123',     displayName: 'דנה לוי',      photoURL: null },
  { uid: 'sub-001',     email: 'sub@constrak.co.il',     password: 'sub123',    displayName: 'דוד כהן',      photoURL: null },
  { uid: 'worker-001',  email: 'worker@constrak.co.il',  password: 'worker123', displayName: 'גבי מזרחי',    photoURL: null },
];

export const DEMO_CREDENTIALS = { email: 'demo@constrak.co.il', password: 'demo123' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function getAllUsers() {
  try {
    const extra = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    // Extras take precedence (supports password-reset overrides for seed users)
    const extraUids = new Set(extra.map(u => u.uid));
    const seeds = SEED_USERS.filter(s => !extraUids.has(s.uid));
    return [...seeds, ...extra];
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
  const { uid, email, displayName, photoURL, provider } = user;
  const slim = { uid, email, displayName, photoURL, provider };
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

    setUser(persistSession({ ...found, provider: 'email' }));
  }

  async function register(email, password, displayName) {
    await delay(900);
    const users = getAllUsers();
    if (users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
      throw { code: 'auth/email-already-in-use' };
    if (password.length < 6) throw { code: 'auth/weak-password' };
    const newUser = { uid: `user-${Date.now()}`, email: email.trim(), password, displayName, photoURL: null, provider: 'email' };
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

  async function logout() {
    await delay(150);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, login, register, loginWithGoogle, loginWithFacebook, logout, addAuthUser, resetPassword }}>
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
