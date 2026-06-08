import { X } from 'lucide-react'

interface FilterChip {
  key: string
  label: string
  value: string
}

interface FilterChipsProps {
  filters: FilterChip[]
  onRemove: (key: string) => void
  onClearAll?: () => void
}

export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null

  return (
    <div className="flex items-center flex-wrap gap-2">
      <span className="text-xs text-gray-500 font-medium">Filter aktif:</span>
      {filters.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1B3A6B]/10 text-[#1B3A6B] border border-[#1B3A6B]/20"
        >
          <span className="text-[10px] text-[#1B3A6B]/60">{chip.label}:</span>
          {chip.value}
          <button
            onClick={() => onRemove(chip.key)}
            className="ml-0.5 rounded-full hover:bg-[#1B3A6B]/20 p-0.5 transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-red-500 hover:text-red-700 font-medium underline"
        >
          Hapus Semua
        </button>
      )}
    </div>
  )
}
