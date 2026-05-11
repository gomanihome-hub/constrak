import { materials } from '../data/mockData';

const formatCurrency = (n) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

export default function Materials() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="חיפוש חומר..."
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 w-48"
          />
        </div>
        <button className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
          + חומר חדש
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{materials.length}</p>
          <p className="text-sm text-slate-500 mt-1">סוגי חומרים</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">
            {materials.filter((m) => m.used / m.quantity > 0.8).length}
          </p>
          <p className="text-sm text-slate-500 mt-1">רמת מלאי נמוכה</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(materials.reduce((s, m) => s + m.cost * m.quantity, 0))}
          </p>
          <p className="text-sm text-slate-500 mt-1">ערך מלאי כולל</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-right">
              <th className="px-4 py-3 font-semibold text-slate-600">שם חומר</th>
              <th className="px-4 py-3 font-semibold text-slate-600">יחידה</th>
              <th className="px-4 py-3 font-semibold text-slate-600">כמות במלאי</th>
              <th className="px-4 py-3 font-semibold text-slate-600">בשימוש</th>
              <th className="px-4 py-3 font-semibold text-slate-600">עלות ליחידה</th>
              <th className="px-4 py-3 font-semibold text-slate-600">מצב מלאי</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {materials.map((m) => {
              const pct = Math.round((m.used / m.quantity) * 100);
              const isLow = pct > 80;
              return (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                  <td className="px-4 py-3 text-slate-500">{m.unit}</td>
                  <td className="px-4 py-3 text-slate-700">{m.quantity}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-16">
                        <div
                          className={`h-2 rounded-full ${isLow ? 'bg-red-400' : 'bg-orange-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatCurrency(m.cost)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isLow ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {isLow ? '⚠️ מלאי נמוך' : '✓ תקין'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
