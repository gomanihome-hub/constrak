import { useState } from 'react';
import { projects } from '../data/mockData';

const formatCurrency = (n) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

const statusColors = {
  active: 'bg-green-100 text-green-700 border-green-200',
  planning: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  paused: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const statusLabels = { active: 'פעיל', planning: 'תכנון', completed: 'הושלם', paused: 'מושהה' };

export default function Projects() {
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('cards');

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter);

  return (
    <div className="p-6 space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {['all', 'active', 'planning', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {{ all: 'הכל', active: 'פעיל', planning: 'תכנון', completed: 'הושלם' }[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('cards')}
            className={`p-2 rounded-lg text-sm ${view === 'cards' ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-500 border border-slate-200'}`}
          >
            ⊞
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-lg text-sm ${view === 'list' ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-500 border border-slate-200'}`}
          >
            ☰
          </button>
          <button className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
            + פרויקט חדש
          </button>
        </div>
      </div>

      {/* Cards */}
      {view === 'cards' ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{p.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">📍 {p.location}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColors[p.status]}`}>
                  {statusLabels[p.status]}
                </span>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>התקדמות</span>
                  <span>{p.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className="bg-orange-400 h-2.5 rounded-full"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>

              {/* Budget */}
              <div className="mb-4 bg-slate-50 rounded-lg p-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>תקציב</span>
                  <span>{Math.round((p.spent / p.budget) * 100)}% נוצל</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-slate-700">{formatCurrency(p.spent)}</span>
                  <span className="text-slate-400">/ {formatCurrency(p.budget)}</span>
                </div>
              </div>

              {/* Tasks */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center bg-green-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-green-600">{p.tasks.done}</p>
                  <p className="text-xs text-green-500">הושלמו</p>
                </div>
                <div className="text-center bg-blue-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-blue-600">{p.tasks.inProgress}</p>
                  <p className="text-xs text-blue-500">בתהליך</p>
                </div>
                <div className="text-center bg-slate-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-slate-600">{p.tasks.pending}</p>
                  <p className="text-xs text-slate-400">ממתינות</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-100 pt-3">
                <span>👷 {p.manager}</span>
                <span>🗓️ {p.endDate}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-right">
                <th className="px-4 py-3 font-semibold text-slate-600">שם פרויקט</th>
                <th className="px-4 py-3 font-semibold text-slate-600">מנהל</th>
                <th className="px-4 py-3 font-semibold text-slate-600">סטטוס</th>
                <th className="px-4 py-3 font-semibold text-slate-600">התקדמות</th>
                <th className="px-4 py-3 font-semibold text-slate-600">תקציב</th>
                <th className="px-4 py-3 font-semibold text-slate-600">תאריך סיום</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.location}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.manager}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status]}`}>
                      {statusLabels[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-16">
                        <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-8">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(p.budget)}</td>
                  <td className="px-4 py-3 text-slate-500">{p.endDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
