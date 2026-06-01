import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUnread } from '../../hooks/useUnread'
import Chat from '../Chat/Chat'
import styles from './SOSButton.module.css'

const STORAGE_KEY = 'blag_chat_hidden'

export default function ChatButton() {
  const { user, profile } = useAuth()
  const [showChat, setShowChat] = useState(false)
  const [hidden, setHidden] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')
  const isCoach = profile?.role === 'coach'
  const { totalUnread } = useUnread()

  if (!user || isCoach) return null

  function dismiss(e) {
    e.stopPropagation()
    setHidden(true)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  function restore() {
    setHidden(false)
    localStorage.setItem(STORAGE_KEY, 'false')
  }

  // Minimized: tiny tab on the right edge
  if (hidden) {
    return (
      <button className={styles.tab} onClick={restore} type="button" aria-label="Покажи чат">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" width="15" height="15" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {totalUnread > 0 && <span className={styles.tabBadge}>{totalUnread > 9 ? '9+' : totalUnread}</span>}
      </button>
    )
  }

  return (
    <>
      <div className={styles.pill}>
        <button className={styles.dismissBtn} onClick={dismiss} type="button" aria-label="Скрий чата">
          ✕
        </button>
        <button className={styles.chatBtn} onClick={() => setShowChat(true)} type="button" aria-label="Чат с треньора">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className={styles.chatLabel}>ТРЕНЬОР</span>
          {totalUnread > 0 && (
            <span className={styles.badge}>{totalUnread > 9 ? '9+' : totalUnread}</span>
          )}
        </button>
      </div>

      {showChat && (
        <Chat
          clientId={user.id}
          clientName={profile?.name || 'Клиент'}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  )
}
