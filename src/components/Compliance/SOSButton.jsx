import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUnread } from '../../hooks/useUnread'
import Chat from '../Chat/Chat'
import styles from './SOSButton.module.css'

const STORAGE_KEY = 'blag_chat_minimized'

export default function ChatButton() {
  const { user, profile } = useAuth()
  const [showChat, setShowChat] = useState(false)
  const [minimized, setMinimized] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')
  const isCoach = profile?.role === 'coach'
  const { totalUnread } = useUnread()

  const pressTimer = useRef(null)
  const didLongPress = useRef(false)

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true
      const next = !minimized
      setMinimized(next)
      localStorage.setItem(STORAGE_KEY, String(next))
    }, 500)
  }, [minimized])

  const cancelPress = useCallback(() => {
    clearTimeout(pressTimer.current)
  }, [])

  const handleClick = useCallback(() => {
    if (didLongPress.current) return
    if (minimized) {
      setMinimized(false)
      localStorage.setItem(STORAGE_KEY, 'false')
      return
    }
    setShowChat(true)
  }, [minimized])

  if (!user || isCoach) return null

  return (
    <>
      <button
        className={`${styles.btn} ${minimized ? styles.btnMinimized : ''}`}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onClick={handleClick}
        aria-label={minimized ? 'Покажи чат' : 'Чат с треньора'}
        type="button"
      >
        {minimized ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {totalUnread > 0 && (
              <span className={styles.badgeMin}>{totalUnread > 9 ? '9+' : totalUnread}</span>
            )}
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {totalUnread > 0 && (
              <span className={styles.badge}>{totalUnread > 9 ? '9+' : totalUnread}</span>
            )}
          </>
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
