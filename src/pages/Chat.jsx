import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import {
  loadChatData, saveChatData, ensureProjectRoom, ensureDirectRoom,
  createGroupRoom, addChatMessage, markChatRead, getUnreadCount, CHAT_PROJECTS,
} from '../data/chatStore';

const ROLE_ICONS  = { admin: '👑', project_manager: '📊', site_manager: '🦺', subcontractor: '🔨', worker: '👷' };
const ROLE_LABELS = { admin: 'מנהל מערכת', project_manager: 'מנהל פרויקט', site_manager: 'מנהל עבודה', subcontractor: 'קבלן משנה', worker: 'פועל' };

export default function Chat() {
  const { user } = useAuth();
  const { currentSystemUser, currentRole, systemUsers } = useRoles();

  const uid         = currentSystemUser?.id ?? user?.uid ?? '';
  const displayName = currentSystemUser?.displayName || user?.displayName || 'משתמש';

  const [chatData,            setChatData]            = useState(() => loadChatData());
  const [activeRoom,          setActiveRoom]          = useState(null);
  const [showNewDM,           setShowNewDM]           = useState(false);
  const [showNewProjectGroup, setShowNewProjectGroup] = useState(false);
  const [showNewGroup,        setShowNewGroup]        = useState(false);

  useEffect(() => {
    function reload() { setChatData(loadChatData()); }
    window.addEventListener('constrak:chat', reload);
    return () => window.removeEventListener('constrak:chat', reload);
  }, []);

  // Seed / ensure auto project rooms for this user
  useEffect(() => {
    if (!uid) return;
    const data = loadChatData();
    const assignedIds = currentSystemUser?.assignedProjects ?? [];
    const projects = currentRole === 'admin' ? CHAT_PROJECTS : CHAT_PROJECTS.filter(p => assignedIds.includes(p.id));
    let changed = false;
    for (const p of projects) {
      if (!data.rooms[`room-project-${p.id}`]) { ensureProjectRoom(data, p.id, p.name); changed = true; }
    }
    if (changed) { saveChatData(data); setChatData(loadChatData()); }
  }, [uid, currentRole, currentSystemUser]);

  const visibleRooms = useMemo(() => {
    const assignedIds = currentSystemUser?.assignedProjects ?? [];
    return Object.values(chatData.rooms).filter(r => {
      if (r.type === 'project') {
        // User-created project groups have an explicit participants list
        if (r.participants?.length > 0) return r.participants.includes(uid);
        return currentRole === 'admin' || assignedIds.includes(r.projectId);
      }
      if (r.type === 'group')  return r.participants?.includes(uid);
      if (r.type === 'direct') return r.participants?.includes(uid);
      return false;
    });
  }, [chatData.rooms, currentRole, currentSystemUser, uid]);

  const projectRooms = visibleRooms.filter(r => r.type === 'project');
  const groupRooms   = visibleRooms.filter(r => r.type === 'group');
  const directRooms  = visibleRooms.filter(r => r.type === 'direct');

  const activeMessages = activeRoom ? (chatData.messages[activeRoom] ?? []) : [];
  const activeRoomObj  = activeRoom ? chatData.rooms[activeRoom] : null;

  const availableProjects = currentRole === 'admin'
    ? CHAT_PROJECTS
    : CHAT_PROJECTS.filter(p => (currentSystemUser?.assignedProjects ?? []).includes(p.id));

  // ── Room open ────────────────────────────────────────────────────────────────
  function openRoom(roomId) {
    setActiveRoom(roomId);
    const data = loadChatData();
    markChatRead(data, roomId, uid);
    saveChatData(data);
    setChatData(loadChatData());
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  function sendMessage(body) {
    if (!body.trim() || !activeRoom) return;
    const data = loadChatData();
    addChatMessage(data, activeRoom, {
      id: `cm-${Date.now()}`,
      roomId: activeRoom,
      fromId: uid,
      fromName: displayName,
      fromRole: currentRole,
      body: body.trim(),
      sentAt: new Date().toISOString(),
    });
    markChatRead(data, activeRoom, uid);
    saveChatData(data);
    setChatData(loadChatData());
  }

  // ── Start DM ─────────────────────────────────────────────────────────────────
  function startDM(target) {
    const data = loadChatData();
    const roomId = ensureDirectRoom(data, uid, target.id, displayName, target.displayName);
    saveChatData(data);
    setChatData(loadChatData());
    setActiveRoom(roomId);
    setShowNewDM(false);
  }

  // ── Create project group ─────────────────────────────────────────────────────
  function handleCreateProjectGroup(projectId, name, memberIds) {
    const data = loadChatData();
    const roomId = createGroupRoom(data, {
      name, type: 'project', projectId,
      creatorId: uid,
      participants: [...new Set([uid, ...memberIds])],
    });
    saveChatData(data);
    setChatData(loadChatData());
    setActiveRoom(roomId);
    setShowNewProjectGroup(false);
  }

  // ── Create private group ─────────────────────────────────────────────────────
  function handleCreateGroup(_, name, memberIds) {
    const data = loadChatData();
    const roomId = createGroupRoom(data, {
      name, type: 'group',
      creatorId: uid,
      participants: [...new Set([uid, ...memberIds])],
    });
    saveChatData(data);
    setChatData(loadChatData());
    setActiveRoom(roomId);
    setShowNewGroup(false);
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', direction: 'rtl', overflow: 'hidden' }}>

      {/* ── Room list panel ── */}
      <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: 'white' }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>צ&apos;אט</h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── קבוצות פרויקט ── */}
          <section>
            <SectionHeader label="קבוצות פרויקט" onAdd={() => setShowNewProjectGroup(true)} addTitle="קבוצת פרויקט חדשה" />
            {projectRooms.map(room => (
              <RoomItem
                key={room.id}
                room={room}
                active={activeRoom === room.id}
                unread={getUnreadCount(chatData, room.id, uid)}
                lastMsg={(chatData.messages[room.id] ?? []).at(-1)}
                uid={uid}
                onClick={() => openRoom(room.id)}
              />
            ))}
            {projectRooms.length === 0 && (
              <p style={{ margin: 0, padding: '6px 16px 10px', fontSize: 12, color: '#cbd5e1' }}>אין קבוצות</p>
            )}
          </section>

          {/* ── קבוצות פנימיות ── */}
          <section>
            <SectionHeader label="קבוצות פנימיות" onAdd={() => setShowNewGroup(true)} addTitle="קבוצה פנימית חדשה" />
            {groupRooms.map(room => (
              <RoomItem
                key={room.id}
                room={room}
                active={activeRoom === room.id}
                unread={getUnreadCount(chatData, room.id, uid)}
                lastMsg={(chatData.messages[room.id] ?? []).at(-1)}
                uid={uid}
                onClick={() => openRoom(room.id)}
                isGroup
              />
            ))}
            {groupRooms.length === 0 && (
              <p style={{ margin: 0, padding: '6px 16px 10px', fontSize: 12, color: '#cbd5e1' }}>אין קבוצות</p>
            )}
          </section>

          {/* ── הודעות ישירות ── */}
          <section>
            <SectionHeader label="הודעות ישירות" onAdd={() => setShowNewDM(true)} addTitle="שיחה ישירה חדשה" />
            {directRooms.map(room => {
              const otherId   = room.participants?.find(p => p !== uid);
              const otherName = room.names?.[otherId] ?? 'לא ידוע';
              return (
                <RoomItem
                  key={room.id}
                  room={{ ...room, name: otherName }}
                  active={activeRoom === room.id}
                  unread={getUnreadCount(chatData, room.id, uid)}
                  lastMsg={(chatData.messages[room.id] ?? []).at(-1)}
                  uid={uid}
                  onClick={() => openRoom(room.id)}
                  isDM
                />
              );
            })}
            {directRooms.length === 0 && (
              <p style={{ margin: 0, padding: '6px 16px 10px', fontSize: 12, color: '#cbd5e1' }}>אין שיחות</p>
            )}
          </section>
        </div>
      </div>

      {/* ── Message area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
        {activeRoom && activeRoomObj ? (
          <MessageThread
            room={activeRoomObj}
            messages={activeMessages}
            uid={uid}
            displayName={displayName}
            currentRole={currentRole}
            onSend={sendMessage}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#94a3b8' }}>
            <span style={{ fontSize: 64 }}>💬</span>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#64748b' }}>ברוך הבא לצ&apos;אט</p>
            <p style={{ margin: 0, fontSize: 14 }}>בחר שיחה מהרשימה</p>
          </div>
        )}
      </div>

      {/* ── New project group modal ── */}
      {showNewProjectGroup && (
        <NewGroupModal
          title="קבוצת פרויקט חדשה"
          icon="🏗️"
          showProjectSelect
          availableProjects={availableProjects}
          systemUsers={systemUsers}
          uid={uid}
          onClose={() => setShowNewProjectGroup(false)}
          onCreate={handleCreateProjectGroup}
        />
      )}

      {/* ── New private group modal ── */}
      {showNewGroup && (
        <NewGroupModal
          title="קבוצה פנימית חדשה"
          icon="👥"
          showProjectSelect={false}
          availableProjects={[]}
          systemUsers={systemUsers}
          uid={uid}
          onClose={() => setShowNewGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {/* ── New DM modal ── */}
      {showNewDM && (
        <NewDMModal
          systemUsers={systemUsers}
          uid={uid}
          onClose={() => setShowNewDM(false)}
          onSelect={startDM}
        />
      )}
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
function SectionHeader({ label, onAdd, addTitle }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 4px' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</span>
      <button
        onClick={onAdd}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        title={addTitle}
        style={{ width: 20, height: 20, borderRadius: '50%', background: hov ? '#4fb8e0' : '#e2e8f0', border: 'none', color: hov ? 'white' : '#64748b', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, fontWeight: 700, transition: 'background 0.15s, color 0.15s', flexShrink: 0 }}
      >
        +
      </button>
    </div>
  );
}

// ── RoomItem ──────────────────────────────────────────────────────────────────
function RoomItem({ room, active, unread, lastMsg, uid, onClick, isDM, isGroup }) {
  const initials = (room.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const icon = isDM ? initials : isGroup ? '👥' : '🏗️';
  const radius = isDM ? '50%' : 12;
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '11px 14px', border: 'none', cursor: 'pointer', textAlign: 'right',
        background: active ? '#f0f9ff' : 'white',
        borderRight: `3px solid ${active ? '#4fb8e0' : 'transparent'}`,
        borderBottom: '1px solid #f8fafc',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: radius, background: active ? 'linear-gradient(135deg, #4fb8e0, #80cded)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: isDM || isGroup ? 13 : 20, color: active ? 'white' : '#64748b', fontWeight: 700 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: unread ? 700 : 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{room.name}</span>
          {lastMsg && <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', marginRight: 4 }}>{fmtTime(lastMsg.sentAt)}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {lastMsg ? `${lastMsg.fromName}: ${lastMsg.body.slice(0, 30)}${lastMsg.body.length > 30 ? '...' : ''}` : 'אין הודעות'}
          </p>
          {unread > 0 && (
            <span style={{ background: '#4fb8e0', color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center', flexShrink: 0, marginRight: 6 }}>
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── NewGroupModal ─────────────────────────────────────────────────────────────
function NewGroupModal({ title, icon, showProjectSelect, availableProjects, systemUsers, uid, onClose, onCreate }) {
  const [projectId, setProjectId] = useState(availableProjects[0]?.id ?? '');
  const [name,      setName]      = useState('');
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(new Set());

  // Pre-fill name when project changes
  useEffect(() => {
    if (showProjectSelect && projectId) {
      const p = availableProjects.find(x => x.id === projectId);
      if (p) setName(p.name + ' — צוות');
    }
  }, [projectId]); // eslint-disable-line

  const candidates = systemUsers
    .filter(u => u.id !== uid && u.status === 'active' && u.displayName)
    .filter(u => !search || u.displayName.includes(search) || u.email?.includes(search));

  function toggle(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const canCreate = name.trim().length > 0 && selected.size > 0;

  function handleCreate() {
    if (!canCreate) return;
    onCreate(projectId || null, name.trim(), [...selected]);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: 430, maxHeight: '84vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', direction: 'rtl' }}>

        {/* Header */}
        <div style={{ padding: '15px 20px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* Fields */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {showProjectSelect && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5 }}>פרויקט</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: 'white', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                {availableProjects.length === 0 && <option value="">אין פרויקטים זמינים</option>}
              </select>
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5 }}>שם הקבוצה *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={showProjectSelect ? 'למשל: צוות קומות 1-5' : 'למשל: צוות תכנון'}
              autoFocus
              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${name.trim() ? '#e2e8f0' : '#fca5a5'}`, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Member search */}
        <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>הוסף חברים *</label>
            {selected.size > 0 && (
              <span style={{ fontSize: 11, color: 'white', background: '#4fb8e0', borderRadius: 99, padding: '1px 8px', fontWeight: 600 }}>
                {selected.size} נבחרו
              </span>
            )}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש שם..."
            style={{ width: '100%', padding: '7px 11px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        {/* Member list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {candidates.map(u => {
            const isSel = selected.has(u.id);
            const initials = (u.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <button
                key={u.id}
                onClick={() => toggle(u.id)}
                style={{ width: '100%', padding: '10px 16px', border: 'none', borderBottom: '1px solid #f8fafc', background: isSel ? '#f0f9ff' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right', transition: 'background 0.1s' }}
              >
                {/* Checkbox */}
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isSel ? '#4fb8e0' : '#cbd5e1'}`, background: isSel ? '#4fb8e0' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontSize: 11, fontWeight: 700, transition: 'all 0.1s' }}>
                  {isSel ? '✓' : ''}
                </div>
                {/* Avatar */}
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: isSel ? 'linear-gradient(135deg, #4fb8e0, #80cded)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSel ? 'white' : '#64748b', fontWeight: 700, fontSize: 12, flexShrink: 0, transition: 'all 0.1s' }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.displayName}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{ROLE_ICONS[u.role]} {ROLE_LABELS[u.role] ?? u.role}</p>
                </div>
              </button>
            );
          })}
          {candidates.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>לא נמצאו משתמשים</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>ביטול</button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: canCreate ? 'linear-gradient(135deg, #f3ce1f, #e6b800)' : '#e2e8f0', color: canCreate ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: 700, cursor: canCreate ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.15s' }}
          >
            צור קבוצה
          </button>
        </div>
      </div>
    </div>
  );
}

// ── NewDMModal ────────────────────────────────────────────────────────────────
function NewDMModal({ systemUsers, uid, onClose, onSelect }) {
  const [search, setSearch] = useState('');
  const candidates = systemUsers
    .filter(u => u.id !== uid && u.status === 'active' && u.displayName)
    .filter(u => !search || u.displayName.includes(search) || u.email?.includes(search));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, width: 400, maxHeight: '78vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', direction: 'rtl' }}>
        <div style={{ padding: '15px 20px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>שיחה ישירה חדשה</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש שם או מייל..."
            autoFocus
            style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {candidates.map(u => {
            const initials = (u.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <button
                key={u.id}
                onClick={() => onSelect(u)}
                style={{ width: '100%', padding: '11px 16px', border: 'none', borderBottom: '1px solid #f8fafc', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{u.displayName}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{ROLE_ICONS[u.role]} {ROLE_LABELS[u.role] ?? u.role}</p>
                </div>
              </button>
            );
          })}
          {candidates.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>לא נמצאו משתמשים</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MessageThread ─────────────────────────────────────────────────────────────
function MessageThread({ room, messages, uid, displayName, currentRole, onSend }) {
  const [body,    setBody]    = useState('');
  const bottomRef = useRef(null);
  const textRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend() {
    if (!body.trim()) return;
    onSend(body);
    setBody('');
    if (textRef.current) { textRef.current.style.height = 'auto'; textRef.current.focus(); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const grouped = groupByDate(messages);

  const roomTitle = room.type === 'direct'
    ? Object.entries(room.names ?? {}).find(([id]) => id !== uid)?.[1] ?? room.name
    : room.name;

  const subtitle = room.type === 'project' ? 'קבוצת פרויקט' : room.type === 'group' ? 'קבוצה פנימית' : 'הודעה ישירה';
  const headerIcon = room.type === 'direct' ? (roomTitle || '?').slice(0, 2) : room.type === 'group' ? '👥' : '🏗️';
  const headerRadius = room.type === 'direct' ? '50%' : 10;
  const headerFontSize = room.type === 'direct' ? 13 : 20;

  const memberCount = room.participants?.length;

  return (
    <>
      <div style={{ padding: '13px 20px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: headerRadius, background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: headerFontSize, flexShrink: 0 }}>
          {headerIcon}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{roomTitle}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
            {subtitle}
            {memberCount > 0 && room.type !== 'direct' && ` · ${memberCount} חברים`}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column' }}>
        {grouped.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8' }}>
            <span style={{ fontSize: 40 }}>💬</span>
            <p style={{ margin: 0, fontSize: 14 }}>אין הודעות עדיין — שלח את הראשונה!</p>
          </div>
        )}
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px', direction: 'ltr' }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', padding: '2px 10px', background: '#f1f5f9', borderRadius: 99 }}>{fmtDate(date)}</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>
            {msgs.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMine={msg.fromId === uid}
                sameAuthor={i > 0 && msgs[i - 1].fromId === msg.fromId}
              />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 16px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
        <div style={{ flex: 1, background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', padding: '8px 14px', display: 'flex' }}>
          <textarea
            ref={textRef}
            value={body}
            onChange={e => {
              setBody(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="כתוב הודעה..."
            rows={1}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontSize: 14, color: '#0f172a', fontFamily: 'inherit', lineHeight: 1.5, minHeight: 22, maxHeight: 120, overflow: 'hidden', direction: 'rtl' }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!body.trim()}
          style={{ width: 42, height: 42, borderRadius: 12, border: 'none', cursor: body.trim() ? 'pointer' : 'default', background: body.trim() ? 'linear-gradient(135deg, #4fb8e0, #80cded)' : '#e2e8f0', color: body.trim() ? 'white' : '#94a3b8', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}
          title="שלח (Enter)"
        >
          ⬆
        </button>
      </div>
    </>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, sameAuthor }) {
  const initials = (msg.fromName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ display: 'flex', direction: 'ltr', justifyContent: isMine ? 'flex-end' : 'flex-start', marginTop: sameAuthor ? 2 : 10, alignItems: 'flex-end', gap: 7 }}>
      {!isMine && (
        sameAuthor
          ? <div style={{ width: 30, flexShrink: 0 }} />
          : <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{initials}</div>
      )}
      <div style={{ maxWidth: '64%' }}>
        {!sameAuthor && !isMine && (
          <p style={{ margin: '0 2px 3px', fontSize: 11, color: '#94a3b8', fontWeight: 600, direction: 'rtl' }}>
            {ROLE_ICONS[msg.fromRole]} {msg.fromName}
          </p>
        )}
        <div style={{ padding: '8px 13px', borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: isMine ? 'linear-gradient(135deg, #4fb8e0, #80cded)' : 'white', color: isMine ? 'white' : '#0f172a', fontSize: 14, lineHeight: 1.55, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'rtl' }}>
          {msg.body}
        </div>
        <p style={{ margin: '3px 2px 0', fontSize: 10, color: '#94a3b8', textAlign: isMine ? 'right' : 'left', direction: 'ltr' }}>
          {fmtTime(msg.sentAt)}
        </p>
      </div>
      {isMine && (
        sameAuthor
          ? <div style={{ width: 30, flexShrink: 0 }} />
          : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{initials}</div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dateStr) {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today)     return 'היום';
  if (dateStr === yesterday) return 'אתמול';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDate(messages) {
  const groups = {};
  for (const msg of messages) {
    const d = msg.sentAt.slice(0, 10);
    if (!groups[d]) groups[d] = [];
    groups[d].push(msg);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, msgs]) => ({ date, msgs }));
}
