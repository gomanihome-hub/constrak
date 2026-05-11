export const TASKS_KEY = 'constrak_worker_tasks';

export const PRIORITY = {
  high:   { label: 'גבוה',   color: '#ef4444', bg: '#fef2f2' },
  medium: { label: 'בינוני', color: '#f59e0b', bg: '#fffbeb' },
  low:    { label: 'נמוך',   color: '#22c55e', bg: '#f0fdf4' },
};

export const STATUS = {
  pending:     { label: 'ממתין',    color: '#94a3b8', bg: '#f1f5f9' },
  in_progress: { label: 'בביצוע',  color: '#3b82f6', bg: '#eff6ff' },
  done:        { label: 'הושלם',   color: '#22c55e', bg: '#f0fdf4' },
};

export const SEED_TASKS = [
  {
    id: 'wtask-s001',
    title: 'צביעת קיר D4',
    description: 'צביעה לבנה, 2 שכבות, החומרים בסטור כניסה ב׳',
    assignedTo: 'worker-001', assignedToName: 'גבי מזרחי',
    assignedBy: 'sub-001',   assignedByName: 'דוד כהן',
    siteId: '1', status: 'pending', priority: 'high',
    dueDate: '2026-05-11', createdAt: '2026-05-11T07:00:00.000Z',
  },
  {
    id: 'wtask-s002',
    title: 'פינוי פסולת — אזור C',
    description: 'לפנות פסולת בנייה ולהעביר לקונטיינר הצהוב',
    assignedTo: 'worker-001', assignedToName: 'גבי מזרחי',
    assignedBy: 'sub-001',   assignedByName: 'דוד כהן',
    siteId: '1', status: 'in_progress', priority: 'medium',
    dueDate: '2026-05-12', createdAt: '2026-05-10T08:00:00.000Z',
  },
];

export function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) { saveTasks(SEED_TASKS); return [...SEED_TASKS]; }
    const stored = JSON.parse(raw);
    const ids = new Set(stored.map(t => t.id));
    const extras = SEED_TASKS.filter(t => !ids.has(t.id));
    return [...stored, ...extras].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch { return [...SEED_TASKS]; }
}

export function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}
