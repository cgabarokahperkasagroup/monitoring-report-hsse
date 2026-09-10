import { supabaseClient } from '@/lib/supabase'
import { compressImage } from '@/utils/imageCompress'

export type FindingPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface OptionBU { id: string; code: string; name: string }
export interface OptionSite { id: string; name: string; business_unit_id: string }
export interface OptionCategory { id: string; name: string }

export interface OwnerVisitOptions {
  business_units: OptionBU[]
  sites: OptionSite[]
  finding_categories: OptionCategory[]
}

export interface SubmitFinding {
  title: string
  description: string
  category: string
  priority: FindingPriority
  photos: string[]
}

export interface SubmitPayload {
  client_submission_id: string
  website: string
  reporter_name: string
  reporter_position: string
  other_participants: string[]
  business_unit_id: string
  site_id: string | null
  vessel_external_id: number | null
  vessel_name: string | null
  fleet_external_id: number | null
  visit_date: string
  start_time: string | null
  end_time: string | null
  agenda: string | null
  summary: string | null
  findings: SubmitFinding[]
}

export interface SubmitResult {
  visit_id: string
  reference_no: string
  duplicate: boolean
}

/** Tenggat otomatis per prioritas, dalam hari. Cerminan aturan yang sama di RPC. */
export const DUE_DAYS: Record<FindingPriority, number> = {
  CRITICAL: 7, HIGH: 14, MEDIUM: 30, LOW: 60,
}

const PHOTO_BUCKET = 'finding-photos'
const PHOTO_FOLDER = 'public-owner-visit'
const SIGNED_URL_TTL = 60 * 60 * 24 * 365

// Klien di-generic ke schema 'monitoring-hsse', sedangkan kedua RPC ini hidup di
// 'public' dan tidak ada di database.types.ts. Satu cast di sini menahan
// ketidaknyamanan itu agar tidak menyebar ke pemanggil.
type RpcCall = (fn: string, args?: Record<string, unknown>)
  => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabaseClient.rpc.bind(supabaseClient) as unknown as RpcCall

export async function fetchOwnerVisitOptions(): Promise<OwnerVisitOptions> {
  const { data, error } = await rpc('public_owner_visit_options')
  if (error) throw new Error(error.message)
  const opts = data as Partial<OwnerVisitOptions> | null
  return {
    business_units: opts?.business_units ?? [],
    sites: opts?.sites ?? [],
    finding_categories: opts?.finding_categories ?? [],
  }
}

/** Kompres lalu unggah satu foto; mengembalikan URL bertanda tangan. */
export async function uploadFindingPhoto(file: File): Promise<string> {
  const compressed = await compressImage(file)
  const random = crypto.randomUUID().replace(/-/g, '')
  const path = `${PHOTO_FOLDER}/${random}.jpg`

  const { error: upErr } = await supabaseClient.storage
    .from(PHOTO_BUCKET)
    .upload(path, compressed, { upsert: false, contentType: compressed.type })
  if (upErr) throw new Error(upErr.message)

  const { data, error: signErr } = await supabaseClient.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (signErr || !data?.signedUrl) throw new Error(signErr?.message ?? 'Gagal membuat tautan foto')

  return data.signedUrl
}

export async function submitPublicOwnerVisit(payload: SubmitPayload): Promise<SubmitResult> {
  const { data, error } = await rpc('submit_public_owner_visit', { payload })
  if (error) throw new Error(error.message)
  return data as SubmitResult
}

const ERROR_MESSAGES: Record<string, string> = {
  OVF_RATE_LIMIT: 'Terlalu banyak kiriman dari perangkat ini. Coba lagi dalam 1 jam.',
  OVF_INVALID_BU: 'Unit bisnis atau lokasi tidak dikenali. Muat ulang halaman.',
  OVF_INVALID_SITE: 'Unit bisnis atau lokasi tidak dikenali. Muat ulang halaman.',
  OVF_INVALID_DATE: 'Tanggal kunjungan tidak valid (maksimal 90 hari ke belakang, tidak boleh di masa depan).',
  OVF_INVALID_CATEGORY: 'Kategori temuan tidak dikenali. Muat ulang halaman.',
  OVF_TOO_LARGE: 'Isian melebihi batas. Persingkat deskripsi atau kurangi temuan.',
  OVF_BAD_PAYLOAD: 'Ada isian yang belum lengkap atau tidak valid. Periksa kembali.',
  OVF_REJECTED: 'Kiriman ditolak.',
}

/** Ubah pesan mentah dari Postgres menjadi kalimat yang dimengerti pengisi. */
export function friendlyError(message: string): string {
  const code = message.match(/OVF_[A-Z_]+/)?.[0]
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  return 'Gagal mengirim. Data Anda tersimpan di perangkat — tekan Coba Lagi.'
}
