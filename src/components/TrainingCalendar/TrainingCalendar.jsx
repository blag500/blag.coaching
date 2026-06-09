import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './TrainingCalendar.module.css'

async function notifySession(sessionId, event) {
  try {
    await supabase.functions.invoke('notify-training-session', { body: { sessionId, event } })
  } catch (_) { /* silent */ }
}

const DAYS_SHORT  = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const MONTHS_BG   = ['ЯНУАРИ','ФЕВРУАРИ','МАРТ','АПРИЛ','МАЙ','ЮНИ','ЮЛИ','АВГУСТ','СЕПТЕМВРИ','ОКТОМВРИ','НОЕМВРИ','ДЕКЕМВРИ']
const SESSION_TYPES = ['Тренировка','Горна част','Долна част','Цяло тяло','Кардио','Гърди / Трицепс','Гръб / Бицепс','Рамене','Крака','Почивен ден']

const STATUS_LABELS = {
  pending:   'ЧАКА',
  confirmed: 'ПОТВЪРДЕНО',
  completed: 'ПРОВЕДЕНА',
  declined:  'ОТХВЪРЛЕНО',
  cancelled: 'ОТМЕНЕНО',
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sofia' })
}

function sofiaDateStr(iso) {
  // Returns 'YYYY-MM-DD' in Sofia timezone for calendar day matching
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Sofia' })
}

function toDateInput(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isoToDateInput(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Sofia' })
}

function isoToTimeInput(iso) {
  if (!iso) return '10:00'
  return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sofia' })
}

// Sofia-aware "today" — returns { year, month (0-based), day }
function getSofiaToday() {
  const parts = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Sofia' }).split('-').map(Number)
  return { year: parts[0], month: parts[1] - 1, day: parts[2] }
}

// formMode: 'create' | 'coach-edit' | 'client-propose'
export default function TrainingCalendar() {
  const { profile, fetchTrainingSessions, createTrainingSession, updateSessionStatus, updateSession, fetchClients } = useAuth()
  const isCoach   = profile?.role === 'coach'
  const today     = getSofiaToday()

  const [year,     setYear]     = useState(today.year)
  const [month,    setMonth]    = useState(today.month)
  const [selDay,   setSelDay]   = useState(today.day)
  const [sessions, setSessions] = useState([])
  const [clients,  setClients]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [filterClientId, setFilterClientId] = useState('all')

  // form
  const [formMode,  setFormMode]  = useState('create')
  const [editingSess, setEditingSess] = useState(null)
  const [showForm,  setShowForm]  = useState(false)
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
    const startOffset = (firstDay.getDay() + 6) % 7
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

  function dayKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function visibleSessionsForDay(day) {
    if (!day) return []
    const target = dayKey(year, month, day)
    return sessions.filter(s => {
      if (s.status === 'declined' || s.status === 'cancelled') return false
      if (filterClientId !== 'all' && s.client_id !== filterClientId) return false
      return sofiaDateStr(s.scheduled_at) === target
    })
  }

  function allSessionsForDay(day) {
    if (!day) return []
    const target = dayKey(year, month, day)
    return sessions.filter(s => sofiaDateStr(s.scheduled_at) === target)
  }

  // ── Form helpers ───────────────────────────────────────────
  function openCreate(day) {
    setFormMode('create')
    setEditingSess(null)
    setFDate(toDateInput(year, month, day))
    setFTime('10:00')
    setFTitle(SESSION_TYPES[0])
    setFNotes('')
    setFormErr('')
    setShowForm(true)
  }

  function openCoachEdit(session) {
    setFormMode('coach-edit')
    setEditingSess(session)
    setFDate(isoToDateInput(session.scheduled_at))
    setFTime(isoToTimeInput(session.scheduled_at))
    setFTitle(session.title)
    setFNotes(session.notes || '')
    setFormErr('')
    setShowForm(true)
  }

  function openClientPropose(session) {
    setFormMode('client-propose')
    setEditingSess(session)
    // pre-fill with current values so client can tweak them
    setFDate(isoToDateInput(session.scheduled_at))
    setFTime(isoToTimeInput(session.scheduled_at))
    setFTitle(session.title)
    setFNotes(session.notes || '')
    setFormErr('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormErr('')
    if (!fDate || !fTime) return
    setSaving(true)
    const scheduledAt = new Date(`${fDate}T${fTime}:00`).toISOString()

    if (formMode === 'create') {
      const coachId  = isCoach ? profile.id   : profile.coach_id
      const clientId = isCoach ? fClientId    : profile.id
      if (!clientId) { setFormErr('Избери клиент'); setSaving(false); return }
      if (!coachId)  { setFormErr('Нямаш назначен треньор'); setSaving(false); return }
      const { data, error } = await createTrainingSession({
        coachId, clientId, scheduledAt,
        title: fTitle,
        notes: fNotes || null,
      })
      setSaving(false)
      if (error) { setFormErr('Грешка при запазване. Провери връзката и опитай пак.'); return }
      setSessions(prev => [...prev, data].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)))
      notifySession(data.id, 'created')

    } else if (formMode === 'coach-edit') {
      const { error } = await updateSession(editingSess.id, {
        scheduled_at: scheduledAt,
        title:        fTitle,
        notes:        fNotes || null,
      })
      setSaving(false)
      if (error) { setFormErr('Грешка при запазване'); return }
      setSessions(prev => prev.map(s => s.id === editingSess.id
        ? { ...s, scheduled_at: scheduledAt, title: fTitle, notes: fNotes || null }
        : s
      ))

    } else if (formMode === 'client-propose') {
      const { error } = await updateSession(editingSess.id, {
        edit_proposed_at:    scheduledAt,
        edit_proposed_title: fTitle,
        edit_proposed_notes: fNotes || null,
        edit_requested_by:   profile.id,
      })
      setSaving(false)
      if (error) { setFormErr('Грешка при запазване'); return }
      setSessions(prev => prev.map(s => s.id === editingSess.id
        ? { ...s, edit_proposed_at: scheduledAt, edit_proposed_title: fTitle,
            edit_proposed_notes: fNotes || null, edit_requested_by: profile.id }
        : s
      ))
    }

    setShowForm(false)
  }

  async function handleRestDay() {
    const coachId  = isCoach ? profile.id : profile.coach_id
    const clientId = isCoach ? (fClientId || clients[0]?.id) : profile.id
    if (!coachId || !clientId) return
    const scheduledAt = new Date(`${toDateInput(year, month, selDay)}T09:00:00`).toISOString()
    const { data, error } = await createTrainingSession({
      coachId, clientId, scheduledAt,
      title: 'Почивен ден',
      notes: null,
    })
    if (!error && data) {
      setSessions(prev => [...prev, data].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)))
      notifySession(data.id, 'created')
    }
  }

  async function handleDeleteSession(sessionId) {
    await supabase.from('training_sessions').delete().eq('id', sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
  }

  async function handleStatus(sessionId, newStatus) {
    const { error } = await updateSessionStatus(sessionId, newStatus)
    if (!error) {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: newStatus } : s))
      if (newStatus === 'confirmed' || newStatus === 'cancelled' || newStatus === 'declined') {
        notifySession(sessionId, newStatus)
      }
    }
  }

  async function handleAcceptEdit(session) {
    const { error } = await updateSession(session.id, {
      scheduled_at:        session.edit_proposed_at,
      title:               session.edit_proposed_title || session.title,
      notes:               session.edit_proposed_notes,
      edit_proposed_at:    null,
      edit_proposed_title: null,
      edit_proposed_notes: null,
      edit_requested_by:   null,
    })
    if (!error) {
      setSessions(prev => prev.map(s => s.id === session.id ? {
        ...s,
        scheduled_at:        session.edit_proposed_at,
        title:               session.edit_proposed_title || s.title,
        notes:               session.edit_proposed_notes,
        edit_proposed_at:    null,
        edit_proposed_title: null,
        edit_proposed_notes: null,
        edit_requested_by:   null,
      } : s))
    }
  }

  async function handleDeclineEdit(sessionId) {
    const { error } = await updateSession(sessionId, {
      edit_proposed_at:    null,
      edit_proposed_title: null,
      edit_proposed_notes: null,
      edit_requested_by:   null,
    })
    if (!error) {
      setSessions(prev => prev.map(s => s.id === sessionId ? {
        ...s,
        edit_proposed_at:    null,
        edit_proposed_title: null,
        edit_proposed_notes: null,
        edit_requested_by:   null,
      } : s))
    }
  }

  const allSelSessions = allSessionsForDay(selDay)
  const selSessions = allSelSessions.filter(s => {
    if (filterClientId !== 'all' && s.client_id !== filterClientId) return false
    return activeTab === 'upcoming'
      ? s.status === 'pending' || s.status === 'confirmed'
      : s.status === 'completed' || s.status === 'cancelled' || s.status === 'declined'
  })

  const historySessions = useMemo(() => {
    return sessions
      .filter(s => {
        if (filterClientId !== 'all' && s.client?.id !== filterClientId) return false
        const todayStr = `${today.year}-${String(today.month + 1).padStart(2,'0')}-${String(today.day).padStart(2,'0')}`
        return ['completed', 'cancelled', 'declined'].includes(s.status) ||
          (sofiaDateStr(s.scheduled_at) < todayStr && s.status !== 'pending' && s.status !== 'confirmed')
      })
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
  }, [sessions, filterClientId])

  const historyByDate = useMemo(() => {
    const groups = {}
    historySessions.forEach(s => {
      const key = new Date(s.scheduled_at).toLocaleDateString('bg-BG', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Sofia',
      }).toUpperCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    })
    return Object.entries(groups)
  }, [historySessions])

  const clientUpcomingGroups = useMemo(() => {
    if (isCoach) return []
    const upcoming = sessions
      .filter(s => s.status === 'pending' || s.status === 'confirmed')
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    const groups = {}
    upcoming.forEach(s => {
      const key = new Date(s.scheduled_at).toLocaleDateString('bg-BG', {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Sofia',
      }).toUpperCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    })
    return Object.entries(groups)
  }, [sessions, isCoach])

  const isToday  = d => d === today.day && month === today.month && year === today.year
  const isSel    = d => d === selDay

  const formTitles = {
    'create':          'НОВА ТРЕНИРОВКА',
    'coach-edit':      'РЕДАКТИРАЙ',
    'client-propose':  'ЗАЯВИ ПРОМЯНА',
  }
  const submitLabels = {
    'create':          'ЗАЯВИ ТРЕНИРОВКА',
    'coach-edit':      'ЗАПАЗИ ПРОМЕНИТЕ',
    'client-propose':  'ИЗПРАТИ ЗАЯВКА',
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ГРАФИК</h1>
        <p className={styles.subtitle}>тренировки</p>
      </header>

      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={prevMonth} type="button" aria-label="Предишен месец">‹</button>
        <span className={styles.monthLabel}>{MONTHS_BG[month]} {year}</span>
        <button className={styles.navBtn} onClick={nextMonth} type="button" aria-label="Следващ месец">›</button>
      </div>

      {isCoach && clients.length > 0 && (
        <div className={styles.clientFilter}>
          <button
            className={`${styles.filterPill} ${filterClientId === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterClientId('all')}
            type="button"
          >
            ВСИЧКИ
          </button>
          {clients.map(c => (
            <button
              key={c.id}
              className={`${styles.filterPill} ${filterClientId === c.id ? styles.filterPillActive : ''}`}
              onClick={() => setFilterClientId(c.id)}
              type="button"
            >
              {(c.name || c.email || '').split(' ')[0].toUpperCase()}
            </button>
          ))}
        </div>
      )}

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

      {/* Tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'upcoming' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('upcoming')} type="button"
        >
          ПРЕДСТОЯЩИ
          {sessions.filter(s => s.status === 'pending' || s.status === 'confirmed').length > 0 && (
            <span className={styles.tabCount}>
              {sessions.filter(s => s.status === 'pending' || s.status === 'confirmed').length}
            </span>
          )}
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('history')} type="button"
        >
          ИСТОРИЯ
        </button>
      </div>

      {activeTab === 'upcoming' ? (
        !isCoach ? (
          /* Client: all upcoming sessions grouped by date */
          <div className={styles.clientUpcomingSection}>
            <div className={styles.daySectionHead}>
              <span className={styles.daySectionTitle}>ПРЕДСТОЯЩИ ТРЕНИРОВКИ</span>
              <button className={styles.addBtn} onClick={() => openCreate(selDay)} type="button">
                + ЗАЯВИ
              </button>
            </div>
            {loading ? (
              <p className={styles.empty}>Зарежда...</p>
            ) : clientUpcomingGroups.length === 0 ? (
              <p className={styles.empty}>Нямаш предстоящи тренировки.{'\n'}Избери ден от календара и заяви.</p>
            ) : (
              <div className={styles.historySection}>
                {clientUpcomingGroups.map(([dateLabel, daySessions]) => (
                  <div key={dateLabel} className={styles.historyGroup}>
                    <p className={styles.historyDate}>{dateLabel}</p>
                    <div className={styles.sessionList}>
                      {daySessions.map(s => (
                        <SessionCard
                          key={s.id}
                          session={s}
                          isCoach={false}
                          myId={profile?.id}
                          onStatus={handleStatus}
                          onCoachEdit={openCoachEdit}
                          onClientPropose={openClientPropose}
                          onAcceptEdit={handleAcceptEdit}
                          onDeclineEdit={handleDeclineEdit}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Coach: day-filtered view */
          <div className={styles.daySection}>
            <div className={styles.daySectionHead}>
              <span className={styles.daySectionTitle}>
                {new Date(year, month, selDay).toLocaleDateString('bg-BG', {
                  weekday: 'short', day: 'numeric', month: 'long', timeZone: 'Europe/Sofia',
                }).toUpperCase()}
              </span>
              <div className={styles.dayActions}>
                <button className={styles.restDayBtn} onClick={handleRestDay} type="button">
                  🌙 ПОЧИВЕН
                </button>
                <button className={styles.addBtn} onClick={() => openCreate(selDay)} type="button">
                  + ЗАЯВИ
                </button>
              </div>
            </div>

            {loading ? (
              <p className={styles.empty}>Зарежда...</p>
            ) : selSessions.length === 0 ? (
              <p className={styles.empty}>Няма предстоящи тренировки за този ден.</p>
            ) : (
              <div className={styles.sessionList}>
                {selSessions.map(s => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    isCoach={true}
                    myId={profile?.id}
                    onStatus={handleStatus}
                    onCoachEdit={openCoachEdit}
                    onClientPropose={openClientPropose}
                    onAcceptEdit={handleAcceptEdit}
                    onDeclineEdit={handleDeclineEdit}
                  />
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        <div className={styles.historySection}>
          {loading ? (
            <p className={styles.empty}>Зарежда...</p>
          ) : historyByDate.length === 0 ? (
            <p className={styles.empty}>Няма минали тренировки.</p>
          ) : (
            historyByDate.map(([dateLabel, daySessions]) => (
              <div key={dateLabel} className={styles.historyGroup}>
                <p className={styles.historyDate}>{dateLabel}</p>
                <div className={styles.sessionList}>
                  {daySessions.map(s => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      isCoach={isCoach}
                      myId={profile?.id}
                      onStatus={handleStatus}
                      onCoachEdit={openCoachEdit}
                      onClientPropose={openClientPropose}
                      onAcceptEdit={handleAcceptEdit}
                      onDeclineEdit={handleDeclineEdit}
                      onDelete={isCoach ? handleDeleteSession : undefined}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showForm && createPortal(
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <span className={styles.sheetTitle}>{formTitles[formMode]}</span>
              {(formMode === 'client-propose' || (!isCoach && formMode === 'create')) && (
                <span className={styles.sheetSub}>треньорът ще потвърди</span>
              )}
              <button className={styles.closeBtn} onClick={() => setShowForm(false)} type="button">✕</button>
            </div>
            <div className={styles.sheetBody}>
              <form id="calForm" onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Дата</label>
                    <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className={styles.input} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Час</label>
                    <input type="time" value={fTime} onChange={e => setFTime(e.target.value)} className={styles.input} required />
                  </div>
                </div>

                <label className={styles.formLabel}>Вид тренировка</label>
                <div className={styles.typeChips}>
                  {(isCoach ? SESSION_TYPES : SESSION_TYPES.filter(t => t !== 'Почивен ден')).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.typeChip} ${fTitle === t ? styles.typeChipActive : ''}`}
                      onClick={() => setFTitle(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {isCoach && formMode === 'create' && (
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
              </form>
            </div>

            <div className={styles.sheetFooter}>
              {formErr && <p className={styles.formErr}>{formErr}</p>}
              <button type="submit" form="calForm" className={styles.submitBtn} disabled={saving}>
                {saving ? 'Запазва...' : submitLabels[formMode]}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function SessionCard({ session, isCoach, myId, onStatus, onCoachEdit, onClientPropose, onAcceptEdit, onDeclineEdit, onDelete }) {
  const isPending     = session.status === 'pending'
  const isConfirmed   = session.status === 'confirmed'
  const requestedByMe = session.requested_by === myId
  const isPast        = new Date(session.scheduled_at) < new Date()
  const hasEditReq    = !!session.edit_proposed_at
  const otherName     = isCoach
    ? (session.client?.name || session.client?.email || '—')
    : (session.coach?.name  || session.coach?.email  || 'Треньорът')

  return (
    <div className={`${styles.sessionCard} ${styles['card_' + session.status]}`}>
      <div className={styles.cardMain}>
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
            {(isPending || isConfirmed) && !isPast && (
              <>
                {isCoach && (
                  <button className={styles.editIconBtn} onClick={() => onCoachEdit(session)} type="button" aria-label="Редактирай">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
                {!isCoach && !hasEditReq && (
                  <button className={styles.proposeBtn} onClick={() => onClientPropose(session)} type="button">Промени</button>
                )}
                {isPending && requestedByMe && (
                  <button className={styles.cancelBtn} onClick={() => onStatus(session.id, 'cancelled')} type="button">Отмени</button>
                )}
                {isConfirmed && (
                  <button className={styles.cancelBtn} onClick={() => onStatus(session.id, 'cancelled')} type="button">Отмени</button>
                )}
              </>
            )}
            {isConfirmed && isPast && isCoach && (
              <button className={styles.completeBtn} onClick={() => onStatus(session.id, 'completed')} type="button">Проведена</button>
            )}
            {onDelete && (
              <button className={styles.deleteSessionBtn} onClick={() => onDelete(session.id)} type="button" aria-label="Изтрий">×</button>
            )}
          </div>
        </div>
      </div>

      {/* Coach sees the pending edit proposal */}
      {hasEditReq && isCoach && (
        <div className={styles.editProposal}>
          <span className={styles.editProposalLabel}>ПРЕДЛОЖЕНА ПРОМЯНА</span>
          <span className={styles.editProposalValue}>
            {fmtTime(session.edit_proposed_at)}
            {session.edit_proposed_title && session.edit_proposed_title !== session.title
              ? ` · ${session.edit_proposed_title}`
              : ''}
          </span>
          {session.edit_proposed_notes && (
            <span className={styles.editProposalNotes}>{session.edit_proposed_notes}</span>
          )}
          <div className={styles.editProposalActions}>
            <button className={styles.confirmBtn} onClick={() => onAcceptEdit(session)}      type="button">ПРИЕМИ</button>
            <button className={styles.declineBtn} onClick={() => onDeclineEdit(session.id)}  type="button">ОТКАЖИ</button>
          </div>
        </div>
      )}

      {/* Client sees their own pending proposal */}
      {hasEditReq && !isCoach && session.edit_requested_by === myId && (
        <div className={styles.editPending}>
          <span className={styles.editPendingLabel}>Промяната чака одобрение от треньора</span>
        </div>
      )}
    </div>
  )
}
