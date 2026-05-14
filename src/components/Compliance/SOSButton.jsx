import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUnread } from '../../hooks/useUnread'
import Chat from '../Chat/Chat'
import styles from './SOSButton.module.css'

export default function ChatButton() {
  const { user, profile } = useAuth()
  const [showChat, setShowChat] = useState(false)
  const isCoach = profile?.role === 'coach'
  const { totalUnread } = useUnread()

  if (!user || isCoach) return null

  return (
    <>
      <button
        className={styles.btn}
        onClick={() => setShowChat(true)}
        aria-label="Чат с треньора"
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {totalUnread > 0 && (
          <span className={styles.badge}>{totalUnread > 9 ? '9+' : totalUnread}</span>
        )}
      </button>

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
