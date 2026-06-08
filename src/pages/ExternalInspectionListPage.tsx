import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Search, ChevronUp, ChevronDown, Eye, Calendar, AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mockExternalInspections, mockVessels, mockExternalInspectionTypes } from '@/data/mockData'
import { EXTERNAL_INSPECTION_STATUS_OPTIONS, INSPECTION_RESULT_OPTIONS } from '@/data/masterOptions'
import {
  formatDateShort, getInspectionResultLabel, getInspectionResultColor,
  getExternalInspectionTypeLabel, getExternalInspectionTypeColor
} from '@/utils'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import type { ExternalInspectionType } from '@/types'

type SortField = 'inspection_date' | 'vessel' | 'inspection_type' | 'result' | 'total_observations'
type SortDir = 'asc' | 'desc'

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Dijadwalkan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}
const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function ExternalInspectionListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [vesselFilter, setVesselFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
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

  const filtered = mockExternalInspections.filter(i => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      i.reference_no.toLowerCase().includes(q) ||
      (i.vessel?.name || '').toLowerCase().includes(q) ||
      i.inspecting_body.toLowerCase().includes(q) ||
      (i.lead_inspector || '').toLowerCase().includes(q)
    const matchVessel = !vesselFilter || i.vessel_id === vesselFilter
    const matchType = !typeFilter || i.inspection_type === typeFilter
    const matchStatus = !statusFilter || i.status === statusFilter
    const matchResult = !resultFilter || i.result === resultFilter
    return matchSearch && matchVessel && matchType && matchStatus && matchResult
  }).sort((a, b) => {
    let va: string | number = '', vb: string | number = ''
    if (sortField === 'inspection_date') { va = a.inspection_date; vb = b.inspection_date }
    else if (sortField === 'vessel') { va = a.vessel?.name || ''; vb = b.vessel?.name || '' }
    else if (sortField === 'inspection_type') { va = a.inspection_type; vb = b.inspection_type }
    else if (sortField === 'result') { va = a.result || ''; vb = b.result || '' }
    else if (sortField === 'total_observations') { va = a.total_observations; vb = b.total_observations }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalInspections = mockExternalInspections.length
  const completed = mockExternalInspections.filter(i => i.status === 'COMPLETED').length
  const satisfactory = mockExternalInspections.filter(i => i.result === 'SATISFACTORY').length
  const scheduled = mockExternalInspections.filter(i => i.status === 'SCHEDULED').length

  const today = new Date()
  const expiringSoon = mockExternalInspections.filter(i => {
    if (!i.validity_date) return false
    const diff = (new Date(i.validity_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 90
  }).length

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => navigate('/inspections/external/new')} className="gap-2">
          <Plus size={16} /> Buat Inspeksi Eksternal
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#1B3A6B' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Inspeksi</p>
          <p className="text-3xl font-bold text-[#1B3A6B] mt-1">{totalInspections}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#1A7A4A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Satisfactory</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{satisfactory}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#2A5298' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Dijadwalkan</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{scheduled}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#C8922A' }}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sertifikat Expiring</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{expiringSoon}</p>
          <p className="text-xs text-gray-400 mt-0.5">dalam 90 hari</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Cari no. referensi, kapal, lembaga..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20"
            />
          </div>
          <select value={vesselFilter} onChange={e => { setVesselFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
            <option value="">Semua Kapal</option>
            {mockVessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
            <option value="">Semua Jenis</option>
            {mockExternalInspectionTypes.filter(t => t.is_active).map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
            <option value="">Semua Status</option>
            {EXTERNAL_INSPECTION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={resultFilter} onChange={e => { setResultFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
            <option value="">Semua Hasil</option>
            {INSPECTION_RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(search || vesselFilter || typeFilter || statusFilter || resultFilter) && (
            <button onClick={() => { setSearch(''); setVesselFilter(''); setTypeFilter(''); setStatusFilter(''); setResultFilter(''); setPage(1) }}
              className="text-xs text-red-500 hover:text-red-700 font-medium">Reset</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">{filtered.length} inspeksi ditemukan</p>
        </div>

        {paginated.length === 0 ? (
          <EmptyState icon={Shield} title="Tidak Ada Data Inspeksi Eksternal" description="Belum ada inspeksi eksternal yang sesuai filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-44">No. Referensi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('vessel')}>
                    <div className="flex items-center gap-1">Kapal <SortIcon field="vessel" /></div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('inspection_type')}>
                    <div className="flex items-center gap-1">Jenis <SortIcon field="inspection_type" /></div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('inspection_date')}>
                    <div className="flex items-center gap-1">Tanggal <SortIcon field="inspection_date" /></div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Lembaga</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('result')}>
                    <div className="flex items-center justify-center gap-1">Hasil <SortIcon field="result" /></div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('total_observations')}>
                    <div className="flex items-center justify-center gap-1">Observasi <SortIcon field="total_observations" /></div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Validity</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map(insp => {
                  const isExpiringSoon = insp.validity_date && (() => {
                    const diff = (new Date(insp.validity_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    return diff >= 0 && diff <= 90
                  })()
                  return (
                    <tr key={insp.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/inspections/external/${insp.id}`)}>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{insp.reference_no}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-800 text-sm">{insp.vessel?.name}</p>
                        <p className="text-xs text-gray-400">{insp.port}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`badge text-[10px] ${getExternalInspectionTypeColor(insp.inspection_type)}`}>
                          {getExternalInspectionTypeLabel(insp.inspection_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{formatDateShort(insp.inspection_date)}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 max-w-40">
                        <p className="truncate">{insp.inspecting_body}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {insp.result ? (
                          <span className={`badge text-[10px] ${getInspectionResultColor(insp.result)}`}>
                            {getInspectionResultLabel(insp.result)}
                          </span>
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`badge text-[10px] ${STATUS_COLOR[insp.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[insp.status] || insp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {insp.status === 'COMPLETED' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {insp.critical_observations > 0 && (
                              <span className="text-xs font-bold text-red-600">{insp.critical_observations}C</span>
                            )}
                            {insp.major_observations > 0 && (
                              <span className="text-xs font-bold text-orange-600">{insp.major_observations}M</span>
                            )}
                            {insp.minor_observations > 0 && (
                              <span className="text-xs font-bold text-amber-600">{insp.minor_observations}m</span>
                            )}
                            {insp.total_observations === 0 && <span className="text-xs text-gray-400">0</span>}
                          </div>
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {insp.validity_date ? (
                          <div className="flex items-center gap-1">
                            {isExpiringSoon && <AlertCircle size={12} className="text-amber-500 shrink-0" />}
                            <span className={`text-xs ${isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
                              {formatDateShort(insp.validity_date)}
                            </span>
                          </div>
                        ) : (
                          insp.status === 'SCHEDULED'
                            ? <span className="flex items-center gap-1 text-xs text-blue-600"><Calendar size={11} />{formatDateShort(insp.inspection_date)}</span>
                            : <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/inspections/external/${insp.id}`)}>
                          <Eye size={14} />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
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
