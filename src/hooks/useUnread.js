import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

let instanceCounter = 0

export function useUnread() {
  const { user } = useAuth()
  const [unreadByUser, setUnreadByUser] = useState({})
  const instanceId = useRef(++instanceCounter).current
  const suppressUntil = useRef(0)

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
        // Skip re-fetch during suppression window (just after marking read)
        if (Date.now() < suppressUntil.current) return
        fetchUnread()
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

  useEffect(() => {
    if (!user) return
    const id = setInterval(fetchUnread, 30_000)
    return () => clearInterval(id)
  }, [user?.id, fetchUnread])

  useEffect(() => {
    if (!user) return
    const onVisible = () => { if (document.visibilityState === 'visible') fetchUnread() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.id, fetchUnread])

  useEffect(() => {
    const handler = (e) => {
      const { userId } = e.detail
      // Suppress Realtime-triggered fetches for 600 ms so the optimistic
      // clear isn't overwritten by the UPDATE event that fires immediately
      suppressUntil.current = Date.now() + 600
      setUnreadByUser(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
      setTimeout(fetchUnread, 600)
    }
    window.addEventListener('blag:messages-read', handler)
    return () => window.removeEventListener('blag:messages-read', handler)
  }, [fetchUnread])

  const totalUnread = Object.values(unreadByUser).reduce((a, b) => a + b, 0)
  return { unreadByUser, totalUnread }
}
