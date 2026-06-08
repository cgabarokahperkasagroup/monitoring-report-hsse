// Centralized dropdown options — semua halaman harus import dari sini,
// bukan mendefinisikan ulang option secara hardcoded.

// ─── Visit ───────────────────────────────────────────────────────────────────

export const VISIT_TYPE_OPTIONS = [
  { value: 'OWNER_VISIT', label: 'Owner Visit' },
  { value: 'VESSEL_VISIT', label: 'Vessel Visit' },
  { value: 'SITE_VISIT', label: 'Site Visit' },
] as const

export const VISIT_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const

// ─── Finding ─────────────────────────────────────────────────────────────────

export const FINDING_STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'OVERDUE', label: 'Overdue' },
] as const

export const FINDING_PRIORITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
] as const

// ─── Internal Inspection ─────────────────────────────────────────────────────

export const INTERNAL_INSPECTION_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Disubmit' },
  { value: 'APPROVED', label: 'Disetujui' },
] as const

export const INSPECTION_RESULT_OPTIONS = [
  { value: 'SATISFACTORY', label: 'Satisfactory' },
  { value: 'CONDITIONAL', label: 'Conditional' },
  { value: 'UNSATISFACTORY', label: 'Unsatisfactory' },
] as const

export const INSPECTION_SCHEDULE_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Direncanakan' },
  { value: 'DUE_SOON', label: 'Segera Jatuh Tempo' },
  { value: 'IN_PROGRESS', label: 'Sedang Berjalan' },
  { value: 'OVERDUE', label: 'Terlambat' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
] as const

// ─── External Inspection ─────────────────────────────────────────────────────

export const EXTERNAL_INSPECTION_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Dijadwalkan' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
] as const

// ─── PIS Finding ─────────────────────────────────────────────────────────────

export const PIS_FINDING_STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ON_PROSES', label: 'On Proses' },
  { value: 'PROCESS_APPROVAL', label: 'Process Approval' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLOSED', label: 'Closed' },
] as const
