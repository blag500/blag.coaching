import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './Chat.module.css'

export default function Chat({ clientId, clientName, onClose }) {
  const { user, profile, fetchMessages, sendMessage, markMessagesAsRead } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [sendError, setSendError] = useState(null)
  const messagesEndRef = useRef(null)
  const isCoach = profile?.role === 'coach'
  const otherUserId = isCoach ? clientId : profile?.coach_id

  async function markRead(userId) {
    await markMessagesAsRead(userId)
    window.dispatchEvent(new CustomEvent('blag:messages-read', { detail: { userId } }))
  }

  useEffect(() => {
    if (!otherUserId) {
      setLoading(false)
      return
    }
    fetchMessages(otherUserId).then(async ({ data, error }) => {
      if (error) setFetchError(JSON.stringify(error))
      setMessages(data || [])
      setLoading(false)
      if (!error) await markRead(otherUserId)
    })
  }, [otherUserId, clientId])

  // Polling fallback: silently re-fetch every 15 s in case Realtime drops
  useEffect(() => {
    if (!otherUserId) return
    const id = setInterval(async () => {
      if (!otherUserId) return
      const { data } = await fetchMessages(otherUserId)
      if (data) setMessages(data)
    }, 15_000)
    return () => clearInterval(id)
  }, [otherUserId])

  // Refresh when the user brings the app back to the foreground
  useEffect(() => {
    if (!otherUserId) return
    const onVisible = async () => {
      if (document.visibilityState !== 'visible' || !otherUserId) return
      const { data } = await fetchMessages(otherUserId)
      if (data) setMessages(data)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [otherUserId])

  // Real-time: append incoming messages without a full refetch
  useEffect(() => {
    if (!user?.id || !otherUserId) return
    const channel = supabase
      .channel(`chat_${user.id}_${otherUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_user_id=eq.${user.id}` },
        payload => {
          const msg = payload.new
          if (msg.from_user_id === otherUserId) {
            setMessages(prev => [...prev, msg])
            markRead(otherUserId)
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id, otherUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || !otherUserId) return
    const text = input.trim()
    setInput('')
    setSendError(null)
    const { data, error } = await sendMessage(otherUserId, text)
    if (error || !data) {
      setInput(text)        // restore so user doesn't lose their message
      setSendError('Грешка при изпращане — опитай отново')
    } else {
      setMessages(prev => [...prev, data])
    }
  }

  const displayName = isCoach ? clientName : 'Треньор'

  return (
    <div className={styles.chat}>
      <div className={styles.header}>
        <span className={styles.title}>{displayName}</span>
        <button className={styles.closeBtn} onClick={onClose} type="button">×</button>
      </div>

      <div className={styles.messages}>
        {loading ? (
          <p className={styles.loading}>Зарежда...</p>
        ) : !otherUserId ? (
          <p className={styles.empty}>Не е намерен треньор (coach_id: {String(profile?.coach_id)})</p>
        ) : fetchError ? (
          <p className={styles.empty}>Грешка: {fetchError}</p>
        ) : messages.length === 0 ? (
          <p className={styles.empty}>Няма съобщения</p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`${styles.message} ${msg.from_user_id === user?.id ? styles.sent : styles.received}`}
            >
              <span className={styles.text}>{msg.content}</span>
              <span className={styles.time}>
                {new Date(msg.created_at).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {sendError && (
        <p className={styles.sendError}>{sendError}</p>
      )}
      <div className={styles.input}>
        <input
          className={styles.field}
          type="text"
          placeholder="Напиши съобщение..."
          value={input}
          onChange={e => { setInput(e.target.value); if (sendError) setSendError(null) }}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          className={styles.send}
          onClick={handleSend}
          disabled={!input.trim() || !otherUserId}
          type="button"
        >
          ›
        </button>
      </div>
    </div>
  )
}
