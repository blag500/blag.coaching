import { useState } from 'react'
import { useHabitHistory } from '../../hooks/useHabitHistory'
import Pictogram from '../Pictogram/Pictogram'
import styles from './HabitCalendar.module.css'
import { useSettings } from '../../contexts/SettingsContext'



function pad(n) { return String(n).padStart(2, '0') }
function dateStr(year, month, day) { return `${year}-${pad(month + 1)}-${pad(day)}` }

/* Преливка, не плосък цвят.
   Плоското квадратче казва само „толкова"; същият тон, който се спуска надолу,
   дава на клетката дебелина и месецът престава да е таблица с оцветени полета. */
function cellColor(ratio) {
  if (ratio === null || ratio === 0) return 'var(--surface-2)'
  if (ratio < 0.5) return 'linear-gradient(160deg, rgba(var(--accent-rgb),0.30), rgba(var(--accent-rgb),0.12))'
  if (ratio < 1)   return 'linear-gradient(160deg, rgba(var(--accent-rgb),0.68), rgba(var(--accent-rgb),0.38))'
  return 'linear-gradient(160deg, var(--accent), rgba(var(--accent-rgb),0.72))'
}

export default function HabitCalendar() {
  const { t } = useSettings()
  const history = useHabitHistory()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const todayStr = dateStr(now.getFullYear(), now.getMonth(), now.getDate())

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
    if (isCurrentMonth) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Monday=0 offset (getDay: 0=Sun,1=Mon,...,6=Sat → Mon-indexed: (d+6)%7)
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7

  const cells = []
  for (let i = 0; i < firstDayOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const perfectDays = Array.from(history.entries()).filter(([date, v]) => {
    const [y, m] = date.split('-').map(Number)
    return y === year && m === month + 1 && v.completed === v.total
  }).length

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <button className={styles.arrow} onClick={prevMonth} aria-label={t('hc.prevMonth')}>◀</button>
        <span className={styles.monthLabel}>{t(`months.${month}`)} {year}</span>
        <button
          className={styles.arrow}
          onClick={nextMonth}
          aria-label={t('hc.nextMonth')}
          disabled={isCurrentMonth}
        >▶</button>
      </div>

      <div className={styles.dayLabels}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => <span key={i} className={styles.dayLabel}>{t(`daysMon.${i}`)}</span>)}
      </div>

      <div className={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className={styles.empty} />
          const ds = dateStr(year, month, day)
          const entry = history.get(ds)
          const ratio = entry ? entry.completed / entry.total : null
          const isToday = ds === todayStr
          return (
            <div
              key={ds}
              className={`${styles.cell} ${isToday ? styles.today : ''}`}
              /* Днешният ден си носи фона от стила; тук не се пише, за да
                 няма нужда после да се надвиква с !important. */
              style={isToday ? undefined : { background: cellColor(ratio) }}
              title={entry ? `${entry.completed}/${entry.total}` : ''}
              aria-label={t('hc.dayAria', { day, detail: entry ? t('hc.dayDone', { done: entry.completed, total: entry.total }) : t('hc.dayNone') })}
            >
              <span className={styles.dayNum}>{day}</span>
              {/* Отметка на изкарания докрай ден. Цветът сам казва „почти" и
                  „докрай" с два тона, които се различават само един до друг;
                  знакът го казва и на ден, който стои сам. */}
              {ratio === 1 && (
                <span className={styles.cellCheck}><Pictogram name="check" size={9} /></span>
              )}
            </div>
          )
        })}
      </div>

      <p className={styles.summary}>
        {perfectDays > 0
          ? t('hc.perfect', { n: perfectDays })
          : t('hc.hint')}
      </p>
    </div>
  )
}
