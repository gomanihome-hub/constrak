import { projects, tasks, workers } from '../data/mockData';

const formatCurrency = (n) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

const statusColors = {
  active: 'bg-green-100 text-green-700',
  planning: 'bg-blue-100 text-blue-700',
  completed: 'bg-slate-100 text-slate-600',
  paused: 'bg-yellow-100 text-yellow-700',
};

const statusLabels = {
  active: 'פעיל',
  planning: 'תכנון',
  completed: 'הושלם',
  paused: 'מושהה',
};

const priorityColors = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const priorityLabels = { high: 'גבוה', medium: 'בינוני', low: 'נמוך' };

const taskStatusColors = {
  done: 'bg-green-100 text-green-700',
  inProgress: 'bg-blue-100 text-blue-700',
  pending: 'bg-slate-100 text-slate-600',
};

const taskStatusLabels = { done: 'הושלם', inProgress: 'בתהליך', pending: 'ממתין' };

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-3xl p-2 rounded-lg ${color}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const totalWorkers = workers.filter((w) => w.status === 'active').length;
  const openTasks = tasks.filter((t) => t.status !== 'done').length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🏗️" label="פרויקטים פעילים" value={activeProjects} sub={`מתוך ${projects.length} סה"כ`} color="bg-orange-50" />
        <StatCard icon="👷" label="עובדים פעילים" value={totalWorkers} sub="במגרשי העבודה" color="bg-blue-50" />
        <StatCard icon="✅" label="משימות פתוחות" value={openTasks} sub="דורשות טיפול" color="bg-yellow-50" />
        <StatCard icon="💰" label="סך תקציב" value={formatCurrency(totalBudget)} sub="בכל הפרויקטים" color="bg-green-50" />
      </div>

      {/* Projects overview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">סטטוס פרויקטים</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {projects.map((p) => (
            <div key={p.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status]}`}>
                    {statusLabels[p.status]}
                  </span>
                </div>
                <span className="text-sm text-slate-500">{p.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-orange-400 h-2 rounded-full transition-all"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                <span>📍 {p.location}</span>
                <span>👷 {p.workers} עובדים</span>
                <span>💰 {formatCurrency(p.spent)} / {formatCurrency(p.budget)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent tasks */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">משימות אחרונות</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {tasks.slice(0, 5).map((t) => (
            <div key={t.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{t.title}</p>
                <p className="text-xs text-slate-400">{t.project} · {t.assignee}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${priorityColors[t.priority]}`}>
                {priorityLabels[t.priority]}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${taskStatusColors[t.status]}`}>
                {taskStatusLabels[t.status]}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">{t.due}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
