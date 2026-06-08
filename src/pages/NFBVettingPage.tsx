import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquareX, Shield, CheckCircle2, AlertCircle, Clock,
  XCircle, ChevronUp, ChevronDown, Plus, Search, Filter, FileText,
  TrendingUp, Edit,
} from 'lucide-react'
import {
  usePISKapalStore,
  getPISStatusLabel, getPISStatusColor,
  getPISTemuanLabel, getPISTemuanColor,
  getPISPerusahaanColor,
} from '@/stores/pisKapalStore'
import { mockPISPerusahaan, mockPISTemuanTypes, mockPISKategori } from '@/data/mockData'
import { PIS_FINDING_STATUS_OPTIONS } from '@/data/masterOptions'
import { formatDateShort } from '@/utils'
import type { PISFindingStatus, PISPerusahaan } from '@/types'

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, icon: Icon, color, bg,
}: { label: string; value: number; icon: React.ElementType; color: string; bg: string }) {
  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: bg }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PISFindingStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPISStatusColor(status)}`}>
      {getPISStatusLabel(status)}
    </span>
  )
}

// ── Sort helper ───────────────────────────────────────────────────────────────

type SortKey = 'no' | 'nama_kapal' | 'perusahaan' | 'temuan' | 'category' | 'status' | 'open_date' | 'target_closed_date' | 'actual_closed_date'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NFBVettingPage() {
  const navigate = useNavigate()
  const { findings: allFindings } = usePISKapalStore()

  // Hanya NFB dan Vetting Plus
  const findings = useMemo(
    () => allFindings.filter(f => f.temuan === 'NEGATIVE_FEEDBACK' || f.temuan === 'VETTING_PLUS'),
    [allFindings],
  )

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch]                     = useState('')
  const [filterPerusahaan, setFilterPerusahaan] = useState<PISPerusahaan | ''>('')
  const [filterTemuan, setFilterTemuan]         = useState<'NEGATIVE_FEEDBACK' | 'VETTING_PLUS' | ''>('')
  const [filterStatus, setFilterStatus]         = useState<PISFindingStatus | ''>('')
  const [filterCategory, setFilterCategory]     = useState('')
  const [filterYear, setFilterYear]             = useState('')

  // ── Sorting ────────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>('no')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const perPage = 15

  // ── Unique years ───────────────────────────────────────────────────────────
  const years = useMemo(() => {
    const s = new Set(findings.map(f => f.kode_year_open).filter(Boolean) as string[])
    return [...s].sort()
  }, [findings])

  // ── KPIs (dari seluruh dataset, bukan filtered) ───────────────────────────
  const kpi = useMemo(() => {
    const nfb     = findings.filter(f => f.temuan === 'NEGATIVE_FEEDBACK').length
    const vetting = findings.filter(f => f.temuan === 'VETTING_PLUS').length
    const counts  = { total: findings.length, nfb, vetting, CLOSED: 0, OPEN: 0, ON_PROSES: 0, REJECTED: 0, PROCESS_APPROVAL: 0 }
    findings.forEach(f => counts[f.status]++)
    return counts
  }, [findings])

  // ── Filtered set ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return findings.filter(f => {
      if (search &&
        !f.deskripsi.toLowerCase().includes(search.toLowerCase()) &&
        !f.nama_kapal.toLowerCase().includes(search.toLowerCase()) &&
        !f.no_ticket.toLowerCase().includes(search.toLowerCase())) return false
      if (filterPerusahaan && f.perusahaan !== filterPerusahaan) return false
      if (filterTemuan && f.temuan !== filterTemuan) return false
      if (filterStatus && f.status !== filterStatus) return false
      if (filterCategory && f.category !== filterCategory) return false
      if (filterYear && f.kode_year_open !== filterYear) return false
      return true
    })
  }, [findings, search, filterPerusahaan, filterTemuan, filterStatus, filterCategory, filterYear])

  // ── Sort + paginate ───────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = a[sortKey] ?? ''
      let bv: string | number = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      av = String(av); bv = String(bv)
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / perPage)
  const paginated  = sorted.slice((page - 1) * perPage, page * perPage)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown size={12} className="text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: '#1B3A6B' }} />
      : <ChevronDown size={12} style={{ color: '#1B3A6B' }} />
  }

  function clearFilters() {
    setSearch(''); setFilterPerusahaan(''); setFilterTemuan(''); setFilterStatus('')
    setFilterCategory(''); setFilterYear(''); setPage(1)
  }

  const hasFilter = search || filterPerusahaan || filterTemuan || filterStatus || filterCategory || filterYear

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Monitoring NFB &amp; Vetting</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Daftar Negative Feedback dan Vetting Plus kapal PIS
          </p>
        </div>
        <button
          onClick={() => navigate('/pis-findings/new')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#1B3A6B' }}
        >
          <Plus size={16} />
          Tambah Finding
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <KPICard label="Total Finding"     value={kpi.total}   icon={TrendingUp}    color="#1B3A6B" bg="#EBF0FA" />
        <KPICard label="Neg. Feedback"     value={kpi.nfb}     icon={MessageSquareX} color="#ef4444" bg="#FEE2E2" />
        <KPICard label="Vetting Plus"      value={kpi.vetting} icon={Shield}         color="#7c3aed" bg="#EDE9FE" />
        <KPICard label="Open"              value={kpi.OPEN}    icon={AlertCircle}   color="#f97316" bg="#FFF7ED" />
        <KPICard label="On Proses"         value={kpi.ON_PROSES}    icon={Clock}        color="#3b82f6" bg="#EFF6FF" />
        <KPICard label="Closed"            value={kpi.CLOSED}       icon={CheckCircle2} color="#22c55e" bg="#F0FDF4" />
        <KPICard label="Rejected / PA"     value={kpi.REJECTED + kpi.PROCESS_APPROVAL} icon={XCircle} color="#ef4444" bg="#FEE2E2" />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Cari deskripsi, kapal, no. tiket..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-[#1B3A6B]"
            />
          </div>

          <select
            value={filterPerusahaan}
            onChange={e => { setFilterPerusahaan(e.target.value as PISPerusahaan | ''); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none"
          >
            <option value="">Semua Perusahaan</option>
            {mockPISPerusahaan.filter(p => p.is_active).map(p => <option key={p.id} value={p.kode}>{p.kode}</option>)}
          </select>

          <select
            value={filterTemuan}
            onChange={e => { setFilterTemuan(e.target.value as 'NEGATIVE_FEEDBACK' | 'VETTING_PLUS' | ''); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none"
          >
            <option value="">Semua Tipe Temuan</option>
            {mockPISTemuanTypes.filter(t => t.is_active && t.value !== 'SELF_ASSESSMENT').map(t => <option key={t.id} value={t.value}>{t.label}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value as PISFindingStatus | ''); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none"
          >
            <option value="">Semua Status</option>
            {PIS_FINDING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={filterCategory}
            onChange={e => { setFilterCategory(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none"
          >
            <option value="">Semua Kategori</option>
            {mockPISKategori.filter(k => k.is_active).map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
          </select>

          <select
            value={filterYear}
            onChange={e => { setFilterYear(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none"
          >
            <option value="">Semua Tahun</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {hasFilter && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-lg"
            >
              Reset
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <Filter size={11} />
          Menampilkan {filtered.length} dari {findings.length} finding
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {([
                  ['no',                 'No',           'w-12'],
                  ['perusahaan',         'Perusahaan',   'w-24'],
                  ['nama_kapal',         'Nama Kapal',   'min-w-[160px]'],
                  ['temuan',             'Tipe Temuan',  'min-w-[140px]'],
                  ['category',           'Kategori',     'min-w-[130px]'],
                  ['status',             'Status',       'w-36'],
                  ['open_date',           'Tgl. Open',     'w-28'],
                  ['target_closed_date',  'Target Close',  'w-28'],
                  ['actual_closed_date',  'Actual Close',  'w-28'],
                  [null,                  'No. Tiket',     'min-w-[160px]'],
                  [null,                  'Aksi',          'w-16'],
                ] as [SortKey | null, string, string][]).map(([key, label, cls]) => (
                  <th
                    key={label}
                    className={`px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide ${cls} ${key ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => key && toggleSort(key)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {key && <SortIcon k={key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Tidak ada data ditemukan</p>
                  </td>
                </tr>
              ) : paginated.map(f => (
                <tr
                  key={f.id}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  onClick={() => navigate(`/pis-findings/${f.id}`, { state: { from: '/nfb-vetting' } })}
                >
                  <td className="px-3 py-3 text-gray-500 text-center">{f.no}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getPISPerusahaanColor(f.perusahaan)}`}>
                      {f.perusahaan}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={f.nama_kapal}>
                    {f.nama_kapal}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPISTemuanColor(f.temuan)}`}>
                      {getPISTemuanLabel(f.temuan)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 max-w-[150px] truncate" title={f.category}>
                    {f.category}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{formatDateShort(f.open_date)}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{formatDateShort(f.target_closed_date)}</td>
                  <td className="px-3 py-3 text-xs">
                    {f.actual_closed_date
                      ? <span className="text-green-700 font-medium">{formatDateShort(f.actual_closed_date)}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs font-mono truncate max-w-[160px]" title={f.no_ticket}>
                    {f.no_ticket}
                  </td>
                  <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/pis-findings/${f.id}/edit`)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B3A6B] hover:bg-blue-50 transition-colors"
                      title="Edit finding"
                    >
                      <Edit size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} dari {sorted.length}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50"
              >‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-xs border rounded ${page === p ? 'text-white' : 'border-gray-200 hover:bg-gray-50'}`}
                    style={page === p ? { backgroundColor: '#1B3A6B', borderColor: '#1B3A6B' } : {}}
                  >{p}</button>
                )
              })}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50"
              >›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
