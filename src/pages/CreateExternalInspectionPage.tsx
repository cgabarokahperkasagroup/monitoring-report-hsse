import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Info, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { createExternalInspection } from '@/hooks/useExternalInspectionsData'
import { useShips, shipOptions, findShipById } from '@/hooks/useShips'
import { useFleetResolver } from '@/hooks/useFleetResolver'
import type { ExternalInspectionType } from '@/types'
import { getExternalInspectionTypeLabel } from '@/utils'
import { cn } from '@/lib/utils'

// ─── Inspection type cards ────────────────────────────────────────────────────

const INSPECTION_TYPES: {
  type: ExternalInspectionType
  label: string
  desc: string
  color: string
  iconColor: string
}[] = [
  {
    type: 'SIRE',
    label: 'SIRE',
    desc: 'Ship Inspection Report Programme – digunakan oleh oil majors untuk vetting kapal tanker. Dikelola oleh OCIMF.',
    color: 'border-blue-400 bg-blue-50',
    iconColor: 'text-blue-700',
  },
  {
    type: 'BIRE',
    label: 'BIRE',
    desc: 'Barge Inspection Report Programme – serupa dengan SIRE namun khusus untuk tongkang (barge) yang beroperasi di area terbatas.',
    color: 'border-indigo-400 bg-indigo-50',
    iconColor: 'text-indigo-700',
  },
  {
    type: 'VETTING_PSA',
    label: 'Vetting PSA',
    desc: 'Port State Authority – inspeksi oleh otoritas pelabuhan (Syahbandar) berdasarkan konvensi IMO (SOLAS, MARPOL, MLC).',
    color: 'border-purple-400 bg-purple-50',
    iconColor: 'text-purple-700',
  },
  {
    type: 'IMCA',
    label: 'IMCA',
    desc: 'International Marine Contractors Association – audit safety management system khusus untuk kapal konstruksi dan diving support vessel.',
    color: 'border-teal-400 bg-teal-50',
    iconColor: 'text-teal-700',
  },
  {
    type: 'OTHER',
    label: 'Lainnya',
    desc: 'Inspeksi eksternal lain di luar kategori di atas, seperti class survey, ISM audit oleh flag state, atau inspeksi internal perusahaan pelayaran lain.',
    color: 'border-gray-400 bg-gray-50',
    iconColor: 'text-gray-600',
  },
]

// ─── Observation entry interface ──────────────────────────────────────────────

interface ObservationEntry {
  id: string
  level: 'CRITICAL' | 'MAJOR' | 'MINOR'
  description: string
  action_required: string
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateExternalInspectionPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { success, error } = useToast()

  const [shippingBuId, setShippingBuId] = useState('')
  useEffect(() => {
    supabase.from('business_units_mh').select('id').eq('code', 'SHP').single().then(({ data }) => {
      const bu = data as { id: string } | null
      if (bu) setShippingBuId(bu.id)
    })
  }, [])

  const [selectedType, setSelectedType] = useState<ExternalInspectionType | null>(null)
  const [form, setForm] = useState({
    vessel_id: '',
    inspection_date: new Date().toISOString().slice(0, 10),
    inspecting_body: '',
    lead_inspector: '',
    port: '',
    status: 'COMPLETED' as 'SCHEDULED' | 'COMPLETED' | 'CANCELLED',
    result: '' as '' | 'SATISFACTORY' | 'CONDITIONAL' | 'UNSATISFACTORY',
    report_no: '',
    validity_date: '',
    next_inspection_date: '',
    notes: '',
    actions_taken: '',
  })

  const [observations, setObservations] = useState<ObservationEntry[]>([])
  const [submitting, setSubmitting] = useState(false)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const { ships } = useShips()
  const { restrictToFleetExtId, resolveFleetId } = useFleetResolver()
  const filteredVessels = shipOptions(ships, restrictToFleetExtId != null ? String(restrictToFleetExtId) : undefined)

  const addObservation = () => {
    setObservations(prev => [...prev, {
      id: `obs-${Date.now()}`,
      level: 'MINOR',
      description: '',
      action_required: '',
    }])
  }

  const updateObservation = (id: string, k: keyof ObservationEntry, v: string) => {
    setObservations(prev => prev.map(o => o.id === id ? { ...o, [k]: v } : o))
  }

  const removeObservation = (id: string) => {
    setObservations(prev => prev.filter(o => o.id !== id))
  }

  const criticalCount = observations.filter(o => o.level === 'CRITICAL').length
  const majorCount = observations.filter(o => o.level === 'MAJOR').length
  const minorCount = observations.filter(o => o.level === 'MINOR').length

  async function handleSubmit(e: FormEvent, isDraft: boolean) {
    e.preventDefault()
    if (!form.vessel_id || !form.inspection_date || !form.inspecting_body) {
      error('Data Tidak Lengkap', 'Kapal, tanggal, dan lembaga inspeksi wajib diisi.')
      return
    }
    if (!user || !selectedType) return

    setSubmitting(true)

    const buId = shippingBuId
    const findings = observations.filter(o => o.description).map(o => ({
      internal_inspection_id: null as null,
      external_inspection_id: null as null,
      area: 'Observasi',
      description: o.description + (o.action_required ? ` | Tindakan: ${o.action_required}` : ''),
      priority: o.level === 'CRITICAL' ? 'CRITICAL' as const : o.level === 'MAJOR' ? 'HIGH' as const : 'MEDIUM' as const,
      status: 'OPEN' as const,
      assigned_to: undefined,
      target_close_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      initial_photos: [] as string[],
      closing_evidence: [] as string[],
    }))

    const res = await createExternalInspection({
      vessel_id: form.vessel_id,
      vessel_name: findShipById(ships, form.vessel_id)?.name,
      fleet_id: resolveFleetId(form.vessel_id),
      business_unit_id: buId,
      inspection_type: selectedType,
      inspection_date: form.inspection_date,
      inspecting_body: form.inspecting_body,
      lead_inspector: form.lead_inspector || undefined,
      port: form.port || undefined,
      status: isDraft ? 'SCHEDULED' : form.status,
      result: form.result || undefined,
      total_observations: observations.length,
      critical_observations: criticalCount,
      major_observations: majorCount,
      minor_observations: minorCount,
      validity_date: form.validity_date || undefined,
      next_inspection_date: form.next_inspection_date || undefined,
      report_no: form.report_no || undefined,
      notes: form.notes || undefined,
      actions_taken: form.actions_taken || undefined,
      created_by: user.id,
      findings,
    })

    setSubmitting(false)

    if (res.error) { error('Gagal menyimpan', res.error); return }

    success(
      isDraft ? 'Inspeksi Disimpan sebagai Draft' : 'Laporan Inspeksi Disubmit',
      isDraft ? 'Anda dapat melanjutkan pengisian kapan saja.' : 'Laporan berhasil disimpan ke sistem.'
    )
    navigate(`/inspections/external/${res.id}`)
  }

  return (
    <div className="max-w-3xl flex flex-col gap-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/inspections/external')} className="w-fit gap-2">
        <ArrowLeft size={16} /> Kembali
      </Button>

      <div>
        <h2 className="text-base font-bold text-[#1B3A6B]">Form Inspeksi Eksternal Kapal</h2>
        <p className="text-sm text-gray-500 mt-0.5">Catat hasil inspeksi eksternal oleh lembaga SIRE, BIRE, Vetting PSA, IMCA, atau lembaga lainnya.</p>
      </div>

      {/* Step 1: Pilih jenis inspeksi */}
      {!selectedType && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Pilih Jenis Inspeksi Eksternal</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INSPECTION_TYPES.map(t => (
              <button
                key={t.type}
                type="button"
                onClick={() => setSelectedType(t.type)}
                className={cn('p-4 rounded-xl border-2 text-left transition-all hover:shadow-md', t.color)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className={t.iconColor} />
                  <p className={`font-bold text-sm ${t.iconColor}`}>{t.label}</p>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Form */}
      {selectedType && (
        <form onSubmit={e => e.preventDefault()}>

          {/* Jenis badge + ubah */}
          <div className="flex items-center gap-3 mb-2">
            <button type="button" onClick={() => setSelectedType(null)}
              className="text-sm text-[#1B3A6B] hover:underline flex items-center gap-1 text-xs">
              <ArrowLeft size={13} /> Ubah jenis
            </button>
            <span className={cn('badge', INSPECTION_TYPES.find(t => t.type === selectedType)?.color.replace('bg-', 'bg-').replace('border-', 'border-'), 'font-semibold text-xs')}>
              {getExternalInspectionTypeLabel(selectedType)}
            </span>
          </div>

          {/* ── Informasi Dasar ── */}
          <Card className="mb-4">
            <CardContent className="p-6 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[#1B3A6B] border-b pb-2.5">Informasi Kapal & Inspeksi</h3>

              <Select searchable
                label="Kapal" required value={form.vessel_id}
                onChange={e => set('vessel_id', e.target.value)}
                placeholder="Pilih Kapal"
                options={filteredVessels}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date" label="Tanggal Inspeksi" required
                  value={form.inspection_date}
                  onChange={e => set('inspection_date', e.target.value)}
                />
                <Input
                  label="Pelabuhan / Lokasi"
                  value={form.port}
                  onChange={e => set('port', e.target.value)}
                  placeholder="Contoh: Pelabuhan Balikpapan"
                />
              </div>

              <Input
                label="Nama Lembaga Inspeksi" required
                value={form.inspecting_body}
                onChange={e => set('inspecting_body', e.target.value)}
                placeholder={
                  selectedType === 'SIRE' ? 'Contoh: Shell International Trading, TotalEnergies SE' :
                  selectedType === 'BIRE' ? 'Contoh: Pertamina International Shipping' :
                  selectedType === 'VETTING_PSA' ? 'Contoh: Syahbandar Balikpapan, Port State Control' :
                  selectedType === 'IMCA' ? 'Contoh: IMCA Auditor (Independent)' :
                  'Nama lembaga inspeksi'
                }
              />

              <Input
                label="Nama Lead Inspector"
                value={form.lead_inspector}
                onChange={e => set('lead_inspector', e.target.value)}
                placeholder="Contoh: Capt. James Robertson"
                hint="Opsional"
              />

              <Select
                label="Status Inspeksi" required value={form.status}
                onChange={e => set('status', e.target.value as typeof form.status)}
                options={[
                  { value: 'SCHEDULED', label: 'Dijadwalkan (Belum dilaksanakan)' },
                  { value: 'COMPLETED', label: 'Selesai (Sudah dilaksanakan)' },
                  { value: 'CANCELLED', label: 'Dibatalkan' },
                ]}
              />
            </CardContent>
          </Card>

          {/* ── Hasil Inspeksi (jika COMPLETED) ── */}
          {form.status === 'COMPLETED' && (
            <Card className="mb-4">
              <CardContent className="p-6 flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-[#1B3A6B] border-b pb-2.5">Hasil Inspeksi</h3>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Hasil / Kesimpulan" required value={form.result}
                    onChange={e => set('result', e.target.value as typeof form.result)}
                    placeholder="Pilih hasil inspeksi"
                    options={[
                      { value: 'SATISFACTORY', label: '✓ Satisfactory' },
                      { value: 'CONDITIONAL', label: '⚠ Conditional' },
                      { value: 'UNSATISFACTORY', label: '✗ Unsatisfactory' },
                    ]}
                  />
                  <Input
                    label="Nomor Laporan / Report No."
                    value={form.report_no}
                    onChange={e => set('report_no', e.target.value)}
                    placeholder="Contoh: SIRE-2026-0315-001"
                    hint="Opsional"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date" label="Berlaku Sampai (Validity Date)"
                    value={form.validity_date}
                    onChange={e => set('validity_date', e.target.value)}
                    hint="Tanggal kadaluarsa sertifikat / laporan"
                  />
                  <Input
                    type="date" label="Jadwal Inspeksi Berikutnya"
                    value={form.next_inspection_date}
                    onChange={e => set('next_inspection_date', e.target.value)}
                    hint="Opsional"
                  />
                </div>

                {/* Result info box */}
                {form.result && (
                  <div className={`p-3 rounded-lg border text-xs ${
                    form.result === 'SATISFACTORY' ? 'bg-green-50 border-green-200 text-green-700' :
                    form.result === 'CONDITIONAL' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    <Info size={13} className="inline mr-1 mb-0.5" />
                    {form.result === 'SATISFACTORY' && 'Kapal memenuhi semua persyaratan. Tidak ada atau hanya minor observations yang ditemukan.'}
                    {form.result === 'CONDITIONAL' && 'Kapal diizinkan beroperasi namun ada temuan yang harus ditindaklanjuti dalam batas waktu tertentu. Pantau progress perbaikan.'}
                    {form.result === 'UNSATISFACTORY' && 'Kapal tidak memenuhi persyaratan. Kapal tidak boleh beroperasi sebelum semua defisiensi diperbaiki. Koordinasikan segera dengan Operation Head.'}
                  </div>
                )}

                {/* Observations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Daftar Observasi / Defisiensi</p>
                      {observations.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {criticalCount > 0 && <span className="text-red-600 font-semibold">{criticalCount} Critical </span>}
                          {majorCount > 0 && <span className="text-orange-600 font-semibold">{majorCount} Major </span>}
                          {minorCount > 0 && <span className="text-amber-600 font-semibold">{minorCount} Minor</span>}
                        </p>
                      )}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addObservation} className="gap-1.5">
                      <Plus size={13} /> Tambah Observasi
                    </Button>
                  </div>

                  {observations.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                      <p className="text-xs text-gray-400">Tidak ada observasi / semua satisfactory. Klik "Tambah Observasi" jika ada defisiensi.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {observations.map(obs => {
                        const levelColors = {
                          CRITICAL: 'border-red-300 bg-red-50/40',
                          MAJOR: 'border-orange-300 bg-orange-50/30',
                          MINOR: 'border-amber-300 bg-amber-50/20',
                        }
                        return (
                          <div key={obs.id} className={`border rounded-lg p-3 ${levelColors[obs.level]}`}>
                            <div className="flex items-center justify-between mb-2.5">
                              <Select
                                label=""
                                value={obs.level}
                                onChange={e => updateObservation(obs.id, 'level', e.target.value as typeof obs.level)}
                                options={[
                                  { value: 'CRITICAL', label: '🔴 Critical' },
                                  { value: 'MAJOR', label: '🟠 Major' },
                                  { value: 'MINOR', label: '🟡 Minor' },
                                ]}
                              />
                              <button type="button" onClick={() => removeObservation(obs.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors ml-2 self-end mb-1">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <Textarea
                              label="Deskripsi Observasi"
                              value={obs.description}
                              onChange={e => updateObservation(obs.id, 'description', e.target.value)}
                              placeholder="Uraikan temuan / observasi secara detail..."
                              rows={2}
                            />
                            <div className="mt-2">
                              <Textarea
                                label="Tindakan yang Disyaratkan"
                                value={obs.action_required}
                                onChange={e => updateObservation(obs.id, 'action_required', e.target.value)}
                                placeholder="Apa yang harus dilakukan untuk menutup observasi ini?"
                                rows={2}
                                hint="Opsional"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <Textarea
                  label="Tindak Lanjut yang Sudah Dilakukan"
                  value={form.actions_taken}
                  onChange={e => set('actions_taken', e.target.value)}
                  placeholder="Uraikan tindakan yang sudah atau akan dilakukan untuk merespons hasil inspeksi..."
                  rows={3}
                  hint="Opsional"
                />
              </CardContent>
            </Card>
          )}

          {/* Scheduled info box */}
          {form.status === 'SCHEDULED' && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">Status <strong>Dijadwalkan</strong>: Data hasil dan observasi dapat dilengkapi setelah inspeksi selesai dilaksanakan.</p>
            </div>
          )}

          {/* Catatan */}
          <Card className="mb-4">
            <CardContent className="p-6">
              <Textarea
                label="Catatan Umum"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Catatan tambahan, konteks inspeksi, atau informasi lain yang relevan..."
                rows={3}
                hint="Opsional"
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={e => handleSubmit(e, true)} loading={submitting}>
              Simpan Draft
            </Button>
            <Button type="button" onClick={e => handleSubmit(e, false)} loading={submitting}>
              Simpan Laporan
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
