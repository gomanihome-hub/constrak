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

export function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch { return []; }
}

export function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}
