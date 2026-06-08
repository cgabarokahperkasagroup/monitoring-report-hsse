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

const bu1 = mockBusinessUnits[0]
const bu2 = mockBusinessUnits[1]
const user3 = mockUsers[2]
const user4 = mockUsers[3]
const vessel1 = mockVessels[0]
const vessel2 = mockVessels[1]
const vessel3 = mockVessels[2]
const site1 = mockSites[0]

export const mockVisits: Visit[] = [
  {
    id: 'visit-1', reference_no: 'VISIT/OWNER/SHP/202604/001',
    visit_type: 'OWNER_VISIT', business_unit_id: 'bu-1', business_unit: bu1,
    vessel_id: 'vessel-1', vessel: vessel1,
    visit_date: '2026-04-01', start_time: '09:00', end_time: '16:00',
    participants: ['Budi Santoso', 'Hendra Wijaya', 'Chief Engineer'],
    agenda: 'Inspeksi rutin dan evaluasi kondisi kapal',
    summary: 'Ditemukan beberapa permasalahan yang perlu ditindaklanjuti segera',
    status: 'APPROVED',
    created_by: 'user-3', created_by_user: user3,
    approved_by: 'user-1', approved_at: '2026-04-02',
    created_at: '2026-04-01', updated_at: '2026-04-02',
    findings_count: 3
  },
  {
    id: 'visit-2', reference_no: 'VISIT/VESSEL/SHP/202604/002',
    visit_type: 'VESSEL_VISIT', business_unit_id: 'bu-1', business_unit: bu1,
    vessel_id: 'vessel-2', vessel: vessel2,
    visit_date: '2026-04-05', start_time: '08:00', end_time: '12:00',
    participants: ['Hendra Wijaya', 'Safety Officer'],
    agenda: 'Kunjungan rutin bulanan - pengecekan safety equipment',
    summary: 'Kondisi umum kapal baik, ditemukan beberapa minor finding',
    status: 'APPROVED',
    created_by: 'user-4', created_by_user: user4,
    approved_by: 'user-3', approved_at: '2026-04-06',
    created_at: '2026-04-05', updated_at: '2026-04-06',
    findings_count: 2
  },
  {
    id: 'visit-3', reference_no: 'VISIT/SITE/FUEL/202604/001',
    visit_type: 'SITE_VISIT', business_unit_id: 'bu-2', business_unit: bu2,
    site_id: 'site-1', site: site1,
    visit_date: '2026-04-10', start_time: '10:00', end_time: '14:00',
    participants: ['Dewi Kusuma', 'Rudi Hartono'],
    agenda: 'Inspeksi operasional SPBU',
    status: 'SUBMITTED',
    created_by: 'user-5',
    created_at: '2026-04-10', updated_at: '2026-04-10',
    findings_count: 1
  },
  {
    id: 'visit-4', reference_no: 'VISIT/VESSEL/SHP/202605/001',
    visit_type: 'VESSEL_VISIT', business_unit_id: 'bu-1', business_unit: bu1,
    vessel_id: 'vessel-3', vessel: vessel3,
    visit_date: '2026-05-02', start_time: '09:00', end_time: '15:00',
    participants: ['Rizky Maulana', 'Chief Officer'],
    agenda: 'Kunjungan rutin bulanan armada Sulawesi',
    status: 'DRAFT',
    created_by: 'user-8',
    created_at: '2026-05-02', updated_at: '2026-05-02',
    findings_count: 0
  },
  {
    id: 'visit-5', reference_no: 'VISIT/OWNER/SHP/202605/001',
    visit_type: 'OWNER_VISIT', business_unit_id: 'bu-1', business_unit: bu1,
    vessel_id: 'vessel-1', vessel: vessel1,
    visit_date: '2026-05-15', start_time: '09:00', end_time: '17:00',
    participants: ['Budi Santoso', 'Direksi tim'],
    agenda: 'Evaluasi progress perbaikan dari Owner Visit sebelumnya',
    status: 'APPROVED',
    created_by: 'user-3', created_by_user: user3,
    approved_by: 'user-1', approved_at: '2026-05-16',
    created_at: '2026-05-15', updated_at: '2026-05-16',
    findings_count: 1
  },
]

export const mockProgressEntries: FindingProgressEntry[] = [
  {
    id: 'prog-1', finding_id: 'finding-1',
    action_date: '2026-04-03', action_type: 'INSPECTION',
    description: 'Tim mekanik turun melakukan pengecekan. Teridentifikasi keretakan pada sambungan flange DN50. Dibutuhkan penggantian gasket dan re-torque.',
    next_steps: 'Pengadaan material gasket DN50 dan baut M16',
    next_action_date: '2026-04-07',
    created_by: 'user-6', created_by_user: mockUsers[5],
    created_at: '2026-04-03T10:00:00Z'
  },
  {
    id: 'prog-2', finding_id: 'finding-1',
    action_date: '2026-04-07', action_type: 'COORDINATION',
    description: 'Koordinasi dengan bagian logistik untuk pengadaan gasket DN50 dan baut M16. PO diterbitkan. ETA material: 10 April 2026.',
    next_steps: 'Menunggu material tiba dan melakukan penggantian',
    next_action_date: '2026-04-11',
    created_by: 'user-6', created_by_user: mockUsers[5],
    created_at: '2026-04-07T14:00:00Z'
  },
  {
    id: 'prog-3', finding_id: 'finding-1',
    action_date: '2026-04-11', action_type: 'REPAIR',
    description: 'Material tiba. Tim mekanik melakukan penggantian gasket dan re-torque flange. Pekerjaan selesai pukul 16.00.',
    photos: ['https://picsum.photos/seed/prog3/400/300'],
    next_steps: 'Lakukan pressure test untuk verifikasi',
    next_action_date: '2026-04-14',
    created_by: 'user-6', created_by_user: mockUsers[5],
    created_at: '2026-04-11T16:00:00Z'
  },
  {
    id: 'prog-4', finding_id: 'finding-1',
    action_date: '2026-04-14', action_type: 'TESTING',
    description: 'Uji tekanan (pressure test) dilakukan oleh Chief Engineer. Tidak ditemukan kebocoran pada tekanan kerja normal. Mesin dioperasikan selama 2 jam uji coba – kondisi aman.',
    photos: ['https://picsum.photos/seed/prog4/400/300'],
    next_steps: 'Monitoring rutin 7 hari setelah perbaikan',
    next_action_date: '2026-04-21',
    created_by: 'user-6', created_by_user: mockUsers[5],
    created_at: '2026-04-14T11:00:00Z'
  },
  {
    id: 'prog-5', finding_id: 'finding-1',
    action_date: '2026-04-21', action_type: 'MONITORING',
    description: 'Pengecekan rutin setelah 7 hari operasional. Kondisi flange tetap kering, tidak ada tanda kebocoran. Siap diajukan untuk closing.',
    photos: ['https://picsum.photos/seed/prog5/400/300'],
    created_by: 'user-6', created_by_user: mockUsers[5],
    created_at: '2026-04-21T09:00:00Z'
  },
]

export const mockClosingRequests: FindingClosingRequest[] = [
  {
    id: 'close-1', finding_id: 'finding-1',
    action_date: '2026-04-21',
    summary: 'Penggantian gasket DN50 dan re-torque flange telah dilakukan. Pressure test berhasil tanpa kebocoran. Monitoring 7 hari pasca perbaikan menunjukkan kondisi normal.',
    condition_after: 'Pipa bahan bakar dalam kondisi baik, tidak ada kebocoran, flange baru terpasang dengan benar.',
    evidence_photos: ['https://picsum.photos/seed/close1/400/300', 'https://picsum.photos/seed/close2/400/300', 'https://picsum.photos/seed/close3/400/300'],
    submitted_by: 'user-6', submitted_by_user: mockUsers[5],
    submitted_at: '2026-04-21T10:00:00Z',
    reviewed_by: 'user-4', reviewed_by_user: mockUsers[3],
    reviewed_at: '2026-04-22T09:00:00Z',
    review_decision: 'APPROVED'
  },
]

export const mockFindings: Finding[] = [
  {
    id: 'finding-1', reference_no: 'FIND/SHP/202604/001',
    visit_id: 'visit-1', visit: mockVisits[0],
    business_unit_id: 'bu-1', business_unit: bu1,
    title: 'Kebocoran pipa bahan bakar di ruang mesin',
    description: 'Ditemukan kebocoran pada sambungan pipa bahan bakar di ruang mesin utama. Berpotensi menyebabkan risiko kebakaran.',
    category: 'Safety', priority: 'HIGH',
    source_type: 'OWNER_VISIT', is_owner_finding: true,
    assigned_to: 'user-6', assigned_to_user: mockUsers[5],
    target_close_date: '2026-04-30',
    status: 'CLOSED',
    initial_photos: ['https://picsum.photos/seed/finding1/400/300'],
    closed_at: '2026-04-22T09:00:00Z',
    closed_by: 'user-4', closed_by_user: mockUsers[3],
    closing_evidence: ['https://picsum.photos/seed/close1/400/300', 'https://picsum.photos/seed/close2/400/300'],
    closing_notes: 'Perbaikan telah selesai dan diverifikasi. Kondisi aman untuk operasional.',
    created_by: 'user-3', created_by_user: mockUsers[2],
    created_at: '2026-04-01T16:00:00Z', updated_at: '2026-04-22T09:00:00Z',
    progress_entries: mockProgressEntries,
    closing_request: mockClosingRequests[0]
  },
  {
    id: 'finding-2', reference_no: 'FIND/SHP/202604/002',
    visit_id: 'visit-1', visit: mockVisits[0],
    business_unit_id: 'bu-1', business_unit: bu1,
    title: 'Life jacket tidak lengkap di dek depan',
    description: '3 unit life jacket di dek depan ditemukan dalam kondisi rusak dan tidak layak pakai.',
    category: 'Safety', priority: 'CRITICAL',
    source_type: 'OWNER_VISIT', is_owner_finding: true,
    assigned_to: 'user-6', assigned_to_user: mockUsers[5],
    target_close_date: '2026-04-04',
    status: 'OVERDUE',
    initial_photos: ['https://picsum.photos/seed/finding2/400/300'],
    created_by: 'user-3', created_by_user: mockUsers[2],
    created_at: '2026-04-01T16:30:00Z', updated_at: '2026-04-01T16:30:00Z',
  },
  {
    id: 'finding-3', reference_no: 'FIND/SHP/202604/003',
    visit_id: 'visit-1', visit: mockVisits[0],
    business_unit_id: 'bu-1', business_unit: bu1,
    title: 'Logbook navigasi tidak diisi lengkap',
    description: 'Logbook navigasi ditemukan tidak diisi secara rutin. Terdapat gap pengisian selama 3 hari terakhir.',
    category: 'Administrasi', priority: 'MEDIUM',
    source_type: 'OWNER_VISIT', is_owner_finding: true,
    assigned_to: 'user-6', assigned_to_user: mockUsers[5],
    target_close_date: '2026-04-15',
    status: 'IN_PROGRESS',
    created_by: 'user-3', created_by_user: mockUsers[2],
    created_at: '2026-04-01T17:00:00Z', updated_at: '2026-04-05T10:00:00Z',
    progress_entries: [
      {
        id: 'prog-6', finding_id: 'finding-3',
        action_date: '2026-04-05', action_type: 'COORDINATION',
        description: 'Telah diingatkan kepada Nakhoda dan seluruh perwira kapal untuk mengisi logbook secara konsisten.',
        next_steps: 'Monitoring pengisian logbook mingguan',
        created_by: 'user-6', created_by_user: mockUsers[5],
        created_at: '2026-04-05T10:00:00Z'
      }
    ]
  },
  {
    id: 'finding-4', reference_no: 'FIND/SHP/202604/004',
    visit_id: 'visit-2', visit: mockVisits[1],
    business_unit_id: 'bu-1', business_unit: bu1,
    title: 'Fire extinguisher kadaluarsa',
    description: '2 unit APAR di ruang cargo ditemukan sudah melewati tanggal kadaluarsa.',
    category: 'Safety', priority: 'HIGH',
    source_type: 'VESSEL_VISIT', is_owner_finding: false,
    assigned_to: 'user-6', assigned_to_user: mockUsers[5],
    target_close_date: '2026-04-12',
    status: 'PENDING_APPROVAL',
    initial_photos: ['https://picsum.photos/seed/finding4/400/300'],
    created_by: 'user-4', created_by_user: mockUsers[3],
    created_at: '2026-04-05T12:00:00Z', updated_at: '2026-04-11T15:00:00Z',
    progress_entries: [
      {
        id: 'prog-7', finding_id: 'finding-4',
        action_date: '2026-04-08', action_type: 'REPAIR',
        description: 'APAR kadaluarsa telah diganti dengan yang baru. Total 2 unit APAR baru terpasang.',
        photos: ['https://picsum.photos/seed/prog7/400/300'],
        created_by: 'user-6', created_by_user: mockUsers[5],
        created_at: '2026-04-08T14:00:00Z'
      }
    ],
    closing_request: {
      id: 'close-2', finding_id: 'finding-4',
      action_date: '2026-04-11',
      summary: 'APAR kadaluarsa telah diganti dengan 2 unit APAR baru yang masih valid.',
      condition_after: 'Seluruh APAR di ruang cargo dalam kondisi valid dan siap pakai.',
      evidence_photos: ['https://picsum.photos/seed/close4/400/300'],
      submitted_by: 'user-6', submitted_by_user: mockUsers[5],
      submitted_at: '2026-04-11T15:00:00Z'
    }
  },
  {
    id: 'finding-5', reference_no: 'FIND/FUEL/202604/001',
    visit_id: 'visit-3', visit: mockVisits[2],
    business_unit_id: 'bu-2', business_unit: bu2,
    title: 'Kebocoran selang pengisian BBM',
    description: 'Selang pengisian BBM premium ditemukan mengalami kebocoran minor di bagian sambungan.',
    category: 'Operasional', priority: 'MEDIUM',
    source_type: 'SITE_VISIT', is_owner_finding: false,
    assigned_to: 'user-5', assigned_to_user: mockUsers[4],
    target_close_date: '2026-04-25',
    status: 'OPEN',
    created_by: 'user-5', created_by_user: mockUsers[4],
    created_at: '2026-04-10T12:00:00Z', updated_at: '2026-04-10T12:00:00Z',
  },
  {
    id: 'finding-6', reference_no: 'FIND/SHP/202605/001',
    visit_id: 'visit-5', visit: mockVisits[4],
    business_unit_id: 'bu-1', business_unit: bu1,
    title: 'Sistem navigasi GPS tidak terkalibrasi',
    description: 'GPS navigator kapal menunjukkan deviasi posisi yang signifikan. Perlu kalibrasi segera.',
    category: 'Operasional', priority: 'CRITICAL',
    source_type: 'OWNER_VISIT', is_owner_finding: true,
    assigned_to: 'user-4', assigned_to_user: mockUsers[3],
    target_close_date: '2026-05-18',
    status: 'IN_PROGRESS',
    created_by: 'user-3', created_by_user: mockUsers[2],
    created_at: '2026-05-15T15:00:00Z', updated_at: '2026-05-16T09:00:00Z',
    progress_entries: [
      {
        id: 'prog-8', finding_id: 'finding-6',
        action_date: '2026-05-16', action_type: 'COORDINATION',
        description: 'Menghubungi teknisi GPS dari vendor untuk jadwal kalibrasi. Jadwal kalibrasi ditetapkan tanggal 17 Mei 2026.',
        next_steps: 'Kalibrasi GPS oleh teknisi vendor',
        next_action_date: '2026-05-17',
        created_by: 'user-4', created_by_user: mockUsers[3],
        created_at: '2026-05-16T09:00:00Z'
      }
    ]
  }
]

export const mockVesselCompliance: VesselVisitCompliance[] = [
  { id: 'comp-1', fleet_id: 'fleet-1', vessel_id: 'vessel-1', op_head_user_id: 'user-4', visit_id: 'visit-1', visit_date: '2026-04-01', period_month: 4, period_year: 2026 },
  { id: 'comp-2', fleet_id: 'fleet-1', vessel_id: 'vessel-2', op_head_user_id: 'user-4', visit_id: 'visit-2', visit_date: '2026-04-05', period_month: 4, period_year: 2026 },
  { id: 'comp-3', fleet_id: 'fleet-1', vessel_id: 'vessel-1', op_head_user_id: 'user-4', visit_id: 'visit-5', visit_date: '2026-05-15', period_month: 5, period_year: 2026 },
]

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1', user_id: 'user-6', type: 'finding_assigned',
    title: 'Temuan Baru Ditugaskan',
    message: 'Anda ditugaskan sebagai PIC untuk temuan: "Kebocoran pipa bahan bakar di ruang mesin"',
    related_id: 'finding-1', related_type: 'finding',
    is_read: true, created_at: '2026-04-01T16:00:00Z'
  },
  {
    id: 'notif-2', user_id: 'user-4', type: 'closing_submitted',
    title: 'Pengajuan Closing Baru',
    message: 'APAR kadaluarsa - Rudi Hartono telah mengajukan closing untuk direview.',
    related_id: 'finding-4', related_type: 'finding',
    is_read: false, created_at: '2026-04-11T15:00:00Z'
  },
  {
    id: 'notif-3', user_id: 'user-6', type: 'finding_overdue',
    title: 'Temuan Overdue!',
    message: 'Temuan "Life jacket tidak lengkap di dek depan" telah melewati target tanggal closing.',
    related_id: 'finding-2', related_type: 'finding',
    is_read: false, created_at: '2026-04-05T00:00:00Z'
  },
  {
    id: 'notif-4', user_id: 'user-4', type: 'visit_submitted',
    title: 'Laporan Kunjungan Baru',
    message: 'Laporan kunjungan VISIT/SITE/FUEL/202604/001 telah disubmit untuk review.',
    related_id: 'visit-3', related_type: 'visit',
    is_read: false, created_at: '2026-04-10T14:00:00Z'
  },
  {
    id: 'notif-5', user_id: 'user-4', type: 'vessel_compliance_warning',
    title: 'Peringatan Kewajiban Kunjungan',
    message: '80% periode berjalan - KM Perkasa 02 di Armada Sulawesi belum dikunjungi bulan ini.',
    related_id: 'vessel-4', related_type: 'vessel',
    is_read: false, created_at: '2026-05-25T08:00:00Z'
  },
]

export const mockDashboardChartData = {
  visitsByBUPerMonth: [
    { month: 'Jan', SHP: 4, FUEL: 2, SCM: 1, SYD: 3 },
    { month: 'Feb', SHP: 5, FUEL: 3, SCM: 2, SYD: 2 },
    { month: 'Mar', SHP: 3, FUEL: 4, SCM: 1, SYD: 4 },
    { month: 'Apr', SHP: 6, FUEL: 2, SCM: 3, SYD: 2 },
    { month: 'Mei', SHP: 4, FUEL: 3, SCM: 2, SYD: 1 },
    { month: 'Jun', SHP: 2, FUEL: 1, SCM: 1, SYD: 2 },
  ],
  findingsByStatus: [
    { name: 'Open', value: 8, color: '#D35400' },
    { name: 'In Progress', value: 12, color: '#2A5298' },
    { name: 'Pending Approval', value: 3, color: '#C8922A' },
    { name: 'Closed', value: 28, color: '#1A7A4A' },
    { name: 'Overdue', value: 4, color: '#C0392B' },
  ],
  findingsByPriority: [
    { priority: 'Critical', count: 5, color: '#C0392B' },
    { priority: 'High', count: 12, color: '#D35400' },
    { priority: 'Medium', count: 18, color: '#C8922A' },
    { priority: 'Low', count: 20, color: '#1A7A4A' },
  ],
  visitTrend: [
    { month: 'Jan', visits: 10 },
    { month: 'Feb', visits: 12 },
    { month: 'Mar', visits: 8 },
    { month: 'Apr', visits: 15 },
    { month: 'Mei', visits: 10 },
    { month: 'Jun', visits: 6 },
  ],
  achievementByBU: [
    { bu: 'Shipping', rate: 78 },
    { bu: 'Fuel Retail', rate: 92 },
    { bu: 'Supply Chain', rate: 65 },
    { bu: 'Shipyard', rate: 88 },
    { bu: 'Agro', rate: 70 },
    { bu: 'Gas', rate: 95 },
  ],
  vesselComplianceTable: [
    { op_head: 'Hendra Wijaya', fleet: 'Armada Kalimantan', total_vessels: 2, visited: 2, compliance: 100 },
    { op_head: 'Rizky Maulana', fleet: 'Armada Sulawesi', total_vessels: 2, visited: 1, compliance: 50 },
  ]
}

export const mockInternalInspections: InternalInspection[] = [
  {
    id: 'int-insp-1',
    reference_no: 'INSP/INT/SHP/202604/001',
    vessel_id: 'vessel-1', vessel: mockVessels[0],
    business_unit_id: 'bu-1', business_unit: mockBusinessUnits[0],
    inspection_date: '2026-04-10',
    lead_inspector: 'Hendra Wijaya',
    inspectors: ['Hendra Wijaya', 'Safety Officer Kapal'],
    status: 'APPROVED',
    result: 'SATISFACTORY',
    total_items_checked: 48,
    items_satisfactory: 44,
    items_deficient: 4,
    approved_by: 'user-3', approved_at: '2026-04-11',
    notes: 'Kondisi kapal secara umum baik. Beberapa minor finding pada peralatan keselamatan perlu ditindaklanjuti.',
    created_by: 'user-4', created_by_user: mockUsers[3],
    created_at: '2026-04-10T17:00:00Z', updated_at: '2026-04-11T09:00:00Z',
    findings: [
      {
        id: 'intfind-1', area: 'Peralatan Keselamatan',
        description: '2 unit APAR CO₂ di ruang mesin mendekati kadaluarsa (exp: Juni 2026)',
        priority: 'HIGH', status: 'IN_PROGRESS',
        assigned_to: 'Chief Engineer',
        created_at: '2026-04-10T17:00:00Z',
        target_close_date: '2026-05-10',
        initial_photos: ['https://picsum.photos/seed/intfind-1/400/300'],
        progress_entries: [
          {
            id: 'iprg-1a', action_date: '2026-04-18', action_type: 'COORDINATION',
            description: 'Koordinasi dengan logistik untuk pengadaan 2 unit APAR CO₂ baru. PO sudah diterbitkan, ETA 25 April.',
            next_steps: 'Menunggu APAR baru tiba dan melakukan penggantian',
            next_action_date: '2026-04-26',
            created_at: '2026-04-18T10:00:00Z'
          }
        ]
      } as InspectionFinding,
      {
        id: 'intfind-2', area: 'Peralatan Keselamatan',
        description: 'Kotak P3K dek belakang tidak lengkap — perban dan antiseptik habis',
        priority: 'MEDIUM', status: 'CLOSED',
        assigned_to: 'Mualim I',
        created_at: '2026-04-10T17:00:00Z',
        target_close_date: '2026-04-20',
        closed_at: '2026-04-15T10:00:00Z',
        closing_notes: 'Pengisian ulang kotak P3K telah dilakukan 15 April 2026',
        initial_photos: ['https://picsum.photos/seed/intfind-2/400/300'],
        closing_evidence: ['https://picsum.photos/seed/intfind-2-close/400/300'],
        progress_entries: [
          {
            id: 'iprg-2', action_date: '2026-04-15', action_type: 'REPAIR',
            description: 'Pengisian ulang kotak P3K sudah dilakukan. Semua item lengkap.',
            created_at: '2026-04-15T10:00:00Z'
          }
        ],
        closing_request: {
          id: 'icreq-2', action_date: '2026-04-15',
          summary: 'Kotak P3K telah diisi ulang lengkap.',
          condition_after: 'Kotak P3K lengkap dan siap pakai.',
          evidence_photos: ['https://picsum.photos/seed/intfind-2-close/400/300'],
          submitted_at: '2026-04-15T10:00:00Z',
          review_decision: 'APPROVED', reviewed_at: '2026-04-16T09:00:00Z'
        }
      } as InspectionFinding,
      {
        id: 'intfind-3', area: 'Administrasi & Dokumen',
        description: 'Safety Meeting Record tidak diisi selama 2 minggu terakhir',
        priority: 'MEDIUM', status: 'CLOSED',
        assigned_to: 'Mualim I',
        created_at: '2026-04-10T17:00:00Z',
        target_close_date: '2026-04-17',
        closed_at: '2026-04-12T14:00:00Z',
        closing_notes: 'Safety meeting dilaksanakan dan dicatat pada 12 April 2026',
        initial_photos: ['https://picsum.photos/seed/intfind-3/400/300'],
        closing_evidence: ['https://picsum.photos/seed/intfind-3-close/400/300'],
        progress_entries: [
          {
            id: 'iprg-3', action_date: '2026-04-12', action_type: 'COORDINATION',
            description: 'Safety meeting dilaksanakan bersama seluruh awak kapal. Record sudah diisi lengkap.',
            created_at: '2026-04-12T14:00:00Z'
          }
        ],
        closing_request: {
          id: 'icreq-3', action_date: '2026-04-12',
          summary: 'Safety Meeting Record telah diisi dan meeting dilaksanakan.',
          condition_after: 'Record lengkap dan up-to-date.',
          evidence_photos: ['https://picsum.photos/seed/intfind-3-close/400/300'],
          submitted_at: '2026-04-12T14:00:00Z',
          review_decision: 'APPROVED', reviewed_at: '2026-04-13T09:00:00Z'
        }
      } as InspectionFinding,
      {
        id: 'intfind-4', area: 'Navigasi',
        description: 'Lampu navigasi haluan redup — perlu penggantian bohlam',
        priority: 'HIGH', status: 'OVERDUE',
        assigned_to: 'Electrician',
        created_at: '2026-04-10T17:00:00Z',
        target_close_date: '2026-04-15',
        initial_photos: ['https://picsum.photos/seed/intfind-4/400/300']
      } as InspectionFinding,
    ]
  },
  {
    id: 'int-insp-2',
    reference_no: 'INSP/INT/SHP/202604/002',
    vessel_id: 'vessel-2', vessel: mockVessels[1],
    business_unit_id: 'bu-1', business_unit: mockBusinessUnits[0],
    inspection_date: '2026-04-18',
    lead_inspector: 'Hendra Wijaya',
    inspectors: ['Hendra Wijaya'],
    status: 'SUBMITTED',
    result: 'CONDITIONAL',
    total_items_checked: 48,
    items_satisfactory: 38,
    items_deficient: 10,
    notes: 'Beberapa temuan kritis perlu segera ditindaklanjuti sebelum kapal beroperasi kembali.',
    created_by: 'user-4', created_by_user: mockUsers[3],
    created_at: '2026-04-18T16:30:00Z', updated_at: '2026-04-18T16:30:00Z',
    findings: [
      {
        id: 'intfind-5', area: 'Ruang Mesin',
        description: 'Pompa bilga kamar mesin mengeluarkan suara tidak normal — indikasi bearing aus',
        priority: 'CRITICAL', status: 'OPEN',
        assigned_to: 'Chief Engineer',
        created_at: '2026-04-18T16:30:00Z',
        target_close_date: '2026-04-25',
        initial_photos: ['https://picsum.photos/seed/intfind-5/400/300']
      } as InspectionFinding,
      {
        id: 'intfind-6', area: 'Ruang Mesin',
        description: 'Kebocoran kecil pada sambungan pipa pendingin ME (coolant leak)',
        priority: 'HIGH', status: 'OPEN',
        assigned_to: 'Chief Engineer',
        created_at: '2026-04-18T16:30:00Z',
        target_close_date: '2026-04-22',
        initial_photos: ['https://picsum.photos/seed/intfind-6/400/300']
      } as InspectionFinding,
      {
        id: 'intfind-7', area: 'Peralatan Keselamatan',
        description: 'Life raft expired — perlu recertification sebelum keberangkatan',
        priority: 'CRITICAL', status: 'OPEN',
        assigned_to: 'Mualim I',
        created_at: '2026-04-18T16:30:00Z',
        target_close_date: '2026-04-20',
        initial_photos: ['https://picsum.photos/seed/intfind-7/400/300']
      } as InspectionFinding,
      {
        id: 'intfind-8', area: 'Dek & Struktur',
        description: 'Pelindung tangga dek kiri (port side) berkarat parah, berpotensi berbahaya',
        priority: 'HIGH', status: 'OPEN',
        assigned_to: 'Bosun',
        created_at: '2026-04-18T16:30:00Z',
        target_close_date: '2026-05-01',
        initial_photos: ['https://picsum.photos/seed/intfind-8/400/300']
      } as InspectionFinding,
      {
        id: 'intfind-9', area: 'Administrasi & Dokumen',
        description: 'Certificate of Competency Juru Mudi 2 sudah expired sejak Maret 2026',
        priority: 'CRITICAL', status: 'OPEN',
        assigned_to: 'Mualim I',
        created_at: '2026-04-18T16:30:00Z',
        target_close_date: '2026-04-25',
        initial_photos: ['https://picsum.photos/seed/intfind-9/400/300']
      } as InspectionFinding,
    ]
  },
  {
    id: 'int-insp-3',
    reference_no: 'INSP/INT/SHP/202605/001',
    vessel_id: 'vessel-3', vessel: mockVessels[2],
    business_unit_id: 'bu-1', business_unit: mockBusinessUnits[0],
    inspection_date: '2026-05-08',
    lead_inspector: 'Rizky Maulana',
    inspectors: ['Rizky Maulana', 'Safety Officer'],
    status: 'APPROVED',
    result: 'SATISFACTORY',
    total_items_checked: 48,
    items_satisfactory: 46,
    items_deficient: 2,
    approved_by: 'user-3', approved_at: '2026-05-09',
    notes: 'Kondisi kapal sangat baik. Dua minor finding bersifat administratif.',
    created_by: 'user-8', created_by_user: mockUsers[7],
    created_at: '2026-05-08T17:00:00Z', updated_at: '2026-05-09T10:00:00Z',
    findings: [
      {
        id: 'intfind-10', area: 'Administrasi & Dokumen',
        description: 'Oil Record Book belum diisi untuk 3 entri terakhir',
        priority: 'MEDIUM', status: 'CLOSED',
        assigned_to: 'Chief Engineer',
        created_at: '2026-05-08T17:00:00Z',
        target_close_date: '2026-05-12',
        closed_at: '2026-05-10T11:00:00Z',
        closing_notes: 'Oil Record Book sudah diupdate 10 Mei 2026',
        initial_photos: ['https://picsum.photos/seed/intfind-10/400/300'],
        closing_evidence: ['https://picsum.photos/seed/intfind-10-close/400/300'],
        progress_entries: [
          {
            id: 'iprg-10', action_date: '2026-05-10', action_type: 'REPAIR',
            description: 'Oil Record Book telah diisi lengkap untuk semua entri yang tertinggal.',
            created_at: '2026-05-10T11:00:00Z'
          }
        ],
        closing_request: {
          id: 'icreq-10', action_date: '2026-05-10',
          summary: 'Oil Record Book sudah diupdate dan semua entri terisi lengkap.',
          condition_after: 'Record Book up-to-date dan lengkap.',
          evidence_photos: ['https://picsum.photos/seed/intfind-10-close/400/300'],
          submitted_at: '2026-05-10T11:00:00Z',
          review_decision: 'APPROVED', reviewed_at: '2026-05-11T09:00:00Z'
        }
      } as InspectionFinding,
      {
        id: 'intfind-11', area: 'Kebersihan',
        description: 'Area forecastle kurang bersih — ditemukan sisa tali dan sampah',
        priority: 'LOW', status: 'CLOSED',
        assigned_to: 'Bosun',
        created_at: '2026-05-08T17:00:00Z',
        target_close_date: '2026-05-10',
        closed_at: '2026-05-09T15:00:00Z',
        closing_notes: 'Area dibersihkan pada 9 Mei 2026',
        initial_photos: ['https://picsum.photos/seed/intfind-11/400/300'],
        closing_evidence: ['https://picsum.photos/seed/intfind-11-close/400/300'],
        progress_entries: [
          {
            id: 'iprg-11', action_date: '2026-05-09', action_type: 'REPAIR',
            description: 'Area forecastle telah dibersihkan. Semua sisa tali dan sampah sudah disingkirkan.',
            created_at: '2026-05-09T15:00:00Z'
          }
        ],
        closing_request: {
          id: 'icreq-11', action_date: '2026-05-09',
          summary: 'Area forecastle telah dibersihkan sepenuhnya.',
          condition_after: 'Area bersih dan rapi.',
          evidence_photos: ['https://picsum.photos/seed/intfind-11-close/400/300'],
          submitted_at: '2026-05-09T15:00:00Z',
          review_decision: 'APPROVED', reviewed_at: '2026-05-10T08:00:00Z'
        }
      } as InspectionFinding,
    ]
  },
  {
    id: 'int-insp-4',
    reference_no: 'INSP/INT/SHP/202606/001',
    vessel_id: 'vessel-1', vessel: mockVessels[0],
    business_unit_id: 'bu-1', business_unit: mockBusinessUnits[0],
    inspection_date: '2026-06-03',
    lead_inspector: 'Hendra Wijaya',
    inspectors: ['Hendra Wijaya'],
    status: 'DRAFT',
    result: undefined,
    total_items_checked: 0,
    items_satisfactory: 0,
    items_deficient: 0,
    notes: '',
    created_by: 'user-4', created_by_user: mockUsers[3],
    created_at: '2026-06-03T08:00:00Z', updated_at: '2026-06-03T08:00:00Z',
    findings: []
  },
]

export const mockExternalInspections: ExternalInspection[] = [
  {
    id: 'ext-insp-1',
    reference_no: 'INSP/EXT/SIRE/SHP/202603/001',
    vessel_id: 'vessel-1', vessel: mockVessels[0],
    business_unit_id: 'bu-1', business_unit: mockBusinessUnits[0],
    inspection_type: 'SIRE',
    inspection_date: '2026-03-15',
    inspecting_body: 'Shell International Trading',
    lead_inspector: 'Capt. James Robertson',
    port: 'Pelabuhan Balikpapan',
    status: 'COMPLETED',
    result: 'SATISFACTORY',
    total_observations: 3,
    critical_observations: 0,
    major_observations: 1,
    minor_observations: 2,
    validity_date: '2027-03-14',
    next_inspection_date: '2027-03-01',
    report_no: 'SIRE-2026-0315-001',
    notes: 'Kapal dalam kondisi baik dan operasional. 1 major observation terkait prosedur bunkering yang perlu diperbaiki.',
    actions_taken: 'SOP bunkering direvisi dan crew briefing dilakukan pada 20 Maret 2026. SIRE report sudah dikirimkan ke OCIMF database.',
    findings: [
      {
        id: 'extfind-1', area: 'Prosedur Bunkering',
        description: 'Prosedur pre-bunkering checklist tidak dijalankan secara konsisten — beberapa langkah verifikasi dilewati oleh crew',
        priority: 'HIGH', status: 'CLOSED',
        assigned_to: 'Chief Officer',
        created_at: '2026-03-15T18:00:00Z',
        target_close_date: '2026-04-15',
        closed_at: '2026-03-22T14:00:00Z',
        closing_notes: 'SOP bunkering direvisi dan crew briefing dilakukan. Checklist baru dicetak dan dipasang di area bunkering.',
        initial_photos: ['https://picsum.photos/seed/extfind-1/400/300'],
        closing_evidence: ['https://picsum.photos/seed/extfind-1-close/400/300'],
        progress_entries: [
          {
            id: 'eprg-1a', action_date: '2026-03-18', action_type: 'COORDINATION',
            description: 'Meeting dengan seluruh perwira untuk membahas revisi SOP bunkering.',
            next_steps: 'Revisi SOP dan cetak checklist baru',
            next_action_date: '2026-03-22',
            created_at: '2026-03-18T10:00:00Z'
          },
          {
            id: 'eprg-1b', action_date: '2026-03-22', action_type: 'REPAIR',
            description: 'SOP bunkering direvisi, checklist baru dicetak dan dipasang. Crew briefing selesai dilaksanakan.',
            photos: ['https://picsum.photos/seed/eprg-1b/400/300'],
            created_at: '2026-03-22T14:00:00Z'
          }
        ],
        closing_request: {
          id: 'ecreq-1', action_date: '2026-03-22',
          summary: 'SOP bunkering direvisi, crew di-briefing, dan checklist baru terpasang di area bunkering.',
          condition_after: 'Prosedur bunkering kini dijalankan sesuai SOP yang diperbarui.',
          evidence_photos: ['https://picsum.photos/seed/extfind-1-close/400/300'],
          submitted_at: '2026-03-22T14:00:00Z',
          review_decision: 'APPROVED', reviewed_at: '2026-03-23T09:00:00Z'
        }
      } as InspectionFinding,
    ],
    created_by: 'user-4', created_by_user: mockUsers[3],
    created_at: '2026-03-15T18:00:00Z', updated_at: '2026-03-20T10:00:00Z',
  },
  {
    id: 'ext-insp-2',
    reference_no: 'INSP/EXT/PSC/SHP/202604/001',
    vessel_id: 'vessel-2', vessel: mockVessels[1],
    business_unit_id: 'bu-1', business_unit: mockBusinessUnits[0],
    inspection_type: 'VETTING_PSA',
    inspection_date: '2026-04-22',
    inspecting_body: 'Port State Control – Syahbandar Balikpapan',
    lead_inspector: 'PSCO Ahmad Fauzan',
    port: 'Pelabuhan Semayang Balikpapan',
    status: 'COMPLETED',
    result: 'CONDITIONAL',
    total_observations: 7,
    critical_observations: 0,
    major_observations: 3,
    minor_observations: 4,
    validity_date: undefined,
    next_inspection_date: '2026-10-01',
    report_no: 'PSC-BPN-2026-0422',
    notes: 'Tiga major deficiency ditemukan: (1) Life raft expired, (2) CoC Juru Mudi kadaluarsa, (3) pompa bilga tidak berfungsi normal. Kapal mendapat detention flag sampai semua defisiensi diperbaiki.',
    actions_taken: 'Semua defisiensi telah diperbaiki dalam 5 hari. Inspeksi ulang oleh PSCO dilakukan 27 April 2026 dan kapal diizinkan beroperasi kembali.',
    findings: [
      {
        id: 'extfind-2', area: 'Life Raft',
        description: 'Life raft unit A dan B telah expired — perlu recertification segera sebelum kapal boleh berlayar',
        priority: 'CRITICAL', status: 'CLOSED',
        assigned_to: 'Mualim I',
        created_at: '2026-04-22T17:00:00Z',
        target_close_date: '2026-04-27',
        closed_at: '2026-04-25T16:00:00Z',
        closing_notes: 'Life raft berhasil direcertification oleh authorized service station pada 25 April 2026.',
        initial_photos: ['https://picsum.photos/seed/extfind-2/400/300'],
        closing_evidence: ['https://picsum.photos/seed/extfind-2-close/400/300'],
        progress_entries: [
          {
            id: 'eprg-2a', action_date: '2026-04-23', action_type: 'COORDINATION',
            description: 'Menghubungi authorized service station untuk jadwal recertification life raft. Jadwal ditetapkan 25 April.',
            next_steps: 'Recertification life raft oleh service station',
            next_action_date: '2026-04-25',
            created_at: '2026-04-23T09:00:00Z'
          },
          {
            id: 'eprg-2b', action_date: '2026-04-25', action_type: 'TESTING',
            description: 'Recertification life raft selesai dilakukan. Kedua unit kini valid dan memiliki sertifikat baru.',
            photos: ['https://picsum.photos/seed/eprg-2b/400/300'],
            created_at: '2026-04-25T16:00:00Z'
          }
        ],
        closing_request: {
          id: 'ecreq-2', action_date: '2026-04-25',
          summary: 'Life raft telah direcertification oleh authorized service station.',
          condition_after: 'Kedua life raft kini valid dan bersertifikat.',
          evidence_photos: ['https://picsum.photos/seed/extfind-2-close/400/300'],
          submitted_at: '2026-04-25T16:00:00Z',
          review_decision: 'APPROVED', reviewed_at: '2026-04-26T08:00:00Z'
        }
      } as InspectionFinding,
      {
        id: 'extfind-3', area: 'Sertifikasi Awak Kapal',
        description: 'Certificate of Competency (CoC) Juru Mudi 2 sudah expired sejak Maret 2026 — tidak memenuhi standar STCW',
        priority: 'CRITICAL', status: 'CLOSED',
        assigned_to: 'Mualim I',
        created_at: '2026-04-22T17:00:00Z',
        target_close_date: '2026-04-27',
        closed_at: '2026-04-24T12:00:00Z',
        closing_notes: 'Juru Mudi 2 digantikan sementara oleh cadangan bersertifikat valid hingga CoC baru diterbitkan.',
        initial_photos: ['https://picsum.photos/seed/extfind-3/400/300'],
        closing_evidence: ['https://picsum.photos/seed/extfind-3-close/400/300'],
        progress_entries: [
          {
            id: 'eprg-3a', action_date: '2026-04-23', action_type: 'COORDINATION',
            description: 'Juru Mudi 2 digantikan sementara oleh crew cadangan yang memiliki CoC valid.',
            next_steps: 'Pengurusan CoC baru untuk Juru Mudi 2',
            next_action_date: '2026-04-30',
            created_at: '2026-04-23T11:00:00Z'
          }
        ],
        closing_request: {
          id: 'ecreq-3', action_date: '2026-04-24',
          summary: 'Juru Mudi 2 telah digantikan oleh crew bersertikat valid.',
          condition_after: 'Semua awak kapal memiliki sertifikat yang masih berlaku.',
          evidence_photos: ['https://picsum.photos/seed/extfind-3-close/400/300'],
          submitted_at: '2026-04-24T12:00:00Z',
          review_decision: 'APPROVED', reviewed_at: '2026-04-25T08:00:00Z'
        }
      } as InspectionFinding,
      {
        id: 'extfind-4', area: 'Ruang Mesin',
        description: 'Pompa bilga kamar mesin tidak berfungsi normal — output flow rendah, indikasi impeller aus',
        priority: 'CRITICAL', status: 'CLOSED',
        assigned_to: 'Chief Engineer',
        created_at: '2026-04-22T17:00:00Z',
        target_close_date: '2026-04-27',
        closed_at: '2026-04-26T15:00:00Z',
        closing_notes: 'Impeller pompa bilga telah diganti. Pompa berfungsi normal setelah pengujian.',
        initial_photos: ['https://picsum.photos/seed/extfind-4/400/300'],
        closing_evidence: ['https://picsum.photos/seed/extfind-4-close/400/300'],
        progress_entries: [
          {
            id: 'eprg-4a', action_date: '2026-04-23', action_type: 'INSPECTION',
            description: 'Pengecekan detail pompa bilga. Impeller dikonfirmasi aus dan perlu diganti.',
            next_steps: 'Pengadaan impeller baru dan penggantian',
            next_action_date: '2026-04-26',
            created_at: '2026-04-23T14:00:00Z'
          },
          {
            id: 'eprg-4b', action_date: '2026-04-26', action_type: 'REPAIR',
            description: 'Impeller baru terpasang. Pressure test dilakukan — pompa berfungsi normal.',
            photos: ['https://picsum.photos/seed/eprg-4b/400/300'],
            created_at: '2026-04-26T15:00:00Z'
          }
        ],
        closing_request: {
          id: 'ecreq-4', action_date: '2026-04-26',
          summary: 'Impeller pompa bilga diganti dan pompa telah diuji berhasil.',
          condition_after: 'Pompa bilga berfungsi normal dengan flow rate sesuai spesifikasi.',
          evidence_photos: ['https://picsum.photos/seed/extfind-4-close/400/300'],
          submitted_at: '2026-04-26T15:00:00Z',
          review_decision: 'APPROVED', reviewed_at: '2026-04-27T08:00:00Z'
        }
      } as InspectionFinding,
    ],
    created_by: 'user-4', created_by_user: mockUsers[3],
    created_at: '2026-04-22T17:00:00Z', updated_at: '2026-04-28T09:00:00Z',
  },
  {
    id: 'ext-insp-3',
    reference_no: 'INSP/EXT/SIRE/SHP/202605/001',
    vessel_id: 'vessel-3', vessel: mockVessels[2],
    business_unit_id: 'bu-1', business_unit: mockBusinessUnits[0],
    inspection_type: 'SIRE',
    inspection_date: '2026-05-20',
    inspecting_body: 'TotalEnergies SE',
    lead_inspector: 'Capt. Marie Dubois',
    port: 'Terminal Lawe-Lawe Penajam',
    status: 'COMPLETED',
    result: 'SATISFACTORY',
    total_observations: 2,
    critical_observations: 0,
    major_observations: 0,
    minor_observations: 2,
    validity_date: '2027-05-19',
    next_inspection_date: '2027-05-01',
    report_no: 'SIRE-2026-0520-003',
    notes: 'Inspeksi berjalan lancar. 2 minor observation terkait housekeeping dan dokumentasi drill.',
    actions_taken: 'Minor observations telah ditindaklanjuti dan diupdate di OCIMF database.',
    findings: [
      {
        id: 'extfind-5', area: 'Housekeeping',
        description: 'Area engine room catwalk ditemukan berminyak dan tidak bersih — berpotensi menyebabkan slip hazard',
        priority: 'LOW', status: 'CLOSED',
        assigned_to: 'Chief Engineer',
        created_at: '2026-05-20T17:00:00Z',
        target_close_date: '2026-05-27',
        closed_at: '2026-05-21T14:00:00Z',
        closing_notes: 'Catwalk dibersihkan dan di-degrease. Jadwal cleaning rutin ditetapkan.',
        initial_photos: ['https://picsum.photos/seed/extfind-5/400/300'],
        closing_evidence: ['https://picsum.photos/seed/extfind-5-close/400/300'],
        progress_entries: [
          {
            id: 'eprg-5a', action_date: '2026-05-21', action_type: 'REPAIR',
            description: 'Catwalk engine room dibersihkan dan di-degrease oleh crew mesin. Jadwal cleaning 2x seminggu ditetapkan.',
            photos: ['https://picsum.photos/seed/eprg-5a/400/300'],
            created_at: '2026-05-21T14:00:00Z'
          }
        ],
        closing_request: {
          id: 'ecreq-5', action_date: '2026-05-21',
          summary: 'Catwalk telah dibersihkan dan jadwal cleaning rutin ditetapkan.',
          condition_after: 'Area catwalk bersih dan bebas dari minyak.',
          evidence_photos: ['https://picsum.photos/seed/extfind-5-close/400/300'],
          submitted_at: '2026-05-21T14:00:00Z',
          review_decision: 'APPROVED', reviewed_at: '2026-05-22T08:00:00Z'
        }
      } as InspectionFinding,
      {
        id: 'extfind-6', area: 'Dokumentasi Drill',
        description: 'Record drill kebakaran dan abandon ship tidak diisi untuk periode Maret-April 2026',
        priority: 'MEDIUM', status: 'IN_PROGRESS',
        assigned_to: 'Mualim I',
        created_at: '2026-05-20T17:00:00Z',
        target_close_date: '2026-05-27',
        initial_photos: ['https://picsum.photos/seed/extfind-6/400/300'],
        progress_entries: [
          {
            id: 'eprg-6a', action_date: '2026-05-22', action_type: 'COORDINATION',
            description: 'Mualim I sedang melengkapi record drill yang tertinggal berdasarkan logbook kapal.',
            next_steps: 'Lakukan drill susulan dan dokumentasikan',
            next_action_date: '2026-05-25',
            created_at: '2026-05-22T10:00:00Z'
          }
        ]
      } as InspectionFinding,
    ],
    created_by: 'user-8', created_by_user: mockUsers[7],
    created_at: '2026-05-20T17:00:00Z', updated_at: '2026-05-22T10:00:00Z',
  },
  {
    id: 'ext-insp-4',
    reference_no: 'INSP/EXT/IMCA/SHP/202602/001',
    vessel_id: 'vessel-1', vessel: mockVessels[0],
    business_unit_id: 'bu-1', business_unit: mockBusinessUnits[0],
    inspection_type: 'IMCA',
    inspection_date: '2026-02-10',
    inspecting_body: 'IMCA (International Marine Contractors Association)',
    lead_inspector: 'John Smith – IMCA Auditor',
    port: 'Pelabuhan Balikpapan',
    status: 'COMPLETED',
    result: 'SATISFACTORY',
    total_observations: 5,
    critical_observations: 0,
    major_observations: 2,
    minor_observations: 3,
    validity_date: '2027-02-09',
    next_inspection_date: '2027-02-01',
    report_no: 'IMCA-AUDIT-2026-0210',
    notes: 'IMCA audit tahunan berhasil dilalui. 2 major observation pada SMS (Safety Management System) documentation.',
    actions_taken: 'SMS documentation direvisi dan crew training dilakukan. Certificate of Competency diperbaharui.',
    created_by: 'user-4', created_by_user: mockUsers[3],
    created_at: '2026-02-10T18:00:00Z', updated_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 'ext-insp-5',
    reference_no: 'INSP/EXT/BIRE/SHP/202607/001',
    vessel_id: 'vessel-4', vessel: mockVessels[3],
    business_unit_id: 'bu-1', business_unit: mockBusinessUnits[0],
    inspection_type: 'BIRE',
    inspection_date: '2026-07-15',
    inspecting_body: 'Pertamina International Shipping',
    lead_inspector: '',
    port: 'Pelabuhan Tarakan',
    status: 'SCHEDULED',
    result: undefined,
    total_observations: 0,
    critical_observations: 0,
    major_observations: 0,
    minor_observations: 0,
    validity_date: undefined,
    next_inspection_date: undefined,
    report_no: undefined,
    notes: 'Inspeksi BIRE dijadwalkan untuk charter baru dengan Pertamina International Shipping.',
    actions_taken: '',
    created_by: 'user-8', created_by_user: mockUsers[7],
    created_at: '2026-06-01T09:00:00Z', updated_at: '2026-06-01T09:00:00Z',
  },
]

const headHsse = mockUsers[8]  // Ir. Bambang Setiawan – Head HSSE Corporate
const hse1 = mockUsers[9]      // Andi Prasetyo – HSE Armada Kalimantan
const hse2 = mockUsers[10]     // Sari Wulandari – HSE Armada Sulawesi
const hse3 = mockUsers[11]     // Bagas Nugroho – HSE Armada Jawa

export const mockInspectionSchedules: InternalInspectionSchedule[] = [
  // Armada Kalimantan – KM Barokah 01 (vessel-1)
  {
    id: 'sched-1', vessel_id: 'vessel-1', vessel: mockVessels[0],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    hse_officer_id: 'user-9a', hse_officer: hse1,
    scheduled_date: '2026-04-10', period_month: 4, period_year: 2026,
    inspection_id: 'int-insp-1', status: 'COMPLETED',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-03-25T09:00:00Z',
  },
  {
    id: 'sched-2', vessel_id: 'vessel-1', vessel: mockVessels[0],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    hse_officer_id: 'user-9a', hse_officer: hse1,
    scheduled_date: '2026-05-10', period_month: 5, period_year: 2026,
    status: 'OVERDUE',
    notes: 'Belum ada realisasi inspeksi pada periode ini',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-04-25T09:00:00Z',
  },
  {
    id: 'sched-3', vessel_id: 'vessel-1', vessel: mockVessels[0],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    hse_officer_id: 'user-9a', hse_officer: hse1,
    scheduled_date: '2026-06-10', period_month: 6, period_year: 2026,
    inspection_id: 'int-insp-4', status: 'IN_PROGRESS',
    notes: 'Inspeksi sedang berjalan (Draft)',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-05-25T09:00:00Z',
  },
  {
    id: 'sched-4', vessel_id: 'vessel-1', vessel: mockVessels[0],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    hse_officer_id: 'user-9a', hse_officer: hse1,
    scheduled_date: '2026-07-10', period_month: 7, period_year: 2026,
    status: 'PLANNED',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-05-25T09:00:00Z',
  },
  // Armada Kalimantan – KM Barokah 02 (vessel-2)
  {
    id: 'sched-5', vessel_id: 'vessel-2', vessel: mockVessels[1],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    hse_officer_id: 'user-9a', hse_officer: hse1,
    scheduled_date: '2026-04-18', period_month: 4, period_year: 2026,
    inspection_id: 'int-insp-2', status: 'COMPLETED',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-03-25T09:00:00Z',
  },
  {
    id: 'sched-6', vessel_id: 'vessel-2', vessel: mockVessels[1],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    hse_officer_id: 'user-9a', hse_officer: hse1,
    scheduled_date: '2026-05-18', period_month: 5, period_year: 2026,
    status: 'OVERDUE',
    notes: 'Kapal sedang dalam perbaikan, jadwal belum direalisasi',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-04-25T09:00:00Z',
  },
  {
    id: 'sched-7', vessel_id: 'vessel-2', vessel: mockVessels[1],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    hse_officer_id: 'user-9a', hse_officer: hse1,
    scheduled_date: '2026-06-18', period_month: 6, period_year: 2026,
    status: 'DUE_SOON',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-05-25T09:00:00Z',
  },
  // Armada Sulawesi – KM Perkasa 01 (vessel-3)
  {
    id: 'sched-8', vessel_id: 'vessel-3', vessel: mockVessels[2],
    fleet_id: 'fleet-2', fleet: mockFleets[1],
    hse_officer_id: 'user-10', hse_officer: hse2,
    scheduled_date: '2026-05-08', period_month: 5, period_year: 2026,
    inspection_id: 'int-insp-3', status: 'COMPLETED',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-04-20T09:00:00Z',
  },
  {
    id: 'sched-9', vessel_id: 'vessel-3', vessel: mockVessels[2],
    fleet_id: 'fleet-2', fleet: mockFleets[1],
    hse_officer_id: 'user-10', hse_officer: hse2,
    scheduled_date: '2026-06-08', period_month: 6, period_year: 2026,
    status: 'DUE_SOON',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-05-20T09:00:00Z',
  },
  {
    id: 'sched-10', vessel_id: 'vessel-3', vessel: mockVessels[2],
    fleet_id: 'fleet-2', fleet: mockFleets[1],
    hse_officer_id: 'user-10', hse_officer: hse2,
    scheduled_date: '2026-07-08', period_month: 7, period_year: 2026,
    status: 'PLANNED',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-05-20T09:00:00Z',
  },
  // Armada Sulawesi – KM Perkasa 02 (vessel-4)
  {
    id: 'sched-11', vessel_id: 'vessel-4', vessel: mockVessels[3],
    fleet_id: 'fleet-2', fleet: mockFleets[1],
    hse_officer_id: 'user-10', hse_officer: hse2,
    scheduled_date: '2026-05-15', period_month: 5, period_year: 2026,
    status: 'OVERDUE',
    notes: 'HSE belum menjadwalkan realisasi ulang',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-04-20T09:00:00Z',
  },
  {
    id: 'sched-12', vessel_id: 'vessel-4', vessel: mockVessels[3],
    fleet_id: 'fleet-2', fleet: mockFleets[1],
    hse_officer_id: 'user-10', hse_officer: hse2,
    scheduled_date: '2026-06-15', period_month: 6, period_year: 2026,
    status: 'PLANNED',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-05-20T09:00:00Z',
  },
  // Armada Jawa – MV Galangan 01 (vessel-5)
  {
    id: 'sched-13', vessel_id: 'vessel-5', vessel: mockVessels[4],
    fleet_id: 'fleet-3', fleet: mockFleets[2],
    hse_officer_id: 'user-11', hse_officer: hse3,
    scheduled_date: '2026-06-05', period_month: 6, period_year: 2026,
    status: 'DUE_SOON',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-05-20T09:00:00Z',
  },
  {
    id: 'sched-14', vessel_id: 'vessel-5', vessel: mockVessels[4],
    fleet_id: 'fleet-3', fleet: mockFleets[2],
    hse_officer_id: 'user-11', hse_officer: hse3,
    scheduled_date: '2026-07-05', period_month: 7, period_year: 2026,
    status: 'PLANNED',
    created_by: 'user-9', created_by_user: headHsse,
    created_at: '2026-05-20T09:00:00Z',
  },
]

export const mockHseOfficers = [hse1, hse2, hse3]
export const mockHeadHsse = headHsse

const opHead1 = mockUsers[3]  // Hendra Wijaya – OP HEAD Armada Kalimantan
const opHead2 = mockUsers[7]  // Rizky Maulana – OP HEAD Armada Sulawesi

export const mockVisitSchedules: VisitSchedule[] = [
  // Armada Kalimantan – KM Barokah 01 (vessel-1)
  {
    id: 'vsched-1', vessel_id: 'vessel-1', vessel: mockVessels[0],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    op_head_user_id: 'user-4', op_head: opHead1,
    scheduled_date: '2026-04-05', period_month: 4, period_year: 2026,
    visit_id: 'visit-1', status: 'COMPLETED',
    created_by: 'user-4', created_by_user: opHead1,
    created_at: '2026-03-20T09:00:00Z',
  },
  // Armada Kalimantan – KM Barokah 02 (vessel-2)
  {
    id: 'vsched-2', vessel_id: 'vessel-2', vessel: mockVessels[1],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    op_head_user_id: 'user-4', op_head: opHead1,
    scheduled_date: '2026-04-10', period_month: 4, period_year: 2026,
    visit_id: 'visit-2', status: 'COMPLETED',
    created_by: 'user-4', created_by_user: opHead1,
    created_at: '2026-03-20T09:00:00Z',
  },
  // Armada Kalimantan – KM Barokah 01 (vessel-1) – Mei
  {
    id: 'vsched-3', vessel_id: 'vessel-1', vessel: mockVessels[0],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    op_head_user_id: 'user-4', op_head: opHead1,
    scheduled_date: '2026-05-18', period_month: 5, period_year: 2026,
    visit_id: 'visit-5', status: 'COMPLETED',
    created_by: 'user-4', created_by_user: opHead1,
    created_at: '2026-04-20T09:00:00Z',
  },
  // Armada Kalimantan – KM Barokah 02 (vessel-2) – Mei
  {
    id: 'vsched-4', vessel_id: 'vessel-2', vessel: mockVessels[1],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    op_head_user_id: 'user-4', op_head: opHead1,
    scheduled_date: '2026-05-15', period_month: 5, period_year: 2026,
    status: 'OVERDUE',
    notes: 'Kapal sedang dalam perbaikan, kunjungan belum terealisasi',
    created_by: 'user-4', created_by_user: opHead1,
    created_at: '2026-04-20T09:00:00Z',
  },
  // Armada Kalimantan – KM Barokah 01 (vessel-1) – Juni
  {
    id: 'vsched-5', vessel_id: 'vessel-1', vessel: mockVessels[0],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    op_head_user_id: 'user-4', op_head: opHead1,
    scheduled_date: '2026-06-20', period_month: 6, period_year: 2026,
    status: 'DUE_SOON',
    created_by: 'user-4', created_by_user: opHead1,
    created_at: '2026-05-25T09:00:00Z',
  },
  // Armada Kalimantan – KM Barokah 02 (vessel-2) – Juni
  {
    id: 'vsched-6', vessel_id: 'vessel-2', vessel: mockVessels[1],
    fleet_id: 'fleet-1', fleet: mockFleets[0],
    op_head_user_id: 'user-4', op_head: opHead1,
    scheduled_date: '2026-06-25', period_month: 6, period_year: 2026,
    status: 'PLANNED',
    created_by: 'user-4', created_by_user: opHead1,
    created_at: '2026-05-25T09:00:00Z',
  },
  // Armada Sulawesi – KM Perkasa 01 (vessel-3) – Mei
  {
    id: 'vsched-7', vessel_id: 'vessel-3', vessel: mockVessels[2],
    fleet_id: 'fleet-2', fleet: mockFleets[1],
    op_head_user_id: 'user-8', op_head: opHead2,
    scheduled_date: '2026-05-05', period_month: 5, period_year: 2026,
    visit_id: 'visit-4', status: 'IN_PROGRESS',
    notes: 'Kunjungan sudah dilaksanakan, laporan masih dalam status draft',
    created_by: 'user-8', created_by_user: opHead2,
    created_at: '2026-04-20T09:00:00Z',
  },
  // Armada Sulawesi – KM Perkasa 02 (vessel-4) – Mei
  {
    id: 'vsched-8', vessel_id: 'vessel-4', vessel: mockVessels[3],
    fleet_id: 'fleet-2', fleet: mockFleets[1],
    op_head_user_id: 'user-8', op_head: opHead2,
    scheduled_date: '2026-05-20', period_month: 5, period_year: 2026,
    status: 'OVERDUE',
    notes: 'Belum ada realisasi kunjungan untuk periode ini',
    created_by: 'user-8', created_by_user: opHead2,
    created_at: '2026-04-20T09:00:00Z',
  },
  // Armada Sulawesi – KM Perkasa 01 (vessel-3) – Juni
  {
    id: 'vsched-9', vessel_id: 'vessel-3', vessel: mockVessels[2],
    fleet_id: 'fleet-2', fleet: mockFleets[1],
    op_head_user_id: 'user-8', op_head: opHead2,
    scheduled_date: '2026-06-10', period_month: 6, period_year: 2026,
    status: 'DUE_SOON',
    created_by: 'user-8', created_by_user: opHead2,
    created_at: '2026-05-20T09:00:00Z',
  },
  // Armada Sulawesi – KM Perkasa 02 (vessel-4) – Juni
  {
    id: 'vsched-10', vessel_id: 'vessel-4', vessel: mockVessels[3],
    fleet_id: 'fleet-2', fleet: mockFleets[1],
    op_head_user_id: 'user-8', op_head: opHead2,
    scheduled_date: '2026-06-20', period_month: 6, period_year: 2026,
    status: 'PLANNED',
    created_by: 'user-8', created_by_user: opHead2,
    created_at: '2026-05-20T09:00:00Z',
  },
  // Armada Jawa – MV Galangan 01 (vessel-5) – Juni
  {
    id: 'vsched-11', vessel_id: 'vessel-5', vessel: mockVessels[4],
    fleet_id: 'fleet-3', fleet: mockFleets[2],
    scheduled_date: '2026-06-15', period_month: 6, period_year: 2026,
    status: 'PLANNED',
    created_by: 'user-1', created_by_user: mockUsers[0],
    created_at: '2026-05-20T09:00:00Z',
  },
]

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
