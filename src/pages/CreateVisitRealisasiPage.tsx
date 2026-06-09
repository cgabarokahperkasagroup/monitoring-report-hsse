import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Ship, CheckCircle2, Calendar, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { createVisit } from '@/hooks/useVisitsData'
import { formatDateShort } from '@/utils'

const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

type ScheduleState = {
  id: string
  vessel_name: string
  vessel_external_id: number | null
  fleet_name: string
  fleet_external_id: number | null
  scheduled_date: string
  period_month: number
  period_year: number
  notes: string | null
  op_head_name?: string | null
}

type FindingDraft = {
  id: string
  title: string
  description: string
  category: string
  priority: string
  assigned_to: string
  target_close_date: string
}

const EMPTY_FINDING: Omit<FindingDraft, 'id'> = {
  title: '', description: '', category: '', priority: 'MEDIUM',
  assigned_to: '', target_close_date: '',
}

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critical – Kritis',
  HIGH: 'High – Tinggi',
  MEDIUM: 'Medium – Sedang',
  LOW: 'Low – Rendah',
}

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-blue-100 text-blue-700',
}

export default function CreateVisitRealisasiPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { success, error } = useToast()

  const schedule = (location.state as { schedule?: ScheduleState } | null)?.schedule

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    visit_date: today,
    start_time: '',
    end_time: '',
    participants: '',
    agenda: schedule?.notes ?? '',
    summary: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [shpBuId, setShpBuId] = useState('')

  // ── Findings state ──────────────────────────────────────────────────────────
  const [findings, setFindings] = useState<FindingDraft[]>([])
  const [showAddFinding, setShowAddFinding] = useState(false)
  const [findingForm, setFindingForm] = useState<Omit<FindingDraft, 'id'>>({ ...EMPTY_FINDING })
  const [findingCategories, setFindingCategories] = useState<Array<{id: string, name: string}>>([])
  const [picUsers, setPicUsers] = useState<Array<{id: string, full_name: string}>>([])

  useEffect(() => {
    supabase.from('business_units').select('id, code')
      .eq('code', 'SHP').single()
      .then(({ data }) => { if (data) setShpBuId((data as { id: string }).id) })
    supabase.from('finding_categories').select('id, name').eq('is_active', true)
      .then(({ data }) => { if (data) setFindingCategories(data as Array<{id: string, name: string}>) })
    supabase.from('users').select('id, full_name').in('role', ['PIC', 'OP_HEAD', 'SITE_MGR']).eq('is_active', true)
      .then(({ data }) => { if (data) setPicUsers(data as Array<{id: string, full_name: string}>) })
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const setFf = (k: string, v: string) => setFindingForm(p => ({ ...p, [k]: v }))

  function addFindingDraft() {
    if (!findingForm.title || !findingForm.description || !findingForm.category || !findingForm.target_close_date) {
      error('Data Tidak Lengkap', 'Judul, deskripsi, kategori, dan target tanggal closing wajib diisi.')
      return
    }
    setFindings(prev => [...prev, { ...findingForm, id: crypto.randomUUID() }])
    setFindingForm({ ...EMPTY_FINDING })
    setShowAddFinding(false)
  }

  function removeFinding(id: string) {
    setFindings(prev => prev.filter(f => f.id !== id))
  }

  async function saveFindingsToVisit(visitId: string, visitDate: string) {
    const buCode = 'SHP'
    const d = new Date(visitDate)
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
    const prefix = `FIND/${buCode}/${ym}/`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('findings') as any)
      .select('reference_no').like('reference_no', `${prefix}%`)
    let maxSeq = (existing ?? []).reduce((max: number, row: Record<string, unknown>) => {
      const parts = (row.reference_no as string).split('/')
      const n = parseInt(parts[parts.length - 1]) || 0
      return Math.max(max, n)
    }, 0)

    for (const f of findings) {
      maxSeq += 1
      const reference_no = `FIND/${buCode}/${ym}/${String(maxSeq).padStart(3, '0')}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('findings') as any).insert({
        reference_no,
        visit_id: visitId,
        business_unit_id: shpBuId,
        title: f.title,
        description: f.description,
        category: f.category,
        priority: f.priority,
        source_type: 'VESSEL_VISIT',
        is_owner_finding: false,
        assigned_to: f.assigned_to || null,
        target_close_date: f.target_close_date,
        status: 'OPEN',
        initial_photos: [],
        closing_evidence: [],
        created_by: user!.id,
      })
    }
  }

  async function handleSubmit(e: FormEvent, saveAsDraft: boolean) {
    e.preventDefault()
    if (!user) return
    if (!form.visit_date) {
      error('Data Tidak Lengkap', 'Tanggal kunjungan harus diisi.')
      return
    }
    setSubmitting(true)

    const result = await createVisit({
      visit_type: 'VESSEL_VISIT',
      business_unit_id: shpBuId,
      vessel_id: schedule?.vessel_external_id ? String(schedule.vessel_external_id) : undefined,
      vessel_name: schedule?.vessel_name,
      visit_date: form.visit_date,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
      participants: form.participants
        ? form.participants.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      agenda: form.agenda || undefined,
      summary: form.summary || undefined,
      status: saveAsDraft ? 'DRAFT' : 'SUBMITTED',
      created_by: user.id,
      bu_code: 'SHP',
    })

    if (result.error) {
      setSubmitting(false)
      error('Gagal Menyimpan', result.error)
      return
    }

    // Link visit ke schedule → status COMPLETED
    if (result.id && schedule?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('visit_schedules') as any)
        .update({ visit_id: result.id, status: 'COMPLETED' })
        .eq('id', schedule.id)
    }

    // Simpan temuan jika ada
    if (result.id && findings.length > 0) {
      await saveFindingsToVisit(result.id, form.visit_date)
    }

    setSubmitting(false)
    const findingCount = findings.length
    success(
      saveAsDraft ? 'Realisasi Disimpan sebagai Draft' : 'Realisasi Berhasil Disubmit',
      `Kunjungan ke ${schedule?.vessel_name} telah ${saveAsDraft ? 'disimpan' : 'disubmit'}${findingCount > 0 ? ` beserta ${findingCount} temuan` : ''}.`
    )
    if (result.id) {
      navigate(`/vessel-compliance/visit/${result.id}`)
    } else {
      navigate('/vessel-compliance')
    }
  }

  // Guard: jika tidak ada data schedule di state
  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <Ship size={40} className="text-gray-300" />
        <p className="text-sm font-semibold text-gray-500">Data jadwal tidak ditemukan</p>
        <p className="text-xs text-gray-400">Buka halaman ini melalui tombol Realisasi di daftar rencana kunjungan.</p>
        <Button variant="outline" onClick={() => navigate('/vessel-compliance')}>
          Kembali ke Kepatuhan Kunjungan
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/vessel-compliance')} className="w-fit gap-2">
        <ArrowLeft size={16} /> Kembali ke Kepatuhan Kunjungan
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={18} className="text-[#1B3A6B]" />
          <h2 className="text-base font-bold text-[#1B3A6B]">Realisasi Kunjungan Kapal</h2>
        </div>
        <p className="text-sm text-gray-500">
          Isi laporan realisasi kunjungan sesuai rencana yang telah ditetapkan.
        </p>
      </div>

      {/* Context card — rencana asal */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-blue-500" />
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Detail Rencana Kunjungan</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
          <div>
            <p className="text-xs text-blue-500 mb-0.5">Kapal</p>
            <p className="font-semibold text-blue-900">{schedule.vessel_name}</p>
          </div>
          <div>
            <p className="text-xs text-blue-500 mb-0.5">Armada</p>
            <p className="font-semibold text-blue-900">{schedule.fleet_name}</p>
          </div>
          <div>
            <p className="text-xs text-blue-500 mb-0.5">Tanggal Rencana</p>
            <p className="font-semibold text-blue-900">{formatDateShort(schedule.scheduled_date)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-500 mb-0.5">Periode</p>
            <p className="font-semibold text-blue-900">
              {MONTH_NAMES[schedule.period_month - 1]} {schedule.period_year}
            </p>
          </div>
          {schedule.op_head_name && (
            <div className="col-span-2">
              <p className="text-xs text-blue-500 mb-0.5">Operation Head</p>
              <p className="font-semibold text-blue-900">{schedule.op_head_name}</p>
            </div>
          )}
        </div>
        {schedule.notes && (
          <div className="mt-3 pt-2.5 border-t border-blue-200">
            <p className="text-xs text-blue-500 mb-0.5">Catatan Rencana</p>
            <p className="text-sm text-blue-800">{schedule.notes}</p>
          </div>
        )}
      </div>

      {/* Form realisasi */}
      <form onSubmit={e => e.preventDefault()}>
        <Card>
          <CardContent className="p-6 flex flex-col gap-5">
            <h3 className="text-sm font-semibold text-[#1B3A6B] border-b pb-2.5">
              Laporan Realisasi Kunjungan
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3 sm:col-span-1">
                <Input
                  type="date"
                  label="Tanggal Kunjungan Aktual"
                  required
                  value={form.visit_date}
                  onChange={e => set('visit_date', e.target.value)}
                />
              </div>
              <Input
                type="time"
                label="Waktu Mulai"
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
              />
              <Input
                type="time"
                label="Waktu Selesai"
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
              />
            </div>

            <Textarea
              label="Peserta Kunjungan"
              value={form.participants}
              onChange={e => set('participants', e.target.value)}
              placeholder="Nama peserta, pisahkan dengan koma. Contoh: Ahmad Fauzi, Chief Engineer"
              rows={2}
              hint="Opsional — pisahkan nama dengan koma"
            />

            <Textarea
              label="Agenda / Tujuan Kunjungan"
              value={form.agenda}
              onChange={e => set('agenda', e.target.value)}
              placeholder="Tuliskan agenda dan tujuan kunjungan..."
              rows={3}
            />

            <Textarea
              label="Ringkasan Hasil Kunjungan"
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
              hint="Dapat diisi setelah kunjungan selesai"
              placeholder="Catatan naratif hasil kunjungan..."
              rows={4}
            />

            {/* ── Temuan ─────────────────────────────────────────────────── */}
            <div className="border-t pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-[#1B3A6B]">
                    Temuan Kunjungan
                    {findings.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-white bg-amber-500 rounded-full px-2 py-0.5">
                        {findings.length}
                      </span>
                    )}
                  </h3>
                </div>
                {!showAddFinding && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddFinding(true)}
                    className="gap-1.5 text-xs"
                  >
                    <Plus size={13} /> Tambah Temuan
                  </Button>
                )}
              </div>

              {/* Daftar temuan yang sudah ditambahkan */}
              {findings.length > 0 && (
                <div className="flex flex-col gap-2">
                  {findings.map((f, idx) => (
                    <div key={f.id} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-gray-400 font-medium">#{idx + 1}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_BADGE[f.priority] ?? ''}`}>
                            {f.priority}
                          </span>
                          <span className="text-xs text-gray-500">{f.category}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 truncate">{f.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{f.description}</p>
                        <p className="text-xs text-gray-400 mt-1">Target: {f.target_close_date}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFinding(f.id)}
                        className="text-red-400 hover:text-red-600 p-0.5 mt-0.5 flex-shrink-0"
                        title="Hapus temuan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form tambah temuan inline */}
              {showAddFinding && (
                <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Tambah Temuan Baru</p>

                  <Input
                    label="Judul Temuan"
                    required
                    value={findingForm.title}
                    onChange={e => setFf('title', e.target.value)}
                    placeholder="Ringkasan singkat temuan"
                  />

                  <Textarea
                    label="Deskripsi Detail"
                    required
                    value={findingForm.description}
                    onChange={e => setFf('description', e.target.value)}
                    placeholder="Penjelasan lengkap temuan..."
                    rows={3}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      searchable
                      label="Kategori"
                      required
                      value={findingForm.category}
                      onChange={e => setFf('category', e.target.value)}
                      placeholder="Pilih kategori"
                      options={findingCategories.map(c => ({ value: c.name, label: c.name }))}
                    />
                    <Select
                      label="Tingkat Prioritas"
                      required
                      value={findingForm.priority}
                      onChange={e => setFf('priority', e.target.value)}
                      options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      searchable
                      label="PIC (Penanggung Jawab)"
                      value={findingForm.assigned_to}
                      onChange={e => setFf('assigned_to', e.target.value)}
                      placeholder="Pilih PIC (opsional)"
                      options={picUsers.map(u => ({ value: u.id, label: u.full_name }))}
                    />
                    <Input
                      type="date"
                      label="Target Tanggal Closing"
                      required
                      value={findingForm.target_close_date}
                      onChange={e => setFf('target_close_date', e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowAddFinding(false); setFindingForm({ ...EMPTY_FINDING }) }}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addFindingDraft}
                    >
                      Tambahkan ke Daftar
                    </Button>
                  </div>
                </div>
              )}

              {findings.length === 0 && !showAddFinding && (
                <p className="text-xs text-gray-400">
                  Belum ada temuan. Klik <span className="font-medium">Tambah Temuan</span> untuk mencatat temuan yang ditemukan saat kunjungan.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/vessel-compliance')}
              >
                Batal
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={e => handleSubmit(e, true)}
                  loading={submitting}
                >
                  Simpan Draft
                </Button>
                <Button
                  type="button"
                  onClick={e => handleSubmit(e, false)}
                  loading={submitting}
                >
                  Submit Realisasi
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
