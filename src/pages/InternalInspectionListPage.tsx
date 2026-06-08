import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Search, ChevronUp, ChevronDown, Eye, AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mockInternalInspections } from '@/data/mockData'
import { useShips } from '@/hooks/useShips'
import { INTERNAL_INSPECTION_STATUS_OPTIONS, INSPECTION_RESULT_OPTIONS } from '@/data/masterOptions'
import { formatDateShort, getInspectionResultLabel, getInspectionResultColor, getStatusLabel, getStatusColor } from '@/utils'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'

type SortField = 'inspection_date' | 'vessel' | 'result' | 'status' | 'items_deficient'
type SortDir = 'asc' | 'desc'

export default function InternalInspectionListPage() {
  const navigate = useNavigate()
  const { ships } = useShips()
  const [search, setSearch] = useState('')
  const [vesselFilter, setVesselFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('inspection_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? sortDir === 'asc' ? <ChevronUp size={13} className="text-[#1B3A6B]" /> : <ChevronDown size={13} className="text-[#1B3A6B]" />
      : <ChevronDown size={13} className="text-gray-300" />

  const filtered = mockInternalInspections.filter(i => {
    const q = search.toLowerCase()
    const matchSearch = !q || i.reference_no.toLowerCase().includes(q) || (i.vessel?.name || '').toLowerCase().includes(q) || i.lead_inspector.toLowerCase().includes(q)
    const matchVessel = !vesselFilter || i.vessel_id === vesselFilter
    const matchStatus = !statusFilter || i.status === statusFilter
    const matchResult = !resultFilter || i.result === resultFilter
    return matchSearch && matchVessel && matchStatus && matchResult
  }).sort((a, b) => {
    let va: string | number = '', vb: string | number = ''
    if (sortField === 'inspection_date') { va = a.inspection_date; vb = b.inspection_date }
    else if (sortField === 'vessel') { va = a.vessel?.name || ''; vb = b.vessel?.name || '' }
    else if (sortField === 'result') { va = a.result || ''; vb = b.result || '' }
    else if (sortField === 'status') { va = a.status; vb = b.status }
    else if (sortField === 'items_deficient') { va = a.items_deficient; vb = b.items_deficient }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalInspections = mockInternalInspections.length
  const approved = mockInternalInspections.filter(i => i.status === 'APPROVED').length
  const satisfactory = mockInternalInspections.filter(i => i.result === 'SATISFACTORY').length
  const totalFindings = mockInternalInspections.reduce((s, i) => s + i.items_deficient, 0)

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => navigate('/inspections/internal/new')} className="gap-2">
          <Plus size={16} /> Buat Inspeksi Internal
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Inspeksi</p>
          <p className="text-3xl font-bold text-[#1B3A6B] mt-1">{totalInspections}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Disetujui</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{approved}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Satisfactory</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{satisfactory}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#D35400' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Temuan</p>
          <p className="text-3xl font-bold text-orange-700 mt-1">{totalFindings}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Cari no. referensi, kapal, inspektor..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20"
            />
          </div>
          <select value={vesselFilter} onChange={e => { setVesselFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
            <option value="">Semua Kapal</option>
            {ships.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
            <option value="">Semua Status</option>
            {INTERNAL_INSPECTION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={resultFilter} onChange={e => { setResultFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
            <option value="">Semua Hasil</option>
            {INSPECTION_RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(search || vesselFilter || statusFilter || resultFilter) && (
            <button onClick={() => { setSearch(''); setVesselFilter(''); setStatusFilter(''); setResultFilter(''); setPage(1) }}
              className="text-xs text-red-500 hover:text-red-700 font-medium">Reset Filter</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">
            {filtered.length} inspeksi ditemukan
          </p>
        </div>

        {paginated.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Tidak Ada Data Inspeksi"
            description="Belum ada inspeksi internal yang sesuai dengan filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-48">No. Referensi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('vessel')}>
                    <div className="flex items-center gap-1">Kapal <SortIcon field="vessel" /></div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('inspection_date')}>
                    <div className="flex items-center gap-1">Tanggal <SortIcon field="inspection_date" /></div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Inspektor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('result')}>
                    <div className="flex items-center justify-center gap-1">Hasil <SortIcon field="result" /></div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center gap-1">Status <SortIcon field="status" /></div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('items_deficient')}>
                    <div className="flex items-center justify-center gap-1">Temuan <SortIcon field="items_deficient" /></div>
                  </th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map(insp => (
                  <tr key={insp.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/inspections/internal/${insp.id}`)}>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{insp.reference_no}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-800 text-sm">{insp.vessel?.name || '-'}</p>
                      <p className="text-xs text-gray-400">{insp.vessel?.vessel_type}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{formatDateShort(insp.inspection_date)}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{insp.lead_inspector}</td>
                    <td className="px-4 py-3.5 text-center">
                      {insp.result ? (
                        <span className={`badge text-[10px] ${getInspectionResultColor(insp.result)}`}>
                          {getInspectionResultLabel(insp.result)}
                        </span>
                      ) : <span className="text-xs text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`badge text-[10px] ${getStatusColor(insp.status as never)}`}>
                        {getStatusLabel(insp.status as never)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${insp.items_deficient > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {insp.items_deficient > 0
                          ? <><AlertTriangle size={12} /> {insp.items_deficient}</>
                          : <><CheckCircle2 size={12} /> 0</>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/inspections/internal/${insp.id}`)}>
                        <Eye size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
