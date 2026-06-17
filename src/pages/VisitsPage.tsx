import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Eye, CheckCircle, XCircle, Clock, FileText,
  ChevronUp, ChevronDown as ChevronDownIcon, ChevronsUpDown
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { FilterChips } from '@/components/ui/filter-chips'
import { useVisitsData } from '@/hooks/useVisitsData'
import { VISIT_TYPE_OPTIONS, VISIT_STATUS_OPTIONS } from '@/data/masterOptions'
import { useAuthStore } from '@/stores/authStore'
import { getVisitTypeLabel, getVisitTypeColor, getStatusLabel, getStatusColor, formatDateShort } from '@/utils'
import type { VisitStatus } from '@/types'

type SortField = 'reference_no' | 'visit_date' | 'status' | 'findings_count'
type SortDir = 'asc' | 'desc'

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={13} className="text-gray-300" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-[#1B3A6B]" />
    : <ChevronDownIcon size={13} className="text-[#1B3A6B]" />
}

const PAGE_SIZE = 10

export default function VisitsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { visits } = useVisitsData()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortField, setSortField] = useState<SortField>('visit_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  const canCreate = user && ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR', 'PIC'].includes(user.role)

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return visits.filter(v => {
      const matchSearch = !q ||
        v.reference_no.toLowerCase().includes(q) ||
        (v.vessel?.name?.toLowerCase().includes(q) ?? false) ||
        (v.site?.name?.toLowerCase().includes(q) ?? false) ||
        (v.business_unit?.name?.toLowerCase().includes(q) ?? false)
      const matchType = !filterType || v.visit_type === filterType
      const matchStatus = !filterStatus || v.status === filterStatus
      return matchSearch && matchType && matchStatus
    }).sort((a, b) => {
      let av: string | number = '', bv: string | number = ''
      if (sortField === 'reference_no') { av = a.reference_no; bv = b.reference_no }
      if (sortField === 'visit_date') { av = a.visit_date; bv = b.visit_date }
      if (sortField === 'status') { av = a.status; bv = b.status }
      if (sortField === 'findings_count') { av = a.findings_count ?? 0; bv = b.findings_count ?? 0 }
      return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0)
    })
  }, [visits, search, filterType, filterStatus, sortField, sortDir])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Active filter chips
  const activeChips = [
    filterType && { key: 'type', label: 'Jenis', value: filterType === 'OWNER_VISIT' ? 'Owner Visit' : filterType === 'VESSEL_VISIT' ? 'Vessel Visit' : 'Site Visit' },
    filterStatus && { key: 'status', label: 'Status', value: getStatusLabel(filterStatus as VisitStatus) },
    search && { key: 'search', label: 'Cari', value: search },
  ].filter(Boolean) as { key: string; label: string; value: string }[]

  const removeFilter = (key: string) => {
    if (key === 'type') setFilterType('')
    if (key === 'status') setFilterStatus('')
    if (key === 'search') setSearch('')
    setPage(1)
  }

  const statusIcon = (status: VisitStatus) => {
    if (status === 'APPROVED') return <CheckCircle size={14} className="text-green-600" />
    if (status === 'REJECTED') return <XCircle size={14} className="text-red-600" />
    if (status === 'SUBMITTED') return <Clock size={14} className="text-blue-600" />
    return <FileText size={14} className="text-gray-400" />
  }

  function ThSort({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <th
        className="text-left px-4 py-3 text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-[#1B3A6B] group"
        onClick={() => toggleSort(field)}
      >
        <div className="flex items-center gap-1.5">
          {children}
          <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
        </div>
      </th>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Cari nomor referensi, kapal, site..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-[#1B3A6B] outline-none cursor-pointer"
          >
            <option value="">Semua Jenis</option>
            {VISIT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-[#1B3A6B] outline-none cursor-pointer"
          >
            <option value="">Semua Status</option>
            {VISIT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {canCreate && (
            <Button onClick={() => navigate('/visits/new')}>
              <Plus size={16} /> Buat Kunjungan
            </Button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      <FilterChips
        filters={activeChips}
        onRemove={removeFilter}
        onClearAll={() => { setSearch(''); setFilterType(''); setFilterStatus(''); setPage(1) }}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: visits.length, color: 'text-[#1B3A6B]', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Approved', count: visits.filter(v => v.status === 'APPROVED').length, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'Submitted', count: visits.filter(v => v.status === 'SUBMITTED').length, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Draft', count: visits.filter(v => v.status === 'DRAFT').length, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border ${s.border}`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Tidak ada kunjungan ditemukan"
              description="Coba ubah filter atau buat kunjungan baru"
              action={canCreate ? { label: 'Buat Kunjungan Baru', onClick: () => navigate('/visits/new') } : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <ThSort field="reference_no">No. Referensi</ThSort>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Jenis</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Unit Bisnis</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Obyek</th>
                      <ThSort field="visit_date">Tanggal</ThSort>
                      <ThSort field="status">Status</ThSort>
                      <ThSort field="findings_count">Temuan</ThSort>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(v => (
                      <tr
                        key={v.id}
                        className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer"
                        onClick={() => navigate(`/visits/${v.id}`)}
                      >
                        <td className="px-5 py-3">
                          <p className="font-mono text-xs text-[#1B3A6B] font-semibold">{v.reference_no}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">oleh {v.created_by_user?.full_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge text-[11px] ${getVisitTypeColor(v.visit_type)}`}>
                            {getVisitTypeLabel(v.visit_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-xs">{v.business_unit?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 text-xs">{v.vessel?.name || v.site?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{formatDateShort(v.visit_date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {statusIcon(v.status)}
                            <span className={`badge text-[11px] ${getStatusColor(v.status)}`}>{getStatusLabel(v.status)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(v.findings_count ?? 0) > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                              {v.findings_count}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/visits/${v.id}`)}>
                            <Eye size={14} /> Lihat
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4">
                <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
