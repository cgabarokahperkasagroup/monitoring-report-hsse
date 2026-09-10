import type { FormState } from '@/hooks/usePublicOwnerVisitForm'
import type { OwnerVisitOptions } from '@/services/publicOwnerVisit'

interface Props {
  form: FormState
  options: OwnerVisitOptions
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right">{value || '—'}</span>
    </div>
  )
}

export function ReviewStep({ form, options }: Props) {
  const bu = options.business_units.find(b => b.id === form.business_unit_id)
  const site = options.sites.find(s => s.id === form.site_id)
  const objek = form.target === 'VESSEL' ? form.vessel_name : site?.name ?? ''

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-[#1B3A6B] mb-1">Data Kunjungan</h3>
        <Row label="Pengisi" value={[form.reporter_name, form.reporter_position && `(${form.reporter_position})`].filter(Boolean).join(' ')} />
        <Row label="Unit Bisnis" value={bu?.name ?? ''} />
        <Row label={form.target === 'VESSEL' ? 'Kapal' : 'Lokasi'} value={objek} />
        <Row label="Tanggal" value={form.visit_date} />
        <Row label="Jam" value={[form.start_time, form.end_time].filter(Boolean).join(' – ')} />
        <Row label="Peserta lain" value={form.other_participants} />
        <Row label="Agenda" value={form.agenda} />
        <Row label="Ringkasan" value={form.summary} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#1B3A6B] mb-1">
          Temuan ({form.findings.length})
        </h3>
        {form.findings.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">Tidak ada temuan.</p>
        ) : (
          form.findings.map((f, i) => (
            <div key={f.key} className="py-3 border-b border-gray-100 last:border-0">
              <p className="text-sm font-medium text-gray-800">{i + 1}. {f.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{f.category} · {f.priority} · {f.photoUrls.length} foto</p>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{f.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
