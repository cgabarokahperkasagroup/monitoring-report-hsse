// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { InternalInspectionSchedule } from '@/types'

// vessel:vessels(*) dan fleet:fleets(*) dihapus — FK ada di schema monitoring-hsse
// yang tidak bisa di-resolve PostgREST dari public view. Gunakan snapshot vessel_name/fleet_name.
const SCHEDULE_SELECT = `
  *,
  hse_officer:users!internal_inspection_schedules_hse_officer_id_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at),
  created_by_user:users!internal_inspection_schedules_created_by_fkey(id, full_name, email, role, is_active, must_change_password, created_at, updated_at)
`

function mapUser(u: Record<string, unknown> | null) {
  if (!u) return undefined
  return { ...u, business_units: [] } as unknown as import('@/types').User
}

function mapSchedule(row: unknown): InternalInspectionSchedule {
  const r = row as Record<string, unknown>
  return {
    ...(r as unknown as InternalInspectionSchedule),
    vessel: (r.vessel as InternalInspectionSchedule['vessel'])
      ?? (r.vessel_name ? ({ name: r.vessel_name } as InternalInspectionSchedule['vessel']) : undefined),
    fleet: (r.fleet as InternalInspectionSchedule['fleet'])
      ?? (r.fleet_name ? ({ name: r.fleet_name } as InternalInspectionSchedule['fleet']) : undefined),
    hse_officer: mapUser(r.hse_officer as Record<string, unknown> | null),
    created_by_user: mapUser(r.created_by_user as Record<string, unknown> | null),
  }
}

export function useInspectionSchedulesData() {
  const [schedules, setSchedules] = useState<InternalInspectionSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('internal_inspection_schedules')
      .select(SCHEDULE_SELECT)
      .order('scheduled_date', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setSchedules((data ?? []).map(mapSchedule))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const createSchedule = useCallback(async (data: {
    vessel_id: string; vessel_name?: string; fleet_id: string; fleet_name?: string; hse_officer_id?: string
    scheduled_date: string; period_month: number; period_year: number
    status?: string; notes?: string; created_by: string
  }) => {
    // Kapal & armada dari SMS API (id integer) → simpan snapshot, FK dibiarkan null.
    const { error: err } = await supabase.from('internal_inspection_schedules').insert({
      vessel_id: null,
      vessel_name: data.vessel_name ?? null,
      vessel_external_id: data.vessel_id ? Number(data.vessel_id) : null,
      fleet_id: null,
      fleet_name: data.fleet_name ?? null,
      fleet_external_id: data.fleet_id ? Number(data.fleet_id) : null,
      hse_officer_id: data.hse_officer_id ?? null,
      scheduled_date: data.scheduled_date,
      period_month: data.period_month,
      period_year: data.period_year,
      inspection_id: null,
      status: data.status ?? 'PLANNED',
      notes: data.notes ?? null,
      created_by: data.created_by,
    })
    if (err) return { error: err.message }
    await fetchAll()
    return {}
  }, [fetchAll])

  const linkInspection = useCallback(async (scheduleId: string, inspectionId: string) => {
    const { error: err } = await supabase.from('internal_inspection_schedules')
      .update({ inspection_id: inspectionId, status: 'COMPLETED' })
      .eq('id', scheduleId)
    if (err) return { error: err.message }
    await fetchAll()
    return {}
  }, [fetchAll])

  return { schedules, loading, error, refetch: fetchAll, createSchedule, linkInspection }
}
