import { useState, useEffect, useRef, Fragment } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useFoodLog } from '../../hooks/useFoodLog'
import { useHabitsToday } from '../../hooks/useHabitsToday'
import { useWaterLog } from '../../hooks/useWaterLog'
import { useSupplements } from '../../hooks/useSupplements'
import { useShop, recommendProducts } from '../../hooks/useShop'
import { useCart } from '../../hooks/useCart'
import BadgePopup from './BadgePopup'
import Confetti from './Confetti'
import Pictogram from '../Pictogram/Pictogram'
import MacroScale from './MacroScale'
import WeightCard from './WeightCard'
import ReadinessWidget from '../ReadinessWidget/ReadinessWidget'
import AppHeader from '../AppHeader/AppHeader'
import { layout } from './cards'
import { shareAchievement } from '../../lib/achievements'
import styles from './TodayDashboard.module.css'

// A colour per habit, for when it is done.
//
// Safe to use freely here in a way it was not on the training calendar: every
// chip carries its own name and its own drawing, so the colour is never what
// tells them apart — it only marks the difference between done and not. Chosen
// to fit what each one is rather than to be maximally separated.
const HABIT_COLORS = {
  water:    '#42A5F5',
  protein:  '#EF5350',
  training: 'var(--accent)',
  sleep:    '#AB47BC',
  steps:    '#66BB6A',
  nosugar:  '#FF8A65',
}
function habitColor(id) { return HABIT_COLORS[id] ?? 'var(--accent)' }

/* Powders get the tub, everything else gets the capsule.
   A stack is scoops and pills in some mixture, and the split between them is the
   only one that holds for everyone — beyond it, softgel-versus-tablet is a guess
   that will be wrong for half of any shelf. The name on the chip is what tells
   two supplements apart; the drawing only says which gesture it is. */
const SCOOPED = /креатин|креат|протеин|whey|уей|bcaa|бцаа|глутамин|гейнер|gainer|колаген|collagen|прах|powder|creatine|protein/i
function suppIcon(name) { return SCOOPED.test(name || '') ? 'powder' : 'capsule' }

/* A colour per supplement, taken from the name rather than from its place in
   the list. Position would mean the whole row changed colour the moment one was
   deleted, and a colour that moves teaches nothing — while a colour fixed to
   "креатин" is learned once and recognised from across the room.
   The habits row picks its six by hand because they are always the same six;
   a stack is whatever the client typed, so this is the same palette dealt out
   by the name's own checksum. */
const SUPP_COLORS = [
  '#42A5F5', '#66BB6A', '#AB47BC', '#FF8A65', '#EF5350',
  '#26C6DA', '#FFCA28', '#8D6E63', '#EC407A',
]
function suppHash(name) {
  let h = 0
  for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return h
}

/* The checksum alone gives two of six stacks a repeated colour — with nine
   shades and six names, a collision is the likely case, not the unlucky one,
   and two identical chips defeat the whole point of colouring them. So the
   name picks first and anything already taken walks to the next free shade.
   A deletion can therefore shift one colour; distinctness today is worth more
   than a colour that never moves. */
function suppColors(list) {
  const used = new Set()
  const out = {}
  for (const s of list) {
    const start = suppHash(s.name) % SUPP_COLORS.length
    let c = SUPP_COLORS[start]
    for (let i = 1; used.has(c) && i < SUPP_COLORS.length; i++) {
      c = SUPP_COLORS[(start + i) % SUPP_COLORS.length]
    }
    used.add(c)
    out[s.id] = c
  }
  return out
}

function dateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

/**
 * Картите за деня.
 *
 * Живее на два адреса: като раздел ДНЕС вътре в Профил (`embedded`), и — за
 * треньора — все още като собствена страница. Разликата е само хедърът: в
 * Профил той вече стои отгоре и втори би повторил същото име два пъти.
 */
export default function TodayDashboard({ onNavigate, onMenuOpen, embedded = false, onHabitsSetup }) {
  const { profile, user } = useAuth()
  const { t } = useSettings()
  const { log, totals } = useFoodLog()
  const { habits, checked, toggle: toggleHabit } = useHabitsToday()
  const { glasses, target: waterTarget, add: addWater } = useWaterLog()
  const {
    supplements, taken: suppTaken, toggle: toggleSupp,
    takenCount: suppTakenCount, totalCount: suppTotal,
  } = useSupplements()
  const { products: shopProducts } = useShop()
  const cart = useCart()
  const [workouts, setWorkouts] = useState([])

  const targets = {
    kcal:    profile?.calories ?? 0,
    protein: profile?.protein  ?? 0,
    carbs:   profile?.carbs    ?? 0,
    fat:     profile?.fat      ?? 0,
  }

  const hour       = new Date().getHours()
  const greeting   = hour < 12 ? t('today.greeting.morning') : hour < 18 ? t('today.greeting.afternoon') : t('today.greeting.evening')

  /* Still fetched with the training card gone: whether they trained today is
     what awards the training badge and the perfect-day badge below. Only the
     last two days are needed for that, but the query is left at fourteen — it
     is one round trip either way, and narrowing it would only make the next
     thing that wants a streak fetch it again. */
  useEffect(() => {
    if (!user?.id) return
    const since = dateStr(13)
    Promise.all([
      supabase.from('exercise_logs').select('block_label, completed_date').eq('user_id', user.id).gte('completed_date', since),
      supabase.from('workout_completions').select('block_label, completed_date').eq('user_id', user.id).gte('completed_date', since),
    ]).then(([ex, wo]) => {
      const merged = [...(ex.data || []), ...(wo.data || [])]
      merged.sort((a, b) => b.completed_date.localeCompare(a.completed_date))
      setWorkouts(merged)
    })
  }, [user?.id])

  const todayWorkouts = workouts.filter(w => w.completed_date === dateStr(0))

  const suppColor = suppColors(supplements)

  const recommendations = recommendProducts(shopProducts, targets, totals)

  const completedHabits = habits.filter(h => checked[h.id]).length
  const trainedToday    = todayWorkouts.length > 0

  // ── The habits wave ──
  // Fires on the transition into "all done", never on arriving at a day that is
  // already finished — a celebration that replays every time you open the app
  // stops meaning anything by the third time.
  const [habitsCheer, setHabitsCheer] = useState(false)
  const [burst, setBurst] = useState(0)
  const prevAllHabits = useRef(null)

  useEffect(() => {
    const all = habits.length > 0 && completedHabits === habits.length
    const was = prevAllHabits.current
    prevAllHabits.current = all
    if (was === null || !all || was) return

    setHabitsCheer(true)
    setBurst(b => b + 1)
    const timer = setTimeout(() => setHabitsCheer(false), 1000)
    return () => clearTimeout(timer)
  }, [completedHabits, habits.length])

  // ── The whole stack taken ──
  // Same rule as the habits wave and the water: it fires on the transition into
  // a finished stack, never on arriving at one that was already finished.
  const [suppCheer, setSuppCheer] = useState(false)
  const [suppBurst, setSuppBurst] = useState(0)
  const prevAllSupps = useRef(null)

  useEffect(() => {
    const all = suppTotal > 0 && suppTakenCount === suppTotal
    const was = prevAllSupps.current
    prevAllSupps.current = all
    if (was === null || !all || was) return

    setSuppCheer(true)
    setSuppBurst(b => b + 1)
    const timer = setTimeout(() => setSuppCheer(false), 1000)
    return () => clearTimeout(timer)
  }, [suppTakenCount, suppTotal])

  // ── Water hitting its target ──
  // Same rule as the habits wave: it fires on the transition, not on arriving at
  // an already-finished day.
  const waterFull = waterTarget > 0 && glasses >= waterTarget
  const [waterBurst, setWaterBurst] = useState(0)
  const prevWaterFull = useRef(null)

  useEffect(() => {
    const was = prevWaterFull.current
    prevWaterFull.current = waterFull
    if (was === null || !waterFull || was) return
    setWaterBurst(b => b + 1)
  }, [waterFull])

  // ── Water drop ripple ──
  // Which glass to ring — set to the newest full drop's index for a beat, then
  // cleared. Reads as a "plop" landing in the row, not as every drop pulsing.
  const [rippleIdx, setRippleIdx] = useState(null)
  const prevGlasses = useRef(glasses)

  useEffect(() => {
    if (glasses > prevGlasses.current) {
      const idx = glasses - 1
      setRippleIdx(idx)
      const t = setTimeout(() => setRippleIdx(null), 720)
      prevGlasses.current = glasses
      return () => clearTimeout(t)
    }
    prevGlasses.current = glasses
  }, [glasses])

  // ── Badge detection ──
  const [badgeQueue, setBadgeQueue] = useState([])
  const prevCal   = useRef(false)
  const prevHabs  = useRef(false)
  const prevTrain = useRef(false)

  const kcalPct = Math.min((totals.kcal || 0) / Math.max(targets.kcal || 1, 1), 1)
  const calDone  = targets.kcal > 0 && kcalPct >= 0.8
  const habsDone = habits.length > 0 && completedHabits >= habits.length

  useEffect(() => {
    const today    = new Date().toISOString().slice(0, 10)
    const justCal  = calDone     && !prevCal.current
    const justHabs = habsDone    && !prevHabs.current
    const justTrain = trainedToday && !prevTrain.current
    const earned   = []

    function award(type) {
      const k = `blag_badge_${type}_${today}`
      if (!localStorage.getItem(k)) { localStorage.setItem(k, '1'); earned.push(type) }
    }

    if (justCal)   award('calories')
    if (justHabs)  award('habits')
    if (justTrain) award('training')
    if ((justCal || justHabs || justTrain) && calDone && habsDone && trainedToday) {
      award('perfect')
      /* Идеалният ден отива и във фийда — единственото постижение тук, което
         значи нещо за друг човек. Останалите три са стъпки към него и
         публикувани поотделно биха дали четири поста за един ден. */
      shareAchievement(user?.id, {
        kind: 'perfect',
        date: today,
        meta: { kcal: Math.round(totals.kcal || 0), habits: habits.length },
      })
    }

    prevCal.current   = calDone
    prevHabs.current  = habsDone
    prevTrain.current = trainedToday

    if (earned.length) setBadgeQueue(q => [...q, ...earned])
  }, [calDone, habsDone, trainedToday])

  const { visible } = layout(profile?.dashboard_cards)

  /* Every card the page can show, keyed by id. Built as a table rather than
     written out in order, because the order is the client's: what follows
     renders whichever of these they kept, in the sequence they put them. */
  const cardNodes = {
    /* ── Readiness widget ── */
    readiness: <ReadinessWidget onNavigate={onNavigate} />,

    /* ── Habits ──
        Ticked here rather than prompted from here. A nudge that sends you to
        another tab to spend four seconds is a nudge most people decline, and
        habits are 20% of the readiness score — the component most often left
        empty precisely because it lived somewhere else. */
    habits: habits.length === 0 ? (
      <div className={styles.habitsCard}>
        <div className={styles.habitsHead}>
          <span className={styles.cardLabel}>{t('today.habits')}</span>
        </div>
        <button
          type="button"
          className={styles.habitsEmpty}
          /* Извън Профил това е път към страницата; вътре в него — към
             раздела, в който стои редакторът, защото „иди в профила" не
             помага на човек, който вече е там. */
          onClick={onHabitsSetup ?? (() => onNavigate('profile'))}
        >
          <span className={styles.habitsEmptyLead}>{t('today.habitsEmpty')}</span>
          <span className={styles.habitsEmptyCta}>{t('today.habitsEmptyCta')}</span>
        </button>
      </div>
    ) : (
      <div className={`${styles.habitsCard} ${habitsCheer ? styles.habitsCheer : ''}`}>
        {habitsCheer && <Confetti burst={burst} />}
        <div className={styles.habitsHead}>
          <span className={styles.cardLabel}>{t('today.habits')}</span>
          <span className={styles.habitsCount}>
            {completedHabits}/{habits.length}
          </span>
        </div>
        <div className={styles.habitsGrid}>
          {habits.map((h, i) => (
            <button
              key={h.id}
              type="button"
              className={`${styles.habitChip} ${checked[h.id] ? styles.habitChipOn : ''}`}
              onClick={() => toggleHabit(h.id)}
              aria-pressed={!!checked[h.id]}
              title={h.label}
              style={{
                // The chip takes its colour only once it is ticked; undone it
                // stays neutral, so the row reads as progress rather than as
                // six coloured buttons waiting to be pressed.
                ...(checked[h.id] ? { '--habit': habitColor(h.id) } : null),
                // The wave runs left to right rather than firing at once, so
                // the row reads as a run being completed instead of a flash.
                ...(habitsCheer ? { animationDelay: `${i * 55}ms` } : null),
              }}
            >
              <Pictogram name={h.id} size={16} className={styles.habitIcon} />
              <span className={styles.habitLabel}>{h.label}</span>
            </button>
          ))}
        </div>
      </div>
    ),

    /* ── Weight ── */
    weight: <WeightCard />,

    /* ── Water card ──
        Full is a small win and it gets the same treatment as the other two:
        it fires once when the last glass lands, and stays tappable afterwards
        so the burst can be replayed. A div rather than a button because it
        already contains one, and a button inside a button is invalid. */
    water: <div
      className={`${styles.waterCard} ${waterFull ? styles.waterCardDone : ''}`}
      onClick={waterFull ? () => setWaterBurst(b => b + 1) : undefined}
      role={waterFull ? 'button' : undefined}
      tabIndex={waterFull ? 0 : undefined}
      onKeyDown={waterFull ? e => {
        if (e.key === 'Enter' || e.key === ' ') setWaterBurst(b => b + 1)
      } : undefined}
    >
      {waterBurst > 0 && <Confetti burst={`w${waterBurst}`} />}
      <span className={styles.waterLabel}>
        <Pictogram name="water" size={14} />
        {t('today.water')}
      </span>
      <div className={styles.waterGlasses}>
        {Array.from({ length: waterTarget }, (_, i) => (
          <span
            key={i}
            className={[
              styles.waterDrop,
              i < glasses ? styles.waterDropFull : '',
              i === rippleIdx ? styles.waterDropRipple : '',
            ].join(' ')}
          />
        ))}
      </div>
      <div className={styles.waterActions}>
        <span className={styles.waterCount}>{glasses}/{waterTarget}</span>
        <button
          type="button"
          className={styles.waterBtn}
          /* Stops the tap reaching the card, so adding a glass never doubles
             as a celebration. */
          onClick={e => { e.stopPropagation(); addWater(1) }}
          aria-label={t('today.addGlass')}
        >+</button>
      </div>
    </div>,

    /* ── Macros ──
        Last of the five, because it is the only one that cannot be answered
        from this screen: it reads back what was logged in the nutrition tab. */
    macros: <MacroScale
      label={t('today.macros')}
      log={log || []}
      t={t}
      macros={[
        { key: 'kcal',    val: Math.round(totals.kcal    || 0), target: targets.kcal,
          color: 'var(--accent)',         grad: 'var(--grad-kcal)',    glow: 'var(--glow-kcal)'    },
        { key: 'protein', val: Math.round(totals.protein || 0), target: targets.protein,
          color: 'var(--macro-protein)',  grad: 'var(--grad-protein)', glow: 'var(--glow-protein)' },
        { key: 'carbs',   val: Math.round(totals.carbs   || 0), target: targets.carbs,
          color: 'var(--macro-carbs)',    grad: 'var(--grad-carbs)',   glow: 'var(--glow-carbs)'   },
        { key: 'fat',     val: Math.round(totals.fat     || 0), target: targets.fat,
          color: 'var(--macro-fat)',      grad: 'var(--grad-fat)',     glow: 'var(--glow-fat)'     },
      ]}
    />,

    /* ── Supplements ──
        The habits row again, built from whatever the client put in their
        stack: one chip per supplement, tapped when it is taken. Nothing is
        shown to someone with an empty stack — a bar reading 0/0 is an
        instruction to go and configure something, which is not what this page
        is for. The stack itself is edited on its own page, in the drawer. */
    supplements: supplements.length > 0 && (
      <div className={`${styles.habitsCard} ${suppCheer ? styles.habitsCheer : ''}`}>
        {suppCheer && <Confetti burst={`s${suppBurst}`} />}
        <div className={styles.habitsHead}>
          <span className={styles.cardLabel}>{t('nav.supplements')}</span>
          <span className={styles.habitsCount}>{suppTakenCount}/{suppTotal}</span>
        </div>
        <div className={styles.habitsGrid}>
          {supplements.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.habitChip} ${suppTaken[s.id] ? styles.habitChipOn : ''}`}
              onClick={() => toggleSupp(s.id)}
              aria-pressed={!!suppTaken[s.id]}
              title={s.dose ? `${s.name} · ${s.dose}` : s.name}
              style={{
                // Neutral until taken, exactly like the habits: undone, the row
                // reads as progress rather than as a rack of coloured buttons.
                ...(suppTaken[s.id] ? { '--habit': suppColor[s.id] } : null),
                ...(suppCheer ? { animationDelay: `${i * 55}ms` } : null),
              }}
            >
              <Pictogram name={suppIcon(s.name)} size={16} className={styles.habitIcon} />
              <span className={styles.habitLabel}>{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    ),

    /* ── Recommendation widget ── */
    shop: recommendations.length > 0 && (
      <div className={styles.recCard}>
        <div className={styles.recHeader}>
          <span className={styles.cardLabel}>{t('today.shopRec')}</span>
          <span className={styles.recDeficit}>
            {t('today.shopRecSub')} {Math.round(Math.max(0, targets.protein - (totals.protein || 0)))}g П
            {targets.kcal > 0 && Math.max(0, targets.kcal - (totals.kcal || 0)) > 100
              ? ` · ${Math.round(Math.max(0, targets.kcal - (totals.kcal || 0)))} kcal`
              : ''}
          </span>
        </div>
        <div className={styles.recList}>
          {recommendations.map(p => {
            const inCart = cart.items.find(i => i.product_id === p.id)
            return (
              <div key={p.id} className={styles.recRow}>
                <div className={styles.recInfo}>
                  <span className={styles.recName}>{p.name}</span>
                  <span className={styles.recMacros}>{p.protein_per_serving}g П · {p.kcal_per_serving} kcal · {(p.price_stotinki / 100).toFixed(2)} лв.</span>
                </div>
                <button
                  type="button"
                  className={`${styles.recOrderBtn} ${inCart ? styles.recOrderBtnDone : ''}`}
                  onClick={() => { if (!inCart) { cart.addItem(p); onNavigate('shop') } }}
                >
                  {inCart ? '✓' : t('today.shopOrder')}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    ),
  }

  return (
    <div className={`${styles.page} ${embedded ? styles.pageEmbedded : ''}`}>
      {badgeQueue[0] && (
        <BadgePopup badge={badgeQueue[0]} onDone={() => setBadgeQueue(q => q.slice(1))} />
      )}
      {!embedded && <AppHeader
        onMenuOpen={onMenuOpen}
        eyebrow={greeting}
        title={profile?.name?.split(' ')[0]?.toUpperCase() ?? 'BLAG'}
        avatarUrl={profile?.avatar_url}
        avatarInitial={(profile?.name || '?')[0].toUpperCase()}
        onAvatarClick={() => onNavigate('profile')}
      />}

      {/* Ordered by the client, in their profile. The default is the argument
          the page makes on its own: the verdict first, then the things they
          tick or type here, then the tallies that read back what was logged
          somewhere else. */}
      {visible.map(id => <Fragment key={id}>{cardNodes[id]}</Fragment>)}
    </div>
  )
}


