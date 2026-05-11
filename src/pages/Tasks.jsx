import { useState } from 'react';
import { tasks } from '../data/mockData';

const priorityColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const priorityLabels = { high: 'גבוה', medium: 'בינוני', low: 'נמוך' };

const columns = [
  { id: 'pending', label: '⏳ ממתין', color: 'bg-slate-200' },
  { id: 'inProgress', label: '🔄 בתהליך', color: 'bg-blue-200' },
  { id: 'done', label: '✅ הושלם', color: 'bg-green-200' },
];

function TaskCard({ task }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-3 cursor-pointer hover:shadow-md transition-shadow">
      <p className="font-medium text-slate-800 text-sm mb-1">{task.title}</p>
      <p className="text-xs text-slate-400 mb-2">{task.project}</p>
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${priorityColors[task.priority]}`}>
          {priorityLabels[task.priority]}
        </span>
        <span className="text-xs text-slate-400">📅 {task.due}</span>
      </div>
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-50">
        <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center text-xs font-bold text-orange-700">
          {task.assignee.charAt(0)}
        </div>
        <span className="text-xs text-slate-500">{task.assignee}</span>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [view, setView] = useState('kanban');

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setView('kanban')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'kanban' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            📋 קנבן
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            ☰ רשימה
          </button>
        </div>
        <button className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
          + משימה חדשה
        </button>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-3 gap-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="bg-slate-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-700 text-sm">{col.label}</span>
                  <span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-right">
                <th className="px-4 py-3 font-semibold text-slate-600">משימה</th>
                <th className="px-4 py-3 font-semibold text-slate-600">פרויקט</th>
                <th className="px-4 py-3 font-semibold text-slate-600">אחראי</th>
                <th className="px-4 py-3 font-semibold text-slate-600">עדיפות</th>
                <th className="px-4 py-3 font-semibold text-slate-600">סטטוס</th>
                <th className="px-4 py-3 font-semibold text-slate-600">תאריך יעד</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.title}</td>
                  <td className="px-4 py-3 text-slate-500">{t.project}</td>
                  <td className="px-4 py-3 text-slate-600">{t.assignee}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${priorityColors[t.priority]}`}>
                      {priorityLabels[t.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.status === 'done' ? 'bg-green-100 text-green-700' :
                      t.status === 'inProgress' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {{ done: 'הושלם', inProgress: 'בתהליך', pending: 'ממתין' }[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{t.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
