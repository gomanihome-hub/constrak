const RECEIVING_KEY = 'constrak_receiving';

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
export function loadReceiving() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECEIVING_KEY) || 'null');
    if (!stored) return { orders: [], receipts: [] };
    return {
      orders:   stored.orders   ?? [],
      receipts: stored.receipts ?? [],
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

export function loadSuppliers() {
  try {
    return JSON.parse(localStorage.getItem(SUPPLIERS_STORE_KEY) || 'null') ?? [];
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

export function loadCatalog() {
  try {
    return JSON.parse(localStorage.getItem(CATALOG_STORE_KEY) || 'null') ?? [];
  } catch {
    return [];
  }
}

export function saveCatalog(list) {
  localStorage.setItem(CATALOG_STORE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('constrak:catalog'));
}
