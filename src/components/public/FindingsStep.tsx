import { useEffect, useState } from 'react'
import { Plus, Trash2, ImagePlus, X } from 'lucide-react'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { FindingDraft } from '@/hooks/usePublicOwnerVisitForm'
import type { FindingPriority, OwnerVisitOptions } from '@/services/publicOwnerVisit'
import { DUE_DAYS, uploadFindingPhoto } from '@/services/publicOwnerVisit'

interface Props {
  findings: FindingDraft[]
  options: OwnerVisitOptions
  errors: Record<string, string>
  visitDate: string
  addFinding: () => void
  updateFinding: (key: string, patch: Partial<FindingDraft>) => void
  removeFinding: (key: string) => void
  // Agar halaman bisa mengunci Lanjut/Kirim selagi ada foto yang masih diunggah.
  onUploadingChange?: (uploading: boolean) => void
}

const PRIORITIES: { value: FindingPriority; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

function dueDateText(visitDate: string, priority: FindingPriority): string {
  const days = DUE_DAYS[priority]
  if (!visitDate) return `Target penyelesaian otomatis: ${days} hari.`
  const d = new Date(visitDate)
  d.setDate(d.getDate() + days)
  const formatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  return `Target penyelesaian otomatis: ${days} hari — ${formatted}. PIC & tenggat final ditetapkan admin saat verifikasi.`
}

export function FindingsStep({
  findings, options, errors, visitDate, addFinding, updateFinding, removeFinding,
  onUploadingChange,
}: Props) {
  // Status unggah per temuan: satu foto gagal tidak boleh menggugurkan laporan.
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [uploadError, setUploadError] = useState<Record<string, string>>({})

  // Hanya status gabungan ("ada yang masih diunggah?") yang perlu diketahui halaman.
  // Dibersihkan saat unmount (mis. kembali ke langkah 1) agar halaman tidak terkunci selamanya.
  useEffect(() => {
    onUploadingChange?.(Object.values(uploading).some(Boolean))
    return () => onUploadingChange?.(false)
  }, [uploading, onUploadingChange])

  async function handlePhotos(key: string, files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(u => ({ ...u, [key]: true }))
    setUploadError(e => ({ ...e, [key]: '' }))

    const current = findings.find(f => f.key === key)?.photoUrls ?? []
    const uploaded: string[] = []
    let failed = 0
    let skipped = 0

    for (const file of Array.from(files)) {
      if (current.length + uploaded.length >= 10) {
        skipped += 1
        continue
      }
      try {
        uploaded.push(await uploadFindingPhoto(file))
      } catch {
        failed += 1
      }
    }

    updateFinding(key, { photoUrls: [...current, ...uploaded] })
    setUploading(u => ({ ...u, [key]: false }))
    const messages: string[] = []
    if (skipped > 0) {
      messages.push(`${skipped} foto tidak ditambahkan karena temuan sudah mencapai batas 10 foto.`)
    }
    if (failed > 0) {
      messages.push(`${failed} foto gagal diunggah. Coba pilih ulang, atau lanjut tanpa foto itu.`)
    }
    if (messages.length > 0) {
      setUploadError(e => ({
        ...e,
        [key]: messages.join(' '),
      }))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {findings.length === 0 && (
        <p className="text-sm text-gray-500 px-4 py-6 text-center border border-dashed border-gray-300 rounded-xl">
          Belum ada temuan. Kunjungan tanpa temuan tetap bisa dikirim.
        </p>
      )}

      {errors.findings && <p className="text-xs text-red-600">{errors.findings}</p>}

      {findings.map((f, i) => (
        <div key={f.key} className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1B3A6B]">Temuan {i + 1}</span>
            <button
              type="button" onClick={() => removeFinding(f.key)}
              className="text-gray-400 hover:text-red-600 p-1" aria-label={`Hapus temuan ${i + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <Input
            id={`finding_${i}_title`} label="Judul" required
            value={f.title} error={errors[`finding_${i}_title`]}
            onChange={e => updateFinding(f.key, { title: e.target.value })}
          />
          <Textarea
            id={`finding_${i}_description`} label="Deskripsi" required
            value={f.description} error={errors[`finding_${i}_description`]}
            onChange={e => updateFinding(f.key, { description: e.target.value })}
          />
          <Select
            id={`finding_${i}_category`} label="Kategori" required
            value={f.category} error={errors[`finding_${i}_category`]}
            onChange={e => updateFinding(f.key, { category: e.target.value })}
            options={options.finding_categories.map(c => ({ value: c.name, label: c.name }))}
            placeholder="Pilih kategori"
          />
          <Select
            id={`finding_${i}_priority`} label="Prioritas" required
            value={f.priority}
            onChange={e => updateFinding(f.key, { priority: e.target.value as FindingPriority })}
            options={PRIORITIES.map(p => ({ value: p.value, label: p.label }))}
          />
          <p className="text-xs text-gray-500 -mt-1">{dueDateText(visitDate, f.priority)}</p>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#4A5568]">Foto</span>
            {f.photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {f.photoUrls.map(url => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button" aria-label="Hapus foto"
                      onClick={() => updateFinding(f.key, { photoUrls: f.photoUrls.filter(u => u !== url) })}
                      className="absolute -top-1.5 -right-1.5 bg-white border border-gray-300 rounded-full p-0.5 shadow-sm"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="inline-flex w-fit items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[#1B3A6B] text-[#1B3A6B] cursor-pointer hover:bg-[#1B3A6B]/5">
              <ImagePlus size={16} />
              {uploading[f.key] ? 'Mengunggah…' : 'Tambah foto'}
              <input
                type="file" accept="image/*" multiple capture="environment" className="hidden"
                disabled={uploading[f.key]}
                onChange={e => { void handlePhotos(f.key, e.target.files); e.target.value = '' }}
              />
            </label>
            {uploadError[f.key] && <p className="text-xs text-red-600">{uploadError[f.key]}</p>}
            {errors[`finding_${i}_photos`] && (
              <p className="text-xs text-red-600">{errors[`finding_${i}_photos`]}</p>
            )}
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addFinding} className="w-fit">
        <Plus size={16} /> Tambah temuan
      </Button>
    </div>
  )
}
