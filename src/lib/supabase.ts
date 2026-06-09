import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const _client = createClient(supabaseUrl, supabaseAnonKey)

// Full client — use for auth, storage, realtime
export const supabaseClient = _client

// DB client — queries go to public schema views that mirror monitoring-hsse tables
export const supabase = _client as unknown as SupabaseClient<Database, 'monitoring-hsse'>

/** Upload multiple image files to the given storage bucket folder. Returns public-signed URLs (1 year TTL). */
export async function uploadPhotos(
  bucket: string,
  folder: string,
  files: File[]
): Promise<{ urls: string[]; error?: string }> {
  const urls: string[] = []
  for (const file of files) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await _client.storage.from(bucket).upload(path, file, { upsert: false })
    if (upErr) return { urls, error: upErr.message }
    const { data } = await _client.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365)
    if (data?.signedUrl) urls.push(data.signedUrl)
  }
  return { urls }
}
