/**
 * Mengambil data untuk menu Laporan & Export dan menyusunnya menjadi ReportDoc.
 *
 * Semua query berjalan dengan sesi pengguna yang sedang login, jadi RLS
 * per-peran (fleet/site/BU) otomatis membatasi isi laporan — laporan tidak
 * pernah memuat data yang tidak boleh dilihat pengguna di layar.
 */
import { supabaseClient } from '@/lib/supabase'
import type { SmsShip } from '@/services/smsApi'
import type { FindingPriority, FindingStatus, VisitStatus, VisitType } from '@/types'
import { getLocalToday, getPriorityLabel, getStatusLabel, getVisitTypeLabel } from '@/utils'
import type { ResolvedPeriod } from '@/utils/reportPeriod'
import { computeFleetCompliance, type FleetCompliance, type VesselStatus } from '@/utils/vesselCompliance'
import type { CellValue, ReportDoc, ReportSheet } from '@/services/reportFile'

export type ReportId = 'visits-summary' | 'findings-list' | 'vessel-compliance' | 'owner-findings'

export interface ReportFilters {
  period: ResolvedPeriod
  /** Ringkasan filter yang tampil di layar, dicetak di bawah judul laporan. */
  filterSummary: string
  /** Label singkat periode untuk nama berkas, mis. "September 2026". */
  periodLabel: string
  buId: string                               // 'ALL' atau UUID
  visitType: string                          // 'ALL' atau VisitType
  allowedVisitTypes: VisitType[] | null      // batasan peran bila visitType = 'ALL'
  fleetId: string                            // 'ALL' atau id fleet SMS
  shipId: string                             // 'ALL' atau id kapal SMS
  ships: SmsShip[]
}

// Klien di-generic ke schema 'monitoring-hsse' dan tipe hasil embed PostgREST
// tidak terbaca oleh database.types.ts; satu cast di sini menahannya.
const db = supabaseClient as unknown as { from: (table: string) => any }

const PAGE = 1000

/** Ambil seluruh baris, melewati batas 1000 baris per permintaan PostgREST. */
async function fetchAll<T>(build: () => any): Promise<T[]> {
  const out: T[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await build().range(offset, offset + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) return out
  }
}

/** 'YYYY-MM-DD' → Date pada tengah malam UTC, agar Excel tidak bergeser sehari. */
function toDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function daysLate(target: string | null, status: string): number | null {
  if (!target || status === 'CLOSED') return null
  const diff = Math.round((toDate(getLocalToday())!.getTime() - toDate(target)!.getTime()) / 86_400_000)
  return diff > 0 ? diff : null
}

/** Id kapal SMS yang harus disertakan, atau null bila filter kapal/fleet tidak aktif. */
function vesselIds(f: ReportFilters): number[] | null {
  if (f.shipId !== 'ALL') return [Number(f.shipId)]
  if (f.fleetId !== 'ALL') return f.ships.filter(s => String(s.fleet.id) === f.fleetId).map(s => s.id)
  return null
}

/** Terapkan filter kunjungan. `prefix` = 'visit.' bila visits di-embed dari findings. */
function applyVisitFilters(q: any, f: ReportFilters, prefix = ''): any {
  q = q.gte(`${prefix}visit_date`, f.period.from).lte(`${prefix}visit_date`, f.period.to)
  if (f.buId !== 'ALL') q = q.eq(`${prefix}business_unit_id`, f.buId)
  if (f.visitType !== 'ALL') q = q.eq(`${prefix}visit_type`, f.visitType)
  else if (f.allowedVisitTypes?.length) q = q.in(`${prefix}visit_type`, f.allowedVisitTypes)
  const ids = vesselIds(f)
  // Fleet tanpa kapal → tidak ada yang cocok; -1 tidak pernah dipakai sebagai id.
  if (ids) q = q.in(`${prefix}vessel_external_id`, ids.length ? ids : [-1])
  return q
}

function fileBase(slug: string, periodLabel: string): string {
  const period = periodLabel.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
  return `Laporan-${slug}-${period || 'periode'}`
}

function countBy<T>(items: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>()
  items.forEach(i => m.set(key(i), (m.get(key(i)) ?? 0) + 1))
  return m
}

const summarySheet = (rows: [string, CellValue][]): ReportSheet => ({
  name: 'Ringkasan',
  columns: [
    { header: 'Indikator', key: 'k', width: 38 },
    { header: 'Nilai', key: 'v', width: 16, type: 'number' },
  ],
  rows: rows.map(([k, v]) => ({ k, v })),
})

// ── Laporan Ringkasan Kunjungan ─────────────────────────────────────────────

interface VisitRow {
  reference_no: string
  visit_type: VisitType
  visit_date: string
  start_time: string | null
  end_time: string | null
  status: VisitStatus
  vessel_name: string | null
  participants: string[] | null
  summary: string | null
  approved_at: string | null
  business_unit: { name: string } | null
  site: { name: string } | null
  created_by_user: { full_name: string } | null
  approved_by_user: { full_name: string } | null
  findings: { count: number }[]
}

async function buildVisitsSummary(f: ReportFilters): Promise<ReportDoc> {
  const visits = await fetchAll<VisitRow>(() => applyVisitFilters(
    db.from('visits').select(`
      reference_no, visit_type, visit_date, start_time, end_time, status, vessel_name,
      participants, summary, approved_at,
      business_unit:business_units_mh(name), site:sites(name),
      created_by_user:users!visits_created_by_fkey(full_name),
      approved_by_user:users!visits_approved_by_fkey(full_name),
      findings(count)
    `),
    f,
  ).order('visit_date').order('reference_no'))

  const byType = countBy(visits, v => v.visit_type)
  const byStatus = countBy(visits, v => v.status)
  const totalFindings = visits.reduce((s, v) => s + (v.findings?.[0]?.count ?? 0), 0)

  return {
    title: 'Laporan Ringkasan Kunjungan',
    subtitle: f.filterSummary,
    fileBase: fileBase('Ringkasan-Kunjungan', f.periodLabel),
    sheets: [
      summarySheet([
        ['Total kunjungan', visits.length],
        ...(['OWNER_VISIT', 'VESSEL_VISIT', 'SITE_VISIT'] as VisitType[])
          .map(t => [`— ${getVisitTypeLabel(t)}`, byType.get(t) ?? 0] as [string, number]),
        ...(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as VisitStatus[])
          .map(s => [`Status: ${getStatusLabel(s)}`, byStatus.get(s) ?? 0] as [string, number]),
        ['Total temuan dari kunjungan ini', totalFindings],
      ]),
      {
        name: 'Kunjungan',
        columns: [
          { header: 'No', key: 'no', width: 5, type: 'number' },
          { header: 'No. Kunjungan', key: 'ref', width: 30 },
          { header: 'Jenis', key: 'type', width: 13 },
          { header: 'Tanggal', key: 'date', width: 13, type: 'date' },
          { header: 'Jam', key: 'time', width: 13 },
          { header: 'Unit Bisnis', key: 'bu', width: 14 },
          { header: 'Lokasi / Kapal', key: 'loc', width: 28 },
          { header: 'Status', key: 'status', width: 13 },
          { header: 'Peserta', key: 'people', width: 24 },
          { header: 'Ringkasan', key: 'summary', width: 34 },
          { header: 'Dicatat oleh', key: 'by', width: 16 },
          { header: 'Disetujui oleh', key: 'appr', width: 16 },
          { header: 'Jumlah Temuan', key: 'nf', width: 10, type: 'number' },
        ],
        rows: visits.map((v, i) => ({
          no: i + 1,
          ref: v.reference_no,
          type: getVisitTypeLabel(v.visit_type),
          date: toDate(v.visit_date),
          time: [v.start_time?.slice(0, 5), v.end_time?.slice(0, 5)].filter(Boolean).join(' – ') || null,
          bu: v.business_unit?.name ?? null,
          loc: v.site?.name ?? v.vessel_name ?? null,
          status: getStatusLabel(v.status),
          people: (v.participants ?? []).join(', ') || null,
          summary: v.summary,
          by: v.created_by_user?.full_name ?? null,
          appr: v.approved_by_user?.full_name ?? null,
          nf: v.findings?.[0]?.count ?? 0,
        })),
      },
    ],
  }
}

// ── Laporan Daftar Temuan & Owner Visit Findings ────────────────────────────

interface FindingRow {
  reference_no: string
  title: string
  description: string
  category: string
  priority: FindingPriority
  status: FindingStatus
  target_close_date: string | null
  closed_at: string | null
  initial_photos: string[] | null
  visit: {
    reference_no: string
    visit_type: VisitType
    visit_date: string
    vessel_name: string | null
    site: { name: string } | null
  }
  business_unit: { name: string } | null
  assigned_to_user: { full_name: string } | null
  progress_entries: { count: number }[]
}

async function buildFindings(f: ReportFilters, ownerOnly: boolean): Promise<ReportDoc> {
  const findings = await fetchAll<FindingRow>(() => {
    let q = db.from('findings').select(`
      reference_no, title, description, category, priority, status, target_close_date,
      closed_at, initial_photos,
      visit:visits!inner(reference_no, visit_type, visit_date, vessel_name, site:sites(name)),
      business_unit:business_units_mh(name),
      assigned_to_user:users!findings_assigned_to_fkey(full_name),
      progress_entries:finding_progress_entries(count)
    `)
    q = applyVisitFilters(q, f, 'visit.')
    // Temuan dari kunjungan yang ditolak disembunyikan, sama seperti di layar Temuan.
    q = q.neq('visit.status', 'REJECTED')
    if (ownerOnly) q = q.eq('is_owner_finding', true)
    return q.order('reference_no')
  })

  const total = findings.length
  const closed = findings.filter(x => x.status === 'CLOSED').length
  const late = findings.filter(x => daysLate(x.target_close_date, x.status) != null).length
  const byStatus = countBy(findings, x => x.status)
  const byPriority = countBy(findings, x => x.priority)
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : '—')

  const columns: ReportSheet['columns'] = [
    { header: 'No', key: 'no', width: 5, type: 'number' },
    { header: 'No. Temuan', key: 'ref', width: 22 },
    { header: 'No. Kunjungan', key: 'vref', width: 30 },
    ...(ownerOnly ? [] : [{ header: 'Jenis Kunjungan', key: 'vtype', width: 13 }]),
    { header: 'Tgl Kunjungan', key: 'vdate', width: 13, type: 'date' as const },
    { header: 'Unit Bisnis', key: 'bu', width: 13 },
    { header: 'Lokasi / Kapal', key: 'loc', width: 24 },
    { header: 'Judul', key: 'title', width: 30 },
    ...(ownerOnly ? [{ header: 'Deskripsi', key: 'desc', width: 44 }] : []),
    { header: 'Kategori', key: 'cat', width: 13 },
    { header: 'Prioritas', key: 'prio', width: 11 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'PIC', key: 'pic', width: 16 },
    { header: 'Target Selesai', key: 'target', width: 13, type: 'date' },
    { header: 'Hari Terlambat', key: 'late', width: 10, type: 'number' },
    { header: 'Tgl Selesai', key: 'closed', width: 13, type: 'date' },
    { header: 'Foto', key: 'photos', width: 7, type: 'number' },
    { header: 'Progres', key: 'progress', width: 8, type: 'number' },
  ]

  return {
    title: ownerOnly ? 'Laporan Owner Visit Findings' : 'Laporan Daftar Temuan',
    subtitle: f.filterSummary,
    fileBase: fileBase(ownerOnly ? 'Owner-Visit-Findings' : 'Daftar-Temuan', f.periodLabel),
    sheets: [
      summarySheet([
        ['Total temuan', total],
        ...(['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL', 'CLOSED', 'OVERDUE'] as FindingStatus[])
          .map(s => [`Status: ${getStatusLabel(s)}`, byStatus.get(s) ?? 0] as [string, number]),
        ...(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as FindingPriority[])
          .map(p => [`Prioritas: ${getPriorityLabel(p)}`, byPriority.get(p) ?? 0] as [string, number]),
        ['Achievement closing (Selesai / total)', pct(closed)],
        ['Lewat tenggat & belum selesai', late],
        ['Belum punya PIC', findings.filter(x => !x.assigned_to_user).length],
      ]),
      {
        name: ownerOnly ? 'Owner Visit Findings' : 'Temuan',
        columns,
        rows: findings.map((x, i) => ({
          no: i + 1,
          ref: x.reference_no,
          vref: x.visit.reference_no,
          vtype: getVisitTypeLabel(x.visit.visit_type),
          vdate: toDate(x.visit.visit_date),
          bu: x.business_unit?.name ?? null,
          loc: x.visit.site?.name ?? x.visit.vessel_name ?? null,
          title: x.title.trim(),
          desc: x.description?.trim() ?? null,
          cat: x.category,
          prio: getPriorityLabel(x.priority),
          status: getStatusLabel(x.status),
          pic: x.assigned_to_user?.full_name ?? null,
          target: toDate(x.target_close_date),
          late: daysLate(x.target_close_date, x.status),
          closed: toDate(x.closed_at),
          photos: x.initial_photos?.length ?? 0,
          progress: x.progress_entries?.[0]?.count ?? 0,
        })),
      },
    ],
    notes: [
      'Periode dihitung dari tanggal kunjungan tempat temuan dicatat.',
      'Temuan dari kunjungan berstatus Ditolak tidak disertakan.',
      `Hari Terlambat dihitung terhadap tanggal ${getLocalToday()} untuk temuan yang belum Selesai.`,
    ],
  }
}

// ── Laporan Kepatuhan Kunjungan Kapal ───────────────────────────────────────

export interface ComplianceVisitRow {
  vessel_external_id: number | null
  visit_date: string
}

/** Kunjungan kapal yang dihitung untuk kepatuhan: Vessel Visit, Disubmit/Disetujui. */
export async function fetchComplianceVisits(period: ResolvedPeriod): Promise<ComplianceVisitRow[]> {
  const rows = await fetchAll<ComplianceVisitRow>(() => db.from('visits')
    .select('vessel_external_id, visit_date')
    .eq('visit_type', 'VESSEL_VISIT')
    .in('status', ['SUBMITTED', 'APPROVED'])
    .gte('visit_date', period.from)
    .lte('visit_date', period.to)
    .order('visit_date'))
  return rows.filter(r => r.vessel_external_id != null)
}

/**
 * Susun laporan kepatuhan dari hasil hitungan yang sudah jadi.
 *
 * Menerima FleetCompliance, bukan data mentah, supaya halaman Kepatuhan Kapal
 * bisa mengekspor persis apa yang tampil setelah filternya diterapkan.
 * `vesselStatus` (opsional) = daftar kapal yang sudah difilter; bila tidak ada,
 * seluruh kapal fleet dipakai.
 */
export function buildComplianceDoc(
  data: (FleetCompliance & { vesselStatus?: VesselStatus[] })[],
  opts: { filterSummary: string; periodLabel: string },
): ReportDoc {
  const shipRows = data.flatMap(d => (d.vesselStatus ?? d.allVesselStatus)
    .map(s => ({ fleet: d.fleet.name, s })))
  const totalShips = data.reduce((n, d) => n + d.ships.length, 0)
  const totalVisited = data.reduce((n, d) => n + d.visited, 0)

  return {
    title: 'Laporan Kepatuhan Kunjungan Kapal',
    subtitle: opts.filterSummary,
    fileBase: fileBase('Kepatuhan-Kunjungan-Kapal', opts.periodLabel),
    sheets: [
      {
        name: 'Per Fleet',
        columns: [
          { header: 'Fleet', key: 'fleet', width: 24 },
          { header: 'Operation Head', key: 'op', width: 22 },
          { header: 'Jumlah Kapal', key: 'ships', width: 12, type: 'number' },
          { header: 'Dikunjungi', key: 'visited', width: 12, type: 'number' },
          { header: 'Belum Dikunjungi', key: 'missing', width: 14, type: 'number' },
          { header: 'Kepatuhan', key: 'pct', width: 12, type: 'number' },
        ],
        rows: [
          ...data.map(d => ({
            fleet: d.fleet.name,
            op: d.opHeadName,
            ships: d.ships.length,
            visited: d.visited,
            missing: d.ships.length - d.visited,
            pct: `${d.compliance}%`,
          })),
          {
            fleet: 'TOTAL',
            op: null,
            ships: totalShips,
            visited: totalVisited,
            missing: totalShips - totalVisited,
            pct: totalShips ? `${Math.round((totalVisited / totalShips) * 100)}%` : '—',
          },
        ],
      },
      {
        name: 'Per Kapal',
        columns: [
          { header: 'No', key: 'no', width: 5, type: 'number' },
          { header: 'Fleet', key: 'fleet', width: 24 },
          { header: 'Kapal', key: 'ship', width: 28 },
          { header: 'Tipe', key: 'type', width: 10 },
          { header: 'Status', key: 'status', width: 16 },
          { header: 'Kunjungan Terakhir', key: 'last', width: 16, type: 'date' },
        ],
        rows: shipRows.map(({ fleet, s }, i) => ({
          no: i + 1,
          fleet,
          ship: s.ship.name,
          type: s.ship.ship_type?.code ?? null,
          status: s.visited ? 'Dikunjungi' : 'Belum dikunjungi',
          last: toDate(s.visitDate),
        })),
      },
    ],
    notes: [
      'Kepatuhan = persentase kapal di fleet yang dikunjungi minimal sekali dalam periode.',
      'Yang dihitung hanya Vessel Visit berstatus Disubmit atau Disetujui.',
      'Daftar kapal & fleet diambil dari SMS API saat laporan dibuat.',
    ],
  }
}

// ── Titik masuk ─────────────────────────────────────────────────────────────

export async function buildReport(id: ReportId, f: ReportFilters): Promise<ReportDoc> {
  switch (id) {
    case 'visits-summary':
      return buildVisitsSummary(f)
    case 'findings-list':
      return buildFindings(f, false)
    case 'owner-findings':
      return buildFindings(f, true)
    case 'vessel-compliance': {
      const visits = await fetchComplianceVisits(f.period)
      const data = computeFleetCompliance(f.ships, visits, f.fleetId).map(d => ({
        ...d,
        vesselStatus: f.shipId === 'ALL'
          ? d.allVesselStatus
          : d.allVesselStatus.filter(s => String(s.ship.id) === f.shipId),
      }))
      return buildComplianceDoc(data, { filterSummary: f.filterSummary, periodLabel: f.periodLabel })
    }
  }
}

/** Jumlah baris data di sheet utama — dipakai untuk memberi tahu bila laporan kosong. */
export function dataRowCount(doc: ReportDoc): number {
  const main = doc.sheets.find(s => s.name !== 'Ringkasan') ?? doc.sheets[0]
  return main.rows.filter(r => r.fleet !== 'TOTAL').length
}
