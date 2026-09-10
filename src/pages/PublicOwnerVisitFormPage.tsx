import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Crown, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VisitDetailsStep } from '@/components/public/VisitDetailsStep'
import { FindingsStep } from '@/components/public/FindingsStep'
import { ReviewStep } from '@/components/public/ReviewStep'
import { usePublicOwnerVisitForm } from '@/hooks/usePublicOwnerVisitForm'
import {
  fetchOwnerVisitOptions, submitPublicOwnerVisit, friendlyError,
  type OwnerVisitOptions,
} from '@/services/publicOwnerVisit'

const EMPTY_OPTIONS: OwnerVisitOptions = { business_units: [], sites: [], finding_categories: [] }
const STEP_LABELS = ['Data Kunjungan', 'Temuan', 'Tinjau & Kirim']

export default function PublicOwnerVisitFormPage() {
  const {
    form, setField, addFinding, updateFinding, removeFinding,
    errors, validateStep, clearDraft, buildPayload,
  } = usePublicOwnerVisitForm()

  const [options, setOptions] = useState<OwnerVisitOptions>(EMPTY_OPTIONS)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  // Honeypot: manusia tidak pernah melihat kolom ini, bot mengisinya.
  const [website, setWebsite] = useState('')
  // Agregat dari FindingsStep: masih ada foto yang belum selesai diunggah?
  const [photosUploading, setPhotosUploading] = useState(false)

  useEffect(() => {
    fetchOwnerVisitOptions()
      .then(setOptions)
      .catch(() => setOptionsError('Gagal memuat pilihan. Periksa koneksi lalu muat ulang halaman.'))
  }, [])

  function goNext() {
    if (step === 1 && !validateStep(1)) return
    if (step === 2 && !validateStep(2)) return
    setStep(s => (s === 1 ? 2 : 3))
    window.scrollTo({ top: 0 })
  }

  function goBack() {
    setStep(s => (s === 3 ? 2 : 1))
    window.scrollTo({ top: 0 })
  }

  function handleClearDraft() {
    if (window.confirm('Kosongkan semua isian? Data yang sudah diketik akan hilang dan tidak bisa dikembalikan.')) {
      clearDraft()
      setStep(1)
    }
  }

  async function handleSubmit() {
    if (!validateStep(1) || !validateStep(2)) {
      setSubmitError('Ada isian yang belum lengkap. Kembali ke langkah sebelumnya untuk memperbaikinya.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await submitPublicOwnerVisit(buildPayload(website))
      // Draft baru dibuang setelah server memastikan data tersimpan.
      setReference(result.reference_no)
      clearDraft()
    } catch (err) {
      setSubmitError(friendlyError(err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  if (reference) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <CheckCircle2 size={48} className="text-green-600 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-[#1B3A6B]">Laporan terkirim</h1>
          <p className="text-sm text-gray-600 mt-2">
            Laporan Anda sudah masuk ke sistem dan menunggu verifikasi.
          </p>
          <p className="mt-4 text-xs text-gray-500">Nomor referensi</p>
          <p className="font-mono text-sm font-semibold text-[#1B3A6B] break-all">{reference}</p>
          <Button
            className="mt-6 w-full justify-center"
            onClick={() => { setReference(null); setStep(1) }}
          >
            Isi kunjungan lain
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B3A6B] text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Crown size={24} className="text-amber-300 shrink-0" />
          <div>
            <h1 className="font-bold text-base leading-tight">Form Owner Visit</h1>
            <p className="text-xs text-white/70">Barokah Perkasa Group</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
        <ol className="flex items-center gap-2 text-xs">
          {STEP_LABELS.map((label, i) => (
            <li
              key={label}
              className={
                'flex-1 py-1.5 text-center rounded-lg ' +
                (step === i + 1
                  ? 'bg-[#1B3A6B] text-white font-medium'
                  : step > i + 1
                    ? 'bg-[#1B3A6B]/10 text-[#1B3A6B]'
                    : 'bg-gray-100 text-gray-400')
              }
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {optionsError && (
          <p className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {optionsError}
          </p>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          {step === 1 && (
            <VisitDetailsStep form={form} options={options} errors={errors} setField={setField} />
          )}
          {step === 2 && (
            <FindingsStep
              findings={form.findings} options={options} errors={errors}
              visitDate={form.visit_date}
              addFinding={addFinding} updateFinding={updateFinding} removeFinding={removeFinding}
              onUploadingChange={setPhotosUploading}
            />
          )}
          {step === 3 && <ReviewStep form={form} options={options} />}

          <input
            type="text" tabIndex={-1} autoComplete="off"
            className="absolute w-px h-px -m-px p-0 overflow-hidden whitespace-nowrap border-0"
            style={{ clip: 'rect(0,0,0,0)' }}
            value={website} onChange={e => setWebsite(e.target.value)}
          />
        </div>

        {submitError && (
          <p className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {submitError}
          </p>
        )}

        {photosUploading && (
          <p className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Masih ada foto yang diunggah. Tunggu sebentar sebelum melanjutkan.
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pb-8">
          {step > 1 ? (
            <Button variant="ghost" onClick={goBack} disabled={submitting}>
              <ArrowLeft size={16} /> Kembali
            </Button>
          ) : <span />}

          {step < 3 ? (
            <Button onClick={goNext} disabled={photosUploading}>
              Lanjut <ArrowRight size={16} />
            </Button>
          ) : (
            <Button onClick={() => void handleSubmit()} loading={submitting} disabled={photosUploading}>
              <Send size={16} /> {submitError ? 'Coba Lagi' : 'Kirim Laporan'}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Isian tersimpan otomatis di perangkat ini sampai berhasil dikirim.
        </p>
        <button
          type="button" onClick={handleClearDraft}
          className="text-center text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 pb-6"
        >
          Kosongkan isian
        </button>
      </div>
    </div>
  )
}
