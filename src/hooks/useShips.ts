import { useState, useEffect } from 'react'
import { fetchShips, type SmsShip } from '@/services/smsApi'

let _cache: SmsShip[] | null = null
let _promise: Promise<SmsShip[]> | null = null

export type { SmsShip }

export interface UseShipsResult {
  ships: SmsShip[]
  loading: boolean
  error: string | null
}

export function useShips(): UseShipsResult {
  const [ships, setShips] = useState<SmsShip[]>(_cache ?? [])
  const [loading, setLoading] = useState(_cache === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (_cache !== null) return
    if (!_promise) _promise = fetchShips()
    _promise
      .then(data => { _cache = data; setShips(data) })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { ships, loading, error }
}

export function getFleetOptions(ships: SmsShip[]) {
  const map = new Map<number, string>()
  ships.forEach(s => map.set(s.fleet.id, s.fleet.name))
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, name]) => ({ value: String(id), label: name }))
}

export function shipOptions(ships: SmsShip[], fleetId?: string) {
  const filtered = fleetId
    ? ships.filter(s => String(s.fleet.id) === fleetId)
    : ships
  return filtered
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(s => ({ value: String(s.id), label: `${s.name}${s.ship_type ? ` (${s.ship_type.code})` : ''}` }))
}

export function findShipById(ships: SmsShip[], id: string) {
  return ships.find(s => String(s.id) === id) ?? null
}
