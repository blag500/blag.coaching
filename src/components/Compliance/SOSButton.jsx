import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Chat from '../Chat/Chat'
import styles from './SOSButton.module.css'

export default function ChatButton() {
  const { user, profile } = useAuth()
  const [showChat, setShowChat] = useState(false)
  const isCoach = profile?.role === 'coach'

  if (!user || isCoach) return null

  return (
    <>
      <button
        className={styles.btn}
        onClick={() => setShowChat(true)}
        aria-label="Чат с треньора"
        title="Съобщение към треньора"
      >
        <span className={styles.icon}>💬</span>
        <span className={styles.label}>ЧАТ</span>
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
