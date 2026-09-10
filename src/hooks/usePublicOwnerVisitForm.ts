import { useCallback, useEffect, useState } from 'react'
import type { FindingPriority, SubmitPayload } from '@/services/publicOwnerVisit'
import { getLocalToday } from '@/utils'

const DRAFT_KEY = 'owner-visit-public-draft-v1'
const SUBMISSION_KEY = 'owner-visit-public-submission-id-v1'

export interface FindingDraft {
  key: string
  title: string
  description: string
  category: string
  priority: FindingPriority
  photoUrls: string[]
}

export interface FormState {
  reporter_name: string
  reporter_position: string
  other_participants: string
  business_unit_id: string
  target: 'VESSEL' | 'SITE'
  site_id: string
  vessel_external_id: string
  vessel_name: string
  fleet_external_id: string
  visit_date: string
  start_time: string
  end_time: string
  agenda: string
  summary: string
  findings: FindingDraft[]
}

function emptyForm(): FormState {
  return {
    reporter_name: '', reporter_position: '', other_participants: '',
    business_unit_id: '', target: 'VESSEL',
    site_id: '', vessel_external_id: '', vessel_name: '', fleet_external_id: '',
    visit_date: getLocalToday(),
    start_time: '', end_time: '', agenda: '', summary: '',
    findings: [],
  }
}

export function newFindingDraft(): FindingDraft {
  return {
    key: crypto.randomUUID(),
    title: '', description: '', category: '', priority: 'HIGH', photoUrls: [],
  }
}

function loadDraft(): FormState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return emptyForm()
    return { ...emptyForm(), ...(JSON.parse(raw) as Partial<FormState>) }
  } catch {
    return emptyForm()
  }
}

/**
 * Id kiriman bertahan di localStorage sepanjang satu laporan. Kalau submit
 * gagal di tengah jalan dan pengisi menekan Coba Lagi, id yang sama membuat
 * RPC mengembalikan kunjungan yang sudah terbentuk, bukan membuat yang kedua.
 */
function loadSubmissionId(): string {
  try {
    const existing = localStorage.getItem(SUBMISSION_KEY)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(SUBMISSION_KEY, fresh)
    return fresh
  } catch {
    return crypto.randomUUID()
  }
}

export function usePublicOwnerVisitForm() {
  const [form, setForm] = useState<FormState>(loadDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clientSubmissionId, setClientSubmissionId] = useState<string>(loadSubmissionId)

  // Autosave: sinyal putus atau HP mati tidak berarti mengetik ulang.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    } catch {
      /* kuota penuh atau mode privat — biarkan, form tetap jalan */
    }
  }, [form])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      // Memilih kapal mengunci BU ke Shipping; berpindah objek membersihkan sisa pilihan lama.
      if (key === 'target') {
        next.site_id = ''
        next.vessel_external_id = ''
        next.vessel_name = ''
        next.fleet_external_id = ''
      }
      return next
    })
  }, [])

  const addFinding = useCallback(() => {
    setForm(prev => ({ ...prev, findings: [...prev.findings, newFindingDraft()] }))
  }, [])

  const updateFinding = useCallback((key: string, patch: Partial<FindingDraft>) => {
    setForm(prev => ({
      ...prev,
      findings: prev.findings.map(f => (f.key === key ? { ...f, ...patch } : f)),
    }))
  }, [])

  const removeFinding = useCallback((key: string) => {
    setForm(prev => ({ ...prev, findings: prev.findings.filter(f => f.key !== key) }))
    // Buang error temuan yang sudah dihapus, agar indeks tidak meleset setelah array difilter.
    setErrors(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => {
        if (k.startsWith('finding_')) delete next[k]
      })
      return next
    })
  }, [])

  const clearDraft = useCallback(() => {
    const freshId = crypto.randomUUID()
    try {
      localStorage.removeItem(DRAFT_KEY)
      // Simpan id kiriman baru ke localStorage supaya "Coba Lagi" setelah reload
      // masih pakai id yang sama dan tidak membuat duplikat kunjungan.
      localStorage.setItem(SUBMISSION_KEY, freshId)
    } catch {
      /* abaikan */
    }
    setForm(emptyForm())
    setErrors({})
    setClientSubmissionId(freshId)
  }, [])

  // Cerminan aturan server, supaya kesalahan ketahuan sebelum data dikirim.
  const validateStep = useCallback((step: 1 | 2): boolean => {
    const e: Record<string, string> = {}
    const today = getLocalToday()

    if (step === 1) {
      if (!form.reporter_name.trim()) e.reporter_name = 'Nama pengisi wajib diisi'
      else if (form.reporter_name.trim().length > 120) e.reporter_name = 'Maksimal 120 karakter'
      if (form.reporter_position.trim().length > 120) e.reporter_position = 'Maksimal 120 karakter'
      if (!form.business_unit_id) e.business_unit_id = 'Unit bisnis wajib dipilih'
      if (form.target === 'VESSEL' && !form.vessel_external_id) e.vessel_external_id = 'Kapal wajib dipilih'
      if (form.target === 'SITE' && !form.site_id) e.site_id = 'Lokasi wajib dipilih'
      if (!form.visit_date) e.visit_date = 'Tanggal kunjungan wajib diisi'
      else if (form.visit_date > today) e.visit_date = 'Tanggal tidak boleh di masa depan'
      if (form.agenda.length > 4000) e.agenda = 'Maksimal 4000 karakter'
      if (form.summary.length > 4000) e.summary = 'Maksimal 4000 karakter'
    }

    if (step === 2) {
      if (form.findings.length > 30) e.findings = 'Maksimal 30 temuan per kunjungan'
      form.findings.forEach((f, i) => {
        if (!f.title.trim()) e[`finding_${i}_title`] = 'Judul wajib diisi'
        else if (f.title.trim().length > 200) e[`finding_${i}_title`] = 'Maksimal 200 karakter'
        if (!f.description.trim()) e[`finding_${i}_description`] = 'Deskripsi wajib diisi'
        else if (f.description.trim().length > 4000) e[`finding_${i}_description`] = 'Maksimal 4000 karakter'
        if (!f.category) e[`finding_${i}_category`] = 'Kategori wajib dipilih'
        if (f.photoUrls.length > 10) e[`finding_${i}_photos`] = 'Maksimal 10 foto'
      })
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }, [form])

  const buildPayload = useCallback((website: string): SubmitPayload => ({
    client_submission_id: clientSubmissionId,
    website,
    reporter_name: form.reporter_name.trim(),
    reporter_position: form.reporter_position.trim(),
    other_participants: form.other_participants
      .split(',').map(s => s.trim()).filter(Boolean),
    business_unit_id: form.business_unit_id,
    site_id: form.target === 'SITE' ? form.site_id || null : null,
    vessel_external_id: form.target === 'VESSEL' && form.vessel_external_id
      ? Number(form.vessel_external_id) : null,
    vessel_name: form.target === 'VESSEL' ? form.vessel_name || null : null,
    fleet_external_id: form.target === 'VESSEL' && form.fleet_external_id
      ? Number(form.fleet_external_id) : null,
    visit_date: form.visit_date,
    start_time: form.start_time || null,
    end_time: form.end_time || null,
    agenda: form.agenda.trim() || null,
    summary: form.summary.trim() || null,
    findings: form.findings.map(f => ({
      title: f.title.trim(),
      description: f.description.trim(),
      category: f.category,
      priority: f.priority,
      photos: f.photoUrls,
    })),
  }), [form, clientSubmissionId])

  return {
    form, setField, addFinding, updateFinding, removeFinding,
    errors, validateStep, clearDraft, clientSubmissionId, buildPayload,
  }
}
