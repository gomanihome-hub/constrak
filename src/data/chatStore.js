const CHAT_KEY = 'constrak_chat';

export const CHAT_PROJECTS = [];

export function loadChatData() {
  try {
    const stored = JSON.parse(localStorage.getItem(CHAT_KEY) || 'null');
    if (!stored) return { rooms: {}, messages: {}, readStatus: {} };
    return stored;
  } catch {
    return { rooms: {}, messages: {}, readStatus: {} };
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
