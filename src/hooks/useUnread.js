import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

let instanceCounter = 0

export function useUnread() {
  const { user } = useAuth()
  const [unreadByUser, setUnreadByUser] = useState({})
  const instanceId = useRef(++instanceCounter).current

  const fetchUnread = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('messages')
      .select('from_user_id')
      .eq('to_user_id', user.id)
      .is('read_at', null)
    if (!data) return
    const counts = {}
    data.forEach(m => {
      counts[m.from_user_id] = (counts[m.from_user_id] || 0) + 1
    })
    setUnreadByUser(counts)
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    fetchUnread()
    const channel = supabase
      .channel(`unread_${user.id}_${instanceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `to_user_id=eq.${user.id}`,
      }, payload => {
        fetchUnread()
        // Notify when a new message arrives and the app is not in focus
        if (
          payload.eventType === 'INSERT' &&
          document.visibilityState !== 'visible' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification('Blag Coaching', {
            body: 'Получихте ново съобщение',
            icon: '/icon-192.png',
            tag: 'blag-message',
            renotify: false,
          })
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id, fetchUnread])

  // Immediately clear badge when chat is opened and messages are marked read
  useEffect(() => {
    const handler = (e) => {
      const { userId } = e.detail
      setUnreadByUser(prev => {
        if (!prev[userId]) return prev
        const next = { ...prev }
        delete next[userId]
        return next
      })
    }
    window.addEventListener('blag:messages-read', handler)
    return () => window.removeEventListener('blag:messages-read', handler)
  }, [])

  const totalUnread = Object.values(unreadByUser).reduce((a, b) => a + b, 0)
  return { unreadByUser, totalUnread }
}
