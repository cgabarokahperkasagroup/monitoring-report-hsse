import { useEffect } from 'react'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useShips, shipOptions, findShipById } from '@/hooks/useShips'
import type { FormState } from '@/hooks/usePublicOwnerVisitForm'
import type { OwnerVisitOptions } from '@/services/publicOwnerVisit'
import { cn } from '@/lib/utils'
import { getLocalToday } from '@/utils'

interface Props {
  form: FormState
  options: OwnerVisitOptions
  errors: Record<string, string>
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}

export function VisitDetailsStep({ form, options, errors, setField }: Props) {
  const { ships, loading: shipsLoading, error: shipsError } = useShips()
  const shippingBU = options.business_units.find(b => b.code === 'SHP')
  const sites = options.sites.filter(s => s.business_unit_id === form.business_unit_id)
  const today = getLocalToday()

  // 'VESSEL' adalah pilihan awal, jadi tombolnya mungkin tidak pernah diklik.
  // Tanpa ini business_unit_id tetap kosong dan validasi menolak tanpa ada
  // field yang terlihat untuk diperbaiki.
  useEffect(() => {
    if (form.target === 'VESSEL' && shippingBU && form.business_unit_id !== shippingBU.id) {
      setField('business_unit_id', shippingBU.id)
    }
  }, [form.target, form.business_unit_id, shippingBU, setField])

  function handleTarget(target: 'VESSEL' | 'SITE') {
    setField('target', target)
    // Kunjungan kapal selalu milik unit bisnis Shipping.
    if (target === 'VESSEL' && shippingBU) {
      setField('business_unit_id', shippingBU.id)
    } else if (target === 'SITE') {
      // Kosongkan unit bisnis untuk site agar pengguna memilih secara sadar.
      setField('business_unit_id', '')
    }
  }

  function handleShip(vesselId: string) {
    setField('vessel_external_id', vesselId)
    const ship = findShipById(ships, vesselId)
    setField('vessel_name', ship?.name ?? '')
    setField('fleet_external_id', ship ? String(ship.fleet.id) : '')
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        id="reporter_name" label="Nama pengisi" required
        value={form.reporter_name} error={errors.reporter_name}
        onChange={e => setField('reporter_name', e.target.value)}
        placeholder="Nama lengkap Anda"
      />
      <Input
        id="reporter_position" label="Jabatan"
        value={form.reporter_position} error={errors.reporter_position}
        onChange={e => setField('reporter_position', e.target.value)}
        placeholder="Mis. Direktur Operasi"
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[#4A5568]">
          Objek kunjungan<span className="text-red-500 ml-1">*</span>
        </span>
        <div className="grid grid-cols-2 gap-3">
          {(['VESSEL', 'SITE'] as const).map(t => (
            <button
              key={t} type="button" onClick={() => handleTarget(t)}
              className={cn(
                'px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                form.target === t
                  ? 'border-[#1B3A6B] bg-[#1B3A6B]/5 text-[#1B3A6B]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {t === 'VESSEL' ? 'Kapal' : 'Lokasi / Site'}
            </button>
          ))}
        </div>
      </div>

      {form.target === 'VESSEL' ? (
        <div className="flex flex-col gap-1.5">
          <Select
            id="vessel" label="Kapal" required searchable
            value={form.vessel_external_id} error={errors.vessel_external_id}
            onChange={e => handleShip(e.target.value)}
            options={shipOptions(ships)}
            placeholder={shipsLoading ? 'Memuat daftar kapal…' : 'Pilih kapal'}
          />
          {shipsError && (
            <p className="text-xs text-red-600">
              Gagal memuat daftar kapal. Periksa koneksi lalu muat ulang halaman.
            </p>
          )}
        </div>
      ) : (
        <>
          <Select
            id="business_unit" label="Unit Bisnis" required
            value={form.business_unit_id} error={errors.business_unit_id}
            onChange={e => { setField('business_unit_id', e.target.value); setField('site_id', '') }}
            options={options.business_units.map(b => ({ value: b.id, label: b.name }))}
            placeholder="Pilih unit bisnis"
          />
          <Select
            id="site" label="Lokasi" required searchable
            value={form.site_id} error={errors.site_id}
            onChange={e => setField('site_id', e.target.value)}
            options={sites.map(s => ({ value: s.id, label: s.name }))}
            placeholder={form.business_unit_id ? 'Pilih lokasi' : 'Pilih unit bisnis dulu'}
            disabled={!form.business_unit_id}
          />
        </>
      )}

      <Input
        id="visit_date" label="Tanggal kunjungan" type="date" required max={today}
        value={form.visit_date} error={errors.visit_date}
        onChange={e => setField('visit_date', e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="start_time" label="Jam mulai" type="time"
          value={form.start_time} onChange={e => setField('start_time', e.target.value)}
        />
        <Input
          id="end_time" label="Jam selesai" type="time"
          value={form.end_time} onChange={e => setField('end_time', e.target.value)}
        />
      </div>

      <Input
        id="other_participants" label="Peserta lain"
        value={form.other_participants}
        onChange={e => setField('other_participants', e.target.value)}
        hint="Pisahkan dengan koma"
        placeholder="Ani, Budi, Cak"
      />
      <Textarea
        id="agenda" label="Agenda" value={form.agenda} error={errors.agenda}
        onChange={e => setField('agenda', e.target.value)}
      />
      <Textarea
        id="summary" label="Ringkasan kunjungan" value={form.summary} error={errors.summary}
        onChange={e => setField('summary', e.target.value)}
      />
    </div>
  )
}
