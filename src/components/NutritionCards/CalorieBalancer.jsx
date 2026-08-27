import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './CalorieBalancer.module.css'
import { useSettings } from '../../contexts/SettingsContext'

const DAY = 86_400_000

// ±5% of the week's target counts as on-plan. Below that the delta is inside
// logging noise (mis-weighed portion, rounded macros in a recipe) — offering
// a target adjustment for that noise trains the wrong behaviour.
const TOLERANCE = 0.05


function iso(d) { return new Date(d).toISOString().slice(0, 10) }
function dayLabel(t, dateIso) {
  const d = new Date(dateIso + 'T12:00:00')
  return `${t(`balancer.day.${d.getDay()}`)} ${d.getDate()}`
}

/** Monday of the current week (Monday-first, Sunday closes). */
function mondayOfThisWeek() {
  const d = new Date()
  const dow = d.getDay() || 7
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - (dow - 1))
  return d
}

/**
 * Weekly-average calorie balancer.
 *
 * A day's target is a decision about the week, not a rule about the day. One
 * cheat Friday does not have to break the run — the excess can be spread
 * across the days that follow, and the same maths in reverse tells someone in
 * a surplus how much to add to catch up. The picker snaps to the days left
 * until Sunday because the week is what the average is over.
 */
export default function CalorieBalancer() {
  const { t } = useSettings()
  const { user, profile, updateProfile } = useAuth()
  const target = profile?.calories ?? 0
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  // From today to Sunday, inclusive. Sunday closes the week, so on Sunday the
  // picker offers only today.
  const remaining = useMemo(() => {
    const dow = new Date().getDay()
    return dow === 0 ? 1 : 8 - dow
  }, [])

  const upcoming = useMemo(() => {
    const out = []
    for (let i = 0; i < remaining; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      out.push({
        idx: i + 1,
        label: t(`balancer.day.${d.getDay()}`),
        day: d.getDate(),
        isToday: i === 0,
      })
    }
    return out
  }, [remaining])

  const [spread, setSpread] = useState(() => Math.min(3, remaining))

  useEffect(() => {
    if (spread > remaining) setSpread(remaining)
    if (spread < 1) setSpread(1)
  }, [remaining, spread])

  useEffect(() => {
    if (!user) return
    const monday = mondayOfThisWeek()
    const since = iso(monday)
    setLoading(true)
    supabase
      .from('food_logs')
      .select('date, kcal')
      .eq('user_id', user.id)
      .gte('date', since)
      .then(({ data }) => {
        // The week always paints seven bars — Monday through Sunday — so the
        // frame stays the same shape as the week progresses. Days past today
        // are empty placeholders; on Monday morning every column reads "·"
        // until the first meal lands.
        const per = new Map()
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday); d.setDate(d.getDate() + i)
          per.set(iso(d), 0)
        }
        for (const r of data ?? []) {
          if (per.has(r.date)) per.set(r.date, per.get(r.date) + (r.kcal || 0))
        }
        setDays([...per.entries()].map(([date, kcal]) => ({ date, kcal: Math.round(kcal) })))
        setLoading(false)
      })
  }, [user?.id])

  const analysis = useMemo(() => {
    if (!target) return null
    const eaten = days.filter(d => d.kcal > 0)
    if (!eaten.length) return { delta: 0, eaten: 0, avg: 0, withinTolerance: true }
    const totalActual = eaten.reduce((s, d) => s + d.kcal, 0)
    const totalTarget = eaten.length * target
    const delta = totalActual - totalTarget
    const avg = Math.round(totalActual / eaten.length)
    const withinTolerance = Math.abs(delta) <= totalTarget * TOLERANCE
    return { delta, eaten: eaten.length, avg, totalActual, totalTarget, withinTolerance }
  }, [days, target])

  async function applyNewTarget() {
    if (!analysis || !target) return
    setApplying(true)
    const newTarget = Math.max(0, target - Math.round(analysis.delta / spread))
    const ratio = target > 0 ? newTarget / target : 1
    await updateProfile({
      calories: newTarget,
      protein: Math.round((profile?.protein ?? 0) * ratio),
      carbs:   Math.round((profile?.carbs   ?? 0) * ratio),
      fat:     Math.round((profile?.fat     ?? 0) * ratio),
    })
    setApplying(false)
    setApplied(true)
    setTimeout(() => setApplied(false), 2200)
  }

  if (!target) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>
          {t('balancer.emptyTarget')}
        </p>
      </div>
    )
  }

  if (loading) return <p className={styles.empty}>...</p>
  if (!analysis) return null

  const perDay = Math.round(analysis.delta / spread)
  const suggested = Math.max(0, target - perDay)
  const isOver  = analysis.delta > 0
  const isUnder = analysis.delta < 0
  const max = Math.max(target, ...days.map(d => d.kcal), 1)

  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>{t('balancer.title')}</h3>
      <p className={styles.sub}>{t('balancer.dayGoal', { n: target.toLocaleString('bg-BG') })}</p>

      <div className={styles.chart} style={{ '--target-h': `${(target / max) * 100}%` }}>
        {days.map(d => {
          const h = (d.kcal / max) * 100
          const over = d.kcal > target
          return (
            <div key={d.date} className={styles.col}>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.bar} ${over ? styles.barOver : ''} ${d.kcal ? '' : styles.barEmpty}`}
                  style={{ height: `${h}%` }}
                  title={t('balancer.dayKcalTitle', { n: d.kcal.toLocaleString('bg-BG') })}
                />
                <div className={styles.targetLine} />
              </div>
              <span className={styles.colLabel}>{dayLabel(t, d.date)}</span>
              <span className={styles.colVal}>{d.kcal ? d.kcal.toLocaleString('bg-BG') : '·'}</span>
            </div>
          )
        })}
      </div>

      {analysis.eaten === 0 ? (
        <p className={styles.empty}>{t('balancer.noLoggedYet')}</p>
      ) : (
        <>
          <div className={styles.deltaBox}>
            <div className={styles.deltaRow}>
              <span className={styles.deltaLabel}>{t('balancer.avgLabel', { n: analysis.eaten })}</span>
              <span className={styles.deltaVal}>{t('balancer.avgVal', { n: analysis.avg.toLocaleString('bg-BG') })}</span>
            </div>
            <div className={styles.deltaRow}>
              <span className={styles.deltaLabel}>{t('balancer.vsGoal')}</span>
              <span className={`${styles.deltaVal} ${isOver ? styles.over : isUnder ? styles.under : ''}`}>
                {t('balancer.deltaVal', { sign: analysis.delta > 0 ? '+' : '', n: analysis.delta.toLocaleString('bg-BG') })}
              </span>
            </div>
          </div>

          {analysis.withinTolerance ? (
            <p className={styles.perfect}>
              {t('balancer.withinNoise')}
            </p>
          ) : (
            <>
              {/* Slider with a tick per day left until Sunday — the drag beats
                  a row of buttons because the "how many days" question is a
                  continuous choice, and the ticks say what each stop means
                  without pinning the finger to a chip. */}
              <div className={styles.sliderWrap}>
                {remaining > 1 ? (
                  <>
                    <input
                      type="range"
                      min="1"
                      max={remaining}
                      step="1"
                      value={spread}
                      onChange={e => setSpread(parseInt(e.target.value, 10))}
                      className={styles.slider}
                      aria-label={t('balancer.sliderAria')}
                      style={{ '--fill': `${((spread - 1) / Math.max(1, remaining - 1)) * 100}%` }}
                    />
                    <div className={styles.ticks}>
                      {upcoming.map(day => (
                        <button
                          key={day.idx}
                          type="button"
                          onClick={() => setSpread(day.idx)}
                          className={`${styles.tick} ${spread >= day.idx ? styles.tickOn : ''} ${spread === day.idx ? styles.tickEdge : ''}`}
                        >
                          <span className={styles.tickLbl}>{day.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className={styles.lastDay}>{t('balancer.sundayOnly')}</p>
                )}
              </div>

              <div className={styles.suggestion}>
                <p className={styles.suggestionValue}>
                  {suggested.toLocaleString('bg-BG')} <span className={styles.suggestionUnit}>{t('balancer.perDayUnit')}</span>
                </p>
                <p className={styles.suggestionMeta}>
                  {t(spread === 1 ? 'balancer.spreadOverOne' : 'balancer.spreadOverMany', {
                    n: spread,
                    sign: perDay > 0 ? '−' : '+',
                    delta: Math.abs(perDay).toLocaleString('bg-BG'),
                    target: target.toLocaleString('bg-BG'),
                  })}
                </p>

                <button
                  type="button"
                  className={`${styles.applyBtn} ${applied ? styles.applyBtnDone : ''}`}
                  onClick={applyNewTarget}
                  disabled={applying || applied}
                >
                  {applied ? t('balancer.applied') : applying ? '...' : t('balancer.applyBtn')}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <p className={styles.footnote}>
        {t('balancer.footnote')}
      </p>
    </div>
  )
}
