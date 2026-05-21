import { useState, useEffect } from 'react'
import { useSleepLogs, calcReadiness } from '../hooks/useSleepLogs'
import styles from './Recovery.module.css'

const MONTHS_BG = ['яну','фев','мар','апр','май','юни','юли','авг','сеп','окт','ное','дек']
const HYDRATION_TARGET = 8

// ── Readiness ring ────────────────────────────────────────────────────────────

function readinessColor(score) {
  if (score >= 80) return '#81C784'
  if (score >= 60) return '#ffb74d'
  if (score >= 40) return '#ff8a65'
  return '#ef5350'
}

function ReadinessRing({ score }) {
  if (score === null) return (
    <div className={styles.ringWrap}>
      <div className={styles.ringEmpty}>
        <span className={styles.ringEmptyLabel}>Попълни формата</span>
      </div>
    </div>
  )
  const color = readinessColor(score)
  const r = 44
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className={styles.ringWrap}>
      <svg viewBox="0 0 100 100" width="120" height="120" className={styles.ringSvg}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fill={color} fontSize="22" fontFamily="'Bebas Neue', sans-serif" letterSpacing="1">{score}</text>
        <text x="50" y="60" textAnchor="middle" fill="rgba(242,232,207,0.4)" fontSize="8" fontFamily="'JetBrains Mono', monospace">ГОТОВНОСТ</text>
      </svg>
    </div>
  )
}

// ── Star rating (sleep quality) ───────────────────────────────────────────────

function StarRating({ value, onChange }) {
  return (
    <div className={styles.stars}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          className={`${styles.star} ${n <= value ? styles.starOn : ''}`}
          onClick={() => onChange(n === value ? 0 : n)}
        >★</button>
      ))}
    </div>
  )
}

// ── Scale 1–5 (energy / stress / soreness) ────────────────────────────────────

function ScaleRating({ value, onChange, labels }) {
  return (
    <div className={styles.scaleWrap}>
      <div className={styles.scale}>
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button"
            className={`${styles.scaleBtn} ${value === n ? styles.scaleBtnOn : ''}`}
            onClick={() => onChange(n === value ? 0 : n)}
          >{n}</button>
        ))}
      </div>
      <div className={styles.scaleLabels}>
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
      </div>
    </div>
  )
}

// ── Mood picker ───────────────────────────────────────────────────────────────

const MOODS = ['😫','😕','😐','🙂','😄']

function MoodPicker({ value, onChange }) {
  return (
    <div className={styles.moodRow}>
      {MOODS.map((emoji, i) => {
        const v = i + 1
        return (
          <button key={v} type="button"
            className={`${styles.moodBtn} ${value === v ? styles.moodBtnOn : ''}`}
            onClick={() => onChange(v === value ? 0 : v)}
          >{emoji}</button>
        )
      })}
    </div>
  )
}

// ── Hydration counter ─────────────────────────────────────────────────────────

function HydrationCounter({ value, onChange }) {
  return (
    <div className={styles.hydrationWrap}>
      <div className={styles.hydrationGlasses}>
        {Array.from({ length: HYDRATION_TARGET }, (_, i) => (
          <button key={i} type="button"
            className={`${styles.glass} ${i < value ? styles.glassFull : ''}`}
            onClick={() => onChange(i < value ? i : i + 1)}
            aria-label={`${i + 1} чаши`}
          >💧</button>
        ))}
      </div>
      <div className={styles.hydrationControls}>
        <button type="button" className={styles.hydBtn}
          onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <span className={styles.hydCount}>{value} / {HYDRATION_TARGET}</span>
        <button type="button" className={styles.hydBtn}
          onClick={() => onChange(Math.min(HYDRATION_TARGET, value + 1))}>+</button>
      </div>
    </div>
  )
}

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ log }) {
  const d = new Date(log.date)
  const score = calcReadiness(log)
  const color = score !== null ? readinessColor(score) : null
  return (
    <div className={styles.histRow}>
      <span className={styles.histDate}>{d.getDate()} {MONTHS_BG[d.getMonth()]}</span>
      {score !== null
        ? <span className={styles.histScore} style={{ color }}>{score}</span>
        : <span className={styles.histScore} style={{ color: 'rgba(242,232,207,0.2)' }}>—</span>
      }
      <span className={styles.histSleep}>{log.duration_hours != null ? `${log.duration_hours}ч` : '—'}</span>
      <span className={styles.histMood}>{log.mood ? MOODS[log.mood - 1] : '—'}</span>
      <span className={styles.histHyd}>{log.hydration_glasses != null ? `${log.hydration_glasses}💧` : '—'}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Recovery() {
  const { logs, todayLog, loading, logSleep } = useSleepLogs()

  const [duration,   setDuration]   = useState('')
  const [quality,    setQuality]    = useState(0)
  const [hydration,  setHydration]  = useState(0)
  const [energy,     setEnergy]     = useState(0)
  const [stress,     setStress]     = useState(0)
  const [soreness,   setSoreness]   = useState(0)
  const [mood,       setMood]       = useState(0)
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    if (!todayLog) return
    setDuration(todayLog.duration_hours?.toString() ?? '')
    setQuality(todayLog.quality ?? 0)
    setHydration(todayLog.hydration_glasses ?? 0)
    setEnergy(todayLog.energy ?? 0)
    setStress(todayLog.stress ?? 0)
    setSoreness(todayLog.soreness ?? 0)
    setMood(todayLog.mood ?? 0)
    setNotes(todayLog.notes ?? '')
  }, [todayLog])

  const liveScore = calcReadiness({
    quality,
    energy:   energy   || null,
    stress:   stress   || null,
    soreness: soreness || null,
    mood:     mood     || null,
  })

  const hasAnyValue = duration || quality || hydration || energy || stress || soreness || mood

  async function handleSave(e) {
    e.preventDefault()
    if (!hasAnyValue) return
    setSaving(true)
    await logSleep({
      duration_hours:    duration ? parseFloat(duration) : null,
      quality:           quality   || null,
      hydration_glasses: hydration || null,
      energy:            energy    || null,
      stress:            stress    || null,
      soreness:          soreness  || null,
      mood:              mood      || null,
      notes:             notes.trim() || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const today = new Date().toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ВЪЗСТАНОВЯВАНЕ</h1>
        <p className={styles.date}>{today}</p>
      </header>

      {/* Readiness ring */}
      <ReadinessRing score={liveScore} />

      <form className={styles.form} onSubmit={handleSave}>

        {/* Sleep */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>🌙 СЪН</h2>
          <div className={styles.field}>
            <label className={styles.label}>Продължителност (часове)</label>
            <input className={styles.input} type="number" min="0" max="24" step="0.5"
              placeholder="напр. 7.5" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Качество</label>
            <StarRating value={quality} onChange={setQuality} />
          </div>
        </section>

        {/* Hydration */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>💧 ХИДРАТАЦИЯ</h2>
          <HydrationCounter value={hydration} onChange={setHydration} />
        </section>

        {/* Energy */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>⚡ ЕНЕРГИЯ</h2>
          <ScaleRating value={energy} onChange={setEnergy} labels={['Изтощен', 'Заредени']} />
        </section>

        {/* Stress */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>🧠 СТРЕС</h2>
          <ScaleRating value={stress} onChange={setStress} labels={['Без стрес', 'Много висок']} />
        </section>

        {/* Soreness */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>💪 МУСКУЛНА УМОРА</h2>
          <ScaleRating value={soreness} onChange={setSoreness} labels={['Без умора', 'Много силна']} />
        </section>

        {/* Mood */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>😊 НАСТРОЕНИЕ</h2>
          <MoodPicker value={mood} onChange={setMood} />
        </section>

        {/* Notes */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>📝 БЕЛЕЖКИ</h2>
          <input className={styles.input} placeholder="Как се чувстваш днес?"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </section>

        <button type="submit"
          className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
          disabled={saving || !hasAnyValue}
        >
          {saved ? '✓ Запазено' : saving ? '...' : 'Запази деня'}
        </button>
      </form>

      {/* History */}
      {!loading && logs.length > 0 && (
        <section className={styles.histSection}>
          <h2 className={styles.histTitle}>ИСТОРИЯ</h2>
          <div className={styles.histHeader}>
            <span className={styles.histDate}>Дата</span>
            <span className={styles.histScore}>Готов.</span>
            <span className={styles.histSleep}>Сън</span>
            <span className={styles.histMood}>Настр.</span>
            <span className={styles.histHyd}>Вода</span>
          </div>
          {logs.slice(0, 14).map(l => <HistoryRow key={l.date} log={l} />)}
        </section>
      )}
    </div>
  )
}
