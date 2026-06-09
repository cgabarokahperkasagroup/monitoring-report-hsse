import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ship, CheckCircle, XCircle, AlertTriangle, Plus, Search, Filter, X,
  CalendarDays, ClipboardCheck, CheckCircle2, Clock, Loader2, CalendarCheck, Eye, User,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { INSPECTION_SCHEDULE_STATUS_OPTIONS } from '@/data/masterOptions'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useVisitSchedulesData } from '@/hooks/useVisitSchedulesData'
import { useShips, getFleetOptions, shipOptions } from '@/hooks/useShips'
import { formatDateShort } from '@/utils'
import type { VisitScheduleStatus } from '@/types'

const currentMonth: number = 6
const currentYear:  number = 2026

// ── Status config ─────────────────────────────────────────────────────────────

function getScheduleStatusConfig(status: VisitScheduleStatus) {
  switch (status) {
    case 'COMPLETED':   return { label: 'Selesai',             bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  icon: CheckCircle2,  dot: 'bg-green-500' }
    case 'IN_PROGRESS': return { label: 'Sedang Berjalan',    bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   icon: Loader2,       dot: 'bg-blue-500' }
    case 'DUE_SOON':    return { label: 'Segera Jatuh Tempo', bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  icon: Clock,         dot: 'bg-amber-500' }
    case 'OVERDUE':     return { label: 'Terlambat',           bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    icon: AlertTriangle, dot: 'bg-red-500' }
    case 'PLANNED':     return { label: 'Direncanakan',        bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: CalendarCheck, dot: 'bg-purple-500' }
    case 'CANCELLED':   return { label: 'Dibatalkan',          bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-200',   icon: CalendarDays,  dot: 'bg-gray-400' }
  }
}

// ── Tipe data visit untuk compliance ─────────────────────────────────────────

type VisitRecord = {
  id: string
  vessel_external_id: number | null
  vessel_name: string | null
  visit_date: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VesselCompliancePage() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()

  const isOpHead     = user?.role === 'OP_HEAD'
  const canManagePlan = user?.role === 'HEAD_HSSE' || user?.role === 'SUPER_ADMIN'

  // SMS API ships
  const { ships } = useShips()

  // Unique fleets dari SMS API
  const smsFleets = useMemo(() => {
    const map = new Map<number, { id: number; name: string; opHeadName: string | null }>()
    ships.forEach(s => {
      if (!map.has(s.fleet.id)) {
        map.set(s.fleet.id, {
          id: s.fleet.id,
          name: s.fleet.name,
          opHeadName: s.operation_head?.name ?? null,
        })
      }
    })
    return [...map.values()].sort((a, b) => a.id - b.id)
  }, [ships])

  // Schedules dari Supabase
  const { schedules } = useVisitSchedulesData()

  // Visits aktual (untuk compliance)
  const [vesselVisits, setVesselVisits] = useState<VisitRecord[]>([])

  // ── Plan tab state ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'plan' | 'actual'>('plan')

  const [fleetFilter,  setFleetFilter]  = useState('')   // SMS fleet id as string
  const [vesselFilter, setVesselFilter] = useState('')   // SMS vessel id as string
  const [statusFilter, setStatusFilter] = useState('')
  const [search,       setSearch]       = useState('')

  // ── Actual tab state ────────────────────────────────────────────────────────
  const [selectedFleet,     setSelectedFleet]     = useState('ALL')  // 'ALL' | string(smsFleet.id)
  const [periodMode,        setPeriodMode]        = useState<'month' | 'year' | 'range'>('month')
  const [filterMonth,       setFilterMonth]       = useState(currentMonth)
  const [filterYear,        setFilterYear]        = useState(currentYear)
  const [fromDate,          setFromDate]          = useState(`${currentYear}-${String(currentMonth).padStart(2,'0')}-01`)
  const [toDate,            setToDate]            = useState(`${currentYear}-${String(currentMonth).padStart(2,'0')}-30`)
  const [visitStatusFilter, setVisitStatusFilter] = useState<'ALL'|'VISITED'|'NOT_VISITED'>('ALL')
  const [vesselSearch,      setVesselSearch]      = useState('')
  const [complianceFilter,  setComplianceFilter]  = useState<'ALL'|'HIGH'|'MID'|'LOW'>('ALL')

  // ── Fetch visits untuk compliance ───────────────────────────────────────────

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from('visits') as any)
      .select('id, vessel_external_id, vessel_name, visit_date')
      .eq('visit_type', 'VESSEL_VISIT')
      .in('status', ['SUBMITTED', 'APPROVED'])

    if (periodMode === 'month') {
      const pad = (n: number) => String(n).padStart(2, '0')
      q = q.gte('visit_date', `${filterYear}-${pad(filterMonth)}-01`)
           .lte('visit_date', `${filterYear}-${pad(filterMonth)}-31`)
    } else if (periodMode === 'year') {
      q = q.gte('visit_date', `${filterYear}-01-01`).lte('visit_date', `${filterYear}-12-31`)
    } else {
      q = q.gte('visit_date', fromDate).lte('visit_date', toDate)
    }

    q.then(({ data }: { data: VisitRecord[] | null }) => {
      setVesselVisits((data ?? []).filter((v: VisitRecord) => v.vessel_external_id != null))
    })
  }, [periodMode, filterMonth, filterYear, fromDate, toDate])

  // ── Plan tab computed ───────────────────────────────────────────────────────

  const fleetOpts   = getFleetOptions(ships)
  const vesselOpts  = useMemo(
    () => fleetFilter ? shipOptions(ships, fleetFilter) : shipOptions(ships),
    [ships, fleetFilter]
  )

  const filteredPlans = useMemo(() => schedules.filter(s => {
    const raw = s as unknown as Record<string, unknown>
    const sFleetExtId = raw.fleet_external_id as number | null
    const sVesselExtId = raw.vessel_external_id as number | null

    const matchFleet  = !fleetFilter  || String(sFleetExtId)  === fleetFilter
    const matchVessel = !vesselFilter || String(sVesselExtId) === vesselFilter
    const matchStatus = !statusFilter || s.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q
      || (s.vessel?.name || '').toLowerCase().includes(q)
      || ((raw.fleet_name as string) || '').toLowerCase().includes(q)

    return matchFleet && matchVessel && matchStatus && matchSearch
  }), [schedules, fleetFilter, vesselFilter, statusFilter, search])

  const planCounts = useMemo(() => ({
    total:     schedules.length,
    completed: schedules.filter(s => s.status === 'COMPLETED').length,
    overdue:   schedules.filter(s => s.status === 'OVERDUE').length,
    pending:   schedules.filter(s => s.status === 'PLANNED' || s.status === 'DUE_SOON' || s.status === 'IN_PROGRESS').length,
  }), [schedules])

  const hasPlanFilter = !!(fleetFilter || vesselFilter || statusFilter || search)

  // ── Actual tab computed ─────────────────────────────────────────────────────

  const monthNames   = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
  const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYearNum  = currentMonth === 1 ? currentYear - 1 : currentYear

  const complianceData = useMemo(() => {
    return smsFleets
      .filter(f => selectedFleet === 'ALL' || String(f.id) === selectedFleet)
      .map(fleet => {
        const fleetShips = ships.filter(s => s.fleet.id === fleet.id)
        const visitedIds = new Set(
          vesselVisits
            .filter(v => fleetShips.some(s => s.id === v.vessel_external_id))
            .map(v => v.vessel_external_id)
        )
        const allVesselStatus = fleetShips.map(ship => {
          const rec = vesselVisits.find(v => v.vessel_external_id === ship.id)
          return { ship, visited: !!rec, visitDate: rec?.visit_date }
        })
        const compliancePct = fleetShips.length > 0
          ? Math.round((visitedIds.size / fleetShips.length) * 100)
          : 0
        return {
          fleet,
          opHeadName: fleet.opHeadName,
          ships: fleetShips,
          allVesselStatus,
          compliance: compliancePct,
          visited: visitedIds.size,
        }
      })
  }, [smsFleets, ships, vesselVisits, selectedFleet])

  const displayData = useMemo(() => complianceData
    .filter(d => {
      if (complianceFilter === 'HIGH') return d.compliance >= 80
      if (complianceFilter === 'MID')  return d.compliance >= 60 && d.compliance < 80
      if (complianceFilter === 'LOW')  return d.compliance < 60
      return true
    })
    .map(d => ({
      ...d,
      vesselStatus: d.allVesselStatus.filter(vs => {
        const matchStatus  = visitStatusFilter === 'ALL'
          || (visitStatusFilter === 'VISITED'     && vs.visited)
          || (visitStatusFilter === 'NOT_VISITED' && !vs.visited)
        const matchSearch  = !vesselSearch || vs.ship.name.toLowerCase().includes(vesselSearch.toLowerCase())
        return matchStatus && matchSearch
      }),
    }))
    .filter(d => (visitStatusFilter !== 'ALL' || vesselSearch) ? d.vesselStatus.length > 0 : true),
  [complianceData, complianceFilter, visitStatusFilter, vesselSearch])

  const avgCompliance = complianceData.length > 0
    ? Math.round(complianceData.reduce((s, d) => s + d.compliance, 0) / complianceData.length)
    : 0

  const totalShips   = ships.length
  const totalVisited = complianceData.reduce((s, d) => s + d.visited, 0)

  const periodChanged  = periodMode !== 'month' || filterMonth !== currentMonth || filterYear !== currentYear
  const hasActualFilter = periodChanged || selectedFleet !== 'ALL' || visitStatusFilter !== 'ALL' || vesselSearch !== '' || complianceFilter !== 'ALL'

  const resetActualFilters = () => {
    setPeriodMode('month')
    setFilterMonth(currentMonth)
    setFilterYear(currentYear)
    setFromDate(`${currentYear}-${String(currentMonth).padStart(2,'0')}-01`)
    setToDate(`${currentYear}-${String(currentMonth).padStart(2,'0')}-30`)
    setSelectedFleet('ALL')
    setVisitStatusFilter('ALL')
    setVesselSearch('')
    setComplianceFilter('ALL')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        {canManagePlan && (
          <Button onClick={() => navigate('/vessel-compliance/plan/new')} className="gap-2">
            <Plus size={16} /> Buat Rencana Kunjungan
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['plan','actual'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-white text-[#1B3A6B] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'plan' ? <><CalendarDays size={15} /> Rencana Kunjungan</> : <><ClipboardCheck size={15} /> Realisasi Kunjungan</>}
          </button>
        ))}
      </div>

      {/* ═══════════════ PLAN TAB ═══════════════ */}
      {tab === 'plan' && (
        <>
          {/* Summary cards */}
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
                  placeholder="Cari kapal, armada..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20" />
              </div>
              <select value={fleetFilter} onChange={e => { setFleetFilter(e.target.value); setVesselFilter('') }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua Armada</option>
                {fleetOpts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={vesselFilter} onChange={e => setVesselFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua Kapal</option>
                {vesselOpts.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                <option value="">Semua Status</option>
                {INSPECTION_SCHEDULE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {hasPlanFilter && (
                <button onClick={() => { setFleetFilter(''); setVesselFilter(''); setStatusFilter(''); setSearch('') }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Plan table */}
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
                <p className="text-xs text-gray-400 mt-1">Belum ada rencana kunjungan yang sesuai filter.</p>
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
                      <th className="px-4 py-3 w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPlans.map(s => {
                      const cfg   = getScheduleStatusConfig(s.status)
                      const Icon  = cfg.icon
                      const raw   = s as unknown as Record<string, unknown>
                      const opHeadName = raw.op_head_name as string | null | undefined

                      return (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-gray-800 text-sm">{s.vessel?.name || (raw.vessel_name as string) || '—'}</p>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">
                            {s.fleet?.name || (raw.fleet_name as string) || '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            {opHeadName ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center shrink-0">
                                  <User size={11} className="text-[#1B3A6B]" />
                                </div>
                                <p className="text-sm font-medium text-gray-800">{opHeadName}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{formatDateShort(s.scheduled_date)}</td>
                          <td className="px-4 py-3.5 text-xs text-gray-500">
                            {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][s.period_month - 1]} {s.period_year}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <Icon size={11} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 max-w-44">
                            {s.notes || '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            {s.visit_id ? (
                              <Button variant="ghost" size="sm"
                                onClick={() => navigate(`/vessel-compliance/visit/${s.visit_id}`)}
                                className="gap-1 text-xs">
                                <Eye size={13} /> Detail Visit
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm"
                                onClick={() => navigate('/vessel-compliance/plan/realisasi', {
                                  state: {
                                    schedule: {
                                      id:                   s.id,
                                      vessel_name:          s.vessel?.name || (raw.vessel_name as string) || '',
                                      vessel_external_id:   raw.vessel_external_id as number | null,
                                      fleet_name:           s.fleet?.name  || (raw.fleet_name  as string) || '',
                                      fleet_external_id:    raw.fleet_external_id  as number | null,
                                      scheduled_date:       s.scheduled_date,
                                      period_month:         s.period_month,
                                      period_year:          s.period_year,
                                      notes:                s.notes ?? null,
                                      op_head_name:         opHeadName ?? null,
                                    },
                                  },
                                })}
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

          {/* Operation Head per Armada — dari SMS API */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Operation Head per Armada</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {smsFleets.length === 0 ? (
                <p className="text-xs text-gray-400 italic col-span-3">Memuat data armada...</p>
              ) : (
                smsFleets.map(fleet => {
                  const fleetSchedules = schedules.filter(s => {
                    const raw = s as unknown as Record<string, unknown>
                    return (raw.fleet_external_id as number | null) === fleet.id
                  })
                  const done  = fleetSchedules.filter(s => s.status === 'COMPLETED').length
                  const total = fleetSchedules.length
                  return (
                    <div key={fleet.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{fleet.name}</p>
                      {fleet.opHeadName ? (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {fleet.opHeadName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{fleet.opHeadName}</p>
                            <p className="text-xs text-gray-400">Operation Head</p>
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
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ ACTUAL TAB ═══════════════ */}
      {tab === 'actual' && (
        <>
          {/* Filter panel */}
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

            {/* Period mode selector */}
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

              {periodMode === 'month' && (
                <div className="flex gap-2 flex-wrap items-end">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Bulan</label>
                    <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                      {monthNames.map((name, i) => (
                        <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2,'0')} — {name}</option>
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
                    <button onClick={() => { setFilterMonth(currentMonth); setFilterYear(currentYear) }}
                      className={`px-3 py-2 text-xs rounded-lg font-medium border transition-colors ${
                        filterMonth === currentMonth && filterYear === currentYear
                          ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}>Bulan Ini</button>
                    <button onClick={() => { setFilterMonth(prevMonthNum); setFilterYear(prevYearNum) }}
                      className={`px-3 py-2 text-xs rounded-lg font-medium border transition-colors ${
                        filterMonth === prevMonthNum && filterYear === prevYearNum
                          ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}>Bulan Lalu</button>
                  </div>
                </div>
              )}

              {periodMode === 'year' && (
                <div className="flex gap-2 flex-wrap items-end">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Tahun</label>
                    <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <button onClick={() => setFilterYear(currentYear)}
                    className={`px-3 py-2 text-xs rounded-lg font-medium border transition-colors ${
                      filterYear === currentYear
                        ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}>Tahun Ini</button>
                </div>
              )}

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
                      setFromDate(`${currentYear}-${String(currentMonth).padStart(2,'0')}-01`)
                      setToDate(`${currentYear}-${String(currentMonth).padStart(2,'0')}-30`)
                    }} className="px-3 py-2 text-xs rounded-lg font-medium border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors">
                      Bln Ini
                    </button>
                    <button onClick={() => {
                      setFromDate(`${currentYear}-01-01`)
                      setToDate(`${currentYear}-12-31`)
                    }} className="px-3 py-2 text-xs rounded-lg font-medium border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors">
                      Thn Ini
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Other filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Armada */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Armada</label>
                <select value={selectedFleet} onChange={e => setSelectedFleet(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none cursor-pointer">
                  <option value="ALL">Semua Armada</option>
                  {smsFleets.map(f => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
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

              {/* Status kunjungan */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Status Kunjungan</label>
                <div className="flex gap-1.5">
                  {(['ALL','VISITED','NOT_VISITED'] as const).map(opt => (
                    <button key={opt} onClick={() => setVisitStatusFilter(opt)}
                      className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors border ${
                        visitStatusFilter === opt
                          ? opt === 'VISITED' ? 'bg-green-600 text-white border-green-600'
                          : opt === 'NOT_VISITED' ? 'bg-red-600 text-white border-red-600'
                          : 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}>
                      {opt === 'ALL' ? 'Semua' : opt === 'VISITED' ? '✓ Sudah' : '✗ Belum'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5 leading-tight">
                  {visitStatusFilter === 'NOT_VISITED'
                    ? `${totalShips - totalVisited} kapal belum dikunjungi`
                    : visitStatusFilter === 'VISITED'
                      ? `${totalVisited} kapal sudah dikunjungi`
                      : `${totalShips} kapal aktif`
                  }
                </p>
              </div>

              {/* Cari kapal */}
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
                  { value: 'ALL',  label: 'Semua',                   active: 'bg-[#1B3A6B] text-white border-[#1B3A6B]',   inactive: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100' },
                  { value: 'HIGH', label: '≥ 80% — Baik',            active: 'bg-green-600 text-white border-green-600',    inactive: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
                  { value: 'MID',  label: '60–79% — Perlu Perhatian',active: 'bg-amber-500 text-white border-amber-500',    inactive: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
                  { value: 'LOW',  label: '< 60% — Kritis',          active: 'bg-red-600 text-white border-red-600',        inactive: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
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
                      : periodMode === 'year' ? `Tahun ${filterYear}`
                      : `${formatDateShort(fromDate)} – ${formatDateShort(toDate)}`}
                    <button onClick={() => { setPeriodMode('month'); setFilterMonth(currentMonth); setFilterYear(currentYear) }}>
                      <X size={10} />
                    </button>
                  </span>
                )}
                {selectedFleet !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#1B3A6B]/10 text-[#1B3A6B] text-xs rounded-full font-medium">
                    {smsFleets.find(f => String(f.id) === selectedFleet)?.name}
                    <button onClick={() => setSelectedFleet('ALL')}><X size={10} /></button>
                  </span>
                )}
                {visitStatusFilter === 'VISITED' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    Sudah Dikunjungi <button onClick={() => setVisitStatusFilter('ALL')}><X size={10} /></button>
                  </span>
                )}
                {visitStatusFilter === 'NOT_VISITED' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                    Belum Dikunjungi <button onClick={() => setVisitStatusFilter('ALL')}><X size={10} /></button>
                  </span>
                )}
                {complianceFilter !== 'ALL' && (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium ${
                    complianceFilter === 'HIGH' ? 'bg-green-100 text-green-700'
                    : complianceFilter === 'MID'  ? 'bg-amber-100 text-amber-700'
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
              <p className="text-3xl font-bold mt-2 text-[#1B3A6B]">{totalShips}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500">Sudah Dikunjungi</p>
              <p className="text-3xl font-bold mt-2 text-green-600">{totalVisited}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500">Belum Dikunjungi</p>
              <p className="text-3xl font-bold mt-2 text-red-600">{totalShips - totalVisited}</p>
            </div>
          </div>

          {/* Compliance per armada */}
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
              displayData.map(({ fleet, opHeadName, vesselStatus, allVesselStatus, compliance, visited }) => (
                <Card key={fleet.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Ship size={18} className="text-[#2A5298]" />
                          {fleet.name}
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">
                          Operation Head: <strong>{opHeadName || 'Belum ditugaskan'}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${compliance}%`,
                              backgroundColor: compliance >= 80 ? '#1A7A4A' : compliance >= 60 ? '#C8922A' : '#C0392B',
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
                      <p className="text-sm text-center text-gray-400 py-6">Tidak ada kapal yang sesuai filter</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-600">Kapal</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Tipe Kapal</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Status Kunjungan</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Tanggal Dikunjungi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vesselStatus.map(({ ship, visited: isVisited, visitDate }) => (
                              <tr key={ship.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-5 py-3 font-medium text-gray-800">{ship.name}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{ship.ship_type?.name || ship.ship_type?.code || '—'}</td>
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
                                <td className="px-4 py-3 text-xs text-gray-600">
                                  {visitDate ? formatDateShort(visitDate) : '—'}
                                </td>
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
