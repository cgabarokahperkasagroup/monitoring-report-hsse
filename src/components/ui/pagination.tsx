import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Build visible page numbers: at most 5, centered around current page
  const buildPages = () => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="flex items-center justify-between px-1 py-3 border-t border-gray-100 mt-2">
      <p className="text-xs text-gray-500">
        Menampilkan <span className="font-medium text-gray-700">{from}–{to}</span> dari{' '}
        <span className="font-medium text-gray-700">{total}</span> data
      </p>

      <div className="flex items-center gap-1">
        <PageBtn disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={14} />
        </PageBtn>

        {buildPages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
          ) : (
            <PageBtn
              key={p}
              active={p === page}
              onClick={() => onChange(p as number)}
            >
              {p}
            </PageBtn>
          )
        )}

        <PageBtn disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight size={14} />
        </PageBtn>
      </div>
    </div>
  )
}

function PageBtn({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition-all flex items-center justify-center',
        active
          ? 'bg-[#1B3A6B] text-white'
          : 'text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}
