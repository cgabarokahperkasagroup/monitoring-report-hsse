const SMS_API_BASE = 'https://sms.barokahmarineconsulting.com/api'
const SMS_TOKEN = 'wfbUyOgXGUzoGbToVhoZ34PiSZrmQd93VAMk0f7J2w1ca84tywwzQyOc5Oe02dwx'

export interface SmsShip {
  id: number
  name: string
  fleet: { id: number; name: string }
  operation_head: { id: number; name: string } | null
  ship_type: { code: string; name: string } | null
  headcount: { code: string; name: string } | null
}

export async function fetchShips(): Promise<SmsShip[]> {
  const res = await fetch(`${SMS_API_BASE}/csbd/ships`, {
    headers: {
      Authorization: `Bearer ${SMS_TOKEN}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Gagal mengambil data kapal (HTTP ${res.status})`)
  const json = await res.json()
  return json.data as SmsShip[]
}
