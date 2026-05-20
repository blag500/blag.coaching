import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { DEFAULT_TRAINING_BLOCKS } from '../../data/appData'
import DayCard from './DayCard'
import LiftLogger from './LiftLogger'
import TrainingEditor from '../Coach/TrainingEditor'
import ProgressionView from './ProgressionView'
import styles from './Training.module.css'

// Detect old 7-day format
function isOldFormat(plan) {
  return Array.isArray(plan) && plan.length > 0 && plan[0]?.day !== undefined
}

function getBlocks(plan) {
  if (!plan || plan.length === 0 || isOldFormat(plan)) return DEFAULT_TRAINING_BLOCKS
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

function buildCalendar(year, month, completionMap, blocks) {
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const rawFirstDay  = new Date(year, month, 1).getDay()
  const firstDow     = (rawFirstDay + 6) % 7 // Monday = 0

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
      m[c.completed_date].push(c.block_label)
    }
    return m
  }, [completions])

  const cells = buildCalendar(year, month, completionMap, blocks)

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Build block → color map by label
  const colorMap = {}
  blocks.forEach((b, i) => { colorMap[b.label] = blockColor(i) })

  return (
    <div className={styles.calendar}>
      <div className={styles.calHeader}>
        <button className={styles.calNav} onClick={prev} type="button">‹</button>
        <span className={styles.calTitle}>{MONTHS_BG[month]} {year}</span>
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
              <div key={cell.dateStr} className={`${styles.calDay} ${cell.dateStr === todayStr ? styles.calToday : ''}`}>
                <span className={styles.calNum}>{cell.day}</span>
                <div className={styles.calDots}>
                  {cell.labels.slice(0, 3).map((label, li) => (
                    <span
                      key={li}
                      className={styles.calDot}
                      style={{ background: colorMap[label] || '#8888AA' }}
                      title={label}
                    />
                  ))}
                </div>
              </div>
            )
        )}
      </div>

      <div className={styles.calLegend}>
        {blocks.map((b, i) => (
          <span key={b.id} className={styles.calLegendItem}>
            <span className={styles.calDot} style={{ background: blockColor(i) }} />
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

  const [selectedId, setSelectedId]     = useState(blocks[0]?.id ?? '0')
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showProgression, setShowProgression] = useState(false)
  const [editing, setEditing]           = useState(false)
  const [savingPlan, setSavingPlan]     = useState(false)
  const [completions, setCompletions]   = useState([])
  const [marking, setMarking]           = useState(false)
  const [justMarked, setJustMarked]     = useState(false)
  const [undoEntry, setUndoEntry]       = useState(null) // { id, exerciseName, weight }
  const undoTimerRef                    = useRef(null)

  useEffect(() => {
    if (!user || isCoach) return
    supabase
      .from('workout_completions')
      .select('block_label, completed_date')
      .eq('user_id', user.id)
      .order('completed_date', { ascending: false })
      .then(({ data }) => { if (data) setCompletions(data) })
  }, [user?.id, isCoach])

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? blocks[0]
  const todayStr = new Date().toISOString().slice(0, 10)
  const alreadyMarkedToday = completions.some(
    c => c.completed_date === todayStr && c.block_label === selectedBlock?.label
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
    if (!user || marking || alreadyMarkedToday) return
    setMarking(true)
    const { error } = await supabase
      .from('workout_completions')
      .upsert(
        { user_id: user.id, block_label: selectedBlock.label, completed_date: todayStr },
        { onConflict: 'user_id,block_label,completed_date', ignoreDuplicates: true }
      )
    if (!error) {
      setCompletions(prev => [
        { block_label: selectedBlock.label, completed_date: todayStr },
        ...prev,
      ])
      setJustMarked(true)
      setTimeout(() => setJustMarked(false), 2500)
    }
    setMarking(false)
  }

  if (editing && isCoach) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>ТРЕНИНГ</h1>
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>ТРЕНИНГ</h1>
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
      {!isCoach && (
        <button
          className={`${styles.progressionBtn} ${showProgression ? styles.progressionBtnActive : ''}`}
          onClick={() => setShowProgression(p => !p)}
          type="button"
        >
          📊 Прогресия
        </button>
      )}

      {/* Progression view */}
      {showProgression && !isCoach && (
        <div className={styles.progressionWrap}>
          <ProgressionView onClose={() => setShowProgression(false)} blocks={blocks} />
        </div>
      )}

      {/* Exercise list */}
      {!showProgression && selectedBlock && (
        <div className={styles.blockContent}>
          <DayCard dayData={selectedBlock} onLogLift={setSelectedExercise} />

          {!isCoach && !selectedBlock.isRest && (
            <button
              className={`${styles.markDoneBtn} ${alreadyMarkedToday || justMarked ? styles.markDoneDone : ''}`}
              onClick={handleMarkDone}
              disabled={marking || alreadyMarkedToday}
              type="button"
            >
              {alreadyMarkedToday || justMarked ? '✓ Отбелязано за днес!' : marking ? '...' : '✓ Маркирай като готово'}
            </button>
          )}
        </div>
      )}

      {/* History calendar */}
      {!isCoach && !showProgression && (
        <section className={styles.historySection}>
          <h2 className={styles.historyTitle}>ИСТОРИЯ</h2>
          <WorkoutCalendar completions={completions} blocks={blocks} />
        </section>
      )}

      {selectedExercise && createPortal(
        <LiftLogger
          exercise={selectedExercise}
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
