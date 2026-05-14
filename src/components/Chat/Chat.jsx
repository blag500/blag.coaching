import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Chat.module.css'

export default function Chat({ clientId, clientName, onClose }) {
  const { user, profile, fetchMessages, sendMessage, markMessagesAsRead } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const isCoach = profile?.role === 'coach'
  const otherUserId = isCoach ? clientId : profile?.coach_id

  useEffect(() => {
    if (!otherUserId) {
      setLoading(false)
      return
    }
    fetchMessages(otherUserId).then(({ data }) => {
      setMessages(data || [])
      setLoading(false)
      markMessagesAsRead(otherUserId)
    })
  }, [otherUserId, clientId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || !otherUserId) return
    setInput('')
    const { data, error } = await sendMessage(otherUserId, input.trim())
    if (!error && data) {
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

      <div className={styles.input}>
        <input
          className={styles.field}
          type="text"
          placeholder="Напиши съобщение..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
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
