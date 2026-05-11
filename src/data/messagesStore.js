export const MSG_KEY = 'constrak_messages';

export const PROJECTS = [
  { id: '1', name: 'מגדל רמת גן' },
  { id: '2', name: 'שכונת הדר' },
  { id: '3', name: 'פרויקט חיפה' },
  { id: '4', name: 'מרכז לוד' },
];

export const SITES = [
  { id: '1', name: 'אתר מגדל רמת גן' },
  { id: '2', name: 'אתר שכונת הדר' },
  { id: '3', name: 'אתר חיפה' },
];

export const SEED_MSGS = [
  {
    id: 'msg-s001',
    fromId: 'admin-001', fromName: 'מנהל מערכת', fromRole: 'admin',
    toScope: 'broadcast', toId: null,
    subject: 'תזכורת בטיחות חודשית',
    body: 'מחר תתקיים ביקורת בטיחות בכל אתרי החברה. אנא וודאו שכל ציוד המגן זמין ושטחי העבודה מסודרים. נוכחות חובה לכל מנהלי האתרים.',
    sentAt: '2026-05-10T09:00:00.000Z', readBy: [],
  },
  {
    id: 'msg-s002',
    fromId: 'pm-001', fromName: 'יוסי כהן', fromRole: 'project_manager',
    toScope: 'project', toId: '1',
    subject: 'עדכון לוח זמנים — מגדל רמת גן',
    body: 'לתשומת לב כולם — לאור ההתקדמות המשביעת רצון, עבודות הצבע יחלו ב-15 למאי. נא לתאם עם מנהל האתר ולוודא שהחומרים זמינים.',
    sentAt: '2026-05-11T08:30:00.000Z', readBy: [],
  },
  {
    id: 'msg-s003',
    fromId: 'sm-001', fromName: 'דנה לוי', fromRole: 'site_manager',
    toScope: 'site', toId: '1',
    subject: 'כניסה לאתר מחר',
    body: 'בדיקת בטיחות מחר בין 7:00-8:00. כל הקבלנים נדרשים להגיע לאחר השעה 8:00 בלבד. נא לעדכן את הפועלים שלכם בהתאם.',
    sentAt: '2026-05-11T14:00:00.000Z', readBy: [],
  },
  {
    id: 'msg-s004',
    fromId: 'sub-001', fromName: 'דוד כהן', fromRole: 'subcontractor',
    toScope: 'user', toId: 'worker-001',
    subject: 'משימה דחופה — קיר D4',
    body: 'גבי, אנא התפנה לצביעת קיר D4 (לבן, 2 שכבות) עד 16:00 היום. החומרים נמצאים בסטור ליד כניסה ב׳.',
    sentAt: '2026-05-11T07:00:00.000Z', readBy: [],
  },
];

export function loadMsgs() {
  try {
    const raw = localStorage.getItem(MSG_KEY);
    if (!raw) { saveMsgs(SEED_MSGS); return [...SEED_MSGS]; }
    const stored = JSON.parse(raw);
    const ids = new Set(stored.map(m => m.id));
    const extras = SEED_MSGS.filter(m => !ids.has(m.id));
    return [...stored, ...extras].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  } catch { return [...SEED_MSGS]; }
}

export function saveMsgs(msgs) {
  localStorage.setItem(MSG_KEY, JSON.stringify(msgs));
}

export function isVisibleTo(msg, systemUser, role) {
  if (role === 'admin') return true;
  if (!systemUser) return false;
  switch (msg.toScope) {
    case 'broadcast': return true;
    case 'project':   return (systemUser.assignedProjects ?? []).includes(msg.toId);
    case 'site':      return systemUser.assignedSite === msg.toId;
    case 'user':      return systemUser.id === msg.toId;
    default:          return false;
  }
}

export function markRead(msgs, msgId, userId) {
  return msgs.map(m =>
    m.id === msgId && !m.readBy.includes(userId)
      ? { ...m, readBy: [...m.readBy, userId] }
      : m
  );
}

export function roleLabel(role) {
  const map = {
    admin: 'מנהל מערכת', project_manager: 'מנהל פרויקט',
    site_manager: 'מנהל עבודה', subcontractor: 'קבלן משנה', worker: 'פועל',
  };
  return map[role] ?? role;
}

export function scopeLabel(msg) {
  if (msg.toScope === 'broadcast') return '📢 כל המשתמשים';
  if (msg.toScope === 'project') {
    const p = PROJECTS.find(x => x.id === msg.toId);
    return `🏗️ ${p?.name ?? msg.toId}`;
  }
  if (msg.toScope === 'site') {
    const s = SITES.find(x => x.id === msg.toId);
    return `📍 ${s?.name ?? msg.toId}`;
  }
  return '👤 אישי';
}
