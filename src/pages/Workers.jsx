import { workers } from '../data/mockData';

const roleColors = {
  'קבלן ראשי': 'bg-purple-100 text-purple-700',
  'מהנדסת': 'bg-blue-100 text-blue-700',
  'מהנדס': 'bg-blue-100 text-blue-700',
  'חשמלאי': 'bg-yellow-100 text-yellow-700',
  'אדריכלית': 'bg-pink-100 text-pink-700',
  'פועל בניין': 'bg-slate-100 text-slate-600',
};

export default function Workers() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="חיפוש עובד..."
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 w-48"
          />
        </div>
        <button className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
          + עובד חדש
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {workers.map((w) => (
          <div key={w.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                {w.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{w.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[w.role] || 'bg-slate-100 text-slate-600'}`}>
                  {w.role}
                </span>
              </div>
              <div className="mr-auto">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  w.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {w.status === 'active' ? '● פעיל' : '○ לא פעיל'}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <span>🏗️</span>
                <span>{w.project}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span>📞</span>
                <span dir="ltr" className="font-mono text-sm">{w.phone}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
              <button className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                פרטים
              </button>
              <button className="flex-1 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                עריכה
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
