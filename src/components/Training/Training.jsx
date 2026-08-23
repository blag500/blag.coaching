import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { DEFAULT_TRAINING_BLOCKS } from '../../data/appData'
import DayLog from './DayLog'
import TrainingEditor from '../Coach/TrainingEditor'
import ProgressionView from './ProgressionView'
import DatePicker from '../DatePicker/DatePicker'
import AppHeader from '../AppHeader/AppHeader'
import { useLastLifts } from '../../hooks/useLastLifts'
import { useTrainingHistory } from '../../hooks/useTrainingHistory'
import MuscleStatus from './MuscleStatus'
import MuscleMap from './MuscleMap'
import WeeklyReport from './WeeklyReport'
import MonthCalendar from './MonthCalendar'
import TrainingDashboard from './TrainingDashboard'
import SessionHistory from './SessionHistory'
import ExerciseStats from './ExerciseStats'
import { muscleRecovery, blockReadiness, RECOVERY_H, resolveGroups } from '../../utils/recovery'
import { trainingStats, agoLabel, bigNum, iso, dayDate, MONTHS_SHORT } from '../../utils/training'
import styles from './Training.module.css'

// The same dumbbell the bottom nav draws, so the empty state speaks the app's
// own line-icon language rather than dropping a colour emoji into it.
const DumbbellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="5" y1="9"  x2="5"  y2="15" />
    <line x1="19" y1="9" x2="19" y2="15" />
    <line x1="3" y1="10" x2="3"  y2="14" />
    <line x1="21" y1="10" x2="21" y2="14" />
    <line x1="3" y1="12" x2="5"  y2="12" />
    <line x1="19" y1="12" x2="21" y2="12" />
  </svg>
)

// Detect old 7-day format
function isOldFormat(plan) {
  return Array.isArray(plan) && plan.length > 0 && plan[0]?.day !== undefined
}

function getBlocks(plan) {
  if (!plan || plan.length === 0 || isOldFormat(plan)) return null
  return plan
}

const isRestBlock = b => !!b && (b.isRest || (b.label || '').toUpperCase().includes('ПОЧИВК'))

/**
 * The training tab.
 *
 * It used to be one long screen that did three unrelated jobs at once — decide
 * what to train, log it set by set, and account for what had been logged — with
 * the third of those reduced to a month of coloured dots because there was no
 * room left. Splitting them is not a layout preference: logging happens with
 * one hand between sets, and reviewing happens on the sofa afterwards, and a
 * screen that serves both at the same time serves neither.
 *
 * So: the page is the account (`home`), logging is a screen you enter and leave
 * (`session`), and the record is a screen of its own (`history`) that opens
 * into a single lift's whole history (`exercise`).
 */
export default function Training({ onMenuOpen }) {
  const { user, profile, updateProfile } = useAuth()
  const isCoach = profile?.role === 'coach'
  // A coached client's plan is written by the coach and waited on; a self-serve
  // client has no one preparing anything, so they set and edit their own.
  const coached = profile?.plan === 'pro' || profile?.plan === 'coaching'
  const selfManaged = !isCoach && !coached
  const canEdit = isCoach || selfManaged
  const blocks  = getBlocks(profile?.training_plan)

  const [view, setView]                 = useState('home')
  const [homeTab, setHomeTab]           = useState('today')
  const [exercise, setExercise]         = useState(null)
  const [selectedId, setSelectedId]     = useState(blocks?.[0]?.id ?? '0')
  const [editing, setEditing]           = useState(false)
  const [savingPlan, setSavingPlan]     = useState(false)
  const [soreness, setSoreness]         = useState(null)
  const [marking, setMarking]           = useState(false)
  const [justMarked, setJustMarked]     = useState(false)
  const [logDate, setLogDate]           = useState(() => iso(new Date()))
  const { byName: lifts, refresh: refreshLifts } = useLastLifts(logDate)
  const { sessions, completions, refresh: refreshHistory } = useTrainingHistory()
  // Whether the block on screen was chosen or merely offered.
  const userPicked = useRef(false)

  useEffect(() => {
    if (!user) return
    // Today's check-in, for the one answer that belongs in this decision.
    supabase
      .from('sleep_logs')
      .select('soreness')
      .eq('user_id', user.id)
      .eq('date', iso(new Date()))
      .maybeSingle()
      .then(({ data }) => setSoreness(data?.soreness ?? null))
  }, [user?.id])

  // A saved set changes both the logger's ghosts and every number on the
  // dashboard, so one write refreshes both rather than leaving them to drift.
  function handleLogged() {
    refreshLifts()
    refreshHistory()
  }

  // Scrolling is per-screen: arriving at the history from halfway down the
  // dashboard should not arrive halfway down the history.
  useEffect(() => { window.scrollTo({ top: 0 }) }, [view, exercise])

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
  const trainable = (blocks ?? []).filter(b => !isRestBlock(b))

  // Which one is ready, not which one is next.
  //
  // Rotation order is a guess about how someone trains. Recovery is the thing
  // they are actually waiting on: a block is due when the muscles it hits have
  // had their hours — 48 for upper and back, 72 for legs. Ties go to whichever
  // has been left alone longer, which restores sensible rotation between two
  // equally rested blocks.
  // Label → groups. Explicit group ticks in the editor beat the label-based
  // classifier, so a "Ден 1" block still lights up the mannequin.
  const groupsByLabel = useMemo(() => {
    const out = {}
    for (const b of blocks ?? []) out[b.label] = resolveGroups(b)
    return out
  }, [blocks])

  // Sessions logged today count as training even without the "Готово" tick —
  // the mannequin was pretending a session did not happen until a completion
  // row appeared, and that is not the promise the app makes. Any exercise
  // logged that also lives in a block adds that block as an implicit
  // completion, so recovery, "last trained" and every other read of the day
  // are honest without needing the extra tap.
  const enrichedCompletions = useMemo(() => {
    if (!blocks?.length) return completions
    const known = new Set(completions.map(c => `${c.completed_date}|${c.block_label}`))
    const extra = []
    for (const s of sessions) {
      if (!s.setCount) continue
      const seenLabelsToday = new Set(s.labels || [])
      for (const b of blocks) {
        if (seenLabelsToday.has(b.label)) continue
        const touches = b.exercises?.some(e => s.exercises?.has?.(e.name))
        if (!touches) continue
        const key = `${s.date}|${b.label}`
        if (known.has(key)) continue
        extra.push({ completed_date: s.date, block_label: b.label })
        known.add(key)
      }
    }
    return extra.length ? [...completions, ...extra] : completions
  }, [sessions, completions, blocks])

  const recovery = muscleRecovery(enrichedCompletions, Date.now(), soreness, groupsByLabel)
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

  // The weekly goal is what the client already said at intake. Falling back to
  // the number of trainable blocks means a four-day split asks for four days,
  // which is the only honest guess when nobody has said.
  const goal = profile?.intake_training_days || Math.max(trainable.length, 1) || 3
  const stats = useMemo(() => trainingStats(sessions, goal), [sessions, goal])

  // The last time the block you are about to train was actually trained.
  const toBeat = useMemo(
    () => (dueBlock ? sessions.find(s => s.labels.includes(dueBlock.label) && s.setCount > 0) ?? null : null),
    [sessions, dueBlock?.label],
  )

  const todayStr = iso(new Date())
  const allLogged = (selectedBlock?.exercises?.length ?? 0) > 0 &&
    selectedBlock.exercises.every(e => lifts[e.name]?.today)
  const alreadyMarked = completions.some(
    c => c.completed_date === logDate && c.block_label === selectedBlock?.label
  )

  async function handleSavePlan(newBlocks) {
    setSavingPlan(true)
    await updateProfile({ training_plan: newBlocks })
    setSavingPlan(false)
    setEditing(false)
  }

  // The one-tap way in: a ready 4-day upper/lower split the client can log from
  // today and reshape whenever. Deep-copied so the shared default is never
  // mutated by later edits.
  async function applyStarter() {
    setSavingPlan(true)
    await updateProfile({
      training_plan: DEFAULT_TRAINING_BLOCKS.map(b => ({
        ...b,
        exercises: b.exercises.map(e => ({ ...e })),
      })),
    })
    setSavingPlan(false)
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
      setJustMarked(true)
      refreshHistory()
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
      setJustMarked(false)
      refreshHistory()
    }
    setMarking(false)
  }

  /** Enter the logger on a given day, with the block that day belongs to. */
  function openSession(date = todayStr, label = null) {
    const block = label ? blocks?.find(b => b.label === label) : dueBlock

    if (block) { userPicked.current = true; setSelectedId(block.id) }
    setLogDate(date)
    setJustMarked(false)
    setView('session')
  }

  // ── Editor ──

  if (editing && canEdit) {
    return (
      <div className={styles.page}>
        <AppHeader
          onBack={() => setEditing(false)}
          title="ТРЕНИРОВКА"
        />
        <TrainingEditor
          initialPlan={isOldFormat(profile?.training_plan) ? null : profile?.training_plan}
          onSave={handleSavePlan}
          saving={savingPlan}
        />
      </div>
    )
  }

  // ── No plan yet ──

  if (!blocks) {
    return (
      <div className={styles.page}>
        <AppHeader onMenuOpen={onMenuOpen} title="ТРЕНИРОВКА" />
        {selfManaged ? (
          // No coach is coming — so the empty state is a setup, not a wait. One
          // tap to a ready split, or the editor to build from scratch.
          <div className={styles.noPlanWrap}>
            <span className={styles.noPlanIcon}><DumbbellIcon /></span>
            <p className={styles.noPlanTitle}>ЗАДАЙ ТРЕНИРОВКА</p>
            <p className={styles.noPlanSub}>
              Тръгни с готова програма или си направи своя. Ще можеш да я
              променяш по всяко време.
            </p>
            <div className={styles.setupActions}>
              <button
                className={styles.setupPrimary}
                onClick={applyStarter}
                disabled={savingPlan}
                type="button"
              >
                {savingPlan ? '...' : 'Започни с готова програма'}
              </button>
              <span className={styles.setupHint}>Upper / Lower · 4 дни</span>
              <button
                className={styles.setupSecondary}
                onClick={() => setEditing(true)}
                disabled={savingPlan}
                type="button"
              >
                Създай своя от нулата
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.noPlanWrap}>
            <span className={styles.noPlanIcon}><DumbbellIcon /></span>
            <p className={styles.noPlanTitle}>ПРОГРАМАТА СЕ ПОДГОТВЯ</p>
            <p className={styles.noPlanSub}>Треньорът подготвя твоята тренировъчна програма. Очаквай скоро!</p>
          </div>
        )}
      </div>
    )
  }

  // ── One lift's history ──

  if (view === 'exercise' && exercise) {
    return (
      <div className={styles.page}>
        <AppHeader
          onBack={() => { setExercise(null); setView('history') }}
          title="ПРОГРЕС"
        />
        <ExerciseStats
          name={exercise}
          sessions={sessions}
          onBack={() => { setExercise(null); setView('history') }}
        />
      </div>
    )
  }

  // ── The record ──

  if (view === 'history') {
    return (
      <div className={styles.page}>
        <AppHeader
          onBack={() => setView('home')}
          title="ДНЕВНИК"
        />
        <SessionHistory
          sessions={sessions}
          onOpenExercise={name => { setExercise(name); setView('exercise') }}
          onEditDay={date => {
            const s = sessions.find(x => x.date === date)
            // A day that was logged but never ticked has no block label, so the
            // block is recovered from the exercises themselves — otherwise the
            // logger would open on whatever is due today and show none of them.
            const label = s?.labels[0]
              ?? blocks.find(b => b.exercises?.some(e => s?.exercises?.has(e.name)))?.label
              ?? null
            openSession(date, label)
          }}
        />
      </div>
    )
  }

  // ── Progression (blocks compared, sets edited) ──

  if (view === 'progression') {
    return (
      <div className={styles.page}>
        <AppHeader
          onBack={() => setView('home')}
          title="ПРОГРЕСИЯ"
        />
        <ProgressionView onClose={() => setView('home')} blocks={blocks} />
      </div>
    )
  }

  // ── Logging ──

  if (view === 'session') {
    const rest = isRestBlock(selectedBlock)
    return (
      <div className={styles.page}>
        <AppHeader
          onBack={() => setView('home')}
          title="ЛОГ"
          action={
            <button className={styles.editBtn} onClick={() => setView('home')} type="button">
              ГОТОВО
            </button>
          }
        />

        {/* Block selector */}
        <div className={styles.pillBar} role="tablist">
          {blocks.map(block => (
            <button
              key={block.id}
              className={`${styles.pill} ${selectedId === block.id ? styles.activePill : ''}`}
              onClick={() => {
                userPicked.current = true
                setSelectedId(block.id)
                setJustMarked(false)
              }}
              role="tab"
              aria-selected={selectedId === block.id}
              type="button"
            >
              {block.label}
            </button>
          ))}
        </div>

        <div className={styles.blockContent}>
          {/* One line of reasoning. The muscle percentages have existed on the
              Today card for a while without ever being connected to anything;
              this is the decision they were always describing. */}
          {selRec && selRec.basis !== 'never' && !rest && (
            <div className={[
              styles.recoveryNote,
              selRec.pct >= 80 ? styles.recoveryReady : styles.recoveryWait,
            ].join(' ')}>
              <span className={styles.recoveryDot} />
              {selRec.pct >= 80
                ? 'По часовник — готова'
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

          {rest ? (
            <div className={styles.restCard}>
              <span className={styles.restIcon}>🛌</span>
              <p className={styles.restTitle}>Почивка</p>
              <p className={styles.restSub}>Сън · Хидратация · Мобилити</p>
            </div>
          ) : (
            <DayLog
              date={logDate}
              blockLabels={[selectedBlock.label]}
              blocks={blocks}
              onLogged={handleLogged}
            />
          )}

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
              : rest
              ? `✓ Маркирай почивен ден${logDate !== todayStr ? ` (${new Date(logDate + 'T12:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })})` : ''}`
              : `✓ Маркирай като готово${logDate !== todayStr ? ` (${new Date(logDate + 'T12:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })})` : ''}`}
          </button>
          {alreadyMarked && (
            <button className={styles.unmarkBtn} onClick={handleUnmarkDone} disabled={marking} type="button">
              × Премахни маркирането
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Home: the account ──

  const last = sessions[0] ?? null

  return (
    <div className={styles.page}>
      <AppHeader
        onMenuOpen={onMenuOpen}
        title="ТРЕНИРОВКА"
        action={canEdit ? (
          <button className={styles.editBtn} onClick={() => setEditing(true)} type="button">
            ПРОГРАМА
          </button>
        ) : null}
      />

      {/* Sub-tabs — pictogram-only segmented control. The three views are what
          they picture: a target for today's decision, a bar chart for the
          week, a body for the body. Labels are still on aria-label for
          screen readers and long-press tooltips. */}
      <div className={styles.segmented} role="tablist">
        {[
          {
            id: 'today', label: 'Днес',
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
              </svg>
            ),
          },
          {
            id: 'week', label: 'Седмица',
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5"  y1="20" x2="5"  y2="14" />
                <line x1="10" y1="20" x2="10" y2="9" />
                <line x1="15" y1="20" x2="15" y2="12" />
                <line x1="20" y1="20" x2="20" y2="6" />
              </svg>
            ),
          },
          {
            id: 'body', label: 'Тяло',
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="4.5" r="2.2" />
                <path d="M8 10 Q12 8 16 10 L15 15 L13 15 L13 21 L11 21 L11 15 L9 15 Z" />
              </svg>
            ),
          },
        ].map(t => (
          <button
            key={t.id}
            className={`${styles.segment} ${homeTab === t.id ? styles.segmentActive : ''}`}
            onClick={() => setHomeTab(t.id)}
            role="tab"
            aria-selected={homeTab === t.id}
            aria-label={t.label}
            title={t.label}
            type="button"
          >
            {t.icon}
          </button>
        ))}
      </div>

      {homeTab === 'today' && (
        <>
          {/* Which block to log. The due one is preselected — most days that's
              the answer — but any block on the plan is one tap away, so a
              "не днес този" is not a fight with the app. */}
          <div className={styles.pillBar} role="tablist">
            {blocks.map(block => (
              <button
                key={block.id}
                className={`${styles.pill} ${selectedId === block.id ? styles.activePill : ''}`}
                onClick={() => {
                  userPicked.current = true
                  setSelectedId(block.id)
                  setLogDate(todayStr)
                  setJustMarked(false)
                }}
                role="tab"
                aria-selected={selectedId === block.id}
                type="button"
              >
                {block.label}
              </button>
            ))}
          </div>

          <section className={styles.today}>
            <span className={styles.todayEyebrow}>
              {last ? `Последна тренировка ${agoLabel(last.date)}` : 'Още нищо не е логнато'}
            </span>
            <h2 className={styles.todayTitle}>{selectedBlock?.label ?? 'Почивка'}</h2>

            {selRec && selRec.basis !== 'never' && (
              <span className={[
                styles.todayState,
                selRec.pct >= 80 ? styles.todayReady : styles.todayWait,
              ].join(' ')}>
                <span className={styles.recoveryDot} />
                {selRec.pct >= 80
                  ? 'По часовник — готова'
                  : `≈ ${selRec.pct}% възстановена`}
              </span>
            )}
          </section>

          {selectedBlock && !isRestBlock(selectedBlock) && (
            <>
              <DayLog
                date={todayStr}
                blockLabels={[selectedBlock.label]}
                blocks={blocks}
                onLogged={handleLogged}
              />

              <button
                className={[
                  styles.markDoneBtn,
                  (selectedBlock.exercises?.length ?? 0) > 0 &&
                    selectedBlock.exercises.every(e => lifts[e.name]?.today)
                    ? styles.markDoneReady : '',
                  completions.some(c => c.completed_date === todayStr && c.block_label === selectedBlock.label) || justMarked
                    ? styles.markDoneDone : '',
                ].join(' ')}
                onClick={() => {
                  setLogDate(todayStr)
                  handleMarkDone()
                }}
                disabled={
                  marking ||
                  completions.some(c => c.completed_date === todayStr && c.block_label === selectedBlock.label)
                }
                type="button"
              >
                {completions.some(c => c.completed_date === todayStr && c.block_label === selectedBlock.label) || justMarked
                  ? '✓ Отбелязано за днес!'
                  : marking ? '...' : '✓ Маркирай като готово'}
              </button>
            </>
          )}

          {selectedBlock && isRestBlock(selectedBlock) && (
            <div className={styles.restCard}>
              <span className={styles.restIcon}>🛌</span>
              <p className={styles.restTitle}>Почивка</p>
              <p className={styles.restSub}>Сън · Хидратация · Мобилити</p>
            </div>
          )}

          {/* The last few sessions live with today, because "what did I do
              yesterday" is a today question, not a weekly report. */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ДНЕВНИК</h2>
              <button type="button" className={styles.seeAll} onClick={() => setView('history')}>
                всички {sessions.length} ›
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className={styles.sectionEmpty}>Първата логната серия отваря дневника.</p>
            ) : (
              <ul className={styles.recent}>
                {sessions.slice(0, 3).map(s => (
                  <li key={s.date}>
                    <button type="button" className={styles.recentRow} onClick={() => setView('history')}>
                      <span className={styles.recentDate}>
                        {dayDate(s.date).getDate()} {MONTHS_SHORT[dayDate(s.date).getMonth()].toLowerCase()}
                      </span>
                      <span className={styles.recentName}>{s.title}</span>
                      <span className={styles.recentMeta}>
                        {s.volume > 0 ? `${bigNum(s.volume)} кг` : `${s.setCount} серии`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <button type="button" className={styles.progressionEntry} onClick={() => setView('progression')}>
            <span className={styles.progressionMain}>ПРОГРЕСИЯ</span>
            <span className={styles.progressionSub}>тежести по упражнение · сравнение по блок</span>
          </button>
        </>
      )}

      {homeTab === 'week' && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>СЕДМИЧЕН ДОКЛАД</h2>
          <WeeklyReport sessions={sessions} goal={goal} />
          <MonthCalendar completions={completions} blocks={blocks ?? []} />
          <TrainingDashboard
            sessions={sessions}
            stats={stats}
            toBeat={toBeat}
            onOpenSession={() => openSession()}
          />
        </section>
      )}

      {homeTab === 'body' && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>МУСКУЛНИ ГРУПИ</h2>
          <MuscleMap recovery={recovery} sessions={sessions} completions={enrichedCompletions} groupsByLabel={groupsByLabel} />
          <MuscleStatus completions={completions} recovery={recovery} />
        </section>
      )}
    </div>
  )
}
