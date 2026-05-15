const DOCS_KEY = 'constrak_docs';

export const DOC_PROJECTS = [];

export const DOC_CATEGORIES = [
  { id: 'plans',       label: 'תוכניות',    icon: '📐', color: '#3b82f6' },
  { id: 'contracts',   label: 'חוזים',      icon: '📜', color: '#8b5cf6' },
  { id: 'safety',      label: 'בטיחות',     icon: '🛡️', color: '#ef4444' },
  { id: 'invoices',    label: 'חשבוניות',   icon: '💳', color: '#f59e0b' },
  { id: 'inspections', label: 'בדיקות',     icon: '🔍', color: '#06b6d4' },
  { id: 'photos',      label: 'תמונות',     icon: '📸', color: '#ec4899' },
  { id: 'general',     label: 'כללי',       icon: '📁', color: '#64748b' },
];

export function loadDocs() {
  try {
    const stored = JSON.parse(localStorage.getItem(DOCS_KEY) || 'null');
    if (!stored) return { documents: [] };
    return { documents: stored.documents ?? [] };
  } catch {
    return { documents: [] };
  }
}

export function saveDocs(data) {
  localStorage.setItem(DOCS_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('constrak:docs'));
}

export function getCategoryInfo(id) {
  return DOC_CATEGORIES.find(c => c.id === id) ?? DOC_CATEGORIES[DOC_CATEGORIES.length - 1];
}

export function fmtDocSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function mimeLabel(mimeType, name) {
  if (!mimeType) return 'קובץ';
  if (mimeType.startsWith('image/')) return 'תמונה';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word') || name?.endsWith('.docx') || name?.endsWith('.doc')) return 'Word';
  if (mimeType.includes('sheet') || name?.endsWith('.xlsx') || name?.endsWith('.xls')) return 'Excel';
  if (mimeType.startsWith('audio/')) return 'שמע';
  if (mimeType.startsWith('video/')) return 'וידאו';
  if (name?.endsWith('.dwg') || name?.endsWith('.dxf')) return 'CAD';
  return 'קובץ';
}

export function mimeIcon(mimeType, name) {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.includes('word') || name?.endsWith('.docx') || name?.endsWith('.doc')) return '📝';
  if (mimeType.includes('sheet') || name?.endsWith('.xlsx') || name?.endsWith('.xls')) return '📊';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.startsWith('video/')) return '🎬';
  if (name?.endsWith('.dwg') || name?.endsWith('.dxf')) return '📐';
  return '📄';
}
