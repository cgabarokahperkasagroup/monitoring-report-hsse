// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Visit, FindingProgressEntry, FindingClosingRequest } from '@/types'

const VISIT_SELECT = `
  *,
  business_unit:business_units_mh(*),
  site:sites(*),
  created_by_user:users!visits_created_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
  approved_by_user:users!visits_approved_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at)
`

function mapUser(u: Record<string, unknown> | null) {
  if (!u) return undefined
  return { ...u, business_units: [] } as unknown as import('@/types').User
}

function mapVisit(row: Record<string, unknown>): Visit {
  return {
    ...(row as unknown as Visit),
    business_unit: row.business_unit as Visit['business_unit'] ?? undefined,
    vessel: (row.vessel as Visit['vessel'])
      ?? (row.vessel_name ? ({ name: row.vessel_name } as Visit['vessel']) : undefined),
    site: row.site as Visit['site'] ?? undefined,
    created_by_user: mapUser(row.created_by_user as Record<string, unknown> | null),
    approved_by_user: mapUser(row.approved_by_user as Record<string, unknown> | null),
    participants: (row.participants as string[]) ?? [],
    attachments: (row.attachments as string[]) ?? [],
  }
}

export function useVisitsData() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('visits')
      .select(VISIT_SELECT)
      .order('visit_date', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setVisits((data ?? []).map(mapVisit))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { visits, loading, error, refetch: fetchAll }
}

export function useVisit(id: string | undefined) {
  const [visit, setVisit] = useState<Visit | null>(null)
  const [findings, setFindings] = useState<import('@/types').Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVisit = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    const [visitRes, findingsRes] = await Promise.all([
      supabase.from('visits').select(VISIT_SELECT).eq('id', id).single(),
      supabase.from('findings').select(`
        *,
        business_unit:business_units_mh(*),
        assigned_to_user:users!findings_assigned_to_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
        created_by_user:users!findings_created_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
        closed_by_user:users!findings_closed_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
        progress_entries:finding_progress_entries(*, created_by_user:users!finding_progress_entries_created_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at)),
        closing_request:finding_closing_requests(*, submitted_by_user:users!finding_closing_requests_submitted_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at), reviewed_by_user:users!finding_closing_requests_reviewed_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at))
      `).eq('visit_id', id).order('created_at', { ascending: true }),
    ])

    if (visitRes.error) { setError(visitRes.error.message); setLoading(false); return }
    setVisit(mapVisit(visitRes.data as unknown as Record<string, unknown>))
    setFindings(((findingsRes.data ?? []) as unknown[]).map(mapFinding))
    setLoading(false)
  }, [id])

  useEffect(() => { fetchVisit() }, [fetchVisit])

  // Approve visit
  const approveVisit = useCallback(async (approverId: string) => {
    if (!id) return { error: 'No id' }
    const { error: err } = await supabase.from('visits').update({
      status: 'APPROVED',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    if (!err) await fetchVisit()
    return { error: err?.message }
  }, [id, fetchVisit])

  // Reject visit
  const rejectVisit = useCallback(async (rejectionNotes: string) => {
    if (!id) return { error: 'No id' }
    const { error: err } = await supabase.from('visits').update({
      status: 'REJECTED',
      rejection_notes: rejectionNotes,
    }).eq('id', id)
    if (!err) await fetchVisit()
    return { error: err?.message }
  }, [id, fetchVisit])

  // Submit visit (DRAFT → SUBMITTED)
  const submitVisit = useCallback(async () => {
    if (!id) return { error: 'No id' }
    const { error: err } = await supabase.from('visits').update({ status: 'SUBMITTED' }).eq('id', id)
    if (!err) await fetchVisit()
    return { error: err?.message }
  }, [id, fetchVisit])

  // Add finding
  const addFinding = useCallback(async (data: {
    title: string; description: string; category: string; priority: string
    assigned_to?: string; target_close_date: string; is_owner_finding: boolean
    initial_photos?: string[]; created_by: string; business_unit_id: string; source_type: string
  }) => {
    if (!id || !visit) return { error: 'No visit' }
    const buCode = visit.business_unit?.code ?? 'BU'
    const d = new Date(visit.visit_date)
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
    const prefix = `FIND/${buCode}/${ym}/`
    const { data: existing } = await supabase.from('findings')
      .select('reference_no')
      .like('reference_no', `${prefix}%`)
    const maxSeq = (existing ?? []).reduce((max, row) => {
      const parts = (row.reference_no as string).split('/')
      const n = parseInt(parts[parts.length - 1]) || 0
      return Math.max(max, n)
    }, 0)
    const reference_no = `FIND/${buCode}/${ym}/${String(maxSeq + 1).padStart(3, '0')}`

    const { error: err } = await supabase.from('findings').insert({
      reference_no,
      visit_id: id,
      business_unit_id: data.business_unit_id,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      source_type: data.source_type,
      is_owner_finding: data.is_owner_finding,
      assigned_to: data.assigned_to || null,
      target_close_date: data.target_close_date,
      status: 'OPEN',
      initial_photos: data.initial_photos ?? [],
      closing_evidence: [],
      created_by: data.created_by,
    })
    if (!err) await fetchVisit()
    return { error: err?.message }
  }, [id, visit, fetchVisit])

  return { visit, findings, loading, error, refetch: fetchVisit, approveVisit, rejectVisit, submitVisit, addFinding }
}

// ── Create visit ────────────────────────────────────────────────────────────
export async function createVisit(data: {
  visit_type: string; business_unit_id: string; vessel_id?: string; vessel_name?: string; site_id?: string
  fleet_id?: string | null
  visit_date: string; start_time?: string; end_time?: string; participants: string[]
  agenda?: string; summary?: string; status?: string; created_by: string
  attachments?: string[]; bu_code?: string
}): Promise<{ id?: string; error?: string }> {
  // Generate reference_no
  const typeCode = data.visit_type === 'OWNER_VISIT' ? 'OWNER'
    : data.visit_type === 'VESSEL_VISIT' ? 'VESSEL' : 'SITE'
  const buCode = data.bu_code ?? 'BU'
  const d = new Date(data.visit_date)
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`

  // Find the highest existing sequence for this type/BU/month prefix to avoid duplicates
  const prefix = `VISIT/${typeCode}/${buCode}/${ym}/`
  const { data: existing } = await supabase.from('visits')
    .select('reference_no')
    .like('reference_no', `${prefix}%`)

  const maxSeq = (existing ?? []).reduce((max, row) => {
    const parts = (row.reference_no as string).split('/')
    const n = parseInt(parts[parts.length - 1]) || 0
    return Math.max(max, n)
  }, 0)

  const seq = String(maxSeq + 1).padStart(3, '0')
  const reference_no = `VISIT/${typeCode}/${buCode}/${ym}/${seq}`

  const { data: inserted, error } = await supabase.from('visits').insert({
    reference_no,
    visit_type: data.visit_type,
    business_unit_id: data.business_unit_id,
    // Kapal berasal dari SMS API (id integer), bukan tabel vessels lokal (UUID).
    // Simpan sebagai snapshot; FK vessel_id dibiarkan null.
    vessel_id: null,
    vessel_name: data.vessel_name ?? null,
    vessel_external_id: data.vessel_id ? Number(data.vessel_id) : null,
    // Fleet pemilik visit (untuk RLS per-fleet OP_HEAD/STAFF_HSSE). Null untuk site/owner visit tanpa kapal.
    fleet_id: data.fleet_id ?? null,
    site_id: data.site_id ?? null,
    visit_date: data.visit_date,
    start_time: data.start_time ?? null,
    end_time: data.end_time ?? null,
    participants: data.participants,
    agenda: data.agenda ?? null,
    summary: data.summary ?? null,
    status: data.status ?? 'DRAFT',
    created_by: data.created_by,
    attachments: data.attachments ?? [],
  }).select('id').single()

  return { id: inserted?.id, error: error?.message }
}

// ── Mapping helper (exported for PrintVisitReportPage) ─────────────────────
export { mapVisit }

function mapFinding(row: unknown): import('@/types').Finding {
  const r = row as Record<string, unknown>
  return {
    ...(r as unknown as import('@/types').Finding),
    assigned_to_user: mapUser(r.assigned_to_user as Record<string, unknown> | null),
    created_by_user: mapUser(r.created_by_user as Record<string, unknown> | null),
    closed_by_user: mapUser(r.closed_by_user as Record<string, unknown> | null),
    initial_photos: (r.initial_photos as string[]) ?? [],
    closing_evidence: (r.closing_evidence as string[]) ?? [],
    progress_entries: ((r.progress_entries as unknown[]) ?? []).map(mapProgressEntry),
    closing_request: r.closing_request
      ? mapClosingRequest(r.closing_request as Record<string, unknown>)
      : undefined,
  }
}

function mapProgressEntry(row: unknown): FindingProgressEntry {
  const r = row as Record<string, unknown>
  return {
    ...(r as unknown as FindingProgressEntry),
    created_by_user: mapUser(r.created_by_user as Record<string, unknown> | null),
    photos: (r.photos as string[]) ?? [],
  }
}

function mapClosingRequest(row: Record<string, unknown>): FindingClosingRequest {
  return {
    ...(row as unknown as FindingClosingRequest),
    submitted_by_user: mapUser(row.submitted_by_user as Record<string, unknown> | null),
    reviewed_by_user: mapUser(row.reviewed_by_user as Record<string, unknown> | null),
    evidence_photos: (row.evidence_photos as string[]) ?? [],
    evidence_documents: (row.evidence_documents as string[]) ?? [],
  }
}
