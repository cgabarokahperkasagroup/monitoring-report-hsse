import { useRef, useState, useCallback } from 'react'
import { Upload, X, FileText, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadedFile {
  id: string
  file: File
  preview?: string
}

interface FileUploadProps {
  accept?: string
  maxFiles?: number
  maxSizeMB?: number
  onChange?: (files: File[]) => void
  className?: string
  label?: string
  required?: boolean
}

export function FileUpload({
  accept = 'image/*,.pdf',
  maxFiles = 10,
  maxSizeMB = 10,
  onChange,
  className,
  label,
  required,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return
    setError(null)

    const toAdd: UploadedFile[] = []
    for (const file of Array.from(newFiles)) {
      if (files.length + toAdd.length >= maxFiles) {
        setError(`Maksimum ${maxFiles} file diperbolehkan`)
        break
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File "${file.name}" melebihi batas ${maxSizeMB} MB`)
        continue
      }
      const id = `${Date.now()}-${Math.random()}`
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      toAdd.push({ id, file, preview })
    }

    const updated = [...files, ...toAdd]
    setFiles(updated)
    onChange?.(updated.map(f => f.file))
  }, [files, maxFiles, maxSizeMB, onChange])

  const remove = (id: string) => {
    const updated = files.filter(f => f.id !== id)
    setFiles(updated)
    onChange?.(updated.map(f => f.file))
    setError(null)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-[#1B3A6B] bg-[#1B3A6B]/5'
            : 'border-gray-300 bg-gray-50 hover:border-[#1B3A6B]/50 hover:bg-[#1B3A6B]/5'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <Upload size={24} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-600">
          Klik atau seret file ke sini
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {accept.includes('image') ? 'JPEG, PNG, WEBP' : 'JPEG, PNG, PDF'} — maks {maxSizeMB} MB per file
          {maxFiles > 1 && `, maks ${maxFiles} file`}
        </p>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* File List */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-gray-200">
              {f.preview ? (
                <img src={f.preview} alt={f.file.name} className="w-10 h-10 rounded object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
                  {f.file.type.startsWith('image/') ? (
                    <ImageIcon size={18} className="text-gray-400" />
                  ) : (
                    <FileText size={18} className="text-gray-400" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{f.file.name}</p>
                <p className="text-[10px] text-gray-400">
                  {(f.file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => remove(f.id)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
