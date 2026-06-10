import { useState, useEffect, useMemo, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Ship, MapPin, Crown, Info, CalendarCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { FileUpload } from '@/components/ui/file-upload'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { createVisit } from '@/hooks/useVisitsData'
import { useShips, shipOptions, findShipById } from '@/hooks/useShips'
import { cn } from '@/lib/utils'
import type { VisitType } from '@/types'

const visitTypes = [
  {
    type: 'OWNER_VISIT' as VisitType, label: 'Owner Visit',
    icon: Crown, desc: 'Kunjungan oleh Owner/Direksi ke kapal atau site. Temuan berstatus MAJOR – prioritas tertinggi.',
    color: 'border-amber-400 bg-amber-50', iconColor: 'text-amber-600',
    roles: ['SUPER_ADMIN', 'MANAGEMENT'],
  },
  {
    type: 'VESSEL_VISIT' as VisitType, label: 'Vessel Visit',
    icon: Ship, desc: 'Kunjungan ke kapal dalam armada oleh Operation Head atau Manajemen.',
    color: 'border-blue-400 bg-blue-50', iconColor: 'text-blue-600',
    roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD'],
  },
  {
    type: 'SITE_VISIT' as VisitType, label: 'Site Visit',
    icon: MapPin, desc: 'Kunjungan ke lokasi operasional unit bisnis oleh Site Manager atau PIC.',
    color: 'border-green-400 bg-green-50', iconColor: 'text-green-600',
    roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'SITE_MGR', 'PIC'],
  },
]

export default function CreateVisitPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { success, error } = useToast()

  const locationState = location.state as { preselectedType?: VisitType; vessel_id?: string; schedule_id?: string; vessel_name?: string } | null
  const preselectedType = locationState?.preselectedType ?? null
  const preselectedVesselId = locationState?.vessel_id ?? ''
  const scheduleId = locationState?.schedule_id ?? null
  const scheduleVesselName = locationState?.vessel_name ?? ''

  const [businessUnits, setBusinessUnits] = useState<{ id: string; code: string; name: string }[]>([])
  const [sites, setSites] = useState<{ id: string; name: string; business_unit_id: string; site_type?: string | null }[]>([])

  useEffect(() => {
    supabase.from('business_units_mh').select('id, code, name').order('name').then(({ data }) => {
      if (data) setBusinessUnits(data)
    })
    supabase.from('sites').select('id, name, business_unit_id, site_type').order('name').then(({ data }) => {
      if (data) setSites(data)
    })
  }, [])

  const shippingBUID = useMemo(() => businessUnits.find(bu => bu.code === 'SHP')?.id ?? '', [businessUnits])

  const [selectedType, setSelectedType] = useState<VisitType | null>(preselectedType)
  const [form, setForm] = useState({
    business_unit_id: '',
    vessel_id: preselectedVesselId, site_id: '',
    visit_date: '', start_time: '', end_time: '',
    participants: '', agenda: '', summary: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Once BUs load, set SHP as default for VESSEL_VISIT
  useEffect(() => {
    if (preselectedType === 'VESSEL_VISIT' && shippingBUID) {
      setForm(p => ({ ...p, business_unit_id: shippingBUID }))
    }
  }, [shippingBUID, preselectedType])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSelectType = (type: VisitType) => {
    setSelectedType(type)
    if (type === 'VESSEL_VISIT') {
      setForm(p => ({ ...p, business_unit_id: shippingBUID, site_id: '' }))
    } else {
      setForm(p => ({ ...p, business_unit_id: '', vessel_id: '', site_id: '' }))
    }
  }

  const availableTypes = visitTypes.filter(vt => !user || vt.roles.includes(user.role))
  const { ships } = useShips()
  const filteredVessels = shipOptions(ships)
  const filteredSites = form.business_unit_id
    ? sites.filter(s => s.business_unit_id === form.business_unit_id)
    : sites

  async function handleSubmit(e: FormEvent, saveAsDraft: boolean) {
    e.preventDefault()
    if (!user || !selectedType) return
    setSubmitting(true)

    const buId = selectedType === 'VESSEL_VISIT' ? shippingBUID : form.business_unit_id
    const buCode = businessUnits.find(bu => bu.id === buId)?.code ?? 'BU'

    const result = await createVisit({
      visit_type: selectedType,
      business_unit_id: buId,
      vessel_id: form.vessel_id || undefined,
      vessel_name: form.vessel_id ? findShipById(ships, form.vessel_id)?.name : undefined,
      site_id: form.site_id || undefined,
      visit_date: form.visit_date,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
      participants: form.participants ? form.participants.split(',').map(s => s.trim()).filter(Boolean) : [],
      agenda: form.agenda || undefined,
      summary: form.summary || undefined,
      status: saveAsDraft ? 'DRAFT' : 'APPROVED',
      created_by: user.id,
      bu_code: buCode,
    })

    setSubmitting(false)

    if (result.error) {
      error('Gagal menyimpan kunjungan', result.error)
      return
    }

    // Link visit to schedule if this is a realization
    if (scheduleId && result.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('visit_schedules') as any)
        .update({ visit_id: result.id, status: 'COMPLETED' })
        .eq('id', scheduleId)
    }

    success(
      saveAsDraft ? 'Kunjungan disimpan sebagai Draft' : 'Kunjungan dimulai',
      saveAsDraft ? 'Anda dapat melanjutkan mengisi kapan saja' : 'Temuan dapat langsung ditambahkan. Submit laporan akhir setelah kunjungan selesai.'
    )
    navigate(`/visits/${result.id}`)
  }

  return (
    <div className="max-w-3xl flex flex-col gap-5">
      <Button variant="ghost" size="sm" onClick={() => navigate(scheduleId ? '/vessel-compliance' : '/visits')} className="w-fit">
        <ArrowLeft size={16} /> Kembali
      </Button>

      {scheduleId && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <CalendarCheck size={16} className="shrink-0 mt-0.5 text-blue-500" />
          <div>
            <p className="font-semibold">Realisasi Rencana Kunjungan</p>
            {scheduleVesselName && (
              <p className="text-xs text-blue-600 mt-0.5">Kapal: <strong>{scheduleVesselName}</strong> — kunjungan ini akan menyelesaikan rencana jadwal secara otomatis.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Choose visit type */}
      {!selectedType && (
        <div>
          <h2 className="text-base font-semibold text-[#1B3A6B] mb-1">Pilih Jenis Kunjungan</h2>
          <p className="text-sm text-gray-500 mb-4">Pilih jenis kunjungan yang akan dibuat.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {availableTypes.map(vt => (
              <button
                key={vt.type}
                onClick={() => handleSelectType(vt.type)}
                className={cn('p-5 rounded-xl border-2 text-left transition-all hover:shadow-md', vt.color)}
              >
                <vt.icon size={28} className={cn('mb-3', vt.iconColor)} />
                <p className="font-bold text-gray-800 text-sm">{vt.label}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{vt.desc}</p>
              </button>
            ))}
          </div>
          {availableTypes.length === 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              Role Anda tidak memiliki akses untuk membuat kunjungan baru.
            </div>
          )}
        </div>
      )}

      {/* Step 2: Form */}
      {selectedType && (
        <form>
          <div className="flex items-center gap-3 mb-4">
            <button type="button" onClick={() => setSelectedType(null)}
              className="text-sm text-[#1B3A6B] hover:underline flex items-center gap-1">
              <ArrowLeft size={14} /> Ubah jenis
            </button>
            <div className={cn('badge', visitTypes.find(vt => vt.type === selectedType)?.color.replace('border-', 'bg-').replace('-400', '-100'))}>
              {visitTypes.find(vt => vt.type === selectedType)?.label}
            </div>
          </div>

          <Card>
            <CardContent className="p-6 flex flex-col gap-5">
              <h3 className="text-base font-semibold text-[#1B3A6B] border-b pb-3">Informasi Kunjungan</h3>

              {selectedType === 'VESSEL_VISIT' ? (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Unit Bisnis</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <Ship size={15} className="text-blue-600 shrink-0" />
                    <span className="text-sm font-medium text-blue-800">SHP – Shipping</span>
                  </div>
                </div>
              ) : (
                <Select searchable
                  label="Unit Bisnis" required value={form.business_unit_id}
                  onChange={e => { set('business_unit_id', e.target.value); set('vessel_id', ''); set('site_id', '') }}
                  placeholder="Pilih Unit Bisnis"
                  options={businessUnits.map(bu => ({ value: bu.id, label: `${bu.code} – ${bu.name}` }))}
                />
              )}

              {(selectedType === 'VESSEL_VISIT' || selectedType === 'OWNER_VISIT') && (
                <Select searchable label="Kapal yang Dikunjungi" required={selectedType === 'VESSEL_VISIT'} value={form.vessel_id}
                  onChange={e => set('vessel_id', e.target.value)} placeholder="Pilih Kapal"
                  options={filteredVessels}
                />
              )}

              {(selectedType === 'SITE_VISIT' || selectedType === 'OWNER_VISIT') && (
                <Select searchable label="Site yang Dikunjungi" required={selectedType === 'SITE_VISIT'} value={form.site_id}
                  onChange={e => set('site_id', e.target.value)} placeholder="Pilih Site/Lokasi"
                  options={filteredSites.map(s => ({ value: s.id, label: `${s.name}${s.site_type ? ` (${s.site_type})` : ''}` }))}
                />
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 sm:col-span-1">
                  <Input type="date" label="Tanggal Kunjungan" required value={form.visit_date} onChange={e => set('visit_date', e.target.value)} />
                </div>
                <Input type="time" label="Waktu Mulai" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
                <Input type="time" label="Waktu Selesai" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>

              <Textarea label="Peserta Kunjungan" value={form.participants}
                onChange={e => set('participants', e.target.value)}
                placeholder="Nama peserta, pisahkan dengan koma. Contoh: Ahmad Fauzi, Budi Santoso, Chief Engineer" rows={2} />

              <Textarea label="Agenda / Tujuan Kunjungan" value={form.agenda}
                onChange={e => set('agenda', e.target.value)}
                placeholder="Tuliskan agenda dan tujuan kunjungan..." rows={3} />

              <Textarea label="Ringkasan Hasil Kunjungan" value={form.summary}
                onChange={e => set('summary', e.target.value)}
                hint="Dapat diisi setelah kunjungan selesai"
                placeholder="Catatan naratif hasil kunjungan..." rows={4} />

              <FileUpload
                label="Lampiran Kunjungan"
                accept="image/*,.pdf"
                maxFiles={10}
                maxSizeMB={10}
              />

              {selectedType === 'OWNER_VISIT' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Owner Visit: Seluruh temuan yang dihasilkan dari kunjungan ini akan otomatis mendapat status <strong>MAJOR Priority</strong> dan notifikasi akan dikirim ke seluruh Manajemen dan Operation Head/Site Manager terkait.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="outline" type="button" onClick={e => handleSubmit(e, true)} loading={submitting}>
              Simpan sebagai Draft
            </Button>
            <Button type="button" onClick={e => handleSubmit(e, false)} loading={submitting}>
              Mulai Kunjungan
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
