const DOCS_KEY = 'constrak_docs';

export const DOC_PROJECTS = [
  { id: '1', name: 'מגדל רמת גן' },
  { id: '2', name: 'מרכז מסחרי תל אביב' },
  { id: '3', name: 'וילות הרצליה פיתוח' },
];

export const DOC_CATEGORIES = [
  { id: 'plans',       label: 'תוכניות',    icon: '📐', color: '#3b82f6' },
  { id: 'contracts',   label: 'חוזים',      icon: '📜', color: '#8b5cf6' },
  { id: 'safety',      label: 'בטיחות',     icon: '🛡️', color: '#ef4444' },
  { id: 'invoices',    label: 'חשבוניות',   icon: '💳', color: '#f59e0b' },
  { id: 'inspections', label: 'בדיקות',     icon: '🔍', color: '#06b6d4' },
  { id: 'photos',      label: 'תמונות',     icon: '📸', color: '#ec4899' },
  { id: 'general',     label: 'כללי',       icon: '📁', color: '#64748b' },
];

export const SEED_DOCUMENTS = [
  {
    id: 'doc-001',
    name: 'תוכנית קומה 5 — מגדל רמת גן',
    projectId: '1',
    category: 'plans',
    mimeType: 'application/pdf',
    sizeBytes: 204800,
    uploadedBy: 'pm-001',
    uploaderName: 'יוסי כהן',
    uploadedAt: '2026-05-01T09:00:00.000Z',
    currentVersion: 1,
    versions: [
      { version: 1, dataUrl: null, uploadedAt: '2026-05-01T09:00:00.000Z', uploadedBy: 'pm-001', uploaderName: 'יוסי כהן', note: 'גרסה ראשונה' },
    ],
    confirmations: {},
    comments: [
      { id: 'cm-001', fromId: 'sm-001', fromName: 'דנה לוי', fromRole: 'site_manager', body: 'קיבלתי, מתחיל לפי התוכנית', sentAt: '2026-05-02T08:30:00.000Z' },
    ],
    tags: [],
  },
  {
    id: 'doc-002',
    name: 'חוזה קבלן משנה — צביעה',
    projectId: '1',
    category: 'contracts',
    mimeType: 'application/pdf',
    sizeBytes: 98304,
    uploadedBy: 'admin-001',
    uploaderName: 'מנהל מערכת',
    uploadedAt: '2026-04-15T11:00:00.000Z',
    currentVersion: 2,
    versions: [
      { version: 1, dataUrl: null, uploadedAt: '2026-04-15T11:00:00.000Z', uploadedBy: 'admin-001', uploaderName: 'מנהל מערכת', note: 'טיוטה ראשונה' },
      { version: 2, dataUrl: null, uploadedAt: '2026-04-20T14:00:00.000Z', uploadedBy: 'admin-001', uploaderName: 'מנהל מערכת', note: 'לאחר חתימה' },
    ],
    confirmations: { 'sub-001': { version: 2, confirmedAt: '2026-04-21T09:00:00.000Z' } },
    comments: [],
    tags: [],
  },
  {
    id: 'doc-003',
    name: 'סיור בטיחות — אפריל 2026',
    projectId: '2',
    category: 'safety',
    mimeType: 'image/jpeg',
    sizeBytes: 512000,
    uploadedBy: 'pm-001',
    uploaderName: 'יוסי כהן',
    uploadedAt: '2026-04-28T16:00:00.000Z',
    currentVersion: 1,
    versions: [
      { version: 1, dataUrl: null, uploadedAt: '2026-04-28T16:00:00.000Z', uploadedBy: 'pm-001', uploaderName: 'יוסי כהן', note: '' },
    ],
    confirmations: {},
    comments: [],
    tags: [],
  },
];

export function loadDocs() {
  try {
    const stored = JSON.parse(localStorage.getItem(DOCS_KEY) || 'null');
    if (!stored) return { documents: SEED_DOCUMENTS.map(d => ({ ...d })) };
    const storedIds = new Set((stored.documents ?? []).map(d => d.id));
    const extras = SEED_DOCUMENTS.filter(s => !storedIds.has(s.id));
    return { documents: [...(stored.documents ?? []), ...extras] };
  } catch {
    return { documents: SEED_DOCUMENTS.map(d => ({ ...d })) };
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
