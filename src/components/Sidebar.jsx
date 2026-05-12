import { useState, useEffect } from 'react';
import { useRoles, ROLES } from '../context/RolesContext';
import { getTotalUnreadForUser } from '../data/chatStore';

const ALL_NAV = [
  { id: 'dashboard', label: 'לוח בקרה',        icon: '🏠', permission: 'viewDashboard'  },
  { id: 'projects',  label: 'פרויקטים',         icon: '🏗️', permission: 'viewProjects'   },
  { id: 'tasks',     label: 'משימות',            icon: '✅', permission: 'viewTasks'      },
  { id: 'workers',   label: 'עובדים',            icon: '👷', permission: 'viewWorkers'    },
  { id: 'materials', label: 'חומרים',            icon: '📦', permission: 'viewMaterials'  },
  { id: 'worklog',   label: 'יומן עבודה יומי',  icon: '📋', permission: 'viewWorkLog'    },
  { id: 'messages',  label: 'הודעות',            icon: '💬', permission: 'sendMessage'    },
  { id: 'megaphone', label: 'מגפון',             icon: '📢', permission: 'sendBroadcast'  },
  { id: 'chat',      label: "צ'אט",              icon: '🗨️', permission: 'viewMessages'   },
  { id: 'safety',    label: 'תדרוך בטיחות',     icon: '🛡️', permission: 'viewSafety'     },
  { id: 'admin',     label: 'ניהול משתמשים',    icon: '⚙️', permission: 'viewAdminPanel' },
];

export default function Sidebar({ activePage, setActivePage }) {
  const [collapsed,    setCollapsed]    = useState(false);
  const [chatUnread,   setChatUnread]   = useState(0);
  const { can, currentSystemUser, currentRole } = useRoles();

  useEffect(() => {
    const uid = currentSystemUser?.id;
    if (!uid) return;
    function refresh() { setChatUnread(getTotalUnreadForUser(uid)); }
    refresh();
    window.addEventListener('constrak:chat', refresh);
    return () => window.removeEventListener('constrak:chat', refresh);
  }, [currentSystemUser?.id]);

  const visibleItems = ALL_NAV.filter(item => can[item.permission]);
  const roleInfo = ROLES[currentRole];
  const displayName = currentSystemUser?.displayName || 'משתמש';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} min-h-screen`}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <span className="font-bold text-xl" style={{ color: '#f3ce1f' }}>קונסטרק</span>
          </div>
        )}
        {collapsed && <span className="text-2xl mx-auto">🏛️</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-white transition-colors p-1 rounded">
          {collapsed ? '◀' : '▶'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        {visibleItems.map((item) => {
          const badge = item.id === 'chat' && chatUnread > 0 ? chatUnread : null;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${
                activePage === item.id
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              style={{ position: 'relative' }}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
              {badge && (
                <span style={{ marginRight: 'auto', background: '#4fb8e0', color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
                  {badge}
                </span>
              )}
              {badge && collapsed && (
                <span style={{ position: 'absolute', top: 6, left: 6, background: '#ef4444', color: 'white', borderRadius: 99, fontSize: 9, fontWeight: 700, padding: '1px 4px', minWidth: 14, textAlign: 'center' }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer with real user info */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: roleInfo?.color ?? '#f97316' }}
            >
              {initials || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span style={{ fontSize: 11 }}>{roleInfo?.icon}</span>
                <p className="text-xs text-slate-400 truncate">{roleInfo?.label}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="p-3 border-t border-slate-700 flex justify-center">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: roleInfo?.color ?? '#f97316' }}
            title={`${displayName} — ${roleInfo?.label}`}
          >
            {initials || '?'}
          </div>
        </div>
      )}
    </aside>
  );
}
