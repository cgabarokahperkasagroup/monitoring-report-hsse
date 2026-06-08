import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/stores/authStore'
import { mockBusinessUnits, mockUsers } from '@/data/mockData'
import { useShips, getFleetOptions, shipOptions, findShipById } from '@/hooks/useShips'

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function CreateInspectionPlanPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { success, error } = useToast()

  const today = new Date()
  const [form, setForm] = useState({
    business_unit_id: '',
    fleet_id: '',
    vessel_id: '',
    hse_officer_id: '',
    scheduled_date: '',
    period_month: String(today.getMonth() + 1),
    period_year: String(today.getFullYear()),
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Only HEAD_HSSE and SUPER_ADMIN can access this page
  const canCreate = user?.role === 'HEAD_HSSE' || user?.role === 'SUPER_ADMIN'
  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <ShieldCheck size={40} className="text-gray-300" />
        <p className="text-base font-semibold text-gray-500">Akses Terbatas</p>
        <p className="text-sm text-gray-400">
          Hanya Head HSSE Corporate yang dapat membuat rencana jadwal inspeksi.
        </p>
        <Button variant="outline" onClick={() => navigate('/inspections/schedule')}>
          Kembali ke Jadwal
        </Button>
      </div>
    )
  }

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const { ships } = useShips()
  const fleetOpts = getFleetOptions(ships)
  const vesselOpts = shipOptions(ships, form.fleet_id || undefined)

  const selectedShip = findShipById(ships, form.vessel_id)
  const autoHseOfficer = undefined

  // HSE officers: all PIC-role users linked to a fleet
  const hseUsers = mockUsers.filter(u => u.role === 'PIC' && u.fleet_id)

  const isValid = form.vessel_id && form.scheduled_date && form.period_month && form.period_year

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.vessel_id) { error('Data Tidak Lengkap', 'Pilih kapal terlebih dahulu.'); return }
    if (!form.scheduled_date) { error('Data Tidak Lengkap', 'Tanggal jadwal harus diisi.'); return }

    setSubmitting(true)
    await new Promise(r => setTimeout(r, 800))
    setSubmitting(false)

    const month = MONTH_NAMES[Number(form.period_month) - 1]
    success(
      'Rencana Jadwal Dibuat',
      `Rencana inspeksi ${selectedShip?.name ?? '—'} untuk periode ${month} ${form.period_year} berhasil dibuat.`
    )
    navigate('/inspections/schedule')
  }

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/inspections/schedule')} className="w-fit gap-2">
        <ArrowLeft size={16} /> Kembali ke Jadwal
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={18} className="text-[#1B3A6B]" />
          <h2 className="text-base font-bold text-[#1B3A6B]">Buat Rencana Jadwal Inspeksi Internal</h2>
        </div>
        <p className="text-sm text-gray-500">
          Tetapkan jadwal inspeksi internal untuk setiap kapal beserta HSE PIC yang bertanggung jawab.
        </p>
      </div>

      {/* Created by badge */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[#1B3A6B]/5 border border-[#1B3A6B]/15 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white font-bold text-sm shrink-0">
          {user.full_name.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-semibold text-[#1B3A6B]">{user.full_name}</p>
          <p className="text-xs text-gray-500">
            {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Head HSSE Corporate'} · Pembuat Rencana Jadwal
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 flex flex-col gap-5">
            <h3 className="text-sm font-semibold text-[#1B3A6B] border-b pb-2.5">Informasi Rencana Inspeksi</h3>

            <Select searchable
              label="Armada" required
              value={form.fleet_id}
              onChange={e => { set('fleet_id', e.target.value); set('vessel_id', '') }}
              placeholder="Pilih Armada"
              options={fleetOpts}
            />

            <Select searchable
              label="Kapal yang Akan Diinspeksi" required
              value={form.vessel_id}
              onChange={e => set('vessel_id', e.target.value)}
              placeholder={form.fleet_id ? 'Pilih Kapal' : 'Pilih armada terlebih dahulu'}
              options={vesselOpts}
            />

            {/* HSE PIC */}
            <Select searchable
              label="HSE PIC" required
              value={form.hse_officer_id}
              onChange={e => set('hse_officer_id', e.target.value)}
              placeholder="Pilih HSE Officer"
              options={hseUsers.map(u => ({ value: u.id, label: u.full_name }))}
            />

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
              label="Tanggal Jadwal Inspeksi" required
              value={form.scheduled_date}
              onChange={e => set('scheduled_date', e.target.value)}
              hint="Tanggal target pelaksanaan inspeksi oleh HSE"
            />

            <Textarea
              label="Instruksi / Catatan"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Tuliskan instruksi khusus atau catatan untuk HSE PIC yang akan melaksanakan inspeksi..."
              rows={3}
              hint="Opsional"
            />

            {/* Info box */}
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Setelah rencana dibuat, HSE PIC yang ditunjuk akan menerima notifikasi dan dapat melaksanakan
                inspeksi aktual sesuai jadwal yang ditetapkan.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => navigate('/inspections/schedule')}>
                Batal
              </Button>
              <Button type="submit" loading={submitting} disabled={!isValid}>
                Simpan Rencana Jadwal
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
