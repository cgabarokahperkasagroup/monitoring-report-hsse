import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Search, Star, Eye, Clock,
  ChevronUp, ChevronDown as ChevronDownIcon, ChevronsUpDown
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { FilterChips } from '@/components/ui/filter-chips'
import { useFindingsData } from '@/hooks/useFindingsData'
import { FINDING_STATUS_OPTIONS, FINDING_PRIORITY_OPTIONS } from '@/data/masterOptions'
import { useAuthStore } from '@/stores/authStore'
import {
  getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel,
  getVisitTypeLabel, formatDateShort, getDaysDiff
} from '@/utils'
import type { FindingPriority, FindingStatus } from '@/types'

interface FindingsPageProps {
  myFindingsOnly?: boolean
  ownerOnly?: boolean
}

type SortField = 'title' | 'priority' | 'status' | 'target_close_date'
type SortDir = 'asc' | 'desc'

const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
const STATUS_ORDER = { OVERDUE: 0, OPEN: 1, IN_PROGRESS: 2, PENDING_APPROVAL: 3, CLOSED: 4 }
const PAGE_SIZE = 10

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={13} className="text-gray-300" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-[#1B3A6B]" />
    : <ChevronDownIcon size={13} className="text-[#1B3A6B]" />
}

export default function FindingsPage({ myFindingsOnly, ownerOnly }: FindingsPageProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { findings: allFindings } = useFindingsData()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [sortField, setSortField] = useState<SortField>('target_close_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  const baseFindings = useMemo(() => {
    let all = allFindings
    if (myFindingsOnly && user) all = all.filter(f => f.assigned_to === user.id)
    if (ownerOnly) all = all.filter(f => f.is_owner_finding)
    return all
  }, [allFindings, myFindingsOnly, ownerOnly, user])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return baseFindings.filter(f => {
      const matchSearch = !q ||
        f.title.toLowerCase().includes(q) ||
        f.reference_no.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      const matchStatus = !filterStatus || f.status === filterStatus
      const matchPriority = !filterPriority || f.priority === filterPriority
      return matchSearch && matchStatus && matchPriority
    }).sort((a, b) => {
      let diff = 0
      if (sortField === 'title') diff = a.title.localeCompare(b.title)
      if (sortField === 'priority') diff = PRIORITY_ORDER[a.priority as FindingPriority] - PRIORITY_ORDER[b.priority as FindingPriority]
      if (sortField === 'status') diff = STATUS_ORDER[a.status as FindingStatus] - STATUS_ORDER[b.status as FindingStatus]
      if (sortField === 'target_close_date') diff = a.target_close_date.localeCompare(b.target_close_date)
      return sortDir === 'asc' ? diff : -diff
    })
  }, [baseFindings, search, filterStatus, filterPriority, sortField, sortDir])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summary = {
    open: baseFindings.filter(f => f.status === 'OPEN').length,
    in_progress: baseFindings.filter(f => f.status === 'IN_PROGRESS').length,
    pending: baseFindings.filter(f => f.status === 'PENDING_APPROVAL').length,
    closed: baseFindings.filter(f => f.status === 'CLOSED').length,
    overdue: baseFindings.filter(f => f.status === 'OVERDUE').length,
  }

  const activeChips = [
    filterStatus && { key: 'status', label: 'Status', value: getStatusLabel(filterStatus as FindingStatus) },
    filterPriority && { key: 'priority', label: 'Prioritas', value: getPriorityLabel(filterPriority as FindingPriority) },
    search && { key: 'search', label: 'Cari', value: search },
  ].filter(Boolean) as { key: string; label: string; value: string }[]

  const removeFilter = (key: string) => {
    if (key === 'status') setFilterStatus('')
    if (key === 'priority') setFilterPriority('')
    if (key === 'search') setSearch('')
    setPage(1)
  }

  function ThSort({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <th
        className="text-left px-4 py-3 text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-[#1B3A6B]"
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
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Cari judul, nomor, kategori..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-[#1B3A6B] outline-none cursor-pointer"
          >
            <option value="">Semua Status</option>
            {FINDING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={e => { setFilterPriority(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-[#1B3A6B] outline-none cursor-pointer"
          >
            <option value="">Semua Prioritas</option>
            {FINDING_PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Active filter chips */}
      <FilterChips
        filters={activeChips}
        onRemove={removeFilter}
        onClearAll={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setPage(1) }}
      />

      {/* Status summary — clickable to filter */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[
          { label: 'Open', value: 'OPEN', count: summary.open, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'In Progress', value: 'IN_PROGRESS', count: summary.in_progress, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Pending', value: 'PENDING_APPROVAL', count: summary.pending, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Closed', value: 'CLOSED', count: summary.closed, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'Overdue', value: 'OVERDUE', count: summary.overdue, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => { setFilterStatus(filterStatus === s.value ? '' : s.value); setPage(1) }}
            className={`${s.bg} rounded-xl p-4 border ${filterStatus === s.value ? 'ring-2 ring-offset-1 ring-current ' + s.color : s.border} text-left hover:shadow-sm transition-all`}
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Tidak ada temuan ditemukan"
              description="Coba ubah filter pencarian atau hapus filter yang aktif"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <ThSort field="title">Temuan</ThSort>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Sumber</th>
                      <ThSort field="priority">Prioritas</ThSort>
                      <ThSort field="status">Status</ThSort>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Tgl. Open</th>
                      <ThSort field="target_close_date">Target Closing</ThSort>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Actual Closing</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">PIC</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(f => {
                      const daysLeft = getDaysDiff(f.target_close_date)
                      const isNearDue = daysLeft <= 3 && daysLeft > 0 && f.status !== 'CLOSED'
                      return (
                        <tr
                          key={f.id}
                          className="border-b border-gray-100 hover:bg-gray-50/80 cursor-pointer transition-colors"
                          onClick={() => navigate(`/findings/${f.id}`, ownerOnly ? { state: { from: '/owner-findings' } } : undefined)}
                        >
                          <td className="px-5 py-3 max-w-xs">
                            <div className="flex items-start gap-2">
                              {f.is_owner_finding && <Star size={13} className="text-amber-500 shrink-0 mt-0.5" />}
                              <div>
                                <p className="font-medium text-gray-800 text-xs line-clamp-2">{f.title}</p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{f.reference_no}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">{f.category} · {f.business_unit?.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{getVisitTypeLabel(f.source_type)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge text-[11px] ${getPriorityColor(f.priority as FindingPriority)}`}>
                              {getPriorityLabel(f.priority as FindingPriority)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge text-[11px] ${getStatusColor(f.status)}`}>
                              {getStatusLabel(f.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{formatDateShort(f.created_at)}</td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-600">{formatDateShort(f.target_close_date)}</p>
                            {isNearDue && (
                              <p className="text-[10px] text-orange-600 flex items-center gap-1 mt-0.5">
                                <Clock size={10} /> {daysLeft} hari lagi
                              </p>
                            )}
                            {f.status === 'OVERDUE' && (
                              <p className="text-[10px] text-red-600 flex items-center gap-1 mt-0.5">
                                <AlertTriangle size={10} /> Overdue {Math.abs(daysLeft)} hari
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {f.closed_at ? (
                              <div>
                                <p className={`text-xs ${f.closed_at > f.target_close_date ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                  {formatDateShort(f.closed_at)}
                                </p>
                                {f.closed_at > f.target_close_date && (
                                  <p className="text-[10px] text-red-500 mt-0.5">Terlambat</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{f.assigned_to_user?.full_name || '—'}</td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/findings/${f.id}`, ownerOnly ? { state: { from: '/owner-findings' } } : undefined)}>
                              <Eye size={14} />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
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
