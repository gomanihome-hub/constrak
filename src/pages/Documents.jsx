import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRoles } from '../context/RolesContext';
import {
  loadDocs, saveDocs, DOC_CATEGORIES,
  getCategoryInfo, fmtDocSize, mimeIcon, mimeLabel,
} from '../data/documentsStore';
import { loadProjects } from '../data/projectsStore';

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function downloadDataUrl(dataUrl, name) {
  if (!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  a.click();
}

// ─── AnnotationCanvas ─────────────────────────────────────────────────────────
function AnnotationCanvas({ src, onSave, onClose }) {
  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const [tool, setTool]   = useState('pen'); // pen | arrow | text
  const [color, setColor] = useState('#ef4444');
  const [size, setSize]   = useState(3);
  const [history, setHistory] = useState([]);
  const drawing = useRef(false);
  const startPt = useRef(null);
  const snapshot = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
    img.src = src;
  }, [src]);

  function coords(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function onDown(e) {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    drawing.current = true;
    startPt.current = coords(e);
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (tool === 'pen') {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = size;
      ctx.lineCap     = 'round';
      ctx.moveTo(startPt.current.x, startPt.current.y);
    }
  }

  function onMove(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pt = coords(e);
    if (tool === 'pen') {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else {
      ctx.putImageData(snapshot.current, 0, 0);
      ctx.strokeStyle = color;
      ctx.fillStyle   = color;
      ctx.lineWidth   = size;
      ctx.lineCap     = 'round';
      if (tool === 'arrow') drawArrow(ctx, startPt.current, pt);
    }
  }

  function onUp(e) {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    setHistory(h => [...h, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }

  function drawArrow(ctx, from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const headLen = Math.max(15, size * 5);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle - 0.4), to.y - headLen * Math.sin(angle - 0.4));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle + 0.4), to.y - headLen * Math.sin(angle + 0.4));
    ctx.stroke();
  }

  function addText() {
    const txt = prompt('הכנס טקסט להוספה:');
    if (!txt) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.font = `${size * 6 + 12}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(txt, canvas.width / 2 - 50, canvas.height / 2);
    setHistory(h => [...h, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }

  function undo() {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const prev = history[history.length - 2];
    ctx.putImageData(prev, 0, 0);
    setHistory(h => h.slice(0, -1));
  }

  function save() {
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL('image/png'));
  }

  const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#000000','#ffffff'];
  const TOOLS  = [
    { id: 'pen',   label: '✏️ עט' },
    { id: 'arrow', label: '➡️ חץ' },
    { id: 'text',  label: '🔤 טקסט' },
  ];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.9)', display:'flex', flexDirection:'column' }}>
      {/* toolbar */}
      <div style={{ background:'#1e293b', padding:'10px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', direction:'rtl' }}>
        <button onClick={onClose} style={{ background:'#ef4444', color:'white', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontWeight:600 }}>ביטול</button>
        <div style={{ height:24, width:1, background:'#334155' }} />
        {TOOLS.map(t => (
          <button key={t.id} onClick={t.id === 'text' ? addText : () => setTool(t.id)}
            style={{ background: tool === t.id ? '#4fb8e0' : '#334155', color:'white', border:'none', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontWeight:600, fontSize:13 }}>
            {t.label}
          </button>
        ))}
        <div style={{ height:24, width:1, background:'#334155' }} />
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            style={{ width:22, height:22, borderRadius:'50%', background:c, border: color===c ? '3px solid white' : '2px solid #475569', cursor:'pointer', flexShrink:0 }} />
        ))}
        <div style={{ height:24, width:1, background:'#334155' }} />
        <input type="range" min={1} max={10} value={size} onChange={e => setSize(+e.target.value)} style={{ width:80 }} />
        <div style={{ height:24, width:1, background:'#334155' }} />
        <button onClick={undo} style={{ background:'#334155', color:'white', border:'none', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontWeight:600 }}>↩ בטל</button>
        <button onClick={save} style={{ background:'#22c55e', color:'white', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontWeight:700, marginRight:'auto' }}>שמור גרסה</button>
      </div>
      {/* canvas */}
      <div style={{ flex:1, overflow:'auto', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <canvas
          ref={canvasRef}
          style={{ maxWidth:'100%', maxHeight:'100%', cursor: tool==='text'?'text':'crosshair', border:'2px solid #334155' }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        />
      </div>
    </div>
  );
}

// ─── DocPreview ───────────────────────────────────────────────────────────────
function DocPreview({ doc, version, onClose, onAnnotate }) {
  const vData = doc.versions.find(v => v.version === version);
  const dataUrl = vData?.dataUrl ?? null;
  const isImage = doc.mimeType?.startsWith('image/');
  const isPdf   = doc.mimeType === 'application/pdf';
  const isAudio = doc.mimeType?.startsWith('audio/');
  const isVideo = doc.mimeType?.startsWith('video/');

  if (!dataUrl) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:16, color:'#64748b', direction:'rtl' }}>
        <span style={{ fontSize:64 }}>{mimeIcon(doc.mimeType, doc.name)}</span>
        <p style={{ fontSize:15, fontWeight:600 }}>{doc.name}</p>
        <p style={{ fontSize:13 }}>אין תצוגה מקדימה זמינה לקובץ זה</p>
        <button onClick={() => downloadDataUrl(dataUrl, doc.name)}
          style={{ background:'#4fb8e0', color:'white', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:600, cursor:'pointer' }}>
          הורדה
        </button>
      </div>
    );
  }

  if (isImage) return (
    <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column', alignItems:'center', padding:16, gap:12 }}>
      <img src={dataUrl} alt={doc.name} style={{ maxWidth:'100%', maxHeight:'70vh', borderRadius:8, boxShadow:'0 4px 20px rgba(0,0,0,0.2)' }} />
      {onAnnotate && (
        <button onClick={onAnnotate}
          style={{ background:'#f97316', color:'white', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:600, cursor:'pointer' }}>
          ✏️ הוספת הערות
        </button>
      )}
    </div>
  );

  if (isPdf && dataUrl) {
    const blob = dataUrlToBlob(dataUrl);
    const url  = URL.createObjectURL(blob);
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <iframe src={url} style={{ flex:1, border:'none', minHeight:500 }} title={doc.name} />
      </div>
    );
  }

  if (isAudio) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:16, direction:'rtl' }}>
      <span style={{ fontSize:64 }}>🎵</span>
      <p style={{ fontSize:15, fontWeight:600 }}>{doc.name}</p>
      <audio controls src={dataUrl} style={{ width:300 }} />
    </div>
  );

  if (isVideo) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:16, direction:'rtl' }}>
      <video controls src={dataUrl} style={{ maxWidth:'100%', maxHeight:'70vh', borderRadius:8 }} />
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:16, direction:'rtl' }}>
      <span style={{ fontSize:64 }}>{mimeIcon(doc.mimeType, doc.name)}</span>
      <p style={{ fontSize:15, fontWeight:600 }}>{doc.name}</p>
      <button onClick={() => downloadDataUrl(dataUrl, doc.name)}
        style={{ background:'#4fb8e0', color:'white', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:600, cursor:'pointer' }}>
        הורד קובץ
      </button>
    </div>
  );
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bin  = atob(data);
  const arr  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// ─── DocDetailModal ───────────────────────────────────────────────────────────
function DocDetailModal({ doc, onClose, onUpdate, currentUserId, currentUserName, currentRole, canManage }) {
  const [tab, setTab]         = useState('preview');
  const [viewVersion, setVV]  = useState(doc.currentVersion);
  const [comment, setComment] = useState('');
  const [showAnnotate, setShowAnnotate] = useState(false);
  const [showConfirmDel, setShowConfirmDel] = useState(false);
  const [showVersionNote, setShowVersionNote] = useState(false);
  const [versionNote, setVersionNote]         = useState('');
  const fileInputRef = useRef(null);
  const MAX_SIZE = 15 * 1024 * 1024;

  const catInfo    = getCategoryInfo(doc.category);
  const isImage    = doc.mimeType?.startsWith('image/');
  const myConfirm  = doc.confirmations?.[currentUserId];
  const needConfirm = !myConfirm || myConfirm.version < doc.currentVersion;

  function sendComment() {
    if (!comment.trim()) return;
    const updated = {
      ...doc,
      comments: [
        ...(doc.comments ?? []),
        { id: `cm-${Date.now()}`, fromId: currentUserId, fromName: currentUserName, fromRole: currentRole, body: comment.trim(), sentAt: new Date().toISOString() },
      ],
    };
    onUpdate(updated);
    setComment('');
  }

  function confirm() {
    const updated = {
      ...doc,
      confirmations: {
        ...(doc.confirmations ?? {}),
        [currentUserId]: { version: doc.currentVersion, confirmedAt: new Date().toISOString() },
      },
    };
    onUpdate(updated);
  }

  async function uploadNewVersion(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) { alert('הקובץ גדול מדי (מקסימום 15MB)'); return; }
    const dataUrl = await readFileAsDataUrl(file);
    const newVer  = doc.currentVersion + 1;
    const updated = {
      ...doc,
      mimeType:       file.type || doc.mimeType,
      sizeBytes:      file.size,
      currentVersion: newVer,
      versions: [
        ...doc.versions,
        { version: newVer, dataUrl, uploadedAt: new Date().toISOString(), uploadedBy: currentUserId, uploaderName: currentUserName, note: versionNote },
      ],
    };
    onUpdate(updated);
    setVV(newVer);
    setVersionNote('');
    setShowVersionNote(false);
    e.target.value = '';
  }

  function saveAnnotation(annotatedDataUrl) {
    const newVer = doc.currentVersion + 1;
    const updated = {
      ...doc,
      currentVersion: newVer,
      versions: [
        ...doc.versions,
        { version: newVer, dataUrl: annotatedDataUrl, uploadedAt: new Date().toISOString(), uploadedBy: currentUserId, uploaderName: currentUserName, note: 'גרסה עם הערות' },
      ],
    };
    onUpdate(updated);
    setVV(newVer);
    setShowAnnotate(false);
  }

  const TABS = [
    { id: 'preview',  label: 'תצוגה מקדימה' },
    { id: 'comments', label: `הערות (${doc.comments?.length ?? 0})` },
    { id: 'history',  label: 'היסטוריית גרסאות' },
    { id: 'confirms', label: 'אישורים' },
  ];

  const vData = doc.versions.find(v => v.version === viewVersion);

  if (showAnnotate && isImage && vData?.dataUrl) {
    return <AnnotationCanvas src={vData.dataUrl} onSave={saveAnnotation} onClose={() => setShowAnnotate(false)} />;
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:900, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, direction:'rtl' }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:860, maxHeight:'94vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.35)' }}>
        {/* header */}
        <div style={{ background:'linear-gradient(135deg,#1e293b,#334155)', color:'white', padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:28 }}>{mimeIcon(doc.mimeType, doc.name)}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:700, fontSize:16, margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{doc.name}</p>
            <div style={{ display:'flex', gap:8, marginTop:4, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ background: catInfo.color + '33', color: catInfo.color, borderRadius:12, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{catInfo.icon} {catInfo.label}</span>
              <span style={{ color:'#94a3b8', fontSize:12 }}>{fmtDocSize(doc.sizeBytes)}</span>
              <span style={{ color:'#94a3b8', fontSize:12 }}>גרסה {doc.currentVersion}</span>
              <span style={{ color:'#94a3b8', fontSize:12 }}>{fmtDate(doc.uploadedAt)}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {vData?.dataUrl && (
              <button onClick={() => downloadDataUrl(vData.dataUrl, doc.name)}
                style={{ background:'#4fb8e0', color:'white', border:'none', borderRadius:8, padding:'6px 14px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
                הורדה
              </button>
            )}
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:13, fontWeight:600 }}>✕</button>
          </div>
        </div>

        {/* confirm banner */}
        {needConfirm && (
          <div style={{ background:'#fef3c7', borderBottom:'1px solid #fde68a', padding:'10px 20px', display:'flex', alignItems:'center', gap:12, direction:'rtl' }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <p style={{ margin:0, fontSize:13, color:'#92400e', flex:1 }}>יש לאשר קבלה ועבודה לפי גרסה {doc.currentVersion} של מסמך זה</p>
            <button onClick={confirm} style={{ background:'#f59e0b', color:'white', border:'none', borderRadius:8, padding:'6px 16px', fontWeight:700, cursor:'pointer', fontSize:13 }}>
              אני מאשר/ת ✓
            </button>
          </div>
        )}

        {/* tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #e2e8f0', background:'#f8fafc', padding:'0 20px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'10px 16px', border:'none', background:'transparent', cursor:'pointer', fontWeight: tab===t.id ? 700 : 400,
                color: tab===t.id ? '#4fb8e0' : '#64748b', borderBottom: tab===t.id ? '2px solid #4fb8e0' : '2px solid transparent', fontSize:13, whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* body */}
        <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
          {tab === 'preview' && (
            <DocPreview doc={doc} version={viewVersion} onClose={onClose}
              onAnnotate={isImage && vData?.dataUrl && canManage ? () => setShowAnnotate(true) : null} />
          )}

          {tab === 'comments' && (
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
              {(doc.comments ?? []).length === 0 && <p style={{ color:'#94a3b8', textAlign:'center', marginTop:24 }}>אין הערות עדיין</p>}
              {(doc.comments ?? []).map(c => (
                <div key={c.id} style={{ display:'flex', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'#4fb8e0', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>
                    {c.fromName?.[0] ?? '?'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'baseline' }}>
                      <span style={{ fontWeight:700, fontSize:13 }}>{c.fromName}</span>
                      <span style={{ fontSize:11, color:'#94a3b8' }}>{fmtDateTime(c.sentAt)}</span>
                    </div>
                    <p style={{ margin:'4px 0 0', fontSize:13, color:'#334155', lineHeight:1.5 }}>{c.body}</p>
                  </div>
                </div>
              ))}
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <input value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && sendComment()}
                  placeholder="הוסף הערה..."
                  style={{ flex:1, border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', direction:'rtl' }} />
                <button onClick={sendComment} style={{ background:'#4fb8e0', color:'white', border:'none', borderRadius:8, padding:'8px 14px', fontWeight:600, cursor:'pointer' }}>שלח</button>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
              {canManage && (
                <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                  {showVersionNote
                    ? <>
                        <input value={versionNote} onChange={e => setVersionNote(e.target.value)} placeholder="הערה לגרסה..."
                          style={{ flex:1, border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 12px', fontSize:13, outline:'none', direction:'rtl' }} />
                        <button onClick={() => fileInputRef.current?.click()}
                          style={{ background:'#4fb8e0', color:'white', border:'none', borderRadius:8, padding:'6px 14px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
                          בחר קובץ
                        </button>
                        <button onClick={() => setShowVersionNote(false)}
                          style={{ background:'#e2e8f0', color:'#475569', border:'none', borderRadius:8, padding:'6px 12px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
                          ביטול
                        </button>
                      </>
                    : <button onClick={() => setShowVersionNote(true)}
                        style={{ background:'#4fb8e0', color:'white', border:'none', borderRadius:8, padding:'6px 14px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
                        + העלה גרסה חדשה
                      </button>
                  }
                  <input ref={fileInputRef} type="file" style={{ display:'none' }} onChange={uploadNewVersion} />
                </div>
              )}
              {[...doc.versions].reverse().map(v => (
                <div key={v.version} onClick={() => { setVV(v.version); setTab('preview'); }}
                  style={{ border: viewVersion===v.version ? '2px solid #4fb8e0' : '1px solid #e2e8f0', borderRadius:10, padding:'12px 16px', cursor:'pointer', background: viewVersion===v.version ? '#f0f9ff' : 'white' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>גרסה {v.version}</span>
                    {v.version === doc.currentVersion && <span style={{ background:'#dcfce7', color:'#166534', borderRadius:12, padding:'1px 10px', fontSize:11, fontWeight:700 }}>נוכחית</span>}
                    <span style={{ color:'#64748b', fontSize:12, marginRight:'auto' }}>{fmtDateTime(v.uploadedAt)}</span>
                  </div>
                  <p style={{ margin:'4px 0 0', fontSize:12, color:'#64748b' }}>הועלה על ידי {v.uploaderName}{v.note ? ` — ${v.note}` : ''}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'confirms' && (
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
              <p style={{ color:'#64748b', fontSize:13, margin:'0 0 8px' }}>
                אישורי קבלה לגרסה {doc.currentVersion} ({Object.values(doc.confirmations ?? {}).filter(c => c.version === doc.currentVersion).length} אישורים)
              </p>
              {Object.entries(doc.confirmations ?? {}).map(([uid, conf]) => (
                <div key={uid} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:10 }}>
                  <span style={{ fontSize:20 }}>{conf.version === doc.currentVersion ? '✅' : '⚠️'}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontWeight:600, fontSize:13 }}>{uid}</p>
                    <p style={{ margin:0, fontSize:12, color:'#64748b' }}>גרסה {conf.version} · {fmtDateTime(conf.confirmedAt)}</p>
                  </div>
                </div>
              ))}
              {Object.keys(doc.confirmations ?? {}).length === 0 && (
                <p style={{ color:'#94a3b8', textAlign:'center', marginTop:24 }}>אף אחד לא אישר עדיין</p>
              )}
              {needConfirm && (
                <button onClick={confirm} style={{ background:'#22c55e', color:'white', border:'none', borderRadius:8, padding:'10px', fontWeight:700, cursor:'pointer', marginTop:8 }}>
                  ✓ אשר קבלה ועבודה לפי גרסה {doc.currentVersion}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UploadModal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUpload, projects, existingDocs, currentUserId, currentUserName, assignedProjectIds }) {
  const [name, setName]         = useState('');
  const [projectId, setProject] = useState(assignedProjectIds?.[0] ?? projects[0]?.id ?? '');
  const [category, setCategory] = useState('general');
  const [file, setFile]         = useState(null);
  const [isNewVersion, setIsNV] = useState(false);
  const [parentDocId, setParent]= useState('');
  const [versionNote, setVNote] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const fileRef = useRef(null);
  const MAX_SIZE = 15 * 1024 * 1024;

  const filteredProjects = assignedProjectIds
    ? projects.filter(p => assignedProjectIds.includes(p.id))
    : projects;

  const projectDocs = existingDocs.filter(d => d.projectId === projectId);

  function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) { setError('הקובץ גדול מדי. מקסימום 15MB.'); return; }
    setFile(f);
    setError('');
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  }

  async function submit() {
    if (!file) { setError('נא לבחור קובץ'); return; }
    if (!name.trim()) { setError('נא להזין שם מסמך'); return; }
    if (!projectId) { setError('נא לבחור פרויקט'); return; }
    setLoading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const now = new Date().toISOString();
      if (isNewVersion && parentDocId) {
        const parent = existingDocs.find(d => d.id === parentDocId);
        if (!parent) { setError('מסמך לא נמצא'); return; }
        const newVer = parent.currentVersion + 1;
        const updated = {
          ...parent,
          mimeType: file.type || parent.mimeType,
          sizeBytes: file.size,
          currentVersion: newVer,
          versions: [...parent.versions, { version: newVer, dataUrl, uploadedAt: now, uploadedBy: currentUserId, uploaderName: currentUserName, note: versionNote }],
        };
        onUpload({ type: 'update', doc: updated });
      } else {
        const newDoc = {
          id: `doc-${Date.now()}`,
          name: name.trim(),
          projectId,
          category,
          mimeType: file.type,
          sizeBytes: file.size,
          uploadedBy: currentUserId,
          uploaderName: currentUserName,
          uploadedAt: now,
          currentVersion: 1,
          versions: [{ version: 1, dataUrl, uploadedAt: now, uploadedBy: currentUserId, uploaderName: currentUserName, note: versionNote }],
          confirmations: {},
          comments: [],
          tags: [],
        };
        onUpload({ type: 'create', doc: newDoc });
      }
      onClose();
    } catch { setError('שגיאה בקריאת הקובץ'); }
    finally { setLoading(false); }
  }

  const ALLOWED = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.mp3,.wav,.mp4,.mov,.avi,.dwg,.dxf';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:800, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, direction:'rtl' }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:520, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,#4fb8e0,#80cded)', padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:24 }}>📁</span>
          <p style={{ margin:0, fontWeight:700, fontSize:16, color:'white' }}>העלאת מסמך</p>
          <button onClick={onClose} style={{ marginRight:'auto', background:'rgba(255,255,255,0.2)', border:'none', borderRadius:8, padding:'4px 12px', color:'white', cursor:'pointer', fontWeight:700 }}>✕</button>
        </div>
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
          {/* toggle new version */}
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            <input type="checkbox" checked={isNewVersion} onChange={e => setIsNV(e.target.checked)} style={{ width:16, height:16 }} />
            <span style={{ fontSize:13, fontWeight:600, color:'#334155' }}>העלאה כגרסה חדשה של מסמך קיים</span>
          </label>

          {isNewVersion && (
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#64748b' }}>בחר מסמך קיים</label>
              <select value={parentDocId} onChange={e => setParent(e.target.value)}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:13, marginTop:4, outline:'none', background:'white' }}>
                <option value="">-- בחר מסמך --</option>
                {projectDocs.map(d => <option key={d.id} value={d.id}>{d.name} (גרסה {d.currentVersion})</option>)}
              </select>
            </div>
          )}

          {/* file pick */}
          <div onClick={() => fileRef.current?.click()}
            style={{ border:`2px dashed ${file ? '#22c55e' : '#cbd5e1'}`, borderRadius:10, padding:20, textAlign:'center', cursor:'pointer', background: file ? '#f0fdf4' : '#f8fafc' }}>
            <input ref={fileRef} type="file" accept={ALLOWED} style={{ display:'none' }} onChange={pickFile} />
            {file
              ? <><p style={{ margin:0, fontWeight:700, color:'#166534' }}>{mimeIcon(file.type, file.name)} {file.name}</p><p style={{ margin:'4px 0 0', fontSize:12, color:'#64748b' }}>{fmtDocSize(file.size)}</p></>
              : <><p style={{ margin:0, fontSize:15, color:'#64748b' }}>לחץ לבחירת קובץ</p><p style={{ margin:'4px 0 0', fontSize:11, color:'#94a3b8' }}>jpg, png, pdf, doc, xlsx, mp3, mp4, dwg ועוד · מקסימום 15MB</p></>
            }
          </div>

          {!isNewVersion && (
            <>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#64748b' }}>שם מסמך</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="שם המסמך"
                  style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:13, marginTop:4, outline:'none', boxSizing:'border-box', direction:'rtl' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#64748b' }}>פרויקט</label>
                  <select value={projectId} onChange={e => setProject(e.target.value)}
                    style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:13, marginTop:4, outline:'none', background:'white' }}>
                    {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#64748b' }}>קטגוריה</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:13, marginTop:4, outline:'none', background:'white' }}>
                    {DOC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#64748b' }}>הערה לגרסה (אופציונלי)</label>
            <input value={versionNote} onChange={e => setVNote(e.target.value)} placeholder="הערה קצרה..."
              style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:13, marginTop:4, outline:'none', boxSizing:'border-box', direction:'rtl' }} />
          </div>

          {error && <p style={{ margin:0, color:'#ef4444', fontSize:12 }}>{error}</p>}

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button onClick={onClose} style={{ background:'#f1f5f9', color:'#475569', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:600, cursor:'pointer' }}>ביטול</button>
            <button onClick={submit} disabled={loading}
              style={{ background: loading ? '#93c5fd' : '#4fb8e0', color:'white', border:'none', borderRadius:8, padding:'8px 24px', fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'מעלה...' : 'העלה מסמך'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DocCard ──────────────────────────────────────────────────────────────────
function DocCard({ doc, onOpen, onDelete, canManage, currentUserId }) {
  const catInfo   = getCategoryInfo(doc.category);
  const isImage   = doc.mimeType?.startsWith('image/');
  const vData     = doc.versions.find(v => v.version === doc.currentVersion);
  const myConfirm = doc.confirmations?.[currentUserId];
  const needConf  = !myConfirm || myConfirm.version < doc.currentVersion;

  return (
    <div onClick={onOpen}
      style={{ background:'white', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', border:'1px solid #e2e8f0', cursor:'pointer', transition:'box-shadow 0.15s', display:'flex', flexDirection:'column' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(79,184,224,0.2)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.08)'}
    >
      {/* thumbnail / icon */}
      <div style={{ height:120, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        {isImage && vData?.dataUrl
          ? <img src={vData.dataUrl} alt={doc.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <span style={{ fontSize:48 }}>{mimeIcon(doc.mimeType, doc.name)}</span>
        }
        {/* category badge top-right */}
        <span style={{ position:'absolute', top:8, right:8, background: catInfo.color, color:'white', borderRadius:12, padding:'2px 10px', fontSize:11, fontWeight:700 }}>
          {catInfo.icon} {catInfo.label}
        </span>
        {/* version badge */}
        {doc.currentVersion > 1 && (
          <span style={{ position:'absolute', top:8, left:8, background:'#1e293b', color:'white', borderRadius:12, padding:'2px 8px', fontSize:11, fontWeight:700 }}>
            v{doc.currentVersion}
          </span>
        )}
        {/* needs confirm badge */}
        {needConf && (
          <span style={{ position:'absolute', bottom:8, right:8, background:'#f59e0b', color:'white', borderRadius:12, padding:'2px 8px', fontSize:10, fontWeight:700 }}>
            ⚠️ לאישור
          </span>
        )}
      </div>
      {/* info */}
      <div style={{ padding:'10px 12px', flex:1, display:'flex', flexDirection:'column', gap:4 }}>
        <p style={{ margin:0, fontWeight:700, fontSize:13, color:'#1e293b', lineHeight:1.3, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{doc.name}</p>
        <p style={{ margin:0, fontSize:11, color:'#64748b' }}>{fmtDocSize(doc.sizeBytes)} · {fmtDate(doc.uploadedAt)}</p>
        <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>{doc.uploaderName}</p>
        {doc.comments?.length > 0 && <p style={{ margin:'2px 0 0', fontSize:11, color:'#4fb8e0' }}>💬 {doc.comments.length} הערות</p>}
      </div>
      {/* actions row */}
      {canManage && (
        <div style={{ borderTop:'1px solid #f1f5f9', padding:'8px 12px', display:'flex', justifyContent:'flex-end' }} onClick={e => e.stopPropagation()}>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:12, fontWeight:600, padding:'2px 6px', borderRadius:6 }}>
            🗑️ מחק
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Documents component ─────────────────────────────────────────────────
export default function Documents() {
  const { currentSystemUser, currentRole, can, getAssignedProjectIds } = useRoles();
  const [docsData, setDocsData] = useState(() => loadDocs());
  const [showUpload, setShowUpload] = useState(false);
  const [activeDoc,  setActiveDoc]  = useState(null);
  const [filterProject,  setFP] = useState('');
  const [filterCategory, setFC] = useState('');
  const [search,         setSearch] = useState('');
  const [sortBy,         setSort]   = useState('date_desc');
  const [deleteConfirm,  setDelConfirm] = useState(null);

  const uid  = currentSystemUser?.id;
  const uname = currentSystemUser?.displayName ?? 'משתמש';
  const assignedIds = getAssignedProjectIds(); // null = all (admin)
  const canManage   = can.manageUsers || can.viewDashboard; // admin, pm, sm
  const canUpload   = canManage;

  const [projects, setProjects] = useState(() => loadProjects());

  // Reload on storage event (cross-tab)
  useEffect(() => {
    function onDocs() { setDocsData(loadDocs()); }
    window.addEventListener('constrak:docs', onDocs);
    return () => window.removeEventListener('constrak:docs', onDocs);
  }, []);

  useEffect(() => {
    function reloadProjects() { setProjects(loadProjects()); }
    window.addEventListener('constrak:projects', reloadProjects);
    return () => window.removeEventListener('constrak:projects', reloadProjects);
  }, []);

  // Sync activeDoc when docsData changes
  useEffect(() => {
    if (activeDoc) {
      const updated = docsData.documents.find(d => d.id === activeDoc.id);
      if (updated) setActiveDoc(updated);
    }
  }, [docsData]);

  const visibleProjects = useMemo(() => {
    if (!assignedIds) return projects;
    return projects.filter(p => assignedIds.includes(p.id));
  }, [assignedIds, projects]);

  const filtered = useMemo(() => {
    let docs = docsData.documents.filter(d => {
      if (assignedIds && !assignedIds.includes(d.projectId)) return false;
      if (filterProject  && d.projectId !== filterProject)  return false;
      if (filterCategory && d.category  !== filterCategory) return false;
      if (search && !d.name.includes(search) && !d.uploaderName?.includes(search)) return false;
      return true;
    });
    docs.sort((a, b) => {
      if (sortBy === 'date_desc') return b.uploadedAt.localeCompare(a.uploadedAt);
      if (sortBy === 'date_asc')  return a.uploadedAt.localeCompare(b.uploadedAt);
      if (sortBy === 'name')      return a.name.localeCompare(b.name, 'he');
      if (sortBy === 'size')      return b.sizeBytes - a.sizeBytes;
      return 0;
    });
    return docs;
  }, [docsData, filterProject, filterCategory, search, sortBy, assignedIds]);

  function handleUpload({ type, doc }) {
    setDocsData(prev => {
      const docs = type === 'create'
        ? [...prev.documents, doc]
        : prev.documents.map(d => d.id === doc.id ? doc : d);
      const next = { ...prev, documents: docs };
      saveDocs(next);
      return next;
    });
  }

  function updateDoc(doc) {
    setDocsData(prev => {
      const docs = prev.documents.map(d => d.id === doc.id ? doc : d);
      const next = { ...prev, documents: docs };
      saveDocs(next);
      return next;
    });
    setActiveDoc(doc);
  }

  function deleteDoc(docId) {
    setDocsData(prev => {
      const docs = prev.documents.filter(d => d.id !== docId);
      const next = { ...prev, documents: docs };
      saveDocs(next);
      return next;
    });
    if (activeDoc?.id === docId) setActiveDoc(null);
    setDelConfirm(null);
  }

  // stats
  const totalDocs      = filtered.length;
  const pendingConfirm = filtered.filter(d => {
    const c = d.confirmations?.[uid];
    return !c || c.version < d.currentVersion;
  }).length;
  const totalComments  = filtered.reduce((s, d) => s + (d.comments?.length ?? 0), 0);

  return (
    <div style={{ padding:24, direction:'rtl', maxWidth:1400, margin:'0 auto' }}>
      {/* Page title */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#1e293b' }}>📁 מסמכי פרויקט</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'#64748b' }}>ניהול וצפייה בכל מסמכי הפרויקטים</p>
        </div>
        {canUpload && (
          <button onClick={() => setShowUpload(true)}
            style={{ background:'linear-gradient(135deg,#4fb8e0,#80cded)', color:'white', border:'none', borderRadius:10, padding:'10px 22px', fontWeight:700, cursor:'pointer', fontSize:14, boxShadow:'0 2px 8px rgba(79,184,224,0.4)' }}>
            + העלה מסמך
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { icon:'📄', label:'מסמכים', value:totalDocs,       color:'#3b82f6' },
          { icon:'⚠️', label:'לאישור', value:pendingConfirm,  color:'#f59e0b' },
          { icon:'💬', label:'הערות',  value:totalComments,   color:'#8b5cf6' },
        ].map(s => (
          <div key={s.label} style={{ background:'white', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)', border:'1px solid #e2e8f0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:24 }}>{s.icon}</span>
              <div>
                <p style={{ margin:0, fontSize:22, fontWeight:800, color: s.color }}>{s.value}</p>
                <p style={{ margin:0, fontSize:12, color:'#64748b' }}>{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:'white', borderRadius:12, padding:'14px 18px', marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,0.07)', border:'1px solid #e2e8f0', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 חיפוש לפי שם..."
          style={{ flex:1, minWidth:160, border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 12px', fontSize:13, outline:'none', direction:'rtl' }} />
        <select value={filterProject} onChange={e => setFP(e.target.value)}
          style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 12px', fontSize:13, outline:'none', background:'white', minWidth:140 }}>
          <option value="">כל הפרויקטים</option>
          {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFC(e.target.value)}
          style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 12px', fontSize:13, outline:'none', background:'white', minWidth:130 }}>
          <option value="">כל הקטגוריות</option>
          {DOC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSort(e.target.value)}
          style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 12px', fontSize:13, outline:'none', background:'white', minWidth:130 }}>
          <option value="date_desc">תאריך — חדש ראשון</option>
          <option value="date_asc">תאריך — ישן ראשון</option>
          <option value="name">שם מסמך</option>
          <option value="size">גודל קובץ</option>
        </select>
        {(filterProject || filterCategory || search) && (
          <button onClick={() => { setFP(''); setFC(''); setSearch(''); }}
            style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 14px', fontSize:12, color:'#64748b', cursor:'pointer', fontWeight:600 }}>
            נקה סינון
          </button>
        )}
      </div>

      {/* Category quick-filter chips */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        <button onClick={() => setFC('')}
          style={{ border:'none', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:700, cursor:'pointer', background: !filterCategory ? '#4fb8e0' : '#f1f5f9', color: !filterCategory ? 'white' : '#64748b' }}>
          הכל
        </button>
        {DOC_CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFC(c.id === filterCategory ? '' : c.id)}
            style={{ border:'none', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:700, cursor:'pointer',
              background: filterCategory === c.id ? c.color : '#f1f5f9',
              color: filterCategory === c.id ? 'white' : '#64748b' }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0
        ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
            <p style={{ fontSize:48, margin:'0 0 12px' }}>📂</p>
            <p style={{ fontSize:16, fontWeight:600, margin:0 }}>אין מסמכים</p>
            <p style={{ fontSize:13, margin:'4px 0 0' }}>נסה לשנות את הסינון או לאישור מסמכים</p>
          </div>
        )
        : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
            {filtered.map(doc => (
              <DocCard key={doc.id} doc={doc} currentUserId={uid} canManage={canManage}
                onOpen={() => setActiveDoc(doc)}
                onDelete={() => setDelConfirm(doc.id)}
              />
            ))}
          </div>
        )
      }

      {/* Modals */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload}
          projects={projects} existingDocs={docsData.documents}
          currentUserId={uid} currentUserName={uname}
          assignedProjectIds={assignedIds} />
      )}

      {activeDoc && (
        <DocDetailModal doc={activeDoc} onClose={() => setActiveDoc(null)} onUpdate={updateDoc}
          currentUserId={uid} currentUserName={uname} currentRole={currentRole} canManage={canManage} />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:950, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', direction:'rtl' }}>
          <div style={{ background:'white', borderRadius:14, padding:28, maxWidth:360, width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <p style={{ fontSize:24, textAlign:'center', margin:'0 0 12px' }}>🗑️</p>
            <p style={{ fontWeight:700, fontSize:16, textAlign:'center', margin:'0 0 8px' }}>מחיקת מסמך</p>
            <p style={{ fontSize:13, color:'#64748b', textAlign:'center', margin:'0 0 20px' }}>האם אתה בטוח שברצונך למחוק את המסמך? פעולה זו אינה הפיכה.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={() => setDelConfirm(null)} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:600, cursor:'pointer', color:'#475569' }}>ביטול</button>
              <button onClick={() => deleteDoc(deleteConfirm)} style={{ background:'#ef4444', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:700, cursor:'pointer', color:'white' }}>מחק</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
