import { useState, useEffect, useMemo } from 'react';
import { loadCatalog, loadReceiving, CATALOG_CATEGORIES } from '../data/receivingStore';

const TEAL      = '#80cded';
const TEAL_DARK = '#4fb8e0';
const GOLD      = '#f3ce1f';

const fmt = n =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

const fmtNum = n =>
  new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 }).format(n);

// ─── Weighted-average aggregator ──────────────────────────────────────────────
// priceState: 'none' | 'not_received' | 'no_price' | 'has_price'
function calcStats(catalogNum, allOrders, allReceipts) {
  // ── 1. כמות שהוזמנה — from orders ────────────────────────────────────────
  let totalOrderedQty = 0;

  // Build map: `${orderId}::${itemId}` → unitPrice
  // Only for order items whose catalogNum matches.
  const priceMap = new Map(); // key → unitPrice (number, may be 0/null)

  for (const order of allOrders) {
    for (const item of order.items ?? []) {
      if (item.catalogNum !== catalogNum) continue;
      totalOrderedQty += Number(item.orderedQty) || 0;
      priceMap.set(`${order.id}::${item.id}`, Number(item.unitPrice) || 0);
    }
  }

  // ── 2. עלות יחידה ממוצעת — from receipts ────────────────────────────────
  let totalReceivedQty   = 0; // all received (with or without price)
  let pricedReceivedQty  = 0; // Σ receivedQty where unitPrice > 0
  let pricedReceivedVal  = 0; // Σ receivedQty × unitPrice

  for (const receipt of allReceipts) {
    for (const rItem of receipt.items ?? []) {
      const key   = `${receipt.orderId}::${rItem.itemId}`;
      if (!priceMap.has(key)) continue; // not our catalog item
      const price       = priceMap.get(key);
      const receivedQty = Number(rItem.receivedQty) || 0;
      totalReceivedQty += receivedQty;
      if (price > 0) {
        pricedReceivedQty += receivedQty;
        pricedReceivedVal += receivedQty * price;
      }
    }
  }

  const weightedAvgPrice =
    pricedReceivedQty > 0 ? pricedReceivedVal / pricedReceivedQty : 0;

  const totalCost = totalOrderedQty * weightedAvgPrice;

  // ── 3. Price display state ────────────────────────────────────────────────
  let priceState;
  if (totalOrderedQty === 0)       priceState = 'none';          // not ordered at all
  else if (totalReceivedQty === 0) priceState = 'not_received';  // ordered, nothing received yet
  else if (weightedAvgPrice === 0) priceState = 'no_price';      // received but no price in PO
  else                             priceState = 'has_price';

  return { totalOrderedQty, weightedAvgPrice, totalCost, priceState };
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Materials() {
  const [catalog,  setCatalog]  = useState(() => loadCatalog());
  const [orders,   setOrders]   = useState(() => loadReceiving().orders);
  const [receipts, setReceipts] = useState(() => loadReceiving().receipts);
  const [search,   setSearch]   = useState('');
  const [catFilter, setCatFilter] = useState('all');

  useEffect(() => {
    const reload = () => {
      const { orders: o, receipts: r } = loadReceiving();
      setCatalog(loadCatalog());
      setOrders(o);
      setReceipts(r);
    };
    window.addEventListener('constrak:catalog',   reload);
    window.addEventListener('constrak:receiving', reload);
    return () => {
      window.removeEventListener('constrak:catalog',   reload);
      window.removeEventListener('constrak:receiving', reload);
    };
  }, []);

  const rows = useMemo(() => catalog.map(item => ({
    ...item,
    ...calcStats(item.catalogNum, orders, receipts),
  })), [catalog, orders, receipts]);

  // Only show materials that have at least one purchase order
  const orderedRows = useMemo(() => rows.filter(r => r.totalOrderedQty > 0), [rows]);

  // Apply search + category filter on top
  const filtered = useMemo(() => orderedRows.filter(r => {
    const matchSearch = !search ||
      r.name.includes(search) ||
      (r.catalogNum ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || r.category === catFilter;
    return matchSearch && matchCat;
  }), [orderedRows, search, catFilter]);

  const grandTotalQty   = orderedRows.reduce((s, r) => s + r.totalOrderedQty, 0);
  const grandTotalCost  = orderedRows.reduce((s, r) => s + r.totalCost, 0);
  const itemsWithOrders = orderedRows.length;

  // ── Summary cards ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }} dir="rtl">

      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>📦</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>חומרים</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
              כמויות וערכים מחושבים מכלל הזמנות הרכש
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <SummaryCard
          icon="🗂️" value={rows.length}
          label="סוגי חומרים בקטלוג"
          color={TEAL_DARK} bg="#f0fbff" border="#b3e8fa"
        />
        <SummaryCard
          icon="🛒" value={itemsWithOrders}
          label="חומרים שהוזמנו"
          color="#7c3aed" bg="#f5f3ff" border="#ddd6fe"
          sub={`${rows.length - itemsWithOrders} ללא הזמנות`}
        />
        <SummaryCard
          icon="💰" value={grandTotalCost > 0 ? fmt(grandTotalCost) : '—'}
          label="ערך כולל (הוזמן × מחיר שהתקבל)"
          color="#16a34a" bg="#f0fdf4" border="#86efac"
          sub={grandTotalQty > 0 ? `${fmtNum(grandTotalQty)} יחידות הוזמנו` : 'אין הזמנות'}
        />
      </div>

      {/* Filter / search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '0 0 220px' }}>
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94a3b8', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או מק&quot;ט..."
            dir="rtl"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 34px 9px 12px',
              border: `1.5px solid ${search ? TEAL : '#e2e8f0'}`,
              borderRadius: 10, fontSize: 13, outline: 'none',
              background: 'white', color: '#1e293b', transition: 'border-color 0.15s',
            }}
          />
        </div>

        {/* Category filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterChip label="הכל" active={catFilter === 'all'} onClick={() => setCatFilter('all')} />
          {CATALOG_CATEGORIES.map(c => (
            <FilterChip
              key={c.id}
              label={`${c.icon} ${c.label}`}
              active={catFilter === c.id}
              onClick={() => setCatFilter(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {[
                  'שם חומר',
                  'מק"ט',
                  'קטגוריה',
                  'יחידה',
                  'כמות שהוזמנה',
                  'עלות יחידה ממוצעת',
                  'עלות כוללת',
                ].map(h => (
                  <th key={h} style={{
                    padding: '11px 14px', textAlign: 'right',
                    fontWeight: 700, color: '#64748b', fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
                    <p style={{ fontSize: 28, margin: '0 0 8px' }}>🔍</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>אין תוצאות לחיפוש זה</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <MaterialRow key={row.id} row={row} even={i % 2 === 0} />
                ))
              )}
            </tbody>

            {/* Grand total row */}
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f0fbff', borderTop: `2px solid ${TEAL}` }}>
                  <td colSpan={4} style={{ padding: '12px 14px', fontWeight: 800, color: TEAL_DARK, fontSize: 14 }}>
                    סה"כ ({filtered.length} פריטים)
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#1e293b', textAlign: 'center' }}>
                    {fmtNum(filtered.reduce((s, r) => s + r.totalOrderedQty, 0))}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
                    ממוצע משוקלל
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#16a34a', fontSize: 15 }}>
                    {(() => {
                      const total = filtered.reduce((s, r) => s + r.totalCost, 0);
                      return total > 0 ? fmt(total) : <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>;
                    })()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Footer note */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ️</span>
        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
          מציג רק חומרים שהוזמנו. לצפייה בקטלוג המלא עבור ל<strong>קבלת חומרים</strong>.
        </p>
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function MaterialRow({ row, even }) {
  const [hov, setHov] = useState(false);
  const cat = CATALOG_CATEGORIES.find(c => c.id === row.category);
  const { totalOrderedQty, weightedAvgPrice, totalCost, priceState } = row;

  return (
    <tr
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#f0fbff' : even ? 'white' : '#fafafa',
        borderBottom: '1px solid #f1f5f9',
        transition: 'background 0.12s',
      }}
    >
      {/* שם חומר */}
      <td style={{ padding: '12px 14px' }}>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{row.name}</span>
        {row.description && (
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{row.description}</p>
        )}
      </td>

      {/* מק"ט */}
      <td style={{ padding: '12px 14px' }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
          color: TEAL_DARK, background: '#f0fbff',
          border: '1px solid #b3e8fa', borderRadius: 6,
          padding: '2px 7px', whiteSpace: 'nowrap',
        }}>
          {row.catalogNum || '—'}
        </span>
      </td>

      {/* קטגוריה */}
      <td style={{ padding: '12px 14px' }}>
        {cat && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
            whiteSpace: 'nowrap',
          }}>
            {cat.icon} {cat.label}
          </span>
        )}
      </td>

      {/* יחידה */}
      <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{row.unit}</td>

      {/* כמות שהוזמנה */}
      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
        {totalOrderedQty > 0 ? (
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{fmtNum(totalOrderedQty)}</span>
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: 13 }}>0</span>
        )}
      </td>

      {/* עלות יחידה ממוצעת */}
      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
        {priceState === 'has_price' && (
          <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: 14 }}>{fmt(weightedAvgPrice)}</span>
        )}
        {priceState === 'not_received' && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
            background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
            whiteSpace: 'nowrap',
          }}>
            ⏳ טרם התקבל
          </span>
        )}
        {priceState === 'no_price' && (
          <span style={{ fontSize: 12, color: '#94a3b8' }}>אין מחיר בהזמנה</span>
        )}
        {priceState === 'none' && (
          <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>
        )}
      </td>

      {/* עלות כוללת */}
      <td style={{ padding: '12px 14px' }}>
        {priceState === 'has_price' ? (
          <span style={{
            display: 'inline-block', fontWeight: 700, fontSize: 14,
            color: '#16a34a', background: '#f0fdf4',
            border: '1px solid #86efac', borderRadius: 8,
            padding: '3px 10px', whiteSpace: 'nowrap',
          }}>
            {fmt(totalCost)}
          </span>
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: 13 }}>
            {priceState === 'none' ? '0' : '—'}
          </span>
        )}
      </td>
    </tr>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SummaryCard({ icon, value, label, color, bg, border, sub }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#475569' }}>{label}</p>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>{sub}</p>}
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${active ? TEAL : '#e2e8f0'}`,
        background: active ? TEAL : 'white',
        color: active ? 'white' : '#64748b',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}>
      {label}
    </button>
  );
}
