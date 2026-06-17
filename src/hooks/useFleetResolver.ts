import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useShips, findShipById } from '@/hooks/useShips'

interface FleetRow {
  id: string
  op_head_user_id: string | null
  hse_officer_id: string | null
  fleet_external_id: number | null
}

/**
 * Memuat daftar fleet monitoring dan menyediakan:
 * - resolveFleetId(vesselId): UUID fleet dari kapal SMS terpilih (untuk diisi ke kolom fleet_id)
 * - restrictToFleetExtId: id fleet SMS yang membatasi pilihan kapal untuk OP_HEAD/STAFF_HSSE
 * Dipakai pada form input yang berbasis kapal (visit & inspeksi) agar selaras dengan RLS per-fleet.
 */
export function useFleetResolver() {
  const { user } = useAuthStore()
  const { ships } = useShips()
  const [fleets, setFleets] = useState<FleetRow[]>([])

  useEffect(() => {
    supabase.from('fleets').select('id, op_head_user_id, hse_officer_id, fleet_external_id')
      .then(({ data }) => { if (data) setFleets(data as FleetRow[]) })
  }, [])

  // Fleet yang menjadi tanggung jawab user (OP_HEAD memimpin / STAFF_HSSE menangani / users.fleet_id).
  const myFleets = useMemo(
    () => (user ? fleets.filter(f => f.op_head_user_id === user.id || f.hse_officer_id === user.id || f.id === user.fleet_id) : []),
    [fleets, user],
  )

  // OP_HEAD & STAFF_HSSE hanya boleh memilih kapal pada fleet-nya.
  const restrictToFleetExtId = useMemo(
    () => ((user?.role === 'OP_HEAD' || user?.role === 'STAFF_HSSE')
      ? (myFleets.map(f => f.fleet_external_id).find(Boolean) ?? null)
      : null),
    [user, myFleets],
  )

  function resolveFleetId(vesselId: string): string | null {
    const ship = findShipById(ships, vesselId)
    if (!ship) return null
    return fleets.find(f => f.fleet_external_id === ship.fleet.id)?.id ?? null
  }

  return { fleets, myFleets, restrictToFleetExtId, resolveFleetId }
}
