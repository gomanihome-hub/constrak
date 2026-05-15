const STORE_KEY = 'constrak_sub_reports';
const ALERTS_KEY = 'constrak_alerts';

export const APPROVAL_CHAIN = ['subcontractor', 'site_manager', 'project_manager', 'admin'];

export const APPROVAL_STATUS_INFO = {
  draft:    { label: 'טיוטה',          icon: '📝', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  pending:  { label: 'ממתין לאישור',   icon: '⏳', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  approved: { label: 'מאושר',           icon: '✅', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
};

export const CHAIN_ROLE_LABELS = {
  subcontractor:   'קבלן משנה',
  site_manager:    'מנהל עבודה',
  project_manager: 'מנהל פרויקט',
  admin:           'בעל פרויקט',
};

export function loadReports() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { return []; }
}

export function saveReports(reports) {
  localStorage.setItem(STORE_KEY, JSON.stringify(reports));
  window.dispatchEvent(new Event('constrak:approvals'));
}

export function getNextApproverRole(report) {
  const signedRoles = new Set((report.signatures || []).map(s => s.role));
  return APPROVAL_CHAIN.find(role => !signedRoles.has(role)) ?? null;
}

export function canApproveReport(report, userRole) {
  if (!report || !report.approvalStatus || report.approvalStatus === 'draft') return false;
  if (report.approvalStatus === 'approved') return false;
  return getNextApproverRole(report) === userRole;
}

export function signReport(reportId, userId, displayName, role, notes) {
  const reports = loadReports();
  const idx = reports.findIndex(r => r.id === reportId);
  if (idx === -1) return null;

  const report = reports[idx];
  const signatures = [
    ...(report.signatures || []),
    { role, userId, displayName, signedAt: new Date().toISOString(), notes: notes || '' },
  ];
  const signedRoles = new Set(signatures.map(s => s.role));
  const nextRole = APPROVAL_CHAIN.find(r => !signedRoles.has(r));
  const approvalStatus = nextRole ? 'pending' : 'approved';

  const updated = { ...report, signatures, approvalStatus };
  reports[idx] = updated;
  saveReports(reports);

  if (nextRole) _addApprovalNotification(updated, nextRole);
  return updated;
}

function _addApprovalNotification(report, targetRole) {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    const data = raw ? JSON.parse(raw) : { notifications: [], settings: {}, lastRun: {} };
    const notif = {
      id: `approval-${report.id}-${targetRole}-${Date.now()}`,
      type: 'report_approval',
      targetRole,
      reportId: report.id,
      reportDate: report.date,
      submitterName: report.displayName,
      submitterTrade: report.trade || '',
      triggeredAt: new Date().toISOString(),
      readBy: [],
      dismissed: false,
    };
    localStorage.setItem(ALERTS_KEY, JSON.stringify({
      ...data,
      notifications: [...(data.notifications || []), notif],
    }));
    window.dispatchEvent(new Event('constrak:alerts'));
  } catch {}
}

export function getPendingApprovalsForRole(userRole) {
  return loadReports().filter(r =>
    r.approvalStatus === 'pending' && getNextApproverRole(r) === userRole
  );
}

export function getPendingApprovalCount(userRole) {
  return getPendingApprovalsForRole(userRole).length;
}
