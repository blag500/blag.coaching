import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUnread } from '../../hooks/useUnread'
import ClientDetail from './ClientDetail'
import Chat from '../Chat/Chat'
import styles from './CoachPanel.module.css'

export default function CoachPanel() {
  const { fetchClients, fetchCoaches } = useAuth()
  const { unreadByUser } = useUnread()
  const [clients, setClients]           = useState([])
  const [coaches, setCoaches]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedClient, setSelectedClient] = useState(null)
  const [chatCoach, setChatCoach]       = useState(null)

  useEffect(() => {
    Promise.all([fetchClients(), fetchCoaches()])
      .then(([clientsRes, coachesRes]) => {
        if (clientsRes.data) setClients(clientsRes.data)
        if (coachesRes.data) setCoaches(coachesRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
      />
    )
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>КЛИЕНТИ</h1>
        </header>
        <p className={styles.empty}>Зарежда...</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>КЛИЕНТИ</h1>
        <p className={styles.subtitle}>{clients.length} регистрирани</p>
      </header>

      {clients.length === 0 ? (
        <p className={styles.empty}>Все още няма клиенти.</p>
      ) : (
        <div className={styles.list}>
          {clients.map(client => (
            <button
              key={client.id}
              className={styles.card}
              onClick={() => setSelectedClient(client)}
              type="button"
            >
              <div className={styles.clientInfo}>
                <span className={styles.clientName}>{client.name || '—'}</span>
                <span className={styles.clientEmail}>{client.email}</span>
              </div>
              <div className={styles.macroSnippet}>
                <span>{client.calories ?? '—'} ккал</span>
                <span>{client.protein ?? '—'}g П</span>
              </div>
              {unreadByUser[client.id] > 0 && (
                <span className={styles.badge}>{unreadByUser[client.id] > 9 ? '9+' : unreadByUser[client.id]}</span>
              )}
              <span className={styles.chevron}>›</span>
            </button>
          ))}
        </div>
      )}

      {coaches.length > 0 && (
        <>
          <p className={styles.sectionTitle}>КОЛЕГИ</p>
          <div className={styles.list}>
            {coaches.map(coach => (
              <button
                key={coach.id}
                className={styles.card}
                onClick={() => setChatCoach(coach)}
                type="button"
              >
                <div className={styles.clientInfo}>
                  <span className={styles.clientName}>{coach.name || '—'}</span>
                  <span className={styles.clientEmail}>{coach.email}</span>
                </div>
                {unreadByUser[coach.id] > 0 && (
                  <span className={styles.badge}>{unreadByUser[coach.id] > 9 ? '9+' : unreadByUser[coach.id]}</span>
                )}
                <span className={styles.chevron}>💬</span>
              </button>
            ))}
          </div>
        </>
      )}

      {chatCoach && (
        <Chat
          clientId={chatCoach.id}
          clientName={chatCoach.name || chatCoach.email}
          onClose={() => setChatCoach(null)}
        />
      )}
    </div>
  )
}
