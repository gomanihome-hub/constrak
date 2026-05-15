import { useState, useRef } from 'react';
import { loadSuppliers, saveSuppliers, SUPPLIER_CATEGORIES } from '../data/receivingStore';

const TEAL = '#4fb8e0';

// ─── Document types ───────────────────────────────────────────────────────────
const DOC_TYPES = [
  { id: 'contract',  label: 'חוזה',        icon: '📝', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'license',   label: 'רישיון',       icon: '🏛️', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'insurance', label: 'תעודת ביטוח',  icon: '🛡️', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { id: 'other',     label: 'אחר',          icon: '📄', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
];

const ALLOWED_EXTS = new Set(['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']);
const MAX_DOC_SIZE = 5 * 1024 * 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getExt(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function fileIcon(mimeType, fileName) {
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📋';
  if (mimeType?.includes('word') || ['.doc', '.docx'].includes(getExt(fileName ?? ''))) return '📝';
  return '📄';
}

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function downloadDoc(doc) {
  const a = document.createElement('a');
  a.href = doc.dataUrl;
  a.download = doc.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────
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

function DocTypeBadge({ typeId }) {
  const dt = DOC_TYPES.find(t => t.id === typeId) ?? DOC_TYPES[DOC_TYPES.length - 1];
  return (
    <span style={{
      background: dt.bg, color: dt.color, border: `1px solid ${dt.border}`,
      borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {dt.icon} {dt.label}
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

// ─── ModalDocRow — used inside SupplierModal ──────────────────────────────────
function ModalDocRow({ doc, onTypeChange, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px' }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{fileIcon(doc.mimeType, doc.fileName)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.fileName}
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 10, color: '#94a3b8' }}>
          {fmtSize(doc.size)}{doc.size && doc.uploadDate ? ' · ' : ''}{fmtDate(doc.uploadDate)}
        </p>
      </div>
      <select
        value={doc.docType}
        onChange={e => onTypeChange(e.target.value)}
        style={{ border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '5px 9px', fontSize: 11, fontWeight: 700, outline: 'none', background: 'white', direction: 'rtl', cursor: 'pointer', flexShrink: 0 }}
      >
        {DOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
      </select>
      <button
        type="button"
        onClick={onRemove}
        style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#dc2626', fontSize: 13, flexShrink: 0, lineHeight: 1 }}
        title="הסר מסמך"
      >
        🗑️
      </button>
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
  const [documents,     setDocuments]     = useState(supplier?.documents     ?? []);
  const [errors,        setErrors]        = useState({});
  const [fileError,     setFileError]     = useState('');
  const [dragOver,      setDragOver]      = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const fileInputRef = useRef(null);

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
      documents,
    });
    onClose();
  }

  async function handleFilesAdded(files) {
    if (!files.length) return;
    setFileError('');
    const invalid = files.find(f => !ALLOWED_EXTS.has(getExt(f.name)));
    if (invalid) { setFileError(`סוג הקובץ לא נתמך: "${invalid.name}" — מותר PDF, DOC, DOCX, JPG, PNG`); return; }
    const tooBig = files.find(f => f.size > MAX_DOC_SIZE);
    if (tooBig) { setFileError(`הקובץ גדול מדי: "${tooBig.name}" — מקסימום 5MB`); return; }
    setUploading(true);
    try {
      const newDocs = await Promise.all(files.map(async f => ({
        id:         `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fileName:   f.name,
        docType:    'other',
        uploadDate: new Date().toISOString().slice(0, 10),
        dataUrl:    await readFileAsDataUrl(f),
        size:       f.size,
        mimeType:   f.type,
      })));
      setDocuments(prev => [...prev, ...newDocs]);
    } catch {
      setFileError('שגיאה בטעינת הקובץ — נסה שנית');
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e) {
    handleFilesAdded(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFilesAdded(Array.from(e.dataTransfer.files));
  }

  function removeDoc(id)           { setDocuments(prev => prev.filter(d => d.id !== id)); }
  function updateDocType(id, type) { setDocuments(prev => prev.map(d => d.id === id ? { ...d, docType: type } : d)); }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden' }}>

        <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🏢</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: 'white' }}>{editing ? 'עריכת ספק' : 'ספק חדש'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{editing ? 'ערוך את פרטי הספק' : 'הוסף ספק חדש לרשימה המאושרת'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Name + Category */}
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

          {/* Contact person + Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="איש קשר">
              <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="שם איש הקשר..." style={iStyle()} />
            </FormField>
            <FormField label="טלפון">
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="מספר טלפון..." style={iStyle({ direction: 'ltr' })} />
            </FormField>
          </div>

          {/* Email + Address */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label='דוא"ל'>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="כתובת אימייל..." style={iStyle({ direction: 'ltr' })} type="email" />
            </FormField>
            <FormField label="כתובת">
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="כתובת הספק..." style={iStyle()} />
            </FormField>
          </div>

          {/* Notes */}
          <FormField label="הערות">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="הערות נוספות על הספק..." style={iStyle({ resize: 'vertical' })} />
          </FormField>

          {/* ── Documents section ── */}
          <div style={{ borderTop: '1.5px solid #f1f5f9', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                📎 מסמכים
                {documents.length > 0 && (
                  <span style={{ background: TEAL, color: 'white', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>
                    {documents.length}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ background: '#f0f9ff', color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? '⏳ טוען...' : '+ הוסף מסמך'}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />

            {fileError && (
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#ef4444', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '7px 12px' }}>
                ⚠️ {fileError}
              </p>
            )}

            {documents.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragOver ? TEAL : '#e2e8f0'}`,
                  borderRadius: 12, padding: '28px 20px', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: dragOver ? '#f0f9ff' : '#fafafa',
                }}
              >
                <p style={{ margin: 0, fontSize: 28, lineHeight: 1 }}>📎</p>
                <p style={{ margin: '8px 0 3px', fontSize: 13, fontWeight: 600, color: dragOver ? TEAL : '#475569' }}>
                  גרור קבצים לכאן או לחץ להוספה
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                  PDF, DOC, DOCX, JPG, PNG · עד 5MB לקובץ
                </p>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, outline: dragOver ? `2px dashed ${TEAL}` : 'none', borderRadius: 10, padding: dragOver ? 4 : 0, transition: 'all 0.15s' }}
              >
                {documents.map(doc => (
                  <ModalDocRow
                    key={doc.id}
                    doc={doc}
                    onTypeChange={type => updateDocType(doc.id, type)}
                    onRemove={() => removeDoc(doc.id)}
                  />
                ))}
              </div>
            )}
          </div>
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

// ─── DocumentRow — used inside SupplierCard ───────────────────────────────────
function DocumentRow({ doc, canManage, onDelete }) {
  const [delConfirm, setDelConfirm] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: '6px 10px', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; setDelConfirm(false); }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>{fileIcon(doc.mimeType, doc.fileName)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.fileName}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
          {fmtDate(doc.uploadDate)}{doc.size ? ` · ${fmtSize(doc.size)}` : ''}
        </p>
      </div>
      <DocTypeBadge typeId={doc.docType} />
      <button
        onClick={() => downloadDoc(doc)}
        title="הורד קובץ"
        style={{ background: 'transparent', border: 'none', borderRadius: 6, padding: '3px 5px', cursor: 'pointer', color: '#0369a1', fontSize: 14, flexShrink: 0, lineHeight: 1 }}
      >
        ⬇️
      </button>
      {canManage && (
        delConfirm ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>מחק?</span>
            <button onClick={onDelete}
              style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 5, padding: '2px 7px', fontWeight: 700, cursor: 'pointer', fontSize: 10 }}>כן</button>
            <button onClick={() => setDelConfirm(false)}
              style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 5, padding: '2px 7px', fontWeight: 600, cursor: 'pointer', fontSize: 10 }}>לא</button>
          </div>
        ) : (
          <button
            onClick={() => setDelConfirm(true)}
            title="מחק מסמך"
            style={{ background: 'transparent', border: 'none', borderRadius: 6, padding: '3px 5px', cursor: 'pointer', color: '#94a3b8', fontSize: 13, flexShrink: 0, lineHeight: 1, transition: 'color 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          >
            🗑️
          </button>
        )
      )}
    </div>
  );
}

// ─── SupplierCard ──────────────────────────────────────────────────────────────
function SupplierCard({ supplier, canManage, onEdit, onDelete, deleteConfirm, onConfirmDelete, onCancelDelete, onDocDelete }) {
  const cat  = SUPPLIER_CATEGORIES.find(c => c.id === supplier.category);
  const docs = supplier.documents ?? [];
  const [docsExpanded, setDocsExpanded] = useState(false);
  const shownDocs = docsExpanded ? docs : docs.slice(0, 2);

  return (
    <div
      style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = TEAL; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: cat?.bg ?? '#f8fafc', border: `1.5px solid ${cat?.border ?? '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          {cat?.icon ?? '📦'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 5px', fontWeight: 800, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{supplier.name}</p>
          <CategoryBadge categoryId={supplier.category} />
        </div>
      </div>

      {/* Details */}
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

      {/* Documents list */}
      {docs.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
              📎 מסמכים
              <span style={{ background: '#e2e8f0', color: '#475569', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>{docs.length}</span>
            </span>
            {docs.length > 2 && (
              <button
                onClick={() => setDocsExpanded(e => !e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: TEAL, fontWeight: 700, padding: 0 }}
              >
                {docsExpanded ? '▲ פחות' : `▼ עוד ${docs.length - 2}`}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {shownDocs.map(doc => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                canManage={canManage}
                onDelete={() => onDocDelete?.(doc.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
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

  function handleDocDelete(suppId, docId) {
    setSuppliers(prev => {
      const list = prev.map(s =>
        s.id !== suppId ? s : { ...s, documents: (s.documents ?? []).filter(d => d.id !== docId) }
      );
      saveSuppliers(list);
      return list;
    });
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
              onDocDelete={docId => handleDocDelete(s.id, docId)}
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
