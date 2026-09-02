import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { defaultTrainingBlocks } from '../../data/appData'
import DayLog from './DayLog'
import ProgressionView from './ProgressionView'
import DatePicker from '../DatePicker/DatePicker'
import AppHeader from '../AppHeader/AppHeader'
import Pictogram from '../Pictogram/Pictogram'
import { useLastLifts } from '../../hooks/useLastLifts'
import { useExerciseMap } from '../../hooks/useExerciseMap'
import { useTrainingHistory } from '../../hooks/useTrainingHistory'
import MuscleStatus from './MuscleStatus'
import WeeklyReport from './WeeklyReport'
import MonthCalendar from './MonthCalendar'
import TrainingDashboard from './TrainingDashboard'
import SessionHistory from './SessionHistory'
import ExerciseStats from './ExerciseStats'
import { muscleRecovery, blockReadiness, groupLastTouch, resolveGroups, GROUP_COLORS, GROUP_LABEL_KEYS } from '../../utils/recovery'
import { trainingStats, agoLabel, bigNum, iso, dayDate, monthsShort, sessionTitle } from '../../utils/training'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './Training.module.css'

/* Двете най-тежки поддървета на страницата, отложени.
   Картата на мускулите носи body-muscles (около 400 KB анатомия) и се рисува
   само в раздел ТЯЛО; редакторът на плана е на треньора и се отваря нарочно.
   И двете стояха в първия файл, който всеки клиент тегли, преди да види
   каквото и да е. */
const MuscleMap     = lazy(() => import('./MuscleMap'))
const TrainingEditor = lazy(() => import('../Coach/TrainingEditor'))
import { loc } from '../../utils/locale'

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


/**
 * Денят за почивка и кардио.
 *
 * Един компонент, защото същата карта се рисува на две места — в списъка с
 * блокове и в екрана за сесия — а две копия на едно нещо се разминават още
 * при първата поправка. Разминали се бяха: емоджито легло беше сменено с
 * рисунка на едното място и остана на другото.
 *
 * Блокът се казва „Почивка / Кардио" и носи кардио и подвижност, мерени в
 * минути. Затова няма дневник със серии — има какво е за деня и бутон, който
 * казва, че е направено.
 */
function RestDayCard({ block, done, marking, onMark, onUnmark, markLabel, doneLabel, unmarkLabel }) {
  const plan = block.exercises ?? []
  return (
    <div className={styles.restCard}>
      <span className={styles.restIcon}>
        <Pictogram name="cardio" size={36} />
      </span>
      <p className={styles.restTitle}>{block.label}</p>

      {plan.length > 0 && (
        <ul className={styles.restPlan}>
          {plan.map(e => (
            <li key={e.id ?? e.name} className={styles.restPlanRow}>
              <span className={styles.restPlanName}>{e.name}</span>
              <span className={styles.restPlanDose}>{e.reps}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className={[
          styles.markDoneBtn,
          styles.restMark,
          done ? styles.markDoneDone : styles.markDoneReady,
        ].join(' ')}
        onClick={onMark}
        disabled={marking || done}
      >
        <MarkGlyph done={done} />
        <span>{done ? doneLabel : marking ? '...' : markLabel}</span>
      </button>

      {done && (
        <button type="button" className={`${styles.unmarkBtn} ${styles.restMark}`} onClick={onUnmark} disabled={marking}>
          {unmarkLabel}
        </button>
      )}
    </div>
  )
}

const isRestBlock = b => !!b && (b.isRest || /ПОЧИВК|\bREST\b/.test((b.label || '').toUpperCase()))

/** One pictogram per broad group + a rest icon, drawn as inline SVGs so they
 *  tint with the row's accent colour (currentColor) and never cost a network
 *  fetch. */
const BLOCK_ICONS = {
  // Dumbbell — chest / shoulders / triceps push work.
  upper: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2"  y="9"  width="3"  height="6" rx="1" />
      <rect x="5"  y="10" width="2"  height="4" rx="0.5" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <rect x="17" y="10" width="2"  height="4" rx="0.5" />
      <rect x="19" y="9"  width="3"  height="6" rx="1" />
    </svg>
  ),
  // Pull-down — back / biceps.
  pull: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="4"  x2="20" y2="4" />
      <line x1="7" y1="4"  x2="7"  y2="10" />
      <line x1="17" y1="4" x2="17" y2="10" />
      <path d="M7 10 L12 14 L17 10" />
      <line x1="12" y1="14" x2="12" y2="20" />
    </svg>
  ),
  // Squat figure — legs / glutes.
  lower: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="4.5" r="1.6" />
      <line x1="12" y1="6.5" x2="12" y2="11" />
      <path d="M12 11 L8 15 L8 20" />
      <path d="M12 11 L16 15 L16 20" />
      <line x1="6" y1="9" x2="18" y2="9" />
    </svg>
  ),
  // Lightning — accessory / extra.
  extra: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 L5 14 h6 l-1 8 8-12 h-6 l1-8 z" />
    </svg>
  ),
  // Moon — rest.
  rest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 15A8 8 0 1 1 9 4a7 7 0 0 0 11 11z" />
    </svg>
  ),
}

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
/**
 * Знакът в бутона за отбелязване.
 *
 * Кръгче, докато денят не е затворен, и отметка, която се изчертава в мига,
 * в който се затвори. Отметката беше буква в самия надпис — „✓ Маркирай като
 * готово" — тоест стоеше там и преди да има какво да отмята, и не можеше да
 * направи нищо в момента, който има значение. Знакът, който се рисува, е
 * единственото място в целия ход, където приложението казва „добре, свърши
 * го", и си струва да се види.
 */
function MarkGlyph({ done }) {
  return (
    <svg className={styles.markGlyph} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" className={styles.markRing} />
      {done && <path d="M7 12.4 L10.6 16 L17 8.6" className={styles.markTick} />}
    </svg>
  )
}

export default function Training({ onMenuOpen }) {
  const { t, lang } = useSettings()
  const MS = monthsShort(t)
  // Дата в кратък вид за бутоните „маркирай ..." — езикът следва избора.
  const shortDate = d => new Date(d + 'T12:00:00')
    .toLocaleDateString(loc(), { day: 'numeric', month: 'short' })
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
  // When null, "днес" shows the split picker. Set to a block id and the tab
  // enters that block's session view — a single question at a time, from the
  // moment you tap into it to the moment the log is done.
  const [sessionBlockId, setSessionBlockId] = useState(null)
  // Progression tab inner state, lifted so the AppHeader burger can act as a
  // back arrow when the user is inside a block or exercise.
  const [progBlock, setProgBlock] = useState(null)
  const [progEx,    setProgEx]    = useState(null)
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

  /* Започнатата тренировка се помни до края на деня.
     Един вдигнат сет казва повече от всяко натискане: този блок е този, който
     човекът прави в момента. Дотук приложението не го знаеше — излизаш до
     храненето между два сета, връщаш се, и пак си пред списъка, пак трябва да
     намериш своя блок сред седем. Тренировка се прекъсва по десет пъти;
     мястото, на което си, не бива да се губи при всяко от тях.
     До деня, не завинаги: утре е друга тренировка. */
  const startedKey = `blag_training_started_${iso(new Date())}`
  // Кой блок е в ход, за да личи и в списъка, не само в отварянето.
  const [startedId, setStartedId] = useState(() => {
    try { return localStorage.getItem(`blag_training_started_${iso(new Date())}`) }
    catch { return null }
  })
  /* Същото, но за еднократното отваряне. Отделно от състоянието, защото се
     изхабява: екранът отваря на започнатия блок веднъж, при влизане — после
     човекът си избира сам и не бива да го връщаме обратно. */
  const startedRef = useRef(startedId)

  function rememberStarted(id) {
    setStartedId(id ? String(id) : null)
    try {
      if (id) localStorage.setItem(startedKey, String(id))
      else localStorage.removeItem(startedKey)
    } catch { /* quota — помненето е удобство, не запис */ }
  }

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
    // Само за днес: редактиране на минал ден не значи, че си в него сега.
    if (logDate === todayStr && selectedBlock) rememberStarted(selectedBlock.id)
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
  // Per-exercise group tags typed at the swap pencil — one place the app
  // trusts what the user said the movement belongs to over what the string
  // looks like.
  const exerciseMap = useExerciseMap().map

  // Label → groups. Explicit group ticks in the editor beat the label-based
  // classifier, so a "Ден 1" block still lights up the mannequin.
  const groupsByLabel = useMemo(() => {
    const out = {}
    for (const b of blocks ?? []) out[b.label] = resolveGroups(b, exerciseMap)
    return out
  }, [blocks, exerciseMap])

  // Sessions logged today count as training even without the "Готово" tick.
  // A logged day adds AT MOST one implicit completion — the block whose
  // exercise list best overlaps what was actually done. Adding every block
  // that shares any exercise (Bench Press lives in Upper A and Upper B)
  // used to plant two completions from one session, doubling the recovery
  // signal for shared groups.
  const enrichedCompletions = useMemo(() => {
    if (!blocks?.length) return completions
    const known = new Set(completions.map(c => `${c.completed_date}|${c.block_label}`))
    const extra = []
    for (const s of sessions) {
      if (!s.setCount) continue
      const seenLabelsToday = new Set(s.labels || [])
      let best = null
      let bestScore = 0
      let bestNeed = 0
      for (const b of blocks) {
        if (seenLabelsToday.has(b.label)) continue
        if (!b.exercises?.length) continue
        let score = 0
        for (const e of b.exercises) if (s.exercises?.has?.(e.name)) score += 1
        if (score > bestScore) { bestScore = score; best = b; bestNeed = b.exercises.length }
      }
      // Two overlapping lifts, or at least half the block — one stray exercise
      // from a bigger block is exploration, not a completed session, and the
      // old "any overlap counts" turned every Machine flys log into an implicit
      // Upper A and dragged that group's recovery clock forward by a day.
      const enough = best && (bestScore >= 2 || bestScore * 2 >= bestNeed)
      if (enough) {
        const key = `${s.date}|${best.label}`
        if (!known.has(key)) {
          extra.push({ completed_date: s.date, block_label: best.label })
          known.add(key)
        }
      }
    }
    return extra.length ? [...completions, ...extra] : completions
  }, [sessions, completions, blocks])

  const recovery = muscleRecovery(enrichedCompletions, Date.now(), soreness, groupsByLabel)
  /* Rotation първо, recovery само на равенство. Старият сорт (pct DESC) даваше
     „най-възстановения" блок за next, но това се чупи от споделени групи —
     ако едно упражнение вчера е пипнало extra, всеки блок който също съдържа
     extra изглежда 37% възстановен, а всъщност самият той не е тренуван от
     дни. Клиентите очакват split-ът да ротира: „блокът който отдавна не съм
     правил е следващият", което е това което дясната колона показва. */
  const ranked = trainable
    .map(b => ({ block: b, ...blockReadiness(b, recovery, lastDone), _last: lastDone[b.label] }))
    .sort((a, b) => {
      // Никога-невъзстановен блок е „най-стар" → печели.
      if (!a._last && b._last) return -1
      if (!b._last && a._last) return 1
      if (!a._last && !b._last) return 0
      // По-стар lastDone (по-отдавна тренуван) → по-приоритетен.
      const cmp = a._last.localeCompare(b._last)
      if (cmp !== 0) return cmp
      // Равенство по дата → по-възстановения печели.
      return b.pct - a.pct
    })

  const dueEntry = ranked[0] ?? null
  const dueBlock = dueEntry?.block ?? null

  /* Започнатото бие предложеното. Планът предлага кой блок е ред — но щом
     днес вече е вдиган сет някъде, там е човекът, и екранът отваря там.
     Веднъж, при първото идване на плана: после изборът е на човека. */
  const blockIds = (blocks ?? []).map(b => b.id).join(',')
  useEffect(() => {
    const id = startedRef.current
    if (!id || !blocks) return
    startedRef.current = null
    const b = blocks.find(x => String(x.id) === String(id))
    if (!b) { rememberStarted(null); return }
    userPicked.current = true
    setSelectedId(b.id)
    setSessionBlockId(b.id)
  }, [blockIds])

  useEffect(() => {
    if (userPicked.current || !dueBlock) return
    setSelectedId(dueBlock.id)
  }, [dueBlock?.id])

  const selectedBlock = blocks ? (blocks.find(b => b.id === selectedId) ?? blocks[0]) : null
  // Where the block on screen stands, so the page can justify its suggestion —
  // and say so plainly when you have picked something that has not rested.
  const selTouch = selectedBlock && !isRestBlock(selectedBlock)
    ? groupLastTouch(selectedBlock, enrichedCompletions, groupsByLabel, exerciseMap)
    : null
  // Три и нагоре по скалата за схванатост вече не е тренировка, а щета —
  // същият праг, на който sorenessDamping спира да мълчи.
  const soreWarn = (soreness ?? 0) >= 3

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
      training_plan: defaultTrainingBlocks(t),
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
      /* Отбелязаният ден е затворен: следващото идване тръгва от списъка, а не
         от блока, който току-що е приключил. */
      if (logDate === todayStr) rememberStarted(null)
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
          title={t('tr.header')}
        />
        <Suspense fallback={null}>
          <TrainingEditor
            initialPlan={isOldFormat(profile?.training_plan) ? null : profile?.training_plan}
            onSave={handleSavePlan}
            saving={savingPlan}
          />
        </Suspense>
      </div>
    )
  }

  // ── No plan yet ──

  if (!blocks) {
    return (
      <div className={styles.page}>
        <AppHeader onMenuOpen={onMenuOpen} title={t('tr.header')} />
        {selfManaged ? (
          // No coach is coming — so the empty state is a setup, not a wait. One
          // tap to a ready split, or the editor to build from scratch.
          <div className={styles.noPlanWrap}>
            <span className={styles.noPlanIcon}><DumbbellIcon /></span>
            <p className={styles.noPlanTitle}>{t('tr.noPlanTitle')}</p>
            <p className={styles.noPlanSub}>
              {t('tr.noPlanSub')}
            </p>
            <div className={styles.setupActions}>
              <button
                className={styles.setupPrimary}
                onClick={applyStarter}
                disabled={savingPlan}
                type="button"
              >
                {savingPlan ? '...' : t('tr.readyPlan')}
              </button>
              <button
                className={styles.setupPrimary}
                onClick={() => setEditing(true)}
                disabled={savingPlan}
                type="button"
              >
                {t('tr.fromScratch')}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.noPlanWrap}>
            <span className={styles.noPlanIcon}><DumbbellIcon /></span>
            <p className={styles.noPlanTitle}>{t('tr.pendingTitle')}</p>
            <p className={styles.noPlanSub}>{t('tr.pendingSub')}</p>
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
          title={t('tr.progressHeader')}
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
          title={t('tr.logHeader')}
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
          title={t('tr.progressionHeader')}
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
          title={t('tr.sessionHeader')}
          action={
            <button className={styles.editBtn} onClick={() => setView('home')} type="button">
              {t('tr.done')}
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
          {/* Един ред, и той е факт, а не оценка.
              Крепатурата е думата на самия човек и бие всичко: часовник, който
              не чува „схванат съм", е причината хората да спрат да вярват на
              тези числа. Иначе — кога групата е пипана последно и от кой блок.
              Процентът, който стоеше тук, твърдеше измерване, което го няма:
              линеен часовник от константа, без обем, без интензитет, без
              история, и даващ едно и също число на два различни блока. */}
          {!rest && (soreWarn || selTouch) && (
            <div className={`${styles.recoveryNote} ${styles.recoveryWait}`}>
              <span className={styles.recoveryDot} />
              {soreWarn
                ? t('tr.recSore')
                : t('tr.groupTouched', {
                    group: t(GROUP_LABEL_KEYS[selTouch.group]),
                    ago: agoLabel(t, selTouch.date),
                    block: selTouch.label,
                  })}
            </div>
          )}

          <DatePicker selectedDate={logDate} onChange={date => { setLogDate(date); setJustMarked(false) }} />

          {rest ? (
            <RestDayCard
              block={selectedBlock}
              done={alreadyMarked || justMarked}
              marking={marking}
              onMark={handleMarkDone}
              onUnmark={handleUnmarkDone}
              markLabel={logDate === todayStr ? t('tr.restLogIt') : t('tr.markRestDate', { date: shortDate(logDate) })}
              doneLabel={logDate === todayStr ? t('tr.markedToday') : t('tr.markedDate', { date: shortDate(logDate) })}
              unmarkLabel={t('tr.unmark')}
            />
          ) : (
            /* Ключът е денят: това, което дневникът помни за деня — разгънатите
               упражнения, заместителите, часовникът за почивка — принадлежи
               на този ден и не бива да се пренася в следващия. */
            <DayLog
              key={logDate}
              date={logDate}
              blockLabels={[selectedBlock.label]}
              blocks={blocks}
              onLogged={handleLogged}
            />
          )}

          {/* Почивката носи своя бутон вътре в картата, за да стои под плана
              за деня, а не под празно място. */}
          {!rest && <button
            className={[
              styles.markDoneBtn,
              allLogged ? styles.markDoneReady : '',
              alreadyMarked || justMarked ? styles.markDoneDone : '',
            ].join(' ')}
            onClick={handleMarkDone}
            disabled={marking || alreadyMarked}
            type="button"
          >
            <MarkGlyph done={alreadyMarked || justMarked} />
            <span>
              {alreadyMarked || justMarked
                ? (logDate === todayStr ? t('tr.markedToday') : t('tr.markedDate', { date: shortDate(logDate) }))
                : marking
                ? '...'
                : rest
                ? (logDate === todayStr ? t('tr.markRest') : t('tr.markRestDate', { date: shortDate(logDate) }))
                : (logDate === todayStr ? t('tr.markDone') : t('tr.markDoneDate', { date: shortDate(logDate) }))}
            </span>
          </button>}
          {!rest && alreadyMarked && (
            <button className={styles.unmarkBtn} onClick={handleUnmarkDone} disabled={marking} type="button">
              {t('tr.unmark')}
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
        // When a session or a progression drill-down is open the burger
        // becomes a back arrow — one gesture per level, same shape as every
        // other in-app back button.
        onBack={
          homeTab === 'today' && sessionBlockId ? () => setSessionBlockId(null) :
          homeTab === 'progression' && progEx   ? () => setProgEx(null) :
          homeTab === 'progression' && progBlock ? () => { setProgEx(null); setProgBlock(null) } :
          undefined
        }
        title={t('tr.header')}
        action={canEdit ? (
          <button className={styles.editBtn} onClick={() => setEditing(true)} type="button">
            {t('tr.plan')}
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
            id: 'today', labelKey: 'tr.tabToday',
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
            /* Bar-chart is the shape people already read as "progress" — it
               moves from the old "week" tab onto its own dedicated one, so
               progression stops being a link at the bottom of another page. */
            id: 'progression', labelKey: 'tr.tabProgression',
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
            /* Was "Седмица" and held the weekly report + calendar + diary +
               dashboard. Renamed to "Insights" because the tab is really a
               look-back at what the week produced, not just the calendar. */
            id: 'insights', labelKey: 'tr.tabInsights',
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3 L20 7 L20 13 C20 17 16 20 12 21 C8 20 4 17 4 13 L4 7 Z" />
                <polyline points="9 12 11.5 14.5 15 10.5" />
              </svg>
            ),
          },
          {
            id: 'body', labelKey: 'tr.tabBody',
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="4.5" r="2.2" />
                <path d="M8 10 Q12 8 16 10 L15 15 L13 15 L13 21 L11 21 L11 15 L9 15 Z" />
              </svg>
            ),
          },
        ].map(tab => (
          <button
            key={tab.id}
            className={`${styles.segment} ${homeTab === tab.id ? styles.segmentActive : ''}`}
            onClick={() => setHomeTab(tab.id)}
            role="tab"
            aria-selected={homeTab === tab.id}
            aria-label={t(tab.labelKey)}
            title={t(tab.labelKey)}
            type="button"
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {homeTab === 'today' && !sessionBlockId && (
        <>
          {/* Split index — a WOVE-style chapter list. One number per block on
              a thin spine, big-typography name to the right, a single line of
              meta beneath. The due block wears full colour; the rest quietly
              wait their turn. Tap a chapter to open the session view. */}
          <ol className={styles.splitIndex}>
            {blocks.map((block, i) => {
              const last = lastDone[block.label]
              const isDue = dueBlock?.id === block.id
              const isRest = isRestBlock(block)
              const started = startedId != null && String(block.id) === startedId
              /* Факт вместо процент. „96% възстановена" даваше едно и също
                 число на Горна А и Горна Б — те делят една широка група, а
                 групата има един часовник. Тук пише кога групата е пипана и
                 от кого; кой блок кога е ред остава работа на ротацията. */
              const touch = isRest ? null : groupLastTouch(block, enrichedCompletions, groupsByLabel, exerciseMap)
              const meta = isRest
                ? t('tr.metaRest')
                : last
                  ? (touch
                      ? t('tr.metaLastGroup', {
                          ago: agoLabel(t, last),
                          group: t(GROUP_LABEL_KEYS[touch.group]),
                          gago: agoLabel(t, touch.date),
                          block: touch.label,
                        })
                      : t('tr.metaLastOnly', { ago: agoLabel(t, last) }))
                  : t('tr.metaNew')
              return (
                <li
                  key={block.id}
                  className={[
                    styles.chapter,
                    isDue ? styles.chapterDue : '',
                    isRest ? styles.chapterRest : '',
                    started ? styles.chapterStarted : '',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    className={styles.chapterHit}
                    onClick={() => {
                      userPicked.current = true
                      setSelectedId(block.id)
                      setSessionBlockId(block.id)
                      setLogDate(todayStr)
                      setJustMarked(false)
                    }}
                  >
                    <span className={styles.chapterNo}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={styles.chapterText}>
                      <span className={styles.chapterName}>{block.label}</span>
                      <span className={styles.chapterMeta}>
                        {/* Започнатото се казва вместо готовността: щом днес вече
                            е вдиган сет тук, въпросът „възстановен ли си" е
                            отговорен от самото правене. */}
                        {started ? t('tr.inProgress') : meta}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

        </>
      )}

      {homeTab === 'today' && sessionBlockId && (
        <>
          {/* Session view — one block, opened. Back arrow lives in AppHeader;
              per-set ticks + implicit completion handle marking, so no big
              "маркирай готово" button here anymore. */}

          <section className={styles.today}>
            <span className={styles.todayEyebrow}>
              {last ? t('tr.lastSession', { ago: agoLabel(t, last.date) }) : t('tr.nothingLogged')}
            </span>
            <h2 className={styles.todayTitle}>{selectedBlock?.label ?? t('tr.rest')}</h2>

            {/* Единственото, което си струва да се каже тук: групата, която
                този блок натоварва, кога е пипана последно и от кой блок. Ако
                последното пипане е самият той, редът мълчи — горе вече пише
                кога е бил. */}
            {selTouch && (
              <span className={`${styles.todayState} ${styles.todayWait}`}>
                <span className={styles.recoveryDot} />
                {t('tr.groupTouched', {
                  group: t(GROUP_LABEL_KEYS[selTouch.group]),
                  ago: agoLabel(t, selTouch.date),
                  block: selTouch.label,
                })}
              </span>
            )}
          </section>

          {selectedBlock && !isRestBlock(selectedBlock) && (
            <>
              {/* Денят се избира тук.
                  Дотук този екран беше зашит за днес, а изборът на дата
                  живееше в друг изглед, до който се стигаше само през
                  календара в ПРЕГЛЕД. Тоест тренировка, вписана вечерта на
                  следващия ден — най-честият случай — нямаше къде да отиде. */}
              <DatePicker
                selectedDate={logDate}
                onChange={date => { setLogDate(date); setJustMarked(false) }}
              />

              <DayLog
                key={logDate}
                date={logDate}
                blockLabels={[selectedBlock.label]}
                blocks={blocks}
                onLogged={handleLogged}
              />

              {/* Explicit "I'm done" — greens up when every planned lift has a
                  set on record, disables once the day already has this block
                  marked. Implicit completion still runs in the background for
                  people who forget to tap; this is the deliberate signal. */}
              {(() => {
                const already = completions.some(
                  c => c.completed_date === logDate && c.block_label === selectedBlock.label
                )
                const allLogged = (selectedBlock.exercises?.length ?? 0) > 0 &&
                  selectedBlock.exercises.every(e => lifts[e.name]?.today)
                const done = already || justMarked
                return (
                  <>
                    <button
                      type="button"
                      className={[
                        styles.markDoneBtn,
                        allLogged ? styles.markDoneReady : '',
                        done ? styles.markDoneDone : '',
                      ].join(' ')}
                      onClick={handleMarkDone}
                      disabled={marking || already}
                    >
                      <MarkGlyph done={done} />
                      <span>
                        {done
                          ? (logDate === todayStr ? t('tr.logged') : t('tr.markedDate', { date: shortDate(logDate) }))
                          : marking ? '...'
                          : (logDate === todayStr ? t('tr.logIt') : t('tr.markDoneDate', { date: shortDate(logDate) }))}
                      </span>
                    </button>

                    {/* Отбелязана по погрешка тренировка се маха оттук.
                        Функцията я имаше от самото начало, но бутонът стоеше
                        в другия изглед — тоест сгрешеният ден оставаше
                        сгрешен за всеки, който не знае за календара. */}
                    {already && (
                      <button
                        type="button"
                        className={styles.unmarkBtn}
                        onClick={handleUnmarkDone}
                        disabled={marking}
                      >
                        {t('tr.unmark')}
                      </button>
                    )}
                  </>
                )
              })()}
            </>
          )}

          {/* Ден за почивка и кардио.
              Дотук това беше картинка: емоджи легло, дума „Почивка" и нищо за
              натискане. А блокът се казва „Почивка / Кардио" и носи 30–45
              минути кардио и 15 минути подвижност — тоест на този ден има
              какво да се свърши и то не можеше да се отбележи никъде.
              Няма DayLog: тези редове се мерят в минути, а дневникът пита за
              килограми и повторения. Има го това, което липсваше — какво е за
              днес, и бутонът, който казва, че е направено. */}
          {selectedBlock && isRestBlock(selectedBlock) && (() => {
            const already = completions.some(
              c => c.completed_date === logDate && c.block_label === selectedBlock.label
            )
            const done = already || justMarked
            return (
              <>
                <DatePicker
                  selectedDate={logDate}
                  onChange={date => { setLogDate(date); setJustMarked(false) }}
                />
                <RestDayCard
                  block={selectedBlock}
                  done={done}
                  marking={marking}
                  onMark={handleMarkDone}
                  onUnmark={handleUnmarkDone}
                  markLabel={logDate === todayStr ? t('tr.restLogIt') : t('tr.markRestDate', { date: shortDate(logDate) })}
                  doneLabel={logDate === todayStr ? t('tr.logged') : t('tr.markedDate', { date: shortDate(logDate) })}
                  unmarkLabel={t('tr.unmark')}
                />
              </>
            )
          })()}
        </>
      )}

      {homeTab === 'progression' && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('tr.sectionProgression')}</h2>
          <ProgressionView
            blocks={blocks}
            completions={enrichedCompletions}
            embedded
            selectedBlock={progBlock}
            selectedEx={progEx}
            onSelectBlock={setProgBlock}
            onSelectEx={setProgEx}
          />
        </section>
      )}

      {homeTab === 'insights' && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('tr.sectionLast7')}</h2>
          <WeeklyReport sessions={sessions} goal={goal} />
          <MonthCalendar
            completions={completions}
            blocks={blocks ?? []}
            onOpenDay={date => {
              const s = sessions.find(x => x.date === date)
              const label = s?.labels[0]
                ?? blocks?.find(b => b.exercises?.some(e => s?.exercises?.has(e.name)))?.label
                ?? null
              openSession(date, label)
            }}
          />

          {/* Diary lives with the week overview — the "what did I do lately"
              question belongs where the calendar and grade card already are,
              not stuck between the day-log and the progression link. */}
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t('tr.sectionLog')}</h2>
            <button type="button" className={styles.seeAll} onClick={() => setView('history')}>
              {t('tr.allSessions', { n: sessions.length })}
            </button>
          </div>
          {sessions.length === 0 ? (
            <p className={styles.sectionEmpty}>{t('tr.logEmpty')}</p>
          ) : (
            <ul className={styles.recent}>
              {sessions.slice(0, 5).map(s => (
                <li key={s.date}>
                  <button type="button" className={styles.recentRow} onClick={() => setView('history')}>
                    <span className={styles.recentDate}>
                      {dayDate(s.date).getDate()} {MS[dayDate(s.date).getMonth()].toLowerCase()}
                    </span>
                    <span className={styles.recentName}>{sessionTitle(t, s)}</span>
                    <span className={styles.recentMeta}>
                      {s.volume > 0 ? t('tr.recentVolume', { kg: bigNum(s.volume) }) : t('tr.recentSets', { n: s.setCount })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

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
          <h2 className={styles.sectionTitle}>{t('tr.sectionMuscles')}</h2>
          <Suspense fallback={null}>
            <MuscleMap recovery={recovery} sessions={sessions} completions={enrichedCompletions} groupsByLabel={groupsByLabel} />
          </Suspense>
          <MuscleStatus completions={completions} recovery={recovery} />
        </section>
      )}
    </div>
  )
}
