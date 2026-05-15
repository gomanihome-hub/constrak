export const MSG_KEY = 'constrak_messages';

export const PROJECTS = [];

export const SITES = [];

export function loadMsgs() {
  try {
    const raw = localStorage.getItem(MSG_KEY);
    if (!raw) return [];
    return JSON.parse(raw).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  } catch { return []; }
}

export function saveMsgs(msgs) {
  localStorage.setItem(MSG_KEY, JSON.stringify(msgs));
}

export function isVisibleTo(msg, systemUser, role) {
  if (role === 'admin') return true;
  if (!systemUser) return false;
  switch (msg.toScope) {
    case 'broadcast': return true;
    case 'role':      return systemUser.role === msg.toId;
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
  if (msg.toScope === 'role') {
    const labels = { admin: 'מנהלי מערכת', project_manager: 'מנהלי פרויקט', site_manager: 'מנהלי אתר', subcontractor: 'קבלני משנה', worker: 'פועלים' };
    return `👥 ${labels[msg.toId] ?? msg.toId}`;
  }
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
