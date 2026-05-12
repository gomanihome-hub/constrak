import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import {
  loadChatData, saveChatData, ensureProjectRoom, ensureDirectRoom,
  addChatMessage, markChatRead, getUnreadCount, CHAT_PROJECTS,
} from '../data/chatStore';

const ROLE_ICONS  = { admin: '👑', project_manager: '📊', site_manager: '🦺', subcontractor: '🔨', worker: '👷' };
const ROLE_LABELS = { admin: 'מנהל מערכת', project_manager: 'מנהל פרויקט', site_manager: 'מנהל עבודה', subcontractor: 'קבלן משנה', worker: 'פועל' };

export default function Chat() {
  const { user } = useAuth();
  const { currentSystemUser, currentRole, systemUsers } = useRoles();

  const uid         = currentSystemUser?.id ?? user?.uid ?? '';
  const displayName = currentSystemUser?.displayName || user?.displayName || 'משתמש';

  const [chatData,   setChatData]   = useState(() => loadChatData());
  const [activeRoom, setActiveRoom] = useState(null);
  const [showNewDM,  setShowNewDM]  = useState(false);
  const [dmSearch,   setDmSearch]   = useState('');

  useEffect(() => {
    function reload() { setChatData(loadChatData()); }
    window.addEventListener('constrak:chat', reload);
    return () => window.removeEventListener('constrak:chat', reload);
  }, []);

  // Seed / ensure project rooms for this user
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
      if (r.type === 'project') return currentRole === 'admin' || assignedIds.includes(r.projectId);
      if (r.type === 'direct')  return r.participants?.includes(uid);
      return false;
    });
  }, [chatData.rooms, currentRole, currentSystemUser, uid]);

  const projectRooms = visibleRooms.filter(r => r.type === 'project');
  const directRooms  = visibleRooms.filter(r => r.type === 'direct');

  const activeMessages = activeRoom ? (chatData.messages[activeRoom] ?? []) : [];
  const activeRoomObj  = activeRoom ? chatData.rooms[activeRoom] : null;

  function openRoom(roomId) {
    setActiveRoom(roomId);
    const data = loadChatData();
    markChatRead(data, roomId, uid);
    saveChatData(data);
    setChatData(loadChatData());
  }

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

  function startDM(target) {
    const data = loadChatData();
    const roomId = ensureDirectRoom(data, uid, target.id, displayName, target.displayName);
    saveChatData(data);
    setChatData(loadChatData());
    setActiveRoom(roomId);
    setShowNewDM(false);
    setDmSearch('');
  }

  const dmCandidates = systemUsers
    .filter(u => u.id !== uid && u.status === 'active' && u.displayName)
    .filter(u => !dmSearch || u.displayName.includes(dmSearch) || u.email?.includes(dmSearch));

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', direction: 'rtl', overflow: 'hidden' }}>

      {/* ── Room list ── */}
      <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: 'white' }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>צ&apos;אט</h2>
          <button
            onClick={() => setShowNewDM(true)}
            style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#4fb8e0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            + DM
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {projectRooms.length > 0 && (
            <section>
              <p style={{ margin: 0, padding: '10px 16px 4px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.4 }}>קבוצות פרויקט</p>
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
            </section>
          )}

          {directRooms.length > 0 && (
            <section>
              <p style={{ margin: 0, padding: '10px 16px 4px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.4 }}>הודעות ישירות</p>
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
            </section>
          )}

          {visibleRooms.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
              <p style={{ margin: 0, fontSize: 13 }}>אין שיחות זמינות</p>
            </div>
          )}
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
            <p style={{ margin: 0, fontSize: 14 }}>בחר שיחה מהרשימה או פתח הודעה ישירה</p>
          </div>
        )}
      </div>

      {/* ── New DM modal ── */}
      {showNewDM && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, width: 400, maxHeight: '78vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '15px 20px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>הודעה ישירה חדשה</h3>
              <button onClick={() => { setShowNewDM(false); setDmSearch(''); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <input
                value={dmSearch}
                onChange={e => setDmSearch(e.target.value)}
                placeholder="חפש שם או מייל..."
                autoFocus
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {dmCandidates.map(u => (
                <button
                  key={u.id}
                  onClick={() => startDM(u)}
                  style={{ width: '100%', padding: '11px 16px', border: 'none', borderBottom: '1px solid #f8fafc', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {(u.displayName || '?').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{u.displayName}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{ROLE_ICONS[u.role]} {ROLE_LABELS[u.role] ?? u.role}</p>
                  </div>
                </button>
              ))}
              {dmCandidates.length === 0 && (
                <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>לא נמצאו משתמשים</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── RoomItem ──────────────────────────────────────────────────────────────────
function RoomItem({ room, active, unread, lastMsg, uid, onClick, isDM }) {
  const initials = (room.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '11px 16px', border: 'none', cursor: 'pointer', textAlign: 'right',
        background: active ? '#f0f9ff' : 'white',
        borderRight: `3px solid ${active ? '#4fb8e0' : 'transparent'}`,
        borderBottom: '1px solid #f8fafc',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: isDM ? '50%' : 12, background: active ? 'linear-gradient(135deg, #4fb8e0, #80cded)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: isDM ? 13 : 20, color: active ? 'white' : '#64748b', fontWeight: 700 }}>
        {isDM ? initials : '🏗️'}
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

  return (
    <>
      <div style={{ padding: '13px 20px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: room.type === 'direct' ? '50%' : 10, background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: room.type === 'direct' ? 13 : 20, flexShrink: 0 }}>
          {room.type === 'direct' ? (roomTitle || '?').slice(0, 2) : '🏗️'}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{roomTitle}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{room.type === 'project' ? 'קבוצת פרויקט' : 'הודעה ישירה'}</p>
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
        <div style={{
          padding: '8px 13px',
          borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isMine ? 'linear-gradient(135deg, #4fb8e0, #80cded)' : 'white',
          color: isMine ? 'white' : '#0f172a',
          fontSize: 14, lineHeight: 1.55,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          direction: 'rtl',
        }}>
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
