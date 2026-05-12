const CHAT_KEY = 'constrak_chat';

export const CHAT_PROJECTS = [
  { id: '1', name: 'מגדל רמת גן' },
  { id: '2', name: 'מרכז מסחרי תל אביב' },
  { id: '3', name: 'וילות הרצליה פיתוח' },
];

const SEED_ROOMS = {
  'room-project-1': { id: 'room-project-1', type: 'project', projectId: '1', name: 'מגדל רמת גן',           createdAt: '2026-01-01T00:00:00.000Z' },
  'room-project-2': { id: 'room-project-2', type: 'project', projectId: '2', name: 'מרכז מסחרי תל אביב',    createdAt: '2026-01-01T00:00:00.000Z' },
  'room-project-3': { id: 'room-project-3', type: 'project', projectId: '3', name: 'וילות הרצליה פיתוח',   createdAt: '2026-01-01T00:00:00.000Z' },
};

const SEED_MESSAGES = {
  'room-project-1': [
    { id: 'cm-001', roomId: 'room-project-1', fromId: 'pm-001',     fromName: 'יוסי כהן',  fromRole: 'project_manager', body: 'בוקר טוב לכולם! נשמח לעדכון על התקדמות בקומה 5.',              sentAt: '2026-05-10T07:30:00.000Z' },
    { id: 'cm-002', roomId: 'room-project-1', fromId: 'sm-001',     fromName: 'דנה לוי',   fromRole: 'site_manager',    body: 'קומה 5 — יציקת הבטון הסתיימה אתמול. ממשיכים לקומה 6 מחר.', sentAt: '2026-05-10T07:45:00.000Z' },
    { id: 'cm-003', roomId: 'room-project-1', fromId: 'sub-001',    fromName: 'דוד כהן',   fromRole: 'subcontractor',   body: 'הצביעה בקומות 2-3 הסתיימה, מחכים לאישור בדיקה.',             sentAt: '2026-05-10T08:10:00.000Z' },
    { id: 'cm-004', roomId: 'room-project-1', fromId: 'worker-001', fromName: 'גבי מזרחי', fromRole: 'worker',          body: 'האם יש עבודה מחר בשבת?',                                     sentAt: '2026-05-10T09:00:00.000Z' },
    { id: 'cm-005', roomId: 'room-project-1', fromId: 'pm-001',     fromName: 'יוסי כהן',  fromRole: 'project_manager', body: "לא, שבת יהיה יום חופש. מתחדשים ביום א'.",                    sentAt: '2026-05-10T09:05:00.000Z' },
    { id: 'cm-006', roomId: 'room-project-1', fromId: 'sm-001',     fromName: 'דנה לוי',   fromRole: 'site_manager',    body: "בסדר, אז ביום א' מתחילים 07:00 חדה.",                        sentAt: '2026-05-10T09:10:00.000Z' },
  ],
};

export function loadChatData() {
  try {
    const stored = JSON.parse(localStorage.getItem(CHAT_KEY) || 'null');
    if (!stored) return { rooms: { ...SEED_ROOMS }, messages: JSON.parse(JSON.stringify(SEED_MESSAGES)), readStatus: {} };
    return stored;
  } catch {
    return { rooms: { ...SEED_ROOMS }, messages: JSON.parse(JSON.stringify(SEED_MESSAGES)), readStatus: {} };
  }
}

export function saveChatData(data) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('constrak:chat'));
}

export function createGroupRoom(data, { name, type, projectId, creatorId, participants }) {
  const id = `room-${type}-${Date.now()}`;
  const room = { id, type, name, participants, createdBy: creatorId, createdAt: new Date().toISOString() };
  if (projectId) room.projectId = projectId;
  data.rooms[id] = room;
  data.messages[id] = [];
  return id;
}

export function ensureProjectRoom(data, projectId, projectName) {
  const id = `room-project-${projectId}`;
  if (!data.rooms[id]) {
    data.rooms[id] = { id, type: 'project', projectId, name: projectName, createdAt: new Date().toISOString() };
  }
  if (!data.messages[id]) data.messages[id] = [];
  return id;
}

export function ensureDirectRoom(data, uid1, uid2, name1, name2) {
  const [a, b] = [uid1, uid2].sort();
  const id = `room-dm-${a}-${b}`;
  if (!data.rooms[id]) {
    data.rooms[id] = {
      id, type: 'direct',
      participants: [uid1, uid2],
      names: { [uid1]: name1, [uid2]: name2 },
      createdAt: new Date().toISOString(),
    };
  } else {
    data.rooms[id].names = { ...data.rooms[id].names, [uid1]: name1, [uid2]: name2 };
  }
  if (!data.messages[id]) data.messages[id] = [];
  return id;
}

export function addChatMessage(data, roomId, msg) {
  if (!data.messages[roomId]) data.messages[roomId] = [];
  data.messages[roomId] = [...data.messages[roomId], msg];
}

export function markChatRead(data, roomId, userId) {
  if (!data.readStatus[userId]) data.readStatus[userId] = {};
  data.readStatus[userId][roomId] = new Date().toISOString();
}

export function getUnreadCount(data, roomId, userId) {
  const msgs = data.messages[roomId] ?? [];
  const lastRead = data.readStatus[userId]?.[roomId];
  if (!lastRead) return msgs.filter(m => m.fromId !== userId).length;
  return msgs.filter(m => m.fromId !== userId && m.sentAt > lastRead).length;
}

export function getTotalUnreadForUser(userId) {
  const data = loadChatData();
  let total = 0;
  for (const roomId of Object.keys(data.rooms)) {
    total += getUnreadCount(data, roomId, userId);
  }
  return total;
}
