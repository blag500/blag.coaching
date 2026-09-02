import { useEffect, useState, useMemo, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useUnread } from '../../hooks/useUnread'
import ClientDetail from './ClientDetail'
import Chat from '../Chat/Chat'
import { supabase } from '../../lib/supabase'
import styles from './CoachPanel.module.css'

const STATUS_LABEL_KEYS = {
  pending:   'cp.status.pending',
  confirmed: 'cp.status.confirmed',
  completed: 'cp.status.completed',
}

/* The client's face in the list, so the coach recognises a person before
   reading a name. Falls back to the first letter when no photo is set — an
   empty grey circle would say less than the initial does. */
function ClientAvatar({ client }) {
  const initial = (client?.name || client?.email || '?').trim()[0]?.toUpperCase() || '?'
  return client?.avatar_url ? (
    <img className={styles.avatar} src={client.avatar_url} alt="" />
  ) : (
    <span className={`${styles.avatar} ${styles.avatarInitial}`}>{initial}</span>
  )
}


function fmtDay(t, iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')} ${t(`monthsShort.${d.getMonth()}`).toUpperCase()}`
}
function fmtTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function localNow() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const TODAY = new Date().toISOString().slice(0, 10)
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

function lastActiveLabel(t, date) {
  if (!date) return t('cp.inactive')
  if (date === TODAY)     return t('ago.today')
  if (date === YESTERDAY) return t('ago.yesterday')
  const days = Math.round((new Date(TODAY) - new Date(date)) / 86400000)
  return t('cp.daysAgo', { n: days })
}

function sortPriority(c, stats) {
  const s = stats[c.id]
  if (!s?.lastActive) return 2
  if (s.lastActive === TODAY) return 0
  return 1
}

function clientSortCompare(a, b, stats) {
  const ka = sortPriority(a, stats)
  const kb = sortPriority(b, stats)
  if (ka !== kb) return ka - kb
  const la = stats[a.id]?.lastActive || ''
  const lb = stats[b.id]?.lastActive || ''
  if (la !== lb) return lb.localeCompare(la)
  return (a.name || '').localeCompare(b.name || '')
}

function SessionCard({ s, onCancel }) {
  const { t } = useSettings()
  const clientName = s.client?.name || s.client?.email || '—'
  const canCancel  = s.status === 'pending' || s.status === 'confirmed'
  return (
    <div className={`${styles.upcomingCard} ${styles['ucard_' + s.status] || ''}`}>
      <div className={styles.upcomingDate}>
        <span className={styles.upcomingDay}>{fmtDay(t, s.scheduled_at)}</span>
        <span className={styles.upcomingTime}>{fmtTime(s.scheduled_at)}</span>
      </div>
      <div className={styles.upcomingInfo}>
        <span className={styles.upcomingClient}>{clientName}</span>
        <span className={styles.upcomingTitle}>{s.title}</span>
      </div>
      <span className={`${styles.upcomingBadge} ${styles['ubadge_' + s.status] || ''}`}>
        {STATUS_LABEL_KEYS[s.status] ? t(STATUS_LABEL_KEYS[s.status]) : s.status}
      </span>
      {canCancel && onCancel && (
        <button
          className={styles.cancelSessionBtn}
          onClick={() => onCancel(s.id)}
          type="button"
          aria-label={t('cp.cancelSession')}
        >
          ×
        </button>
      )}
    </div>
  )
}

export default function CoachPanel() {
  const { t } = useSettings()
  const { user, fetchClients, fetchCoaches, approveClient, fetchTrainingSessions, createTrainingSession, updateSessionStatus, sendMessage, fetchAllClientsStats } = useAuth()
  const { unreadByUser } = useUnread()

  const [clients, setClients]               = useState([])
  const [coaches, setCoaches]               = useState([])
  const [sessions, setSessions]             = useState([])
  const [clientStats, setClientStats]       = useState({})
  const [loading, setLoading]               = useState(true)
  const [approvingId, setApprovingId]       = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [chatCoach, setChatCoach]           = useState(null)

  const [showAddSession, setShowAddSession] = useState(false)
  const [sessionForm, setSessionForm]       = useState({
    clientId: '', scheduledAt: '', title: 'Тренировка', duration: '60', notes: '',
  })
  const [savingSession, setSavingSession]   = useState(false)

  const [notice, setNotice]       = useState(false)
  const [noticeSaving, setNoticeSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('update_notice').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setNotice(data.update_notice ?? false) })
  }, [user?.id])

  async function toggleNotice() {
    setNoticeSaving(true)
    const next = !notice
    await supabase.from('profiles').update({ update_notice: next }).eq('id', user.id)
    setNotice(next)
    setNoticeSaving(false)
  }

  useEffect(() => {
    Promise.all([fetchClients(), fetchCoaches(), fetchTrainingSessions()])
      .then(async ([clientsRes, coachesRes, sessionsRes]) => {
        if (clientsRes.data)  setClients(clientsRes.data)
        if (coachesRes.data)  setCoaches(coachesRes.data)
        if (sessionsRes.data) setSessions(sessionsRes.data)
        const approvedIds = (clientsRes.data || []).filter(c => !c.plan_pending).map(c => c.id)
        if (approvedIds.length) {
          const stats = await fetchAllClientsStats(approvedIds)
          setClientStats(stats)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Upcoming: non-completed, within next 7 days
  const upcoming = useMemo(() => {
    const now    = new Date()
    const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return sessions
      .filter(s => {
        if (s.status === 'cancelled' || s.status === 'declined' || s.status === 'completed') return false
        const d = new Date(s.scheduled_at)
        return d >= now && d <= cutoff
      })
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  }, [sessions])

  // Recent completed: past 14 days
  const recentCompleted = useMemo(() => {
    const now    = new Date()
    const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    return sessions
      .filter(s => {
        if (s.status !== 'completed') return false
        const d = new Date(s.scheduled_at)
        return d >= cutoff && d <= now
      })
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
  }, [sessions])

  const approvedClients = useMemo(() => clients.filter(c => !c.plan_pending), [clients])

  function openAddSession() {
    setSessionForm({
      clientId:    approvedClients[0]?.id || '',
      scheduledAt: localNow(),
      title:       'Тренировка',
      duration:    '60',
      notes:       '',
    })
    setShowAddSession(true)
  }

  async function handleAddSession(e) {
    e.preventDefault()
    if (!sessionForm.clientId || !sessionForm.scheduledAt) return
    setSavingSession(true)
    const scheduledAt = new Date(sessionForm.scheduledAt).toISOString()
    const isPast      = new Date(scheduledAt) < new Date()
    const { data, error } = await createTrainingSession({
      coachId:         user.id,
      clientId:        sessionForm.clientId,
      scheduledAt,
      title:           sessionForm.title || 'Тренировка',
      notes:           sessionForm.notes || null,
      durationMinutes: parseInt(sessionForm.duration) || 60,
      status:          isPast ? 'completed' : 'pending',
    })
    if (!error && data) setSessions(prev => [...prev, data])
    setSavingSession(false)
    setShowAddSession(false)
  }

  async function handleApprove(clientId) {
    setApprovingId(clientId)
    const { error } = await approveClient(clientId)
    if (!error) {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, approved: true, plan_pending: false } : c))
      sendMessage(clientId, t('cp.welcomeMsg')).catch(() => {})
    }
    setApprovingId(null)
  }

  async function handleCancelSession(sessionId) {
    const { error } = await updateSessionStatus(sessionId, 'cancelled')
    if (!error) setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'cancelled' } : s))
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
          <h1 className={styles.title}>{t('cp.title')}</h1>
        </header>
        <p className={styles.empty}>{t('cp.loading')}</p>
      </div>
    )
  }

  const hasSessions = upcoming.length > 0 || recentCompleted.length > 0

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('cp.title')}</h1>
        <p className={styles.subtitle}>
          {t('cp.approved', { n: clients.filter(c => !c.plan_pending).length })}
          {clients.filter(c => c.plan_pending).length > 0 && t('cp.waiting', { n: clients.filter(c => c.plan_pending).length })}
        </p>
      </header>

      {/* Sessions section — always shown */}
      <div className={styles.sessionsHeader}>
        <span className={styles.sessionsHeaderTitle}>
          {t('cp.sessions')}
          {upcoming.length > 0 && <span className={styles.badge}>{upcoming.length}</span>}
        </span>
        <button className={styles.addSessionBtn} onClick={openAddSession} type="button">
          {t('cp.new')}
        </button>
      </div>

      {hasSessions ? (
        <>
          {upcoming.length > 0 && (
            <>
              <p className={styles.sessionsSubLabel}>{t('cp.next7')}</p>
              <div className={styles.upcomingList}>
                {upcoming.map(s => <SessionCard key={s.id} s={s} onCancel={handleCancelSession} />)}
              </div>
            </>
          )}
          {recentCompleted.length > 0 && (
            <>
              <p className={styles.sessionsSubLabel}>{t('cp.last14')}</p>
              <div className={styles.upcomingList}>
                {recentCompleted.map(s => <SessionCard key={s.id} s={s} />)}
              </div>
            </>
          )}
        </>
      ) : (
        <p className={styles.sessionsEmpty}>{t('cp.noSessions')}</p>
      )}

      {/* Clients list */}
      {(() => {
        const pending  = clients.filter(c => c.plan_pending)
        const approved = clients.filter(c => !c.plan_pending)
        return (
          <>
            {pending.length > 0 && (
              <>
                <p className={styles.sectionTitle}>
                  {t('cp.pendingApproval')}
                  <span className={styles.badge}>{pending.length}</span>
                </p>
                <div className={styles.list}>
                  {pending.map(client => (
                    <div key={client.id} className={styles.pendingCard}>
                      <div className={styles.pendingTop}>
                        <ClientAvatar client={client} />
                        <div className={styles.clientInfo}>
                          <div className={styles.clientNameRow}>
                            <span className={styles.clientName}>{client.name || '—'}</span>
                            {client.plan && (
                              <span className={`${styles.planBadge} ${client.plan === 'pro' ? styles.planBadgePro : ''}`}>
                                {client.plan.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className={styles.clientEmail}>{client.email}</span>
                          {(client.phone || client.age || client.intake_training_days) && (
                            <div className={styles.intakeMeta}>
                              {client.phone && (
                                <a href={`tel:${client.phone}`} className={styles.intakePhone}>
                                  📞 {client.phone}
                                </a>
                              )}
                              {client.intake_call_time && (
                                <span className={styles.intakeAge}>{t('cp.callTime', { time: client.intake_call_time })}</span>
                              )}
                              {client.age && (
                                <span className={styles.intakeAge}>{t('cp.age', { n: client.age })}</span>
                              )}
                              {client.intake_training_days && (
                                <span className={styles.intakeAge}>{t('cp.perWeek', { n: client.intake_training_days })}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          className={styles.approveBtn}
                          onClick={() => handleApprove(client.id)}
                          disabled={approvingId === client.id}
                          type="button"
                        >
                          {approvingId === client.id ? '...' : t('cp.approve')}
                        </button>
                      </div>
                      {(client.intake_goal || client.intake_notes) && (
                        <div className={styles.intakeDetails}>
                          {client.intake_goal && (
                            <p className={styles.intakeRow}>
                              <span className={styles.intakeKey}>{t('cp.goalKey')}</span>{client.intake_goal}
                            </p>
                          )}
                          {client.intake_notes && (
                            <p className={styles.intakeRow}>
                              <span className={styles.intakeKey}>{t('cp.notesKey')}</span>{client.intake_notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {approved.length === 0 ? (
              <p className={styles.empty}>{t('cp.noApproved')}</p>
            ) : (
              <>
                {pending.length > 0 && <p className={styles.sectionTitle}>{t('cp.title')}</p>}
                <div className={styles.list}>
                  {[...approved]
                    .sort((a, b) => clientSortCompare(a, b, clientStats))
                    .map(client => {
                      const s = clientStats[client.id]
                      const label = lastActiveLabel(t, s?.lastActive)
                      const isToday = s?.lastActive === TODAY
                      return (
                        <button
                          key={client.id}
                          className={styles.card}
                          onClick={() => setSelectedClient(client)}
                          type="button"
                        >
                          <ClientAvatar client={client} />
                          <div className={styles.clientInfo}>
                            <div className={styles.clientNameRow}>
                              <span className={styles.clientName}>{client.name || '—'}</span>
                              {client.plan && (
                                <span className={`${styles.planBadge} ${client.plan === 'pro' ? styles.planBadgePro : ''}`}>
                                  {client.plan.toUpperCase()}
                                </span>
                              )}
                            </div>
                            {client.email && (
                              <span className={styles.clientEmail}>{client.email}</span>
                            )}
                            <div className={styles.clientMeta}>
                              {s?.kcalToday > 0
                                ? <span className={styles.kcalToday}>{t('cp.kcalToday', { n: Math.round(s.kcalToday) })}</span>
                                : <span className={styles.kcalEmpty}>—</span>
                              }
                              {client.calories > 0 && s?.kcalToday > 0 &&
                                <span className={styles.kcalTarget}>/ {client.calories}</span>
                              }
                              <span className={styles.metaDot}>·</span>
                              <span className={isToday ? styles.activeToday : styles.activeMuted}>{label}</span>
                            </div>
                            {client.calories > 0 && (
                              <div className={styles.kcalBar}>
                                <div
                                  className={styles.kcalBarFill}
                                  style={{
                                    width: `${Math.min(100, Math.round(((s?.kcalToday || 0) / client.calories) * 100))}%`,
                                    background: (s?.kcalToday || 0) > client.calories ? 'var(--red)' : 'var(--accent)',
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          {unreadByUser[client.id] > 0 && (
                            <span className={styles.badge}>{unreadByUser[client.id] > 9 ? '9+' : unreadByUser[client.id]}</span>
                          )}
                          <span className={styles.chevron}>›</span>
                        </button>
                      )
                    })
                  }
                </div>
              </>
            )}
          </>
        )
      })()}

      {/* Coaches */}
      {coaches.length > 0 && (
        <>
          <p className={styles.sectionTitle}>{t('cp.colleagues')}</p>
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

      {/* ── Update notice toggle ── */}
      <div className={styles.noticeRow}>
        <div>
          <p className={styles.noticeLabel}>{t('cp.noticeLabel')}</p>
          <p className={styles.noticeDesc}>
            {notice ? t('cp.noticeOn') : t('cp.noticeOff')}
          </p>
        </div>
        <button
          className={notice ? styles.noticeBtnOff : styles.noticeBtnOn}
          onClick={toggleNotice}
          disabled={noticeSaving}
          type="button"
        >
          {noticeSaving ? '...' : notice ? t('cp.noticeStop') : t('cp.noticeStart')}
        </button>
      </div>

      {/* ── Showcase manager ── */}
      <ShowcaseManager />

      {/* Add session modal */}
      {showAddSession && (
        <div className={styles.modal} onClick={() => setShowAddSession(false)}>
          <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.handle} />
            <p className={styles.modalTitle}>{t('cp.newSession')}</p>
            <form className={styles.sessionForm} onSubmit={handleAddSession}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>{t('cp.client')}</label>
                <select
                  className={styles.formSelect}
                  value={sessionForm.clientId}
                  onChange={e => setSessionForm(p => ({ ...p, clientId: e.target.value }))}
                  required
                >
                  <option value="">{t('cp.pickClient')}</option>
                  {approvedClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.email}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>{t('cp.dateTime')}</label>
                <input
                  type="datetime-local"
                  className={styles.formInput}
                  value={sessionForm.scheduledAt}
                  onChange={e => setSessionForm(p => ({ ...p, scheduledAt: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>{t('cp.sessionTitle')}</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={sessionForm.title}
                  onChange={e => setSessionForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={t('training.sessionWorkout')}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>{t('cp.duration')}</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={sessionForm.duration}
                  onChange={e => setSessionForm(p => ({ ...p, duration: e.target.value }))}
                  min="1"
                  max="300"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>{t('cp.notes')}</label>
                <textarea
                  className={styles.formTextarea}
                  value={sessionForm.notes}
                  onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="..."
                />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.formCancelBtn} onClick={() => setShowAddSession(false)}>
                  {t('cp.cancel')}
                </button>
                <button
                  type="submit"
                  className={styles.formSaveBtn}
                  disabled={savingSession || !sessionForm.clientId || !sessionForm.scheduledAt}
                >
                  {savingSession ? '...' : t('cp.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Showcase Manager ─────────────────────────────────────────────────────────

const CAT_LABEL_KEYS = { training: 'cp.cat.training', nutrition: 'cp.cat.nutrition' }
const CAT_COLOR = { training: 'var(--accent)', nutrition: '#66BB6A' }

const EMPTY_FORM = { category: 'training', title: '', body: '' }

function ShowcaseManager() {
  const { t } = useSettings()
  const fileRef = useRef()
  const [posts,    setPosts]    = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [editId,   setEditId]   = useState(null)

  useEffect(() => {
    supabase.from('showcase_posts').select('*')
      .order('sort_order').order('created_at', { ascending: false })
      .then(({ data }) => setPosts(data || []))
  }, [])

  function openNew() {
    setForm(EMPTY_FORM)
    setPhotoFile(null)
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(post) {
    setForm({ category: post.category, title: post.title, body: post.body || '' })
    setPhotoFile(null)
    setEditId(post.id)
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)

    let photo_url = editId ? posts.find(p => p.id === editId)?.photo_url || null : null

    if (photoFile) {
      const ext  = photoFile.name.split('.').pop() || 'jpg'
      const path = `${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('showcase-photos')
        .upload(path, photoFile, { contentType: photoFile.type })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('showcase-photos').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
    }

    const payload = { category: form.category, title: form.title.trim(), body: form.body.trim() || null, photo_url }

    if (editId) {
      const { data } = await supabase.from('showcase_posts').update(payload).eq('id', editId).select().single()
      if (data) setPosts(prev => prev.map(p => p.id === editId ? data : p))
    } else {
      const { data } = await supabase.from('showcase_posts').insert(payload).select().single()
      if (data) setPosts(prev => [data, ...prev])
    }

    setSaving(false)
    setShowForm(false)
    setPhotoFile(null)
  }

  async function handleDelete(id) {
    await supabase.from('showcase_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div>
      <div className={styles.sessionsHeader}>
        <span className={styles.sessionsHeaderTitle}>{t('cp.inspiration')}</span>
        <button className={styles.addSessionBtn} onClick={openNew} type="button">{t('cp.newPost')}</button>
      </div>

      {posts.length === 0 && !showForm && (
        <p className={styles.empty} style={{ marginTop: 8 }}>{t('cp.noPosts')}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {posts.map(post => (
          <div key={post.id} className={styles.sessionItem} style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 9, letterSpacing: '0.14em', color: CAT_COLOR[post.category] }}>
                {t(CAT_LABEL_KEYS[post.category])}
              </span>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text)', margin: '2px 0 0', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {post.title}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button type="button" onClick={() => openEdit(post)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, padding: 0 }}>✎</button>
              <button type="button" onClick={() => handleDelete(post.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 16, padding: 0, opacity: 0.5 }}>×</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className={styles.modal} onClick={() => setShowForm(false)}>
          <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{editId ? t('cp.editPost') : t('cp.newPostTitle')}</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>{t('cp.category')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['training', 'nutrition'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, category: cat }))}
                      style={{
                        flex: 1, padding: '8px 0',
                        background: form.category === cat ? `${CAT_COLOR[cat]}18` : 'transparent',
                        border: `1px solid ${form.category === cat ? CAT_COLOR[cat] : 'var(--border)'}`,
                        borderRadius: 8,
                        color: form.category === cat ? CAT_COLOR[cat] : 'var(--muted)',
                        fontFamily: 'var(--font-heading)', fontSize: 11, letterSpacing: '0.1em',
                        cursor: 'pointer',
                      }}
                    >
                      {t(CAT_LABEL_KEYS[cat])}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>{t('cp.sessionTitle')}</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={t('cp.postTitlePh')}
                  required
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>{t('cp.content')}</label>
                <textarea
                  className={styles.formTextarea}
                  value={form.body}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  rows={5}
                  placeholder={t('cp.contentPh')}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>{t('cp.photo')}</label>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPhotoFile(e.target.files[0] || null)} />
                <button type="button" className={styles.formCancelBtn} onClick={() => fileRef.current.click()}>
                  {photoFile ? `✓ ${photoFile.name}` : t('cp.pickPhoto')}
                </button>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.formCancelBtn} onClick={() => setShowForm(false)}>{t('cp.cancel')}</button>
                <button type="submit" className={styles.formSaveBtn} disabled={saving || !form.title.trim()}>
                  {saving ? '...' : t('cp.publish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
