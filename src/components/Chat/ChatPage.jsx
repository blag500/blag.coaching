import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './ChatPage.module.css'

function dateSeparator(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'ДНЕС'
  if (d.toDateString() === yesterday.toDateString()) return 'ВЧЕРА'
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' })
}

function groupByDate(messages) {
  const groups = []
  let lastDate = null
  for (const msg of messages) {
    const day = msg.created_at.slice(0, 10)
    if (day !== lastDate) {
      groups.push({ type: 'separator', key: day, label: dateSeparator(msg.created_at) })
      lastDate = day
    }
    groups.push({ type: 'message', key: msg.id, msg })
  }
  return groups
}

export default function ChatPage({ clientId, clientName, embedded = false }) {
  const { user, profile, fetchMessages, sendMessage, markMessagesAsRead } = useAuth()
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [sendError, setSendError]     = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [resolvedCoachId, setResolvedCoachId] = useState(null)

  const messagesEndRef = useRef(null)
  const fileInputRef   = useRef(null)
  const inputRef       = useRef(null)
  const isCoach = profile?.role === 'coach'

  const otherUserId = isCoach ? clientId : resolvedCoachId
  const displayName = isCoach ? (clientName || 'Клиент') : 'Треньор'

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
      .channel(`chatpage_${user.id}_${clientId || 'client'}`)
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
    if (!otherUserId) { setSendError('Треньорът не е намерен — опресни приложението'); return }
    const text = input.trim()
    setInput('')
    setSendError(null)
    const { data, error } = await sendMessage(otherUserId, text)
    if (error || !data) {
      setInput(text)
      setSendError('Грешка при изпращане — опитай отново')
    } else {
      setMessages(prev => [...prev, data])
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file || !otherUserId) return
    setUploading(true)
    setSendError(null)
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('chat-photos').upload(path, file)
    if (upErr) {
      setSendError('Грешка при качване на снимката')
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('chat-photos').getPublicUrl(path)
    const { data, error } = await sendMessage(otherUserId, null, publicUrl)
    if (error || !data) {
      setSendError('Грешка при изпращане')
    } else {
      setMessages(prev => [...prev, data])
    }
    setUploading(false)
    e.target.value = ''
  }

  const items = groupByDate(messages)

  return (
    <div className={embedded ? styles.pageEmbedded : styles.page}>
      {lightboxUrl && (
        <div className={styles.lightbox} onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} className={styles.lightboxImg} alt="" />
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.avatar}>{displayName[0]?.toUpperCase()}</div>
        <span className={styles.headerName}>{displayName}</span>
      </div>

      <div className={styles.feed}>
        {loading ? (
          <p className={styles.empty}>Зарежда...</p>
        ) : messages.length === 0 ? (
          <p className={styles.empty}>Няма съобщения все още</p>
        ) : (
          items.map(item =>
            item.type === 'separator' ? (
              <div key={item.key} className={styles.dateSep}>
                <span className={styles.dateSepLabel}>{item.label}</span>
              </div>
            ) : (
              <div
                key={item.key}
                className={`${styles.row} ${item.msg.from_user_id === user?.id ? styles.rowSent : styles.rowReceived}`}
              >
                <div className={`${styles.bubble} ${item.msg.from_user_id === user?.id ? styles.bubbleSent : styles.bubbleReceived}`}>
                  {item.msg.photo_url ? (
                    <img
                      src={item.msg.photo_url}
                      className={styles.photoMsg}
                      alt="снимка"
                      onClick={() => setLightboxUrl(item.msg.photo_url)}
                    />
                  ) : (
                    <span className={styles.msgText}>{item.msg.content}</span>
                  )}
                </div>
                <span className={styles.time}>
                  {new Date(item.msg.created_at).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.composer}>
        {sendError && <p className={styles.sendError}>{sendError}</p>}
        <div className={styles.composerRow}>
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
            {uploading ? '…' : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </button>
          <input
            ref={inputRef}
            className={styles.field}
            type="text"
            placeholder="Напиши съобщение..."
            value={input}
            onChange={e => { setInput(e.target.value); if (sendError) setSendError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!input.trim()}
            type="button"
            aria-label="Изпрати"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
