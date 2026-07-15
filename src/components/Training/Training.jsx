import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { DEFAULT_TRAINING_BLOCKS } from '../../data/appData'
import DayCard from './DayCard'
import LiftLogger from './LiftLogger'
import TrainingEditor from '../Coach/TrainingEditor'
import ProgressionView from './ProgressionView'
import DatePicker from '../DatePicker/DatePicker'
import styles from './Training.module.css'

// Detect old 7-day format
function isOldFormat(plan) {
  return Array.isArray(plan) && plan.length > 0 && plan[0]?.day !== undefined
}

function getBlocks(plan) {
  if (!plan || plan.length === 0 || isOldFormat(plan)) return null
  return plan
}

// Color per block index
const PALETTE = ['#ffb74d', '#4FC3F7', '#ff8a65', '#81C784', '#CE93D8', '#80DEEA', '#FFAB91']
function blockColor(idx) { return PALETTE[idx % PALETTE.length] }

// ── Calendar ────────────────────────────────────────────────────────────────

const MONTHS_BG = [
  'Януари','Февруари','Март','Април','Май','Юни',
  'Юли','Август','Септември','Октомври','Ноември','Декември',
]
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд']

// "UPPER A" → "UA", "LOWER B" → "LB", "PUSH" → "PU"
function abbrev(label) {
  const parts = (label || '').trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return label.slice(0, 2).toUpperCase()
}

function buildCalendar(year, month, completionMap) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const rawFirstDay = new Date(year, month, 1).getDay()
  const firstDow    = (rawFirstDay + 6) % 7 // Monday = 0

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const mm      = String(month + 1).padStart(2, '0')
    const dd      = String(d).padStart(2, '0')
    const dateStr = `${year}-${mm}-${dd}`
    cells.push({ day: d, dateStr, labels: completionMap[dateStr] || [] })
  }
  return cells
}

function WorkoutCalendar({ completions, blocks }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const todayStr = today.toISOString().slice(0, 10)

  const completionMap = useMemo(() => {
    const m = {}
    for (const c of completions) {
      if (!m[c.completed_date]) m[c.completed_date] = []
      if (!m[c.completed_date].includes(c.block_label))
        m[c.completed_date].push(c.block_label)
    }
    return m
  }, [completions])

  const cells = buildCalendar(year, month, completionMap)

  // Count workouts in current view month
  const monthCount = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
    return completions.filter(c => c.completed_date.startsWith(prefix)).length
  }, [completions, year, month])

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const colorMap = {}
  blocks.forEach((b, i) => { colorMap[b.label] = blockColor(i) })

  const isPast = (dateStr) => dateStr < todayStr

  return (
    <div className={styles.calendar}>
      <div className={styles.calHeader}>
        <button className={styles.calNav} onClick={prev} type="button">‹</button>
        <div className={styles.calTitleGroup}>
          <span className={styles.calTitle}>{MONTHS_BG[month]} {year}</span>
          {monthCount > 0 && (
            <span className={styles.calMonthCount}>{monthCount} тренировки</span>
          )}
        </div>
        <button className={styles.calNav} onClick={next} type="button">›</button>
      </div>

      <div className={styles.calDow}>
        {DAYS_SHORT.map(d => <span key={d} className={styles.calDowCell}>{d}</span>)}
      </div>

      <div className={styles.calGrid}>
        {cells.map((cell, i) =>
          !cell
            ? <div key={`e-${i}`} />
            : (
              <div
                key={cell.dateStr}
                className={[
                  styles.calDay,
                  cell.dateStr === todayStr ? styles.calToday : '',
                  cell.labels.length > 0 ? styles.calDone : '',
                  isPast(cell.dateStr) && cell.labels.length === 0 ? styles.calMissed : '',
                ].join(' ')}
              >
                <span className={styles.calNum}>{cell.day}</span>
                <div className={styles.calChips}>
                  {cell.labels.slice(0, 2).map((label, li) => (
                    <span
                      key={li}
                      className={styles.calChip}
                      style={{ background: colorMap[label] || '#8888AA' }}
                    >
                      {abbrev(label)}
                    </span>
                  ))}
                </div>
              </div>
            )
        )}
      </div>

      <div className={styles.calLegend}>
        {blocks.map((b, i) => (
          <span key={b.id} className={styles.calLegendItem}>
            <span className={styles.calChip} style={{ background: blockColor(i) }}>
              {abbrev(b.label)}
            </span>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Training() {
  const { user, profile, updateProfile, removeExerciseLog } = useAuth()
  const isCoach = profile?.role === 'coach'
  const blocks  = getBlocks(profile?.training_plan)

  const [selectedId, setSelectedId]     = useState(blocks?.[0]?.id ?? '0')
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showProgression, setShowProgression] = useState(false)
  const [editing, setEditing]           = useState(false)
  const [savingPlan, setSavingPlan]     = useState(false)
  const [completions, setCompletions]   = useState([])
  const [marking, setMarking]           = useState(false)
  const [justMarked, setJustMarked]     = useState(false)
  const [undoEntry, setUndoEntry]       = useState(null) // { id, exerciseName, weight }
  const undoTimerRef                    = useRef(null)
  const [logDate, setLogDate]           = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (!user) return
    supabase
      .from('workout_completions')
      .select('block_label, completed_date')
      .eq('user_id', user.id)
      .order('completed_date', { ascending: false })
      .then(({ data }) => { if (data) setCompletions(data) })
  }, [user?.id])

  const selectedBlock = blocks ? (blocks.find(b => b.id === selectedId) ?? blocks[0]) : null
  const todayStr = new Date().toISOString().slice(0, 10)
  const alreadyMarked = completions.some(
    c => c.completed_date === logDate && c.block_label === selectedBlock?.label
  )

  async function handleSavePlan(newBlocks) {
    setSavingPlan(true)
    await updateProfile({ training_plan: newBlocks })
    setSavingPlan(false)
    setEditing(false)
  }

  function handleSaved(entry) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoEntry(entry)
    undoTimerRef.current = setTimeout(() => setUndoEntry(null), 8000)
  }

  async function handleUndo() {
    if (!undoEntry) return
    clearTimeout(undoTimerRef.current)
    await removeExerciseLog(undoEntry.id)
    setUndoEntry(null)
  }

  async function handleMarkDone() {
    if (!user || marking || alreadyMarked) return
    setMarking(true)
    const { error } = await supabase
      .from('workout_completions')
      .upsert(
        { user_id: user.id, block_label: selectedBlock.label, completed_date: logDate },
        { onConflict: 'user_id,block_label,completed_date', ignoreDuplicates: true }
      )
    if (!error) {
      setCompletions(prev => [
        { block_label: selectedBlock.label, completed_date: logDate },
        ...prev,
      ])
      setJustMarked(true)
      setTimeout(() => setJustMarked(false), 2500)
    }
    setMarking(false)
  }

  async function handleUnmarkDone() {
    if (!user || marking) return
    setMarking(true)
    const { error } = await supabase
      .from('workout_completions')
      .delete()
      .eq('user_id', user.id)
      .eq('block_label', selectedBlock.label)
      .eq('completed_date', logDate)
    if (!error) {
      setCompletions(prev =>
        prev.filter(c => !(c.completed_date === logDate && c.block_label === selectedBlock.label))
      )
      setJustMarked(false)
    }
    setMarking(false)
  }

  if (editing && isCoach) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>ТРЕНИРОВКА</h1>
            <button className={styles.editBtn} onClick={() => setEditing(false)} type="button">
              ✕ ОТКАЗ
            </button>
          </div>
        </header>
        <TrainingEditor
          initialPlan={isOldFormat(profile?.training_plan) ? null : profile?.training_plan}
          onSave={handleSavePlan}
          saving={savingPlan}
        />
      </div>
    )
  }

  if (!blocks) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>ТРЕНИРОВКА</h1>
            {isCoach && (
              <button className={styles.editBtn} onClick={() => setEditing(true)} type="button">
                РЕДАКТИРАЙ
              </button>
            )}
          </div>
        </header>
        <div className={styles.noPlanWrap}>
          <p className={styles.noPlanIcon}>🏋️</p>
          <p className={styles.noPlanTitle}>ПРОГРАМАТА СЕ ПОДГОТВЯ</p>
          <p className={styles.noPlanSub}>Треньорът подготвя твоята тренировъчна програма. Очаквай скоро!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>ТРЕНИРОВКА</h1>
          {isCoach && (
            <button className={styles.editBtn} onClick={() => setEditing(true)} type="button">
              РЕДАКТИРАЙ
            </button>
          )}
        </div>
      </header>

      {/* Block selector */}
      <div className={styles.pillBar} role="tablist">
        {blocks.map((block, idx) => (
          <button
            key={block.id}
            className={`${styles.pill} ${selectedId === block.id && !showProgression ? styles.activePill : ''}`}
            style={selectedId === block.id && !showProgression ? { background: blockColor(idx), borderColor: blockColor(idx) } : {}}
            onClick={() => { setSelectedId(block.id); setJustMarked(false); setShowProgression(false) }}
            role="tab"
            aria-selected={selectedId === block.id && !showProgression}
            type="button"
          >
            {block.label}
          </button>
        ))}
      </div>

      {/* Progression toggle button */}
      <button
        className={`${styles.progressionBtn} ${showProgression ? styles.progressionBtnActive : ''}`}
        onClick={() => setShowProgression(p => !p)}
        type="button"
      >
        ПРОГРЕСИЯ
      </button>

      {/* Progression view */}
      {showProgression && (
        <div className={styles.progressionWrap}>
          <ProgressionView onClose={() => setShowProgression(false)} blocks={blocks} />
        </div>
      )}

      {/* Exercise list */}
      {!showProgression && selectedBlock && (
        <div className={styles.blockContent}>
          <DatePicker selectedDate={logDate} onChange={date => { setLogDate(date); setJustMarked(false) }} />

          <DayCard dayData={selectedBlock} onLogLift={setSelectedExercise} />

          <button
            className={`${styles.markDoneBtn} ${alreadyMarked || justMarked ? styles.markDoneDone : ''}`}
            onClick={handleMarkDone}
            disabled={marking || alreadyMarked}
            type="button"
          >
            {alreadyMarked || justMarked
              ? `✓ Отбелязано${logDate !== todayStr ? ` за ${new Date(logDate + 'T12:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}` : ' за днес'}!`
              : marking
              ? '...'
              : selectedBlock.isRest
              ? `✓ Маркирай почивен ден${logDate !== todayStr ? ` (${new Date(logDate + 'T12:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })})` : ''}`
              : `✓ Маркирай като готово${logDate !== todayStr ? ` (${new Date(logDate + 'T12:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })})` : ''}`}
          </button>
          {alreadyMarked && (
            <button className={styles.unmarkBtn} onClick={handleUnmarkDone} disabled={marking} type="button">
              × Премахни маркирането
            </button>
          )}
        </div>
      )}

      {/* History calendar */}
      {!showProgression && (
        <section className={styles.historySection}>
          <h2 className={styles.historyTitle}>ИСТОРИЯ</h2>
          <WorkoutCalendar completions={completions} blocks={blocks} />
        </section>
      )}

      {selectedExercise && createPortal(
        <LiftLogger
          exercise={selectedExercise}
          date={logDate}
          onClose={() => setSelectedExercise(null)}
          onSaved={handleSaved}
        />,
        document.body
      )}

      {/* Undo toast */}
      {undoEntry && (
        <div className={styles.undoToast}>
          <span className={styles.undoText}>
            {undoEntry.exerciseName} · {undoEntry.weight}kg
          </span>
          <button className={styles.undoBtn} onClick={handleUndo} type="button">
            Отмени
          </button>
        </div>
      )}
    </div>
  )
}
