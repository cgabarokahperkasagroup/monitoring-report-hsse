// @ts-nocheck
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Building2, Ship, MapPin, Tag, Layers, Search, ShieldCheck, Flag, AlertTriangle, List, Shield, Loader2, AlertCircle, ClipboardList, ChevronDown, ChevronUp, GripVertical, RotateCcw, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'

const SYSTEM_ROLES = [
  { id: 'role-1', key: 'SUPER_ADMIN', label: 'Super Admin', description: 'Akses penuh ke seluruh fitur dan konfigurasi sistem tanpa batasan.', color: 'bg-purple-100 text-purple-800', is_system: true, is_active: true, created_at: '2024-01-01' },
  { id: 'role-2', key: 'ADMIN', label: 'Admin Sistem', description: 'Mengelola pengguna, master data, dan konfigurasi sistem dalam lingkup BU yang ditugaskan.', color: 'bg-blue-100 text-blue-800', is_system: true, is_active: true, created_at: '2024-01-01' },
  { id: 'role-3', key: 'MANAGEMENT', label: 'Direksi / Owner', description: 'Melihat seluruh laporan, menyetujui kunjungan, dan memantau performa operasional.', color: 'bg-amber-100 text-amber-800', is_system: true, is_active: true, created_at: '2024-01-01' },
  { id: 'role-4', key: 'HEAD_HSSE', label: 'Head HSSE Corporate', description: 'Mengawasi seluruh aktivitas HSSE lintas BU, menyetujui temuan kritis, dan menyusun laporan korporat.', color: 'bg-red-100 text-red-800', is_system: true, is_active: true, created_at: '2024-01-01' },
  { id: 'role-5', key: 'STAFF_HSSE', label: 'Staff HSSE', description: 'Melaksanakan inspeksi internal kapal dan mengelola temuan HSSE pada fleet yang ditugaskan.', color: 'bg-orange-100 text-orange-800', is_system: true, is_active: true, created_at: '2024-01-01' },
  { id: 'role-6', key: 'OP_HEAD', label: 'Operation Head', description: 'Memimpin kunjungan operasional, mengelola fleet, dan menyetujui laporan di lingkup BU.', color: 'bg-indigo-100 text-indigo-800', is_system: true, is_active: true, created_at: '2024-01-01' },
  { id: 'role-7', key: 'SITE_MGR', label: 'Site Manager', description: 'Mengelola kunjungan dan temuan pada site/lokasi yang menjadi tanggung jawabnya.', color: 'bg-green-100 text-green-800', is_system: true, is_active: true, created_at: '2024-01-01' },
  { id: 'role-8', key: 'PIC', label: 'PIC', description: 'Penanggung jawab tindak lanjut temuan dan pelaporan progress penyelesaian.', color: 'bg-teal-100 text-teal-800', is_system: true, is_active: true, created_at: '2024-01-01' },
  { id: 'role-9', key: 'VIEWER', label: 'Viewer', description: 'Hanya dapat melihat data dan laporan tanpa hak untuk membuat atau mengubah data.', color: 'bg-gray-100 text-gray-700', is_system: true, is_active: true, created_at: '2024-01-01' },
]
import { useShips } from '@/hooks/useShips'

type DBBE = { id: string; code: string; name: string; description: string | null; is_active: boolean }
type DBSite = { id: string; name: string; business_unit_id: string; address: string | null; site_type: string | null; is_active: boolean }
type DBCategory = { id: string; name: string; description: string | null; is_active: boolean }
type DBUser = { id: string; role: string }
type DBPISPerusahaan = { id: string; code: string; name: string; is_active: boolean }
type DBPISTemuanType = { id: string; code: string; label: string; is_active: boolean }
type DBPISKategori = { id: string; name: string; is_active: boolean }
type DBExtInspType = { id: string; code: string; label: string; is_active: boolean }
import { useChecklistStore, type ChecklistArea, type ChecklistGuidanceItem } from '@/stores/checklistStore'
import type { PIC } from '@/data/vesselInspectionConstants'

type Tab = 'bu' | 'fleets' | 'vessels' | 'sites' | 'categories' | 'roles'
  | 'pis_perusahaan' | 'pis_temuan' | 'pis_kategori' | 'ext_insp_type'
  | 'checklist_prep' | 'checklist_area'

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<Tab>('bu')
  const { success } = useToast()
  const { ships } = useShips()
  const uniqueFleetCount = new Set(ships.map(s => s.fleet.id)).size
  const checklist = useChecklistStore()
  const [counts, setCounts] = useState({ bu: 0, sites: 0, categories: 0, pis_perusahaan: 0, pis_temuan: 0, pis_kategori: 0, ext_insp: 0 })

  useEffect(() => {
    Promise.all([
      supabase.from('business_units_mh').select('*', { count: 'exact', head: true }),
      supabase.from('sites').select('*', { count: 'exact', head: true }),
      supabase.from('finding_categories').select('*', { count: 'exact', head: true }),
      supabase.from('pis_perusahaan').select('*', { count: 'exact', head: true }),
      supabase.from('pis_finding_types').select('*', { count: 'exact', head: true }),
      supabase.from('pis_categories').select('*', { count: 'exact', head: true }),
      supabase.from('external_inspection_types').select('*', { count: 'exact', head: true }),
    ]).then(([bu, sites, cats, pisP, pisT, pisK, extT]) => {
      setCounts({
        bu: bu.count || 0, sites: sites.count || 0, categories: cats.count || 0,
        pis_perusahaan: pisP.count || 0, pis_temuan: pisT.count || 0,
        pis_kategori: pisK.count || 0, ext_insp: extT.count || 0,
      })
    })
  }, [])

  const tabGroups = [
    {
      label: 'Operasional',
      tabs: [
        { id: 'bu' as Tab, label: 'Unit Bisnis', icon: Building2, count: counts.bu },
        { id: 'fleets' as Tab, label: 'Fleet', icon: Layers, count: uniqueFleetCount },
        { id: 'vessels' as Tab, label: 'Kapal', icon: Ship, count: ships.length },
        { id: 'sites' as Tab, label: 'Site / Lokasi', icon: MapPin, count: counts.sites },
        { id: 'categories' as Tab, label: 'Kategori Temuan', icon: Tag, count: counts.categories },
        { id: 'roles' as Tab, label: 'Role', icon: ShieldCheck, count: SYSTEM_ROLES.length },
      ],
    },
    {
      label: 'Referensi PIS & Inspeksi',
      tabs: [
        { id: 'pis_perusahaan' as Tab, label: 'Perusahaan PIS', icon: Flag, count: counts.pis_perusahaan },
        { id: 'pis_temuan' as Tab, label: 'Tipe Temuan PIS', icon: AlertTriangle, count: counts.pis_temuan },
        { id: 'pis_kategori' as Tab, label: 'Kategori PIS', icon: List, count: counts.pis_kategori },
        { id: 'ext_insp_type' as Tab, label: 'Tipe Inspeksi Eksternal', icon: Shield, count: counts.ext_insp },
      ],
    },
    {
      label: 'Checklist Inspeksi Kapal',
      tabs: [
        { id: 'checklist_prep' as Tab, label: 'Persiapan Kunjungan', icon: ClipboardList, count: checklist.prepOffice.length + checklist.prepVessel.length },
        { id: 'checklist_area' as Tab, label: 'Area Inspeksi', icon: List, count: checklist.areas.length },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Tab Groups */}
      {tabGroups.map(group => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">{group.label}</p>
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1.5 flex-wrap">
            {group.tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id ? 'bg-[#1B3A6B] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <tab.icon size={15} />
                {tab.label}
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Content */}
      {activeTab === 'bu' && <BusinessUnitTab onSave={() => success('Unit bisnis disimpan', '')} onDelete={() => success('Unit bisnis dihapus', '')} />}
      {activeTab === 'fleets' && <FleetTab onSave={() => success('Fleet disimpan', '')} onDelete={() => success('Fleet dihapus', '')} />}
      {activeTab === 'vessels' && <VesselsTab onSave={() => success('Kapal disimpan', '')} onDelete={() => success('Kapal dihapus', '')} />}
      {activeTab === 'sites' && <SitesTab onSave={() => success('Site disimpan', '')} onDelete={() => success('Site dihapus', '')} />}
      {activeTab === 'categories' && <CategoriesTab onSave={() => success('Kategori disimpan', '')} onDelete={() => success('Kategori dihapus', '')} />}
      {activeTab === 'roles' && <RolesTab onSave={() => success('Role disimpan', '')} onDelete={() => success('Role dihapus', '')} />}
      {activeTab === 'pis_perusahaan' && <PISPerusahaanTab onSave={() => success('Perusahaan disimpan', '')} onDelete={() => success('Perusahaan dihapus', '')} />}
      {activeTab === 'pis_temuan' && <PISTemuanTab onSave={() => success('Tipe temuan disimpan', '')} onDelete={() => success('Tipe temuan dihapus', '')} />}
      {activeTab === 'pis_kategori' && <PISKategoriTab onSave={() => success('Kategori PIS disimpan', '')} onDelete={() => success('Kategori PIS dihapus', '')} />}
      {activeTab === 'ext_insp_type' && <ExtInspTypeTab onSave={() => success('Tipe inspeksi disimpan', '')} onDelete={() => success('Tipe inspeksi dihapus', '')} />}
      {activeTab === 'checklist_prep' && <ChecklistPrepTab />}
      {activeTab === 'checklist_area' && <ChecklistAreaTab />}
    </div>
  )
}

// ─── Unit Bisnis ────────────────────────────────────────────────────────────

function BusinessUnitTab({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DBBE | null>(null)
  const [businessUnits, setBusinessUnits] = useState<DBBE[]>([])

  function refetch() {
    supabase.from('business_units_mh').select('id, code, name, description, is_active')
      .then(({ data }) => { if (data) setBusinessUnits(data as unknown as DBBE[]) })
  }

  useEffect(() => { refetch() }, [])

  async function handleDelete(bu: DBBE) {
    if (!confirm(`Hapus unit bisnis "${bu.name}"?`)) return
    await supabase.from('business_units_mh').delete().eq('id', bu.id)
    setBusinessUnits(prev => prev.filter(x => x.id !== bu.id))
    onDelete()
  }

  const filtered = businessUnits.filter(bu =>
    !search || bu.code.toLowerCase().includes(search.toLowerCase()) || bu.name.toLowerCase().includes(search.toLowerCase())
  )
  const activeCount = businessUnits.filter(b => b.is_active).length

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total BU</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{businessUnits.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Aktif</p>
          <p className="text-2xl font-bold text-green-700 mt-0.5">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#9CA3AF' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Nonaktif</p>
          <p className="text-2xl font-bold text-gray-500 mt-0.5">{businessUnits.length - activeCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari kode atau nama BU..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white" />
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={15} /> Tambah BU
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Kode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Nama Unit Bisnis</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Deskripsi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(bu => (
                  <tr key={bu.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono text-sm font-semibold text-[#1B3A6B]">{bu.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{bu.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{bu.description || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${bu.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {bu.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(bu); setShowModal(true) }} title="Edit">
                          <Edit size={13} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(bu)}>
                          <Trash2 size={13} className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data yang cocok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <BUFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null) }}
        data={editing}
        onSaved={() => { setShowModal(false); setEditing(null); refetch(); onSave() }}
      />
    </div>
  )
}

function BUFormModal({ open, onClose, data, onSaved }: {
  open: boolean; onClose: () => void; data: DBBE | null; onSaved: () => void
}) {
  const [form, setForm] = useState({ code: '', name: '', description: '', is_active: true })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setForm({ code: data?.code || '', name: data?.name || '', description: data?.description || '', is_active: data?.is_active ?? true })
  }, [open, data])

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) return
    setLoading(true)
    const payload = { code: form.code.trim().toUpperCase(), name: form.name.trim(), description: form.description.trim() || null, is_active: form.is_active }
    if (data) {
      await supabase.from('business_units_mh').update(payload as any).eq('id', data.id)
    } else {
      await supabase.from('business_units_mh').insert(payload as any)
    }
    setLoading(false)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={data ? 'Edit Unit Bisnis' : 'Tambah Unit Bisnis'} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button onClick={handleSave} disabled={loading}>{loading ? 'Menyimpan...' : data ? 'Simpan Perubahan' : 'Tambah'}</Button></>}>
      <div className="flex flex-col gap-3">
        <Input label="Kode BU" required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="Contoh: SHP, FUEL, SCM" disabled={!!data} />
        <Input label="Nama Unit Bisnis" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nama lengkap unit bisnis" />
        <Textarea label="Deskripsi" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi singkat unit bisnis..." rows={2} />
        {data && (
          <Select label="Status" value={form.is_active ? 'active' : 'inactive'}
            onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
            options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} />
        )}
      </div>
    </Modal>
  )
}

// ─── Fleet ──────────────────────────────────────────────────────────────────

function FleetTab({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  const [search, setSearch] = useState('')
  const { ships, loading, error } = useShips()

  // Derive unique fleets from ships API data
  const fleets = [...new Map(ships.map(s => [s.fleet.id, s.fleet])).values()]
    .sort((a, b) => a.id - b.id)

  const filtered = fleets.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  )

  const withoutOpHead = fleets.filter(f =>
    !ships.some(s => s.fleet.id === f.id && s.operation_head)
  ).length

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Fleet</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{loading ? '...' : fleets.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#2563EB' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Kapal</p>
          <p className="text-2xl font-bold text-blue-700 mt-0.5">{loading ? '...' : ships.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#D97706' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tanpa Op. Head</p>
          <p className="text-2xl font-bold text-amber-600 mt-0.5">{loading ? '...' : withoutOpHead}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" />
          Gagal memuat data fleet: {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama fleet..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white" />
        </div>
        <Button size="sm" onClick={onSave}>
          <Plus size={15} /> Tambah Fleet
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              Memuat data fleet dari SMS...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Nama Fleet</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Operation Head</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Jenis Kapal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Jumlah Kapal</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(fleet => {
                    const fleetShips = ships.filter(s => s.fleet.id === fleet.id)
                    const opHead = fleetShips.find(s => s.operation_head)?.operation_head
                    const shipTypes = [...new Set(fleetShips.map(s => s.ship_type?.code).filter(Boolean))] as string[]
                    return (
                      <tr key={fleet.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800">{fleet.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {opHead ? opHead.name : <span className="text-gray-400 italic">Belum ditugaskan</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {shipTypes.length > 0
                              ? shipTypes.map(t => (
                                  <span key={t} className="badge bg-blue-50 text-blue-700 border-blue-200 text-[11px]">{t}</span>
                                ))
                              : <span className="text-xs text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">{fleetShips.length} kapal</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={onSave}>
                              <Edit size={13} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={onDelete}>
                              <Trash2 size={13} className="text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && !loading && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data yang cocok</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Kapal ──────────────────────────────────────────────────────────────────

function VesselsTab({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  const [search, setSearch] = useState('')
  const [fleetFilter, setFleetFilter] = useState('')
  const { ships, loading, error } = useShips()

  const uniqueFleets = [...new Map(ships.map(s => [s.fleet.id, s.fleet.name])).entries()]
    .sort((a, b) => a[0] - b[0])

  const filtered = ships.filter(v => {
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase())
      || v.ship_type?.name.toLowerCase().includes(search.toLowerCase())
    const matchFleet = !fleetFilter || String(v.fleet.id) === fleetFilter
    return matchSearch && matchFleet
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Kapal</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{loading ? '...' : ships.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#2563EB' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Fleet</p>
          <p className="text-2xl font-bold text-blue-700 mt-0.5">{uniqueFleets.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#7C3AED' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tipe Kapal</p>
          <p className="text-2xl font-bold text-purple-700 mt-0.5">
            {new Set(ships.map(s => s.ship_type?.code).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" />
          Gagal memuat data kapal: {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama kapal atau jenis..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white" />
        </div>
        <select value={fleetFilter} onChange={e => setFleetFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-[#1B3A6B] outline-none cursor-pointer">
          <option value="">Semua Fleet</option>
          {uniqueFleets.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
        </select>
        <Button size="sm" onClick={() => onSave()}>
          <Plus size={15} /> Tambah Kapal
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              Memuat data kapal dari SMS...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Nama Kapal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Jenis</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Fleet</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Perusahaan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Operation Head</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{v.name}</td>
                      <td className="px-4 py-3">
                        {v.ship_type ? (
                          <>
                            <span className="badge bg-blue-50 text-blue-700 border-blue-200 text-[11px]">
                              {v.ship_type.code}
                            </span>
                            <span className="text-xs text-gray-500 ml-1.5">{v.ship_type.name}</span>
                          </>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{v.fleet.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-[#1B3A6B]">{v.headcount?.code ?? '—'}</span>
                        {v.headcount && <span className="text-xs text-gray-500 ml-1.5 hidden xl:inline">– {v.headcount.name}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {v.operation_head?.name || <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={onSave}>
                            <Edit size={13} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={onDelete}>
                            <Trash2 size={13} className="text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data yang cocok</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Site / Lokasi ───────────────────────────────────────────────────────────

function SitesTab({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DBSite | null>(null)
  const [sites, setSites] = useState<DBSite[]>([])
  const [businessUnits, setBusinessUnits] = useState<DBBE[]>([])

  function refetch() {
    supabase.from('sites').select('id, name, business_unit_id, address, site_type, is_active')
      .then(({ data }) => { if (data) setSites(data as unknown as DBSite[]) })
  }

  useEffect(() => {
    refetch()
    supabase.from('business_units_mh').select('id, code, name, description, is_active').eq('is_active', true)
      .then(({ data }) => { if (data) setBusinessUnits(data as unknown as DBBE[]) })
  }, [])

  async function handleDelete(s: DBSite) {
    if (!confirm(`Hapus site "${s.name}"?`)) return
    await supabase.from('sites').delete().eq('id', s.id)
    setSites(prev => prev.filter(x => x.id !== s.id))
    onDelete()
  }

  const siteTypes = [...new Set(sites.map(s => s.site_type).filter(Boolean))] as string[]

  const filtered = sites.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || s.site_type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Site</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{sites.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#7C3AED' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tipe</p>
          <p className="text-2xl font-bold text-purple-700 mt-0.5">{siteTypes.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Aktif</p>
          <p className="text-2xl font-bold text-green-700 mt-0.5">{sites.filter(s => s.is_active).length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama site..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-[#1B3A6B] outline-none cursor-pointer">
          <option value="">Semua Tipe</option>
          {siteTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={15} /> Tambah Site
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Nama Site</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Tipe</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Unit Bisnis</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Alamat</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const bu = businessUnits.find(b => b.id === s.business_unit_id)
                  return (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                      <td className="px-4 py-3">
                        {s.site_type
                          ? <span className="badge bg-purple-50 text-purple-700 border-purple-200 text-[11px]">{s.site_type}</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-[#1B3A6B]">{bu?.code}</span>
                        <span className="text-xs text-gray-500 ml-1.5">– {bu?.name}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{s.address || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setShowModal(true) }}>
                            <Edit size={13} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(s)}>
                            <Trash2 size={13} className="text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data yang cocok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SiteFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null) }}
        data={editing}
        businessUnits={businessUnits}
        onSaved={() => { setShowModal(false); setEditing(null); refetch(); onSave() }}
      />
    </div>
  )
}

function SiteFormModal({ open, onClose, data, businessUnits, onSaved }: {
  open: boolean; onClose: () => void; data: DBSite | null; businessUnits: DBBE[]; onSaved: () => void
}) {
  const [form, setForm] = useState({ name: '', site_type: '', business_unit_id: '', address: '', is_active: true })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setForm({
      name: data?.name || '',
      site_type: data?.site_type || '',
      business_unit_id: data?.business_unit_id || '',
      address: data?.address || '',
      is_active: data?.is_active ?? true,
    })
  }, [open, data])

  async function handleSave() {
    if (!form.name.trim() || !form.business_unit_id) return
    setLoading(true)
    const payload = { name: form.name.trim(), site_type: form.site_type.trim() || null, business_unit_id: form.business_unit_id, address: form.address.trim() || null, is_active: form.is_active }
    if (data) {
      await supabase.from('sites').update(payload as any).eq('id', data.id)
    } else {
      await supabase.from('sites').insert(payload as any)
    }
    setLoading(false)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={data ? 'Edit Site' : 'Tambah Site'} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button onClick={handleSave} disabled={loading}>{loading ? 'Menyimpan...' : data ? 'Simpan Perubahan' : 'Tambah'}</Button></>}>
      <div className="flex flex-col gap-3">
        <Input label="Nama Site" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Contoh: SPBU Balikpapan 02" />
        <Input label="Tipe Site" value={form.site_type} onChange={e => setForm(p => ({ ...p, site_type: e.target.value }))} placeholder="Contoh: SPBU, Gudang, Terminal, Kantor" />
        <Select label="Unit Bisnis" required value={form.business_unit_id} onChange={e => setForm(p => ({ ...p, business_unit_id: e.target.value }))} placeholder="Pilih BU"
          options={businessUnits.map(b => ({ value: b.id, label: `${b.code} – ${b.name}` }))} />
        <Textarea label="Alamat" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Alamat lengkap site..." rows={2} />
        {data && (
          <Select label="Status" value={form.is_active ? 'active' : 'inactive'}
            onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
            options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} />
        )}
      </div>
    </Modal>
  )
}

// ─── Kategori Temuan ─────────────────────────────────────────────────────────

function CategoriesTab({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DBCategory | null>(null)
  const [categories, setCategories] = useState<DBCategory[]>([])

  function refetch() {
    supabase.from('finding_categories').select('id, name, description, is_active')
      .then(({ data }) => { if (data) setCategories(data as unknown as DBCategory[]) })
  }

  useEffect(() => { refetch() }, [])

  async function handleDelete(c: DBCategory) {
    if (!confirm(`Hapus kategori "${c.name}"?`)) return
    await supabase.from('finding_categories').delete().eq('id', c.id)
    setCategories(prev => prev.filter(x => x.id !== c.id))
    onDelete()
  }

  const filtered = categories.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )
  const activeCount = categories.filter(c => c.is_active).length

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Kategori</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{categories.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Aktif</p>
          <p className="text-2xl font-bold text-green-700 mt-0.5">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#9CA3AF' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Nonaktif</p>
          <p className="text-2xl font-bold text-gray-500 mt-0.5">{categories.length - activeCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama kategori..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white" />
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={15} /> Tambah Kategori
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Nama Kategori</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Deskripsi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${c.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {c.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setShowModal(true) }}>
                          <Edit size={13} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}>
                          <Trash2 size={13} className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data yang cocok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CategoryFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null) }}
        data={editing}
        onSaved={() => { setShowModal(false); setEditing(null); refetch(); onSave() }}
      />
    </div>
  )
}

function CategoryFormModal({ open, onClose, data, onSaved }: {
  open: boolean; onClose: () => void; data: DBCategory | null; onSaved: () => void
}) {
  const [form, setForm] = useState({ name: '', description: '', is_active: true })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setForm({ name: data?.name || '', description: data?.description || '', is_active: data?.is_active ?? true })
  }, [open, data])

  async function handleSave() {
    if (!form.name.trim()) return
    setLoading(true)
    const payload = { name: form.name.trim(), description: form.description.trim() || null, is_active: form.is_active }
    if (data) {
      await supabase.from('finding_categories').update(payload as any).eq('id', data.id)
    } else {
      await supabase.from('finding_categories').insert(payload as any)
    }
    setLoading(false)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={data ? 'Edit Kategori' : 'Tambah Kategori Temuan'} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button onClick={handleSave} disabled={loading}>{loading ? 'Menyimpan...' : data ? 'Simpan Perubahan' : 'Tambah'}</Button></>}>
      <div className="flex flex-col gap-3">
        <Input label="Nama Kategori" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Contoh: Safety, Operasional, Administrasi" />
        <Textarea label="Deskripsi" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi singkat kategori..." rows={2} />
        {data && (
          <Select label="Status" value={form.is_active ? 'active' : 'inactive'}
            onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
            options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} />
        )}
      </div>
    </Modal>
  )
}

// ─── Role ─────────────────────────────────────────────────────────────────────

function RolesTab({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<typeof SYSTEM_ROLES[0] | null>(null)
  const [dbUsers, setDbUsers] = useState<DBUser[]>([])

  useEffect(() => {
    supabase.from('users').select('id, role')
      .then(({ data }) => { if (data) setDbUsers(data as unknown as DBUser[]) })
  }, [])

  const filtered = SYSTEM_ROLES.filter(r =>
    !search || r.label.toLowerCase().includes(search.toLowerCase()) || r.key.toLowerCase().includes(search.toLowerCase())
  )
  const activeCount = SYSTEM_ROLES.filter(r => r.is_active).length
  const systemCount = SYSTEM_ROLES.filter(r => r.is_system).length

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Role</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{SYSTEM_ROLES.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#7C3AED' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Role Sistem</p>
          <p className="text-2xl font-bold text-purple-700 mt-0.5">{systemCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Aktif</p>
          <p className="text-2xl font-bold text-green-700 mt-0.5">{activeCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama role..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white" />
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={15} /> Tambah Role
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Role Key</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Nama Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Deskripsi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Badge</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Pengguna</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Tipe</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(role => {
                  const userCount = dbUsers.filter(u => u.role === role.key).length
                  return (
                    <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3 font-mono text-sm font-semibold text-[#1B3A6B]">{role.key}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{role.label}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">{role.description || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[11px] ${role.color}`}>{role.label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">{userCount} pengguna</td>
                      <td className="px-4 py-3">
                        {role.is_system
                          ? <span className="badge bg-purple-50 text-purple-700 border-purple-200 text-[11px]">Sistem</span>
                          : <span className="badge bg-blue-50 text-blue-700 border-blue-200 text-[11px]">Custom</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[11px] ${role.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {role.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditing(role); setShowModal(true) }}>
                            <Edit size={13} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={onDelete}
                            disabled={role.is_system} title={role.is_system ? 'Role sistem tidak dapat dihapus' : 'Hapus role'}>
                            <Trash2 size={13} className={role.is_system ? 'text-gray-300' : 'text-red-500'} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data yang cocok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <RoleFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null) }}
        data={editing}
        onSave={() => { setShowModal(false); setEditing(null); onSave() }}
      />
    </div>
  )
}

function RoleFormModal({ open, onClose, data, onSave }: {
  open: boolean; onClose: () => void; data: typeof SYSTEM_ROLES[0] | null; onSave: () => void
}) {
  const colorOptions = [
    { value: 'bg-purple-100 text-purple-800', label: 'Ungu' },
    { value: 'bg-blue-100 text-blue-800', label: 'Biru' },
    { value: 'bg-amber-100 text-amber-800', label: 'Kuning' },
    { value: 'bg-red-100 text-red-800', label: 'Merah' },
    { value: 'bg-orange-100 text-orange-800', label: 'Oranye' },
    { value: 'bg-indigo-100 text-indigo-800', label: 'Nila' },
    { value: 'bg-green-100 text-green-800', label: 'Hijau' },
    { value: 'bg-teal-100 text-teal-800', label: 'Teal' },
    { value: 'bg-gray-100 text-gray-700', label: 'Abu-abu' },
  ]

  return (
    <Modal open={open} onClose={onClose} title={data ? 'Edit Role' : 'Tambah Role Baru'} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button onClick={onSave}>{data ? 'Simpan Perubahan' : 'Tambah'}</Button></>}>
      <div className="flex flex-col gap-3">
        <Input label="Role Key" required defaultValue={data?.key}
          placeholder="Contoh: FLEET_COORD (huruf kapital, tanpa spasi)"
          disabled={!!data?.is_system} />
        <Input label="Nama Role" required defaultValue={data?.label} placeholder="Contoh: Fleet Coordinator" />
        <Textarea label="Deskripsi" defaultValue={data?.description} placeholder="Deskripsi singkat wewenang role ini..." rows={3} />
        <Select label="Warna Badge" value={data?.color || 'bg-gray-100 text-gray-700'} onChange={() => {}}
          options={colorOptions} />
        {data && (
          <Select label="Status" value={data.is_active ? 'active' : 'inactive'} onChange={() => {}}
            options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} />
        )}
        {data?.is_system && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            Role sistem hanya dapat diubah nama, deskripsi, dan warna badge-nya.
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── PIS Perusahaan ──────────────────────────────────────────────────────────

function PISPerusahaanTab({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DBPISPerusahaan | null>(null)
  const [pisPerusahaan, setPisPerusahaan] = useState<DBPISPerusahaan[]>([])
  const [form, setForm] = useState({ code: '', name: '', is_active: true })
  const [saving, setSaving] = useState(false)

  function refetch() {
    supabase.from('pis_perusahaan').select('id, code, name, is_active')
      .then(({ data }) => { if (data) setPisPerusahaan(data as unknown as DBPISPerusahaan[]) })
  }

  useEffect(() => { refetch() }, [])

  function openModal(item: DBPISPerusahaan | null) {
    setEditing(item)
    setForm({ code: item?.code || '', name: item?.name || '', is_active: item?.is_active ?? true })
    setShowModal(true)
  }

  async function handleDelete(p: DBPISPerusahaan) {
    if (!confirm(`Hapus perusahaan "${p.name}"?`)) return
    await supabase.from('pis_perusahaan').delete().eq('id', p.id)
    setPisPerusahaan(prev => prev.filter(x => x.id !== p.id))
    onDelete()
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) return
    setSaving(true)
    const payload = { code: form.code.trim().toUpperCase(), name: form.name.trim(), is_active: form.is_active }
    if (editing) {
      await supabase.from('pis_perusahaan').update(payload as any).eq('id', editing.id)
    } else {
      await supabase.from('pis_perusahaan').insert(payload as any)
    }
    setSaving(false)
    setShowModal(false); setEditing(null); refetch(); onSave()
  }

  const filtered = pisPerusahaan.filter(p =>
    !search || p.code.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Perusahaan</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{pisPerusahaan.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Aktif</p>
          <p className="text-2xl font-bold text-green-700 mt-0.5">{pisPerusahaan.filter(p => p.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#9CA3AF' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Nonaktif</p>
          <p className="text-2xl font-bold text-gray-500 mt-0.5">{pisPerusahaan.filter(p => !p.is_active).length}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari kode atau nama perusahaan..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white" />
        </div>
        <Button size="sm" onClick={() => openModal(null)}>
          <Plus size={15} /> Tambah Perusahaan
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Kode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Nama Perusahaan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono text-sm font-semibold text-[#1B3A6B]">{p.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${p.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {p.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openModal(p)}><Edit size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}><Trash2 size={13} className="text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data yang cocok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }}
        title={editing ? 'Edit Perusahaan' : 'Tambah Perusahaan PIS'} size="sm"
        footer={<><Button variant="ghost" onClick={() => { setShowModal(false); setEditing(null) }}>Batal</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Kode" required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="Contoh: ASG, BGP" disabled={!!editing} />
          <Input label="Nama Perusahaan" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nama lengkap perusahaan" />
          {editing && (
            <Select label="Status" value={form.is_active ? 'active' : 'inactive'}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
              options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} />
          )}
        </div>
      </Modal>
    </div>
  )
}

// ─── PIS Tipe Temuan ──────────────────────────────────────────────────────────

function PISTemuanTab({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DBPISTemuanType | null>(null)
  const [pisTemuanTypes, setPisTemuanTypes] = useState<DBPISTemuanType[]>([])
  const [form, setForm] = useState({ code: '', label: '', is_active: true })
  const [saving, setSaving] = useState(false)

  function refetch() {
    supabase.from('pis_finding_types').select('id, code, label, is_active')
      .then(({ data }) => { if (data) setPisTemuanTypes(data as unknown as DBPISTemuanType[]) })
  }

  useEffect(() => { refetch() }, [])

  function openModal(item: DBPISTemuanType | null) {
    setEditing(item)
    setForm({ code: item?.code || '', label: item?.label || '', is_active: item?.is_active ?? true })
    setShowModal(true)
  }

  async function handleDelete(t: DBPISTemuanType) {
    if (!confirm(`Hapus tipe temuan "${t.label}"?`)) return
    await supabase.from('pis_finding_types').delete().eq('id', t.id)
    setPisTemuanTypes(prev => prev.filter(x => x.id !== t.id))
    onDelete()
  }

  async function handleSave() {
    if (!form.code.trim() || !form.label.trim()) return
    setSaving(true)
    const payload = { code: form.code.trim().toUpperCase(), label: form.label.trim(), is_active: form.is_active }
    if (editing) {
      await supabase.from('pis_finding_types').update(payload as any).eq('id', editing.id)
    } else {
      await supabase.from('pis_finding_types').insert(payload as any)
    }
    setSaving(false)
    setShowModal(false); setEditing(null); refetch(); onSave()
  }

  const filtered = pisTemuanTypes.filter(t =>
    !search || t.label.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Tipe</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{pisTemuanTypes.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Aktif</p>
          <p className="text-2xl font-bold text-green-700 mt-0.5">{pisTemuanTypes.filter(t => t.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#9CA3AF' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Nonaktif</p>
          <p className="text-2xl font-bold text-gray-500 mt-0.5">{pisTemuanTypes.filter(t => !t.is_active).length}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari tipe temuan..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white" />
        </div>
        <Button size="sm" onClick={() => openModal(null)}>
          <Plus size={15} /> Tambah Tipe Temuan
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Value (Key)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Label</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Deskripsi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B3A6B]">{t.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.label}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">—</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${t.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openModal(t)}><Edit size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(t)}><Trash2 size={13} className="text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data yang cocok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }}
        title={editing ? 'Edit Tipe Temuan' : 'Tambah Tipe Temuan PIS'} size="sm"
        footer={<><Button variant="ghost" onClick={() => { setShowModal(false); setEditing(null) }}>Batal</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Value (Key)" required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="Contoh: NEGATIVE_FEEDBACK (tanpa spasi)" disabled={!!editing} />
          <Input label="Label" required value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Contoh: Negative Feedback" />
          {editing && (
            <Select label="Status" value={form.is_active ? 'active' : 'inactive'}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
              options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} />
          )}
        </div>
      </Modal>
    </div>
  )
}

// ─── PIS Kategori ─────────────────────────────────────────────────────────────

function PISKategoriTab({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DBPISKategori | null>(null)
  const [pisKategori, setPisKategori] = useState<DBPISKategori[]>([])
  const [form, setForm] = useState({ name: '', is_active: true })
  const [saving, setSaving] = useState(false)

  function refetch() {
    supabase.from('pis_categories').select('id, name, is_active')
      .then(({ data }) => { if (data) setPisKategori(data as unknown as DBPISKategori[]) })
  }

  useEffect(() => { refetch() }, [])

  function openModal(item: DBPISKategori | null) {
    setEditing(item); setForm({ name: item?.name || '', is_active: item?.is_active ?? true }); setShowModal(true)
  }

  async function handleDelete(k: DBPISKategori) {
    if (!confirm(`Hapus kategori "${k.name}"?`)) return
    await supabase.from('pis_categories').delete().eq('id', k.id)
    setPisKategori(prev => prev.filter(x => x.id !== k.id)); onDelete()
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('pis_categories').update({ name: form.name.trim(), is_active: form.is_active } as any).eq('id', editing.id)
    } else {
      await supabase.from('pis_categories').insert({ name: form.name.trim(), is_active: form.is_active } as any)
    }
    setSaving(false); setShowModal(false); setEditing(null); refetch(); onSave()
  }

  const filtered = pisKategori.filter(k =>
    !search || k.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Kategori</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{pisKategori.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Aktif</p>
          <p className="text-2xl font-bold text-green-700 mt-0.5">{pisKategori.filter(k => k.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#9CA3AF' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Nonaktif</p>
          <p className="text-2xl font-bold text-gray-500 mt-0.5">{pisKategori.filter(k => !k.is_active).length}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama kategori PIS..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white" />
        </div>
        <Button size="sm" onClick={() => openModal(null)}>
          <Plus size={15} /> Tambah Kategori
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Nama Kategori</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(k => (
                  <tr key={k.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{k.name}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${k.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {k.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openModal(k)}><Edit size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(k)}><Trash2 size={13} className="text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data yang cocok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }}
        title={editing ? 'Edit Kategori PIS' : 'Tambah Kategori PIS'} size="sm"
        footer={<><Button variant="ghost" onClick={() => { setShowModal(false); setEditing(null) }}>Batal</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Nama Kategori" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Contoh: CCTV, Sampler, Slop Tank" />
          {editing && (
            <Select label="Status" value={form.is_active ? 'active' : 'inactive'}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
              options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} />
          )}
        </div>
      </Modal>
    </div>
  )
}

// ─── Tipe Inspeksi Eksternal ──────────────────────────────────────────────────

function ExtInspTypeTab({ onSave, onDelete }: { onSave: () => void; onDelete: () => void }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DBExtInspType | null>(null)
  const [extInspTypes, setExtInspTypes] = useState<DBExtInspType[]>([])
  const [form, setForm] = useState({ code: '', label: '', is_active: true })
  const [saving, setSaving] = useState(false)

  function refetch() {
    supabase.from('external_inspection_types').select('id, code, label, is_active')
      .then(({ data }) => { if (data) setExtInspTypes(data as unknown as DBExtInspType[]) })
  }

  useEffect(() => { refetch() }, [])

  function openModal(item: DBExtInspType | null) {
    setEditing(item); setForm({ code: item?.code || '', label: item?.label || '', is_active: item?.is_active ?? true }); setShowModal(true)
  }

  async function handleDelete(t: DBExtInspType) {
    if (!confirm(`Hapus tipe inspeksi "${t.label}"?`)) return
    await supabase.from('external_inspection_types').delete().eq('id', t.id)
    setExtInspTypes(prev => prev.filter(x => x.id !== t.id)); onDelete()
  }

  async function handleSave() {
    if (!form.code.trim() || !form.label.trim()) return
    setSaving(true)
    const payload = { code: form.code.trim().toUpperCase(), label: form.label.trim(), is_active: form.is_active }
    if (editing) {
      await supabase.from('external_inspection_types').update(payload as any).eq('id', editing.id)
    } else {
      await supabase.from('external_inspection_types').insert(payload as any)
    }
    setSaving(false); setShowModal(false); setEditing(null); refetch(); onSave()
  }

  const filtered = extInspTypes.filter(t =>
    !search || t.label.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase())
  )

  const colorOptions = [
    { value: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Biru' },
    { value: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Nila' },
    { value: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Ungu' },
    { value: 'bg-teal-100 text-teal-800 border-teal-200', label: 'Teal' },
    { value: 'bg-green-100 text-green-800 border-green-200', label: 'Hijau' },
    { value: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Kuning' },
    { value: 'bg-red-100 text-red-800 border-red-200', label: 'Merah' },
    { value: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Oranye' },
    { value: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Abu-abu' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Tipe</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{extInspTypes.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Aktif</p>
          <p className="text-2xl font-bold text-green-700 mt-0.5">{extInspTypes.filter(t => t.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#9CA3AF' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Nonaktif</p>
          <p className="text-2xl font-bold text-gray-500 mt-0.5">{extInspTypes.filter(t => !t.is_active).length}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari tipe inspeksi..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white" />
        </div>
        <Button size="sm" onClick={() => openModal(null)}>
          <Plus size={15} /> Tambah Tipe
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Value</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Label</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Deskripsi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Badge</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B3A6B]">{t.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.label}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">—</td>
                    <td className="px-4 py-3"><span className="badge text-[11px] bg-gray-100 text-gray-700 border-gray-200">{t.label}</span></td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${t.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openModal(t)}><Edit size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(t)}><Trash2 size={13} className="text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data yang cocok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }}
        title={editing ? 'Edit Tipe Inspeksi' : 'Tambah Tipe Inspeksi Eksternal'} size="sm"
        footer={<><Button variant="ghost" onClick={() => { setShowModal(false); setEditing(null) }}>Batal</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Value (Key)" required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="Contoh: SIRE, BIRE (tanpa spasi)" disabled={!!editing} />
          <Input label="Label" required value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Contoh: SIRE, Vetting PSA" />
          {editing && (
            <Select label="Status" value={form.is_active ? 'active' : 'inactive'}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
              options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} />
          )}
        </div>
      </Modal>
    </div>
  )
}

// ─── Checklist Persiapan Kunjungan ────────────────────────────────────────────

function ChecklistPrepTab() {
  const store = useChecklistStore()
  const { success } = useToast()
  const [officeModal, setOfficeModal] = useState<{ open: boolean; idx: number | null; value: string }>({ open: false, idx: null, value: '' })
  const [vesselModal, setVesselModal] = useState<{ open: boolean; idx: number | null; value: string }>({ open: false, idx: null, value: '' })

  function saveOffice() {
    const val = officeModal.value.trim()
    if (!val) return
    if (officeModal.idx === null) {
      store.addPrepOffice(val); success('Item persiapan kantor ditambahkan', '')
    } else {
      store.updatePrepOffice(officeModal.idx, val); success('Item persiapan kantor diperbarui', '')
    }
    setOfficeModal({ open: false, idx: null, value: '' })
  }

  function saveVessel() {
    const val = vesselModal.value.trim()
    if (!val) return
    if (vesselModal.idx === null) {
      store.addPrepVessel(val); success('Item persiapan kapal ditambahkan', '')
    } else {
      store.updatePrepVessel(vesselModal.idx, val); success('Item persiapan kapal diperbarui', '')
    }
    setVesselModal({ open: false, idx: null, value: '' })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <Info size={14} className="shrink-0" />
        Perubahan pada checklist persiapan akan diterapkan pada form inspeksi kapal yang baru dibuat.
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Item</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{store.prepOffice.length + store.prepVessel.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#2563EB' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Persiapan Kantor</p>
          <p className="text-2xl font-bold text-blue-700 mt-0.5">{store.prepOffice.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#7C3AED' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Persiapan di Kapal</p>
          <p className="text-2xl font-bold text-purple-700 mt-0.5">{store.prepVessel.length}</p>
        </div>
      </div>

      {/* Section A */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">A. Persiapan di Kantor</h3>
            <p className="text-xs text-gray-500 mt-0.5">Checklist yang harus dilakukan sebelum berangkat ke kapal</p>
          </div>
          <Button size="sm" onClick={() => setOfficeModal({ open: true, idx: null, value: '' })}><Plus size={14} /> Tambah Item</Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Item Checklist</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right w-36">Urutan & Aksi</th>
                </tr>
              </thead>
              <tbody>
                {store.prepOffice.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/70">
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-700">{item}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => store.movePrepOffice(idx, 'up')} disabled={idx === 0}><ChevronUp size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => store.movePrepOffice(idx, 'down')} disabled={idx === store.prepOffice.length - 1}><ChevronDown size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setOfficeModal({ open: true, idx, value: item })}><Edit size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { store.deletePrepOffice(idx); success('Item dihapus', '') }}><Trash2 size={13} className="text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {store.prepOffice.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">Belum ada item.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Section B */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">B. Persiapan di Atas Kapal</h3>
            <p className="text-xs text-gray-500 mt-0.5">Checklist kegiatan yang dilakukan setibanya di atas kapal</p>
          </div>
          <Button size="sm" onClick={() => setVesselModal({ open: true, idx: null, value: '' })}><Plus size={14} /> Tambah Item</Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Item Checklist</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right w-36">Urutan & Aksi</th>
                </tr>
              </thead>
              <tbody>
                {store.prepVessel.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/70">
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-700">{item}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => store.movePrepVessel(idx, 'up')} disabled={idx === 0}><ChevronUp size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => store.movePrepVessel(idx, 'down')} disabled={idx === store.prepVessel.length - 1}><ChevronDown size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setVesselModal({ open: true, idx, value: item })}><Edit size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { store.deletePrepVessel(idx); success('Item dihapus', '') }}><Trash2 size={13} className="text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {store.prepVessel.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">Belum ada item.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => { store.reset(); success('Checklist dikembalikan ke default', '') }} className="text-gray-500 hover:text-red-600">
          <RotateCcw size={13} /> Reset ke Default
        </Button>
      </div>

      <Modal open={officeModal.open} onClose={() => setOfficeModal({ open: false, idx: null, value: '' })}
        title={officeModal.idx === null ? 'Tambah Item Persiapan Kantor' : 'Edit Item Persiapan Kantor'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setOfficeModal({ open: false, idx: null, value: '' })}>Batal</Button><Button onClick={saveOffice}>{officeModal.idx === null ? 'Tambah' : 'Simpan'}</Button></>}>
        <Textarea label="Item Checklist" required value={officeModal.value}
          onChange={e => setOfficeModal(s => ({ ...s, value: e.target.value }))}
          placeholder="Contoh: Mempelajari laporan kunjungan manajemen yang lalu" rows={3} />
      </Modal>

      <Modal open={vesselModal.open} onClose={() => setVesselModal({ open: false, idx: null, value: '' })}
        title={vesselModal.idx === null ? 'Tambah Item Persiapan di Kapal' : 'Edit Item Persiapan di Kapal'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setVesselModal({ open: false, idx: null, value: '' })}>Batal</Button><Button onClick={saveVessel}>{vesselModal.idx === null ? 'Tambah' : 'Simpan'}</Button></>}>
        <Textarea label="Item Checklist" required value={vesselModal.value}
          onChange={e => setVesselModal(s => ({ ...s, value: e.target.value }))}
          placeholder="Contoh: Rapat pembuka / Memperkenalkan diri" rows={3} />
      </Modal>
    </div>
  )
}

// ─── Checklist Area Inspeksi ──────────────────────────────────────────────────

const PIC_OPTIONS: { value: PIC; label: string }[] = [
  { value: 'none', label: 'Tanpa PIC khusus' },
  { value: 'kapal', label: 'PIC Kapal' },
  { value: 'darat', label: 'PIC Darat' },
]

interface AreaModalState {
  open: boolean
  areaId: string | null
  areaName: string
  editingItem: ChecklistGuidanceItem | null
  itemPic: PIC
  itemGuidance: string
  mode: 'area' | 'item'
}

function ChecklistAreaTab() {
  const store = useChecklistStore()
  const { success } = useToast()
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null)
  const [modal, setModal] = useState<AreaModalState>({
    open: false, areaId: null, areaName: '', editingItem: null, itemPic: 'none', itemGuidance: '', mode: 'area',
  })

  function openAddArea() {
    setModal({ open: true, areaId: null, areaName: '', editingItem: null, itemPic: 'none', itemGuidance: '', mode: 'area' })
  }
  function openEditArea(area: ChecklistArea) {
    setModal({ open: true, areaId: area.id, areaName: area.name, editingItem: null, itemPic: 'none', itemGuidance: '', mode: 'area' })
  }
  function openAddItem(areaId: string) {
    setModal({ open: true, areaId, areaName: '', editingItem: null, itemPic: 'none', itemGuidance: '', mode: 'item' })
  }
  function openEditItem(areaId: string, item: ChecklistGuidanceItem) {
    setModal({ open: true, areaId, areaName: '', editingItem: item, itemPic: item.pic, itemGuidance: item.guidance, mode: 'item' })
  }

  function handleSave() {
    if (modal.mode === 'area') {
      const name = modal.areaName.trim()
      if (!name) return
      if (modal.areaId) {
        store.updateAreaName(modal.areaId, name); success('Nama area diperbarui', '')
      } else {
        store.addArea(name); success('Area baru ditambahkan', '')
      }
    } else {
      if (!modal.areaId || !modal.itemGuidance.trim()) return
      if (modal.editingItem) {
        store.updateGuidanceItem(modal.areaId, modal.editingItem.id, modal.itemPic, modal.itemGuidance.trim())
        success('Item panduan diperbarui', '')
      } else {
        store.addGuidanceItem(modal.areaId, modal.itemPic, modal.itemGuidance.trim())
        success('Item panduan ditambahkan', '')
      }
    }
    setModal(s => ({ ...s, open: false }))
  }

  const totalItems = store.areas.reduce((sum, a) => sum + a.items.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <Info size={14} className="shrink-0" />
        Area dan panduan inspeksi yang dikelola di sini akan digunakan pada form inspeksi kapal yang baru dibuat.
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Area</p>
          <p className="text-2xl font-bold text-[#1B3A6B] mt-0.5">{store.areas.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#2563EB' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Item Panduan</p>
          <p className="text-2xl font-bold text-blue-700 mt-0.5">{totalItems}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: '#7C3AED' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rata-rata per Area</p>
          <p className="text-2xl font-bold text-purple-700 mt-0.5">
            {store.areas.length ? (totalItems / store.areas.length).toFixed(1) : '0'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Klik pada area untuk melihat dan mengelola item panduan inspeksi.</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { store.reset(); success('Checklist dikembalikan ke default', '') }} className="text-gray-500 hover:text-red-600">
            <RotateCcw size={13} /> Reset ke Default
          </Button>
          <Button size="sm" onClick={openAddArea}><Plus size={14} /> Tambah Area</Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {store.areas.map((area, aIdx) => {
          const isExpanded = expandedAreaId === area.id
          return (
            <Card key={area.id} className="overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}>
                <GripVertical size={14} className="text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#1B3A6B] w-6 shrink-0">{aIdx + 1}</span>
                  <span className="font-medium text-gray-800 text-sm truncate">{area.name}</span>
                  <span className="badge bg-gray-100 text-gray-500 border-gray-200 text-[11px] shrink-0">{area.items.length} item</span>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => store.moveArea(area.id, 'up')} disabled={aIdx === 0}><ChevronUp size={13} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => store.moveArea(area.id, 'down')} disabled={aIdx === store.areas.length - 1}><ChevronDown size={13} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditArea(area)}><Edit size={13} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { store.deleteArea(area.id); success('Area dihapus', ''); if (isExpanded) setExpandedAreaId(null) }}>
                    <Trash2 size={13} className="text-red-500" />
                  </Button>
                  {isExpanded ? <ChevronUp size={14} className="text-gray-400 ml-1" /> : <ChevronDown size={14} className="text-gray-400 ml-1" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Item Panduan Inspeksi</span>
                    <Button size="sm" onClick={() => openAddItem(area.id)} className="h-7 text-xs px-2.5">
                      <Plus size={12} /> Tambah Item
                    </Button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 w-8">#</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Panduan Pemeriksaan</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-32">PIC</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {area.items.map((item, iIdx) => (
                        <tr key={item.id} className="border-b border-gray-50 hover:bg-blue-50/30">
                          <td className="px-5 py-2.5 text-gray-400 font-mono text-xs">{iIdx + 1}</td>
                          <td className="px-3 py-2.5 text-gray-700 text-xs leading-relaxed">{item.guidance}</td>
                          <td className="px-3 py-2.5">
                            {item.pic === 'none'
                              ? <span className="text-xs text-gray-400">—</span>
                              : <span className={`badge text-[11px] ${item.pic === 'kapal' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                  {item.pic === 'kapal' ? 'PIC Kapal' : 'PIC Darat'}
                                </span>
                            }
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => store.moveGuidanceItem(area.id, item.id, 'up')} disabled={iIdx === 0} className="h-6 w-6 p-0"><ChevronUp size={11} /></Button>
                              <Button variant="ghost" size="sm" onClick={() => store.moveGuidanceItem(area.id, item.id, 'down')} disabled={iIdx === area.items.length - 1} className="h-6 w-6 p-0"><ChevronDown size={11} /></Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditItem(area.id, item)} className="h-6 w-6 p-0"><Edit size={11} /></Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                                onClick={() => { store.deleteGuidanceItem(area.id, item.id); success('Item panduan dihapus', '') }}>
                                <Trash2 size={11} className="text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {area.items.length === 0 && (
                        <tr><td colSpan={4} className="px-5 py-6 text-center text-xs text-gray-400">Belum ada item panduan. Klik "Tambah Item".</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )
        })}
        {store.areas.length === 0 && (
          <div className="text-center py-12 text-sm text-gray-400">Belum ada area inspeksi. Klik "Tambah Area" untuk memulai.</div>
        )}
      </div>

      <Modal
        open={modal.open}
        onClose={() => setModal(s => ({ ...s, open: false }))}
        title={
          modal.mode === 'area'
            ? (modal.areaId ? 'Edit Nama Area' : 'Tambah Area Inspeksi')
            : (modal.editingItem ? 'Edit Item Panduan' : 'Tambah Item Panduan')
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(s => ({ ...s, open: false }))}>Batal</Button>
            <Button onClick={handleSave}>{modal.editingItem || (modal.mode === 'area' && modal.areaId) ? 'Simpan Perubahan' : 'Tambah'}</Button>
          </>
        }
      >
        {modal.mode === 'area' ? (
          <Input label="Nama Area Inspeksi" required value={modal.areaName}
            onChange={e => setModal(s => ({ ...s, areaName: e.target.value }))}
            placeholder="Contoh: Anjungan, Kamar Mesin, Dapur" />
        ) : (
          <div className="flex flex-col gap-3">
            <Textarea label="Panduan Pemeriksaan" required value={modal.itemGuidance}
              onChange={e => setModal(s => ({ ...s, itemGuidance: e.target.value }))}
              placeholder="Contoh: Periksa kondisi fisik, penataan dokumen dan peralatan..." rows={4} />
            <Select label="PIC (Penanggung Jawab)" value={modal.itemPic}
              onChange={e => setModal(s => ({ ...s, itemPic: e.target.value as PIC }))}
              options={PIC_OPTIONS} />
          </div>
        )}
      </Modal>
    </div>
  )
}
