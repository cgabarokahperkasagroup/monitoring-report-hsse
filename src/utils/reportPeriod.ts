export type PeriodType = 'month' | 'year' | 'range'

export interface PeriodInput {
  type: PeriodType
  month: number   // 1–12, dipakai bila type = 'month'
  year: number
  dateFrom?: string
  dateTo?: string
}

export interface ResolvedPeriod {
  /** Batas bawah inklusif, format YYYY-MM-DD. */
  from: string
  /** Batas atas inklusif, format YYYY-MM-DD. */
  to: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Tanggal terakhir di bulan tersebut (28–31), bukan asal "31". */
export function lastDayOfMonth(year: number, month: number): number {
  // Hari ke-0 bulan berikutnya = hari terakhir bulan ini.
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Ubah pilihan periode di UI menjadi rentang tanggal yang valid.
 *
 * Postgres menolak tanggal seperti '2026-09-31' (error 22008), jadi batas atas
 * bulan harus dihitung, tidak boleh di-hardcode 31. Mengembalikan null bila
 * rentang manual belum lengkap atau terbalik.
 */
export function resolvePeriod(p: PeriodInput): ResolvedPeriod | null {
  if (p.type === 'month') {
    return {
      from: `${p.year}-${pad(p.month)}-01`,
      to: `${p.year}-${pad(p.month)}-${pad(lastDayOfMonth(p.year, p.month))}`,
    }
  }
  if (p.type === 'year') {
    return { from: `${p.year}-01-01`, to: `${p.year}-12-31` }
  }
  if (!p.dateFrom || !p.dateTo || p.dateFrom > p.dateTo) return null
  return { from: p.dateFrom, to: p.dateTo }
}
