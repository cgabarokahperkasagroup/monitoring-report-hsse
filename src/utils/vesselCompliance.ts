import type { SmsShip } from '@/services/smsApi'

export interface ComplianceVisit {
  vessel_external_id: number | null
  visit_date: string
}

export interface VesselStatus {
  ship: SmsShip
  visited: boolean
  /** Tanggal kunjungan terakhir dalam periode, bila ada. */
  visitDate?: string
}

export interface FleetCompliance {
  fleet: { id: number; name: string; opHeadName: string | null }
  opHeadName: string | null
  ships: SmsShip[]
  allVesselStatus: VesselStatus[]
  /** Persentase kapal di fleet yang dikunjungi minimal sekali, dibulatkan. */
  compliance: number
  visited: number
}

/**
 * Kepatuhan kunjungan per fleet: berapa persen kapal di fleet itu yang
 * dikunjungi minimal sekali dalam periode.
 *
 * Satu sumber hitungan untuk layar Kepatuhan Kapal dan laporan ekspornya,
 * supaya angka di file selalu sama dengan angka di layar.
 */
export function computeFleetCompliance(
  ships: SmsShip[],
  visits: ComplianceVisit[],
  fleetFilter: string = 'ALL',
): FleetCompliance[] {
  const fleets = new Map<number, { id: number; name: string; opHeadName: string | null }>()
  ships.forEach(s => {
    if (!fleets.has(s.fleet.id)) {
      fleets.set(s.fleet.id, { id: s.fleet.id, name: s.fleet.name, opHeadName: s.operation_head?.name ?? null })
    }
  })

  // Kunjungan terakhir per kapal dalam periode.
  const lastVisit = new Map<number, string>()
  visits.forEach(v => {
    if (v.vessel_external_id == null) return
    const prev = lastVisit.get(v.vessel_external_id)
    if (!prev || v.visit_date > prev) lastVisit.set(v.vessel_external_id, v.visit_date)
  })

  return [...fleets.values()]
    .sort((a, b) => a.id - b.id)
    .filter(f => fleetFilter === 'ALL' || String(f.id) === fleetFilter)
    .map(fleet => {
      const fleetShips = ships.filter(s => s.fleet.id === fleet.id)
      const allVesselStatus = fleetShips.map(ship => {
        const visitDate = lastVisit.get(ship.id)
        return { ship, visited: !!visitDate, visitDate }
      })
      const visited = allVesselStatus.filter(s => s.visited).length
      return {
        fleet,
        opHeadName: fleet.opHeadName,
        ships: fleetShips,
        allVesselStatus,
        compliance: fleetShips.length > 0 ? Math.round((visited / fleetShips.length) * 100) : 0,
        visited,
      }
    })
}
