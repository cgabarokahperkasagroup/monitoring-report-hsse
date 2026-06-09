// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'

export function useNotificationsData(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setNotifications((data ?? []) as Notification[])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }, [userId])

  const unreadCount = notifications.filter(n => !n.is_read).length

  return { notifications, loading, unreadCount, markAsRead, markAllRead, refetch: fetchAll }
}
