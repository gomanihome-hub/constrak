import { useState, useMemo } from 'react';
import { useRoles } from '../context/RolesContext';
import {
  loadMsgs, saveMsgs, isVisibleTo, markRead,
  scopeLabel, roleLabel, PROJECTS, SITES,
} from '../data/messagesStore';

const ROLE_ICON = {
  admin: '👑', project_manager: '📊', site_manager: '🦺',
  subcontractor: '🔨', worker: '👷',
};

export default function Messages() {
  const { currentSystemUser, currentRole, can, systemUsers } = useRoles();
  const [msgs, setMsgs]         = useState(() => loadMsgs());
  const [selected, setSelected] = useState(null);
  const [tab, setTab]           = useState('inbox'); // 'inbox' | 'sent'
  const [composing, setComposing] = useState(false);

  const uid = currentSystemUser?.id;

  const inbox = useMemo(() =>
    msgs.filter(m => isVisibleTo(m, currentSystemUser, currentRole))
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [msgs, currentSystemUser, currentRole]
  );

  const sent = useMemo(() =>
    msgs.filter(m => m.fromId === uid).sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [msgs, uid]
  );

  const list      = tab === 'inbox' ? inbox : sent;
  const unreadCnt = inbox.filter(m => !m.readBy.includes(uid)).length;

  function handleSelect(msg) {
    setSelected(msg);
    if (!msg.readBy.includes(uid)) {
      const updated = markRead(msgs, msg.id, uid);
      setMsgs(updated);
      saveMsgs(updated);
    }
  }

  function handleSend(data) {
    const newMsg = {
      id: `msg-${Date.now()}`,
      fromId: uid,
      fromName: currentSystemUser?.displayName ?? '',
      fromRole: currentRole,
      ...data,
      sentAt: new Date().toISOString(),
      readBy: [uid],
    };
    const updated = [newMsg, ...msgs];
    setMsgs(updated);
    saveMsgs(updated);
    setComposing(false);
    setTab('sent');
    setSelected(newMsg);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {composing && (
        <ComposeModal
          currentRole={currentRole}
          currentSystemUser={currentSystemUser}
          systemUsers={systemUsers}
          onSend={handleSend}
          onClose={() => setComposing(false)}
        />
      )}

      {/* Toolbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 2 }}>
          <TabBtn active={tab === 'inbox'} onClick={() => setTab('inbox')}>
            📥 דואר נכנס {unreadCnt > 0 && (
              <span style={{ background: '#ef4444', color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px', marginRight: 4 }}>{unreadCnt}</span>
            )}
          </TabBtn>
          <TabBtn active={tab === 'sent'} onClick={() => setTab('sent')}>📤 נשלח</TabBtn>
        </div>
        {can.sendMessage ? (
          <button
            onClick={() => setComposing(true)}
            style={{ marginRight: 'auto', padding: '8px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,184,224,0.4)' }}
          >
            + הודעה חדשה
          </button>
        ) : <div style={{ flex: 1 }} />}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* List panel */}
        <div style={{ width: 340, borderLeft: '1px solid #e2e8f0', background: 'white', overflowY: 'auto', flexShrink: 0 }}>
          {list.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              <p style={{ margin: 0, fontSize: 14 }}>אין הודעות</p>
            </div>
          )}
          {list.map(msg => {
            const isUnread = !msg.readBy.includes(uid);
            const isActive = selected?.id === msg.id;
            return (
              <button
                key={msg.id}
                onClick={() => handleSelect(msg)}
                style={{
                  width: '100%', textAlign: 'right', padding: '14px 16px', border: 'none',
                  borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                  background: isActive ? '#eff6ff' : isUnread ? '#fafeff' : 'white',
                  borderRight: isActive ? '3px solid #4fb8e0' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: isUnread ? 700 : 600, color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isUnread && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', marginLeft: 6 }} />}
                    {msg.subject}
                  </span>
                  <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(msg.sentAt).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11 }}>{ROLE_ICON[msg.fromRole] ?? '👤'}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{msg.fromName}</span>
                  <span style={{ fontSize: 10, color: '#cbd5e1', marginRight: 'auto' }}>{scopeLabel(msg)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {!selected ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>💬</div>
              <p style={{ margin: 0, fontSize: 15 }}>בחר הודעה לצפייה</p>
            </div>
          ) : (
            <div style={{ maxWidth: 620 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{selected.subject}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {ROLE_ICON[selected.fromRole] ?? '👤'}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>{selected.fromName}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{roleLabel(selected.fromRole)}</p>
                </div>
                <div style={{ marginRight: 'auto', textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{scopeLabel(selected)}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1' }}>
                    {new Date(selected.sentAt).toLocaleString('he-IL', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {selected.body}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center',
        background: active ? 'white' : 'transparent',
        color: active ? '#1e293b' : '#64748b',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

// ── Compose modal ─────────────────────────────────────────────────────────────
function ComposeModal({ currentRole, currentSystemUser, systemUsers, onSend, onClose }) {
  const [form, setForm] = useState({ toScope: 'broadcast', toId: '', subject: '', body: '' });

  // Scope options by role
  const scopeOptions = buildScopeOptions(currentRole, currentSystemUser, systemUsers);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleScopeChange(value) {
    const [scope, id] = value.split(':');
    setForm(f => ({ ...f, toScope: scope, toId: id ?? null }));
  }

  const scopeVal = form.toId ? `${form.toScope}:${form.toId}` : form.toScope;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) return;
    onSend({ toScope: form.toScope, toId: form.toId || null, subject: form.subject, body: form.body });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>הודעה חדשה</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 22 }}>
          <CField label="נמענים">
            <select value={scopeVal} onChange={e => handleScopeChange(e.target.value)} style={iS}>
              {scopeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </CField>
          <CField label="נושא">
            <input value={form.subject} onChange={e => set('subject', e.target.value)} required style={iS} placeholder="נושא ההודעה..." />
          </CField>
          <CField label="תוכן ההודעה">
            <textarea value={form.body} onChange={e => set('body', e.target.value)} required rows={5} style={{ ...iS, resize: 'vertical' }} placeholder="כתוב את ההודעה כאן..." />
          </CField>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0', background: 'transparent', color: '#374151', fontSize: 14, cursor: 'pointer' }}>ביטול</button>
            <button type="submit" style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #4fb8e0, #80cded)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>שלח</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function buildScopeOptions(role, su, systemUsers) {
  const opts = [];
  if (role === 'admin') {
    opts.push({ value: 'broadcast', label: '📢 כל המשתמשים' });
    PROJECTS.forEach(p => opts.push({ value: `project:${p.id}`, label: `🏗️ ${p.name}` }));
    SITES.forEach(s => opts.push({ value: `site:${s.id}`, label: `📍 ${s.name}` }));
    systemUsers.forEach(u => {
      if (u.id !== su?.id) opts.push({ value: `user:${u.id}`, label: `👤 ${u.displayName}` });
    });
    return opts;
  }
  if (role === 'project_manager') {
    opts.push({ value: 'broadcast', label: '📢 כל חברי הפרויקטים שלי' });
    (su?.assignedProjects ?? []).forEach(pid => {
      const p = PROJECTS.find(x => x.id === pid);
      if (p) opts.push({ value: `project:${p.id}`, label: `🏗️ ${p.name}` });
    });
    systemUsers
      .filter(u => u.id !== su?.id && (u.assignedProjects ?? []).some(pid => (su?.assignedProjects ?? []).includes(pid)))
      .forEach(u => opts.push({ value: `user:${u.id}`, label: `👤 ${u.displayName}` }));
    return opts;
  }
  if (role === 'site_manager') {
    if (su?.assignedSite) {
      const s = SITES.find(x => x.id === su.assignedSite);
      if (s) opts.push({ value: `site:${s.id}`, label: `📍 ${s.name}` });
    }
    systemUsers
      .filter(u => u.id !== su?.id && u.assignedSite === su?.assignedSite)
      .forEach(u => opts.push({ value: `user:${u.id}`, label: `👤 ${u.displayName}` }));
    return opts;
  }
  return [{ value: 'broadcast', label: '📢 שלח הודעה' }];
}

function CField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const iS = {
  width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #e2e8f0',
  fontSize: 14, color: '#1e293b', background: '#f8fafc', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
