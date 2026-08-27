import { useState } from 'react'
import { useHabitHistory } from '../../hooks/useHabitHistory'
import styles from './HabitCalendar.module.css'
import { useSettings } from '../../contexts/SettingsContext'



function pad(n) { return String(n).padStart(2, '0') }
function dateStr(year, month, day) { return `${year}-${pad(month + 1)}-${pad(day)}` }

function cellColor(ratio) {
  if (ratio === null) return 'var(--surface-2)'
  if (ratio === 0)    return 'var(--surface-2)'
  if (ratio < 0.5)   return 'rgba(var(--accent-rgb),0.2)'
  if (ratio < 1)     return 'rgba(var(--accent-rgb),0.55)'
  return 'var(--accent)'
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
              style={{ background: cellColor(ratio) }}
              title={entry ? `${entry.completed}/${entry.total}` : ''}
              aria-label={t('hc.dayAria', { day, detail: entry ? t('hc.dayDone', { done: entry.completed, total: entry.total }) : t('hc.dayNone') })}
            >
              <span className={styles.dayNum}>{day}</span>
              {isToday && <span className={styles.todayDot} />}
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
