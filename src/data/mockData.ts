import type { User, BusinessUnit, Fleet, Vessel, Site, Visit, Finding, FindingProgressEntry, FindingClosingRequest, VesselVisitCompliance, Notification, FindingCategory, InternalInspection, ExternalInspection, InspectionFinding, InternalInspectionSchedule, VisitSchedule, RoleDefinition } from '@/types'

export const mockBusinessUnits: BusinessUnit[] = [
  { id: 'bu-1', code: 'SHP', name: 'Shipping', description: 'Unit bisnis pelayaran', is_active: true, created_at: '2024-01-01' },
  { id: 'bu-2', code: 'FUEL', name: 'Fuel Retail', description: 'Unit bisnis bahan bakar', is_active: true, created_at: '2024-01-01' },
  { id: 'bu-3', code: 'SCM', name: 'Supply Chain', description: 'Unit bisnis rantai pasok', is_active: true, created_at: '2024-01-01' },
  { id: 'bu-4', code: 'SYD', name: 'Shipyard', description: 'Unit bisnis galangan kapal', is_active: true, created_at: '2024-01-01' },
  { id: 'bu-5', code: 'AGR', name: 'Agro', description: 'Unit bisnis pertanian', is_active: true, created_at: '2024-01-01' },
  { id: 'bu-6', code: 'GAS', name: 'Gas', description: 'Unit bisnis gas', is_active: true, created_at: '2024-01-01' },
  { id: 'bu-7', code: 'SHB', name: 'Shorebase', description: 'Unit bisnis shorebase', is_active: true, created_at: '2024-01-01' },
  { id: 'bu-8', code: 'TST', name: 'TST', description: 'Unit bisnis TST', is_active: true, created_at: '2024-01-01' },
]

export const mockUsers: User[] = [
  {
    id: 'user-1', full_name: 'Ahmad Fauzi', email: 'superadmin@barokah.co.id',
    role: 'SUPER_ADMIN', is_active: true, business_units: [], must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-2', full_name: 'Siti Rahayu', email: 'admin@barokah.co.id',
    role: 'ADMIN', is_active: true, business_units: ['bu-1', 'bu-2'], must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-3', full_name: 'Budi Santoso', email: 'direktur@barokah.co.id',
    role: 'MANAGEMENT', is_active: true, business_units: [], must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-4', full_name: 'Hendra Wijaya', email: 'ophead1@barokah.co.id',
    role: 'OP_HEAD', is_active: true, business_units: ['bu-1'], fleet_id: 'fleet-1', must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-5', full_name: 'Dewi Kusuma', email: 'sitemgr@barokah.co.id',
    role: 'SITE_MGR', is_active: true, business_units: ['bu-2'], site_ids: ['site-1'], must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-6', full_name: 'Rudi Hartono', email: 'pic1@barokah.co.id',
    role: 'PIC', is_active: true, business_units: ['bu-1'], must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-7', full_name: 'Yuni Astuti', email: 'viewer@barokah.co.id',
    role: 'VIEWER', is_active: true, business_units: ['bu-1'], must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-8', full_name: 'Rizky Maulana', email: 'ophead2@barokah.co.id',
    role: 'OP_HEAD', is_active: true, business_units: ['bu-1'], fleet_id: 'fleet-2', must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-9', full_name: 'Ir. Bambang Setiawan', email: 'head.hsse@barokah.co.id',
    role: 'HEAD_HSSE', is_active: true, business_units: [], must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-9a', full_name: 'Andi Prasetyo', email: 'hse1@barokah.co.id',
    role: 'STAFF_HSSE', is_active: true, business_units: ['bu-1'], fleet_id: 'fleet-1', must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-10', full_name: 'Sari Wulandari', email: 'hse2@barokah.co.id',
    role: 'STAFF_HSSE', is_active: true, business_units: ['bu-1'], fleet_id: 'fleet-2', must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 'user-11', full_name: 'Bagas Nugroho', email: 'hse3@barokah.co.id',
    role: 'STAFF_HSSE', is_active: true, business_units: ['bu-4'], fleet_id: 'fleet-3', must_change_password: false,
    created_at: '2024-01-01', updated_at: '2024-01-01'
  },
]

export const mockFleets: Fleet[] = [
  { id: 'fleet-1', name: 'Fleet Kalimantan', business_unit_id: 'bu-1', op_head_user_id: 'user-4', hse_officer_id: 'user-9a', visit_frequency: 'monthly', is_active: true, created_at: '2024-01-01' },
  { id: 'fleet-2', name: 'Fleet Sulawesi', business_unit_id: 'bu-1', op_head_user_id: 'user-8', hse_officer_id: 'user-10', visit_frequency: 'monthly', is_active: true, created_at: '2024-01-01' },
  { id: 'fleet-3', name: 'Fleet Jawa', business_unit_id: 'bu-4', hse_officer_id: 'user-11', visit_frequency: 'weekly', is_active: true, created_at: '2024-01-01' },
]

export const mockVessels: Vessel[] = [
  { id: 'vessel-1', name: 'KM Barokah 01', imo_number: 'IMO9876543', vessel_type: 'Tanker', fleet_id: 'fleet-1', business_unit_id: 'bu-1', is_active: true, created_at: '2024-01-01' },
  { id: 'vessel-2', name: 'KM Barokah 02', imo_number: 'IMO9876544', vessel_type: 'Bulk Carrier', fleet_id: 'fleet-1', business_unit_id: 'bu-1', is_active: true, created_at: '2024-01-01' },
  { id: 'vessel-3', name: 'KM Perkasa 01', imo_number: 'IMO9876545', vessel_type: 'Container', fleet_id: 'fleet-2', business_unit_id: 'bu-1', is_active: true, created_at: '2024-01-01' },
  { id: 'vessel-4', name: 'KM Perkasa 02', vessel_type: 'Tanker', fleet_id: 'fleet-2', business_unit_id: 'bu-1', is_active: true, created_at: '2024-01-01' },
  { id: 'vessel-5', name: 'MV Galangan 01', vessel_type: 'Tugboat', fleet_id: 'fleet-3', business_unit_id: 'bu-4', is_active: true, created_at: '2024-01-01' },
]

export const mockSites: Site[] = [
  { id: 'site-1', name: 'SPBU Balikpapan 01', business_unit_id: 'bu-2', address: 'Jl. Soekarno Hatta No. 12, Balikpapan', site_type: 'SPBU', is_active: true, created_at: '2024-01-01' },
  { id: 'site-2', name: 'Shorebase Bontang', business_unit_id: 'bu-7', address: 'Kawasan Industri Bontang', site_type: 'Shorebase', is_active: true, created_at: '2024-01-01' },
  { id: 'site-3', name: 'Gudang Samarinda', business_unit_id: 'bu-3', address: 'Jl. MT Haryono No. 45, Samarinda', site_type: 'Gudang', is_active: true, created_at: '2024-01-01' },
  { id: 'site-4', name: 'Terminal Gas Tarakan', business_unit_id: 'bu-6', address: 'Pelabuhan Tarakan', site_type: 'Terminal', is_active: true, created_at: '2024-01-01' },
]

export const mockFindingCategories: FindingCategory[] = [
  { id: 'cat-1', name: 'Safety', description: 'Temuan terkait keselamatan', is_active: true },
  { id: 'cat-2', name: 'Operasional', description: 'Temuan terkait operasional', is_active: true },
  { id: 'cat-3', name: 'Administrasi', description: 'Temuan terkait administrasi', is_active: true },
  { id: 'cat-4', name: 'Kebersihan', description: 'Temuan terkait kebersihan', is_active: true },
  { id: 'cat-5', name: 'Maintenance', description: 'Temuan terkait perawatan', is_active: true },
  { id: 'cat-6', name: 'Lingkungan', description: 'Temuan terkait lingkungan', is_active: true },
]

export const mockRoles: RoleDefinition[] = [
  {
    id: 'role-1', key: 'SUPER_ADMIN', label: 'Super Admin',
    description: 'Akses penuh ke seluruh fitur dan konfigurasi sistem tanpa batasan.',
    color: 'bg-purple-100 text-purple-800', is_system: true, is_active: true, created_at: '2024-01-01',
  },
  {
    id: 'role-2', key: 'ADMIN', label: 'Admin Sistem',
    description: 'Mengelola pengguna, master data, dan konfigurasi sistem dalam lingkup BU yang ditugaskan.',
    color: 'bg-blue-100 text-blue-800', is_system: true, is_active: true, created_at: '2024-01-01',
  },
  {
    id: 'role-3', key: 'MANAGEMENT', label: 'Direksi / Owner',
    description: 'Melihat seluruh laporan, menyetujui kunjungan, dan memantau performa operasional.',
    color: 'bg-amber-100 text-amber-800', is_system: true, is_active: true, created_at: '2024-01-01',
  },
  {
    id: 'role-4', key: 'HEAD_HSSE', label: 'Head HSSE Corporate',
    description: 'Mengawasi seluruh aktivitas HSSE lintas BU, menyetujui temuan kritis, dan menyusun laporan korporat.',
    color: 'bg-red-100 text-red-800', is_system: true, is_active: true, created_at: '2024-01-01',
  },
  {
    id: 'role-5', key: 'STAFF_HSSE', label: 'Staff HSSE',
    description: 'Melaksanakan inspeksi internal kapal dan mengelola temuan HSSE pada fleet yang ditugaskan.',
    color: 'bg-orange-100 text-orange-800', is_system: true, is_active: true, created_at: '2024-01-01',
  },
  {
    id: 'role-6', key: 'OP_HEAD', label: 'Operation Head',
    description: 'Memimpin kunjungan operasional, mengelola fleet, dan menyetujui laporan di lingkup BU.',
    color: 'bg-indigo-100 text-indigo-800', is_system: true, is_active: true, created_at: '2024-01-01',
  },
  {
    id: 'role-7', key: 'SITE_MGR', label: 'Site Manager',
    description: 'Mengelola kunjungan dan temuan pada site/lokasi yang menjadi tanggung jawabnya.',
    color: 'bg-green-100 text-green-800', is_system: true, is_active: true, created_at: '2024-01-01',
  },
  {
    id: 'role-8', key: 'PIC', label: 'PIC',
    description: 'Penanggung jawab tindak lanjut temuan dan pelaporan progress penyelesaian.',
    color: 'bg-teal-100 text-teal-800', is_system: true, is_active: true, created_at: '2024-01-01',
  },
  {
    id: 'role-9', key: 'VIEWER', label: 'Viewer',
    description: 'Hanya dapat melihat data dan laporan tanpa hak untuk membuat atau mengubah data.',
    color: 'bg-gray-100 text-gray-700', is_system: true, is_active: true, created_at: '2024-01-01',
  },
]

export const mockVisits: Visit[] = []

export const mockProgressEntries: FindingProgressEntry[] = []

export const mockClosingRequests: FindingClosingRequest[] = []

export const mockFindings: Finding[] = []

export const mockVesselCompliance: VesselVisitCompliance[] = []

export const mockNotifications: Notification[] = []

export const mockDashboardChartData: {
  visitsByBUPerMonth: { month: string; [key: string]: string | number }[]
  findingsByStatus: { name: string; value: number; color: string }[]
  findingsByPriority: { priority: string; count: number; color: string }[]
  visitTrend: { month: string; visits: number }[]
  achievementByBU: { bu: string; rate: number }[]
  vesselComplianceTable: { op_head: string; fleet: string; total_vessels: number; visited: number; compliance: number }[]
} = {
  visitsByBUPerMonth: [],
  findingsByStatus: [],
  findingsByPriority: [],
  visitTrend: [],
  achievementByBU: [],
  vesselComplianceTable: [],
}

export const mockInternalInspections: InternalInspection[] = []

export const mockExternalInspections: ExternalInspection[] = []

const headHsse = mockUsers[8]
const hse1 = mockUsers[9]
const hse2 = mockUsers[10]
const hse3 = mockUsers[11]

export const mockInspectionSchedules: InternalInspectionSchedule[] = []

export const mockHseOfficers = [hse1, hse2, hse3]
export const mockHeadHsse = headHsse

const opHead1 = mockUsers[3]
const opHead2 = mockUsers[7]

export const mockVisitSchedules: VisitSchedule[] = []

export const mockOpHeads = [opHead1, opHead2]

export const DEMO_CREDENTIALS = {
  'superadmin@barokah.co.id': { password: 'admin123', userId: 'user-1' },
  'admin@barokah.co.id': { password: 'admin123', userId: 'user-2' },
  'direktur@barokah.co.id': { password: 'admin123', userId: 'user-3' },
  'ophead1@barokah.co.id': { password: 'admin123', userId: 'user-4' },
  'sitemgr@barokah.co.id': { password: 'admin123', userId: 'user-5' },
  'pic1@barokah.co.id': { password: 'admin123', userId: 'user-6' },
  'viewer@barokah.co.id': { password: 'admin123', userId: 'user-7' },
  'head.hsse@barokah.co.id': { password: 'admin123', userId: 'user-9' },
  'hse1@barokah.co.id': { password: 'admin123', userId: 'user-9a' },
  'hse2@barokah.co.id': { password: 'admin123', userId: 'user-10' },
  'hse3@barokah.co.id': { password: 'admin123', userId: 'user-11' },
}

// ─── Master Data: PIS Perusahaan ─────────────────────────────────────────────

export interface MasterPerusahaan {
  id: string
  kode: string
  nama: string
  is_active: boolean
}

export const mockPISPerusahaan: MasterPerusahaan[] = [
  { id: 'peru-1', kode: 'ASG', nama: 'ASG (Armada Samudera Gemilang)', is_active: true },
  { id: 'peru-2', kode: 'BGP', nama: 'BGP (Barokah Group Pertamina)', is_active: true },
]

// ─── Master Data: PIS Tipe Temuan ────────────────────────────────────────────

export interface MasterPISTemuanType {
  id: string
  value: string
  label: string
  description?: string
  is_active: boolean
}

export const mockPISTemuanTypes: MasterPISTemuanType[] = [
  { id: 'temuan-1', value: 'NEGATIVE_FEEDBACK', label: 'Negative Feedback', description: 'Temuan umpan balik negatif dari Pertamina', is_active: true },
  { id: 'temuan-2', value: 'VETTING_PLUS', label: 'Vetting Plus', description: 'Temuan dari proses vetting kapal', is_active: true },
  { id: 'temuan-3', value: 'SELF_ASSESSMENT', label: 'Self Assessment', description: 'Temuan dari penilaian mandiri internal', is_active: true },
]

// ─── Master Data: PIS Kategori ────────────────────────────────────────────────

export interface MasterPISKategori {
  id: string
  nama: string
  is_active: boolean
}

export const mockPISKategori: MasterPISKategori[] = [
  { id: 'piskat-1', nama: 'Akses Segel', is_active: true },
  { id: 'piskat-2', nama: 'CCTV', is_active: true },
  { id: 'piskat-3', nama: 'Clinometer', is_active: true },
  { id: 'piskat-4', nama: 'COT Table', is_active: true },
  { id: 'piskat-5', nama: 'FOT Table', is_active: true },
  { id: 'piskat-6', nama: 'Depth Tape', is_active: true },
  { id: 'piskat-7', nama: 'Drawing', is_active: true },
  { id: 'piskat-8', nama: 'Slop Tank', is_active: true },
  { id: 'piskat-9', nama: 'Thermometer', is_active: true },
  { id: 'piskat-10', nama: 'Hydrometer', is_active: true },
  { id: 'piskat-11', nama: 'UTI', is_active: true },
  { id: 'piskat-12', nama: 'Sampler', is_active: true },
  { id: 'piskat-13', nama: 'Lain-Lain', is_active: true },
  { id: 'piskat-14', nama: 'Tabel ASTM', is_active: true },
  { id: 'piskat-15', nama: 'Perbedaan RH', is_active: true },
  { id: 'piskat-16', nama: 'Lubang Ukur', is_active: true },
  { id: 'piskat-17', nama: 'Vessel Tracking', is_active: true },
  { id: 'piskat-18', nama: 'Technical (Engine / Electric)', is_active: true },
  { id: 'piskat-19', nama: 'Cargo Pump / Simultan', is_active: true },
  { id: 'piskat-20', nama: 'Over Towing', is_active: true },
  { id: 'piskat-21', nama: 'Crew List', is_active: true },
  { id: 'piskat-22', nama: 'Poster WBS', is_active: true },
  { id: 'piskat-23', nama: 'Pressure Gauge', is_active: true },
  { id: 'piskat-24', nama: 'Hydrojar', is_active: true },
  { id: 'piskat-25', nama: 'Water Stick', is_active: true },
  { id: 'piskat-26', nama: 'Pasta Minyak', is_active: true },
  { id: 'piskat-27', nama: 'Pasta Air', is_active: true },
  { id: 'piskat-28', nama: 'Box Ukur', is_active: true },
]

// ─── Master Data: Tipe Inspeksi Eksternal ─────────────────────────────────────

export interface MasterExternalInspectionType {
  id: string
  value: string
  label: string
  description?: string
  color: string
  is_active: boolean
}

export const mockExternalInspectionTypes: MasterExternalInspectionType[] = [
  { id: 'exttype-1', value: 'SIRE', label: 'SIRE', description: 'Ship Inspection Report Programme (OCIMF)', color: 'bg-blue-100 text-blue-800 border-blue-200', is_active: true },
  { id: 'exttype-2', value: 'BIRE', label: 'BIRE', description: 'Barge Inspection Report Exchange', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', is_active: true },
  { id: 'exttype-3', value: 'VETTING_PSA', label: 'Vetting PSA', description: 'Port State Authority Vetting Inspection', color: 'bg-purple-100 text-purple-800 border-purple-200', is_active: true },
  { id: 'exttype-4', value: 'IMCA', label: 'IMCA', description: 'International Marine Contractors Association Audit', color: 'bg-teal-100 text-teal-800 border-teal-200', is_active: true },
  { id: 'exttype-5', value: 'OTHER', label: 'Lainnya', description: 'Jenis inspeksi eksternal lainnya', color: 'bg-gray-100 text-gray-700 border-gray-200', is_active: true },
]
