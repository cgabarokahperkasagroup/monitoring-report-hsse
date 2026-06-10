import {
  FileBarChart2, Download, FileText, FileSpreadsheet, Table,
  CalendarRange, CalendarDays, Calendar, Lock, Info,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import { useShips, getFleetOptions, shipOptions } from '@/hooks/useShips'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole, VisitType, BusinessUnit, Fleet } from '@/types'

type PeriodType = 'range' | 'month' | 'year'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: currentYear - 2019 }, (_, i) => {
  const y = currentYear - i
  return { value: String(y), label: String(y) }
})
const MONTH_OPTIONS = MONTHS.map((name, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: name,
}))

const ALL_VISIT_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Semua Jenis' },
  { value: 'OWNER_VISIT', label: 'Owner Visit' },
  { value: 'VESSEL_VISIT', label: 'Vessel Visit' },
  { value: 'SITE_VISIT', label: 'Site Visit' },
]

const ALL_REPORT_TYPES = [
  {
    id: 'visits-summary', icon: FileBarChart2, color: 'text-blue-600', bg: 'bg-blue-50',
    title: 'Laporan Ringkasan Kunjungan',
    desc: 'Rekap seluruh kunjungan per periode, BU, dan jenis kunjungan beserta statistiknya.',
    formats: ['Excel', 'PDF'],
    roles: [] as UserRole[], // empty = semua role boleh
  },
  {
    id: 'findings-list', icon: Table, color: 'text-orange-600', bg: 'bg-orange-50',
    title: 'Laporan Daftar Temuan',
    desc: 'Daftar lengkap temuan beserta status, prioritas, PIC, dan achievement closing.',
    formats: ['Excel', 'PDF'],
    roles: [] as UserRole[],
  },
  {
    id: 'vessel-compliance', icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50',
    title: 'Laporan Kepatuhan Kunjungan Kapal',
    desc: 'Compliance rate per Operation Head per fleet berdasarkan periode yang dipilih.',
    formats: ['Excel', 'PDF'],
    // Site Manager tidak relevan karena mengelola site bukan kapal
    roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'STAFF_HSSE', 'OP_HEAD', 'PIC', 'VIEWER'] as UserRole[],
  },
  {
    id: 'owner-findings', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50',
    title: 'Laporan Owner Visit Findings',
    desc: 'Daftar khusus temuan dari Owner Visit beserta status terkini dan progress penyelesaian.',
    formats: ['Excel', 'PDF'],
    roles: [] as UserRole[],
  },
]

/** Roles that have full/unrestricted access */
const FULL_ACCESS_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'VIEWER']

interface AccessConstraints {
  lockedBUIds: string[]         // BU filter dikunci ke ID ini
  lockedFleetId: string | null  // Fleet filter dikunci (null = bebas pilih)
  allowedVisitTypes: VisitType[] | null // null = semua boleh
  showFleetFilter: boolean
  showShipFilter: boolean
  infoMessage: string | null
}

function deriveConstraints(
  role: UserRole,
  buIds: string[],
  fleetId?: string,
): AccessConstraints {
  switch (role) {
    case 'OP_HEAD':
      return {
        lockedBUIds: buIds,
        lockedFleetId: fleetId ?? null,
        allowedVisitTypes: ['VESSEL_VISIT', 'OWNER_VISIT'],
        showFleetFilter: true,
        showShipFilter: true,
        infoMessage: 'Anda hanya dapat mengekspor data kunjungan & temuan pada fleet yang Anda pimpin.',
      }
    case 'STAFF_HSSE':
      return {
        lockedBUIds: buIds,
        lockedFleetId: fleetId ?? null,
        allowedVisitTypes: ['VESSEL_VISIT'],
        showFleetFilter: true,
        showShipFilter: true,
        infoMessage: 'Anda hanya dapat mengekspor data Vessel Visit pada fleet yang Anda tangani.',
      }
    case 'SITE_MGR':
      return {
        lockedBUIds: buIds,
        lockedFleetId: null,
        allowedVisitTypes: ['SITE_VISIT'],
        showFleetFilter: false,
        showShipFilter: false,
        infoMessage: 'Anda hanya dapat mengekspor data Site Visit pada unit bisnis Anda.',
      }
    case 'PIC':
      return {
        lockedBUIds: buIds,
        lockedFleetId: null,
        allowedVisitTypes: null,
        showFleetFilter: true,
        showShipFilter: true,
        infoMessage: 'Anda hanya dapat mengekspor data pada unit bisnis yang Anda tangani.',
      }
    default:
      return {
        lockedBUIds: [],
        lockedFleetId: null,
        allowedVisitTypes: null,
        showFleetFilter: true,
        showShipFilter: true,
        infoMessage: null,
      }
  }
}

const dateInputClass =
  'px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none transition-all w-full'

export default function ReportsPage() {
  const { success } = useToast()
  const { user } = useAuthStore()
  const { ships } = useShips()

  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  const [fleets, setFleets] = useState<Fleet[]>([])
  useEffect(() => {
    supabase.from('business_units_mh').select('id, code, name, description, is_active, created_at').eq('is_active', true)
      .then(({ data }) => { if (data) setBusinessUnits(data as unknown as BusinessUnit[]) })
    supabase.from('fleets').select('id, name, business_unit_id, op_head_user_id, hse_officer_id, visit_frequency, is_active, created_at').eq('is_active', true)
      .then(({ data }) => { if (data) setFleets(data as unknown as Fleet[]) })
  }, [])

  const isRestricted = user ? !FULL_ACCESS_ROLES.includes(user.role) : false
  const constraints = useMemo<AccessConstraints>(() => {
    if (!user || !isRestricted) {
      return deriveConstraints('SUPER_ADMIN', [], undefined)
    }
    return deriveConstraints(user.role, user.business_units, user.fleet_id)
  }, [user, isRestricted])

  // Period state
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(String(currentYear))

  // Filter state — seeded from constraints
  const [bu, setBu] = useState(() => constraints.lockedBUIds[0] ?? 'ALL')
  const [visitType, setVisitType] = useState<string>(() => {
    if (constraints.allowedVisitTypes?.length === 1) return constraints.allowedVisitTypes[0]
    return 'ALL'
  })
  const [fleetId, setFleetId] = useState(() => constraints.lockedFleetId ?? 'ALL')
  const [shipId, setShipId] = useState('ALL')
  const [generating, setGenerating] = useState<string | null>(null)

  // Keep state in sync if constraints change (e.g. switching demo user)
  useEffect(() => {
    if (constraints.lockedFleetId) setFleetId(constraints.lockedFleetId)
    if (constraints.lockedBUIds.length > 0) setBu(constraints.lockedBUIds[0])
    if (constraints.allowedVisitTypes?.length === 1) setVisitType(constraints.allowedVisitTypes[0])
    setShipId('ALL')
  }, [constraints])

  // Fleet options scoped to allowed BUs
  const allFleetOptions = useMemo(() => getFleetOptions(ships), [ships])
  const allowedFleetIds = useMemo(() => {
    if (constraints.lockedBUIds.length === 0) return null // no restriction
    return fleets
      .filter(f => constraints.lockedBUIds.includes(f.business_unit_id))
      .map(f => String(f.id))
  }, [constraints.lockedBUIds, fleets])

  const scopedFleetOptions = useMemo(() => {
    if (!allowedFleetIds) return allFleetOptions
    return allFleetOptions.filter(f => allowedFleetIds.includes(f.value))
  }, [allFleetOptions, allowedFleetIds])

  const filteredShipOptions = useMemo(
    () => shipOptions(ships, fleetId !== 'ALL' ? fleetId : undefined),
    [ships, fleetId]
  )

  // BU options for non-restricted: all; for restricted: only assigned BUs
  const buOptions = useMemo(() => {
    if (constraints.lockedBUIds.length === 0) {
      return [{ value: 'ALL', label: 'Semua Unit Bisnis' }, ...businessUnits.map(b => ({ value: b.id, label: b.name }))]
    }
    return businessUnits
      .filter(b => constraints.lockedBUIds.includes(b.id))
      .map(b => ({ value: b.id, label: b.name }))
  }, [constraints.lockedBUIds, businessUnits])

  // Visit type options scoped to allowedVisitTypes
  const visitTypeOptions = useMemo(() => {
    if (!constraints.allowedVisitTypes) return ALL_VISIT_TYPE_OPTIONS
    return ALL_VISIT_TYPE_OPTIONS.filter(
      o => o.value === 'ALL' ? false : constraints.allowedVisitTypes!.includes(o.value as VisitType)
    )
  }, [constraints.allowedVisitTypes])

  // Visible report types based on role
  const visibleReports = useMemo(() => {
    if (!user) return ALL_REPORT_TYPES
    return ALL_REPORT_TYPES.filter(r => r.roles.length === 0 || r.roles.includes(user.role))
  }, [user])

  function handleFleetChange(val: string) {
    setFleetId(val)
    setShipId('ALL')
  }

  const periodLabel = useMemo(() => {
    if (periodType === 'range') {
      if (dateFrom && dateTo) return `${dateFrom} s/d ${dateTo}`
      if (dateFrom) return `Dari ${dateFrom}`
      return 'Belum dipilih'
    }
    if (periodType === 'month') return `${MONTHS[Number(selectedMonth) - 1]} ${selectedYear}`
    return `Tahun ${selectedYear}`
  }, [periodType, dateFrom, dateTo, selectedMonth, selectedYear])

  const filterSummary = useMemo(() => {
    const parts: string[] = [periodLabel]
    const buLabel = buOptions.find(b => b.value === bu)?.label ?? bu
    parts.push(buLabel)
    if (constraints.showFleetFilter && fleetId !== 'ALL') {
      parts.push(scopedFleetOptions.find(f => f.value === fleetId)?.label ?? fleetId)
    }
    if (constraints.showShipFilter && shipId !== 'ALL') {
      parts.push(filteredShipOptions.find(s => s.value === shipId)?.label ?? shipId)
    }
    const vtLabel = ALL_VISIT_TYPE_OPTIONS.find(o => o.value === visitType)?.label
    if (visitType !== 'ALL' && vtLabel) parts.push(vtLabel)
    return parts.join(' · ')
  }, [periodLabel, bu, fleetId, shipId, visitType, buOptions, scopedFleetOptions, filteredShipOptions, constraints])

  const handleGenerate = async (reportId: string, format: string) => {
    setGenerating(`${reportId}-${format}`)
    await new Promise(r => setTimeout(r, 1500))
    setGenerating(null)
    success(`Laporan ${format} berhasil dibuat`, 'File akan diunduh secara otomatis')
  }

  const isLocked = (field: 'bu' | 'fleet' | 'visitType') => {
    if (field === 'bu') return constraints.lockedBUIds.length > 0
    if (field === 'fleet') return constraints.lockedFleetId !== null
    if (field === 'visitType') return (constraints.allowedVisitTypes?.length ?? 0) > 0
    return false
  }

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      {/* Access restriction notice */}
      {constraints.infoMessage && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
          <span>{constraints.infoMessage}</span>
        </div>
      )}

      {/* Global Filters */}
      <Card>
        <CardContent className="p-5 flex flex-col gap-5">
          <h3 className="text-sm font-semibold text-[#1B3A6B]">Filter Laporan</h3>

          {/* Period type toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-600">Tipe Periode</label>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { key: 'range' as PeriodType, icon: CalendarRange, label: 'Range Tanggal' },
                  { key: 'month' as PeriodType, icon: CalendarDays, label: 'Bulan' },
                  { key: 'year' as PeriodType, icon: Calendar, label: 'Tahun' },
                ]
              ).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriodType(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    periodType === key
                      ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#1B3A6B] hover:text-[#1B3A6B]'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Period inputs */}
          {periodType === 'range' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600">Dari Tanggal</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={dateInputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600">Sampai Tanggal</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom} className={dateInputClass} />
              </div>
            </div>
          )}

          {periodType === 'month' && (
            <div className="grid grid-cols-2 gap-4">
              <Select label="Bulan" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} options={MONTH_OPTIONS} />
              <Select label="Tahun" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} options={YEAR_OPTIONS} />
            </div>
          )}

          {periodType === 'year' && (
            <div className="grid grid-cols-2 gap-4">
              <Select label="Tahun" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} options={YEAR_OPTIONS} />
            </div>
          )}

          {/* BU + Jenis Kunjungan */}
          <div className="grid grid-cols-2 gap-4">
            <LockedField locked={isLocked('bu')} label="Unit Bisnis">
              <Select
                label="Unit Bisnis"
                value={bu}
                onChange={e => setBu(e.target.value)}
                options={buOptions}
                disabled={isLocked('bu') && buOptions.length === 1}
              />
            </LockedField>

            <LockedField locked={isLocked('visitType')} label="Jenis Kunjungan">
              <Select
                label="Jenis Kunjungan"
                value={visitType}
                onChange={e => setVisitType(e.target.value)}
                options={visitTypeOptions}
                disabled={isLocked('visitType') && visitTypeOptions.length === 1}
              />
            </LockedField>
          </div>

          {/* Fleet + Kapal */}
          {(constraints.showFleetFilter || constraints.showShipFilter) && (
            <div className="grid grid-cols-2 gap-4">
              {constraints.showFleetFilter && (
                <LockedField locked={isLocked('fleet')} label="Fleet">
                  <Select
                    label="Fleet"
                    value={fleetId}
                    onChange={e => handleFleetChange(e.target.value)}
                    options={[
                      ...(constraints.lockedFleetId ? [] : [{ value: 'ALL', label: 'Semua Fleet' }]),
                      ...scopedFleetOptions,
                    ]}
                    disabled={isLocked('fleet')}
                  />
                </LockedField>
              )}

              {constraints.showShipFilter && (
                <Select
                  label="Kapal"
                  value={shipId}
                  onChange={e => setShipId(e.target.value)}
                  searchable
                  placeholder="Semua Kapal"
                  options={[
                    { value: 'ALL', label: 'Semua Kapal' },
                    ...filteredShipOptions,
                  ]}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleReports.map(report => (
          <Card key={report.id}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-2.5 rounded-xl ${report.bg} shrink-0`}>
                  <report.icon size={20} className={report.color} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{report.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{report.desc}</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <p className="text-xs text-gray-600 leading-relaxed">{filterSummary}</p>
              </div>

              <div className="flex gap-2">
                {report.formats.map(fmt => (
                  <Button
                    key={fmt}
                    variant={fmt === 'Excel' ? 'primary' : 'outline'}
                    size="sm"
                    className="flex-1 justify-center"
                    loading={generating === `${report.id}-${fmt}`}
                    onClick={() => handleGenerate(report.id, fmt)}
                  >
                    <Download size={14} />
                    {fmt}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shareable link — hanya untuk role yang punya akses penuh */}
      {!isRestricted && (
        <Card>
          <CardHeader>
            <CardTitle>Laporan Shareable Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Generate link sementara untuk laporan yang dapat diakses tanpa login. Link berlaku selama 24 jam.
            </p>
            <div className="flex gap-3">
              <input
                value="https://visit.barokah.co.id/reports/share/abc123..."
                readOnly
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-gray-50 text-gray-500"
              />
              <Button variant="outline" size="sm" onClick={() => success('Link disalin', 'Link laporan berhasil disalin ke clipboard')}>
                Salin
              </Button>
              <Button size="sm" onClick={() => success('Link baru dibuat', 'Link shareable berlaku 24 jam')}>
                Generate Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/** Wrapper to show a lock badge next to a filter field when it's restricted */
function LockedField({
  children,
  locked,
  label,
}: {
  children: React.ReactNode
  locked: boolean
  label: string
}) {
  if (!locked) return <>{children}</>
  return (
    <div className="relative">
      {children}
      <span
        title={`${label} dikunci sesuai hak akses Anda`}
        className="absolute top-0 right-0 flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5"
      >
        <Lock size={9} />
        Terkunci
      </span>
    </div>
  )
}
