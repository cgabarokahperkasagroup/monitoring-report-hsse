// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Finding, FindingProgressEntry, FindingClosingRequest } from '@/types'

const FINDING_SELECT = `
  *,
  visit:visits(id, reference_no, visit_type, visit_date),
  business_unit:business_units_mh(*),
  assigned_to_user:users!findings_assigned_to_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
  created_by_user:users!findings_created_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
  closed_by_user:users!findings_closed_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
  progress_entries:finding_progress_entries(
    *, created_by_user:users!finding_progress_entries_created_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at)
  ),
  closing_request:finding_closing_requests(
    *,
    submitted_by_user:users!finding_closing_requests_submitted_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
    reviewed_by_user:users!finding_closing_requests_reviewed_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at)
  )
`

function mapUser(u: Record<string, unknown> | null) {
  if (!u) return undefined
  return { ...u, business_units: [] } as unknown as import('@/types').User
}

export function mapFinding(row: unknown): Finding {
  const r = row as Record<string, unknown>
  const visitRaw = r.visit as Record<string, unknown> | null
  return {
    ...(r as unknown as Finding),
    visit: visitRaw ? { ...(visitRaw as unknown as import('@/types').Visit) } : undefined,
    business_unit: (r.business_unit as Finding['business_unit']) ?? undefined,
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

// ── List hook ────────────────────────────────────────────────────────────────
export function useFindingsData(options?: { visitId?: string; assignedTo?: string; ownerOnly?: boolean }) {
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase.from('findings').select(FINDING_SELECT).order('created_at', { ascending: false })
    if (options?.visitId) query = query.eq('visit_id', options.visitId)
    if (options?.assignedTo) query = query.eq('assigned_to', options.assignedTo)
    if (options?.ownerOnly) query = query.eq('is_owner_finding', true)

    const { data, error: err } = await query
    if (err) { setError(err.message); setLoading(false); return }
    setFindings((data ?? []).map(mapFinding))
    setLoading(false)
  }, [options?.visitId, options?.assignedTo, options?.ownerOnly])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { findings, loading, error, refetch: fetchAll }
}

// ── Detail hook ──────────────────────────────────────────────────────────────
export function useFinding(id: string | undefined) {
  const [finding, setFinding] = useState<Finding | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOne = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('findings')
      .select(FINDING_SELECT)
      .eq('id', id)
      .single()
    if (err) { setError(err.message); setLoading(false); return }
    setFinding(mapFinding(data))
    setLoading(false)
  }, [id])

  useEffect(() => { fetchOne() }, [fetchOne])

  // Add progress entry
  const addProgress = useCallback(async (data: {
    action_date: string; action_type: string; description: string
    photos?: string[]; next_steps?: string; next_action_date?: string; created_by: string
  }) => {
    if (!id || !finding) return { error: 'No finding' }
    const { error: err } = await supabase.from('finding_progress_entries').insert({
      finding_id: id,
      action_date: data.action_date,
      action_type: data.action_type,
      description: data.description,
      photos: data.photos ?? [],
      next_steps: data.next_steps ?? null,
      next_action_date: data.next_action_date ?? null,
      created_by: data.created_by,
    })
    if (err) return { error: err.message }

    // Update finding status to IN_PROGRESS if OPEN
    if (finding.status === 'OPEN') {
      await supabase.from('findings').update({ status: 'IN_PROGRESS' }).eq('id', id)
    }
    await fetchOne()
    return {}
  }, [id, finding, fetchOne])

  // Submit closing request
  const submitClosing = useCallback(async (data: {
    action_date: string; summary: string; condition_after: string
    evidence_photos: string[]; evidence_documents?: string[]; submitted_by: string
  }) => {
    if (!id) return { error: 'No finding' }
    const { error: err } = await supabase.from('finding_closing_requests').insert({
      finding_id: id,
      action_date: data.action_date,
      summary: data.summary,
      condition_after: data.condition_after,
      evidence_photos: data.evidence_photos,
      evidence_documents: data.evidence_documents ?? [],
      submitted_by: data.submitted_by,
    })
    if (err) return { error: err.message }
    await supabase.from('findings').update({ status: 'PENDING_APPROVAL' }).eq('id', id)
    await fetchOne()
    return {}
  }, [id, fetchOne])

  // Approve closing
  const approveClosing = useCallback(async (reviewerId: string) => {
    if (!id || !finding?.closing_request) return { error: 'No closing request' }
    const { error: err } = await supabase.from('finding_closing_requests')
      .update({ review_decision: 'APPROVED', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
      .eq('finding_id', id)
    if (err) return { error: err.message }
    await supabase.from('findings').update({
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      closed_by: reviewerId,
      closing_evidence: finding.closing_request.evidence_photos,
      closing_notes: finding.closing_request.summary,
    }).eq('id', id)
    await fetchOne()
    return {}
  }, [id, finding, fetchOne])

  // Reject closing
  const rejectClosing = useCallback(async (reviewerId: string, rejectionNotes: string) => {
    if (!id || !finding?.closing_request) return { error: 'No closing request' }
    const { error: err } = await supabase.from('finding_closing_requests')
      .update({ review_decision: 'REJECTED', reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), rejection_notes: rejectionNotes })
      .eq('finding_id', id)
    if (err) return { error: err.message }
    await supabase.from('findings').update({ status: 'IN_PROGRESS' }).eq('id', id)
    await fetchOne()
    return {}
  }, [id, finding, fetchOne])

  // Add/replace initial photos
  const updateInitialPhotos = useCallback(async (newUrls: string[]) => {
    if (!id) return { error: 'No finding' }
    const merged = [...(finding?.initial_photos ?? []), ...newUrls]
    const { error: err } = await supabase
      .from('findings')
      .update({ initial_photos: merged })
      .eq('id', id)
    if (err) return { error: err.message }
    await fetchOne()
    return {}
  }, [id, finding, fetchOne])

  return { finding, loading, error, refetch: fetchOne, addProgress, submitClosing, approveClosing, rejectClosing, updateInitialPhotos }
}
