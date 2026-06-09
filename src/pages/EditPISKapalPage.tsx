import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import { usePISFindingsData } from '@/hooks/usePISFindingsData'
import { supabase } from '@/lib/supabase'
import { useShips } from '@/hooks/useShips'
import { PIS_FINDING_STATUS_OPTIONS } from '@/data/masterOptions'
import { useToast } from '@/components/ui/toast'
import type { PISFindingStatus, PISFindingTemuan, PISPerusahaan } from '@/types'

// ── Form helpers ──────────────────────────────────────────────────────────────

interface FormData {
  no: string
  perusahaan: PISPerusahaan | ''
  deskripsi: string
  nama_kapal: string
  fleet_inspector: string
  status: PISFindingStatus | ''
  temuan: PISFindingTemuan | ''
  no_ticket: string
  nomor_memo: string
  tanggal_memo: string
  category: string
  kendala_action_plan: string
  approval_note: string
  reject_note: string
  open_date: string
  target_closed_date: string
  actual_closed_date: string
  operation_head: string
  person_in_charge: string
  pending_invoice_sistem: boolean
  pending_invoice_finance: boolean

}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function Input({ value, onChange, placeholder, type = 'text', ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...rest}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
    />
  )
}

function Select({ value, onChange, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      value={value}
      onChange={onChange}
      {...rest}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
    >
      {children}
    </select>
  )
}

function Textarea({ value, onChange, placeholder, rows = 3, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      {...rest}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white resize-none"
    />
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-5 pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  )
}

// ── Inner form (rendered only when finding is defined) ────────────────────────

function EditForm({ findingId }: { findingId: string }) {
  const navigate = useNavigate()
  const { getFindingById, updateFinding } = usePISFindingsData()
  const { success } = useToast()
  const { ships } = useShips()

  const [pisPerusahaan, setPisPerusahaan] = useState<Array<{id: string, code: string}>>([])
  const [pisTemuanTypes, setPisTemuanTypes] = useState<Array<{id: string, code: string, label: string}>>([])
  const [pisKategori, setPisKategori] = useState<Array<{id: string, name: string}>>([])
  const [opHeadOptions, setOpHeadOptions] = useState<Array<{id: string, full_name: string}>>([])
  const [picOptions, setPicOptions] = useState<Array<{id: string, full_name: string}>>([])
  useEffect(() => {
    supabase.from('pis_perusahaan').select('id, code').eq('is_active', true)
      .then(({ data }) => { if (data) setPisPerusahaan(data as Array<{id: string, code: string}>) })
    supabase.from('pis_finding_types').select('id, code, label').eq('is_active', true)
      .then(({ data }) => { if (data) setPisTemuanTypes(data as Array<{id: string, code: string, label: string}>) })
    supabase.from('pis_categories').select('id, name').eq('is_active', true)
      .then(({ data }) => { if (data) setPisKategori(data as Array<{id: string, name: string}>) })
    supabase.from('users').select('id, full_name').eq('role', 'OP_HEAD').eq('is_active', true)
      .then(({ data }) => { if (data) setOpHeadOptions(data as Array<{id: string, full_name: string}>) })
    supabase.from('users').select('id, full_name').in('role', ['OP_HEAD', 'STAFF_HSSE', 'HEAD_HSSE', 'PIC']).eq('is_active', true)
      .then(({ data }) => { if (data) setPicOptions(data as Array<{id: string, full_name: string}>) })
  }, [])

  const finding = getFindingById(findingId)!

  const [form, setFormState] = useState<FormData>({
    no: String(finding.no),
    perusahaan: finding.perusahaan,
    deskripsi: finding.deskripsi,
    nama_kapal: finding.nama_kapal,
    fleet_inspector: finding.fleet_inspector,
    status: finding.status,
    temuan: finding.temuan,
    no_ticket: finding.no_ticket,
    nomor_memo: finding.nomor_memo ?? '',
    tanggal_memo: finding.tanggal_memo ?? '',
    category: finding.category,
    kendala_action_plan: finding.kendala_action_plan ?? '',
    approval_note: finding.approval_note ?? '',
    reject_note: finding.reject_note ?? '',
    open_date: finding.open_date,
    target_closed_date: finding.target_closed_date ?? '',
    actual_closed_date: finding.actual_closed_date ?? '',
    operation_head: finding.operation_head ?? '',
    person_in_charge: finding.person_in_charge ?? '',
    pending_invoice_sistem: finding.pending_invoice_sistem,
    pending_invoice_finance: finding.pending_invoice_finance,
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  function set(key: keyof FormData, value: string | boolean) {
    setFormState(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.perusahaan) e.perusahaan = 'Wajib diisi'
    if (!form.deskripsi.trim()) e.deskripsi = 'Wajib diisi'
    if (!form.nama_kapal.trim()) e.nama_kapal = 'Wajib diisi'
    if (!form.fleet_inspector.trim()) e.fleet_inspector = 'Wajib diisi'
    if (!form.status) e.status = 'Wajib diisi'
    if (!form.temuan) e.temuan = 'Wajib diisi'
    if (!form.no_ticket.trim()) e.no_ticket = 'Wajib diisi'
    if (!form.category) e.category = 'Wajib diisi'
    if (!form.open_date) e.open_date = 'Wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    await updateFinding(finding.id, {
      no: form.no ? parseInt(form.no) : finding.no,
      perusahaan: form.perusahaan as PISPerusahaan,
      deskripsi: form.deskripsi.trim(),
      nama_kapal: form.nama_kapal.trim(),
      fleet_inspector: form.fleet_inspector.trim(),
      status: form.status as PISFindingStatus,
      temuan: form.temuan as PISFindingTemuan,
      no_ticket: form.no_ticket.trim(),
      nomor_memo: form.nomor_memo || undefined,
      tanggal_memo: form.tanggal_memo || undefined,
      category: form.category,
      kendala_action_plan: form.kendala_action_plan || undefined,
      approval_note: form.approval_note || undefined,
      reject_note: form.reject_note || undefined,
      open_date: form.open_date,
      target_closed_date: form.target_closed_date || undefined,
      actual_closed_date: form.actual_closed_date || undefined,
      operation_head: form.operation_head || undefined,
      person_in_charge: form.person_in_charge || undefined,
      pending_invoice_sistem: form.pending_invoice_sistem,
      pending_invoice_finance: form.pending_invoice_finance,
    })

    success('Perubahan disimpan', 'Data finding berhasil diperbarui')
    navigate(`/pis-findings/${finding.id}`)
  }

  const err = (k: keyof FormData) => errors[k] ? <p className="text-xs text-red-500 mt-1">{errors[k]}</p> : null

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Identitas Finding ────────────────────────────────────────────── */}
      <SectionCard title="Identitas Finding">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>No. Finding</Label>
            <Input value={form.no} onChange={e => set('no', e.target.value)} placeholder="Auto" />
          </div>
          <div>
            <Label required>Perusahaan</Label>
            <Select value={form.perusahaan} onChange={e => set('perusahaan', e.target.value)}>
              <option value="">-- Pilih --</option>
              {pisPerusahaan.map(p => <option key={p.id} value={p.code}>{p.code}</option>)}
            </Select>
            {err('perusahaan')}
          </div>
          <div>
            <Label required>Jenis Temuan</Label>
            <Select value={form.temuan} onChange={e => set('temuan', e.target.value)}>
              <option value="">-- Pilih --</option>
              {pisTemuanTypes.map(t => <option key={t.id} value={t.code}>{t.label}</option>)}
            </Select>
            {err('temuan')}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <Label required>No. Tiket</Label>
            <Input value={form.no_ticket} onChange={e => set('no_ticket', e.target.value)} placeholder="NF/SP/071122/015" />
            {err('no_ticket')}
          </div>
          <div>
            <Label required>Kategori</Label>
            <Select value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">-- Pilih Kategori --</option>
              {pisKategori.map(k => <option key={k.id} value={k.name}>{k.name}</option>)}
            </Select>
            {err('category')}
          </div>
        </div>

        <div className="mt-4">
          <Label required>Deskripsi / Isi Temuan</Label>
          <Textarea value={form.deskripsi} onChange={e => set('deskripsi', e.target.value)} placeholder="Jelaskan temuan secara detail..." rows={4} />
          {err('deskripsi')}
        </div>
      </SectionCard>

      {/* ── Info Kapal & Inspektor ────────────────────────────────────────── */}
      <SectionCard title="Info Kapal & Inspektor">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Nama Kapal</Label>
            <input
              list="ship-list-edit"
              value={form.nama_kapal}
              onChange={e => set('nama_kapal', e.target.value)}
              placeholder="Ketik atau pilih nama kapal..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
            />
            <datalist id="ship-list-edit">
              {ships.map(s => <option key={s.id} value={s.name} />)}
            </datalist>
            {err('nama_kapal')}
          </div>
          <div>
            <Label required>Fleet Inspector</Label>
            <Input value={form.fleet_inspector} onChange={e => set('fleet_inspector', e.target.value)} placeholder="Nama Fleet Inspector" />
            {err('fleet_inspector')}
          </div>
          <div>
            <Label>Operation Head</Label>
            <Select value={form.operation_head} onChange={e => set('operation_head', e.target.value)}>
              <option value="">-- Pilih Operation Head --</option>
              {opHeadOptions.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Person in Charge</Label>
            <Select value={form.person_in_charge} onChange={e => set('person_in_charge', e.target.value)}>
              <option value="">-- Pilih PIC --</option>
              {picOptions.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* ── Status & Tanggal ──────────────────────────────────────────────── */}
      <SectionCard title="Status & Tanggal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Status</Label>
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="">-- Pilih Status --</option>
              {PIS_FINDING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            {err('status')}
          </div>
          <div>
            <Label required>Tanggal Open</Label>
            <Input type="date" value={form.open_date} onChange={e => set('open_date', e.target.value)} />
            {err('open_date')}
          </div>
          <div>
            <Label>Target Closed Date</Label>
            <Input type="date" value={form.target_closed_date} onChange={e => set('target_closed_date', e.target.value)} />
          </div>
          <div>
            <Label>Actual Closed Date</Label>
            <Input type="date" value={form.actual_closed_date} onChange={e => set('actual_closed_date', e.target.value)} />
          </div>
        </div>
      </SectionCard>

      {/* ── Memo ─────────────────────────────────────────────────────────── */}
      <SectionCard title="Data Memo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nomor Memo</Label>
            <Input value={form.nomor_memo} onChange={e => set('nomor_memo', e.target.value)} placeholder="817/PIS2120/2022-S6" />
          </div>
          <div>
            <Label>Tanggal Memo</Label>
            <Input type="date" value={form.tanggal_memo} onChange={e => set('tanggal_memo', e.target.value)} />
          </div>
        </div>
      </SectionCard>

      {/* ── Catatan Tindak Lanjut ─────────────────────────────────────────── */}
      <SectionCard title="Catatan Tindak Lanjut">
        <div className="space-y-4">
          <div>
            <Label>Kendala / Action Plan</Label>
            <Textarea value={form.kendala_action_plan} onChange={e => set('kendala_action_plan', e.target.value)} placeholder="Uraikan kendala atau rencana tindak lanjut..." />
          </div>
          <div>
            <Label>Catatan Approval</Label>
            <Textarea value={form.approval_note} onChange={e => set('approval_note', e.target.value)} placeholder="Catatan dari approver..." />
          </div>
          <div>
            <Label>Catatan Reject</Label>
            <Textarea value={form.reject_note} onChange={e => set('reject_note', e.target.value)} placeholder="Alasan penolakan..." />
          </div>
        </div>
      </SectionCard>

      {/* ── Pending Invoice ───────────────────────────────────────────────── */}
      <SectionCard title="Pending Invoice">
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.pending_invoice_sistem}
              onChange={e => set('pending_invoice_sistem', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Pending Invoice Sistem</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.pending_invoice_finance}
              onChange={e => set('pending_invoice_finance', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Pending Invoice Finance</span>
          </label>
        </div>
      </SectionCard>

      {/* ── Action Buttons ────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-6">
        <button
          type="button"
          onClick={() => navigate(`/pis-findings/${finding.id}`)}
          className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#1B3A6B' }}
        >
          <Save size={15} />
          Simpan Perubahan
        </button>
      </div>
    </form>
  )
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

export default function EditPISKapalPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getFindingById } = usePISFindingsData()

  const finding = getFindingById(id ?? '')

  if (!finding) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
        <AlertTriangle size={36} className="text-gray-300" />
        <p className="text-sm">Finding tidak ditemukan</p>
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">Kembali</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/pis-findings/${finding.id}`)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Finding</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{finding.no_ticket}</p>
        </div>
      </div>
      <EditForm findingId={finding.id} />
    </div>
  )
}
