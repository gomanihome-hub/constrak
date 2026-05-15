const RECEIVING_KEY = 'constrak_receiving';

export const RECEIVING_PROJECTS = [];

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

// ─── Storage ──────────────────────────────────────────────────────────────────
// Legacy IDs from the old seed data — filter them out of any existing localStorage
// so users who ran the app before this change don't see old demo orders/receipts.
const LEGACY_ORDER_IDS   = new Set(['PO-2026-001','PO-2026-002','PO-2026-003','PO-2026-004','PO-2026-005']);
const LEGACY_RECEIPT_IDS = new Set(['REC-2026-001','REC-2026-002','REC-2026-003']);

export function loadReceiving() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECEIVING_KEY) || 'null');
    if (!stored) return { orders: [], receipts: [] };
    return {
      orders:   (stored.orders   ?? []).filter(o => !LEGACY_ORDER_IDS.has(o.id)),
      receipts: (stored.receipts ?? []).filter(r => !LEGACY_RECEIPT_IDS.has(r.id)),
    };
  } catch {
    return { orders: [], receipts: [] };
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

const LEGACY_SUPPLIER_IDS = new Set(['sup-1','sup-2','sup-3','sup-4','sup-5']);

export function loadSuppliers() {
  try {
    const stored = JSON.parse(localStorage.getItem(SUPPLIERS_STORE_KEY) || 'null');
    if (!stored) return [];
    return stored.filter(s => !LEGACY_SUPPLIER_IDS.has(s.id));
  } catch {
    return [];
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

const LEGACY_CATALOG_IDS = new Set([
  'cat-001','cat-002','cat-003','cat-004','cat-005','cat-006','cat-007','cat-008',
  'cat-009','cat-010','cat-011','cat-012','cat-013','cat-014','cat-015',
]);

export function loadCatalog() {
  try {
    const stored = JSON.parse(localStorage.getItem(CATALOG_STORE_KEY) || 'null');
    if (!stored) return [];
    return stored.filter(c => !LEGACY_CATALOG_IDS.has(c.id));
  } catch {
    return [];
  }
}

export function saveCatalog(list) {
  localStorage.setItem(CATALOG_STORE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('constrak:catalog'));
}
