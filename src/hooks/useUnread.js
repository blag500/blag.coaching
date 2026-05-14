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
      }, fetchUnread)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id, fetchUnread])

  const totalUnread = Object.values(unreadByUser).reduce((a, b) => a + b, 0)
  return { unreadByUser, totalUnread }
}
