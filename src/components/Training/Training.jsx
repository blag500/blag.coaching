import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { DEFAULT_TRAINING_BLOCKS } from '../../data/appData'
import DayCard from './DayCard'
import LiftLogger from './LiftLogger'
import TrainingEditor from '../Coach/TrainingEditor'
import ProgressionView from './ProgressionView'
import DatePicker from '../DatePicker/DatePicker'
import AppHeader from '../AppHeader/AppHeader'
import { useLastLifts } from '../../hooks/useLastLifts'
import MuscleStatus from './MuscleStatus'
import WorkoutCalendar from './WorkoutCalendar'
import { muscleRecovery, blockReadiness, RECOVERY_H } from '../../utils/recovery'
import styles from './Training.module.css'

// Detect old 7-day format
function isOldFormat(plan) {
  return Array.isArray(plan) && plan.length > 0 && plan[0]?.day !== undefined
}

function getBlocks(plan) {
  if (!plan || plan.length === 0 || isOldFormat(plan)) return null
  return plan
}

// Colour per block index.
//
// The old set had two entries at the same hue and two more twelve degrees
// apart — telling them apart in a 7px dot was not a matter of looking harder,
// it was impossible. These are as far apart as seven categorical colours get,
// and seven is honestly the limit of what colour alone can carry, which is why
// the legend swatches are large enough to judge rather than merely notice.
const PALETTE = ['var(--accent)', '#42A5F5', '#EF5350', '#66BB6A', '#AB47BC', '#26C6DA', '#F06292']
function blockColor(idx) { return PALETTE[idx % PALETTE.length] }

// ── Main component ───────────────────────────────────────────────────────────

export default function Training({ onMenuOpen }) {
  const { user, profile, updateProfile, removeExerciseLog } = useAuth()
  const isCoach = profile?.role === 'coach'
  const blocks  = getBlocks(profile?.training_plan)

  const [selectedId, setSelectedId]     = useState(blocks?.[0]?.id ?? '0')
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showProgression, setShowProgression] = useState(false)
  const [editing, setEditing]           = useState(false)
  const [savingPlan, setSavingPlan]     = useState(false)
  const [completions, setCompletions]   = useState([])
  const [soreness, setSoreness]         = useState(null)
  const [marking, setMarking]           = useState(false)
  const [justMarked, setJustMarked]     = useState(false)
  const [undoEntry, setUndoEntry]       = useState(null) // { id, exerciseName, weight }
  const undoTimerRef                    = useRef(null)
  const [logDate, setLogDate]           = useState(() => new Date().toISOString().slice(0, 10))
  const { byName: lifts, refresh: refreshLifts } = useLastLifts(logDate)
  // Whether the block on screen was chosen or merely offered.
  const userPicked = useRef(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('workout_completions')
      .select('block_label, completed_date')
      .eq('user_id', user.id)
      .order('completed_date', { ascending: false })
      .then(({ data }) => { if (data) setCompletions(data) })

    // Today's check-in, for the one answer that belongs in this decision.
    supabase
      .from('sleep_logs')
      .select('soreness')
      .eq('user_id', user.id)
      .eq('date', new Date().toISOString().slice(0, 10))
      .maybeSingle()
      .then(({ data }) => setSoreness(data?.soreness ?? null))
  }, [user?.id])

  // ── Which session is due ──
  // The screen used to open on whichever block happened to be first and wait to
  // be told. It knows: the one gone longest without being done is the one you
  // owe. Never-trained blocks sort to the front, so a new plan starts at its
  // beginning rather than wherever the list does.
  const lastDone = {}
  for (const c of completions) {
    if (!lastDone[c.block_label]) lastDone[c.block_label] = c.completed_date
  }
  // Rest is excluded, and it is not a detail: nobody ticks a rest day off, so
  // by any "longest since done" measure it is permanently the most overdue
  // thing in the plan — the screen would have opened on Почивка every time.
  const trainable = (blocks ?? []).filter(
    b => !b.isRest && !(b.label || '').toUpperCase().includes('ПОЧИВК')
  )

  // Which one is ready, not which one is next.
  //
  // Rotation order is a guess about how someone trains. Recovery is the thing
  // they are actually waiting on: a block is due when the muscles it hits have
  // had their hours — 48 for upper and back, 72 for legs. Ties go to whichever
  // has been left alone longer, which restores sensible rotation between two
  // equally rested blocks.
  const recovery = muscleRecovery(completions, Date.now(), soreness)
  const ranked = trainable
    .map(b => ({ block: b, ...blockReadiness(b, recovery, lastDone) }))
    .sort((a, b) =>
      b.pct - a.pct ||
      (lastDone[a.block.label] ?? '').localeCompare(lastDone[b.block.label] ?? ''))

  const dueEntry = ranked[0] ?? null
  const dueBlock = dueEntry?.block ?? null

  useEffect(() => {
    if (userPicked.current || !dueBlock) return
    setSelectedId(dueBlock.id)
  }, [dueBlock?.id])


  const selectedBlock = blocks ? (blocks.find(b => b.id === selectedId) ?? blocks[0]) : null
  // Where the block on screen stands, so the page can justify its suggestion —
  // and say so plainly when you have picked something that has not rested.
  const selRec = selectedBlock ? blockReadiness(selectedBlock, recovery, lastDone) : null
  const selHours = selRec?.group ? recovery[selRec.group]?.hours : null

  // lastDone keys off the label, and blockReadiness needs it for splits whose
  // muscle groups it cannot name.
  // Every exercise in the block logged today. Until then the finish button is
  // an outline: it is a claim about work done, and it should not look like the
  // loudest thing on a screen where the work has not been done yet.
  const allLogged = (selectedBlock?.exercises?.length ?? 0) > 0 &&
    selectedBlock.exercises.every(e => lifts[e.name]?.today)
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
    // The row shows what was just logged, so it has to hear about it.
    refreshLifts()
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoEntry(entry)
    undoTimerRef.current = setTimeout(() => setUndoEntry(null), 8000)
  }

  async function handleUndo() {
    if (!undoEntry) return
    clearTimeout(undoTimerRef.current)
    await removeExerciseLog(undoEntry.id)
    // Undo takes the entry back out, so the row must stop claiming it is done.
    refreshLifts()
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
        <AppHeader
          onMenuOpen={onMenuOpen}
          title="ТРЕНИРОВКА"
          action={
            <button className={styles.editBtn} onClick={() => setEditing(false)} type="button">
              ✕ ОТКАЗ
            </button>
          }
        />
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
        <AppHeader
          onMenuOpen={onMenuOpen}
          title="ТРЕНИРОВКА"
          action={isCoach && (
            <button className={styles.editBtn} onClick={() => setEditing(true)} type="button">
              РЕДАКТИРАЙ
            </button>
          )}
        />
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
      <AppHeader
        onMenuOpen={onMenuOpen}
        title="ТРЕНИРОВКА"
        action={isCoach ? (
          <button className={styles.editBtn} onClick={() => setEditing(true)} type="button">
            РЕДАКТИРАЙ
          </button>
        ) : showProgression ? (
          <button className={styles.editBtn} onClick={() => setShowProgression(false)} type="button">
            НАЗАД
          </button>
        ) : null}
      />

      {/* Block selector */}
      <div className={styles.pillBar} role="tablist">
        {blocks.map((block, idx) => (
          <button
            key={block.id}
            className={`${styles.pill} ${selectedId === block.id && !showProgression ? styles.activePill : ''}`}
            style={selectedId === block.id && !showProgression ? { background: blockColor(idx), borderColor: blockColor(idx) } : {}}
            onClick={() => {
              userPicked.current = true
              setSelectedId(block.id); setJustMarked(false); setShowProgression(false)
            }}
            role="tab"
            aria-selected={selectedId === block.id && !showProgression}
            type="button"
          >
            {block.label}
          </button>
        ))}
      </div>

      {/* Progression view */}
      {showProgression && (
        <div className={styles.progressionWrap}>
          <ProgressionView onClose={() => setShowProgression(false)} blocks={blocks} />
        </div>
      )}

      {/* Exercise list */}
      {!showProgression && selectedBlock && (
        <div className={styles.blockContent}>
          {/* One line of reasoning. The muscle percentages have existed on the
              Today card for a while without ever being connected to anything;
              this is the decision they were always describing. */}
          {selRec && selRec.basis !== 'never' && !selectedBlock.isRest && (
            <div className={[
              styles.recoveryNote,
              selRec.pct >= 80 ? styles.recoveryReady : styles.recoveryWait,
            ].join(' ')}>
              <span className={styles.recoveryDot} />
              {selRec.pct >= 80
                ? 'Възстановена и готова'
                : selRec.basis === 'block'
                  /* No muscle group was recognised in the label, so the claim is
                     narrowed to what is actually known: when this block itself
                     was last trained. */
                  ? `Тренира я преди ${selRec.hours} ч · ${selRec.pct}%`
                  : recovery[selRec.group]?.damped && (selHours ?? 0) >= RECOVERY_H[selRec.group]
                    /* The clock says rested, the check-in says otherwise. Saying
                       which of the two is talking matters more than the number. */
                    ? `Часовете са изкарани, но си отчел крепатура · ${selRec.pct}%`
                    : `Още ${Math.max(1, Math.round(RECOVERY_H[selRec.group] - (selHours ?? 0)))} ч до пълно възстановяване · ${selRec.pct}%`}
            </div>
          )}

          <DatePicker selectedDate={logDate} onChange={date => { setLogDate(date); setJustMarked(false) }} />

          <DayCard dayData={selectedBlock} onLogLift={setSelectedExercise} lifts={lifts} />

          <button
            className={[
              styles.markDoneBtn,
              allLogged ? styles.markDoneReady : '',
              alreadyMarked || justMarked ? styles.markDoneDone : '',
            ].join(' ')}
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

      {/* Progression — on the page, not behind the menu. Eight weeks of logging
          the same lifts and comparing the end against the start is the method
          this screen exists to serve, so it does not get to be a header link. */}
      {!showProgression && (
        <button
          className={styles.progressionEntry}
          onClick={() => setShowProgression(true)}
          type="button"
        >
          <span className={styles.progressionMain}>ПРОГРЕСИЯ</span>
          <span className={styles.progressionSub}>тежести по упражнение · сравнение по блок</span>
        </button>
      )}

      {/* History */}
      {!showProgression && (
        <section className={styles.historySection}>
          <h2 className={styles.historyTitle}>МУСКУЛНИ ГРУПИ</h2>
          <MuscleStatus completions={completions} recovery={recovery} />

          {/* Readiness says what to do next; the calendar says what was done.
              The page owes both — they are two features, not two attempts at
              one, and every previous version failed by making one replace the
              other. */}
          <h2 className={`${styles.historyTitle} ${styles.historyTitleSecond}`}>ДНЕВНИК</h2>
          <WorkoutCalendar completions={completions} />
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
