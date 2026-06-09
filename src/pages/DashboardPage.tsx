import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, AlertTriangle, TrendingUp, AlertCircle,
  CheckCircle2, Clock, Ship, Star, ArrowUpRight,
  ClipboardCheck, Shield, Activity, Target, FileCheck,
  Calendar, Award, XCircle,
  Filter, Flame, TrendingDown, RefreshCw, MessageSquareX, Anchor
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SkeletonCard, SkeletonChart, Skeleton } from '@/components/ui/skeleton'
import {
  getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel,
  formatDateShort, getExternalInspectionTypeLabel, getExternalInspectionTypeColor,
  getInspectionResultLabel, getInspectionResultColor
} from '@/utils'
import type { FindingPriority, PISFindingStatus, BusinessUnit, Fleet, Vessel } from '@/types'
import {
  usePISFindingsData,
  getPISStatusLabel, getPISStatusColor,
  getPISTemuanLabel, getPISTemuanColor,
  getPISPerusahaanColor,
} from '@/hooks/usePISFindingsData'
import { useVisitsData } from '@/hooks/useVisitsData'
import { useFindingsData } from '@/hooks/useFindingsData'
import { useInternalInspectionsData } from '@/hooks/useInternalInspectionsData'
import { useExternalInspectionsData } from '@/hooks/useExternalInspectionsData'
import { supabase } from '@/lib/supabase'

// ─── Pure helper ─────────────────────────────────────────────────────────────

function matchDate(dateStr: string, year: string, month: string): boolean {
  if (year === 'all' && month === 'all') return true
  const d = new Date(dateStr)
  if (year !== 'all' && d.getFullYear().toString() !== year) return false
  if (month !== 'all' && (d.getMonth() + 1).toString() !== month) return false
  return true
}

const MONTHS = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '1',  label: 'Januari' }, { value: '2',  label: 'Februari' },
  { value: '3',  label: 'Maret' },   { value: '4',  label: 'April' },
  { value: '5',  label: 'Mei' },     { value: '6',  label: 'Juni' },
  { value: '7',  label: 'Juli' },    { value: '8',  label: 'Agustus' },
  { value: '9',  label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },  { value: '12', label: 'Desember' },
]
const YEARS = ['all', '2024', '2025', '2026'].map(v => ({ value: v, label: v === 'all' ? 'Semua Tahun' : v }))

// ─── Tab definition ───────────────────────────────────────────────────────────

type DashTab = 'visit' | 'internal' | 'external' | 'nfb_vetting'

const TABS: { key: DashTab; label: string; icon: React.ElementType }[] = [
  { key: 'visit',       label: 'Manajemen Visit',    icon: ClipboardList },
  { key: 'internal',   label: 'Inspeksi Internal',  icon: ClipboardCheck },
  { key: 'external',   label: 'Inspeksi Eksternal', icon: Shield },
  { key: 'nfb_vetting', label: 'NFB & Vetting',      icon: MessageSquareX },
]

// ─── Filter components ────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500 shrink-0">{label}:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B] cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function FilterBar({ children, onReset }: { children: React.ReactNode; onReset: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Filter size={13} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter</span>
      </div>
      <div className="h-4 w-px bg-gray-200" />
      {children}
      <button onClick={onReset} className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
        <RefreshCw size={11} /> Reset
      </button>
    </div>
  )
}


function ComplianceBar({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  const color = value >= 80 ? '#1A7A4A' : value >= 60 ? '#C8922A' : '#C0392B'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      {showLabel && <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>{value}%</span>}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ title, value, icon: Icon, color, bg, trend, onClick, sub }: {
  title: string; value: string | number; icon: React.ElementType
  color: string; bg: string; trend?: string; sub?: string; onClick?: () => void
}) {
  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
      style={{ borderLeftColor: color }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{title}</p>
          <p className="text-3xl font-bold mt-2 leading-none" style={{ color }}>{value}</p>
          {trend && <p className="text-xs text-gray-400 mt-1.5">{trend}</p>}
          {sub && <p className="text-xs font-medium mt-1" style={{ color }}>{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: bg }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      {onClick && (
        <div className="flex items-center gap-1 mt-3 text-xs font-medium" style={{ color }}>
          <span>Lihat Detail</span>
          <ArrowUpRight size={12} />
        </div>
      )}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, color = '#1B3A6B', action, onAction }: {
  icon: React.ElementType; title: string; color?: string; action?: string; onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '1A' }}>
          <Icon size={15} style={{ color }} />
        </div>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      {action && onAction && (
        <button onClick={onAction} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color }}>
          {action} <ArrowUpRight size={11} />
        </button>
      )}
    </div>
  )
}

// ─── Stat mini box ────────────────────────────────────────────────────────────

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ backgroundColor: color + '15' }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<DashTab>('visit')
  const { visits: mockVisits, loading: visitsLoading } = useVisitsData()
  const { findings: mockFindings, loading: findingsLoading } = useFindingsData()
  const { inspections: mockInternalInspections, loading: internalLoading } = useInternalInspectionsData()
  const { inspections: mockExternalInspections, loading: externalLoading } = useExternalInspectionsData()
  const isLoading = visitsLoading || findingsLoading || internalLoading || externalLoading

  const [mockBusinessUnits, setMockBusinessUnits] = useState<BusinessUnit[]>([])
  const [mockFleets, setMockFleets] = useState<Fleet[]>([])
  const [mockVessels, setMockVessels] = useState<Vessel[]>([])

  useEffect(() => {
    supabase.from('business_units').select('id, name, code, is_active, created_at').eq('is_active', true)
      .then(({ data }) => { if (data) setMockBusinessUnits(data as BusinessUnit[]) })
    supabase.from('fleets').select('id, name, business_unit_id, op_head_user_id, visit_frequency, is_active, created_at').eq('is_active', true)
      .then(({ data }) => { if (data) setMockFleets(data as Fleet[]) })
    supabase.from('mh_vessels').select('id, name, imo_number, vessel_type, fleet_id, business_unit_id, is_active, created_at').eq('is_active', true)
      .then(({ data }) => { if (data) setMockVessels(data as Vessel[]) })
  }, [])

  // ── Filter state per tab ───────────────────────────────────────────────────
  const [viYear, setViYear]   = useState('all')
  const [viMonth, setViMonth] = useState('all')
  const [viBU, setViBU]       = useState('all')
  const [viType, setViType]   = useState('all')
  const [viPriority, setViPriority]         = useState('all')
  const [viFindingStatus, setViFindingStatus] = useState('all')

  const [inYear, setInYear]     = useState('all')
  const [inMonth, setInMonth]   = useState('all')
  const [inFleet, setInFleet]   = useState('all')
  const [inVessel, setInVessel] = useState('all')
  const [inResult, setInResult] = useState('all')

  const [exYear, setExYear]     = useState('all')
  const [exMonth, setExMonth]   = useState('all')
  const [exFleet, setExFleet]   = useState('all')
  const [exVessel, setExVessel] = useState('all')
  const [exType, setExType]     = useState('all')
  const [exResult, setExResult] = useState('all')

  const [nvPerusahaan, setNvPerusahaan] = useState('all')
  const [nvFleet, setNvFleet]           = useState('all')
  const [nvTemuan, setNvTemuan]         = useState('all')
  const [nvStatus, setNvStatus]         = useState('all')
  const [nvYear, setNvYear]             = useState('all')

  // ── PIS store ─────────────────────────────────────────────────────────────
  const { findings: allPISFindings } = usePISFindingsData()
  const nfbVettingFindings = useMemo(
    () => allPISFindings.filter(f => f.temuan === 'NEGATIVE_FEEDBACK' || f.temuan === 'VETTING_PLUS'),
    [allPISFindings],
  )

  // ── Select options ─────────────────────────────────────────────────────────
  const buOptions = [
    { value: 'all', label: 'Semua BU' },
    ...mockBusinessUnits.map(bu => ({ value: bu.id, label: bu.name }))
  ]
  const fleetOptions = [
    { value: 'all', label: 'Semua Fleet' },
    ...mockFleets.map(f => ({ value: f.id, label: f.name }))
  ]
  const vesselOptions = [
    { value: 'all', label: 'Semua Kapal' },
    ...mockVessels.map(v => ({ value: v.id, label: v.name }))
  ]
  const visitTypeOptions = [
    { value: 'all', label: 'Semua Jenis' },
    { value: 'OWNER_VISIT', label: 'Owner Visit' },
    { value: 'VESSEL_VISIT', label: 'Vessel Visit' },
    { value: 'SITE_VISIT', label: 'Site Visit' },
  ]
  const inspTypeOptions = [
    { value: 'all', label: 'Semua Jenis' },
    { value: 'SIRE', label: 'SIRE' },
    { value: 'BIRE', label: 'BIRE' },
    { value: 'VETTING_PSA', label: 'Vetting PSA' },
    { value: 'IMCA', label: 'IMCA' },
    { value: 'OTHER', label: 'Lainnya' },
  ]
  const resultOptions = [
    { value: 'all', label: 'Semua Hasil' },
    { value: 'SATISFACTORY', label: 'Satisfactory' },
    { value: 'CONDITIONAL', label: 'Conditional' },
    { value: 'UNSATISFACTORY', label: 'Unsatisfactory' },
  ]
  const priorityOptions = [
    { value: 'all', label: 'Semua Prioritas' },
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' },
  ]
  const findingStatusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'OVERDUE', label: 'Overdue' },
  ]

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredVisitsVi = useMemo(() =>
    mockVisits.filter(v =>
      matchDate(v.visit_date, viYear, viMonth) &&
      (viBU === 'all' || v.business_unit_id === viBU) &&
      (viType === 'all' || v.visit_type === viType)
    ), [mockVisits, viYear, viMonth, viBU, viType])

  const filteredFindingsVi = useMemo(() =>
    mockFindings.filter(f =>
      matchDate(f.created_at, viYear, viMonth) &&
      (viBU === 'all' || f.business_unit_id === viBU) &&
      (viPriority === 'all' || f.priority === viPriority) &&
      (viFindingStatus === 'all' || f.status === viFindingStatus)
    ), [mockFindings, viYear, viMonth, viBU, viPriority, viFindingStatus])

  const filteredInternal = useMemo(() =>
    mockInternalInspections.filter(i =>
      matchDate(i.inspection_date, inYear, inMonth) &&
      (inFleet  === 'all' || i.vessel?.fleet_id === inFleet) &&
      (inVessel === 'all' || i.vessel_id === inVessel) &&
      (inResult === 'all' || i.result === inResult)
    ), [mockInternalInspections, inYear, inMonth, inFleet, inVessel, inResult])

  const filteredExternal = useMemo(() =>
    mockExternalInspections.filter(i =>
      matchDate(i.inspection_date, exYear, exMonth) &&
      (exFleet  === 'all' || i.vessel?.fleet_id === exFleet) &&
      (exVessel === 'all' || i.vessel_id === exVessel) &&
      (exType   === 'all' || i.inspection_type === exType) &&
      (exResult === 'all' || i.result === exResult)
    ), [mockExternalInspections, exYear, exMonth, exFleet, exVessel, exType, exResult])

  // ── Visit trend chart (last 12 months from real visits data) ─────────────
  const visitTrend = useMemo(() => {
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
    const counts = new Map<string, number>()
    mockVisits.forEach(v => {
      const d = new Date(v.visit_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, visits]) => {
        const [year, month] = key.split('-')
        return { month: `${MONTH_NAMES[Number(month) - 1]} ${year}`, visits }
      })
  }, [mockVisits])

  // ── Visit tab stats ────────────────────────────────────────────────────────
  const viTotal       = filteredVisitsVi.length
  const viOwner       = filteredVisitsVi.filter(v => v.visit_type === 'OWNER_VISIT').length
  const viVessel      = filteredVisitsVi.filter(v => v.visit_type === 'VESSEL_VISIT').length
  const viSite        = filteredVisitsVi.filter(v => v.visit_type === 'SITE_VISIT').length
  const viApproved    = filteredVisitsVi.filter(v => v.status === 'APPROVED').length
  const viSubmitted   = filteredVisitsVi.filter(v => v.status === 'SUBMITTED').length
  const viDraft       = filteredVisitsVi.filter(v => v.status === 'DRAFT').length
  const viFtotal      = filteredFindingsVi.length
  const viFclosed     = filteredFindingsVi.filter(f => f.status === 'CLOSED').length
  const viFactive     = filteredFindingsVi.filter(f => ['OPEN', 'IN_PROGRESS', 'OVERDUE'].includes(f.status)).length
  const viFcritical   = filteredFindingsVi.filter(f => f.priority === 'CRITICAL' && f.status !== 'CLOSED').length
  const viFoverdue    = filteredFindingsVi.filter(f => f.status === 'OVERDUE').length
  const viFpending    = filteredFindingsVi.filter(f => f.status === 'PENDING_APPROVAL').length
  const viAchievement = viFtotal > 0 ? Math.round((viFclosed / viFtotal) * 100) : 0
  const viAvgPerVisit = viTotal > 0 ? (viFtotal / viTotal).toFixed(1) : '0'

  // ── Internal inspection stats ──────────────────────────────────────────────
  const inTotal          = filteredInternal.length
  const inApproved       = filteredInternal.filter(i => i.status === 'APPROVED').length
  const inSubmitted      = filteredInternal.filter(i => i.status === 'SUBMITTED').length
  const inDraft          = filteredInternal.filter(i => i.status === 'DRAFT').length
  const inSatisfactory   = filteredInternal.filter(i => i.result === 'SATISFACTORY').length
  const inConditional    = filteredInternal.filter(i => i.result === 'CONDITIONAL').length
  const inUnsatisf       = filteredInternal.filter(i => i.result === 'UNSATISFACTORY').length
  const inTotalDeficient = filteredInternal.reduce((s, i) => s + i.items_deficient, 0)
  const inAvgCompliance  = filteredInternal.length > 0
    ? Math.round(filteredInternal.reduce((s, i) =>
        s + (i.total_items_checked > 0 ? (i.items_satisfactory / i.total_items_checked) * 100 : 0), 0
      ) / filteredInternal.length)
    : 0

  // ── External inspection stats ──────────────────────────────────────────────
  const today          = new Date()
  const exTotal        = filteredExternal.length
  const exCompleted    = filteredExternal.filter(i => i.status === 'COMPLETED').length
  const exScheduled    = filteredExternal.filter(i => i.status === 'SCHEDULED').length
  const exCancelled    = filteredExternal.filter(i => i.status === 'CANCELLED').length
  const exTotalObs     = filteredExternal.reduce((s, i) => s + (i.total_observations || 0), 0)
  const exCriticalObs  = filteredExternal.reduce((s, i) => s + (i.critical_observations || 0), 0)
  const exMajorObs     = filteredExternal.reduce((s, i) => s + (i.major_observations || 0), 0)
  const exMinorObs     = filteredExternal.reduce((s, i) => s + (i.minor_observations || 0), 0)
  const exExpiringSoon = mockExternalInspections.filter(i => {
    if (!i.validity_date) return false
    const diff = (new Date(i.validity_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 90
  }).length

  // ── Chart data ─────────────────────────────────────────────────────────────
  const intResultData = [
    { name: 'Satisfactory',   value: inSatisfactory, color: '#1A7A4A' },
    { name: 'Conditional',    value: inConditional,  color: '#C8922A' },
    { name: 'Unsatisfactory', value: inUnsatisf,     color: '#C0392B' },
    { name: 'Belum Dinilai',  value: inTotal - inSatisfactory - inConditional - inUnsatisf, color: '#94A3B8' },
  ].filter(d => d.value > 0)

  const intDefPerVessel = filteredInternal
    .filter(i => i.items_deficient > 0)
    .map(i => ({
      vessel: i.vessel?.name?.replace('MV ', '').replace('MT ', '').replace('KM ', '') || i.vessel_id,
      deficient: i.items_deficient,
      compliance: i.total_items_checked > 0 ? Math.round((i.items_satisfactory / i.total_items_checked) * 100) : 0,
    }))
    .sort((a, b) => b.deficient - a.deficient)
    .slice(0, 6)

  const compliancePerVessel = useMemo(() => {
    const map: Record<string, { name: string; checked: number; satisfactory: number; deficient: number }> = {}
    filteredInternal.forEach(insp => {
      const vname = insp.vessel?.name || insp.vessel_id
      if (!map[vname]) map[vname] = { name: vname, checked: 0, satisfactory: 0, deficient: 0 }
      map[vname].checked += insp.total_items_checked
      map[vname].satisfactory += insp.items_satisfactory
      map[vname].deficient += insp.items_deficient
    })
    return Object.values(map).map(v => ({
      vessel: v.name.replace('KM ', '').replace('MV ', '').replace('MT ', ''),
      compliance: v.checked > 0 ? Math.round((v.satisfactory / v.checked) * 100) : 0,
      deficient: v.deficient,
      rate: v.checked > 0 ? Math.round((v.satisfactory / v.checked) * 100) : 0,
    }))
  }, [filteredInternal])

  const areaBreakdown = useMemo(() => {
    const areaMap: Record<string, { total: number; open: number }> = {}
    filteredInternal.forEach(insp => {
      ;(insp.findings || []).forEach(f => {
        if (!areaMap[f.area]) areaMap[f.area] = { total: 0, open: 0 }
        areaMap[f.area].total++
        if (f.status !== 'CLOSED') areaMap[f.area].open++
      })
    })
    return Object.entries(areaMap)
      .map(([area, d]) => ({ area, ...d }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [filteredInternal])

  const extByType = ['SIRE', 'BIRE', 'VETTING_PSA', 'IMCA', 'OTHER'].map(type => ({
    name: getExternalInspectionTypeLabel(type as never),
    value: filteredExternal.filter(i => i.inspection_type === type).length,
    color: type === 'SIRE' ? '#1B3A6B' : type === 'BIRE' ? '#4F46E5' : type === 'VETTING_PSA' ? '#7C3AED' : type === 'IMCA' ? '#0D9488' : '#64748B',
  })).filter(d => d.value > 0)

  const extResultData = [
    { name: 'Satisfactory',  value: filteredExternal.filter(i => i.result === 'SATISFACTORY').length,  color: '#1A7A4A' },
    { name: 'Conditional',   value: filteredExternal.filter(i => i.result === 'CONDITIONAL').length,   color: '#C8922A' },
    { name: 'Unsatisfactory',value: filteredExternal.filter(i => i.result === 'UNSATISFACTORY').length, color: '#C0392B' },
    { name: 'Dijadwalkan',   value: exScheduled + exCancelled,                                         color: '#2A5298' },
  ].filter(d => d.value > 0)

  const findingStatusData = useMemo(() => [
    { name: 'Open',             value: filteredFindingsVi.filter(f => f.status === 'OPEN').length,             color: '#D35400' },
    { name: 'In Progress',      value: filteredFindingsVi.filter(f => f.status === 'IN_PROGRESS').length,      color: '#2A5298' },
    { name: 'Pending Approval', value: filteredFindingsVi.filter(f => f.status === 'PENDING_APPROVAL').length, color: '#C8922A' },
    { name: 'Closed',           value: filteredFindingsVi.filter(f => f.status === 'CLOSED').length,           color: '#1A7A4A' },
    { name: 'Overdue',          value: filteredFindingsVi.filter(f => f.status === 'OVERDUE').length,          color: '#C0392B' },
  ].filter(d => d.value > 0), [filteredFindingsVi])

  const findingPriorityData = useMemo(() => [
    { priority: 'Critical', count: filteredFindingsVi.filter(f => f.priority === 'CRITICAL').length, color: '#C0392B' },
    { priority: 'High',     count: filteredFindingsVi.filter(f => f.priority === 'HIGH').length,     color: '#D35400' },
    { priority: 'Medium',   count: filteredFindingsVi.filter(f => f.priority === 'MEDIUM').length,   color: '#C8922A' },
    { priority: 'Low',      count: filteredFindingsVi.filter(f => f.priority === 'LOW').length,      color: '#1A7A4A' },
  ].filter(d => d.count > 0), [filteredFindingsVi])

  const findingsByCategoryData = useMemo(() => {
    const catMap: Record<string, number> = {}
    filteredFindingsVi.forEach(f => { catMap[f.category] = (catMap[f.category] || 0) + 1 })
    return Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count)
  }, [filteredFindingsVi])

  const visitsByBUData = useMemo(() =>
    mockBusinessUnits.map(bu => ({
      bu: bu.code,
      name: bu.name,
      visits:   filteredVisitsVi.filter(v => v.business_unit_id === bu.id).length,
      findings: filteredFindingsVi.filter(f => f.business_unit_id === bu.id).length,
    })).filter(d => d.visits > 0),
  [filteredVisitsVi, filteredFindingsVi, mockBusinessUnits])

  // Static monthly trend data
  const inspTrendData = [
    { month: 'Jan', internal: 1, external: 0 },
    { month: 'Feb', internal: 1, external: 1 },
    { month: 'Mar', internal: 2, external: 1 },
    { month: 'Apr', internal: 1, external: 2 },
    { month: 'Mei', internal: 2, external: 1 },
    { month: 'Jun', internal: 1, external: 1 },
  ]

  // ── NFB & Vetting filtered data ───────────────────────────────────────────
  const filteredNV = useMemo(() =>
    nfbVettingFindings.filter(f =>
      (nvPerusahaan === 'all' || f.perusahaan      === nvPerusahaan) &&
      (nvFleet      === 'all' || f.fleet_inspector === nvFleet) &&
      (nvTemuan     === 'all' || f.temuan          === nvTemuan) &&
      (nvStatus     === 'all' || f.status          === nvStatus) &&
      (nvYear       === 'all' || f.kode_year_open  === nvYear)
    ), [nfbVettingFindings, nvPerusahaan, nvFleet, nvTemuan, nvStatus, nvYear],
  )

  const nvKpi = useMemo(() => {
    const nfb     = filteredNV.filter(f => f.temuan === 'NEGATIVE_FEEDBACK').length
    const vetting = filteredNV.filter(f => f.temuan === 'VETTING_PLUS').length
    const counts  = { total: filteredNV.length, nfb, vetting, CLOSED: 0, OPEN: 0, ON_PROSES: 0, REJECTED: 0, PROCESS_APPROVAL: 0 }
    filteredNV.forEach(f => (counts as Record<string, number>)[f.status]++)
    return counts
  }, [filteredNV])

  const nvStatusPieData = useMemo(() => (
    (['CLOSED', 'OPEN', 'ON_PROSES', 'REJECTED', 'PROCESS_APPROVAL'] as PISFindingStatus[]).map(s => ({
      name: getPISStatusLabel(s),
      value: (nvKpi as Record<string, number>)[s],
      color: ({ CLOSED: '#22c55e', OPEN: '#f97316', ON_PROSES: '#3b82f6', REJECTED: '#ef4444', PROCESS_APPROVAL: '#f59e0b' } as Record<string, string>)[s],
    })).filter(d => d.value > 0)
  ), [nvKpi])

  const nvTemuanCompareData = useMemo(() => (
    (['CLOSED', 'OPEN', 'ON_PROSES', 'REJECTED', 'PROCESS_APPROVAL'] as PISFindingStatus[]).map(s => ({
      name: getPISStatusLabel(s),
      NFB:     filteredNV.filter(f => f.temuan === 'NEGATIVE_FEEDBACK' && f.status === s).length,
      Vetting: filteredNV.filter(f => f.temuan === 'VETTING_PLUS'       && f.status === s).length,
    }))
  ), [filteredNV])

  const nvKapalData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredNV.forEach(f => { map[f.nama_kapal] = (map[f.nama_kapal] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))
  }, [filteredNV])

  const nvCategoryData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredNV.forEach(f => { map[f.category] = (map[f.category] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }))
  }, [filteredNV])

  const nvYears = useMemo(() => {
    const s = new Set(nfbVettingFindings.map(f => f.kode_year_open).filter(Boolean) as string[])
    return [...s].sort()
  }, [nfbVettingFindings])

  const nvFleetOptions = useMemo(() => {
    const s = new Set(nfbVettingFindings.map(f => f.fleet_inspector).filter(Boolean))
    return [
      { value: 'all', label: 'Semua Fleet' },
      ...[...s].sort().map(v => ({ value: v, label: v })),
    ]
  }, [nfbVettingFindings])

  // ── Alert builders ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                isActive
                  ? 'bg-[#1B3A6B] text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── TAB 1: MANAJEMEN VISIT ─────────────────────────────────────────── */}
      {activeTab === 'visit' && (
        <>
          {/* Filter Bar */}
          <FilterBar onReset={() => { setViYear('all'); setViMonth('all'); setViBU('all'); setViType('all'); setViPriority('all'); setViFindingStatus('all') }}>
            <FilterSelect label="Tahun"        value={viYear}          onChange={setViYear}           options={YEARS} />
            <FilterSelect label="Bulan"        value={viMonth}         onChange={setViMonth}          options={MONTHS} />
            <FilterSelect label="Unit Bisnis"  value={viBU}            onChange={setViBU}             options={buOptions} />
            <FilterSelect label="Tipe Visit"   value={viType}          onChange={setViType}           options={visitTypeOptions} />
            <FilterSelect label="Prioritas"    value={viPriority}      onChange={setViPriority}       options={priorityOptions} />
            <FilterSelect label="Status Temuan" value={viFindingStatus} onChange={setViFindingStatus}  options={findingStatusOptions} />
          </FilterBar>

          {/* KPI Row 1 — Visit */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Kunjungan" value={viTotal}  icon={ClipboardList} color="#1B3A6B" bg="#EBF0FA" trend="Seluruh periode"    onClick={() => navigate('/visits')} />
              <KPICard title="Owner Visit"     value={viOwner}  icon={Star}          color="#C8922A" bg="#FDF3E0" trend="Kunjungan Direksi" onClick={() => navigate('/owner-findings')} />
              <KPICard title="Vessel Visit"    value={viVessel} icon={Ship}          color="#2A5298" bg="#EBF0FA" trend="Kunjungan Kapal" />
              <KPICard title="Site Visit"      value={viSite}   icon={Activity}      color="#0D9488" bg="#ECFDF5" trend="Kunjungan Site" />
            </div>
          )}

          {/* KPI Row 2 — Temuan */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">{Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
              <KPICard title="Total Temuan"    value={viFtotal}       icon={AlertTriangle}  color="#D35400" bg="#FDF0E8" trend="Semua status"        onClick={() => navigate('/findings')} />
              <KPICard title="Temuan Aktif"    value={viFactive}      icon={AlertCircle}    color="#D35400" bg="#FDF0E8" trend="Open + In Progress" />
              <KPICard title="Temuan Kritis"   value={viFcritical}    icon={Flame}          color="#C0392B" bg="#FDECEA" trend="Prioritas Critical" />
              <KPICard title="Overdue"         value={viFoverdue}     icon={Clock}          color="#C0392B" bg="#FDECEA" trend="Melewati due date" />
              <KPICard title="Pending Review"  value={viFpending}     icon={TrendingDown}   color="#C8922A" bg="#FDF3E0" trend="Menunggu approval" />
              <KPICard title="Achievement"     value={`${viAchievement}%`} icon={TrendingUp} color="#1A7A4A" bg="#E8F5EF" trend={`${viFclosed}/${viFtotal} selesai`} />
              <KPICard title="Rata-rata/Visit" value={viAvgPerVisit}  icon={Activity}       color="#2A5298" bg="#EBF0FA" trend="Temuan per kunjungan" />
            </div>
          )}


          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Tren Jumlah Kunjungan</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={220} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={visitTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="visits" stroke="#1B3A6B" strokeWidth={2.5} dot={{ fill: '#1B3A6B', r: 4 }} name="Kunjungan" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Status Temuan</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={220} /> : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={findingStatusData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value">
                          {findingStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v} temuan`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5 mt-1">
                      {findingStatusData.map(s => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-gray-600">{s.name}</span>
                          </div>
                          <span className="font-semibold">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Kunjungan & Temuan per Unit Bisnis</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={220} /> : visitsByBUData.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Tidak ada data dengan filter ini</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={visitsByBUData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="bu" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="visits"   fill="#1B3A6B" name="Kunjungan" radius={[3,3,0,0]} />
                      <Bar dataKey="findings" fill="#D35400" name="Temuan"    radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Temuan per Kategori</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={220} /> : findingsByCategoryData.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Tidak ada data dengan filter ini</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart layout="vertical" data={findingsByCategoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip formatter={v => [`${v} temuan`]} />
                      <Bar dataKey="count" fill="#2A5298" name="Temuan" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>Temuan per Prioritas</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={200} /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={findingPriorityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => [`${v} temuan`]} />
                      <Bar dataKey="count" radius={[4,4,0,0]} name="Jumlah">
                        {findingPriorityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Kepatuhan Kunjungan Kapal</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/vessel-compliance')}>Lihat Semua <ArrowUpRight size={14} /></Button>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 flex flex-col gap-3">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Operation Head</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Fleet</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Compliance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([] as { op_head: string; fleet: string; compliance: number }[]).map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-800">{row.op_head}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{row.fleet}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${row.compliance}%`, backgroundColor: row.compliance >= 80 ? '#1A7A4A' : '#C0392B' }} />
                              </div>
                              <span className={`text-xs font-bold ${row.compliance >= 80 ? 'text-green-700' : 'text-red-600'}`}>{row.compliance}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Findings Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daftar Temuan ({filteredFindingsVi.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/findings')}>Lihat Semua <ArrowUpRight size={14} /></Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 flex flex-col gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : filteredFindingsVi.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Tidak ada temuan dengan filter ini</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Temuan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Unit Bisnis</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Prioritas</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Target Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindingsVi.slice(0, 10).map(f => (
                      <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/findings/${f.id}`)}>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1.5">
                            {f.is_owner_finding && <Star size={11} className="text-amber-500 shrink-0" />}
                            <span className="text-xs font-medium text-gray-800 line-clamp-1">{f.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{f.business_unit?.name ?? '—'}</td>
                        <td className="px-4 py-3"><span className={`badge text-[10px] ${getPriorityColor(f.priority)}`}>{getPriorityLabel(f.priority as FindingPriority)}</span></td>
                        <td className="px-4 py-3"><span className={`badge text-[10px] ${getStatusColor(f.status)}`}>{getStatusLabel(f.status)}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDateShort(f.target_close_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── TAB 2: INSPEKSI INTERNAL ───────────────────────────────────────── */}
      {activeTab === 'internal' && (
        <>
          {/* Filter Bar */}
          <FilterBar onReset={() => { setInYear('all'); setInMonth('all'); setInFleet('all'); setInVessel('all'); setInResult('all') }}>
            <FilterSelect label="Tahun"   value={inYear}   onChange={setInYear}   options={YEARS} />
            <FilterSelect label="Bulan"   value={inMonth}  onChange={setInMonth}  options={MONTHS} />
            <FilterSelect label="Fleet"   value={inFleet}  onChange={setInFleet}  options={fleetOptions} />
            <FilterSelect label="Kapal"   value={inVessel} onChange={setInVessel} options={vesselOptions} />
            <FilterSelect label="Hasil"   value={inResult} onChange={setInResult} options={resultOptions} />
          </FilterBar>

          {/* KPI Row 1 */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Inspeksi"  value={inTotal}        icon={ClipboardCheck} color="#1B3A6B" bg="#EBF0FA" trend="Semua periode" onClick={() => navigate('/inspections/internal')} />
              <KPICard title="Disetujui"       value={inApproved}     icon={FileCheck}      color="#1A7A4A" bg="#E8F5EF" trend={`${inSubmitted} menunggu review`} />
              <KPICard title="Total Temuan"    value={inTotalDeficient} icon={AlertTriangle} color="#D35400" bg="#FDF0E8" trend="Deficient items" />
              <KPICard title="Avg Compliance"  value={`${inAvgCompliance}%`} icon={Target}  color={inAvgCompliance >= 80 ? '#1A7A4A' : inAvgCompliance >= 60 ? '#C8922A' : '#C0392B'} bg={inAvgCompliance >= 80 ? '#E8F5EF' : inAvgCompliance >= 60 ? '#FDF3E0' : '#FDECEA'} trend="Rata-rata seluruh inspeksi" />
            </div>
          )}

          {/* KPI Row 2 */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Satisfactory"    value={inSatisfactory}  icon={CheckCircle2}  color="#1A7A4A" bg="#E8F5EF" trend="Hasil terbaik" />
              <KPICard title="Conditional"     value={inConditional}   icon={AlertTriangle} color="#C8922A" bg="#FDF3E0" trend="Perlu tindak lanjut" />
              <KPICard title="Unsatisfactory"  value={inUnsatisf}      icon={XCircle}       color="#C0392B" bg="#FDECEA" trend="Perlu perhatian serius" />
              <KPICard title="Draft / Proses"  value={inDraft + inSubmitted} icon={Clock}   color="#2A5298" bg="#EBF0FA" trend={`${inDraft} draft, ${inSubmitted} submit`} />
            </div>
          )}

          {/* Compliance per Vessel + Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionHeader icon={Ship} title="Compliance per Kapal" color="#2A5298" />
              <div className="mt-4 flex flex-col gap-3">
                {compliancePerVessel.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Tidak ada data dengan filter ini</p>
                ) : compliancePerVessel.map(v => (
                  <div key={v.vessel}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{v.vessel}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">{v.deficient} temuan</span>
                        <span className={`text-xs font-bold ${v.rate >= 80 ? 'text-green-700' : v.rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{v.rate}%</span>
                      </div>
                    </div>
                    <ComplianceBar value={v.rate} showLabel={false} />
                  </div>
                ))}
              </div>
            </div>

            <Card>
              <CardHeader><CardTitle>Distribusi Hasil Inspeksi</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={240} /> : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={intResultData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value">
                          {intResultData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v} inspeksi`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {intResultData.map(s => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-gray-600">{s.name}</span>
                          </div>
                          <span className="font-semibold">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Temuan per Area</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={240} /> : areaBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Tidak ada data dengan filter ini</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart layout="vertical" data={areaBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="area" tick={{ fontSize: 10 }} width={90} />
                      <Tooltip formatter={v => [`${v} temuan`]} />
                      <Bar dataKey="count" fill="#2A5298" radius={[0,4,4,0]} name="Temuan" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Deficient per vessel chart */}
          <Card>
            <CardHeader><CardTitle>Deficient Items per Kapal</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <SkeletonChart height={200} /> : compliancePerVessel.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Tidak ada temuan defisiensi dengan filter ini</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={compliancePerVessel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="vessel" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v, n) => [v, n === 'deficient' ? 'Deficient Items' : 'Compliance %']} />
                    <Bar dataKey="deficient" name="Deficient" fill="#D35400" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Trend chart */}
          <Card>
            <CardHeader><CardTitle>Tren Inspeksi Internal per Bulan</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <SkeletonChart height={200} /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={inspTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="internal" name="Inspeksi Internal" fill="#1B3A6B" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Inspections list */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daftar Inspeksi Internal ({filteredInternal.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/inspections/internal')}>Lihat Semua <ArrowUpRight size={14} /></Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 flex flex-col gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : filteredInternal.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Tidak ada inspeksi dengan filter ini</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Kapal</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Lead Inspektor</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Hasil</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Compliance</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Temuan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInternal.map(insp => {
                      const rate = insp.total_items_checked > 0 ? Math.round((insp.items_satisfactory / insp.total_items_checked) * 100) : 0
                      return (
                        <tr key={insp.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/inspections/internal/${insp.id}`)}>
                          <td className="px-6 py-3">
                            <p className="text-xs font-medium text-gray-800">{insp.vessel?.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{insp.reference_no}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{formatDateShort(insp.inspection_date)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{insp.lead_inspector}</td>
                          <td className="px-4 py-3 text-center">
                            {insp.result
                              ? <span className={`badge text-[10px] ${getInspectionResultColor(insp.result)}`}>{getInspectionResultLabel(insp.result)}</span>
                              : <span className="text-[10px] text-gray-400">—</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-center">
                            {insp.total_items_checked > 0 ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: rate >= 80 ? '#1A7A4A' : rate >= 60 ? '#C8922A' : '#C0392B' }} />
                                </div>
                                <span className={`text-[10px] font-bold ${rate >= 80 ? 'text-green-700' : rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
                              </div>
                            ) : <span className="text-[10px] text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {insp.items_deficient > 0
                              ? <span className="text-xs font-semibold text-orange-600">{insp.items_deficient}</span>
                              : <span className="text-xs text-gray-400">0</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge text-[10px] ${insp.status === 'APPROVED' ? 'bg-green-100 text-green-700 border-green-200' : insp.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {insp.status === 'APPROVED' ? 'Disetujui' : insp.status === 'SUBMITTED' ? 'Diajukan' : 'Draft'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── TAB 3: INSPEKSI EKSTERNAL ──────────────────────────────────────── */}
      {activeTab === 'external' && (
        <>
          {/* Filter Bar */}
          <FilterBar onReset={() => { setExYear('all'); setExMonth('all'); setExFleet('all'); setExVessel('all'); setExType('all'); setExResult('all') }}>
            <FilterSelect label="Tahun"   value={exYear}   onChange={setExYear}   options={YEARS} />
            <FilterSelect label="Bulan"   value={exMonth}  onChange={setExMonth}  options={MONTHS} />
            <FilterSelect label="Fleet"   value={exFleet}  onChange={setExFleet}  options={fleetOptions} />
            <FilterSelect label="Kapal"   value={exVessel} onChange={setExVessel} options={vesselOptions} />
            <FilterSelect label="Jenis"   value={exType}   onChange={setExType}   options={inspTypeOptions} />
            <FilterSelect label="Hasil"   value={exResult} onChange={setExResult} options={resultOptions} />
          </FilterBar>

          {/* KPI Row 1 */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Inspeksi"  value={exTotal}        icon={Shield}        color="#7C3AED" bg="#F5F3FF" trend="Semua periode" onClick={() => navigate('/inspections/external')} />
              <KPICard title="Selesai"         value={exCompleted}    icon={CheckCircle2}  color="#1A7A4A" bg="#E8F5EF" trend="Completed" />
              <KPICard title="Dijadwalkan"     value={exScheduled}    icon={Calendar}      color="#2A5298" bg="#EBF0FA" trend="Akan datang" />
              <KPICard title="Expiring Soon"   value={exExpiringSoon} icon={Clock}         color="#C8922A" bg="#FDF3E0" trend="Dalam 90 hari" />
            </div>
          )}

          {/* KPI Row 2 — Observations */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Observasi"   value={exTotalObs}    icon={AlertCircle}   color="#1B3A6B" bg="#EBF0FA" trend="Seluruh inspeksi" />
              <KPICard title="Critical Obs."     value={exCriticalObs} icon={AlertCircle}   color="#C0392B" bg="#FDECEA" trend="Paling urgent" />
              <KPICard title="Major Obs."        value={exMajorObs}    icon={AlertTriangle} color="#D35400" bg="#FDF0E8" trend="Deficiency mayor" />
              <KPICard title="Minor Obs."        value={exMinorObs}    icon={Activity}      color="#C8922A" bg="#FDF3E0" trend="Deficiency minor" />
            </div>
          )}

          {/* Certificate expiry alerts */}
          {!isLoading && exExpiringSoon > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award size={15} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Sertifikat Segera Berakhir ({exExpiringSoon})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredExternal.filter(i => {
                  if (!i.validity_date) return false
                  const daysLeft = Math.ceil((new Date(i.validity_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  return daysLeft >= 0 && daysLeft <= 90
                }).map(insp => {
                  const daysLeft = Math.ceil((new Date(insp.validity_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={insp.id}
                      className="flex items-center justify-between bg-white rounded-lg border border-amber-200 px-3 py-2 cursor-pointer hover:border-amber-400 transition"
                      onClick={() => navigate(`/inspections/external/${insp.id}`)}>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{insp.vessel?.name}</p>
                        <p className="text-[10px] text-gray-500">{getExternalInspectionTypeLabel(insp.inspection_type)}</p>
                      </div>
                      <span className={`text-xs font-bold ${daysLeft <= 30 ? 'text-red-600' : 'text-amber-600'}`}>{daysLeft}h lagi</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>Distribusi Jenis Inspeksi</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={240} /> : extByType.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Tidak ada data</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={extByType} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value">
                          {extByType.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v} inspeksi`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {extByType.map(s => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-gray-600">{s.name}</span>
                          </div>
                          <span className="font-semibold">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Distribusi Hasil</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={240} /> : extResultData.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Tidak ada data</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={extResultData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value">
                          {extResultData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v} inspeksi`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {extResultData.map(s => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-gray-600">{s.name}</span>
                          </div>
                          <span className="font-semibold">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tren Inspeksi Eksternal</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={240} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={inspTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="external" name="Insp. Eksternal" fill="#7C3AED" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Observations breakdown per inspection */}
          <Card>
            <CardHeader><CardTitle>Observasi per Inspeksi</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <SkeletonChart height={200} /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={filteredExternal.filter(i => i.total_observations > 0).map(i => ({
                    name: `${getExternalInspectionTypeLabel(i.inspection_type)} – ${i.vessel?.name?.replace('MV ','').replace('MT ','')}`,
                    critical: i.critical_observations || 0,
                    major: i.major_observations || 0,
                    minor: i.minor_observations || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="critical" name="Critical" fill="#C0392B" stackId="a" radius={[2,2,0,0]} />
                    <Bar dataKey="major"    name="Major"    fill="#D35400" stackId="a" radius={[2,2,0,0]} />
                    <Bar dataKey="minor"    name="Minor"    fill="#C8922A" stackId="a" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Certificate validity table */}
          {filteredExternal.some(i => i.validity_date) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-[#7C3AED]" />
                  <CardTitle>Status Validitas Sertifikat</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Kapal</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Jenis</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Inspeksi</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Berlaku Hingga</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Sisa Hari</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Insp. Berikutnya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExternal.filter(i => i.validity_date).map(insp => {
                      const daysLeft = Math.ceil((new Date(insp.validity_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      const isExpired  = daysLeft < 0
                      const isExpiring = daysLeft >= 0 && daysLeft <= 90
                      return (
                        <tr key={insp.id}
                          className={`border-b hover:bg-gray-50 cursor-pointer ${isExpired ? 'bg-red-50 border-red-100' : isExpiring ? 'bg-amber-50 border-amber-100' : 'border-gray-50'}`}
                          onClick={() => navigate(`/inspections/external/${insp.id}`)}>
                          <td className="px-6 py-3">
                            <p className="text-xs font-medium text-gray-800">{insp.vessel?.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{insp.report_no}</p>
                          </td>
                          <td className="px-4 py-3"><span className={`badge text-[10px] ${getExternalInspectionTypeColor(insp.inspection_type)}`}>{getExternalInspectionTypeLabel(insp.inspection_type)}</span></td>
                          <td className="px-4 py-3 text-xs text-gray-600">{formatDateShort(insp.inspection_date)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{formatDateShort(insp.validity_date!)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold ${isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-green-700'}`}>
                              {isExpired ? `Exp ${Math.abs(daysLeft)}h` : `${daysLeft}h`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{insp.next_inspection_date ? formatDateShort(insp.next_inspection_date) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Inspections list */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daftar Inspeksi Eksternal ({filteredExternal.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/inspections/external')}>Lihat Semua <ArrowUpRight size={14} /></Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 flex flex-col gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : filteredExternal.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Tidak ada inspeksi dengan filter ini</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Kapal</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Jenis</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Badan Inspeksi</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Hasil</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Obs.</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExternal.map(insp => (
                      <tr key={insp.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/inspections/external/${insp.id}`)}>
                        <td className="px-6 py-3">
                          <p className="text-xs font-medium text-gray-800">{insp.vessel?.name}</p>
                          <p className="text-[10px] text-gray-400">{insp.port}</p>
                        </td>
                        <td className="px-4 py-3"><span className={`badge text-[10px] ${getExternalInspectionTypeColor(insp.inspection_type)}`}>{getExternalInspectionTypeLabel(insp.inspection_type)}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate">{insp.inspecting_body}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{formatDateShort(insp.inspection_date)}</td>
                        <td className="px-4 py-3 text-center">
                          {insp.result
                            ? <span className={`badge text-[10px] ${getInspectionResultColor(insp.result)}`}>{getInspectionResultLabel(insp.result)}</span>
                            : <span className="text-[10px] text-gray-400">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          {insp.total_observations > 0
                            ? <span className="text-xs font-semibold text-gray-700">{insp.total_observations}</span>
                            : <span className="text-xs text-gray-400">—</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge text-[10px] ${insp.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' : insp.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {insp.status === 'COMPLETED' ? 'Selesai' : insp.status === 'SCHEDULED' ? 'Dijadwalkan' : 'Dibatalkan'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── TAB 4: NFB & VETTING ──────────────────────────────────────────────── */}
      {activeTab === 'nfb_vetting' && (
        <>
          {/* Filter Bar */}
          <FilterBar onReset={() => { setNvPerusahaan('all'); setNvFleet('all'); setNvTemuan('all'); setNvStatus('all'); setNvYear('all') }}>
            <FilterSelect label="Perusahaan"   value={nvPerusahaan} onChange={setNvPerusahaan} options={[
              { value: 'all', label: 'Semua Perusahaan' },
              { value: 'ASG', label: 'ASG' },
              { value: 'BGP', label: 'BGP' },
            ]} />
            <FilterSelect label="Fleet"        value={nvFleet}      onChange={setNvFleet}      options={nvFleetOptions} />
            <FilterSelect label="Tipe Temuan"  value={nvTemuan}    onChange={setNvTemuan}    options={[
              { value: 'all',                label: 'Semua Temuan' },
              { value: 'NEGATIVE_FEEDBACK',  label: 'Negative Feedback' },
              { value: 'VETTING_PLUS',       label: 'Vetting Plus' },
            ]} />
            <FilterSelect label="Status"       value={nvStatus}    onChange={setNvStatus}    options={[
              { value: 'all',              label: 'Semua Status' },
              { value: 'OPEN',             label: 'Open' },
              { value: 'CLOSED',           label: 'Closed' },
              { value: 'ON_PROSES',        label: 'On Proses' },
              { value: 'REJECTED',         label: 'Rejected' },
              { value: 'PROCESS_APPROVAL', label: 'Process Approval' },
            ]} />
            <FilterSelect label="Tahun"        value={nvYear}      onChange={setNvYear}      options={[
              { value: 'all', label: 'Semua Tahun' },
              ...nvYears.map(y => ({ value: y, label: y })),
            ]} />
          </FilterBar>

          {/* KPI Row */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
              <KPICard title="Total Finding"     value={nvKpi.total}   icon={MessageSquareX} color="#1B3A6B" bg="#EBF0FA" />
              <KPICard title="Negative Feedback" value={nvKpi.nfb}     icon={AlertTriangle}  color="#ef4444" bg="#FEE2E2" />
              <KPICard title="Vetting Plus"      value={nvKpi.vetting} icon={Shield}         color="#7c3aed" bg="#EDE9FE" />
              <KPICard title="Open"              value={(nvKpi as Record<string, number>).OPEN}       icon={AlertCircle}  color="#f97316" bg="#FFF7ED" />
              <KPICard title="On Proses"         value={(nvKpi as Record<string, number>).ON_PROSES}  icon={Clock}        color="#3b82f6" bg="#EFF6FF" />
              <KPICard title="Closed"            value={(nvKpi as Record<string, number>).CLOSED}     icon={CheckCircle2} color="#22c55e" bg="#F0FDF4" />
              <KPICard title="Rejected / PA"     value={(nvKpi as Record<string, number>).REJECTED + (nvKpi as Record<string, number>).PROCESS_APPROVAL} icon={XCircle} color="#ef4444" bg="#FEE2E2" />
            </div>
          )}

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Distribusi Status Finding NFB &amp; Vetting</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={240} /> : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={nvStatusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                          {nvStatusPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [v, 'Jumlah']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5 mt-1">
                      {nvStatusPieData.map(s => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-gray-600">{s.name}</span>
                          </div>
                          <span className="font-semibold">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Status NFB vs Vetting Plus</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={240} /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={nvTemuanCompareData} margin={{ left: 0, right: 10, top: 0, bottom: 45 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="NFB"     name="Negative Feedback" fill="#ef4444" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Vetting" name="Vetting Plus"      fill="#7c3aed" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Finding per Kapal (Top 8)</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={240} /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={nvKapalData} layout="vertical" margin={{ left: 140, right: 10, top: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                      <Tooltip />
                      <Bar dataKey="value" name="Jumlah" fill="#7c3aed" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Top 10 Kategori Finding</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <SkeletonChart height={240} /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={nvCategoryData} layout="vertical" margin={{ left: 110, right: 10, top: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="value" name="Jumlah" fill="#1B3A6B" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daftar Finding */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daftar Finding NFB &amp; Vetting</CardTitle>
                <button
                  onClick={() => navigate('/nfb-vetting')}
                  className="text-xs font-medium flex items-center gap-1 hover:underline"
                  style={{ color: '#1B3A6B' }}
                >
                  Lihat Semua <ArrowUpRight size={11} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? <SkeletonChart height={200} /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Perusahaan</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nama Kapal</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tipe Temuan</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kategori</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tgl. Open</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Target Close</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNV.slice(0, 10).map(f => (
                        <tr
                          key={f.id}
                          className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/pis-findings/${f.id}`)}
                        >
                          <td className="px-4 py-3">
                            <span className={`badge text-[10px] ${getPISPerusahaanColor(f.perusahaan)}`}>{f.perusahaan}</span>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-gray-800 max-w-[160px] truncate">{f.nama_kapal}</td>
                          <td className="px-4 py-3">
                            <span className={`badge text-[10px] ${getPISTemuanColor(f.temuan)}`}>{getPISTemuanLabel(f.temuan)}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 max-w-[130px] truncate">{f.category}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`badge text-[10px] ${getPISStatusColor(f.status)}`}>{getPISStatusLabel(f.status)}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{formatDateShort(f.open_date)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{formatDateShort(f.target_closed_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
