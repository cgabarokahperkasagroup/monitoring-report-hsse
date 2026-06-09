import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsData } from '@/hooks/useNotificationsData'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { unreadCount } = useNotificationsData(user?.id)

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-[#1B3A6B]">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <div className="w-8 h-8 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-sm font-semibold">
          {user?.full_name?.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  )
}
