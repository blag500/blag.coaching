import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './TrainingCalendar.module.css'

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const MONTHS_BG  = ['ЯНУАРИ','ФЕВРУАРИ','МАРТ','АПРИЛ','МАЙ','ЮНИ','ЮЛИ','АВГУСТ','СЕПТЕМВРИ','ОКТОМВРИ','НОЕМВРИ','ДЕКЕМВРИ']
const SESSION_TYPES = ['Тренировка','Горна част','Долна част','Цяло тяло','Кардио','Гърди / Трицепс','Гръб / Бицепс','Рамене','Крака']

const STATUS_LABELS = {
  pending:   'ЧАКА',
  confirmed: 'ПОТВЪРДЕНО',
  completed: 'ПРОВЕДЕНА',
  declined:  'ОТХВЪРЛЕНО',
  cancelled: 'ОТМЕНЕНО',
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })
}

function toDateInputValue(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function TrainingCalendar() {
  const { profile, fetchTrainingSessions, createTrainingSession, updateSessionStatus, fetchClients } = useAuth()
  const isCoach = profile?.role === 'coach'
  const today   = new Date()

  const [year,     setYear]     = useState(today.getFullYear())
  const [month,    setMonth]    = useState(today.getMonth())
  const [selDay,   setSelDay]   = useState(today.getDate())
  const [sessions, setSessions] = useState([])
  const [clients,  setClients]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)

  // form
  const [fDate,     setFDate]     = useState('')
  const [fTime,     setFTime]     = useState('10:00')
  const [fTitle,    setFTitle]    = useState(SESSION_TYPES[0])
  const [fNotes,    setFNotes]    = useState('')
  const [fClientId, setFClientId] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [formErr,   setFormErr]   = useState('')

  useEffect(() => {
    load()
    if (isCoach) loadClients()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await fetchTrainingSessions()
    setSessions(data || [])
    setLoading(false)
  }

  async function loadClients() {
    const { data } = await fetchClients()
    const approved = (data || []).filter(c => c.approved !== false)
    setClients(approved)
    if (approved.length > 0) setFClientId(approved[0].id)
  }

  // ── Calendar grid ──────────────────────────────────────────
  const grid = useMemo(() => {
    const firstDay    = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startOffset = (firstDay.getDay() + 6) % 7 // Mon = 0
    const cells = Array(startOffset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function visibleSessionsForDay(day) {
    if (!day) return []
    return sessions.filter(s => {
      if (s.status === 'declined' || s.status === 'cancelled') return false
      const d = new Date(s.scheduled_at)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  function allSessionsForDay(day) {
    if (!day) return []
    return sessions.filter(s => {
      const d = new Date(s.scheduled_at)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  // ── Form ───────────────────────────────────────────────────
  function openForm(day) {
    setFDate(toDateInputValue(year, month, day))
    setFTime('10:00')
    setFTitle(SESSION_TYPES[0])
    setFNotes('')
    setFormErr('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormErr('')
    if (!fDate || !fTime) return
    const coachId  = isCoach ? profile.id   : profile.coach_id
    const clientId = isCoach ? fClientId    : profile.id
    if (!clientId) { setFormErr('Избери клиент'); return }
    if (!coachId)  { setFormErr('Нямаш назначен треньор'); return }
    setSaving(true)
    const scheduledAt = new Date(`${fDate}T${fTime}:00`).toISOString()
    const { data, error } = await createTrainingSession({
      coachId, clientId, scheduledAt,
      title: fTitle,
      notes: fNotes || null,
    })
    setSaving(false)
    if (error) { setFormErr('Грешка при запазване'); return }
    setSessions(prev => [...prev, data].sort((a, b) =>
      new Date(a.scheduled_at) - new Date(b.scheduled_at)
    ))
    setShowForm(false)
  }

  async function handleStatus(sessionId, newStatus) {
    const { error } = await updateSessionStatus(sessionId, newStatus)
    if (!error) {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: newStatus } : s))
    }
  }

  const selSessions = allSessionsForDay(selDay)
  const isToday  = d => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const isSel    = d => d === selDay

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ГРАФИК</h1>
        <p className={styles.subtitle}>тренировки</p>
      </header>

      {/* Month navigation */}
      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={prevMonth} type="button" aria-label="Предишен месец">‹</button>
        <span className={styles.monthLabel}>{MONTHS_BG[month]} {year}</span>
        <button className={styles.navBtn} onClick={nextMonth} type="button" aria-label="Следващ месец">›</button>
      </div>

      {/* Calendar */}
      <div className={styles.calWrap}>
        <div className={styles.calGrid}>
          {DAYS_SHORT.map(d => (
            <div key={d} className={styles.dayHeader}>{d}</div>
          ))}
          {grid.map((day, i) => {
            const dots = day ? visibleSessionsForDay(day) : []
            return (
              <div
                key={i}
                className={`${styles.dayCell}
                  ${day ? styles.dayCellActive : ''}
                  ${isToday(day) ? styles.todayCell : ''}
                  ${isSel(day)   ? styles.selCell   : ''}`}
                onClick={() => day && setSelDay(day)}
                role={day ? 'button' : undefined}
                tabIndex={day ? 0 : undefined}
                onKeyDown={e => e.key === 'Enter' && day && setSelDay(day)}
              >
                {day && (
                  <>
                    <span className={styles.dayNum}>{day}</span>
                    <div className={styles.dotRow}>
                      {dots.slice(0, 3).map((s, idx) => (
                        <span key={idx} className={`${styles.dot} ${styles['dot_' + s.status]}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day sessions */}
      <div className={styles.daySection}>
        <div className={styles.daySectionHead}>
          <span className={styles.daySectionTitle}>
            {new Date(year, month, selDay).toLocaleDateString('bg-BG', {
              weekday: 'short', day: 'numeric', month: 'long',
            }).toUpperCase()}
          </span>
          <button className={styles.addBtn} onClick={() => openForm(selDay)} type="button">
            + ЗАЯВИ
          </button>
        </div>

        {loading ? (
          <p className={styles.empty}>Зарежда...</p>
        ) : selSessions.length === 0 ? (
          <p className={styles.empty}>Няма тренировки за този ден.</p>
        ) : (
          <div className={styles.sessionList}>
            {selSessions.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                isCoach={isCoach}
                myId={profile?.id}
                onStatus={handleStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form bottom sheet */}
      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <span className={styles.sheetTitle}>НОВА ТРЕНИРОВКА</span>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)} type="button">✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Дата</label>
                  <input
                    type="date"
                    value={fDate}
                    onChange={e => setFDate(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Час</label>
                  <input
                    type="time"
                    value={fTime}
                    onChange={e => setFTime(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <label className={styles.formLabel}>Вид тренировка</label>
              <select value={fTitle} onChange={e => setFTitle(e.target.value)} className={styles.input}>
                {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {isCoach && (
                <>
                  <label className={styles.formLabel}>Клиент</label>
                  <select value={fClientId} onChange={e => setFClientId(e.target.value)} className={styles.input} required>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </>
              )}

              <label className={styles.formLabel}>Бележка (по желание)</label>
              <textarea
                value={fNotes}
                onChange={e => setFNotes(e.target.value)}
                className={`${styles.input} ${styles.textarea}`}
                rows={3}
                placeholder="Цел, специфики..."
              />

              {formErr && <p className={styles.formErr}>{formErr}</p>}

              <button type="submit" className={styles.submitBtn} disabled={saving}>
                {saving ? 'Запазва...' : 'ЗАЯВИ ТРЕНИРОВКА'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SessionCard({ session, isCoach, myId, onStatus }) {
  const isPending      = session.status === 'pending'
  const isConfirmed    = session.status === 'confirmed'
  const requestedByMe  = session.requested_by === myId
  const isPast         = new Date(session.scheduled_at) < new Date()
  const otherName      = isCoach
    ? (session.client?.name || session.client?.email || '—')
    : (session.coach?.name  || session.coach?.email  || 'Треньорът')

  return (
    <div className={`${styles.sessionCard} ${styles['card_' + session.status]}`}>
      <div className={styles.sessionTime}>{fmtTime(session.scheduled_at)}</div>
      <div className={styles.sessionInfo}>
        <span className={styles.sessionTitle}>{session.title}</span>
        <span className={styles.sessionOther}>{otherName}</span>
        {session.notes && <span className={styles.sessionNotes}>{session.notes}</span>}
      </div>
      <div className={styles.sessionRight}>
        <span className={`${styles.statusBadge} ${styles['badge_' + session.status]}`}>
          {STATUS_LABELS[session.status]}
        </span>
        <div className={styles.actions}>
          {isPending && !requestedByMe && (
            <>
              <button className={styles.confirmBtn} onClick={() => onStatus(session.id, 'confirmed')} type="button">ДА</button>
              <button className={styles.declineBtn} onClick={() => onStatus(session.id, 'declined')}  type="button">НЕ</button>
            </>
          )}
          {isPending && requestedByMe && (
            <button className={styles.cancelBtn} onClick={() => onStatus(session.id, 'cancelled')} type="button">Отмени</button>
          )}
          {isConfirmed && !isPast && (
            <button className={styles.cancelBtn} onClick={() => onStatus(session.id, 'cancelled')} type="button">Отмени</button>
          )}
          {isConfirmed && isPast && isCoach && (
            <button className={styles.completeBtn} onClick={() => onStatus(session.id, 'completed')} type="button">Проведена</button>
          )}
        </div>
      </div>
    </div>
  )
}
