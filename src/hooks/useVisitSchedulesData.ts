// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { VisitSchedule, VesselVisitCompliance } from '@/types'

const SCHEDULE_SELECT = '*'

const COMPLIANCE_SELECT = '*'

function mapSchedule(row: unknown): VisitSchedule {
  const r = row as Record<string, unknown>
  return {
    ...(r as unknown as VisitSchedule),
    vessel: r.vessel_name ? ({ name: r.vessel_name } as VisitSchedule['vessel']) : undefined,
    fleet: r.fleet_name ? ({ name: r.fleet_name } as VisitSchedule['fleet']) : undefined,
    op_head: undefined,
    created_by_user: undefined,
  }
}

function mapCompliance(row: unknown): VesselVisitCompliance {
  return row as VesselVisitCompliance
}

export function useVisitSchedulesData() {
  const [schedules, setSchedules] = useState<VisitSchedule[]>([])
  const [compliance, setCompliance] = useState<VesselVisitCompliance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [schedulesRes, complianceRes] = await Promise.all([
      supabase.from('visit_schedules').select(SCHEDULE_SELECT).order('scheduled_date', { ascending: false }),
      supabase.from('vessel_visit_compliance').select(COMPLIANCE_SELECT).order('visit_date', { ascending: false }),
    ])
    if (schedulesRes.error) { setError(schedulesRes.error.message); setLoading(false); return }
    setSchedules((schedulesRes.data ?? []).map(mapSchedule))
    setCompliance((complianceRes.data ?? []).map(mapCompliance))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const createSchedule = useCallback(async (data: {
    vessel_id: string; vessel_name?: string; fleet_id: string; fleet_name?: string; op_head_user_id?: string
    scheduled_date: string; period_month: number; period_year: number
    status?: string; notes?: string; created_by: string
  }) => {
    // Kapal & armada dari SMS API (id integer) → simpan snapshot, FK dibiarkan null.
    const { error: err } = await supabase.from('visit_schedules').insert({
      vessel_id: null,
      vessel_name: data.vessel_name ?? null,
      vessel_external_id: data.vessel_id ? Number(data.vessel_id) : null,
      fleet_id: null,
      fleet_name: data.fleet_name ?? null,
      fleet_external_id: data.fleet_id ? Number(data.fleet_id) : null,
      op_head_user_id: data.op_head_user_id ?? null,
      scheduled_date: data.scheduled_date,
      period_month: data.period_month,
      period_year: data.period_year,
      visit_id: null,
      status: data.status ?? 'PLANNED',
      notes: data.notes ?? null,
      created_by: data.created_by,
    })
    if (err) return { error: err.message }
    await fetchAll()
    return {}
  }, [fetchAll])

  const linkVisit = useCallback(async (scheduleId: string, visitId: string) => {
    const { error: err } = await supabase.from('visit_schedules')
      .update({ visit_id: visitId, status: 'COMPLETED' })
      .eq('id', scheduleId)
    if (err) return { error: err.message }
    await fetchAll()
    return {}
  }, [fetchAll])

  return { schedules, compliance, loading, error, refetch: fetchAll, createSchedule, linkVisit }
}
