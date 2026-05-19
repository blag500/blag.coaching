import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUnread } from '../../hooks/useUnread'
import ClientDetail from './ClientDetail'
import Chat from '../Chat/Chat'
import styles from './CoachPanel.module.css'

const STATUS_LABELS = { pending: 'ЧАКА', confirmed: 'ПОТВЪРДЕНО' }

const MONTHS_SHORT = ['ЯНУ','ФЕВ','МАР','АПР','МАЙ','ЮНИ','ЮЛИ','АВГ','СЕП','ОКТ','НОЕ','ДЕК']

function fmtDay(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS_SHORT[d.getMonth()]}`
}
function fmtTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function CoachPanel() {
  const { fetchClients, fetchCoaches, approveClient, fetchTrainingSessions } = useAuth()
  const { unreadByUser } = useUnread()
  const [clients, setClients]           = useState([])
  const [coaches, setCoaches]           = useState([])
  const [sessions, setSessions]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [approvingId, setApprovingId]   = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [chatCoach, setChatCoach]       = useState(null)

  useEffect(() => {
    Promise.all([fetchClients(), fetchCoaches(), fetchTrainingSessions()])
      .then(([clientsRes, coachesRes, sessionsRes]) => {
        if (clientsRes.data)  setClients(clientsRes.data)
        if (coachesRes.data)  setCoaches(coachesRes.data)
        if (sessionsRes.data) setSessions(sessionsRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const upcoming = useMemo(() => {
    const now     = new Date()
    const cutoff  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return sessions
      .filter(s => {
        if (s.status === 'cancelled' || s.status === 'declined' || s.status === 'completed') return false
        const d = new Date(s.scheduled_at)
        return d >= now && d <= cutoff
      })
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  }, [sessions])

  async function handleApprove(clientId) {
    setApprovingId(clientId)
    const { error } = await approveClient(clientId)
    if (!error) {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, approved: true } : c))
    }
    setApprovingId(null)
  }

  function handleClientDeleted(clientId) {
    setClients(prev => prev.filter(c => c.id !== clientId))
    setSelectedClient(null)
  }

  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
        onDelete={handleClientDeleted}
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
        <p className={styles.subtitle}>
          {clients.filter(c => c.approved !== false).length} одобрени
          {clients.filter(c => c.approved === false).length > 0 && ` · ${clients.filter(c => c.approved === false).length} чакащи`}
        </p>
      </header>

      {upcoming.length > 0 && (
        <>
          <p className={styles.sectionTitle}>
            ПРЕДСТОЯЩИ 7 ДНИ
            <span className={styles.badge}>{upcoming.length}</span>
          </p>
          <div className={styles.upcomingList}>
            {upcoming.map(s => {
              const clientName = s.client?.name || s.client?.email || '—'
              return (
                <div key={s.id} className={`${styles.upcomingCard} ${styles['ucard_' + s.status]}`}>
                  <div className={styles.upcomingDate}>
                    <span className={styles.upcomingDay}>{fmtDay(s.scheduled_at)}</span>
                    <span className={styles.upcomingTime}>{fmtTime(s.scheduled_at)}</span>
                  </div>
                  <div className={styles.upcomingInfo}>
                    <span className={styles.upcomingClient}>{clientName}</span>
                    <span className={styles.upcomingTitle}>{s.title}</span>
                  </div>
                  <span className={`${styles.upcomingBadge} ${styles['ubadge_' + s.status]}`}>
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {(() => {
        const pending  = clients.filter(c => c.approved === false)
        const approved = clients.filter(c => c.approved !== false)
        return (
          <>
            {pending.length > 0 && (
              <>
                <p className={styles.sectionTitle}>
                  ЧАКАЩИ ОДОБРЕНИЕ
                  <span className={styles.badge}>{pending.length}</span>
                </p>
                <div className={styles.list}>
                  {pending.map(client => (
                    <div key={client.id} className={styles.card}>
                      <div className={styles.clientInfo}>
                        <span className={styles.clientName}>{client.name || '—'}</span>
                        <span className={styles.clientEmail}>{client.email}</span>
                      </div>
                      <button
                        className={styles.approveBtn}
                        onClick={() => handleApprove(client.id)}
                        disabled={approvingId === client.id}
                        type="button"
                      >
                        {approvingId === client.id ? '...' : 'ОДОБРИ'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {approved.length === 0 ? (
              <p className={styles.empty}>Все още няма одобрени клиенти.</p>
            ) : (
              <>
                {pending.length > 0 && <p className={styles.sectionTitle}>КЛИЕНТИ</p>}
                <div className={styles.list}>
                  {approved.map(client => (
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
              </>
            )}
          </>
        )
      })()}

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
