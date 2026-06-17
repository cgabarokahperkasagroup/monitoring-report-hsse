// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ExternalInspection, InspectionFinding, InspectionFindingProgress, InspectionFindingClosingReq } from '@/types'

const EXTERNAL_SELECT = `
  *,
  created_by_user:users(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
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

export function mapExternalInspection(row: unknown): ExternalInspection {
  const r = row as Record<string, unknown>
  return {
    ...(r as unknown as ExternalInspection),
    vessel: r.vessel_name
      ? ({ id: String(r.vessel_external_id ?? ''), name: r.vessel_name as string, vessel_type: null } as unknown as ExternalInspection['vessel'])
      : undefined,
    business_unit: undefined,
    created_by_user: mapUser(r.created_by_user as Record<string, unknown> | null),
    findings: ((r.findings as unknown[]) ?? []).map(mapInspectionFinding),
  }
}

export function useExternalInspectionsData() {
  const [inspections, setInspections] = useState<ExternalInspection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('external_inspections')
      .select(EXTERNAL_SELECT)
      .order('inspection_date', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setInspections((data ?? []).map(mapExternalInspection))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { inspections, loading, error, refetch: fetchAll }
}

export function useExternalInspection(id: string | undefined) {
  const [inspection, setInspection] = useState<ExternalInspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOne = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('external_inspections')
      .select(EXTERNAL_SELECT)
      .eq('id', id)
      .single()
    if (err) { setError(err.message); setLoading(false); return }
    setInspection(mapExternalInspection(data))
    setLoading(false)
  }, [id])

  // Background refresh — no loading spinner, used after mutations
  const fetchSilent = useCallback(async () => {
    if (!id) return
    const { data, error: err } = await supabase
      .from('external_inspections')
      .select(EXTERNAL_SELECT)
      .eq('id', id)
      .single()
    if (!err && data) setInspection(mapExternalInspection(data))
  }, [id])

  useEffect(() => { fetchOne() }, [fetchOne])

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
    await fetchSilent()
    return {}
  }, [fetchSilent])

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

  const approveFindingClosing = useCallback(async (findingId: string) => {
    const { error: err } = await supabase.from('inspection_finding_closing_requests')
      .update({ review_decision: 'APPROVED', reviewed_at: new Date().toISOString() })
      .eq('finding_id', findingId)
    if (err) return { error: err.message }
    await supabase.from('inspection_findings').update({ status: 'CLOSED', closed_at: new Date().toISOString() }).eq('id', findingId)
    await fetchSilent()
    return {}
  }, [fetchSilent])

  const rejectFindingClosing = useCallback(async (findingId: string, notes: string) => {
    const { error: err } = await supabase.from('inspection_finding_closing_requests')
      .update({ review_decision: 'REJECTED', rejection_notes: notes, reviewed_at: new Date().toISOString() })
      .eq('finding_id', findingId)
    if (err) return { error: err.message }
    await supabase.from('inspection_findings').update({ status: 'IN_PROGRESS' }).eq('id', findingId)
    await fetchSilent()
    return {}
  }, [fetchSilent])

  return { inspection, loading, error, refetch: fetchOne, addFindingProgress, submitFindingClosing, approveFindingClosing, rejectFindingClosing }
}

export async function createExternalInspection(data: {
  vessel_id: string; vessel_name?: string; business_unit_id: string; inspection_type: string
  inspection_date: string; inspecting_body: string; lead_inspector?: string
  port?: string; status: string; result?: string
  total_observations: number; critical_observations: number
  major_observations: number; minor_observations: number
  validity_date?: string; next_inspection_date?: string
  report_no?: string; notes?: string; actions_taken?: string; created_by: string; fleet_id?: string | null
  findings?: Omit<InspectionFinding, 'id' | 'created_at' | 'progress_entries' | 'closing_request'>[]
}): Promise<{ id?: string; error?: string }> {
  // Kapal dari SMS API (id integer) → simpan snapshot, FK vessel_id null.
  const vesselExternalId = data.vessel_id ? Number(data.vessel_id) : null
  const { count } = await supabase.from('external_inspections')
    .select('*', { count: 'exact', head: true })
    .eq('vessel_external_id', vesselExternalId)

  const d = new Date(data.inspection_date)
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  const seq = String((count ?? 0) + 1).padStart(3, '0')
  const reference_no = `INSP/EXT/${data.inspection_type}/SHP/${ym}/${seq}`

  const { data: inserted, error } = await supabase.from('external_inspections').insert({
    reference_no,
    vessel_id: null,
    vessel_name: data.vessel_name ?? null,
    vessel_external_id: vesselExternalId,
    business_unit_id: data.business_unit_id,
    inspection_type: data.inspection_type,
    inspection_date: data.inspection_date,
    inspecting_body: data.inspecting_body,
    lead_inspector: data.lead_inspector ?? null,
    port: data.port ?? null,
    status: data.status,
    result: data.result ?? null,
    total_observations: data.total_observations,
    critical_observations: data.critical_observations,
    major_observations: data.major_observations,
    minor_observations: data.minor_observations,
    validity_date: data.validity_date ?? null,
    next_inspection_date: data.next_inspection_date ?? null,
    report_no: data.report_no ?? null,
    notes: data.notes ?? null,
    actions_taken: data.actions_taken ?? null,
    created_by: data.created_by,
    fleet_id: data.fleet_id ?? null,
  }).select('id').single()

  if (error) return { error: error.message }
  const inspId = inserted!.id

  if (data.findings && data.findings.length > 0) {
    await supabase.from('inspection_findings').insert(
      data.findings.map(f => ({
        internal_inspection_id: null,
        external_inspection_id: inspId,
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
