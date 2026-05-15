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
// Returns { totalQty, weightedAvgPrice, totalCost } for a catalog item
function calcStats(catalogNum, allOrders) {
  let totalQty       = 0;
  let pricedQtySum   = 0;   // Σ qty  (only lines with price > 0)
  let pricedValueSum = 0;   // Σ qty × price (only lines with price > 0)

  for (const order of allOrders) {
    for (const item of order.items ?? []) {
      if (item.catalogNum !== catalogNum) continue;
      const qty   = Number(item.orderedQty) || 0;
      const price = Number(item.unitPrice)  || 0;
      totalQty += qty;
      if (price > 0) {
        pricedQtySum   += qty;
        pricedValueSum += qty * price;
      }
    }
  }

  // Weighted avg only from lines that have price data; 0 if none.
  const weightedAvgPrice = pricedQtySum > 0 ? pricedValueSum / pricedQtySum : 0;
  const totalCost        = totalQty * weightedAvgPrice;

  return { totalQty, weightedAvgPrice, totalCost };
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Materials() {
  const [catalog,  setCatalog]  = useState(() => loadCatalog());
  const [orders,   setOrders]   = useState(() => loadReceiving().orders);
  const [search,   setSearch]   = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Reload when catalog or POs change
  useEffect(() => {
    const reload = () => {
      setCatalog(loadCatalog());
      setOrders(loadReceiving().orders);
    };
    window.addEventListener('constrak:catalog',   reload);
    window.addEventListener('constrak:receiving', reload);
    return () => {
      window.removeEventListener('constrak:catalog',   reload);
      window.removeEventListener('constrak:receiving', reload);
    };
  }, []);

  // Enrich each catalog item with PO aggregates
  const rows = useMemo(() => catalog.map(item => ({
    ...item,
    ...calcStats(item.catalogNum, orders),
  })), [catalog, orders]);

  // Filter
  const filtered = useMemo(() => rows.filter(r => {
    const matchSearch = !search ||
      r.name.includes(search) ||
      (r.catalogNum ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || r.category === catFilter;
    return matchSearch && matchCat;
  }), [rows, search, catFilter]);

  // Grand totals across ALL (unfiltered) rows
  const grandTotalQty  = rows.reduce((s, r) => s + r.totalQty, 0);
  const grandTotalCost = rows.reduce((s, r) => s + r.totalCost, 0);
  const itemsWithOrders = rows.filter(r => r.totalQty > 0).length;

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
          label="ערך כולל שהוזמן"
          color="#16a34a" bg="#f0fdf4" border="#86efac"
          sub={grandTotalQty > 0 ? `${fmtNum(grandTotalQty)} יחידות` : 'אין הזמנות עם מחיר'}
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
                    {fmtNum(filtered.reduce((s, r) => s + r.totalQty, 0))}
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

      {/* Explanation note */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
        <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          <strong>אופן חישוב עלות יחידה ממוצעת:</strong> ממוצע משוקלל לפי כמות —{' '}
          סך כל (כמות × מחיר) לכל הזמנה ÷ סך כל הכמויות עם מחיר.{' '}
          <span style={{ color: '#b45309' }}>שורות ללא מחיר מחושבות בכמות שהוזמנה אך אינן משפיעות על הממוצע.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function MaterialRow({ row, even }) {
  const [hov, setHov] = useState(false);
  const cat = CATALOG_CATEGORIES.find(c => c.id === row.category);
  const hasOrders   = row.totalQty > 0;
  const hasPrice    = row.weightedAvgPrice > 0;

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
        {hasOrders ? (
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{fmtNum(row.totalQty)}</span>
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: 13 }}>0</span>
        )}
      </td>

      {/* עלות יחידה ממוצעת */}
      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
        {hasPrice ? (
          <span style={{ fontWeight: 600, color: '#7c3aed' }}>{fmt(row.weightedAvgPrice)}</span>
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: 12 }}>
            {hasOrders ? 'אין מחיר' : '—'}
          </span>
        )}
      </td>

      {/* עלות כוללת */}
      <td style={{ padding: '12px 14px' }}>
        {hasPrice ? (
          <span style={{
            display: 'inline-block', fontWeight: 700, fontSize: 14,
            color: '#16a34a', background: '#f0fdf4',
            border: '1px solid #86efac', borderRadius: 8,
            padding: '3px 10px', whiteSpace: 'nowrap',
          }}>
            {fmt(row.totalCost)}
          </span>
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: 13 }}>
            {hasOrders ? '—' : '0'}
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
