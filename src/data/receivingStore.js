const RECEIVING_KEY = 'constrak_receiving';

export const RECEIVING_PROJECTS = [
  { id: '1', name: 'מגדל רמת גן' },
  { id: '2', name: 'מרכז מסחרי תל אביב' },
  { id: '3', name: 'וילות הרצליה פיתוח' },
];

export const SUPPLIERS = [
  { id: 'sup-1', name: 'שירותי בטון ישראל',    phone: '03-1234567' },
  { id: 'sup-2', name: 'חברת ברזל הצפון',        phone: '04-7654321' },
  { id: 'sup-3', name: 'כלים וציוד בנייה בע"מ', phone: '08-9876543' },
  { id: 'sup-4', name: 'חומרי בנייה המרכז',      phone: '03-5556666' },
  { id: 'sup-5', name: 'ספק חומרים הדרום',       phone: '07-1112222' },
];

export const SEED_ORDERS = [
  {
    id: 'PO-2026-001',
    supplier: 'שירותי בטון ישראל',
    supplierPhone: '03-1234567',
    orderDate: '2026-05-10',
    expectedDelivery: '2026-05-13',
    projectId: '1',
    projectName: 'מגדל רמת גן',
    notes: 'אספקה לקומות 7-9',
    items: [
      { id: 'i-001-1', name: 'בטון B30',  unit: 'מ"ק',  orderedQty: 50, catalogNum: 'BT-030' },
      { id: 'i-001-2', name: 'בטון B25',  unit: 'מ"ק',  orderedQty: 30, catalogNum: 'BT-025' },
      { id: 'i-001-3', name: 'בטון B20',  unit: 'מ"ק',  orderedQty: 20, catalogNum: 'BT-020' },
    ],
  },
  {
    id: 'PO-2026-002',
    supplier: 'חברת ברזל הצפון',
    supplierPhone: '04-7654321',
    orderDate: '2026-05-08',
    expectedDelivery: '2026-05-14',
    projectId: '1',
    projectName: 'מגדל רמת גן',
    notes: '',
    items: [
      { id: 'i-002-1', name: 'ברזל 12 מ"מ',      unit: 'טון',    orderedQty: 15,  catalogNum: 'IR-012' },
      { id: 'i-002-2', name: 'ברזל 16 מ"מ',      unit: 'טון',    orderedQty: 8,   catalogNum: 'IR-016' },
      { id: 'i-002-3', name: "רשת ברזל 200×200",  unit: "יח'",   orderedQty: 200, catalogNum: 'MS-200' },
    ],
  },
  {
    id: 'PO-2026-003',
    supplier: 'כלים וציוד בנייה בע"מ',
    supplierPhone: '08-9876543',
    orderDate: '2026-05-09',
    expectedDelivery: '2026-05-12',
    projectId: '2',
    projectName: 'מרכז מסחרי תל אביב',
    notes: 'ריצוף לאזור הכניסה הראשית',
    items: [
      { id: 'i-003-1', name: 'ריצוף פורצלן 60×60', unit: 'מ"ר',          orderedQty: 500, catalogNum: 'TL-6060' },
      { id: 'i-003-2', name: 'דבק ריצוף לבן',        unit: "שק 25ק\"ג",   orderedQty: 100, catalogNum: 'GL-WHT'  },
      { id: 'i-003-3', name: 'פוגה אפור',             unit: "שק 5ק\"ג",    orderedQty: 50,  catalogNum: 'GR-GRY'  },
    ],
  },
  {
    id: 'PO-2026-004',
    supplier: 'חומרי בנייה המרכז',
    supplierPhone: '03-5556666',
    orderDate: '2026-05-07',
    expectedDelivery: '2026-05-11',
    projectId: '3',
    projectName: 'וילות הרצליה פיתוח',
    notes: 'אספקה ראשונה — מחצית ראשונה',
    items: [
      { id: 'i-004-1', name: "לבנים סיליקט",  unit: "אלף יח'", orderedQty: 50,   catalogNum: 'BK-SLC' },
      { id: 'i-004-2', name: 'בלוקים 20 ס"מ', unit: "יח'",     orderedQty: 2000, catalogNum: 'BL-200' },
      { id: 'i-004-3', name: 'טיח מכונה',      unit: "שק 40ק\"ג", orderedQty: 300, catalogNum: 'PL-MCH' },
    ],
  },
  {
    id: 'PO-2026-005',
    supplier: 'ספק חומרים הדרום',
    supplierPhone: '07-1112222',
    orderDate: '2026-05-11',
    expectedDelivery: '2026-05-15',
    projectId: '2',
    projectName: 'מרכז מסחרי תל אביב',
    notes: '',
    items: [
      { id: 'i-005-1', name: 'צבע חיצוני לבן',    unit: 'ליטר',           orderedQty: 500, catalogNum: 'PT-WHT' },
      { id: 'i-005-2', name: 'צבע אפוקסי אפור',   unit: 'ליטר',           orderedQty: 200, catalogNum: 'EP-GRY' },
      { id: 'i-005-3', name: 'מסטיק סיליקון',      unit: "קרטון 12 יח'",  orderedQty: 20,  catalogNum: 'SK-SIL' },
    ],
  },
];

export const UNIT_OPTIONS = [
  "יח'", 'מ"ק', 'טון', 'מ"ר', 'מטר', 'ליטר',
  "שק 25ק\"ג", "שק 40ק\"ג", "קרטון 12 יח'", "אלף יח'",
];

export function generateOrderId(orders) {
  const year = new Date().getFullYear();
  const nums = orders
    .map(o => { const m = o.id?.match(/^PO-\d{4}-(\d+)$/); return m ? parseInt(m[1], 10) : 0; })
    .filter(n => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `PO-${year}-${String(next).padStart(3, '0')}`;
}

// Historical receipts — seed data
const SEED_RECEIPTS = [
  {
    id: 'REC-2026-001',
    orderId: 'PO-2025-098',
    orderNumber: 'PO-2025-098',
    supplier: 'חברת ברזל הצפון',
    projectId: '1',
    projectName: 'מגדל רמת גן',
    receivedBy: 'sm-001',
    receivedByName: 'דנה לוי',
    receivedAt: '2026-05-10T10:30:00.000Z',
    items: [
      { itemId: 'h-1', name: 'ברזל 12 מ"מ', unit: 'טון', orderedQty: 20, receivedQty: 18, itemNotes: '2 טון חסרים — יסופק בהזמנה הבאה' },
      { itemId: 'h-2', name: 'ברזל 16 מ"מ', unit: 'טון', orderedQty: 10, receivedQty: 10, itemNotes: '' },
    ],
    notes: 'אספקה הגיעה ב-10:30, נבדקה איכות — תקין',
    photos: [],
    isPartial: true,
  },
  {
    id: 'REC-2026-002',
    orderId: 'PO-2025-095',
    orderNumber: 'PO-2025-095',
    supplier: 'שירותי בטון ישראל',
    projectId: '1',
    projectName: 'מגדל רמת גן',
    receivedBy: 'sm-001',
    receivedByName: 'דנה לוי',
    receivedAt: '2026-05-08T08:15:00.000Z',
    items: [
      { itemId: 'b-1', name: 'בטון B30', unit: 'מ"ק', orderedQty: 40, receivedQty: 40, itemNotes: '' },
      { itemId: 'b-2', name: 'בטון B25', unit: 'מ"ק', orderedQty: 20, receivedQty: 20, itemNotes: '' },
    ],
    notes: 'אספקה מלאה. נבדק לחץ בטון — תקין',
    photos: [],
    isPartial: false,
  },
  {
    id: 'REC-2026-003',
    orderId: 'PO-2026-004',
    orderNumber: 'PO-2026-004',
    supplier: 'חומרי בנייה המרכז',
    projectId: '3',
    projectName: 'וילות הרצליה פיתוח',
    receivedBy: 'admin-001',
    receivedByName: 'מנהל מערכת',
    receivedAt: '2026-05-06T14:00:00.000Z',
    items: [
      { itemId: 'i-004-1', name: "לבנים סיליקט", unit: "אלף יח'", orderedQty: 50,   receivedQty: 25,   itemNotes: 'מחצית ראשונה בלבד' },
      { itemId: 'i-004-2', name: 'בלוקים 20 ס"מ', unit: "יח'",   orderedQty: 2000, receivedQty: 1000, itemNotes: '' },
      { itemId: 'i-004-3', name: 'טיח מכונה',      unit: "שק 40ק\"ג", orderedQty: 300, receivedQty: 300, itemNotes: '' },
    ],
    notes: 'אספקה ראשונה מתוך שתיים. השאר יגיע בשבוע הבא.',
    photos: [],
    isPartial: true,
  },
];

// ─── Storage ──────────────────────────────────────────────────────────────────
export function loadReceiving() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECEIVING_KEY) || 'null');
    if (!stored) {
      return { orders: SEED_ORDERS.map(o => ({ ...o })), receipts: SEED_RECEIPTS.map(r => ({ ...r })) };
    }
    // Merge seed orders with any stored extras
    const storedOrderIds = new Set((stored.orders ?? []).map(o => o.id));
    const extraSeeds = SEED_ORDERS.filter(o => !storedOrderIds.has(o.id));
    return {
      orders:   [...(stored.orders ?? []), ...extraSeeds],
      receipts: stored.receipts ?? SEED_RECEIPTS.map(r => ({ ...r })),
    };
  } catch {
    return { orders: SEED_ORDERS.map(o => ({ ...o })), receipts: SEED_RECEIPTS.map(r => ({ ...r })) };
  }
}

export function saveReceiving(data) {
  localStorage.setItem(RECEIVING_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('constrak:receiving'));
}

// Derive order status from receipts
export function getOrderStatus(order, receipts) {
  if (order.status === 'cancelled') return 'cancelled';
  const orderReceipts = receipts.filter(r => r.orderId === order.id);
  if (orderReceipts.length === 0) return 'pending';
  const totalReceived = {};
  for (const r of orderReceipts) {
    for (const item of r.items) {
      totalReceived[item.itemId] = (totalReceived[item.itemId] ?? 0) + (item.receivedQty ?? 0);
    }
  }
  const allFull = order.items.every(item => (totalReceived[item.id] ?? 0) >= item.orderedQty);
  return allFull ? 'received' : 'partial';
}

// Get total received quantity for a specific item across all receipts
export function getReceivedQtyForItem(itemId, orderId, receipts) {
  return receipts
    .filter(r => r.orderId === orderId)
    .flatMap(r => r.items)
    .filter(i => i.itemId === itemId)
    .reduce((s, i) => s + (i.receivedQty ?? 0), 0);
}

export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Supplier categories ──────────────────────────────────────────────────────
export const SUPPLIER_CATEGORIES = [
  { id: 'concrete', label: 'בטון',           icon: '🏗️', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  { id: 'iron',     label: 'ברזל ופלדה',      icon: '⚙️', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  { id: 'tiles',    label: 'ריצוף וחיפוי',    icon: '🪟', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { id: 'masonry',  label: 'בנייה ואבן',      icon: '🧱', color: '#92400e', bg: '#fef9c3', border: '#fde68a' },
  { id: 'electric', label: 'חשמל',            icon: '⚡', color: '#ca8a04', bg: '#fefce8', border: '#fde68a' },
  { id: 'plumbing', label: 'אינסטלציה',       icon: '🔧', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  { id: 'paint',    label: 'צביעה וגמר',      icon: '🎨', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'hvac',     label: 'מיזוג אוויר',     icon: '❄️', color: '#0e7490', bg: '#ecfeff', border: '#a5f3fc' },
  { id: 'other',    label: 'אחר',             icon: '📦', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
];

const SUPPLIERS_STORE_KEY = 'constrak_suppliers_v2';

export const SEED_SUPPLIERS_DATA = [
  { id: 'sup-1', name: 'שירותי בטון ישראל',    contactPerson: 'יאיר גל',    phone: '03-1234567', email: 'yair@concrete-il.co.il',    address: "רח' התעשייה 12, פתח תקווה", category: 'concrete', notes: '' },
  { id: 'sup-2', name: 'חברת ברזל הצפון',       contactPerson: 'משה לוי',    phone: '04-7654321', email: 'moshe@iron-north.co.il',     address: 'אזור תעשייה נשר',            category: 'iron',     notes: '' },
  { id: 'sup-3', name: 'כלים וציוד בנייה בע"מ', contactPerson: 'רחל אברהם', phone: '08-9876543', email: 'rachel@tools-build.co.il',   address: "רח' הנגב 5, אשדוד",          category: 'tiles',    notes: 'ריצוף פורצלן' },
  { id: 'sup-4', name: 'חומרי בנייה המרכז',     contactPerson: 'דוד כהן',    phone: '03-5556666', email: 'david@center-build.co.il',   address: "שד' רוטשילד 22, ת\"א",       category: 'masonry',  notes: '' },
  { id: 'sup-5', name: 'ספק חומרים הדרום',      contactPerson: 'שרה מזרחי', phone: '07-1112222', email: 'sara@south-materials.co.il', address: "רח' הדרום 8, באר שבע",       category: 'paint',    notes: 'צבעים חיצוניים' },
];

export function loadSuppliers() {
  try {
    const stored = JSON.parse(localStorage.getItem(SUPPLIERS_STORE_KEY) || 'null');
    if (!stored) return SEED_SUPPLIERS_DATA.map(s => ({ ...s }));
    const storedIds = new Set(stored.map(s => s.id));
    const extras = SEED_SUPPLIERS_DATA.filter(s => !storedIds.has(s.id));
    return [...stored, ...extras];
  } catch {
    return SEED_SUPPLIERS_DATA.map(s => ({ ...s }));
  }
}

export function saveSuppliers(list) {
  localStorage.setItem(SUPPLIERS_STORE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('constrak:suppliers'));
}

// ─── Materials catalog ────────────────────────────────────────────────────────
export const CATALOG_CATEGORIES = [
  { id: 'concrete', label: 'בטון',         icon: '🏗️', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  { id: 'iron',     label: 'ברזל ופלדה',    icon: '⚙️', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  { id: 'tiles',    label: 'ריצוף וחיפוי',  icon: '🪟', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { id: 'masonry',  label: 'בנייה ואבן',    icon: '🧱', color: '#92400e', bg: '#fef9c3', border: '#fde68a' },
  { id: 'electric', label: 'חשמל',          icon: '⚡', color: '#ca8a04', bg: '#fefce8', border: '#fde68a' },
  { id: 'plumbing', label: 'אינסטלציה',     icon: '🔧', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  { id: 'paint',    label: 'צביעה',         icon: '🎨', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'other',    label: 'אחר',           icon: '📦', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
];

const CATALOG_STORE_KEY = 'constrak_catalog_v1';

export const SEED_CATALOG = [
  { id: 'cat-001', catalogNum: 'BT-030', name: 'בטון B30',              unit: 'מ"ק',           category: 'concrete', description: 'בטון מחוזק לשלד B30' },
  { id: 'cat-002', catalogNum: 'BT-025', name: 'בטון B25',              unit: 'מ"ק',           category: 'concrete', description: 'בטון מחוזק B25' },
  { id: 'cat-003', catalogNum: 'BT-020', name: 'בטון B20',              unit: 'מ"ק',           category: 'concrete', description: 'בטון רגיל B20' },
  { id: 'cat-004', catalogNum: 'IR-012', name: 'ברזל 12 מ"מ',           unit: 'טון',           category: 'iron',     description: 'ברזל עגול 12 מ"מ לשלד' },
  { id: 'cat-005', catalogNum: 'IR-016', name: 'ברזל 16 מ"מ',           unit: 'טון',           category: 'iron',     description: 'ברזל עגול 16 מ"מ לשלד' },
  { id: 'cat-006', catalogNum: 'MS-200', name: 'רשת ברזל 200×200',      unit: "יח'",           category: 'iron',     description: 'רשת ברזל לרצפה' },
  { id: 'cat-007', catalogNum: 'TL-6060',name: 'ריצוף פורצלן 60×60',   unit: 'מ"ר',           category: 'tiles',    description: 'אריחי פורצלן 60x60 ס"מ' },
  { id: 'cat-008', catalogNum: 'GL-WHT', name: 'דבק ריצוף לבן',         unit: "שק 25ק\"ג",    category: 'tiles',    description: 'דבק לבן לריצוף' },
  { id: 'cat-009', catalogNum: 'GR-GRY', name: 'פוגה אפור',             unit: "שק 5ק\"ג",     category: 'tiles',    description: 'פוגה אפורה לחיפוי' },
  { id: 'cat-010', catalogNum: 'BK-SLC', name: 'לבנים סיליקט',          unit: "אלף יח'",      category: 'masonry',  description: 'לבנים סיליקט לבנייה' },
  { id: 'cat-011', catalogNum: 'BL-200', name: 'בלוקים 20 ס"מ',         unit: "יח'",           category: 'masonry',  description: 'בלוקים קלים 20 ס"מ' },
  { id: 'cat-012', catalogNum: 'PL-MCH', name: 'טיח מכונה',             unit: "שק 40ק\"ג",    category: 'masonry',  description: 'טיח מכונה לקירות פנימיים' },
  { id: 'cat-013', catalogNum: 'PT-WHT', name: 'צבע חיצוני לבן',        unit: 'ליטר',          category: 'paint',    description: 'צבע חיצוני עמיד UV' },
  { id: 'cat-014', catalogNum: 'EP-GRY', name: 'צבע אפוקסי אפור',       unit: 'ליטר',          category: 'paint',    description: 'צבע אפוקסי לרצפות' },
  { id: 'cat-015', catalogNum: 'SK-SIL', name: 'מסטיק סיליקון',         unit: "קרטון 12 יח'", category: 'paint',    description: 'מסטיק סיליקון לאיטום' },
];

export function loadCatalog() {
  try {
    const stored = JSON.parse(localStorage.getItem(CATALOG_STORE_KEY) || 'null');
    if (!stored) return SEED_CATALOG.map(c => ({ ...c }));
    const storedIds = new Set(stored.map(c => c.id));
    const extras = SEED_CATALOG.filter(c => !storedIds.has(c.id));
    return [...stored, ...extras];
  } catch {
    return SEED_CATALOG.map(c => ({ ...c }));
  }
}

export function saveCatalog(list) {
  localStorage.setItem(CATALOG_STORE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('constrak:catalog'));
}
