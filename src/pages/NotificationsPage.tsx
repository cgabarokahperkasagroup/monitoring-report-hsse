import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle, AlertTriangle, Star, Ship, ClipboardList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsData } from '@/hooks/useNotificationsData'
import { formatDateTime } from '@/utils'

const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  finding_assigned: { icon: AlertTriangle, color: 'text-orange-500' },
  finding_overdue: { icon: AlertTriangle, color: 'text-red-600' },
  closing_submitted: { icon: CheckCircle, color: 'text-blue-600' },
  closing_approved: { icon: CheckCircle, color: 'text-green-600' },
  closing_rejected: { icon: AlertTriangle, color: 'text-red-600' },
  owner_finding: { icon: Star, color: 'text-amber-500' },
  visit_submitted: { icon: ClipboardList, color: 'text-blue-600' },
  vessel_compliance_warning: { icon: Ship, color: 'text-orange-500' },
}

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL')

  const { notifications: allNotifications, unreadCount, markAsRead, markAllRead } = useNotificationsData(user?.id)

  const notifications = allNotifications.filter(n => {
    if (filter === 'UNREAD') return !n.is_read
    return true
  })

  const handleClick = async (n: typeof notifications[0]) => {
    await markAsRead(n.id)
    if (n.related_type === 'finding') navigate(`/findings/${n.related_id}`)
    else if (n.related_type === 'visit') navigate(`/visits/${n.related_id}`)
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            {(['ALL', 'UNREAD'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f ? 'bg-[#1B3A6B] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {f === 'ALL' ? 'Semua' : `Belum Dibaca (${unreadCount})`}
              </button>
            ))}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCircle size={14} /> Tandai Semua Dibaca
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <Bell size={40} className="mb-3 opacity-40" />
              <p className="text-sm">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map(n => {
                const isUnread = !n.is_read
                const typeInfo = typeIcons[n.type] || { icon: Bell, color: 'text-gray-500' }
                const Icon = typeInfo.icon

                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${isUnread ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className={`mt-0.5 p-2 rounded-xl ${isUnread ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                      <Icon size={18} className={typeInfo.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {n.title}
                        </p>
                        {isUnread && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1.5">{formatDateTime(n.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
