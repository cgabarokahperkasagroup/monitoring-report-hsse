export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGEMENT' | 'HEAD_HSSE' | 'STAFF_HSSE' | 'OP_HEAD' | 'SITE_MGR' | 'PIC' | 'VIEWER'

export interface RoleDefinition {
  id: string
  key: UserRole
  label: string
  description: string
  color: string
  is_system: boolean
  is_active: boolean
  created_at: string
}

export type VisitType = 'OWNER_VISIT' | 'VESSEL_VISIT' | 'SITE_VISIT'

export type VisitStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export type FindingStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'CLOSED' | 'OVERDUE'

export type FindingPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type ActionType = 'INSPECTION' | 'COORDINATION' | 'REPAIR' | 'MONITORING' | 'TESTING' | 'FINAL_VERIFY' | 'OTHER'

export type VisitFrequency = 'daily' | 'weekly' | 'monthly'

export interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  business_units: string[]
  fleet_id?: string
  site_ids?: string[]
  must_change_password: boolean
  created_by?: string
  created_at: string
  updated_at: string
  avatar?: string
}

export interface BusinessUnit {
  id: string
  code: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
}

export interface Fleet {
  id: string
  name: string
  business_unit_id: string
  business_unit?: BusinessUnit
  op_head_user_id?: string
  op_head?: User
  hse_officer_id?: string
  hse_officer?: User
  visit_frequency: VisitFrequency
  is_active: boolean
  created_at: string
}

export type InspectionScheduleStatus = 'PLANNED' | 'DUE_SOON' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type VisitScheduleStatus = 'PLANNED' | 'DUE_SOON' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface VisitSchedule {
  id: string
  vessel_id: string
  vessel?: Vessel
  fleet_id: string
  fleet?: Fleet
  op_head_user_id?: string
  op_head?: User
  scheduled_date: string
  period_month: number
  period_year: number
  visit_id?: string
  status: VisitScheduleStatus
  notes?: string
  created_by: string
  created_by_user?: User
  created_at: string
}

export interface InternalInspectionSchedule {
  id: string
  vessel_id: string
  vessel?: Vessel
  fleet_id: string
  fleet?: Fleet
  hse_officer_id?: string
  hse_officer?: User
  scheduled_date: string
  period_month: number
  period_year: number
  inspection_id?: string
  status: InspectionScheduleStatus
  notes?: string
  created_by: string
  created_by_user?: User
  created_at: string
}

export interface Vessel {
  id: string
  name: string
  imo_number?: string
  vessel_type?: string
  fleet_id: string
  fleet?: Fleet
  business_unit_id: string
  business_unit?: BusinessUnit
  is_active: boolean
  created_at: string
}

export interface Site {
  id: string
  name: string
  business_unit_id: string
  business_unit?: BusinessUnit
  address?: string
  site_type?: string
  is_active: boolean
  created_at: string
}

export interface Visit {
  id: string
  reference_no: string
  visit_type: VisitType
  business_unit_id: string
  business_unit?: BusinessUnit
  vessel_id?: string
  vessel?: Vessel
  site_id?: string
  site?: Site
  visit_date: string
  start_time?: string
  end_time?: string
  participants: string[]
  agenda?: string
  summary?: string
  status: VisitStatus
  created_by: string
  created_by_user?: User
  approved_by?: string
  approved_by_user?: User
  approved_at?: string
  rejection_notes?: string
  attachments?: string[]
  created_at: string
  updated_at: string
  findings_count?: number
}

export interface FindingCategory {
  id: string
  name: string
  description?: string
  is_active: boolean
}

export interface Finding {
  id: string
  reference_no: string
  visit_id: string
  visit?: Visit
  business_unit_id: string
  business_unit?: BusinessUnit
  title: string
  description: string
  category: string
  priority: FindingPriority
  source_type: VisitType
  is_owner_finding: boolean
  assigned_to?: string
  assigned_to_user?: User
  target_close_date: string
  status: FindingStatus
  initial_photos?: string[]
  closed_at?: string
  closed_by?: string
  closed_by_user?: User
  closing_evidence?: string[]
  closing_notes?: string
  created_by: string
  created_by_user?: User
  created_at: string
  updated_at: string
  progress_entries?: FindingProgressEntry[]
  closing_request?: FindingClosingRequest
}

export interface FindingProgressEntry {
  id: string
  finding_id: string
  action_date: string
  action_type: ActionType
  description: string
  photos?: string[]
  next_steps?: string
  next_action_date?: string
  created_by: string
  created_by_user?: User
  created_at: string
}

export interface FindingClosingRequest {
  id: string
  finding_id: string
  action_date: string
  summary: string
  condition_after: string
  evidence_photos: string[]
  evidence_documents?: string[]
  submitted_by: string
  submitted_by_user?: User
  submitted_at: string
  reviewed_by?: string
  reviewed_by_user?: User
  reviewed_at?: string
  review_decision?: 'APPROVED' | 'REJECTED'
  rejection_notes?: string
}

export interface VesselVisitCompliance {
  id: string
  fleet_id: string
  fleet?: Fleet
  vessel_id: string
  vessel?: Vessel
  op_head_user_id: string
  op_head?: User
  visit_id: string
  visit_date: string
  period_month: number
  period_year: number
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  related_id?: string
  related_type?: string
  is_read: boolean
  created_at: string
}

export interface DashboardStats {
  total_visits: number
  owner_visits: number
  active_findings: number
  critical_findings: number
  achievement_rate: number
  overdue_findings: number
  vessel_compliance_rate: number
}

// ─── PIS Kapal Finding ────────────────────────────────────────────────────────

export type PISFindingStatus = 'CLOSED' | 'OPEN' | 'ON_PROSES' | 'REJECTED' | 'PROCESS_APPROVAL'
export type PISFindingTemuan = 'NEGATIVE_FEEDBACK' | 'VETTING_PLUS' | 'SELF_ASSESSMENT'
export type PISPerusahaan = 'ASG' | 'BGP'

export const PIS_CATEGORIES = [
  'Akses Segel', 'CCTV', 'Clinometer', 'COT Table', 'FOT Table',
  'Depth Tape', 'Drawing', 'Slop Tank', 'Thermometer', 'Hydrometer',
  'UTI', 'Sampler', 'Lain-Lain', 'Tabel ASTM', 'Perbedaan RH',
  'Lubang Ukur', 'Vessel Tracking', 'Technical (Engine / Electric)',
  'Cargo Pump / Simultan', 'Over Towing', 'Crew List', 'Poster WBS',
  'Pressure Gauge', 'Hydrojar', 'Water Stick', 'Pasta Minyak', 'Pasta Air',
  'Box Ukur',
] as const

export type PISCategory = typeof PIS_CATEGORIES[number]

export interface PISProgressEntry {
  id: string
  action_date: string
  description: string
  action_by: string
  created_at: string
}

export interface PISClosingRequest {
  id: string
  actual_closed_date: string
  summary: string
  catatan: string
  submitted_by: string
  submitted_at: string
  review_decision?: 'APPROVED' | 'REJECTED'
  rejection_notes?: string
  reviewed_at?: string
}

export interface PISFinding {
  id: string
  no: number
  perusahaan: PISPerusahaan
  deskripsi: string
  nama_kapal: string
  fleet_inspector: string
  status: PISFindingStatus
  temuan: PISFindingTemuan
  no_ticket: string
  nomor_memo?: string
  tanggal_memo?: string
  category: string
  kendala_action_plan?: string
  approval_note?: string
  reject_note?: string
  open_date: string
  target_closed_date?: string
  actual_closed_date?: string
  operation_head?: string
  person_in_charge?: string
  pending_invoice_sistem: boolean
  pending_invoice_finance: boolean
  kode_month_open?: string
  kode_month_closing?: string
  kode_year_open?: string
  progress_entries?: PISProgressEntry[]
  closing_request?: PISClosingRequest
  created_at: string
  updated_at: string
}

// ─── External Inspection ─────────────────────────────────────────────────────

export type ExternalInspectionType = 'SIRE' | 'BIRE' | 'VETTING_PSA' | 'IMCA' | 'OTHER'
export type InspectionResult = 'SATISFACTORY' | 'CONDITIONAL' | 'UNSATISFACTORY'

export interface InspectionFindingProgress {
  id: string
  action_date: string
  action_type: ActionType
  description: string
  photos?: string[]
  next_steps?: string
  next_action_date?: string
  created_at: string
}

export interface InspectionFindingClosingReq {
  id: string
  action_date: string
  summary: string
  condition_after: string
  evidence_photos: string[]
  submitted_at: string
  review_decision?: 'APPROVED' | 'REJECTED'
  rejection_notes?: string
  reviewed_at?: string
}

export interface InspectionFinding {
  id: string
  area: string
  description: string
  priority: FindingPriority
  status: FindingStatus
  assigned_to?: string
  created_at: string
  target_close_date: string
  closed_at?: string
  initial_photos?: string[]
  closing_evidence?: string[]
  closing_notes?: string
  progress_entries?: InspectionFindingProgress[]
  closing_request?: InspectionFindingClosingReq
}

export interface InternalInspection {
  id: string
  reference_no: string
  vessel_id: string
  vessel?: Vessel
  business_unit_id: string
  business_unit?: BusinessUnit
  inspection_date: string
  lead_inspector: string
  inspectors: string[]
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED'
  result?: InspectionResult
  total_items_checked: number
  items_satisfactory: number
  items_deficient: number
  findings: InspectionFinding[]
  notes?: string
  approved_by?: string
  approved_at?: string
  created_by: string
  created_by_user?: User
  created_at: string
  updated_at: string
}

export interface ExternalInspection {
  id: string
  reference_no: string
  vessel_id: string
  vessel?: Vessel
  business_unit_id: string
  business_unit?: BusinessUnit
  inspection_type: ExternalInspectionType
  inspection_date: string
  inspecting_body: string
  lead_inspector?: string
  port?: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  result?: InspectionResult
  total_observations: number
  critical_observations: number
  major_observations: number
  minor_observations: number
  validity_date?: string
  next_inspection_date?: string
  report_no?: string
  notes?: string
  actions_taken?: string
  findings?: InspectionFinding[]
  created_by: string
  created_by_user?: User
  created_at: string
  updated_at: string
}
