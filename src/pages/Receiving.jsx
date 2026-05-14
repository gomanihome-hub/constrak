import { useState, useEffect, useRef } from 'react';
import { useRoles } from '../context/RolesContext';
import {
  loadReceiving, saveReceiving, RECEIVING_PROJECTS, SUPPLIERS,
  UNIT_OPTIONS, generateOrderId,
  getOrderStatus, getReceivedQtyForItem, fmtDate, fmtDateTime,
} from '../data/receivingStore';
import SuppliersTab from '../components/SuppliersTab';
import MaterialsTab from '../components/MaterialsTab';

const TEAL       = '#4fb8e0';
const TEAL_LIGHT = '#80cded';
const GOLD       = '#f3ce1f';

function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_INFO = {
  pending:   { label: 'ממתין לקבלה',  icon: '⏳', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  partial:   { label: 'קבלה חלקית',   icon: '🔶', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  received:  { label: 'התקבל במלואו', icon: '✅', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  cancelled: { label: 'בוטל',          icon: '✕',  color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
};

function StatusBadge({ status }) {
  const s = STATUS_INFO[status] ?? STATUS_INFO.pending;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 99, padding: '3px 11px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {s.icon} {s.label}
    </span>
  );
}

function ItemProgress({ receivedQty, orderedQty }) {
  const pct = orderedQty > 0 ? Math.min(100, Math.round((receivedQty / orderedQty) * 100)) : 0;
  const color = pct >= 100 ? '#22c55e' : pct > 0 ? '#f97316' : '#e2e8f0';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 36, textAlign: 'left' }}>{pct}%</span>
    </div>
  );
}

// ─── Small form helpers ───────────────────────────────────────────────────────
function FormField({ label, children, required, error }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#ef4444', marginRight: 3 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444' }}>{error}</p>}
    </div>
  );
}

function iStyle(extra) {
  return {
    border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '9px 12px', fontSize: 13,
    outline: 'none', width: '100%', boxSizing: 'border-box', direction: 'rtl',
    fontFamily: 'inherit', color: '#1e293b', background: 'white', ...extra,
  };
}

// ─── ReceiptDetailModal ───────────────────────────────────────────────────────
function ReceiptDetailModal({ receipt, onClose }) {
  const [photoIdx, setPhotoIdx] = useState(null);
  const totalOrdered  = receipt.items.reduce((s, i) => s + (i.orderedQty  ?? 0), 0);
  const totalReceived = receipt.items.reduce((s, i) => s + (i.receivedQty ?? 0), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <span style={{ fontSize: 28 }}>📥</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>{receipt.orderNumber}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{receipt.supplier} · {receipt.projectName}</p>
          </div>
          <StatusBadge status={receipt.isPartial ? 'partial' : 'received'} />
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: 'white', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginRight: 8 }}>✕</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
            {[
              { label: 'תאריך קבלה',  value: fmtDateTime(receipt.receivedAt) },
              { label: 'התקבל על ידי', value: receipt.receivedByName },
              { label: 'ספק',          value: receipt.supplier },
              { label: 'פרויקט',       value: receipt.projectName },
            ].map(f => (
              <div key={f.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{f.label}</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{f.value}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>פריטים שהתקבלו</h3>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['פריט', 'יחידה', 'הוזמן', 'התקבל', '% קבלה', 'הערות'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, i) => {
                    const pct = item.orderedQty > 0 ? Math.round((item.receivedQty / item.orderedQty) * 100) : 0;
                    return (
                      <tr key={item.itemId} style={{ borderBottom: i < receipt.items.length - 1 ? '1px solid #f1f5f9' : 'none', background: i % 2 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{item.unit}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#64748b' }}>{item.orderedQty}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: pct >= 100 ? '#16a34a' : pct > 0 ? '#ea580c' : '#dc2626' }}>{item.receivedQty}</td>
                        <td style={{ padding: '10px 12px' }}><ItemProgress receivedQty={item.receivedQty} orderedQty={item.orderedQty} /></td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', maxWidth: 140 }}>{item.itemNotes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan={2} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>סה"כ</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{totalOrdered}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: totalReceived >= totalOrdered ? '#16a34a' : '#ea580c' }}>{totalReceived}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {receipt.notes && (
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#a16207' }}>📝 הערות</p>
              <p style={{ margin: 0, fontSize: 13, color: '#713f12' }}>{receipt.notes}</p>
            </div>
          )}

          {receipt.photos?.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>📷 תמונות ({receipt.photos.length})</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {receipt.photos.map((ph, i) => (
                  <div key={i} onClick={() => setPhotoIdx(i)}
                    style={{ width: 100, height: 100, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '2px solid #e2e8f0' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = TEAL}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    <img src={ph.dataUrl} alt={ph.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {photoIdx !== null && (
        <div onClick={() => setPhotoIdx(null)} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={receipt.photos[photoIdx].dataUrl} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
          {receipt.photos.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setPhotoIdx((photoIdx - 1 + receipt.photos.length) % receipt.photos.length); }} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 28, width: 48, height: 48, borderRadius: '50%', cursor: 'pointer' }}>›</button>
              <button onClick={e => { e.stopPropagation(); setPhotoIdx((photoIdx + 1) % receipt.photos.length); }} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 28, width: 48, height: 48, borderRadius: '50%', cursor: 'pointer' }}>‹</button>
            </>
          )}
          <p style={{ position: 'absolute', bottom: 20, color: 'white', fontSize: 12 }}>{receipt.photos[photoIdx].name}</p>
        </div>
      )}
    </div>
  );
}

// ─── OrderDetailModal ─────────────────────────────────────────────────────────
function OrderDetailModal({ order, receipts, onClose, onReceive, onCancel }) {
  const status       = getOrderStatus(order, receipts);
  const cancelled    = status === 'cancelled';
  const canReceive   = !cancelled && status !== 'received';
  const isOverdue    = !cancelled && order.expectedDelivery && new Date(order.expectedDelivery) < new Date();
  const hasValue     = order.items.some(it => it.unitPrice != null && it.unitPrice > 0);
  const orderTotal   = order.items.reduce((s, it) => s + (it.orderedQty || 0) * (it.unitPrice || 0), 0);
  const linkedReceipts = receipts.filter(r => r.orderId === order.id);
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 740, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <span style={{ fontSize: 28 }}>{cancelled ? '🚫' : '📋'}</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>{order.id}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{order.supplier} · {order.projectName}</p>
          </div>
          <StatusBadge status={status} />
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: 'white', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginRight: 8 }}>✕</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 12 }}>
            {[
              { label: 'ספק',           value: order.supplier },
              { label: 'פרויקט',        value: order.projectName },
              { label: 'תאריך הזמנה',   value: fmtDate(order.orderDate) },
              { label: 'אספקה צפויה',   value: order.expectedDelivery ? fmtDate(order.expectedDelivery) : '—', warn: isOverdue },
              ...(order.supplierPhone ? [{ label: 'טלפון ספק', value: order.supplierPhone, ltr: true }] : []),
              ...(hasValue && orderTotal > 0 ? [{ label: 'סה"כ הזמנה', value: `₪${orderTotal.toLocaleString('he-IL')}` }] : []),
            ].map(f => (
              <div key={f.label} style={{ background: f.warn ? '#fef2f2' : '#f8fafc', border: `1px solid ${f.warn ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ margin: 0, fontSize: 11, color: f.warn ? '#dc2626' : '#94a3b8', fontWeight: 600 }}>{f.label}{f.warn ? ' ⚠️' : ''}</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: f.warn ? '#dc2626' : '#1e293b', direction: f.ltr ? 'ltr' : 'rtl' }}>{f.value}</p>
              </div>
            ))}
          </div>

          {/* Notes */}
          {order.notes && (
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#a16207' }}>📝 הערות להזמנה</p>
              <p style={{ margin: 0, fontSize: 13, color: '#713f12' }}>{order.notes}</p>
            </div>
          )}

          {/* Items table */}
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>פריטים בהזמנה</h3>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['פריט', 'יחידה', 'הוזמן', ...(hasValue ? ["מחיר יח'", 'סה"כ'] : []), 'התקבל', 'נותר', 'התקדמות'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'right', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => {
                    const received  = getReceivedQtyForItem(item.id, order.id, receipts);
                    const remaining = Math.max(0, item.orderedQty - received);
                    const lineTotal = (item.orderedQty || 0) * (item.unitPrice || 0);
                    return (
                      <tr key={item.id} style={{ borderBottom: i < order.items.length - 1 ? '1px solid #f1f5f9' : 'none', background: i % 2 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{item.unit}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>{item.orderedQty}</td>
                        {hasValue && <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{item.unitPrice > 0 ? `₪${Number(item.unitPrice).toLocaleString('he-IL')}` : '—'}</td>}
                        {hasValue && <td style={{ padding: '10px 12px', fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>{lineTotal > 0 ? `₪${lineTotal.toLocaleString('he-IL')}` : '—'}</td>}
                        <td style={{ padding: '10px 12px', fontSize: 13, color: received > 0 ? '#16a34a' : '#94a3b8', fontWeight: received > 0 ? 700 : 400 }}>{received}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: remaining === 0 ? '#16a34a' : remaining < item.orderedQty ? '#ea580c' : '#dc2626', fontWeight: 700 }}>{remaining}</td>
                        <td style={{ padding: '10px 12px', minWidth: 110 }}><ItemProgress receivedQty={received} orderedQty={item.orderedQty} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Linked receipts */}
          {linkedReceipts.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>📥 קבלות משויכות ({linkedReceipts.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {linkedReceipts.map(r => (
                  <div key={r.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{r.id}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>📅 {fmtDateTime(r.receivedAt)}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>👤 {r.receivedByName}</span>
                    <StatusBadge status={r.isPartial ? 'partial' : 'received'} />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginRight: 'auto' }}>
                      {r.items.map(it => (
                        <span key={it.itemId} style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 20, padding: '1px 8px' }}>
                          {it.name}: {it.receivedQty}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action footer */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <div>
              {!cancelled && !confirmCancel && (
                <button onClick={() => setConfirmCancel(true)}
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  🚫 סמן כבוטל
                </button>
              )}
              {confirmCancel && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '8px 14px' }}>
                  <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>לבטל הזמנה?</span>
                  <button onClick={() => { onCancel(order.id); onClose(); }}
                    style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>כן, בטל</button>
                  <button onClick={() => setConfirmCancel(false)}
                    style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>לא</button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose}
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                סגור
              </button>
              {canReceive && (
                <button onClick={() => { onReceive(order); onClose(); }}
                  style={{ background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: `0 2px 8px ${TEAL}44` }}>
                  📥 קבל חומרים
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ReceiveWizard ────────────────────────────────────────────────────────────
function ReceiveWizard({ onClose, onSave, orders, receipts, currentUserId, currentUserName, assignedProjectIds, initialOrder }) {
  const [step,          setStep]     = useState(() => initialOrder ? 2 : 1);
  const [searchTerm,    setSearch]   = useState('');
  const [selectedOrder, setOrder]    = useState(() => initialOrder ?? null);
  const [receivedItems, setItems]    = useState(() => {
    if (!initialOrder) return [];
    return initialOrder.items.map(item => {
      const alreadyReceived = getReceivedQtyForItem(item.id, initialOrder.id, receipts);
      const remaining = Math.max(0, item.orderedQty - alreadyReceived);
      return { itemId: item.id, name: item.name, unit: item.unit, orderedQty: item.orderedQty, alreadyReceived, remaining, receivedQty: remaining, itemNotes: '' };
    });
  });
  const [notes,         setNotes]    = useState('');
  const [photos,        setPhotos]   = useState([]);
  const [photoError,    setPhotoErr] = useState('');
  const [submitting,    setSub]      = useState(false);
  const [receipt,       setReceipt]  = useState(null);
  const photoRef = useRef(null);

  const MAX_PHOTOS     = 8;
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

  const openOrders = orders.filter(o => {
    const status = getOrderStatus(o, receipts);
    if (status === 'received' || status === 'cancelled') return false;
    if (assignedProjectIds && !assignedProjectIds.includes(o.projectId)) return false;
    return true;
  });

  const filteredOrders = openOrders.filter(o =>
    !searchTerm ||
    o.id.includes(searchTerm.toUpperCase()) ||
    o.supplier.includes(searchTerm) ||
    o.projectName.includes(searchTerm)
  );

  function selectOrder(order) {
    setOrder(order);
    setItems(order.items.map(item => {
      const alreadyReceived = getReceivedQtyForItem(item.id, order.id, receipts);
      const remaining = Math.max(0, item.orderedQty - alreadyReceived);
      return { itemId: item.id, name: item.name, unit: item.unit, orderedQty: item.orderedQty, alreadyReceived, remaining, receivedQty: remaining, itemNotes: '' };
    }));
    setStep(2);
  }

  function setItemQty(itemId, val) {
    setItems(prev => prev.map(i => i.itemId === itemId ? { ...i, receivedQty: Math.max(0, Number(val) || 0) } : i));
  }
  function setItemNotes(itemId, val) {
    setItems(prev => prev.map(i => i.itemId === itemId ? { ...i, itemNotes: val } : i));
  }
  function setAllFull()  { setItems(prev => prev.map(i => ({ ...i, receivedQty: i.remaining }))); }
  function setAllZero()  { setItems(prev => prev.map(i => ({ ...i, receivedQty: 0 }))); }

  async function handlePhotoAdd(e) {
    setPhotoErr('');
    const files = Array.from(e.target.files ?? []);
    if (photos.length + files.length > MAX_PHOTOS) { setPhotoErr(`מקסימום ${MAX_PHOTOS} תמונות`); return; }
    const tooBig = files.find(f => f.size > MAX_PHOTO_SIZE);
    if (tooBig) { setPhotoErr('תמונה גדולה מדי — מקסימום 5MB'); return; }
    const newPhotos = await Promise.all(files.map(async f => ({ dataUrl: await readFileAsDataUrl(f), name: f.name, size: f.size })));
    setPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = '';
  }

  function removePhoto(i) { setPhotos(prev => prev.filter((_, idx) => idx !== i)); }

  function handleSubmit() {
    const anyReceived = receivedItems.some(i => i.receivedQty > 0);
    if (!anyReceived) return;
    setSub(true);
    const isPartial = receivedItems.some(i => i.receivedQty < i.remaining);
    const newReceipt = {
      id: `REC-${Date.now()}`,
      orderId:        selectedOrder.id,
      orderNumber:    selectedOrder.id,
      supplier:       selectedOrder.supplier,
      projectId:      selectedOrder.projectId,
      projectName:    selectedOrder.projectName,
      receivedBy:     currentUserId,
      receivedByName: currentUserName,
      receivedAt:     new Date().toISOString(),
      items: receivedItems.map(i => ({ itemId: i.itemId, name: i.name, unit: i.unit, orderedQty: i.orderedQty, receivedQty: i.receivedQty, itemNotes: i.itemNotes })),
      notes,
      photos,
      isPartial,
    };
    onSave(newReceipt);
    setReceipt(newReceipt);
    setStep(4);
    setSub(false);
  }

  const totalQty    = receivedItems.reduce((s, i) => s + i.receivedQty, 0);
  const anyReceived = receivedItems.some(i => i.receivedQty > 0);
  const STEPS = ['בחר הזמנה', 'פרטי קבלה', 'אישור'];

  // Step 1 ──────────────────────────────────────────────────────────────────
  if (step === 1) return (
    <WizardShell title="קבלת חומרים חדשה" step={1} steps={STEPS} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>חפש הזמנה פתוחה לפי מספר הזמנה, ספק, או פרויקט</p>
        <input value={searchTerm} onChange={e => setSearch(e.target.value)}
          placeholder="חפש: PO-2026-001, שירותי בטון, רמת גן..."
          style={{ border: '1.5px solid #4fb8e0', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', direction: 'rtl', width: '100%', boxSizing: 'border-box' }} />

        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
            <p style={{ fontSize: 36, margin: '0 0 8px' }}>📭</p>
            <p style={{ margin: 0, fontWeight: 600 }}>אין הזמנות פתוחות {searchTerm && 'התואמות את החיפוש'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
            {filteredOrders.map(order => {
              const status = getOrderStatus(order, receipts);
              return (
                <div key={order.id} onClick={() => selectOrder(order)}
                  style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s', background: 'white' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.background = '#f0f9ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', flex: 1 }}>{order.id}</span>
                    <StatusBadge status={status} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>🏢 {order.supplier}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>🏗️ {order.projectName}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>📅 {fmtDate(order.orderDate)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {order.items.map(item => (
                      <span key={item.id} style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', borderRadius: 20, padding: '2px 10px' }}>
                        {item.name} × {item.orderedQty} {item.unit}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WizardShell>
  );

  // Step 2 ──────────────────────────────────────────────────────────────────
  if (step === 2 && selectedOrder) return (
    <WizardShell title="קבלת חומרים חדשה" step={2} steps={STEPS} onClose={onClose}
      onBack={() => { setStep(1); setOrder(null); setItems([]); }}
      onNext={() => anyReceived && setStep(3)} nextDisabled={!anyReceived} nextLabel="לאישור ←">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '1.5px solid #bae6fd', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#0369a1' }}>{selectedOrder.id}</span>
            <StatusBadge status={getOrderStatus(selectedOrder, receipts)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
            {[
              { label: 'ספק',           value: selectedOrder.supplier },
              { label: 'פרויקט',        value: selectedOrder.projectName },
              { label: 'תאריך הזמנה',   value: fmtDate(selectedOrder.orderDate) },
              { label: 'אספקה צפויה',   value: fmtDate(selectedOrder.expectedDelivery) },
            ].map(f => (
              <div key={f.label}>
                <p style={{ margin: 0, fontSize: 10, color: '#0369a1', fontWeight: 700 }}>{f.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#1e293b', fontWeight: 600 }}>{f.value || '—'}</p>
              </div>
            ))}
          </div>
          {selectedOrder.notes && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#0369a1', fontStyle: 'italic' }}>📝 {selectedOrder.notes}</p>}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>כמות שהתקבלה:</span>
          <button onClick={setAllFull} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>קבל הכל ✓</button>
          <button onClick={setAllZero} style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>אפס הכל</button>
          <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 'auto' }}>סה"כ: {totalQty} יחידות</span>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          {receivedItems.map((item, i) => (
            <div key={item.itemId} style={{ borderBottom: i < receivedItems.length - 1 ? '1px solid #f1f5f9' : 'none', padding: '12px 16px', background: i % 2 ? '#fafafa' : 'white' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px', minWidth: 120 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{item.name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>הוזמן: {item.orderedQty} {item.unit} · נותר: {item.remaining} {item.unit}</p>
                  {item.alreadyReceived > 0 && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#4fb8e0' }}>✓ התקבל קודם: {item.alreadyReceived} {item.unit}</p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>כמות שהתקבלה</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setItemQty(item.itemId, Math.max(0, item.receivedQty - 1))}
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>−</button>
                    <input type="number" min={0} max={item.remaining} value={item.receivedQty}
                      onChange={e => setItemQty(item.itemId, e.target.value)}
                      style={{ width: 72, textAlign: 'center', border: '1.5px solid #4fb8e0', borderRadius: 8, padding: '6px 4px', fontSize: 16, fontWeight: 700, outline: 'none', color: item.receivedQty > 0 ? '#1e293b' : '#94a3b8' }} />
                    <button onClick={() => setItemQty(item.itemId, Math.min(item.remaining, item.receivedQty + 1))}
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>+</button>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{item.unit}</span>
                  </div>
                  <ItemProgress receivedQty={item.receivedQty} orderedQty={item.remaining} />
                </div>
              </div>
              <input value={item.itemNotes} onChange={e => setItemNotes(item.itemId, e.target.value)}
                placeholder="הערה על פריט זה (אופציונלי)..."
                style={{ marginTop: 8, width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', direction: 'rtl', boxSizing: 'border-box', color: '#475569', background: '#f8fafc' }} />
            </div>
          ))}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>📝 הערות כלליות על המשלוח</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="הערות על המשלוח, מצב החומרים, סימוכין וכדומה..."
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', direction: 'rtl', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', color: '#1e293b' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>📷 צילומי המשלוח (אופציונלי, עד {MAX_PHOTOS} תמונות)</label>
          <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoAdd} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {photos.map((ph, i) => (
              <div key={i} style={{ position: 'relative', width: 90, height: 90, borderRadius: 10, overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                <img src={ph.dataUrl} alt={ph.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                <span style={{ position: 'absolute', bottom: 3, left: 0, right: 0, fontSize: 9, color: 'white', background: 'rgba(0,0,0,0.5)', textAlign: 'center', padding: '1px' }}>{fmtSize(ph.size)}</span>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button onClick={() => photoRef.current?.click()}
                style={{ width: 90, height: 90, borderRadius: 10, border: `2px dashed ${TEAL}`, background: '#f0f9ff', color: TEAL, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                <span style={{ fontSize: 24 }}>+</span>הוסף
              </button>
            )}
          </div>
          {photoError && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444' }}>{photoError}</p>}
        </div>

        {!anyReceived && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
            ⚠️ יש להזין כמות שהתקבלה עבור לפחות פריט אחד כדי להמשיך
          </div>
        )}
      </div>
    </WizardShell>
  );

  // Step 3 ──────────────────────────────────────────────────────────────────
  if (step === 3 && selectedOrder) return (
    <WizardShell title="קבלת חומרים חדשה" step={3} steps={STEPS} onClose={onClose}
      onBack={() => setStep(2)}
      onNext={handleSubmit} nextLabel={submitting ? 'שומר...' : '✅ אישור סופי'} nextDisabled={submitting}
      nextColor="#16a34a">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#166534' }}>אנא בדוק את פרטי הקבלה לפני האישור הסופי</p>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { l: 'מספר הזמנה', v: selectedOrder.id },
              { l: 'ספק',        v: selectedOrder.supplier },
              { l: 'פרויקט',     v: selectedOrder.projectName },
              { l: 'נקלט על ידי',v: currentUserName },
              { l: 'תאריך קבלה', v: new Date().toLocaleDateString('he-IL') },
            ].map(f => (
              <div key={f.l}>
                <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{f.l}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{f.v}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          {receivedItems.filter(i => i.receivedQty > 0).map((item, i, arr) => (
            <div key={item.itemId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none', background: i % 2 ? '#fafafa' : 'white' }}>
              <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{item.name}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{item.receivedQty} / {item.orderedQty} {item.unit}</span>
              <ItemProgress receivedQty={item.receivedQty} orderedQty={item.orderedQty} />
            </div>
          ))}
        </div>
        {notes && <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#713f12' }}>📝 {notes}</div>}
        {photos.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {photos.map((ph, i) => <img key={i} src={ph.dataUrl} alt={ph.name} style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />)}
          </div>
        )}
      </div>
    </WizardShell>
  );

  // Step 4: Success ──────────────────────────────────────────────────────────
  if (step === 4 && receipt) return (
    <WizardShell title="קבלה בוצעה בהצלחה" step={null} steps={STEPS} onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
        <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#166534' }}>קבלת חומרים בוצעה בהצלחה!</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>מספר קבלה: <strong>{receipt.id}</strong></p>
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '16px 20px', textAlign: 'right', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { l: 'הזמנה', v: receipt.orderNumber },
              { l: 'ספק',   v: receipt.supplier },
              { l: 'פרויקט',v: receipt.projectName },
              { l: 'נקלט',  v: `${receipt.items.reduce((s, i) => s + i.receivedQty, 0)} יחידות` },
            ].map(f => (
              <div key={f.l}>
                <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700 }}>{f.l}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 700 }}>{f.v}</p>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose}
          style={{ background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, color: 'white', border: 'none', borderRadius: 10, padding: '11px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: `0 4px 14px ${TEAL}55` }}>
          סגור וחזור לרשימה
        </button>
      </div>
    </WizardShell>
  );

  return null;
}

// ─── WizardShell ──────────────────────────────────────────────────────────────
function WizardShell({ title, step, steps, children, onClose, onBack, onNext, nextLabel = 'הבא ←', nextDisabled, nextColor }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden' }}>
        <div style={{ background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>📥</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'white' }}>{title}</p>
            {step && steps && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: i + 1 < step ? '#22c55e' : i + 1 === step ? GOLD : 'rgba(255,255,255,0.25)', color: i + 1 === step ? '#1a1a00' : 'white' }}>
                      {i + 1 < step ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 11, color: i + 1 === step ? GOLD : 'rgba(255,255,255,0.65)', fontWeight: i + 1 === step ? 700 : 400 }}>{s}</span>
                    {i < steps.length - 1 && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>›</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'white', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
        {(onBack || onNext) && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', background: '#fafafa' }}>
            {onBack
              ? <button onClick={onBack} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', color: '#475569', fontSize: 13 }}>← חזור</button>
              : <div />}
            {onNext && (
              <button onClick={onNext} disabled={nextDisabled}
                style={{ background: nextDisabled ? '#94a3b8' : (nextColor ?? `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`), color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, cursor: nextDisabled ? 'not-allowed' : 'pointer', fontSize: 14, boxShadow: nextDisabled ? 'none' : `0 2px 10px ${TEAL}44` }}>
                {nextLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NewOrderModal ────────────────────────────────────────────────────────────
function NewOrderModal({ onClose, onSave, orders }) {
  const today = new Date().toISOString().slice(0, 10);
  const [orderId,          setOrderId]    = useState(() => generateOrderId(orders));
  const [supplier,         setSupplier]   = useState('');
  const [supplierPhone,    setSuppPhone]  = useState('');
  const [projectId,        setProjId]     = useState('');
  const [orderDate,        setOrderDate]  = useState(today);
  const [expectedDelivery, setExpDel]     = useState('');
  const [notes,            setNotes]      = useState('');
  const [items,            setItems]      = useState([newRow()]);
  const [errors,           setErrors]     = useState({});
  const [showSugg,         setShowSugg]   = useState(false);
  const [saved,            setSaved]      = useState(false);
  const suppRef = useRef(null);

  function newRow() {
    return { _id: Math.random().toString(36).slice(2), name: '', unit: "יח'", orderedQty: 1, unitPrice: '' };
  }

  const suppMatches = supplier
    ? SUPPLIERS.filter(s => s.name.includes(supplier)).slice(0, 5)
    : [];

  function pickSupplier(s) {
    setSupplier(s.name);
    setSuppPhone(s.phone);
    setShowSugg(false);
  }

  function addRow()               { setItems(prev => [...prev, newRow()]); }
  function removeRow(idx)         { setItems(prev => prev.filter((_, i) => i !== idx)); }
  function updateRow(idx, k, v)   { setItems(prev => prev.map((r, i) => i === idx ? { ...r, [k]: v } : r)); }

  const projectName = RECEIVING_PROJECTS.find(p => p.id === projectId)?.name ?? '';

  const totalValue = items.reduce((sum, it) => {
    return sum + (Number(it.orderedQty) || 0) * (Number(it.unitPrice) || 0);
  }, 0);

  function validate() {
    const errs = {};
    if (!supplier.trim())  errs.supplier = 'שדה חובה';
    if (!projectId)        errs.project  = 'יש לבחור פרויקט';
    if (!orderDate)        errs.date     = 'שדה חובה';
    if (items.length === 0 || items.some(it => !it.name.trim() || !(Number(it.orderedQty) > 0)))
      errs.items = 'יש למלא שם וכמות חוקית לכל הפריטים';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const order = {
      id:               orderId.trim(),
      supplier:         supplier.trim(),
      supplierPhone:    supplierPhone.trim(),
      orderDate,
      expectedDelivery,
      projectId,
      projectName,
      notes,
      createdAt:        new Date().toISOString(),
      items: items.map((it, i) => ({
        id:         `${orderId}-${i + 1}`,
        name:       it.name.trim(),
        unit:       it.unit,
        orderedQty: Number(it.orderedQty),
        unitPrice:  it.unitPrice !== '' ? Number(it.unitPrice) : null,
        catalogNum: '',
      })),
    };
    onSave(order);
    setSaved(true);
  }

  if (saved) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 480, padding: 36, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#1e293b' }}>ההזמנה נשמרה!</h3>
        <p style={{ margin: '0 0 6px', fontSize: 14, color: '#64748b' }}>מספר הזמנה: <strong>{orderId}</strong></p>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94a3b8' }}>{supplier} · {projectName}</p>
        <button onClick={onClose}
          style={{ background: `linear-gradient(135deg,#1e293b,#334155)`, color: 'white', border: 'none', borderRadius: 10, padding: '11px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          סגור וחזור לרשימה
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 780, maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>📋</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: 'white' }}>הזמנת רכש חדשה</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>מלא את פרטי ההזמנה ורשימת הפריטים</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Row 1: Order ID + project */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="מספר הזמנה" required>
              <input value={orderId} onChange={e => setOrderId(e.target.value)} style={iStyle()} />
            </FormField>
            <FormField label="פרויקט" required error={errors.project}>
              <select value={projectId} onChange={e => setProjId(e.target.value)} style={iStyle()}>
                <option value="">— בחר פרויקט —</option>
                {RECEIVING_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
          </div>

          {/* Row 2: Supplier + phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 14, alignItems: 'start' }}>
            <FormField label="ספק" required error={errors.supplier}>
              <div style={{ position: 'relative' }} ref={suppRef}>
                <input value={supplier}
                  onChange={e => { setSupplier(e.target.value); setShowSugg(true); }}
                  onFocus={() => setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                  placeholder="שם הספק..."
                  style={iStyle()} />
                {showSugg && suppMatches.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: 'white', border: `1.5px solid ${TEAL}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden', marginTop: 2 }}>
                    {suppMatches.map(s => (
                      <div key={s.id} onMouseDown={() => pickSupplier(s)}
                        style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{s.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
            <FormField label="טלפון ספק">
              <input value={supplierPhone} onChange={e => setSuppPhone(e.target.value)}
                placeholder="03-XXXXXXX" style={iStyle({ direction: 'ltr' })} />
            </FormField>
          </div>

          {/* Row 3: Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="תאריך הזמנה" required error={errors.date}>
              <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
                style={iStyle({ direction: 'ltr' })} />
            </FormField>
            <FormField label="תאריך אספקה משוער">
              <input type="date" value={expectedDelivery} onChange={e => setExpDel(e.target.value)}
                style={iStyle({ direction: 'ltr' })} />
            </FormField>
          </div>

          {/* Items */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                📦 רשימת פריטים <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <button onClick={addRow}
                style={{ background: '#f0f9ff', color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                + הוסף פריט
              </button>
            </div>
            {errors.items && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#ef4444' }}>{errors.items}</p>}

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 72px 130px 90px 28px', gap: 8, padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                <span>שם פריט</span>
                <span>יחידה</span>
                <span>כמות</span>
                <span>מחיר יחידה (₪)</span>
                <span>סה"כ</span>
                <span />
              </div>

              {items.map((item, idx) => {
                const lineTotal = (Number(item.orderedQty) || 0) * (Number(item.unitPrice) || 0);
                return (
                  <div key={item._id} style={{ display: 'grid', gridTemplateColumns: '2fr 120px 72px 130px 90px 28px', gap: 8, padding: '8px 12px', borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none', background: idx % 2 ? '#fafafa' : 'white', alignItems: 'center' }}>
                    <input value={item.name} onChange={e => updateRow(idx, 'name', e.target.value)}
                      placeholder="שם הפריט..."
                      style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 9px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', direction: 'rtl', fontFamily: 'inherit' }} />

                    <select value={item.unit} onChange={e => updateRow(idx, 'unit', e.target.value)}
                      style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 8px', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box', background: 'white', direction: 'rtl', fontFamily: 'inherit' }}>
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>

                    <input type="number" min={0} step="any" value={item.orderedQty}
                      onChange={e => updateRow(idx, 'orderedQty', e.target.value)}
                      style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 6px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'center' }} />

                    <input type="number" min={0} step="any" value={item.unitPrice}
                      onChange={e => updateRow(idx, 'unitPrice', e.target.value)}
                      placeholder="0"
                      style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 9px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', direction: 'ltr' }} />

                    <span style={{ fontSize: 13, fontWeight: 700, color: lineTotal > 0 ? '#1e293b' : '#cbd5e1', textAlign: 'center' }}>
                      {lineTotal > 0 ? `₪${lineTotal.toLocaleString('he-IL')}` : '—'}
                    </span>

                    <button onClick={() => removeRow(idx)} disabled={items.length === 1}
                      style={{ background: 'transparent', border: 'none', cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: items.length === 1 ? '#cbd5e1' : '#ef4444', fontSize: 18, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                );
              })}

              {/* Total row */}
              {totalValue > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 72px 130px 90px 28px', gap: 8, padding: '9px 12px', background: '#eff6ff', borderTop: '2px solid #bfdbfe', fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: '#1e293b' }}>סה"כ הזמנה</span>
                  <span /><span /><span />
                  <span style={{ color: '#1d4ed8', textAlign: 'center' }}>₪{totalValue.toLocaleString('he-IL')}</span>
                  <span />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <FormField label="הערות">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="הערות על ההזמנה, תנאי אספקה, פרטים נוספים..."
              style={{ ...iStyle(), resize: 'vertical', fontFamily: 'inherit', height: 'auto', padding: '10px 12px' }} />
          </FormField>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', background: '#fafafa', gap: 10 }}>
          <button onClick={onClose}
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', color: '#475569', fontSize: 14 }}>
            ביטול
          </button>
          <button onClick={handleSave}
            style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 10px rgba(30,41,59,0.3)' }}>
            <span>💾</span> שמור הזמנה
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ReceiptCard ──────────────────────────────────────────────────────────────
function ReceiptCard({ receipt, onClick }) {
  const totalOrdered  = receipt.items.reduce((s, i) => s + (i.orderedQty  ?? 0), 0);
  const totalReceived = receipt.items.reduce((s, i) => s + (i.receivedQty ?? 0), 0);
  const pct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  return (
    <div onClick={onClick}
      style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '14px 18px', cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = `0 4px 16px ${TEAL}22`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0f9ff', border: `1.5px solid ${TEAL}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📥</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{receipt.orderNumber}</span>
            <StatusBadge status={receipt.isPartial ? 'partial' : 'received'} />
            {receipt.photos?.length > 0 && <span style={{ fontSize: 11, color: '#64748b' }}>📷 {receipt.photos.length}</span>}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>🏢 {receipt.supplier}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>🏗️ {receipt.projectName}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>📅 {fmtDateTime(receipt.receivedAt)}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>👤 {receipt.receivedByName}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {receipt.items.map(item => (
              <span key={item.itemId} style={{ fontSize: 11, background: item.receivedQty >= item.orderedQty ? '#f0fdf4' : '#fff7ed', color: item.receivedQty >= item.orderedQty ? '#166534' : '#c2410c', border: `1px solid ${item.receivedQty >= item.orderedQty ? '#86efac' : '#fdba74'}`, borderRadius: 20, padding: '2px 9px' }}>
                {item.name}: {item.receivedQty}/{item.orderedQty}
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: pct >= 100 ? '#16a34a' : '#ea580c' }}>{pct}%</p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>נקלט</p>
        </div>
      </div>
    </div>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({ order, receipts, onView, onReceive }) {
  const status   = getOrderStatus(order, receipts);
  const cancelled = status === 'cancelled';
  const isOverdue = !cancelled && order.expectedDelivery && new Date(order.expectedDelivery) < new Date();
  const hasValue  = order.items.some(it => it.unitPrice != null && it.unitPrice > 0);
  const orderTotal = order.items.reduce((s, it) => s + (it.orderedQty || 0) * (it.unitPrice || 0), 0);

  return (
    <div
      style={{ background: cancelled ? '#f8fafc' : 'white', borderRadius: 14, border: '1.5px solid #e2e8f0', overflow: 'hidden', opacity: cancelled ? 0.75 : 1, cursor: 'pointer', transition: 'all 0.15s' }}
      onClick={() => onView(order)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = cancelled ? '#e2e8f0' : TEAL; e.currentTarget.style.boxShadow = cancelled ? 'none' : `0 4px 16px ${TEAL}22`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: cancelled ? '#f1f5f9' : '#fef3c7', border: `1.5px solid ${cancelled ? '#e2e8f0' : '#fde68a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          {cancelled ? '🚫' : '📋'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{order.id}</span>
            <StatusBadge status={status} />
            {isOverdue && <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>⚠️ באיחור</span>}
            {hasValue && orderTotal > 0 && (
              <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>
                ₪{orderTotal.toLocaleString('he-IL')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>🏢 {order.supplier}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>🏗️ {order.projectName}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>📅 הוזמן: {fmtDate(order.orderDate)}</span>
            {order.expectedDelivery && (
              <span style={{ fontSize: 12, color: isOverdue ? '#dc2626' : '#64748b' }}>
                🚚 צפוי: {fmtDate(order.expectedDelivery)}
              </span>
            )}
          </div>
          {/* Items summary chips */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {order.items.map(item => {
              const received = getReceivedQtyForItem(item.id, order.id, receipts);
              return (
                <span key={item.id} style={{ fontSize: 11, background: received >= item.orderedQty ? '#f0fdf4' : '#f8fafc', color: received >= item.orderedQty ? '#166534' : '#475569', border: `1px solid ${received >= item.orderedQty ? '#86efac' : '#e2e8f0'}`, borderRadius: 20, padding: '2px 9px' }}>
                  {item.name}: {received}/{item.orderedQty}
                </span>
              );
            })}
          </div>
        </div>

        {/* Quick receive button */}
        {!cancelled && (
          <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => onReceive(order)}
              style={{ background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: `0 2px 8px ${TEAL}44` }}>
              📥 קבל
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Receiving() {
  const { currentSystemUser, getAssignedProjectIds, currentRole } = useRoles();
  const canManage = ['admin', 'project_manager'].includes(currentRole);
  const [data,         setData]        = useState(() => loadReceiving());
  const [tab,          setTab]         = useState('receipts');
  const [showWizard,   setShowWizard]  = useState(false);
  const [showNewOrder, setShowNewOrder]= useState(false);
  const [viewReceipt,    setViewReceipt] = useState(null);
  const [viewOrder,      setViewOrder]   = useState(null);
  const [filterProject,  setFP]  = useState('');
  const [filterSupplier, setFS]  = useState('');
  const [filterDate,     setFD]  = useState('');
  const [filterStatus,   setFSt] = useState('');
  const [orderStatus,    setOSt] = useState('open'); // 'open'|'cancelled'|'all'
  const [filterOrderSupplier, setFOS] = useState('');

  const uid      = currentSystemUser?.id ?? '';
  const uname    = currentSystemUser?.displayName ?? 'משתמש';
  const assigned = getAssignedProjectIds();

  useEffect(() => {
    function refresh() { setData(loadReceiving()); }
    window.addEventListener('constrak:receiving', refresh);
    return () => window.removeEventListener('constrak:receiving', refresh);
  }, []);

  function handleSaveReceipt(receipt) {
    setData(prev => {
      const next = { ...prev, receipts: [...prev.receipts, receipt] };
      saveReceiving(next);
      return next;
    });
  }

  function handleSaveOrder(order) {
    setData(prev => {
      const next = { ...prev, orders: [order, ...prev.orders] };
      saveReceiving(next);
      return next;
    });
  }

  function handleCancelOrder(orderId) {
    setData(prev => {
      const next = { ...prev, orders: prev.orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o) };
      saveReceiving(next);
      return next;
    });
  }

  const [wizardInitialOrder, setWizardInitialOrder] = useState(null);

  function openWizardForOrder(order) {
    setWizardInitialOrder(order ?? null);
    setShowWizard(true);
  }

  function closeWizard() {
    setShowWizard(false);
    setWizardInitialOrder(null);
  }

  // Filtered receipts
  const visibleReceipts = data.receipts.filter(r => {
    if (assigned && !assigned.includes(r.projectId)) return false;
    if (filterProject  && r.projectId !== filterProject) return false;
    if (filterSupplier && r.supplier  !== filterSupplier) return false;
    if (filterDate     && !r.receivedAt.startsWith(filterDate)) return false;
    if (filterStatus === 'partial'  && !r.isPartial) return false;
    if (filterStatus === 'received' &&  r.isPartial) return false;
    return true;
  }).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  // Filtered orders
  const visibleOrders = data.orders.filter(o => {
    const st = getOrderStatus(o, data.receipts);
    if (st === 'received') return false;
    if (orderStatus === 'open'      && st === 'cancelled') return false;
    if (orderStatus === 'cancelled' && st !== 'cancelled') return false;
    if (assigned && !assigned.includes(o.projectId)) return false;
    if (filterProject && o.projectId !== filterProject) return false;
    if (filterOrderSupplier && o.supplier !== filterOrderSupplier) return false;
    return true;
  });

  const uniqueOrderSuppliers = [...new Set(data.orders.map(o => o.supplier))].sort();

  const openOrderCount  = data.orders.filter(o => { const s = getOrderStatus(o, data.receipts); return (s === 'pending' || s === 'partial') && (!assigned || assigned.includes(o.projectId)); }).length;
  const cancelledCount  = data.orders.filter(o => getOrderStatus(o, data.receipts) === 'cancelled' && (!assigned || assigned.includes(o.projectId))).length;
  const partialCount    = data.receipts.filter(r => r.isPartial && (!assigned || assigned.includes(r.projectId))).length;
  const todayCount      = data.receipts.filter(r => r.receivedAt.startsWith(new Date().toISOString().slice(0, 10)) && (!assigned || assigned.includes(r.projectId))).length;
  const allReceipts     = data.receipts.filter(r => !assigned || assigned.includes(r.projectId));
  const uniqueSuppliers = [...new Set(data.receipts.filter(r => !assigned || assigned.includes(r.projectId)).map(r => r.supplier))];

  const TABS = [
    { id: 'receipts',  label: `היסטוריית קבלות (${allReceipts.length})` },
    { id: 'orders',    label: `הזמנות (${openOrderCount}${cancelledCount ? ` + ${cancelledCount} בוטלו` : ''})` },
    { id: 'suppliers', label: 'ספקים' },
    { id: 'catalog',   label: 'קטלוג חומרים' },
  ];

  const ORDER_STATUS_OPTS = [
    { value: 'open',      label: 'פתוחות' },
    { value: 'cancelled', label: 'בוטלו' },
    { value: 'all',       label: 'הכל' },
  ];

  return (
    <div style={{ padding: 24, direction: 'rtl', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>📥 קבלת חומרים</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>ניהול הזמנות רכש, קבלת חומרים והיסטוריית מסירות</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowNewOrder(true)}
            style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📋</span> הזמנה חדשה
          </button>
          <button onClick={() => openWizardForOrder(null)}
            style={{ background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📥</span> קבל חומרים
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 22 }}>
        {[
          { icon: '📋', label: 'הזמנות פתוחות', value: openOrderCount, color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
          { icon: '📅', label: 'קבלות היום',     value: todayCount,    color: '#4fb8e0', bg: '#f0f9ff', border: '#bae6fd' },
          { icon: '🔶', label: 'קבלות חלקיות',  value: partialCount,  color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
          { icon: '📦', label: 'סה"כ קבלות',     value: allReceipts.length, color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background: 'white', borderRadius: 12, padding: '12px 16px', marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterProject} onChange={e => setFP(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 11px', fontSize: 13, outline: 'none', background: 'white' }}>
          <option value="">כל הפרויקטים</option>
          {RECEIVING_PROJECTS.filter(p => !assigned || assigned.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {tab === 'receipts' && (
          <>
            <select value={filterSupplier} onChange={e => setFS(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 11px', fontSize: 13, outline: 'none', background: 'white' }}>
              <option value="">כל הספקים</option>
              {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={filterDate} onChange={e => setFD(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 11px', fontSize: 13, outline: 'none', direction: 'ltr' }} />
            <select value={filterStatus} onChange={e => setFSt(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 11px', fontSize: 13, outline: 'none', background: 'white' }}>
              <option value="">כל הסטטוסים</option>
              <option value="received">התקבל במלואו</option>
              <option value="partial">קבלה חלקית</option>
            </select>
          </>
        )}

        {tab === 'orders' && (
          <>
            <select value={filterOrderSupplier} onChange={e => setFOS(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 11px', fontSize: 13, outline: 'none', background: 'white' }}>
              <option value="">כל הספקים</option>
              {uniqueOrderSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              {ORDER_STATUS_OPTS.map(opt => (
                <button key={opt.value} onClick={() => setOSt(opt.value)}
                  style={{ background: orderStatus === opt.value ? TEAL : '#f1f5f9', color: orderStatus === opt.value ? 'white' : '#475569', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {(filterProject || filterSupplier || filterDate || filterStatus || filterOrderSupplier) && (
          <button onClick={() => { setFP(''); setFS(''); setFD(''); setFSt(''); setFOS(''); }}
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
            נקה סינון
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? TEAL : '#64748b', borderBottom: tab === t.id ? `2px solid ${TEAL}` : '2px solid transparent', fontSize: 14, marginBottom: -2, whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Receipts tab */}
      {tab === 'receipts' && (
        visibleReceipts.length === 0
          ? <EmptyState icon="📥" title="אין קבלות" sub="לחץ על 'קבל חומרים' כדי לרשום קבלת חומרים" />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visibleReceipts.map(r => <ReceiptCard key={r.id} receipt={r} onClick={() => setViewReceipt(r)} />)}
            </div>
      )}

      {/* Orders tab */}
      {tab === 'orders' && (
        visibleOrders.length === 0
          ? <EmptyState icon="📋" title={orderStatus === 'cancelled' ? 'אין הזמנות מבוטלות' : 'אין הזמנות פתוחות'} sub={orderStatus === 'open' ? "לחץ על 'הזמנה חדשה' ליצירת הזמנת רכש" : ''} />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visibleOrders.map(o => (
                <OrderCard key={o.id} order={o} receipts={data.receipts}
                  onView={setViewOrder}
                  onReceive={openWizardForOrder} />
              ))}
            </div>
      )}

      {/* Suppliers tab */}
      {tab === 'suppliers' && <SuppliersTab canManage={canManage} />}

      {/* Catalog tab */}
      {tab === 'catalog' && <MaterialsTab canManage={canManage} />}

      {/* Modals */}
      {showNewOrder && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          onSave={handleSaveOrder}
          orders={data.orders}
        />
      )}
      {showWizard && (
        <ReceiveWizard
          onClose={closeWizard}
          onSave={handleSaveReceipt}
          orders={data.orders}
          receipts={data.receipts}
          currentUserId={uid}
          currentUserName={uname}
          assignedProjectIds={assigned}
          initialOrder={wizardInitialOrder}
        />
      )}
      {viewReceipt && <ReceiptDetailModal receipt={viewReceipt} onClose={() => setViewReceipt(null)} />}
      {viewOrder && (
        <OrderDetailModal
          order={viewOrder}
          receipts={data.receipts}
          onClose={() => setViewOrder(null)}
          onReceive={openWizardForOrder}
          onCancel={handleCancelOrder}
        />
      )}
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
      <p style={{ fontSize: 48, margin: '0 0 12px' }}>{icon}</p>
      <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#64748b' }}>{title}</p>
      {sub && <p style={{ fontSize: 13, margin: '6px 0 0' }}>{sub}</p>}
    </div>
  );
}
