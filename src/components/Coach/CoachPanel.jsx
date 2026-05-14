import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUnread } from '../../hooks/useUnread'
import ClientDetail from './ClientDetail'
import styles from './CoachPanel.module.css'

export default function CoachPanel() {
  const { fetchClients } = useAuth()
  const { unreadByUser } = useUnread()
  const [clients, setClients]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedClient, setSelectedClient] = useState(null)

  useEffect(() => {
    fetchClients()
      .then(({ data }) => {
        if (data) setClients(data)
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
    </div>
  )
}
