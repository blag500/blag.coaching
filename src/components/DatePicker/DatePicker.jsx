import { useState, useEffect, useRef } from 'react'
import styles from './DatePicker.module.css'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function DatePicker({ selectedDate, onChange }) {
  const [showCal, setShowCal] = useState(false)
  const wrapRef = useRef(null)

  function shiftDate(days) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    const next = d.toISOString().slice(0, 10)
    if (next <= todayStr()) onChange(next)
  }

  function selectDate(dateStr) {
    onChange(dateStr)
    setShowCal(false)
  }

  useEffect(() => {
    if (!showCal) return
    function handlePointer(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowCal(false)
      }
    }
    document.addEventListener('pointerdown', handlePointer)
    return () => document.removeEventListener('pointerdown', handlePointer)
  }, [showCal])

  const isToday = selectedDate === todayStr()
  const label = new Date(selectedDate + 'T12:00:00').toLocaleDateString('bg-BG', {
    weekday: 'short', day: 'numeric', month: 'long',
  })

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div className={styles.nav}>
        <button className={styles.arrowBtn} onClick={() => shiftDate(-1)} type="button" aria-label="Предишен ден">‹</button>
        <button
          className={`${styles.labelBtn} ${showCal ? styles.labelBtnOpen : ''}`}
          onClick={() => setShowCal(v => !v)}
          type="button"
        >
          {label}
        </button>
        <button className={styles.arrowBtn} onClick={() => shiftDate(1)} disabled={isToday} type="button" aria-label="Следващ ден">›</button>
        {!isToday && (
          <button
            className={styles.todayBtn}
            onClick={() => { onChange(todayStr()); setShowCal(false) }}
            type="button"
          >
            ДНЕС
          </button>
        )}
      </div>
      {showCal && <MiniCal selectedDate={selectedDate} onSelect={selectDate} />}
    </div>
  )
}

function MiniCal({ selectedDate, onSelect }) {
  const today = todayStr()
  const init = new Date(selectedDate + 'T12:00:00')
  const [year, setYear] = useState(init.getFullYear())
  const [month, setMonth] = useState(init.getMonth())

  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const now = new Date()
  const canNext = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())

  function prev() {
    const d = new Date(year, month - 1, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }
  function next() {
    if (!canNext) return
    const d = new Date(year, month + 1, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' })

  return (
    <div className={styles.calWrap}>
      <div className={styles.calHeader}>
        <button className={styles.calNavBtn} onClick={prev} type="button">‹</button>
        <span className={styles.calMonthLabel}>{monthLabel}</span>
        <button className={styles.calNavBtn} onClick={next} disabled={!canNext} type="button">›</button>
      </div>
      <div className={styles.calGrid}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => (
          <span key={d} className={styles.calWeekDay}>{d}</span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isFuture = dateStr > today
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === today
          return (
            <button
              key={dateStr}
              className={`${styles.calDay} ${isSelected ? styles.calDaySelected : ''} ${isToday && !isSelected ? styles.calDayToday : ''}`}
              onClick={() => onSelect(dateStr)}
              disabled={isFuture}
              type="button"
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
