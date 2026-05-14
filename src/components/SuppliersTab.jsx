import { useState } from 'react';
import { loadSuppliers, saveSuppliers, SUPPLIER_CATEGORIES } from '../data/receivingStore';

const TEAL = '#4fb8e0';

function CategoryBadge({ categoryId }) {
  const cat = SUPPLIER_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return null;
  return (
    <span style={{
      background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
      borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
    }}>
      {cat.icon} {cat.label}
    </span>
  );
}

function iStyle(extra) {
  return {
    border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '9px 12px', fontSize: 13,
    outline: 'none', width: '100%', boxSizing: 'border-box', direction: 'rtl',
    fontFamily: 'inherit', color: '#1e293b', background: 'white', ...extra,
  };
}

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

// ─── SupplierModal ─────────────────────────────────────────────────────────────
function SupplierModal({ supplier, onClose, onSave }) {
  const editing = !!supplier;
  const [name,          setName]          = useState(supplier?.name          ?? '');
  const [category,      setCategory]      = useState(supplier?.category      ?? '');
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson ?? '');
  const [phone,         setPhone]         = useState(supplier?.phone         ?? '');
  const [email,         setEmail]         = useState(supplier?.email         ?? '');
  const [address,       setAddress]       = useState(supplier?.address       ?? '');
  const [notes,         setNotes]         = useState(supplier?.notes         ?? '');
  const [errors,        setErrors]        = useState({});

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name     = 'שדה חובה';
    if (!category)    errs.category = 'יש לבחור קטגוריה';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      id:            supplier?.id ?? `sup-${Date.now()}`,
      name:          name.trim(),
      category,
      contactPerson: contactPerson.trim(),
      phone:         phone.trim(),
      email:         email.trim(),
      address:       address.trim(),
      notes:         notes.trim(),
    });
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden' }}>

        <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🏢</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: 'white' }}>{editing ? 'עריכת ספק' : 'ספק חדש'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{editing ? 'ערוך את פרטי הספק' : 'הוסף ספק חדש לרשימה המאושרת'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="שם הספק" required error={errors.name}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="שם החברה או הספק..." style={iStyle()} />
            </FormField>
            <FormField label="קטגוריה" required error={errors.category}>
              <select value={category} onChange={e => setCategory(e.target.value)} style={iStyle()}>
                <option value="">— בחר קטגוריה —</option>
                {SUPPLIER_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="איש קשר">
              <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="שם איש הקשר..." style={iStyle()} />
            </FormField>
            <FormField label="טלפון">
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="מספר טלפון..." style={iStyle({ direction: 'ltr' })} />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label='דוא"ל'>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="כתובת אימייל..." style={iStyle({ direction: 'ltr' })} type="email" />
            </FormField>
            <FormField label="כתובת">
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="כתובת הספק..." style={iStyle()} />
            </FormField>
          </div>

          <FormField label="הערות">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="הערות נוספות על הספק..." style={iStyle({ resize: 'vertical' })} />
          </FormField>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', background: '#fafafa', gap: 10 }}>
          <button onClick={onClose}
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', color: '#475569', fontSize: 14 }}>
            ביטול
          </button>
          <button onClick={handleSave}
            style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 10px rgba(30,41,59,0.3)' }}>
            <span>💾</span> {editing ? 'שמור שינויים' : 'הוסף ספק'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SupplierCard ──────────────────────────────────────────────────────────────
function SupplierCard({ supplier, canManage, onEdit, onDelete, deleteConfirm, onConfirmDelete, onCancelDelete }) {
  const cat = SUPPLIER_CATEGORIES.find(c => c.id === supplier.category);
  return (
    <div
      style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = TEAL; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: cat?.bg ?? '#f8fafc', border: `1.5px solid ${cat?.border ?? '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          {cat?.icon ?? '📦'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 5px', fontWeight: 800, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{supplier.name}</p>
          <CategoryBadge categoryId={supplier.category} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {supplier.contactPerson && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 13 }}>👤</span>
            <span style={{ fontSize: 12, color: '#475569' }}>{supplier.contactPerson}</span>
          </div>
        )}
        {supplier.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 13 }}>📞</span>
            <span style={{ fontSize: 12, color: '#475569', direction: 'ltr', unicodeBidi: 'plaintext' }}>{supplier.phone}</span>
          </div>
        )}
        {supplier.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 13 }}>📧</span>
            <span style={{ fontSize: 12, color: '#475569', direction: 'ltr', unicodeBidi: 'plaintext' }}>{supplier.email}</span>
          </div>
        )}
        {supplier.address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 13 }}>📍</span>
            <span style={{ fontSize: 12, color: '#475569' }}>{supplier.address}</span>
          </div>
        )}
        {supplier.notes && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 13 }}>📝</span>
            <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>{supplier.notes}</span>
          </div>
        )}
      </div>

      {canManage && (
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', gap: 8 }}>
          {!deleteConfirm ? (
            <>
              <button onClick={onEdit}
                style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px', fontWeight: 600, cursor: 'pointer', fontSize: 12, color: '#475569' }}>
                ✏️ ערוך
              </button>
              <button onClick={onDelete}
                style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '7px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>
                🗑️
              </button>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 10px' }}>
              <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, flex: 1 }}>מחק ספק?</span>
              <button onClick={onConfirmDelete}
                style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, padding: '3px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>כן</button>
              <button onClick={onCancelDelete}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, padding: '3px 10px', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>לא</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SuppliersTab (default export) ────────────────────────────────────────────
export default function SuppliersTab({ canManage }) {
  const [suppliers,     setSuppliers]     = useState(() => loadSuppliers());
  const [search,        setSearch]        = useState('');
  const [filterCat,     setFilterCat]     = useState('');
  const [editSupplier,  setEditSupplier]  = useState(null);  // null | 'new' | supplier object
  const [deleteConfirm, setDeleteConfirm] = useState(null);  // supplier id

  function handleSave(sup) {
    setSuppliers(prev => {
      const list = prev.some(s => s.id === sup.id)
        ? prev.map(s => s.id === sup.id ? sup : s)
        : [sup, ...prev];
      saveSuppliers(list);
      return list;
    });
  }

  function handleDelete(id) {
    setSuppliers(prev => {
      const list = prev.filter(s => s.id !== id);
      saveSuppliers(list);
      return list;
    });
    setDeleteConfirm(null);
  }

  const visible = suppliers.filter(s => {
    if (filterCat && s.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) ||
        (s.contactPerson ?? '').toLowerCase().includes(q) ||
        (s.phone ?? '').includes(search);
    }
    return true;
  });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש ספק לפי שם, איש קשר או טלפון..."
          style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 14px', fontSize: 13, outline: 'none', direction: 'rtl', minWidth: 220, flex: 1 }}
        />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 11px', fontSize: 13, outline: 'none', background: 'white' }}>
          <option value="">כל הקטגוריות</option>
          {SUPPLIER_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        {canManage && (
          <button
            onClick={() => setEditSupplier('new')}
            style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            ➕ ספק חדש
          </button>
        )}
      </div>

      {/* Count */}
      {visible.length > 0 && (
        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#94a3b8' }}>
          מציג {visible.length} מתוך {suppliers.length} ספקים
        </p>
      )}

      {/* Grid */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>🏢</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', margin: 0 }}>
            {search || filterCat ? 'לא נמצאו ספקים תואמים' : 'אין ספקים'}
          </p>
          {canManage && !search && !filterCat && (
            <p style={{ fontSize: 13, margin: '6px 0 0' }}>לחץ על 'ספק חדש' להוספה</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {visible.map(s => (
            <SupplierCard
              key={s.id}
              supplier={s}
              canManage={canManage}
              onEdit={() => setEditSupplier(s)}
              onDelete={() => setDeleteConfirm(s.id)}
              deleteConfirm={deleteConfirm === s.id}
              onConfirmDelete={() => handleDelete(s.id)}
              onCancelDelete={() => setDeleteConfirm(null)}
            />
          ))}
        </div>
      )}

      {editSupplier && (
        <SupplierModal
          supplier={editSupplier === 'new' ? null : editSupplier}
          onClose={() => setEditSupplier(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
