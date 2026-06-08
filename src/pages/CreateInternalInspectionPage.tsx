import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/stores/authStore'
import { mockBusinessUnits, mockFleets, mockUsers } from '@/data/mockData'
import { useShips, shipOptions } from '@/hooks/useShips'
import type { FindingPriority } from '@/types'

// ─── Checklist definition ─────────────────────────────────────────────────────

const CHECKLIST_AREAS = [
  {
    area: 'Dokumen & Sertifikat',
    items: [
      'Certificate of Registry',
      'Safety Management Certificate (SMC)',
      'Document of Compliance (DOC)',
      'ISPS Certificate',
      'Tonnage Certificate',
      'Load Line Certificate',
      'Safety Construction Certificate',
      'Safety Equipment Certificate',
      'Radio License',
      'Certificate of Competency (CoC) seluruh kru – valid & sesuai jabatan',
      'Oil Record Book (ORB)',
      'Ship Sanitation Certificate',
    ]
  },
  {
    area: 'Peralatan Keselamatan',
    items: [
      'Life jacket – jumlah sesuai & kondisi baik',
      'Life ring – jumlah sesuai & kondisi baik',
      'APAR – jenis, jumlah, validity tanggal inspeksi',
      'Immersion suit – kondisi & validity',
      'Life raft – validity & servicing record',
      'EPIRB – validity & battery',
      'SART (Search And Rescue Transponder)',
      'Emergency flares – validity',
      'Fire hose & nozzle',
      'Breathing apparatus (BA set)',
    ]
  },
  {
    area: 'Navigasi & Komunikasi',
    items: [
      'GPS / ECDIS – akurat & terkalibrasi',
      'Radar – berfungsi normal',
      'Kompas magnetik & gyrocompass',
      'AIS (Automatic Identification System)',
      'VHF Radio',
      'SSB / MF-HF Radio',
      'Lampu navigasi (running lights) – semua berfungsi',
      'Peta laut (nautical charts) – tersedia & up to date',
    ]
  },
  {
    area: 'Ruang Mesin',
    items: [
      'Main Engine – kondisi & operasional',
      'Generator / Genset – kondisi & operasional',
      'Pompa bilga kamar mesin – berfungsi',
      'Fire pump – berfungsi',
      'Emergency fire pump – berfungsi',
      'Sistem bahan bakar – tidak ada kebocoran',
      'Sistem pendingin (coolant) – level & kondisi',
      'Sistem pelumasan – oil level & kondisi',
    ]
  },
  {
    area: 'Dek & Struktur',
    items: [
      'Tali mooring – kondisi & kekuatan',
      'Jangkar & rantai jangkar',
      'Tutup palka (hatch covers)',
      'Kondisi dek – korosi & pengecatan',
      'Tangga gangway – kondisi & keamanan',
      'Lampu dek',
      'Pagar pengaman (guard rails)',
    ]
  },
  {
    area: 'Kebersihan & Lingkungan',
    items: [
      'Kebersihan ruang akomodasi kru',
      'Kebersihan ruang mesin',
      'Pengelolaan sampah sesuai Garbage Management Plan',
      'Pembuangan air limbah (sewage) – sesuai MARPOL',
      'Kondisi toilet & galley',
    ]
  },
  {
    area: 'Kru & Manajemen Keselamatan',
    items: [
      'Manning sesuai Safe Manning Certificate',
      'Medical certificate kru – valid',
      'Safety drill record (fire drill, abandon ship) – terbaru',
      'Safety meeting record – rutin diisi',
      'ISM SMS – tersedia di kapal & dipahami kru',
    ]
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type ItemStatus = 'OK' | 'NOK' | 'NA' | ''

interface ChecklistItem {
  area: string
  item: string
  status: ItemStatus
  note: string
}

interface FindingEntry {
  id: string
  area: string
  description: string
  priority: FindingPriority
  assigned_to: string
  due_date: string
}

// ─── Initialize checklist state ───────────────────────────────────────────────

function initChecklist(): ChecklistItem[] {
  return CHECKLIST_AREAS.flatMap(a =>
    a.items.map(item => ({ area: a.area, item, status: '' as ItemStatus, note: '' }))
  )
}

// ─── StatusToggle component ───────────────────────────────────────────────────

function StatusToggle({ value, onChange }: { value: ItemStatus; onChange: (v: ItemStatus) => void }) {
  const btn = (v: ItemStatus, label: string, activeClass: string) => (
    <button
      type="button"
      onClick={() => onChange(value === v ? '' : v)}
      className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
        value === v ? activeClass : 'border-gray-200 text-gray-400 hover:border-gray-300 bg-white'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {btn('OK', '✓ OK', 'border-green-400 bg-green-100 text-green-800')}
      {btn('NOK', '✗ NOK', 'border-red-400 bg-red-100 text-red-800')}
      {btn('NA', 'N/A', 'border-gray-400 bg-gray-100 text-gray-600')}
    </div>
  )
}

// ─── Area Section component ───────────────────────────────────────────────────

function AreaSection({
  area, items, checklist, onItemChange
}: {
  area: string
  items: string[]
  checklist: ChecklistItem[]
  onItemChange: (area: string, item: string, field: 'status' | 'note', value: string) => void
}) {
  const [open, setOpen] = useState(true)
  const areaItems = checklist.filter(c => c.area === area)
  const nokCount = areaItems.filter(c => c.status === 'NOK').length
  const okCount = areaItems.filter(c => c.status === 'OK').length
  const filled = areaItems.filter(c => c.status !== '').length

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">{area}</span>
          <div className="flex items-center gap-2">
            {nokCount > 0 && (
              <span className="badge text-[10px] bg-red-100 text-red-700 border-red-200">
                {nokCount} NOK
              </span>
            )}
            {okCount > 0 && (
              <span className="badge text-[10px] bg-green-100 text-green-700 border-green-200">
                {okCount} OK
              </span>
            )}
            <span className="text-[10px] text-gray-400">{filled}/{items.length} diisi</span>
          </div>
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {items.map((item, i) => {
            const ci = checklist.find(c => c.area === area && c.item === item)!
            return (
              <div key={i} className={`px-4 py-3 ${ci.status === 'NOK' ? 'bg-red-50/40' : ci.status === 'OK' ? 'bg-green-50/20' : ''}`}>
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-sm text-gray-700 leading-snug pt-0.5">{item}</p>
                  <StatusToggle
                    value={ci.status}
                    onChange={v => onItemChange(area, item, 'status', v)}
                  />
                </div>
                {ci.status === 'NOK' && (
                  <input
                    type="text"
                    value={ci.note}
                    onChange={e => onItemChange(area, item, 'note', e.target.value)}
                    placeholder="Uraikan deskripsi temuan / kondisi tidak sesuai..."
                    className="mt-2 w-full px-3 py-1.5 text-xs border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 bg-white placeholder:text-gray-400"
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateInternalInspectionPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { success, error } = useToast()

  // Basic info state
  const [form, setForm] = useState({
    business_unit_id: '',
    vessel_id: '',
    inspection_date: new Date().toISOString().slice(0, 10),
    lead_inspector: user?.full_name || '',
    additional_inspectors: '',
    notes: '',
    hse_pic: '',
  })

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initChecklist)

  // Extra findings state (beyond NOK items)
  const [extraFindings, setExtraFindings] = useState<FindingEntry[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const { ships } = useShips()
  const filteredVessels = shipOptions(ships)

  const handleItemChange = (area: string, item: string, field: 'status' | 'note', value: string) => {
    setChecklist(prev => prev.map(c =>
      c.area === area && c.item === item ? { ...c, [field]: value } : c
    ))
  }

  // Collect NOK items as auto-findings
  const nokItems = checklist.filter(c => c.status === 'NOK')

  const addFinding = () => {
    setExtraFindings(prev => [...prev, {
      id: `extra-${Date.now()}`,
      area: '', description: '', priority: 'MEDIUM', assigned_to: '', due_date: ''
    }])
  }

  const updateFinding = (id: string, k: keyof FindingEntry, v: string) => {
    setExtraFindings(prev => prev.map(f => f.id === id ? { ...f, [k]: v } : f))
  }

  const removeFinding = (id: string) => {
    setExtraFindings(prev => prev.filter(f => f.id !== id))
  }

  const totalItems = checklist.length
  const okCount = checklist.filter(c => c.status === 'OK').length
  const nokCount = nokItems.length
  const naCount = checklist.filter(c => c.status === 'NA').length
  const filledCount = checklist.filter(c => c.status !== '').length

  // Step 1 validation
  const step1Valid = form.vessel_id && form.inspection_date && form.lead_inspector

  // Step 2: any item filled
  const step2Valid = filledCount > 0

  async function handleSubmit(e: FormEvent, isDraft: boolean) {
    e.preventDefault()
    if (!form.vessel_id) { error('Data Tidak Lengkap', 'Pilih kapal terlebih dahulu.'); return }
    if (!form.inspection_date) { error('Data Tidak Lengkap', 'Tanggal inspeksi harus diisi.'); return }
    if (!form.lead_inspector.trim()) { error('Data Tidak Lengkap', 'Lead inspektor harus diisi.'); return }

    setSubmitting(true)
    await new Promise(r => setTimeout(r, 900))
    setSubmitting(false)

    success(
      isDraft ? 'Inspeksi Disimpan sebagai Draft' : 'Laporan Inspeksi Disubmit',
      isDraft ? 'Anda dapat melanjutkan pengisian kapan saja.' : 'Laporan akan diteruskan untuk approval.'
    )
    navigate('/inspections/internal')
  }

  return (
    <div className="max-w-3xl flex flex-col gap-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/inspections/internal')} className="w-fit gap-2">
        <ArrowLeft size={16} /> Kembali
      </Button>

      <div>
        <h2 className="text-base font-bold text-[#1B3A6B]">Form Inspeksi Internal Kapal</h2>
        <p className="text-sm text-gray-500 mt-0.5">Lakukan pemeriksaan menyeluruh dan catat temuan di setiap area kapal.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([
          { n: 1 as const, label: 'Informasi Dasar' },
          { n: 2 as const, label: 'Checklist Inspeksi' },
          { n: 3 as const, label: 'Temuan & Submit' },
        ] as { n: 1 | 2 | 3; label: string }[]).map(({ n, label }) => (
          <div key={n} className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              step === n ? 'bg-[#1B3A6B] text-white' :
              step > n ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {step > n ? '✓' : n}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step === n ? 'text-[#1B3A6B]' : 'text-gray-400'}`}>{label}</span>
            {n < 3 && <div className="w-8 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <form onSubmit={e => e.preventDefault()}>

        {/* ── Step 1: Informasi Dasar ── */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6 flex flex-col gap-5">
              <h3 className="text-sm font-semibold text-[#1B3A6B] border-b pb-2.5">Informasi Dasar Inspeksi</h3>

              <Select
                label="Unit Bisnis" required value={form.business_unit_id}
                onChange={e => { set('business_unit_id', e.target.value); set('vessel_id', '') }}
                placeholder="Pilih Unit Bisnis"
                options={mockBusinessUnits.map(bu => ({ value: bu.id, label: `${bu.code} – ${bu.name}` }))}
              />

              <Select
                label="Kapal yang Diinspeksi" required value={form.vessel_id}
                onChange={e => setForm(p => ({ ...p, vessel_id: e.target.value }))}
                placeholder="Pilih Kapal"
                options={filteredVessels}
              />

              {/* HSE PIC info — auto-derived from selected vessel's fleet */}
              <Input
                type="date" label="Tanggal Inspeksi" required
                value={form.inspection_date}
                onChange={e => set('inspection_date', e.target.value)}
              />

              <Input
                label="Lead Inspektor" required
                value={form.lead_inspector}
                onChange={e => set('lead_inspector', e.target.value)}
                placeholder="Nama inspektor utama"
              />

              <Input
                label="PIC HSE"
                value={form.hse_pic}
                onChange={e => set('hse_pic', e.target.value)}
                placeholder="Nama HSE Officer penanggung jawab"
                hint="Nama PIC HSE yang bertanggung jawab"
              />

              <Textarea
                label="Inspektor Tambahan"
                value={form.additional_inspectors}
                onChange={e => set('additional_inspectors', e.target.value)}
                placeholder="Nama inspektor tambahan, pisahkan dengan koma"
                rows={2}
                hint="Opsional. Contoh: Safety Officer, Chief Mate"
              />

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                >
                  Lanjut ke Checklist →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Checklist ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            {/* Progress summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Progress Pengisian</p>
                <p className="text-sm font-semibold text-[#1B3A6B]">{filledCount}/{totalItems} item</p>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1B3A6B] rounded-full transition-all"
                  style={{ width: `${(filledCount / totalItems) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1 text-green-700"><CheckCircle2 size={11} /> {okCount} OK</span>
                <span className="flex items-center gap-1 text-red-600"><AlertTriangle size={11} /> {nokCount} NOK</span>
                <span className="text-gray-400">{naCount} N/A</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">Centang <strong>✓ OK</strong> jika kondisi sesuai, <strong>✗ NOK</strong> jika tidak sesuai (wajib isi uraian), atau <strong>N/A</strong> jika tidak berlaku untuk kapal ini.</p>
            </div>

            {CHECKLIST_AREAS.map(({ area, items }) => (
              <AreaSection
                key={area}
                area={area}
                items={items}
                checklist={checklist}
                onItemChange={handleItemChange}
              />
            ))}

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                ← Kembali
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                Lanjut ke Temuan & Submit →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Findings & Submit ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Ringkasan Checklist</h3>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-700">{totalItems}</p>
                  <p className="text-xs text-gray-400">Total Item</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-700">{okCount}</p>
                  <p className="text-xs text-gray-400">OK</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-red-600">{nokCount}</p>
                  <p className="text-xs text-gray-400">NOK</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-500">{naCount}</p>
                  <p className="text-xs text-gray-400">N/A</p>
                </div>
              </div>
            </div>

            {/* NOK items auto-collected */}
            {nokCount > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Temuan dari Checklist
                    <span className="ml-2 badge bg-red-100 text-red-700 border-red-200">{nokCount} item</span>
                  </h3>
                  <div className="flex flex-col gap-3">
                    {nokItems.map((ci, i) => (
                      <div key={i} className="border border-red-200 rounded-lg bg-red-50/30 p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase">{ci.area}</p>
                            <p className="text-sm text-gray-800 mt-0.5">{ci.item}</p>
                            {ci.note && <p className="text-xs text-red-700 mt-1 italic">"{ci.note}"</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <Select
                            label="Prioritas"
                            value="MEDIUM"
                            onChange={() => {}}
                            options={[
                              { value: 'CRITICAL', label: 'Kritis' },
                              { value: 'HIGH', label: 'Tinggi' },
                              { value: 'MEDIUM', label: 'Sedang' },
                              { value: 'LOW', label: 'Rendah' },
                            ]}
                          />
                          <Input label="PIC / Assigned To" placeholder="Nama penanggung jawab" />
                          <Input type="date" label="Target Penyelesaian" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Extra findings */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Temuan Tambahan</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addFinding} className="gap-1.5">
                    <Plus size={14} /> Tambah Temuan
                  </Button>
                </div>
                {extraFindings.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Tidak ada temuan tambahan di luar checklist.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {extraFindings.map(f => (
                      <div key={f.id} className="border border-orange-200 rounded-lg bg-orange-50/20 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-orange-700">Temuan Tambahan</p>
                          <button type="button" onClick={() => removeFinding(f.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Input
                            label="Area"
                            value={f.area}
                            onChange={e => updateFinding(f.id, 'area', e.target.value)}
                            placeholder="Contoh: Ruang Mesin, Dek, dll."
                          />
                          <Textarea
                            label="Deskripsi Temuan"
                            value={f.description}
                            onChange={e => updateFinding(f.id, 'description', e.target.value)}
                            placeholder="Uraikan kondisi temuan secara detail..."
                            rows={2}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Select
                              label="Prioritas"
                              value={f.priority}
                              onChange={e => updateFinding(f.id, 'priority', e.target.value)}
                              options={[
                                { value: 'CRITICAL', label: 'Kritis' },
                                { value: 'HIGH', label: 'Tinggi' },
                                { value: 'MEDIUM', label: 'Sedang' },
                                { value: 'LOW', label: 'Rendah' },
                              ]}
                            />
                            <Input
                              label="PIC / Assigned To"
                              value={f.assigned_to}
                              onChange={e => updateFinding(f.id, 'assigned_to', e.target.value)}
                              placeholder="Nama penanggung jawab"
                            />
                            <Input
                              type="date" label="Target Penyelesaian"
                              value={f.due_date}
                              onChange={e => updateFinding(f.id, 'due_date', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardContent className="p-5">
                <Textarea
                  label="Catatan & Rekomendasi Umum"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Tuliskan catatan umum, rekomendasi, atau hal-hal yang perlu ditindaklanjuti secara keseluruhan..."
                  rows={4}
                  hint="Opsional"
                />
              </CardContent>
            </Card>

            {/* Result preview */}
            <div className={`p-3 rounded-lg border ${
              nokCount === 0 ? 'bg-green-50 border-green-200' :
              nokCount <= 3 ? 'bg-amber-50 border-amber-200' :
              'bg-red-50 border-red-200'
            }`}>
              <p className={`text-xs font-semibold ${
                nokCount === 0 ? 'text-green-700' :
                nokCount <= 3 ? 'text-amber-700' :
                'text-red-700'
              }`}>
                Prakiraan Hasil Inspeksi:{' '}
                {nokCount === 0 ? '✓ SATISFACTORY – Tidak ada temuan' :
                 nokCount <= 3 ? '⚠ CONDITIONAL – Ada temuan yang perlu ditindaklanjuti' :
                 '✗ UNSATISFACTORY – Banyak temuan memerlukan perhatian segera'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                ← Kembali ke Checklist
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button" variant="outline"
                  onClick={e => handleSubmit(e as never, true)}
                  loading={submitting}
                >
                  Simpan Draft
                </Button>
                <Button
                  type="button"
                  onClick={e => handleSubmit(e as never, false)}
                  loading={submitting}
                >
                  Submit Laporan
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
