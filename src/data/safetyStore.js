const SAFETY_KEY = 'constrak_safety';

export const SAFETY_PROJECTS = [];

export function loadSafetyData() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAFETY_KEY) || 'null');
    if (!stored) return { rules: [], briefings: [], rulesVersion: 1 };
    return {
      rules:        stored.rules        ?? [],
      briefings:    stored.briefings    ?? [],
      rulesVersion: stored.rulesVersion ?? 1,
    };
  } catch {
    return { rules: [], briefings: [], rulesVersion: 1 };
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
