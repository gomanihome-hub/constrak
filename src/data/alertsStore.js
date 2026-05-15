import { subcontractors } from './mockData';

const ALERT_KEY = 'constrak_alerts';

export const ALERT_PROJECTS = [];

// Maps WorkLog/mockData project names → alert project IDs
const PROJECT_NAME_TO_ID = {
  'פרויקט מגדל הים':    '1',
  'שיפוץ בית ספר אלון': '2',
  'מרכז קניות הצפון':   '3',
};

export const ALERT_TYPE_INFO = {
  missing_day_plan: { label: 'תכנון יומי חסר',       icon: '🌅', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  missing_work_log: { label: 'דוח עבודה חסר',         icon: '📋', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  report_approval:  { label: 'דוח ממתין לאישורך',     icon: '✍️', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
};

export const DEFAULT_SETTINGS = {
  globalEnabled: true,
  dayPlanTime:   '09:00',
  workLogTime:   '18:00',
  projects: {},
};

// ─── Storage ──────────────────────────────────────────────────────────────────
export function loadAlerts() {
  try {
    const stored = JSON.parse(localStorage.getItem(ALERT_KEY) || 'null');
    if (!stored) {
      return { settings: DEFAULT_SETTINGS, notifications: [], lastRun: {} };
    }
    return {
      settings: {
        ...DEFAULT_SETTINGS,
        ...stored.settings,
        projects: { ...DEFAULT_SETTINGS.projects, ...(stored.settings?.projects ?? {}) },
      },
      notifications: stored.notifications ?? [],
      lastRun:        stored.lastRun        ?? {},
    };
  } catch {
    return { settings: DEFAULT_SETTINGS, notifications: [], lastRun: {} };
  }
}

export function saveAlerts(data) {
  localStorage.setItem(ALERT_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('constrak:alerts'));
}

export function getUnreadAlertCount(userId) {
  try {
    const { notifications } = loadAlerts();
    return notifications.filter(n => !n.dismissed && !(n.readBy ?? []).includes(userId)).length;
  } catch { return 0; }
}

// ─── Alert engine ─────────────────────────────────────────────────────────────
// Uses same seed logic as WorkLog.buildEntries for consistent "submitted" results
function wasReported(contractorIndex, date, type) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const isToday = date.toDateString() === new Date().toDateString();
  if (type === 'workLog') {
    // Same as WorkLog: today indices 0,1,2,5,7,9,10 reported; past: (seed + i*13) % 10 >= 4
    const todayReported = new Set([0, 1, 2, 5, 7, 9, 10]);
    return isToday ? todayReported.has(contractorIndex) : ((seed + contractorIndex * 13) % 10) >= 4;
  }
  // Day plan – slightly different (more reported)
  const todayPlanReported = new Set([0, 1, 2, 3, 5, 6, 7, 9, 10]);
  return isToday ? todayPlanReported.has(contractorIndex) : ((seed + contractorIndex * 17) % 10) >= 3;
}

export function runAlertEngine() {
  const data    = loadAlerts();
  const now     = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowTime  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const { settings, notifications, lastRun } = data;

  if (!settings.globalEnabled) return;

  const newNotifs  = [];
  let   runChanged = false;

  for (const [projectId, pSettings] of Object.entries(settings.projects ?? {})) {
    if (!pSettings.enabled) continue;
    const projectName = ALERT_PROJECTS.find(p => p.id === projectId)?.name ?? projectId;
    // Get subcontractors assigned to this project
    const subs = subcontractors
      .map((sc, i) => ({ sc, i }))
      .filter(({ sc }) => PROJECT_NAME_TO_ID[sc.project] === projectId);

    // ── Day plan check ───────────────────────────────────────────────────────
    const dpTime   = pSettings.customDayPlanTime || settings.dayPlanTime;
    const dpRunKey = `dayPlan::${projectId}::${todayStr}`;
    if (pSettings.dayPlanEnabled && nowTime >= dpTime && !lastRun[dpRunKey]) {
      subs.forEach(({ sc, i }) => {
        if (!wasReported(i, now, 'dayPlan')) {
          newNotifs.push({
            id: `notif-dp-${projectId}-${sc.id}-${Date.now() + i}`,
            type: 'missing_day_plan',
            projectId, projectName,
            contractorId: sc.id, contractorName: sc.name, contractorTrade: sc.trade,
            date: todayStr, triggeredAt: now.toISOString(), readBy: [], dismissed: false,
          });
        }
      });
      lastRun[dpRunKey] = true;
      runChanged = true;
    }

    // ── Work log check ───────────────────────────────────────────────────────
    const wlTime   = pSettings.customWorkLogTime || settings.workLogTime;
    const wlRunKey = `workLog::${projectId}::${todayStr}`;
    if (pSettings.workLogEnabled && nowTime >= wlTime && !lastRun[wlRunKey]) {
      subs.forEach(({ sc, i }) => {
        if (!wasReported(i, now, 'workLog')) {
          newNotifs.push({
            id: `notif-wl-${projectId}-${sc.id}-${Date.now() + i}`,
            type: 'missing_work_log',
            projectId, projectName,
            contractorId: sc.id, contractorName: sc.name, contractorTrade: sc.trade,
            date: todayStr, triggeredAt: now.toISOString(), readBy: [], dismissed: false,
          });
        }
      });
      lastRun[wlRunKey] = true;
      runChanged = true;
    }
  }

  if (newNotifs.length > 0 || runChanged) {
    saveAlerts({ ...data, notifications: [...notifications, ...newNotifs], lastRun });
  }
}
