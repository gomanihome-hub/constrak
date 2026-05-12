const SAFETY_KEY = 'constrak_safety';

export const SAFETY_PROJECTS = [
  { id: '1', name: 'מגדל רמת גן' },
  { id: '2', name: 'מרכז מסחרי תל אביב' },
  { id: '3', name: 'וילות הרצליה פיתוח' },
];

export const SEED_RULES = [
  { id: 'sr-01', text: 'חובת נשיאת ציוד מגן אישי — קסדה, נעלי בטיחות ואפוד זוהר בכל עת',             order: 1,  active: true },
  { id: 'sr-02', text: 'איסור מוחלט על עבודה בגובה מעל 2 מטר ללא רתמת בטיחות מאושרת',               order: 2,  active: true },
  { id: 'sr-03', text: 'שימוש בכלי עבודה ובמכונות רק לאחר הכשרה ייעודית ואישור ממונה',              order: 3,  active: true },
  { id: 'sr-04', text: 'דיווח מיידי לממונה על כל תאונה, כמעט-תאונה, אירוע חריג או מצב מסוכן',       order: 4,  active: true },
  { id: 'sr-05', text: 'איסור מוחלט על שימוש בסמים, אלכוהול או תרופות משפיעות במהלך העבודה',        order: 5,  active: true },
  { id: 'sr-06', text: 'שמירה על סדר וניקיון מתמיד — פינוי פסולת בנייה לאתרים מיועדים בלבד',       order: 6,  active: true },
  { id: 'sr-07', text: 'הכרת מיקום תחנות עזרה ראשונה, מטפי האש ונתיבי הפינוי והחירום',              order: 7,  active: true },
  { id: 'sr-08', text: 'איסור כניסה לאזורים מגודרים, מוגבלים או מסוכנים ללא אישור בכתב',           order: 8,  active: true },
  { id: 'sr-09', text: 'חובת פינוי מסלול ההרמה לפני הפעלת עגורן, מנוף או ציוד הרמה אחר',           order: 9,  active: true },
  { id: 'sr-10', text: 'שמירה על מרחק בטוח של לפחות 3 מטר מציוד כבד, כלי רכב ומכונות בפעולה',     order: 10, active: true },
];

export function loadSafetyData() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAFETY_KEY) || 'null');
    if (!stored) return { rules: SEED_RULES.map(r => ({ ...r })), briefings: [], rulesVersion: 1 };
    return {
      rules:        stored.rules        ?? SEED_RULES.map(r => ({ ...r })),
      briefings:    stored.briefings    ?? [],
      rulesVersion: stored.rulesVersion ?? 1,
    };
  } catch {
    return { rules: SEED_RULES.map(r => ({ ...r })), briefings: [], rulesVersion: 1 };
  }
}

export function saveSafetyData(data) {
  localStorage.setItem(SAFETY_KEY, JSON.stringify(data));
}

export function getActiveRules(data) {
  return (data.rules ?? []).filter(r => r.active).sort((a, b) => a.order - b.order);
}

// Returns the most recent briefing per worker+project whose rulesVersion is outdated
export function getStaleWorkers(data) {
  const current = data.rulesVersion ?? 1;
  const latest  = {};
  for (const b of data.briefings ?? []) {
    const key = `${b.workerId}::${b.projectId}`;
    if (!latest[key] || b.signedAt > latest[key].signedAt) latest[key] = b;
  }
  return Object.values(latest).filter(b => (b.rulesVersion ?? 0) < current);
}
