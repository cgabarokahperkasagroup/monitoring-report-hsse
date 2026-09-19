/**
 * Penyimpanan isian laporan inspeksi kunjungan (checklist, diskusi, keluhan,
 * foto) di database. Sebelumnya isian ini hanya ada di sessionStorage tab
 * browser dan hilang saat tab ditutup.
 */
import { supabaseClient, uploadPhotos } from '@/lib/supabase'
import { compressImage } from '@/utils/imageCompress'
import {
  defaultInspectionData, inspectionStorageKey,
  type AreaCheck, type VesselInspectionData,
} from '@/data/vesselInspectionConstants'

const PHOTO_BUCKET = 'finding-photos'
const photoFolder = (visitId: string) => `visit-reports/${visitId}`

// View public ini tidak ada di database.types.ts; satu cast menahannya di sini.
const db = supabaseClient as unknown as { from: (table: string) => any }

export interface StoredReport {
  data: VesselInspectionData
  updatedAt: string | null
}

/**
 * Samakan panjang tiap daftar jawaban dengan checklist saat ini. Jawaban
 * disimpan per nomor urut, jadi data lama yang lebih pendek/panjang tidak boleh
 * membuat baris checklist kehilangan jawabannya atau salah tempat.
 */
function normalize(raw: Partial<VesselInspectionData> | null | undefined, fallback: VesselInspectionData): VesselInspectionData {
  const fit = (arr: unknown, base: AreaCheck[]): AreaCheck[] =>
    base.map((b, i) => {
      const v = Array.isArray(arr) ? (arr[i] as Partial<AreaCheck> | undefined) : undefined
      const yn: AreaCheck['yn'] = v?.yn === 'Y' || v?.yn === 'N' ? v.yn : ''
      return { yn, notes: typeof v?.notes === 'string' ? v.notes : b.notes }
    })
  return {
    prepOffice: fit(raw?.prepOffice, fallback.prepOffice),
    prepVessel: fit(raw?.prepVessel, fallback.prepVessel),
    areas: fit(raw?.areas, fallback.areas),
    discussion: typeof raw?.discussion === 'string' ? raw.discussion : fallback.discussion,
    complaints: typeof raw?.complaints === 'string' ? raw.complaints : fallback.complaints,
    visitPhotos: Array.isArray(raw?.visitPhotos) ? raw.visitPhotos.filter(p => typeof p === 'string') : [],
    attendancePhotos: Array.isArray(raw?.attendancePhotos) ? raw.attendancePhotos.filter(p => typeof p === 'string') : [],
  }
}

export async function fetchInspectionReport(
  visitId: string, agenda?: string, summary?: string,
): Promise<StoredReport | null> {
  const { data, error } = await db.from('visit_inspection_reports')
    .select('data, updated_at')
    .eq('visit_id', visitId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return { data: normalize(data.data, defaultInspectionData(agenda, summary)), updatedAt: data.updated_at }
}

export async function saveInspectionReport(visitId: string, report: VesselInspectionData): Promise<string> {
  const { data, error } = await db.from('visit_inspection_reports')
    .upsert({ visit_id: visitId, data: report }, { onConflict: 'visit_id' })
    .select('updated_at')
    .single()
  if (error) throw new Error(error.message)
  return data.updated_at as string
}

/** Kompres lalu unggah foto laporan ke Storage; mengembalikan URL bertanda tangan. */
export async function uploadReportPhotos(visitId: string, files: File[]): Promise<string[]> {
  const compressed = await Promise.all(files.filter(f => f.type.startsWith('image/')).map(f => compressImage(f)))
  const { urls, error } = await uploadPhotos(PHOTO_BUCKET, photoFolder(visitId), compressed)
  if (error) throw new Error(error)
  return urls
}

function dataUrlToFile(dataUrl: string, name: string): File | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) return null
  const bin = atob(m[2])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], name, { type: m[1] })
}

/**
 * Isian versi lama yang masih tertinggal di sessionStorage tab ini, bila ada.
 * Foto base64 di dalamnya diunggah ke Storage supaya yang masuk database
 * hanya URL. Mengembalikan null bila tidak ada sisa isian lama.
 */
export async function takeLegacySessionReport(
  visitId: string, agenda?: string, summary?: string,
): Promise<VesselInspectionData | null> {
  let raw: string | null = null
  try { raw = sessionStorage.getItem(inspectionStorageKey(visitId)) } catch { return null }
  if (!raw) return null

  let parsed: Partial<VesselInspectionData>
  try { parsed = JSON.parse(raw) } catch { return null }

  const toUrls = async (photos: unknown, prefix: string) => {
    const list = Array.isArray(photos) ? photos.filter((p): p is string => typeof p === 'string') : []
    const files = list.filter(p => p.startsWith('data:')).map((p, i) => dataUrlToFile(p, `${prefix}-${i}.jpg`)).filter((f): f is File => !!f)
    const already = list.filter(p => !p.startsWith('data:'))
    return files.length ? [...already, ...(await uploadReportPhotos(visitId, files))] : already
  }

  const defaults = defaultInspectionData(agenda, summary)
  // Versi lama menulis ke sessionStorage setiap kali halaman sekadar dibuka,
  // termasuk isian kosong bawaan. Hanya isian yang benar-benar diisi pengguna
  // yang layak dipindahkan; sisanya dibuang agar tidak tercipta laporan kosong.
  if (!hasUserInput(normalize(parsed, defaults), defaults)) {
    clearLegacySessionReport(visitId)
    return null
  }

  return normalize({
    ...parsed,
    visitPhotos: await toUrls(parsed.visitPhotos, 'foto'),
    attendancePhotos: await toUrls(parsed.attendancePhotos, 'hadir'),
  }, defaults)
}

function hasUserInput(r: VesselInspectionData, defaults: VesselInspectionData): boolean {
  const answered = (list: AreaCheck[]) => list.some(a => a.yn !== '' || a.notes.trim() !== '')
  return answered(r.prepOffice) || answered(r.prepVessel) || answered(r.areas)
    || r.visitPhotos.length > 0 || r.attendancePhotos.length > 0
    || r.discussion.trim() !== defaults.discussion.trim()
    || r.complaints.trim() !== defaults.complaints.trim()
}

export function clearLegacySessionReport(visitId: string) {
  try { sessionStorage.removeItem(inspectionStorageKey(visitId)) } catch { /* abaikan */ }
}
