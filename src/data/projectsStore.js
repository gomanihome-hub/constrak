const PROJECTS_KEY = 'constrak_projects';

export function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || 'null') ?? [];
  } catch {
    return [];
  }
}

export function saveProjects(list) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('constrak:projects'));
}

export function generateProjectId() {
  return `proj-${Date.now()}`;
}
