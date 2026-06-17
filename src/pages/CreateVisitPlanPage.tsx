import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, Ship } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/stores/authStore'
import { useShips, getFleetOptions, shipOptions, findShipById } from '@/hooks/useShips'
import { useVisitSchedulesData } from '@/hooks/useVisitSchedulesData'

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function CreateVisitPlanPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { success, error } = useToast()

  const canCreate = user?.role === 'HEAD_HSSE' || user?.role === 'SUPER_ADMIN'

  const today = new Date()
  const [form, setForm] = useState({
    fleet_id: '',
    vessel_id: '',
    scheduled_date: '',
    period_month: String(today.getMonth() + 1),
    period_year: String(today.getFullYear()),
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Hooks must run unconditionally, before any early return (Rules of Hooks).
  const { ships } = useShips()
  const { createSchedule } = useVisitSchedulesData()

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <Ship size={40} className="text-gray-300" />
        <p className="text-base font-semibold text-gray-500">Akses Terbatas</p>
        <p className="text-sm text-gray-400">
          Hanya Head HSSE Corporate atau Super Admin yang dapat membuat rencana kunjungan.
        </p>
        <Button variant="outline" onClick={() => navigate('/vessel-compliance')}>
          Kembali
        </Button>
      </div>
    )
  }

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const fleetOpts = getFleetOptions(ships)
  const filteredVessels = form.fleet_id ? shipOptions(ships, form.fleet_id) : []

  const selectedShip = findShipById(ships, form.vessel_id)
  const selectedFleetName = fleetOpts.find(f => f.value === form.fleet_id)?.label
  const selectedFleetOpHead = selectedShip?.operation_head ?? null

  const isValid = form.fleet_id && form.vessel_id && form.scheduled_date && form.period_month && form.period_year

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.vessel_id) { error('Data Tidak Lengkap', 'Pilih kapal terlebih dahulu.'); return }
    if (!form.scheduled_date) { error('Data Tidak Lengkap', 'Tanggal rencana kunjungan harus diisi.'); return }

    setSubmitting(true)
    const result = await createSchedule({
      vessel_id: form.vessel_id,
      vessel_name: selectedShip?.name,
      fleet_id: form.fleet_id,
      fleet_name: selectedShip?.fleet?.name ?? selectedFleetName,
      scheduled_date: form.scheduled_date,
      period_month: Number(form.period_month),
      period_year: Number(form.period_year),
      notes: form.notes || undefined,
      created_by: user!.id,
    })
    setSubmitting(false)

    if (result?.error) { error('Gagal Membuat Rencana', result.error); return }

    const month = MONTH_NAMES[Number(form.period_month) - 1]
    success(
      'Rencana Kunjungan Dibuat',
      `Rencana kunjungan ${selectedShip?.name ?? '—'} untuk periode ${month} ${form.period_year} berhasil dibuat.`
    )
    navigate('/vessel-compliance')
  }

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/vessel-compliance')} className="w-fit gap-2">
        <ArrowLeft size={16} /> Kembali ke Performance Operation Visit
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Ship size={18} className="text-[#1B3A6B]" />
          <h2 className="text-base font-bold text-[#1B3A6B]">Buat Rencana Kunjungan Kapal</h2>
        </div>
        <p className="text-sm text-gray-500">
          Tetapkan jadwal kunjungan rutin ke kapal-kapal dalam armada Anda untuk periode yang dipilih.
        </p>
      </div>

      {/* Creator info */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[#1B3A6B]/5 border border-[#1B3A6B]/15 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white font-bold text-sm shrink-0">
          {user?.full_name.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-semibold text-[#1B3A6B]">{user?.full_name}</p>
          <p className="text-xs text-gray-500">
            {user?.role === 'HEAD_HSSE' ? 'Head HSSE Corporate' : 'Super Admin'} · Pembuat Rencana Kunjungan
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 flex flex-col gap-5">
            <h3 className="text-sm font-semibold text-[#1B3A6B] border-b pb-2.5">Informasi Rencana Kunjungan</h3>

            <Select searchable
              label="Armada" required
              value={form.fleet_id}
              onChange={e => { set('fleet_id', e.target.value); set('vessel_id', '') }}
              placeholder="Pilih Armada"
              options={fleetOpts}
            />

            <Select searchable
              label="Kapal yang Akan Dikunjungi" required
              value={form.vessel_id}
              onChange={e => set('vessel_id', e.target.value)}
              placeholder={form.fleet_id ? 'Pilih Kapal' : 'Pilih armada terlebih dahulu'}
              options={filteredVessels}
            />

            {/* Operation Head info */}
            {form.vessel_id && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Operation Head Penanggung Jawab</label>
                <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg">
                  {selectedFleetOpHead ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center text-[#1B3A6B] font-bold text-sm shrink-0">
                        {selectedFleetOpHead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{selectedFleetOpHead.name}</p>
                        <p className="text-xs text-gray-500">Operation Head · {selectedFleetName}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Operation Head belum ditetapkan untuk kapal ini</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Periode – Bulan" required
                value={form.period_month}
                onChange={e => set('period_month', e.target.value)}
                options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
              />
              <Select
                label="Periode – Tahun" required
                value={form.period_year}
                onChange={e => set('period_year', e.target.value)}
                options={[2025, 2026, 2027, 2028].map(y => ({ value: String(y), label: String(y) }))}
              />
            </div>

            <Input
              type="date"
              label="Tanggal Rencana Kunjungan" required
              value={form.scheduled_date}
              onChange={e => set('scheduled_date', e.target.value)}
              hint="Tanggal target pelaksanaan kunjungan ke kapal"
            />

            <Textarea
              label="Catatan / Agenda Kunjungan"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Tuliskan agenda atau catatan khusus untuk kunjungan ini..."
              rows={3}
              hint="Opsional"
            />

            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Rencana kunjungan ini adalah <strong>Vessel Visit</strong>. Setelah rencana dibuat, Operation Head yang bertanggung jawab akan melaksanakan kunjungan dan membuat laporan visit sesuai jadwal.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => navigate('/vessel-compliance')}>
                Batal
              </Button>
              <Button type="submit" loading={submitting} disabled={!isValid}>
                Simpan Rencana Kunjungan
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
