import { useState, useEffect } from 'react'
import { useSleepLogs } from '../hooks/useSleepLogs'
import styles from './Recovery.module.css'

const MONTHS_BG = ['яну','фев','мар','апр','май','юни','юли','авг','сеп','окт','ное','дек']

function StarRating({ value, onChange }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`${styles.star} ${n <= value ? styles.starOn : ''}`}
          onClick={() => onChange(n === value ? 0 : n)}
          aria-label={`${n} звезди`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function SleepChart({ logs }) {
  if (logs.length < 2) return null
  const recent = [...logs].reverse().slice(-14)
  const maxH = Math.max(...recent.map(l => l.duration_hours ?? 0), 10)
  const W = 300
  const H = 80
  const pad = 6

  const pts = recent.map((l, i) => {
    const x = pad + (i / (recent.length - 1)) * (W - pad * 2)
    const y = H - pad - ((l.duration_hours ?? 0) / maxH) * (H - pad * 2)
    return [x, y]
  })

  const pathD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} aria-hidden="true">
        <defs>
          <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffb74d" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffb74d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${pathD} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`}
          fill="url(#sleepGrad)"
        />
        <path d={pathD} stroke="#ffb74d" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#ffb74d" />
        ))}
      </svg>
      <div className={styles.chartLabels}>
        {recent.filter((_, i) => i % 3 === 0).map(l => {
          const d = new Date(l.date)
          return <span key={l.date} className={styles.chartLabel}>{d.getDate()} {MONTHS_BG[d.getMonth()]}</span>
        })}
      </div>
    </div>
  )
}

export default function Recovery() {
  const { logs, todayLog, loading, logSleep } = useSleepLogs()
  const [duration, setDuration] = useState('')
  const [quality, setQuality]   = useState(0)
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    if (todayLog) {
      setDuration(todayLog.duration_hours?.toString() ?? '')
      setQuality(todayLog.quality ?? 0)
      setNotes(todayLog.notes ?? '')
    }
  }, [todayLog])

  async function handleSave(e) {
    e.preventDefault()
    if (!duration && !quality) return
    setSaving(true)
    await logSleep({
      duration: duration ? parseFloat(duration) : null,
      quality:  quality  || null,
      notes,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const today = new Date().toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ВЪЗСТАНОВЯВАНЕ</h1>
        <p className={styles.date}>{today}</p>
      </header>

      {/* Sleep log */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>🌙 СЪН</h2>

        <form className={styles.form} onSubmit={handleSave}>
          <div className={styles.field}>
            <label className={styles.label}>Продължителност (часове)</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              max="24"
              step="0.5"
              placeholder="напр. 7.5"
              value={duration}
              onChange={e => setDuration(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Качество</label>
            <StarRating value={quality} onChange={setQuality} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Бележки (по желание)</label>
            <input
              className={styles.input}
              placeholder="напр. събуждал съм се нощем"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
            disabled={saving || (!duration && !quality)}
          >
            {saved ? '✓ Запазено' : saving ? '...' : 'Запази'}
          </button>
        </form>
      </section>

      {/* History chart */}
      {!loading && logs.length > 1 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>ИСТОРИЯ</h2>
          <SleepChart logs={logs} />

          <div className={styles.logList}>
            {logs.slice(0, 7).map(l => {
              const d = new Date(l.date)
              return (
                <div key={l.date} className={styles.logRow}>
                  <span className={styles.logDate}>
                    {d.getDate()} {MONTHS_BG[d.getMonth()]}
                  </span>
                  <span className={styles.logDur}>
                    {l.duration_hours != null ? `${l.duration_hours}ч` : '—'}
                  </span>
                  <span className={styles.logQuality}>
                    {l.quality ? '★'.repeat(l.quality) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
