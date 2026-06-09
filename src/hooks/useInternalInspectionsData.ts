// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { InternalInspection, InspectionFinding, InspectionFindingProgress, InspectionFindingClosingReq } from '@/types'

const INTERNAL_SELECT = `
  *,
  lead_inspector_user:users!internal_inspections_lead_inspector_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
  created_by_user:users!internal_inspections_created_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
  inspectors_list:internal_inspection_inspectors(user_id, user:users(id, full_name)),
  findings:inspection_findings(
    *,
    progress_entries:inspection_finding_progress(*),
    closing_request:inspection_finding_closing_requests(*)
  )
`

function mapUser(u: Record<string, unknown> | null) {
  if (!u) return undefined
  return { ...u, business_units: [] } as unknown as import('@/types').User
}

function mapInspectionFinding(row: unknown): InspectionFinding {
  const r = row as Record<string, unknown>
  const closingRaw = r.closing_request as Record<string, unknown>[] | Record<string, unknown> | null
  const closing = Array.isArray(closingRaw) ? closingRaw[0] : closingRaw
  return {
    ...(r as unknown as InspectionFinding),
    initial_photos: (r.initial_photos as string[]) ?? [],
    closing_evidence: (r.closing_evidence as string[]) ?? [],
    progress_entries: ((r.progress_entries as unknown[]) ?? []).map(p => p as unknown as InspectionFindingProgress),
    closing_request: closing ? (closing as unknown as InspectionFindingClosingReq) : undefined,
  }
}

export function mapInternalInspection(row: unknown): InternalInspection {
  const r = row as Record<string, unknown>
  const leadUser = r.lead_inspector_user as Record<string, unknown> | null
  const inspectorsList = (r.inspectors_list as Array<{ user_id: string; user: { full_name: string } }>) ?? []
  return {
    ...(r as unknown as InternalInspection),
    vessel: r.vessel_name
      ? ({ id: String(r.vessel_external_id ?? ''), name: r.vessel_name as string, vessel_type: null } as unknown as InternalInspection['vessel'])
      : undefined,
    business_unit: undefined,
    lead_inspector: leadUser?.full_name as string ?? (r.lead_inspector as string ?? ''),
    inspectors: inspectorsList.map(i => i.user?.full_name ?? i.user_id),
    created_by_user: mapUser(r.created_by_user as Record<string, unknown> | null),
    findings: ((r.findings as unknown[]) ?? []).map(mapInspectionFinding),
  }
}

export function useInternalInspectionsData() {
  const [inspections, setInspections] = useState<InternalInspection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('internal_inspections')
      .select(INTERNAL_SELECT)
      .order('inspection_date', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setInspections((data ?? []).map(mapInternalInspection))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { inspections, loading, error, refetch: fetchAll }
}

export function useInternalInspection(id: string | undefined) {
  const [inspection, setInspection] = useState<InternalInspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOne = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('internal_inspections')
      .select(INTERNAL_SELECT)
      .eq('id', id)
      .single()
    if (err) { setError(err.message); setLoading(false); return }
    setInspection(mapInternalInspection(data))
    setLoading(false)
  }, [id])

  // Background refresh — no loading spinner, used after mutations
  const fetchSilent = useCallback(async () => {
    if (!id) return
    const { data, error: err } = await supabase
      .from('internal_inspections')
      .select(INTERNAL_SELECT)
      .eq('id', id)
      .single()
    if (!err && data) setInspection(mapInternalInspection(data))
  }, [id])

  useEffect(() => { fetchOne() }, [fetchOne])

  // Approve inspection
  const approveInspection = useCallback(async (approverId: string) => {
    if (!id) return { error: 'No id' }
    const { error: err } = await supabase.from('internal_inspections')
      .update({ status: 'APPROVED', approved_by: approverId, approved_at: new Date().toISOString().split('T')[0] })
      .eq('id', id)
    if (!err) await fetchOne()
    return { error: err?.message }
  }, [id, fetchOne])

  // Add finding to inspection
  const addFinding = useCallback(async (data: Omit<InspectionFinding, 'id' | 'created_at' | 'progress_entries' | 'closing_request'>) => {
    if (!id) return { error: 'No id' }
    const { error: err } = await supabase.from('inspection_findings').insert({
      internal_inspection_id: id,
      external_inspection_id: null,
      area: data.area,
      description: data.description,
      priority: data.priority,
      status: data.status,
      assigned_to: data.assigned_to ?? null,
      target_close_date: data.target_close_date,
      initial_photos: data.initial_photos ?? [],
      closing_evidence: [],
    })
    if (!err) await fetchSilent()
    return { error: err?.message }
  }, [id, fetchSilent])

  // Add progress to inspection finding
  const addFindingProgress = useCallback(async (findingId: string, data: Omit<InspectionFindingProgress, 'id' | 'created_at'>) => {
    const { error: err } = await supabase.from('inspection_finding_progress').insert({
      finding_id: findingId,
      action_date: data.action_date,
      action_type: data.action_type,
      description: data.description,
      photos: data.photos ?? [],
      next_steps: data.next_steps ?? null,
      next_action_date: data.next_action_date ?? null,
    })
    if (err) return { error: err.message }
    // Update finding status
    if (inspection) {
      const f = inspection.findings.find(f => f.id === findingId)
      if (f?.status === 'OPEN') {
        await supabase.from('inspection_findings').update({ status: 'IN_PROGRESS' }).eq('id', findingId)
      }
    }
    await fetchSilent()
    return {}
  }, [inspection, fetchSilent])

  // Submit closing for inspection finding
  const submitFindingClosing = useCallback(async (findingId: string, data: Omit<InspectionFindingClosingReq, 'id' | 'submitted_at' | 'review_decision' | 'rejection_notes' | 'reviewed_at'>) => {
    const { error: err } = await supabase.from('inspection_finding_closing_requests').insert({
      finding_id: findingId,
      action_date: data.action_date,
      summary: data.summary,
      condition_after: data.condition_after,
      evidence_photos: data.evidence_photos,
    })
    if (err) return { error: err.message }
    await supabase.from('inspection_findings').update({ status: 'PENDING_APPROVAL' }).eq('id', findingId)
    await fetchSilent()
    return {}
  }, [fetchSilent])

  // Approve finding closing
  const approveFindingClosing = useCallback(async (findingId: string) => {
    const { error: err } = await supabase.from('inspection_finding_closing_requests')
      .update({ review_decision: 'APPROVED', reviewed_at: new Date().toISOString() })
      .eq('finding_id', findingId)
    if (err) return { error: err.message }
    await supabase.from('inspection_findings').update({
      status: 'CLOSED', closed_at: new Date().toISOString()
    }).eq('id', findingId)
    await fetchSilent()
    return {}
  }, [fetchSilent])

  // Reject finding closing
  const rejectFindingClosing = useCallback(async (findingId: string, notes: string) => {
    const { error: err } = await supabase.from('inspection_finding_closing_requests')
      .update({ review_decision: 'REJECTED', rejection_notes: notes, reviewed_at: new Date().toISOString() })
      .eq('finding_id', findingId)
    if (err) return { error: err.message }
    await supabase.from('inspection_findings').update({ status: 'IN_PROGRESS' }).eq('id', findingId)
    await fetchSilent()
    return {}
  }, [fetchSilent])

  return {
    inspection, loading, error, refetch: fetchOne,
    approveInspection, addFinding,
    addFindingProgress, submitFindingClosing, approveFindingClosing, rejectFindingClosing,
  }
}

// ── Create internal inspection ───────────────────────────────────────────────
export async function createInternalInspection(data: {
  vessel_id: string; vessel_name?: string; business_unit_id: string; inspection_date: string
  lead_inspector_id: string; inspector_ids: string[]; status: string
  result?: string; total_items_checked: number; items_satisfactory: number
  items_deficient: number; notes?: string; created_by: string
  findings?: Omit<InspectionFinding, 'id' | 'created_at' | 'progress_entries' | 'closing_request'>[]
}): Promise<{ id?: string; error?: string }> {
  // Kapal dari SMS API (id integer) → simpan snapshot, FK vessel_id null.
  const vesselExternalId = data.vessel_id ? Number(data.vessel_id) : null
  // Generate reference_no
  const { count } = await supabase.from('internal_inspections')
    .select('*', { count: 'exact', head: true })
    .eq('vessel_external_id', vesselExternalId)

  const d = new Date(data.inspection_date)
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  const seq = String((count ?? 0) + 1).padStart(3, '0')
  const reference_no = `INSP/INT/SHP/${ym}/${seq}`

  const { data: inserted, error } = await supabase.from('internal_inspections').insert({
    reference_no,
    vessel_id: null,
    vessel_name: data.vessel_name ?? null,
    vessel_external_id: vesselExternalId,
    business_unit_id: data.business_unit_id,
    inspection_date: data.inspection_date,
    lead_inspector: data.lead_inspector_id,
    status: data.status,
    result: data.result ?? null,
    total_items_checked: data.total_items_checked,
    items_satisfactory: data.items_satisfactory,
    items_deficient: data.items_deficient,
    notes: data.notes ?? null,
    approved_by: null,
    approved_at: null,
    created_by: data.created_by,
  }).select('id').single()

  if (error) return { error: error.message }
  const inspId = inserted!.id

  // Insert inspectors
  if (data.inspector_ids.length > 0) {
    await supabase.from('internal_inspection_inspectors').insert(
      data.inspector_ids.map(uid => ({ inspection_id: inspId, user_id: uid }))
    )
  }

  // Insert findings
  if (data.findings && data.findings.length > 0) {
    await supabase.from('inspection_findings').insert(
      data.findings.map(f => ({
        internal_inspection_id: inspId,
        external_inspection_id: null,
        area: f.area,
        description: f.description,
        priority: f.priority,
        status: f.status,
        assigned_to: f.assigned_to ?? null,
        target_close_date: f.target_close_date,
        initial_photos: f.initial_photos ?? [],
        closing_evidence: [],
      }))
    )
  }

  return { id: inspId }
}
