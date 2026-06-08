import { forwardRef, useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#4A5568]">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-white',
            'border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20',
            'outline-none transition-all placeholder:text-gray-400',
            'disabled:bg-gray-50 disabled:text-gray-500',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#4A5568]">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-white resize-y min-h-[80px]',
            'border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20',
            'outline-none transition-all placeholder:text-gray-400',
            'disabled:bg-gray-50 disabled:text-gray-500',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
  searchable?: boolean
}

function SearchableSelectDropdown({
  id, label, error, hint, options, placeholder, value, onChange, required, disabled, className,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0)
    else setQuery('')
  }, [open])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleSelect(optValue: string) {
    onChange?.({ target: { value: optValue } } as React.ChangeEvent<HTMLSelectElement>)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[#4A5568]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full px-3 py-2 text-sm rounded-lg border bg-white text-left flex items-center justify-between gap-2',
          'border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20',
          'outline-none transition-all cursor-pointer',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
          open && 'border-[#1B3A6B] ring-2 ring-[#1B3A6B]/20',
          className
        )}
      >
        <span className={cn(!selected && 'text-gray-400')}>
          {selected ? selected.label : (placeholder ?? 'Pilih...')}
        </span>
        <ChevronDown size={15} className={cn('text-gray-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md border border-gray-200 focus-within:border-[#1B3A6B] focus-within:ring-1 focus-within:ring-[#1B3A6B]/20">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Cari..."
                  className="text-sm bg-transparent outline-none w-full placeholder:text-gray-400"
                  onKeyDown={e => e.key === 'Escape' && setOpen(false)}
                />
              </div>
            </div>
            <ul className="max-h-52 overflow-y-auto py-1">
              {placeholder && !query && (
                <li>
                  <button type="button" onClick={() => handleSelect('')}
                    className={cn('w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50', !value && 'bg-blue-50 text-[#1B3A6B]')}>
                    {placeholder}
                  </button>
                </li>
              )}
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-sm text-gray-400 text-center">Tidak ditemukan</li>
              )}
              {filtered.map(opt => (
                <li key={opt.value}>
                  <button type="button" onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2',
                      value === opt.value && 'bg-blue-50 text-[#1B3A6B] font-medium'
                    )}>
                    <span>{opt.label}</span>
                    {value === opt.value && <Check size={13} className="text-[#1B3A6B] shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, options, placeholder, searchable, ...props }, ref) => {
    if (searchable) {
      return (
        <SearchableSelectDropdown
          id={id} label={label} error={error} hint={hint}
          options={options} placeholder={placeholder} className={className} {...props}
        />
      )
    }
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#4A5568]">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-white appearance-none',
            'border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20',
            'outline-none transition-all cursor-pointer',
            'disabled:bg-gray-50 disabled:text-gray-500',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
