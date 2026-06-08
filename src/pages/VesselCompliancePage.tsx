import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ship, CheckCircle, XCircle, AlertTriangle, Plus, Search, Filter, X,
  CalendarDays, ClipboardCheck, CheckCircle2, Clock, Loader2, CalendarCheck, Eye, User
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockVessels, mockFleets, mockUsers, mockVesselCompliance, mockVisitSchedules } from '@/data/mockData'
import { INSPECTION_SCHEDULE_STATUS_OPTIONS } from '@/data/masterOptions'
import { useAuthStore } from '@/stores/authStore'
import { formatDateShort } from '@/utils'
import type { VisitScheduleStatus } from '@/types'

const currentMonth: number = 6
const currentYear: number = 2026

// ── Status config ─────────────────────────────────────────────────────────────

function getScheduleStatusConfig(status: VisitScheduleStatus) {
  switch (status) {
    case 'COMPLETED':   return { label: 'Selesai',            bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  icon: CheckCircle2,  dot: 'bg-green-500' }
    case 'IN_PROGRESS': return { label: 'Sedang Berjalan',   bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   icon: Loader2,       dot: 'bg-blue-500' }
    case 'DUE_SOON':    return { label: 'Segera Jatuh Tempo', bg: 'bg-amber-100', text: 'text-amber-700',  border: 'border-amber-200',  icon: Clock,         dot: 'bg-amber-500' }
    case 'OVERDUE':     return { label: 'Terlambat',          bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    icon: AlertTriangle, dot: 'bg-red-500' }
    case 'PLANNED':     return { label: 'Direncanakan',       bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: CalendarCheck, dot: 'bg-purple-500' }
    case 'CANCELLED':   return { label: 'Dibatalkan',         bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-200',   icon: CalendarDays,  dot: 'bg-gray-400' }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VesselCompliancePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const isOpHead = user?.role === 'OP_HEAD'
  const canManagePlan = user?.role === 'HEAD_HSSE' || user?.role === 'SUPER_ADMIN'
  const userFleetId = isOpHead ? (user?.fleet_id ?? '') : ''

  const [tab, setTab] = useState<'plan' | 'actual'>('plan')

  // Plan tab filters
  const [fleetFilter, setFleetFilter] = useState(userFleetId)
  const [vesselFilter, setVesselFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  // Actual tab filters
  const [selectedFleet, setSelectedFleet] = useState('ALL')
  const [periodMode, setPeriodMode] = useState<'month' | 'year' | 'range'>('month')
  const [filterMonth, setFilterMonth] = useState(currentMonth)
  const [filterYear, setFilterYear] = useState(currentYear)
  const [fromDate, setFromDate] = useState(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
  const [toDate, setToDate] = useState(`${currentYear}-${String(currentMonth).padStart(2, '0')}-30`)
  const [visitStatusFilter, setVisitStatusFilter] = useState<'ALL' | 'VISITED' | 'NOT_VISITED'>('ALL')
  const [vesselSearch, setVesselSearch] = useState('')
  const [complianceFilter, setComplianceFilter] = useState<'ALL' | 'HIGH' | 'MID' | 'LOW'>('ALL')

  const opHeads = mockUsers.filter(u => u.role === 'OP_HEAD')

  // ── Plan tab data ──────────────────────────────────────────────────────────

  const filteredPlans = mockVisitSchedules.filter(s => {
    // OP_HEAD sees only their fleet
    if (isOpHead && s.fleet_id !== userFleetId) return false
    const matchFleet = !fleetFilter || s.fleet_id === fleetFilter
    const matchVessel = !vesselFilter || s.vessel_id === vesselFilter
    const matchStatus = !statusFilter || s.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (s.vessel?.name || '').toLowerCase().includes(q) ||
      (s.fleet?.name || '').toLowerCase().includes(q) ||
      (s.op_head?.full_name || '').toLowerCase().includes(q)
    return matchFleet && matchVessel && matchStatus && matchSearch
  })

  const planSource = isOpHead
    ? mockVisitSchedules.filter(s => s.fleet_id === userFleetId)
    : mockVisitSchedules

  const planCounts = {
    total: planSource.length,
    completed: planSource.filter(s => s.status === 'COMPLETED').length,
    overdue: planSource.filter(s => s.status === 'OVERDUE').length,
    pending: planSource.filter(s => s.status === 'PLANNED' || s.status === 'DUE_SOON' || s.status === 'IN_PROGRESS').length,
  }

  const filteredVesselsForPlan = fleetFilter
    ? mockVessels.filter(v => v.fleet_id === fleetFilter && v.is_active)
    : isOpHead
      ? mockVessels.filter(v => v.fleet_id === userFleetId && v.is_active)
      : mockVessels.filter(v => v.is_active)

  const hasPlanFilter = (isOpHead ? false : !!fleetFilter) || vesselFilter || statusFilter || search

  // ── Actual (compliance) tab data ───────────────────────────────────────────

  const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

  const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYearNum = currentMonth === 1 ? currentYear - 1 : currentYear

  const getComplianceData = () => {
    return mockFleets.filter(f => selectedFleet === 'ALL' || f.id === selectedFleet).map(fleet => {
      const vessels = mockVessels.filter(v => v.fleet_id === fleet.id && v.is_active)
      const opHead = opHeads.find(u => u.id === fleet.op_head_user_id)
      const visitedRecs = mockVesselCompliance.filter(c => {
        if (c.fleet_id !== fleet.id) return false
        if (periodMode === 'month') return c.period_month === filterMonth && c.period_year === filterYear
        if (periodMode === 'year') return c.period_year === filterYear
        return c.visit_date >= fromDate && c.visit_date <= toDate
      })
      const visitedVesselIds = [...new Set(visitedRecs.map(c => c.vessel_id))]
      const allVesselStatus = vessels.map(vessel => {
        const rec = visitedRecs.find(c => c.vessel_id === vessel.id)
        return { vessel, visited: !!rec, visitDate: rec?.visit_date }
      })
      const compliance = vessels.length > 0 ? Math.round((visitedVesselIds.length / vessels.length) * 100) : 0
      return { fleet, opHead, vessels, allVesselStatus, compliance, visited: visitedVesselIds.length }
    })
  }

  const complianceData = getComplianceData()

  // Apply vessel-level and fleet-level display filters
  const displayData = complianceData
    .filter(d => {
      if (complianceFilter === 'HIGH') return d.compliance >= 80
      if (complianceFilter === 'MID') return d.compliance >= 60 && d.compliance < 80
      if (complianceFilter === 'LOW') return d.compliance < 60
      return true
    })
    .map(d => ({
      ...d,
      vesselStatus: d.allVesselStatus.filter(vs => {
        const matchStatus =
          visitStatusFilter === 'ALL' ||
          (visitStatusFilter === 'VISITED' && vs.visited) ||
          (visitStatusFilter === 'NOT_VISITED' && !vs.visited)
        const matchSearch = !vesselSearch || vs.vessel.name.toLowerCase().includes(vesselSearch.toLowerCase())
        return matchStatus && matchSearch
      })
    }))
    .filter(d => (visitStatusFilter !== 'ALL' || vesselSearch) ? d.vesselStatus.length > 0 : true)

  const avgCompliance = complianceData.length > 0
    ? Math.round(complianceData.reduce((sum, d) => sum + d.compliance, 0) / complianceData.length) : 0

  const periodChanged = periodMode !== 'month' || filterMonth !== currentMonth || filterYear !== currentYear
  const hasActualFilter = periodChanged || selectedFleet !== 'ALL' || visitStatusFilter !== 'ALL' || vesselSearch !== '' || complianceFilter !== 'ALL'

  const resetActualFilters = () => {
    setPeriodMode('month')
    setFilterMonth(currentMonth)
    setFilterYear(currentYear)
    setFromDate(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
    setToDate(`${currentYear}-${String(currentMonth).padStart(2, '0')}-30`)
    setSelectedFleet('ALL')
    setVisitStatusFilter('ALL')
    setVesselSearch('')
    setComplianceFilter('ALL')
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div />
        {canManagePlan && (
          <Button onClick={() => navigate('/vessel-compliance/plan/new')} className="gap-2">
            <Plus size={16} /> Buat Rencana Kunjungan
          </Button>
        )}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('plan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'plan'
              ? 'bg-white text-[#1B3A6B] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays size={15} />
          Rencana Kunjungan
        </button>
        <button
          onClick={() => setTab('actual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'actual'
              ? 'bg-white text-[#1B3A6B] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardCheck size={15} />
          Realisasi Kunjungan
        </button>
      </div>

      {/* ═══════════════ PLAN TAB ═══════════════ */}
      {tab === 'plan' && (
        <>
          {/* Info banner */}
          {isOpHead && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
              <Ship size={14} className="shrink-0 mt-0.5 text-blue-500" />
              Anda adalah <strong className="mx-1">Operation Head</strong> untuk armada
              <strong className="ml-1">{mockFleets.find(f => f.id === userFleetId)?.name || '-'}</strong>.
              Rencana kunjungan yang ditampilkan adalah kunjungan untuk armada Anda.
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#1B3A6B' }}>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Rencana</p>
              <p className="text-3xl font-bold text-[#1B3A6B] mt-1">{planCounts.total}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#1A7A4A' }}>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Selesai</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{planCounts.completed}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#D35400' }}>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Terlambat</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{planCounts.overdue}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#7C3AED' }}>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Belum Realisasi</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{planCounts.pending}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari kapal, armada, operation head..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20" />
              </div>
              {/* Fleet filter locked for OP_HEAD */}
              {!isOpHead && (
                <select value={fleetFilter} onChange={e => { setFleetFilter(e.target.value); setVesselFilter('') }}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                  <option value="">Semua Armada</option>
                  {mockFleets.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              )}
              <select value={vesselFilter} onChange={e => setVesselFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua Kapal</option>
                {filteredVesselsForPlan.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua Status</option>
                {INSPECTION_SCHEDULE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {hasPlanFilter && (
                <button onClick={() => { setFleetFilter(isOpHead ? userFleetId : ''); setVesselFilter(''); setStatusFilter(''); setSearch('') }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Plan Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">{filteredPlans.length} rencana ditemukan</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Selesai</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Berjalan</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Segera</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Terlambat</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Direncanakan</span>
              </div>
            </div>

            {filteredPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <CalendarDays size={36} className="text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-500">Tidak Ada Rencana Kunjungan</p>
                <p className="text-xs text-gray-400 mt-1">
                  Belum ada rencana kunjungan yang sesuai filter.
                </p>
                {canManagePlan && (
                  <Button onClick={() => navigate('/vessel-compliance/plan/new')} className="mt-4 gap-2" size="sm">
                    <Plus size={14} /> Buat Rencana
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Kapal</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Armada</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Operation Head</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tgl. Rencana</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Periode</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Catatan</th>
                      <th className="px-4 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPlans.map(s => {
                      const cfg = getScheduleStatusConfig(s.status)
                      const StatusIcon = cfg.icon
                      const opHead = opHeads.find(u => u.id === s.op_head_user_id)
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-gray-800 text-sm">{s.vessel?.name || '-'}</p>
                            <p className="text-xs text-gray-400">{s.vessel?.vessel_type}</p>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{s.fleet?.name || '-'}</td>
                          <td className="px-4 py-3.5">
                            {opHead ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0">
                                  <User size={11} className="text-[#1B3A6B]" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{opHead.full_name}</p>
                                  <p className="text-xs text-gray-400">Operation Head</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">
                            {formatDateShort(s.scheduled_date)}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500">
                            {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][s.period_month - 1]} {s.period_year}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <StatusIcon size={11} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 max-w-44">
                            {s.notes || '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            {s.visit_id ? (
                              <Button variant="ghost" size="sm"
                                onClick={() => navigate(`/visits/${s.visit_id}`, { state: { from: '/vessel-compliance' } })}
                                className="gap-1 text-xs">
                                <Eye size={13} /> Detail Visit
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm"
                                onClick={() => navigate('/visits/new', { state: { preselectedType: 'VESSEL_VISIT', vessel_id: s.vessel_id } })}
                                className="gap-1 text-xs">
                                <Plus size={13} /> Realisasi
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Operation Head per Armada summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Operation Head per Armada</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {mockFleets.map(fleet => {
                const opHead = opHeads.find(u => u.id === fleet.op_head_user_id)
                const fleetSchedules = mockVisitSchedules.filter(s => s.fleet_id === fleet.id)
                const done = fleetSchedules.filter(s => s.status === 'COMPLETED').length
                const total = fleetSchedules.length
                return (
                  <div key={fleet.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{fleet.name}</p>
                    {opHead ? (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {opHead.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{opHead.full_name}</p>
                          <p className="text-xs text-gray-400">{opHead.email}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Operation Head belum ditetapkan</p>
                    )}
                    {total > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${(done / total) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{done}/{total} selesai</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ ACTUAL (COMPLIANCE) TAB ═══════════════ */}
      {tab === 'actual' && (
        <>
          {/* ── Enhanced Filter Panel ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Filter size={15} className="text-gray-400" />
                Filter Realisasi Kunjungan
              </h3>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm">Export Excel</Button>
                {hasActualFilter && (
                  <button onClick={resetActualFilters}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                    <X size={12} /> Reset Semua
                  </button>
                )}
              </div>
            </div>

            {/* ── Period Mode Selector (full width) ── */}
            <div className="mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <span className="text-xs font-medium text-gray-500 shrink-0">Mode Periode:</span>
                {([
                  { value: 'month', label: 'Per Bulan' },
                  { value: 'year',  label: 'Per Tahun' },
                  { value: 'range', label: 'Rentang Tanggal' },
                ] as const).map(m => (
                  <button key={m.value} onClick={() => setPeriodMode(m.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      periodMode === m.value
                        ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* ── Per Bulan ── */}
              {periodMode === 'month' && (
                <div className="flex gap-2 flex-wrap items-end">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Bulan</label>
                    <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                      {monthNames.map((name, i) => (
                        <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, '0')} — {name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Tahun</label>
                    <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setFilterMonth(currentMonth); setFilterYear(currentYear) }}
                      className={`px-3 py-2 text-xs rounded-lg font-medium border transition-colors ${
                        filterMonth === currentMonth && filterYear === currentYear
                          ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}>
                      Bulan Ini
                    </button>
                    <button
                      onClick={() => { setFilterMonth(prevMonthNum); setFilterYear(prevYearNum) }}
                      className={`px-3 py-2 text-xs rounded-lg font-medium border transition-colors ${
                        filterMonth === prevMonthNum && filterYear === prevYearNum
                          ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}>
                      Bulan Lalu
                    </button>
                  </div>
                </div>
              )}

              {/* ── Per Tahun ── */}
              {periodMode === 'year' && (
                <div className="flex gap-2 flex-wrap items-end">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Tahun</label>
                    <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={() => setFilterYear(currentYear)}
                    className={`px-3 py-2 text-xs rounded-lg font-medium border transition-colors ${
                      filterYear === currentYear
                        ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}>
                    Tahun Ini
                  </button>
                </div>
              )}

              {/* ── Rentang Tanggal ── */}
              {periodMode === 'range' && (
                <div className="flex gap-2 flex-wrap items-end">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Dari Tanggal</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20" />
                  </div>
                  <span className="text-gray-400 text-sm pb-2">→</span>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Sampai Tanggal</label>
                    <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20" />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => {
                      setFromDate(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
                      setToDate(`${currentYear}-${String(currentMonth).padStart(2, '0')}-30`)
                    }}
                      className="px-3 py-2 text-xs rounded-lg font-medium border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors">
                      Bln Ini
                    </button>
                    <button onClick={() => {
                      setFromDate(`${currentYear}-01-01`)
                      setToDate(`${currentYear}-12-31`)
                    }}
                      className="px-3 py-2 text-xs rounded-lg font-medium border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors">
                      Thn Ini
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Other Filters (3 cols) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Armada */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Armada</label>
                <select value={selectedFleet} onChange={e => setSelectedFleet(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                  <option value="ALL">Semua Armada</option>
                  {mockFleets.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <div className="mt-1.5 flex flex-col gap-1">
                  {complianceData.map(d => (
                    <div key={d.fleet.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 truncate max-w-[130px]">{d.fleet.name}</span>
                      <span className={`text-xs font-semibold ${d.compliance >= 80 ? 'text-green-600' : d.compliance >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {d.compliance}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Kunjungan */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Status Kunjungan</label>
                <div className="flex gap-1.5">
                  {(['ALL', 'VISITED', 'NOT_VISITED'] as const).map(opt => (
                    <button key={opt} onClick={() => setVisitStatusFilter(opt)}
                      className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors border ${
                        visitStatusFilter === opt
                          ? opt === 'VISITED'
                            ? 'bg-green-600 text-white border-green-600'
                            : opt === 'NOT_VISITED'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}>
                      {opt === 'ALL' ? 'Semua' : opt === 'VISITED' ? '✓ Sudah' : '✗ Belum'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5 leading-tight">
                  {visitStatusFilter === 'NOT_VISITED'
                    ? `${complianceData.reduce((s, d) => s + (d.vessels.length - d.visited), 0)} kapal belum dikunjungi`
                    : visitStatusFilter === 'VISITED'
                      ? `${complianceData.reduce((s, d) => s + d.visited, 0)} kapal sudah dikunjungi`
                      : `${mockVessels.filter(v => v.is_active).length} kapal aktif`
                  }
                </p>
              </div>

              {/* Cari Kapal */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cari Kapal</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={vesselSearch} onChange={e => setVesselSearch(e.target.value)}
                    placeholder="Nama kapal..."
                    className="w-full pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20" />
                  {vesselSearch && (
                    <button onClick={() => setVesselSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Compliance threshold filter */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-500 shrink-0">Filter Compliance:</span>
                {([
                  { value: 'ALL',  label: 'Semua',                  active: 'bg-[#1B3A6B] text-white border-[#1B3A6B]',         inactive: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100' },
                  { value: 'HIGH', label: '≥ 80% — Baik',           active: 'bg-green-600 text-white border-green-600',           inactive: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
                  { value: 'MID',  label: '60–79% — Perlu Perhatian', active: 'bg-amber-500 text-white border-amber-500',          inactive: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
                  { value: 'LOW',  label: '< 60% — Kritis',         active: 'bg-red-600 text-white border-red-600',               inactive: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => setComplianceFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      complianceFilter === opt.value ? opt.active : opt.inactive
                    }`}>
                    {opt.label}
                  </button>
                ))}
                <span className="text-xs text-gray-400 ml-auto shrink-0">
                  {displayData.length} armada ditampilkan
                </span>
              </div>
            </div>

            {/* Active filter chips */}
            {hasActualFilter && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 shrink-0">Filter aktif:</span>
                {periodChanged && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                    {periodMode === 'month'
                      ? `${monthNames[filterMonth - 1]} ${filterYear}`
                      : periodMode === 'year'
                        ? `Tahun ${filterYear}`
                        : `${formatDateShort(fromDate)} – ${formatDateShort(toDate)}`
                    }
                    <button onClick={() => { setPeriodMode('month'); setFilterMonth(currentMonth); setFilterYear(currentYear) }}>
                      <X size={10} />
                    </button>
                  </span>
                )}
                {selectedFleet !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#1B3A6B]/10 text-[#1B3A6B] text-xs rounded-full font-medium">
                    {mockFleets.find(f => f.id === selectedFleet)?.name}
                    <button onClick={() => setSelectedFleet('ALL')}><X size={10} /></button>
                  </span>
                )}
                {visitStatusFilter === 'VISITED' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    Sudah Dikunjungi
                    <button onClick={() => setVisitStatusFilter('ALL')}><X size={10} /></button>
                  </span>
                )}
                {visitStatusFilter === 'NOT_VISITED' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                    Belum Dikunjungi
                    <button onClick={() => setVisitStatusFilter('ALL')}><X size={10} /></button>
                  </span>
                )}
                {complianceFilter !== 'ALL' && (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium ${
                    complianceFilter === 'HIGH' ? 'bg-green-100 text-green-700'
                    : complianceFilter === 'MID' ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    Compliance: {complianceFilter === 'HIGH' ? '≥80%' : complianceFilter === 'MID' ? '60-79%' : '<60%'}
                    <button onClick={() => setComplianceFilter('ALL')}><X size={10} /></button>
                  </span>
                )}
                {vesselSearch && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    Kapal: &ldquo;{vesselSearch}&rdquo;
                    <button onClick={() => setVesselSearch('')}><X size={10} /></button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500">Compliance Rata-rata</p>
              <p className={`text-3xl font-bold mt-2 ${avgCompliance >= 80 ? 'text-green-600' : avgCompliance >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {avgCompliance}%
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500">Total Kapal</p>
              <p className="text-3xl font-bold mt-2 text-[#1B3A6B]">{mockVessels.filter(v => v.is_active).length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500">Sudah Dikunjungi</p>
              <p className="text-3xl font-bold mt-2 text-green-600">
                {complianceData.reduce((sum, d) => sum + d.visited, 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500">Belum Dikunjungi</p>
              <p className="text-3xl font-bold mt-2 text-red-600">
                {complianceData.reduce((sum, d) => sum + (d.vessels.length - d.visited), 0)}
              </p>
            </div>
          </div>

          {/* Compliance per Fleet / Op Head */}
          <div className="flex flex-col gap-4">
            {displayData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 text-center">
                <Ship size={36} className="text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-500">Tidak Ada Data</p>
                <p className="text-xs text-gray-400 mt-1">Tidak ada armada yang sesuai filter yang dipilih.</p>
                <button onClick={resetActualFilters}
                  className="mt-4 text-xs text-[#1B3A6B] hover:underline font-medium">
                  Reset Filter
                </button>
              </div>
            ) : (
              displayData.map(({ fleet, opHead, vesselStatus, allVesselStatus, compliance, visited }) => (
                <Card key={fleet.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Ship size={18} className="text-[#2A5298]" />
                          {fleet.name}
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">
                          Operation Head: <strong>{opHead?.full_name || 'Belum ditugaskan'}</strong> · Frekuensi: {fleet.visit_frequency}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${compliance}%`,
                              backgroundColor: compliance >= 80 ? '#1A7A4A' : compliance >= 60 ? '#C8922A' : '#C0392B'
                            }} />
                          </div>
                          <span className={`text-lg font-bold ${compliance >= 80 ? 'text-green-600' : compliance >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {compliance}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{visited}/{allVesselStatus.length} kapal dikunjungi</p>
                        {compliance < 80 && (
                          <div className="flex items-center gap-1 text-orange-600 text-xs mt-1 justify-end">
                            <AlertTriangle size={11} /> Perlu perhatian
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {vesselStatus.length === 0 ? (
                      <p className="text-sm text-center text-gray-400 py-6">
                        Tidak ada kapal yang sesuai filter
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-600">Kapal</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Jenis</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">IMO Number</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Status Kunjungan</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Tanggal Dikunjungi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vesselStatus.map(({ vessel, visited: isVisited, visitDate }) => (
                              <tr key={vessel.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-5 py-3 font-medium text-gray-800">{vessel.name}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{vessel.vessel_type || '—'}</td>
                                <td className="px-4 py-3 text-xs font-mono text-gray-500">{vessel.imo_number || '—'}</td>
                                <td className="px-4 py-3">
                                  {isVisited ? (
                                    <span className="flex items-center gap-1.5 text-green-700 text-xs font-semibold">
                                      <CheckCircle size={14} /> Sudah Dikunjungi
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 text-red-600 text-xs font-semibold">
                                      <XCircle size={14} /> Belum Dikunjungi
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-600">{visitDate ? formatDateShort(visitDate) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
