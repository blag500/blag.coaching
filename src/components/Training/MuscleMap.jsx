import { useEffect, useMemo, useRef, useState } from 'react'
import { BodyChart, ViewSide } from 'body-muscles'
import { muscleStats } from '../../utils/muscleStats'
import styles from './MuscleMap.module.css'

// Attribution: anatomy paths from body-muscles (Apache 2.0, © 2024 Ivan Vulović).
// See node_modules/body-muscles/LICENSE. The library is used as a runtime
// dependency; nothing here vendors its SVG data.

const MODES = [
  { id: 'recovery',    label: 'ВЪЗСТ.',    hint: 'По-плътно = прясно тренирана (още се възстановява).' },
  { id: 'lastTrained', label: 'ПОСЛЕДНО',  hint: 'По-плътно = отдавна не си я тренирал.' },
  { id: 'overload',    label: 'ПРОГРЕСИЯ', hint: 'По-плътно = по-голямо покачване на обема спрямо предишните две седмици.' },
  { id: 'volume',      label: 'ОБЕМ 7Д',   hint: 'По-плътно = повече обем за последните седем дни.' },
]

// One place the app's four groups meet body-muscles's 70+ muscle IDs. If the
// grouping ever changes — say, biceps moves from pull to arms — it changes
// here and only here.
const GROUP_MUSCLES = {
  upper: [
    'chest-upper-left','chest-upper-right','chest-lower-left','chest-lower-right',
    'shoulder-front-left','shoulder-front-right','shoulder-side-left','shoulder-side-right',
    'deltoid-rear-left','deltoid-rear-right',
    'triceps-long-left','triceps-lateral-left','triceps-long-right','triceps-lateral-right',
  ],
  pull: [
    'lats-upper-left','lats-mid-left','lats-lower-left',
    'lats-upper-right','lats-mid-right','lats-lower-right',
    'biceps-left','biceps-right',
  ],
  lower: [
    'quads-left','quads-right',
    'adductors-left','adductors-right',
    'hamstrings-medial-left','hamstrings-lateral-left',
    'hamstrings-medial-right','hamstrings-lateral-right',
    'gluteus-medius-left','gluteus-maximus-left',
    'gluteus-medius-right','gluteus-maximus-right',
  ],
  extra: [
    'traps-upper-left','traps-mid-left','traps-lower-left',
    'traps-upper-right','traps-mid-right','traps-lower-right',
    'forearm-left','forearm-right',
    'forearm-flexors-left','forearm-extensors-left',
    'forearm-flexors-right','forearm-extensors-right',
    'abs-upper-left','abs-upper-right','abs-lower-left','abs-lower-right',
    'serratus-anterior-left','serratus-anterior-right',
    'obliques-left','obliques-right',
    'lower-back-erectors-left','lower-back-erectors-right',
    'lower-back-ql-left','lower-back-ql-right','spine',
    'tibialis-anterior-left','tibialis-anterior-right',
    'calves-gastroc-medial-left','calves-gastroc-lateral-left','calves-soleus-left',
    'calves-gastroc-medial-right','calves-gastroc-lateral-right','calves-soleus-right',
  ],
}

/**
 * How loud a group's colour should read, on the 0..10 scale the body-muscles
 * library expects. Each mode maps its own signal — pct recovered, days since,
 * overload trend, weekly volume — into that same 0..10 axis, so the library
 * only has to know "how hot".
 */
function intensityFor(mode, group, recovery, stats, ctx) {
  const rec = recovery?.[group]
  const s   = stats?.[group] ?? {}

  if (mode === 'recovery') {
    if (!rec?.trained) return 0
    // Fresh = loud (still recovering); rested = quiet.
    return Math.max(0, Math.round(10 - rec.pct / 10))
  }
  if (mode === 'lastTrained') {
    if (s.daysSince == null) return 0
    return Math.min(10, s.daysSince)
  }
  if (mode === 'overload') {
    if (s.overload == null) return 0
    return Math.max(0, Math.min(10, Math.round(5 + s.overload * 10)))
  }
  if (mode === 'volume') {
    if (!s.volume7) return 0
    const ratio = ctx.maxVolume7 > 0 ? s.volume7 / ctx.maxVolume7 : 0
    return Math.round(ratio * 10)
  }
  return 0
}

function buildBodyState(mode, recovery, stats, ctx) {
  const state = {}
  for (const [group, ids] of Object.entries(GROUP_MUSCLES)) {
    const intensity = intensityFor(mode, group, recovery, stats, ctx)
    if (intensity <= 0) continue
    for (const id of ids) state[id] = { intensity, selected: false }
  }
  return state
}

/** One chart instance per side, so the front and back can both be on screen. */
function BodyView({ side, bodyState }) {
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    chartRef.current = new BodyChart(ref.current, {
      view: side === 'back' ? ViewSide.BACK : ViewSide.FRONT,
      bodyState,
    })
    return () => chartRef.current?.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side])

  useEffect(() => {
    chartRef.current?.update({ bodyState })
  }, [bodyState])

  return <div ref={ref} className={styles.chart} />
}

export default function MuscleMap({ recovery, sessions = [], completions = [], groupsByLabel = null }) {
  const [mode, setMode] = useState('recovery')

  const stats = useMemo(
    () => muscleStats(sessions, completions, Date.now(), groupsByLabel),
    [sessions, completions, groupsByLabel],
  )
  const ctx = useMemo(() => ({
    maxVolume7: Math.max(...Object.values(stats).map(s => s.volume7 || 0), 1),
  }), [stats])

  const bodyState = useMemo(
    () => buildBodyState(mode, recovery, stats, ctx),
    [mode, recovery, stats, ctx],
  )

  const activeHint = MODES.find(m => m.id === mode)?.hint

  return (
    <div className={styles.wrap}>
      <div className={styles.filterBar} role="tablist">
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={`${styles.filter} ${mode === m.id ? styles.activeFilter : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className={styles.bodies}>
        <div className={styles.side}>
          <BodyView side="front" bodyState={bodyState} />
          <span className={styles.caption}>ПРЕДНА</span>
        </div>
        <div className={styles.side}>
          <BodyView side="back" bodyState={bodyState} />
          <span className={styles.caption}>ЗАДНА</span>
        </div>
      </div>

      {activeHint && <p className={styles.hint}>{activeHint}</p>}
    </div>
  )
}
