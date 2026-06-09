// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { PISFinding, PISProgressEntry, PISClosingRequest, PISFindingStatus } from '@/types'

const PIS_SELECT = `
  *,
  progress_entries:pis_progress_entries(*),
  closing_request:pis_closing_requests(*)
`

function mapPISFinding(row: unknown): PISFinding {
  const r = row as Record<string, unknown>
  const closingRaw = r.closing_request as Record<string, unknown>[] | Record<string, unknown> | null
  const closing = Array.isArray(closingRaw) ? closingRaw[0] : closingRaw
  return {
    ...(r as unknown as PISFinding),
    progress_entries: ((r.progress_entries as unknown[]) ?? []).map(p => p as unknown as PISProgressEntry),
    closing_request: closing ? (closing as unknown as PISClosingRequest) : undefined,
  }
}

// ── Shared state (module-level cache so all hooks see the same data) ─────────
let _findings: PISFinding[] = []
let _listeners: Array<(f: PISFinding[]) => void> = []

function notify(updated: PISFinding[]) {
  _findings = updated
  _listeners.forEach(fn => fn(updated))
}

export function usePISFindingsData() {
  const [findings, setFindings] = useState<PISFinding[]>(_findings)
  const [loading, setLoading] = useState(_findings.length === 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const listener = (f: PISFinding[]) => setFindings(f)
    _listeners.push(listener)
    return () => { _listeners = _listeners.filter(l => l !== listener) }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('pis_findings')
      .select(PIS_SELECT)
      .order('no', { ascending: true })
    if (err) { setError(err.message); setLoading(false); return }
    const mapped = (data ?? []).map(mapPISFinding)
    notify(mapped)
    setFindings(mapped)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const getFindingById = useCallback((id: string) => {
    return findings.find(f => f.id === id)
  }, [findings])

  // ── Get next auto-increment no ─────────────────────────────────────────────
  const getNextNo = useCallback(async (): Promise<number> => {
    const { data } = await supabase
      .from('pis_findings')
      .select('no')
      .order('no', { ascending: false })
      .limit(1)
    return data?.[0]?.no ? data[0].no + 1 : 1
  }, [])

  // ── Add finding ────────────────────────────────────────────────────────────
  const addFinding = useCallback(async (data: Omit<PISFinding, 'id' | 'no' | 'created_at' | 'updated_at' | 'progress_entries' | 'closing_request'>) => {
    const no = await getNextNo()
    const { error: err } = await supabase.from('pis_findings').insert({ ...data, no })
    if (err) return { error: err.message }
    await fetchAll()
    return {}
  }, [getNextNo, fetchAll])

  // ── Update finding ─────────────────────────────────────────────────────────
  const updateFinding = useCallback(async (id: string, data: Partial<PISFinding>) => {
    const { error: err } = await supabase.from('pis_findings')
      .update({ ...data, updated_at: new Date().toISOString().split('T')[0] })
      .eq('id', id)
    if (err) return { error: err.message }
    await fetchAll()
    return {}
  }, [fetchAll])

  // ── Delete finding ─────────────────────────────────────────────────────────
  const deleteFinding = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('pis_findings').delete().eq('id', id)
    if (err) return { error: err.message }
    await fetchAll()
    return {}
  }, [fetchAll])

  // ── Add progress ───────────────────────────────────────────────────────────
  const addProgress = useCallback(async (id: string, data: Omit<PISProgressEntry, 'id' | 'created_at'>) => {
    const { error: err } = await supabase.from('pis_progress_entries').insert({
      pis_finding_id: id,
      action_date: data.action_date,
      description: data.description,
      action_by: data.action_by,
    })
    if (err) return { error: err.message }
    // Update status to ON_PROSES if OPEN
    const f = findings.find(f => f.id === id)
    if (f?.status === 'OPEN') {
      await supabase.from('pis_findings').update({ status: 'ON_PROSES', updated_at: new Date().toISOString().split('T')[0] }).eq('id', id)
    }
    await fetchAll()
    return {}
  }, [findings, fetchAll])

  // ── Submit closing ─────────────────────────────────────────────────────────
  const submitClosing = useCallback(async (id: string, data: Omit<PISClosingRequest, 'id' | 'submitted_at' | 'review_decision' | 'rejection_notes' | 'reviewed_at'>) => {
    const { error: err } = await supabase.from('pis_closing_requests').insert({
      pis_finding_id: id,
      actual_closed_date: data.actual_closed_date,
      summary: data.summary,
      catatan: data.catatan,
      submitted_by: data.submitted_by,
    })
    if (err) return { error: err.message }
    await supabase.from('pis_findings').update({ status: 'PROCESS_APPROVAL', updated_at: new Date().toISOString().split('T')[0] }).eq('id', id)
    await fetchAll()
    return {}
  }, [fetchAll])

  // ── Approve closing ────────────────────────────────────────────────────────
  const approveClosing = useCallback(async (id: string) => {
    const f = findings.find(fi => fi.id === id)
    const { error: err } = await supabase.from('pis_closing_requests')
      .update({ review_decision: 'APPROVED', reviewed_at: new Date().toISOString() })
      .eq('pis_finding_id', id)
    if (err) return { error: err.message }
    await supabase.from('pis_findings').update({
      status: 'CLOSED' as PISFindingStatus,
      actual_closed_date: f?.closing_request?.actual_closed_date ?? new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    }).eq('id', id)
    await fetchAll()
    return {}
  }, [findings, fetchAll])

  // ── Reject closing ─────────────────────────────────────────────────────────
  const rejectClosing = useCallback(async (id: string, notes: string) => {
    const { error: err } = await supabase.from('pis_closing_requests')
      .update({ review_decision: 'REJECTED', rejection_notes: notes, reviewed_at: new Date().toISOString() })
      .eq('pis_finding_id', id)
    if (err) return { error: err.message }
    await supabase.from('pis_findings').update({ status: 'ON_PROSES', updated_at: new Date().toISOString().split('T')[0] }).eq('id', id)
    await fetchAll()
    return {}
  }, [fetchAll])

  return {
    findings, loading, error, refetch: fetchAll, getFindingById,
    addFinding, updateFinding, deleteFinding,
    addProgress, submitClosing, approveClosing, rejectClosing,
  }
}

// Re-export helpers from pisKapalStore so pages don't need to change imports
export {
  getPISStatusLabel, getPISStatusColor,
  getPISTemuanLabel, getPISTemuanColor,
  getPISPerusahaanColor,
} from '@/stores/pisKapalStore'
