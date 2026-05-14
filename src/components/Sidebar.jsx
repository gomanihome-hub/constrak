import { useState, useEffect } from 'react';
import { useRoles, ROLES } from '../context/RolesContext';
import { getTotalUnreadForUser } from '../data/chatStore';
import { getUnreadAlertCount } from '../data/alertsStore';

const ALL_NAV = [
  { id: 'dashboard',     label: 'לוח בקרה',        icon: '🏠', permission: 'viewDashboard'     },
  { id: 'projects',      label: 'פרויקטים',         icon: '🏗️', permission: 'viewProjects'      },
  { id: 'tasks',         label: 'משימות',            icon: '✅', permission: 'viewTasks'         },
  { id: 'workers',       label: 'עובדים',            icon: '👷', permission: 'viewWorkers'       },
  { id: 'materials',     label: 'חומרים',            icon: '📦', permission: 'viewMaterials'     },
  { id: 'worklog',       label: 'יומן עבודה יומי',  icon: '📋', permission: 'viewWorkLog'       },
  { id: 'notifications', label: 'התראות',            icon: '🔔', permission: 'viewNotifications' },
  { id: 'messages',      label: 'הודעות',            icon: '💬', permission: 'sendMessage'       },
  { id: 'megaphone',     label: 'מגפון',             icon: '📢', permission: 'sendBroadcast'     },
  { id: 'chat',          label: "צ'אט",              icon: '🗨️', permission: 'viewMessages'      },
  { id: 'receiving',     label: 'קבלת חומרים',      icon: '📥', permission: 'viewReceiving'     },
  { id: 'safety',        label: 'תדרוך בטיחות',     icon: '🛡️', permission: 'viewSafety'        },
  { id: 'documents',     label: 'מסמכי פרויקט',     icon: '📁', permission: 'viewDocuments'     },
  { id: 'admin',         label: 'ניהול משתמשים',    icon: '⚙️', permission: 'viewAdminPanel'    },
];

export default function Sidebar({ activePage, setActivePage }) {
  const [collapsed,    setCollapsed]    = useState(false);
  const [chatUnread,   setChatUnread]   = useState(0);
  const [alertUnread,  setAlertUnread]  = useState(0);
  const { can, currentSystemUser, currentRole } = useRoles();

  const uid = currentSystemUser?.id;

  useEffect(() => {
    if (!uid) return;
    function refreshChat()  { setChatUnread(getTotalUnreadForUser(uid)); }
    function refreshAlerts(){ setAlertUnread(getUnreadAlertCount(uid)); }
    refreshChat(); refreshAlerts();
    window.addEventListener('constrak:chat',   refreshChat);
    window.addEventListener('constrak:alerts', refreshAlerts);
    return () => {
      window.removeEventListener('constrak:chat',   refreshChat);
      window.removeEventListener('constrak:alerts', refreshAlerts);
    };
  }, [uid]);

  const visibleItems = ALL_NAV.filter(item => can[item.permission]);
  const roleInfo   = ROLES[currentRole];
  const displayName = currentSystemUser?.displayName || 'משתמש';
  const initials   = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  function getBadge(item) {
    if (item.id === 'chat'          && chatUnread  > 0) return { count: chatUnread,  color: '#4fb8e0' };
    if (item.id === 'notifications' && alertUnread > 0) return { count: alertUnread, color: '#ef4444' };
    return null;
  }

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
          const badge = getBadge(item);
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
              {badge && !collapsed && (
                <span style={{ marginRight: 'auto', background: badge.color, color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 7px', minWidth: 18, textAlign: 'center' }}>
                  {badge.count}
                </span>
              )}
              {badge && collapsed && (
                <span style={{ position: 'absolute', top: 6, left: 6, background: badge.color, color: 'white', borderRadius: 99, fontSize: 9, fontWeight: 700, padding: '1px 4px', minWidth: 14, textAlign: 'center' }}>
                  {badge.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer – user info, click → profile */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => setActivePage('profile')}
            className="w-full flex items-center gap-3 rounded-lg p-1 hover:bg-slate-800 transition-colors text-right"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
            title="הפרופיל שלי"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: roleInfo?.color ?? '#f97316' }}
            >
              {initials || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span style={{ fontSize: 11 }}>{roleInfo?.icon}</span>
                <p className="text-xs text-slate-400 truncate">{roleInfo?.label}</p>
              </div>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>›</span>
          </button>
        </div>
      )}
      {collapsed && (
        <div className="p-3 border-t border-slate-700 flex justify-center">
          <button
            onClick={() => setActivePage('profile')}
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm hover:ring-2 hover:ring-slate-400 transition-all"
            style={{ background: roleInfo?.color ?? '#f97316', border: 'none', cursor: 'pointer', color: 'white' }}
            title={`${displayName} — ${roleInfo?.label} — הפרופיל שלי`}
          >
            {initials || '?'}
          </button>
        </div>
      )}
    </aside>
  );
}
