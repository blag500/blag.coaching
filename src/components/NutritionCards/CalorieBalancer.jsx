import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './CalorieBalancer.module.css'

const DAY = 86_400_000
const WINDOW_DAYS = 7

const DAY_NAMES = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function iso(d) { return new Date(d).toISOString().slice(0, 10) }
function dayLabel(dateIso) {
  const d = new Date(dateIso + 'T12:00:00')
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}`
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
        label: DAY_NAMES[d.getDay()],
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
    const since = iso(Date.now() - (WINDOW_DAYS - 1) * DAY)
    setLoading(true)
    supabase
      .from('food_logs')
      .select('date, kcal')
      .eq('user_id', user.id)
      .gte('date', since)
      .then(({ data }) => {
        const per = new Map()
        for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
          per.set(iso(Date.now() - i * DAY), 0)
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
    if (!eaten.length) return { delta: 0, eaten: 0, avg: 0 }
    const totalActual = eaten.reduce((s, d) => s + d.kcal, 0)
    const totalTarget = eaten.length * target
    const delta = totalActual - totalTarget
    const avg = Math.round(totalActual / eaten.length)
    return { delta, eaten: eaten.length, avg, totalActual, totalTarget }
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
          Настрой дневната си калорийна цел в „Открий → Калкулатор", за да
          може балансьорът да сметне къде си спрямо нея.
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
      <h3 className={styles.title}>БАЛАНС НА СЕДМИЦАТА</h3>
      <p className={styles.sub}>Цел за ден: {target.toLocaleString('bg-BG')} ккал</p>

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
                  title={`${d.kcal.toLocaleString('bg-BG')} ккал`}
                />
                <div className={styles.targetLine} />
              </div>
              <span className={styles.colLabel}>{dayLabel(d.date)}</span>
              <span className={styles.colVal}>{d.kcal ? Math.round(d.kcal / 100) * 100 : '·'}</span>
            </div>
          )
        })}
      </div>

      {analysis.eaten === 0 ? (
        <p className={styles.empty}>Още няма логвани дни в тази седмица.</p>
      ) : (
        <>
          <div className={styles.deltaBox}>
            <div className={styles.deltaRow}>
              <span className={styles.deltaLabel}>Средно за {analysis.eaten} дни</span>
              <span className={styles.deltaVal}>{analysis.avg.toLocaleString('bg-BG')} ккал</span>
            </div>
            <div className={styles.deltaRow}>
              <span className={styles.deltaLabel}>Спрямо целта</span>
              <span className={`${styles.deltaVal} ${isOver ? styles.over : isUnder ? styles.under : ''}`}>
                {analysis.delta > 0 ? '+' : ''}{analysis.delta.toLocaleString('bg-BG')} ккал
              </span>
            </div>
          </div>

          {analysis.delta === 0 ? (
            <p className={styles.perfect}>Точно на целта — няма какво да балансираш.</p>
          ) : (
            <>
              {/* Segmented day picker — one segment per day left until Sunday,
                  labelled with the day-of-week. Tapping a segment picks how
                  far the correction spreads; everything up to it fills. */}
              <div className={styles.pickerLabel}>
                Разпредели корекцията до <strong>неделя</strong>
              </div>
              <div className={styles.picker} role="radiogroup" aria-label="Дни за разпределяне">
                {upcoming.map(day => {
                  const on = spread >= day.idx
                  return (
                    <button
                      key={day.idx}
                      type="button"
                      role="radio"
                      aria-checked={spread === day.idx}
                      className={`${styles.pickerDay} ${on ? styles.pickerDayOn : ''} ${spread === day.idx ? styles.pickerDayEdge : ''}`}
                      onClick={() => setSpread(day.idx)}
                    >
                      <span className={styles.pickerLbl}>{day.label}</span>
                      <span className={styles.pickerNum}>{day.day}</span>
                      {day.isToday && <span className={styles.pickerToday}>днес</span>}
                    </button>
                  )
                })}
              </div>

              <div className={styles.suggestion}>
                <p className={styles.suggestionText}>
                  {isOver ? (
                    <>Изяде <strong>{analysis.delta.toLocaleString('bg-BG')} ккал</strong> над
                    целта. Следващите <strong>{spread}</strong> {spread === 1 ? 'ден' : 'дни'} поеми по:</>
                  ) : (
                    <>Изяде <strong>{Math.abs(analysis.delta).toLocaleString('bg-BG')} ккал</strong> под
                    целта. Следващите <strong>{spread}</strong> {spread === 1 ? 'ден' : 'дни'} поеми по:</>
                  )}
                </p>
                <p className={styles.suggestionValue}>
                  {suggested.toLocaleString('bg-BG')} ккал / ден
                </p>
                <p className={styles.suggestionHint}>
                  ({perDay > 0 ? '−' : '+'}{Math.abs(perDay).toLocaleString('bg-BG')} ккал спрямо обичайните {target.toLocaleString('bg-BG')})
                </p>

                <button
                  type="button"
                  className={`${styles.applyBtn} ${applied ? styles.applyBtnDone : ''}`}
                  onClick={applyNewTarget}
                  disabled={applying || applied}
                >
                  {applied ? '✓ Приложено' : applying ? '...' : 'Приложи като нова цел'}
                </button>
                <p className={styles.applyHint}>
                  Ще обнови дневната ти цел и макросите пропорционално. Можеш
                  да върнеш обратно от Калкулатора по всяко време.
                </p>
              </div>
            </>
          )}
        </>
      )}

      <p className={styles.footnote}>
        Броят се само дни, в които има логвана храна — празен ден = „не съм
        логнал", а не „не съм ял", и не влиза в сметката.
      </p>
    </div>
  )
}
