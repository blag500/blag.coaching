import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './Chat.module.css'

export default function Chat({ clientId, clientName, onClose }) {
  const { user, profile, fetchMessages, sendMessage, markMessagesAsRead } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendError, setSendError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [resolvedCoachId, setResolvedCoachId] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef   = useRef(null)
  const isCoach = profile?.role === 'coach'

  const otherUserId = isCoach ? clientId : resolvedCoachId

  async function markRead(userId) {
    if (!userId) return
    await markMessagesAsRead(userId)
    window.dispatchEvent(new CustomEvent('blag:messages-read', { detail: { userId } }))
  }

  useEffect(() => {
    if (isCoach && !clientId) { setLoading(false); return }

    fetchMessages(isCoach ? clientId : null).then(async ({ data }) => {
      const msgs = data || []
      setMessages(msgs)
      setLoading(false)

      if (!isCoach) {
        const coachMsg = msgs.find(m => m.from_user_id !== user?.id)
        const coachId  = coachMsg?.from_user_id
          || profile?.coach_id
          || (await supabase.rpc('get_coach_id').then(r => r.data))
        setResolvedCoachId(coachId || null)
        if (coachId) markRead(coachId)
      } else {
        markRead(clientId)
      }
    })
  }, [user?.id, isCoach ? clientId : 'client'])

  useEffect(() => {
    const id = setInterval(async () => {
      const { data } = await fetchMessages(isCoach ? otherUserId : null)
      if (data) setMessages(data)
    }, 15_000)
    return () => clearInterval(id)
  }, [otherUserId])

  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      const { data } = await fetchMessages(isCoach ? otherUserId : null)
      if (data) setMessages(data)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [otherUserId])

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`chat_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_user_id=eq.${user.id}` },
        payload => {
          const msg = payload.new
          if (isCoach && msg.from_user_id !== clientId) return
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          if (!isCoach && !resolvedCoachId) setResolvedCoachId(msg.from_user_id)
          markRead(msg.from_user_id)
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id, isCoach, clientId, resolvedCoachId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return
    const toId = otherUserId
    if (!toId) { setSendError('Треньорът не е намерен — опресни приложението'); return }
    const text = input.trim()
    setInput('')
    setSendError(null)
    const { data, error } = await sendMessage(toId, text)
    if (error || !data) {
      setInput(text)
      setSendError('Грешка при изпращане — опитай отново')
    } else {
      setMessages(prev => [...prev, data])
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const toId = otherUserId
    if (!toId) { setSendError('Треньорът не е намерен — опресни приложението'); return }

    setUploading(true)
    setSendError(null)
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('chat-photos').upload(path, file)
    if (upErr) { setSendError('Грешка при качване на снимката'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('chat-photos').getPublicUrl(path)
    const { data, error } = await sendMessage(toId, null, publicUrl)
    if (error || !data) {
      setSendError('Грешка при изпращане')
    } else {
      setMessages(prev => [...prev, data])
    }
    setUploading(false)
    e.target.value = ''
  }

  const displayName = isCoach ? clientName : 'Треньор'

  return (
    <div className={styles.chat}>
      {lightboxUrl && (
        <div className={styles.lightbox} onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} className={styles.lightboxImg} alt="" />
        </div>
      )}

      <div className={styles.header}>
        <span className={styles.title}>{displayName}</span>
        <button className={styles.closeBtn} onClick={onClose} type="button">×</button>
      </div>

      <div className={styles.messages}>
        {loading ? (
          <p className={styles.loading}>Зарежда...</p>
        ) : messages.length === 0 ? (
          <p className={styles.empty}>Няма съобщения</p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`${styles.message} ${msg.from_user_id === user?.id ? styles.sent : styles.received}`}
            >
              {msg.photo_url ? (
                <img
                  src={msg.photo_url}
                  className={styles.photoBubble}
                  alt="снимка"
                  onClick={() => setLightboxUrl(msg.photo_url)}
                />
              ) : (
                <span className={styles.text}>{msg.content}</span>
              )}
              <span className={styles.time}>
                {new Date(msg.created_at).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {sendError && <p className={styles.sendError}>{sendError}</p>}
      <div className={styles.input}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handlePhoto}
        />
        <button
          className={styles.cameraBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !otherUserId}
          type="button"
          aria-label="Изпрати снимка"
        >
          {uploading ? '…' : '📷'}
        </button>
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
          disabled={!input.trim()}
          type="button"
        >
          ›
        </button>
      </div>
    </div>
  )
}
