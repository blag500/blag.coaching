import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import Pictogram from '../Pictogram/Pictogram'
import styles from './CarryDay.module.css'
import { loc } from '../../utils/locale'

/**
 * Пренасяне на цял ден храна.
 *
 * Повечето хора ядат почти едно и също, а повторното вписване е работата,
 * заради която се отказват към третата седмица. Дотук имаше картичка „пренеси
 * от вчера", но тя се показваше само при празен ден и сама решаваше кой ден да
 * вземе — най-скорошният с храна. Значи: не можеше да се избере неделята, в
 * която си ял както трябва, ако вчера си хапнал един банан.
 *
 * Сега е раздел като останалите. Показва последните дни с храна — с колко реда
 * и колко калории са били — и човекът избира. Изборът е в две стъпки нарочно:
 * първо се вижда какво има в деня, после се пренася. Бутон, който дублира деня
 * с едно натискане, е капан, а не пряк път.
 *
 * Храненията се пазят: закуската отива в закуска. Полето е в реда още от 086 —
 * дотук просто не се четеше и всичко се събираше под едно.
 */

const DAYS_BACK = 30

function isoDay(offset) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

export default function CarryDay({ onAddRaw, date }) {
  const { user } = useAuth()
  const { t } = useSettings()
  const [days, setDays]   = useState(null)   // [{ date, rows, kcal }]
  const [pick, setPick]   = useState(null)
  const [busy, setBusy]   = useState(false)
  const [done, setDone]   = useState(0)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    supabase
      .from('food_logs')
      .select('date, name, grams, kcal, protein, carbs, fat, meal_type')
      .eq('user_id', user.id)
      .gte('date', isoDay(DAYS_BACK))
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        const by = new Map()
        for (const r of data ?? []) {
          /* Денят, който гледаш, не се пренася в себе си. */
          if (r.date === date) continue
          if (!by.has(r.date)) by.set(r.date, [])
          by.get(r.date).push(r)
        }
        setDays([...by.entries()]
          .map(([d, rows]) => ({
            date: d,
            rows,
            kcal: Math.round(rows.reduce((s, r) => s + (Number(r.kcal) || 0), 0)),
          }))
          .sort((a, b) => b.date.localeCompare(a.date)))
      }, () => setDays([]))

    return () => { cancelled = true }
  }, [user?.id, date])

  async function carry(day) {
    if (busy) return
    setBusy(true)
    setDone(0)
    /* Един по един, не наведнъж: всяко вписване е оптимистично в дневника и
       десет успоредни заявки нареждат списъка в случаен ред. */
    for (const r of day.rows) {
      await onAddRaw({
        name: r.name,
        grams: r.grams,
        kcal: r.kcal,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        /* null значи „вписано без хранене" и се пренася както си е. */
        mealType: r.meal_type ?? null,
      })
      setDone(n => n + 1)
    }
    haptic('celebrate')
    setBusy(false)
    setPick(null)
  }

  function label(d) {
    const when = new Date(d + 'T12:00:00')
    const diff = Math.round((new Date(date + 'T12:00:00') - when) / 86400000)
    if (diff === 1) return t('carry.yesterday')
    return when.toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (days === null) return <p className={styles.empty}>…</p>
  if (!days.length)  return <p className={styles.empty}>{t('carry.none')}</p>

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>{t('carry.hint')}</p>

      {days.map(day => (
        <div key={day.date} className={styles.day}>
          <button
            type="button"
            className={styles.dayHead}
            onClick={() => { haptic('tap'); setPick(pick === day.date ? null : day.date) }}
            aria-expanded={pick === day.date}
          >
            <span className={styles.dayName}>{label(day.date)}</span>
            <span className={styles.dayMeta}>
              {t('carry.meta', {
                n: day.rows.length,
                noun: t(day.rows.length === 1 ? 'carry.record.one' : 'carry.record.other'),
                kcal: day.kcal,
              })}
            </span>
            <Pictogram name="calendar" size={16} />
          </button>

          {/* Първо се вижда какво има в деня, после се пренася: човек, който
              дублира деня си, го прави нарочно или не го прави. */}
          {pick === day.date && (
            <div className={styles.detail}>
              <ul className={styles.rows}>
                {day.rows.map((r, i) => (
                  <li key={i}>
                    <span>{r.name}</span>
                    <span className={styles.rowKcal}>{Math.round(r.kcal)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={styles.go}
                onClick={() => carry(day)}
                disabled={busy}
              >
                {busy
                  ? t('carry.working', { done, total: day.rows.length })
                  : t('carry.go', { n: day.rows.length })}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
