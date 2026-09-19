import { useCallback, useEffect, useRef, useState } from 'react'
import { defaultInspectionData, type VesselInspectionData } from '@/data/vesselInspectionConstants'
import {
  clearLegacySessionReport, fetchInspectionReport, saveInspectionReport, takeLegacySessionReport,
} from '@/services/visitInspectionReport'

export type ReportSaveStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DELAY_MS = 1200

/**
 * Isian laporan inspeksi sebuah kunjungan yang tersimpan di database.
 *
 * - Memuat dari database; bila belum ada, memindahkan sisa isian lama dari
 *   sessionStorage tab ini (versi sebelum laporan disimpan ke server).
 * - Menyimpan otomatis setelah pengguna berhenti mengubah selama 1,2 detik.
 *   Perubahan yang datang saat penyimpanan berjalan disimpan sesudahnya,
 *   bukan hilang.
 * - Memperingatkan sebelum tab ditutup bila masih ada perubahan belum tersimpan.
 */
export function useInspectionReport(visitId: string | undefined, agenda?: string, summary?: string, ready = true) {
  const [report, setReport] = useState<VesselInspectionData>(() => defaultInspectionData(agenda, summary))
  const [status, setStatus] = useState<ReportSaveStatus>('loading')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  /** Isian sudah dimuat dan boleh diedit. False juga bila pemuatan gagal. */
  const [editable, setEditable] = useState(false)

  const latest = useRef(report)
  const loaded = useRef(false)
  const dirty = useRef(false)
  const saving = useRef(false)
  const pending = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async (): Promise<boolean> => {
    if (!visitId || !loaded.current) return false
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (saving.current) { pending.current = true; return false }

    saving.current = true
    dirty.current = false
    setStatus('saving')
    try {
      const at = await saveInspectionReport(visitId, latest.current)
      setSavedAt(at)
      setErrorMessage(null)
      setStatus(dirty.current ? 'idle' : 'saved')
      return true
    } catch (err) {
      dirty.current = true
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
      return false
    } finally {
      saving.current = false
      if (pending.current) {
        pending.current = false
        void save()
      }
    }
  }, [visitId])

  useEffect(() => {
    if (!visitId || !ready) return
    let cancelled = false
    loaded.current = false
    setEditable(false)
    setStatus('loading')

    ;(async () => {
      try {
        const stored = await fetchInspectionReport(visitId, agenda, summary)
        if (cancelled) return
        if (stored) {
          latest.current = stored.data
          setReport(stored.data)
          setSavedAt(stored.updatedAt)
          loaded.current = true
          setEditable(true)
          setStatus('saved')
          // Database adalah sumber kebenaran; sisa isian lama di tab tidak dipakai lagi.
          clearLegacySessionReport(visitId)
          return
        }
        const legacy = await takeLegacySessionReport(visitId, agenda, summary)
        if (cancelled) return
        const initial = legacy ?? defaultInspectionData(agenda, summary)
        latest.current = initial
        setReport(initial)
        loaded.current = true
        setEditable(true)
        if (legacy) {
          // Pindahkan isian lama ke database, lalu hapus salinan di tab.
          if (await save()) clearLegacySessionReport(visitId)
        } else {
          setStatus('idle')
        }
      } catch (err) {
        if (cancelled) return
        setErrorMessage(err instanceof Error ? err.message : String(err))
        setStatus('error')
      }
    })()

    return () => { cancelled = true }
    // agenda/summary hanya bibit isian awal; memuat ulang cukup saat kunjungan berganti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId, ready])

  const update = useCallback((updater: (prev: VesselInspectionData) => VesselInspectionData) => {
    if (!loaded.current) return
    const next = updater(latest.current)
    latest.current = next
    setReport(next)
    dirty.current = true
    setStatus('idle')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void save() }, AUTOSAVE_DELAY_MS)
  }, [save])

  // Simpan sisa perubahan saat meninggalkan halaman di dalam aplikasi.
  useEffect(() => () => {
    if (dirty.current) void save()
  }, [save])

  // Peringatan bila tab ditutup sebelum perubahan tersimpan.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current && !saving.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  return { report, update, save, status, savedAt, errorMessage, editable }
}
