import { useState } from 'react';
import { loadCatalog, saveCatalog, CATALOG_CATEGORIES, UNIT_OPTIONS } from '../data/receivingStore';

const TEAL = '#4fb8e0';

function CategoryBadge({ categoryId }) {
  const cat = CATALOG_CATEGORIES.find(c => c.id === categoryId);
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

function generateCatalogNum(catalog) {
  const nums = catalog
    .map(c => { const m = c.catalogNum?.match(/^CAT-(\d+)$/); return m ? parseInt(m[1], 10) : 0; })
    .filter(n => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `CAT-${String(next).padStart(3, '0')}`;
}

// ─── MaterialModal ─────────────────────────────────────────────────────────────
function MaterialModal({ item, catalog, onClose, onSave }) {
  const editing = !!item;
  const [name,       setName]       = useState(item?.name        ?? '');
  const [unit,       setUnit]       = useState(item?.unit        ?? UNIT_OPTIONS[0]);
  const [category,   setCategory]   = useState(item?.category    ?? '');
  const [catalogNum, setCatalogNum] = useState(item?.catalogNum  ?? generateCatalogNum(catalog));
  const [description,setDescription]= useState(item?.description ?? '');
  const [errors,     setErrors]     = useState({});

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name     = 'שדה חובה';
    if (!unit)        errs.unit     = 'יש לבחור יחידה';
    if (!category)    errs.category = 'יש לבחור קטגוריה';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      id:          item?.id ?? `cat-${Date.now()}`,
      catalogNum:  catalogNum.trim() || generateCatalogNum(catalog),
      name:        name.trim(),
      unit,
      category,
      description: description.trim(),
    });
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden' }}>

        <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>📦</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: 'white' }}>{editing ? 'עריכת חומר' : 'חומר חדש'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{editing ? 'ערוך פרטי החומר בקטלוג' : 'הוסף חומר חדש לקטלוג'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="שם החומר" required error={errors.name}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="שם החומר..." style={iStyle()} />
            </FormField>
            <FormField label="מק&quot;ט / מספר קטלוג">
              <input value={catalogNum} onChange={e => setCatalogNum(e.target.value)} placeholder="נוצר אוטומטית..." style={iStyle()} />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="יחידת מידה" required error={errors.unit}>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={iStyle()}>
                <option value="">— בחר יחידה —</option>
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </FormField>
            <FormField label="קטגוריה" required error={errors.category}>
              <select value={category} onChange={e => setCategory(e.target.value)} style={iStyle()}>
                <option value="">— בחר קטגוריה —</option>
                {CATALOG_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="תיאור">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="תיאור קצר של החומר, מפרט טכני וכו'..." style={iStyle({ resize: 'vertical' })} />
          </FormField>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', background: '#fafafa', gap: 10 }}>
          <button onClick={onClose}
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', color: '#475569', fontSize: 14 }}>
            ביטול
          </button>
          <button onClick={handleSave}
            style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 10px rgba(30,41,59,0.3)' }}>
            <span>💾</span> {editing ? 'שמור שינויים' : 'הוסף לקטלוג'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MaterialsTab (default export) ────────────────────────────────────────────
export default function MaterialsTab({ canManage }) {
  const [catalog,       setCatalog]       = useState(() => loadCatalog());
  const [search,        setSearch]        = useState('');
  const [filterCat,     setFilterCat]     = useState('');
  const [editItem,      setEditItem]      = useState(null);   // null | 'new' | item object
  const [deleteConfirm, setDeleteConfirm] = useState(null);   // item id

  function handleSave(item) {
    setCatalog(prev => {
      const list = prev.some(c => c.id === item.id)
        ? prev.map(c => c.id === item.id ? item : c)
        : [item, ...prev];
      saveCatalog(list);
      return list;
    });
  }

  function handleDelete(id) {
    setCatalog(prev => {
      const list = prev.filter(c => c.id !== id);
      saveCatalog(list);
      return list;
    });
    setDeleteConfirm(null);
  }

  const visible = catalog.filter(c => {
    if (filterCat && c.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) ||
        (c.catalogNum ?? '').toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  // Group counts for category chips
  const catCounts = {};
  catalog.forEach(c => { catCounts[c.category] = (catCounts[c.category] ?? 0) + 1; });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש לפי שם, מק&quot;ט או תיאור..."
          style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 14px', fontSize: 13, outline: 'none', direction: 'rtl', minWidth: 220, flex: 1 }}
        />
        {canManage && (
          <button
            onClick={() => setEditItem('new')}
            style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            ➕ חומר חדש
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => setFilterCat('')}
          style={{ background: !filterCat ? TEAL : '#f1f5f9', color: !filterCat ? 'white' : '#475569', border: 'none', borderRadius: 8, padding: '5px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
          הכל ({catalog.length})
        </button>
        {CATALOG_CATEGORIES.filter(c => catCounts[c.id] > 0).map(c => (
          <button key={c.id}
            onClick={() => setFilterCat(filterCat === c.id ? '' : c.id)}
            style={{ background: filterCat === c.id ? c.color : c.bg, color: filterCat === c.id ? 'white' : c.color, border: `1px solid ${c.border}`, borderRadius: 8, padding: '5px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {c.icon} {c.label} ({catCounts[c.id]})
          </button>
        ))}
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>📦</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', margin: 0 }}>
            {search || filterCat ? 'לא נמצאו חומרים תואמים' : 'הקטלוג ריק'}
          </p>
          {canManage && !search && !filterCat && (
            <p style={{ fontSize: 13, margin: '6px 0 0' }}>לחץ על 'חומר חדש' להוספה</p>
          )}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                {['מק"ט', 'שם החומר', 'יחידה', 'קטגוריה', 'תיאור', canManage ? 'פעולות' : null]
                  .filter(Boolean)
                  .map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((item, i) => (
                <CatalogRow
                  key={item.id}
                  item={item}
                  isLast={i === visible.length - 1}
                  canManage={canManage}
                  onEdit={() => setEditItem(item)}
                  onDelete={() => setDeleteConfirm(item.id)}
                  deleteConfirm={deleteConfirm === item.id}
                  onConfirmDelete={() => handleDelete(item.id)}
                  onCancelDelete={() => setDeleteConfirm(null)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visible.length > 0 && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#94a3b8', textAlign: 'left' }}>
          מציג {visible.length} מתוך {catalog.length} פריטים
        </p>
      )}

      {editItem && (
        <MaterialModal
          item={editItem === 'new' ? null : editItem}
          catalog={catalog}
          onClose={() => setEditItem(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function CatalogRow({ item, isLast, canManage, onEdit, onDelete, deleteConfirm, onConfirmDelete, onCancelDelete }) {
  const [hovered, setHovered] = useState(false);
  const cat = CATALOG_CATEGORIES.find(c => c.id === item.category);

  return (
    <tr
      style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9', background: hovered ? '#fafbff' : 'white', transition: 'background 0.1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: '11px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
        {item.catalogNum}
      </td>
      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
        {item.name}
      </td>
      <td style={{ padding: '11px 14px', fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
        <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{item.unit}</span>
      </td>
      <td style={{ padding: '11px 14px' }}>
        <CategoryBadge categoryId={item.category} />
      </td>
      <td style={{ padding: '11px 14px', fontSize: 12, color: '#64748b', maxWidth: 280 }}>
        {item.description || '—'}
      </td>
      {canManage && (
        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
          {!deleteConfirm ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onEdit}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '5px 10px', fontWeight: 600, cursor: 'pointer', fontSize: 11, color: '#475569' }}>
                ✏️ ערוך
              </button>
              <button onClick={onDelete}
                style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, padding: '5px 8px', fontWeight: 600, cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>
                🗑️
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '5px 9px' }}>
              <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>מחק?</span>
              <button onClick={onConfirmDelete}
                style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 5, padding: '3px 8px', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>כן</button>
              <button onClick={onCancelDelete}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 5, padding: '3px 8px', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>לא</button>
            </div>
          )}
        </td>
      )}
    </tr>
  );
}
