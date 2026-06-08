import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, Search, Eye, Plus,
  CheckCircle2, Clock, AlertTriangle, CalendarCheck, User,
  ClipboardCheck, ShieldCheck, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  mockInspectionSchedules, mockFleets, mockHseOfficers,
  mockInternalInspections
} from '@/data/mockData'
import { useShips, getFleetOptions } from '@/hooks/useShips'
import { INSPECTION_SCHEDULE_STATUS_OPTIONS } from '@/data/masterOptions'
import { formatDateShort, getInspectionResultLabel, getInspectionResultColor, getStatusLabel, getStatusColor } from '@/utils'
import { useAuthStore } from '@/stores/authStore'
import type { InspectionScheduleStatus } from '@/types'

// ── Status config ─────────────────────────────────────────────────────────────

function getScheduleStatusConfig(status: InspectionScheduleStatus) {
  switch (status) {
    case 'COMPLETED':   return { label: 'Selesai',       bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  icon: CheckCircle2,  dot: 'bg-green-500' }
    case 'IN_PROGRESS': return { label: 'Sedang Berjalan', bg: 'bg-blue-100', text: 'text-blue-700',   border: 'border-blue-200',   icon: Loader2,       dot: 'bg-blue-500' }
    case 'DUE_SOON':    return { label: 'Segera Jatuh Tempo', bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  icon: Clock,         dot: 'bg-amber-500' }
    case 'OVERDUE':     return { label: 'Terlambat',     bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    icon: AlertTriangle, dot: 'bg-red-500' }
    case 'PLANNED':     return { label: 'Direncanakan',  bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: CalendarCheck, dot: 'bg-purple-500' }
    case 'CANCELLED':   return { label: 'Dibatalkan',    bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-200',   icon: CalendarDays,  dot: 'bg-gray-400' }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InternalInspectionSchedulePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { ships } = useShips()
  const canManagePlan = user?.role === 'HEAD_HSSE' || user?.role === 'SUPER_ADMIN'
  const isHeadHsse = canManagePlan

  const [tab, setTab] = useState<'plan' | 'actual'>('plan')

  // Plan filters
  const [fleetFilter, setFleetFilter] = useState('')
  const [vesselFilter, setVesselFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [hseFilter, setHseFilter] = useState('')
  const [search, setSearch] = useState('')

  // Actual filters
  const [actualSearch, setActualSearch] = useState('')
  const [actualVesselFilter, setActualVesselFilter] = useState('')
  const [actualFleetFilter, setActualFleetFilter] = useState('')

  // ── Plan tab data ──────────────────────────────────────────────────────────

  const filteredPlans = mockInspectionSchedules.filter(s => {
    const matchFleet = !fleetFilter || s.fleet_id === fleetFilter
    const matchVessel = !vesselFilter || s.vessel_id === vesselFilter
    const matchStatus = !statusFilter || s.status === statusFilter
    const matchHse = !hseFilter || s.hse_officer_id === hseFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (s.vessel?.name || '').toLowerCase().includes(q) ||
      (s.fleet?.name || '').toLowerCase().includes(q) ||
      (s.hse_officer?.full_name || '').toLowerCase().includes(q)
    return matchFleet && matchVessel && matchStatus && matchHse && matchSearch
  })

  const periodAll = mockInspectionSchedules
  const planCounts = {
    total: periodAll.length,
    completed: periodAll.filter(s => s.status === 'COMPLETED').length,
    overdue: periodAll.filter(s => s.status === 'OVERDUE').length,
    in_progress: periodAll.filter(s => s.status === 'IN_PROGRESS').length,
    planned: periodAll.filter(s => s.status === 'PLANNED' || s.status === 'DUE_SOON').length,
  }

  const apiFleetOpts = getFleetOptions(ships)
  const filteredVesselsForPlan = fleetFilter
    ? ships.filter(s => String(s.fleet.id) === fleetFilter)
    : ships

  const hasPlanFilter = fleetFilter || vesselFilter || statusFilter || hseFilter || search

  // ── Actual tab data ────────────────────────────────────────────────────────

  const filteredActual = mockInternalInspections.filter(i => {
    const q = actualSearch.toLowerCase()
    const matchSearch = !q ||
      i.reference_no.toLowerCase().includes(q) ||
      (i.vessel?.name || '').toLowerCase().includes(q) ||
      i.lead_inspector.toLowerCase().includes(q)
    const matchVessel = !actualVesselFilter || i.vessel_id === actualVesselFilter
    const matchFleet = !actualFleetFilter || i.vessel?.fleet_id === actualFleetFilter
    return matchSearch && matchVessel && matchFleet
  })

  const filteredVesselsForActual = actualFleetFilter
    ? ships.filter(s => String(s.fleet.id) === actualFleetFilter)
    : ships

  const hasActualFilter = actualSearch || actualVesselFilter || actualFleetFilter

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div />
        {isHeadHsse && (
          <Button onClick={() => navigate('/inspections/plan/new')} className="gap-2">
            <Plus size={16} /> Buat Rencana Jadwal
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
          Rencana Inspeksi
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
          Realisasi Inspeksi
        </button>
      </div>

      {/* ═══════════════ PLAN TAB ═══════════════ */}
      {tab === 'plan' && (
        <>
          {/* HEAD_HSSE info banner */}
          {!isHeadHsse && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
              <ShieldCheck size={14} className="shrink-0 mt-0.5 text-blue-500" />
              Rencana jadwal inspeksi dibuat oleh <strong className="ml-1">Head HSSE Corporate</strong>. Hanya Head HSSE yang dapat menambah atau mengubah jadwal.
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
              <p className="text-3xl font-bold text-purple-600 mt-1">{planCounts.planned + planCounts.in_progress}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari kapal, armada, HSE..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20" />
              </div>
              <select value={fleetFilter} onChange={e => { setFleetFilter(e.target.value); setVesselFilter('') }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua Armada</option>
                {apiFleetOpts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={vesselFilter} onChange={e => setVesselFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua Kapal</option>
                {filteredVesselsForPlan.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
              <select value={hseFilter} onChange={e => setHseFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua HSE PIC</option>
                {mockHseOfficers.map(h => <option key={h.id} value={h.id}>{h.full_name}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua Status</option>
                {INSPECTION_SCHEDULE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {hasPlanFilter && (
                <button onClick={() => { setFleetFilter(''); setVesselFilter(''); setStatusFilter(''); setHseFilter(''); setSearch('') }}
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
                <p className="text-sm font-semibold text-gray-500">Tidak Ada Rencana Jadwal</p>
                <p className="text-xs text-gray-400 mt-1">
                  Belum ada rencana inspeksi yang sesuai filter.
                </p>
                {isHeadHsse && (
                  <Button onClick={() => navigate('/inspections/plan/new')} className="mt-4 gap-2" size="sm">
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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">HSE PIC</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tgl. Rencana</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Keterangan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Dibuat Oleh</th>
                      <th className="px-4 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPlans.map(s => {
                      const cfg = getScheduleStatusConfig(s.status)
                      const StatusIcon = cfg.icon
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-gray-800 text-sm">{s.vessel?.name || '-'}</p>
                            <p className="text-xs text-gray-400">{s.vessel?.vessel_type}</p>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{s.fleet?.name || '-'}</td>
                          <td className="px-4 py-3.5">
                            {s.hse_officer ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0">
                                  <User size={11} className="text-[#1B3A6B]" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{s.hse_officer.full_name}</p>
                                  <p className="text-xs text-gray-400">HSE Officer</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">
                            {formatDateShort(s.scheduled_date)}
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
                            {s.created_by_user ? (
                              <div>
                                <p className="text-xs font-medium text-gray-700">{s.created_by_user.full_name}</p>
                                <p className="text-xs text-gray-400">Head HSSE</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              {s.inspection_id ? (
                                <Button variant="ghost" size="sm"
                                  onClick={() => navigate(`/inspections/internal/${s.inspection_id}`)}
                                  className="gap-1 text-xs">
                                  <Eye size={13} /> Detail
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm"
                                  onClick={() => navigate('/inspections/internal/new')}
                                  className="gap-1 text-xs">
                                  <Plus size={13} /> Realisasi
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* HSE PIC per Fleet summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">HSE PIC per Armada</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {mockFleets.map(fleet => {
                const hse = mockHseOfficers.find(h => h.id === fleet.hse_officer_id)
                const fleetSchedules = periodAll.filter(s => s.fleet_id === fleet.id)
                const done = fleetSchedules.filter(s => s.status === 'COMPLETED').length
                const total = fleetSchedules.length
                return (
                  <div key={fleet.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{fleet.name}</p>
                    {hse ? (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {hse.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{hse.full_name}</p>
                          <p className="text-xs text-gray-400">{hse.email}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">HSE belum ditetapkan</p>
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

      {/* ═══════════════ ACTUAL TAB ═══════════════ */}
      {tab === 'actual' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const total = mockInternalInspections.length
              const approved = mockInternalInspections.filter(i => i.status === 'APPROVED').length
              const satisfactory = mockInternalInspections.filter(i => i.result === 'SATISFACTORY').length
              const totalFindings = mockInternalInspections.reduce((s, i) => s + i.items_deficient, 0)
              return (
                <>
                  <div className="bg-white rounded-xl p-4 border border-l-4 border-gray-100 shadow-sm" style={{ borderLeftColor: '#1B3A6B' }}>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Realisasi</p>
                    <p className="text-3xl font-bold text-[#1B3A6B] mt-1">{total}</p>
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
                </>
              )
            })()}
          </div>

          {/* Actual Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={actualSearch} onChange={e => setActualSearch(e.target.value)}
                  placeholder="Cari no. referensi, kapal, inspektor..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20" />
              </div>
              <select value={actualFleetFilter} onChange={e => { setActualFleetFilter(e.target.value); setActualVesselFilter('') }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua Armada</option>
                {apiFleetOpts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={actualVesselFilter} onChange={e => setActualVesselFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua Kapal</option>
                {filteredVesselsForActual.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
              {hasActualFilter && (
                <button onClick={() => { setActualSearch(''); setActualVesselFilter(''); setActualFleetFilter('') }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Reset Filter
                </button>
              )}
              <div className="ml-auto">
                <Button onClick={() => navigate('/inspections/internal/new')} size="sm" className="gap-1.5">
                  <Plus size={14} /> Buat Inspeksi
                </Button>
              </div>
            </div>
          </div>

          {/* Actual Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">{filteredActual.length} realisasi inspeksi ditemukan</p>
            </div>

            {filteredActual.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <ClipboardCheck size={36} className="text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-500">Tidak Ada Realisasi Inspeksi</p>
                <p className="text-xs text-gray-400 mt-1">Belum ada inspeksi internal yang tercatat.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-44">No. Referensi</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kapal</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Lead Inspektor</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Hasil</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Temuan</th>
                      <th className="px-4 py-3 w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredActual.map(insp => (
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
                          ) : <span className="text-xs text-gray-400">—</span>}
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
                          <Button variant="ghost" size="sm"
                            onClick={() => navigate(`/inspections/internal/${insp.id}`)}>
                            <Eye size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
