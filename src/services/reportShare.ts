/**
 * Shareable link laporan: simpan berkas laporan di bucket privat lalu bagikan
 * signed URL yang kedaluwarsa sendiri.
 *
 * Penerima link hanya mendapat berkas beku itu — tidak ada akses ke database
 * maupun ke berkas lain. Masa berlaku ditegakkan Supabase Storage, bukan oleh
 * aplikasi, sehingga tetap berlaku walau aplikasi ini mati.
 */
import { supabaseClient } from '@/lib/supabase'
import {
  REPORT_MIME, renderPdf, renderXlsx, reportFileName,
  type ReportDoc, type ReportFormat,
} from '@/services/reportFile'

const BUCKET = 'shared-reports'
export const SHARE_TTL_SECONDS = 24 * 60 * 60

export interface ShareLink {
  url: string
  expiresAt: Date
  fileName: string
}

export async function createShareLink(doc: ReportDoc, format: ReportFormat): Promise<ShareLink> {
  const { data: auth } = await supabaseClient.auth.getUser()
  if (!auth.user) throw new Error('Sesi login berakhir. Silakan login ulang.')

  const blob = format === 'PDF' ? await renderPdf(doc) : await renderXlsx(doc)
  const fileName = reportFileName(doc, format)
  // Folder pertama = id pengguna: policy storage hanya mengizinkan folder milik sendiri.
  // Segmen acak menjaga dua link dengan nama berkas sama tidak saling menimpa.
  const path = `${auth.user.id}/${crypto.randomUUID().replace(/-/g, '')}/${fileName}`

  const { error: upErr } = await supabaseClient.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: REPORT_MIME[format], upsert: false })
  if (upErr) throw new Error(upErr.message)

  const { data, error: signErr } = await supabaseClient.storage
    .from(BUCKET)
    .createSignedUrl(path, SHARE_TTL_SECONDS)
  if (signErr || !data?.signedUrl) throw new Error(signErr?.message ?? 'Gagal membuat link')

  return {
    url: data.signedUrl,
    expiresAt: new Date(Date.now() + SHARE_TTL_SECONDS * 1000),
    fileName,
  }
}

/** Salin ke clipboard; jatuh ke execCommand bila Clipboard API tidak tersedia (mis. HTTP). */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  ta.remove()
  if (!ok) throw new Error('Browser menolak akses clipboard. Salin link secara manual.')
}
