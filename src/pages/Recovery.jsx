import { useState, useEffect, useMemo } from 'react'
import { useSleepLogs, calcReadiness } from '../hooks/useSleepLogs'
import { useWaterLog } from '../hooks/useWaterLog'
import ReadinessWidget from '../components/ReadinessWidget/ReadinessWidget'
import { useSettings } from '../contexts/SettingsContext'
import styles from './Recovery.module.css'
import { loc, monthNames, dayNames } from '../utils/locale'

/* Имената идват от Intl, не от закован масив: списък, който трябва да се
   допише при всеки нов език, е списък, който някой ще забрави. */
const HYDRATION_TARGET = 8

// ── Readiness ring ────────────────────────────────────────────────────────────

function readinessColor(score) {
  if (score >= 80) return '#81C784'
  if (score >= 60) return 'var(--accent)'
  if (score >= 40) return '#ff8a65'
  return '#ef5350'
}

function ReadinessRing({ score }) {
  const { t } = useSettings()
  if (score === null) return (
    <div className={styles.ringWrap}>
      <div className={styles.ringEmpty}>
        <span className={styles.ringEmptyLabel}>{t('rec.fillForm')}</span>
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
        <text x="50" y="46" textAnchor="middle" fill={color} fontSize="22" fontFamily="var(--font-heading)" letterSpacing="1">{score}</text>
        {/* Not "readiness": this follows the sliders below and is only the
            check-in, while readiness weighs it together with food, habits,
            water and training. Two rings labelled the same thing, showing two
            different numbers, is how the screen was reading before. */}
        <text x="50" y="60" textAnchor="middle" style={{ fill: 'rgba(var(--text-rgb), 0.4)' }} fontSize="8" fontFamily="var(--font-body)">{t('rec.checkin')}</text>
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
  const { t } = useSettings()
  return (
    <div className={styles.hydrationWrap}>
      <div className={styles.hydrationGlasses}>
        {Array.from({ length: HYDRATION_TARGET }, (_, i) => (
          <button key={i} type="button"
            className={`${styles.glass} ${i < value ? styles.glassFull : ''}`}
            onClick={() => onChange(i < value ? i : i + 1)}
            aria-label={t('rec.glassesAria', { n: i + 1 })}
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

// ── Recovery calendar ─────────────────────────────────────────────────────────

function RecoveryCalendar({ logs }) {
  const { t } = useSettings()
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const todayStr = today.toISOString().slice(0, 10)

  const logMap = useMemo(() => {
    const m = {}
    logs.forEach(l => { m[l.date] = l })
    return m
  }, [logs])

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7 // Mon = 0

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const mm      = String(month + 1).padStart(2, '0')
    const dd      = String(d).padStart(2, '0')
    const dateStr = `${year}-${mm}-${dd}`
    cells.push({ day: d, dateStr, log: logMap[dateStr] ?? null })
  }

  return (
    <div className={styles.cal}>
      <div className={styles.calHeader}>
        <button className={styles.calNav} onClick={prev} type="button">‹</button>
        <span className={styles.calTitle}>{monthNames('long')[month]} {year}</span>
        <button className={styles.calNav} onClick={next} type="button">›</button>
      </div>
      <div className={styles.calDow}>
        {dayNames('short').map(d => <span key={d} className={styles.calDowCell}>{d}</span>)}
      </div>
      <div className={styles.calGrid}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} />
          const score = cell.log ? calcReadiness(cell.log) : null
          const dotColor = score !== null ? readinessColor(score) : null
          return (
            <div key={cell.dateStr}
              className={`${styles.calDay} ${cell.dateStr === todayStr ? styles.calToday : ''}`}
            >
              <span className={styles.calNum}>{cell.day}</span>
              {dotColor && (
                <span className={styles.calDot} style={{ background: dotColor }} />
              )}
            </div>
          )
        })}
      </div>
      <div className={styles.calLegend}>
        {[['#81C784', t('rec.legend.great')], ['var(--accent)', t('rec.legend.good')], ['#ff8a65', t('rec.legend.mid')], ['#ef5350', t('rec.legend.low')]].map(([color, label]) => (
          <span key={color} className={styles.calLegendItem}>
            <span className={styles.calDot} style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ log }) {
  const { t } = useSettings()
  const d = new Date(log.date)
  const score = calcReadiness(log)
  const color = score !== null ? readinessColor(score) : null
  return (
    <div className={styles.histRow}>
      <span className={styles.histDate}>{d.getDate()} {monthNames('short')[d.getMonth()]}</span>
      {score !== null
        ? <span className={styles.histScore} style={{ color }}>{score}</span>
        : <span className={styles.histScore} style={{ color: 'rgba(var(--text-rgb), 0.2)' }}>—</span>
      }
      <span className={styles.histSleep}>{log.duration_hours != null ? t('rec.hoursShort', { n: log.duration_hours }) : '—'}</span>
      <span className={styles.histMood}>{log.mood ? MOODS[log.mood - 1] : '—'}</span>
      <span className={styles.histHyd}>{log.hydration_glasses != null ? `${log.hydration_glasses}💧` : '—'}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Recovery() {
  const { t } = useSettings()
  const { logs, todayLog, loading, logSleep } = useSleepLogs()
  const { glasses: waterGlasses, set: setWater } = useWaterLog()

  const [duration,   setDuration]   = useState('')
  const [quality,    setQuality]    = useState(0)
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

  const hasAnyValue = duration || quality || energy || stress || soreness || mood

  async function handleSave(e) {
    e.preventDefault()
    if (!hasAnyValue) return
    setSaving(true)
    await logSleep({
      duration_hours:    duration ? parseFloat(duration) : null,
      quality:           quality   || null,
      hydration_glasses: waterGlasses || null,
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

  const today = new Date().toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('nav.recovery')}</h1>
        <p className={styles.date}>{today}</p>
      </header>

      {/* Readiness ring — live, following the sliders as they move. */}
      <ReadinessRing score={liveScore} />

      {/* The breakdown the dashboard card deliberately leaves out. This is the
          screen you arrive at after asking why, so this is where "why" belongs.

          Without its own ring: the one above is live and follows the sliders as
          you fill the form, and two rings showing two different numbers for the
          same thing is worse than showing neither. */}
      <div className={styles.breakdown}>
        <ReadinessWidget detailed ring={false} />
      </div>

      <form className={styles.form} onSubmit={handleSave}>

        {/* Sleep */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>🌙 {t('rec.sleep')}</h2>
          <div className={styles.field}>
            <label className={styles.label}>{t('rec.duration')}</label>
            <input className={styles.input} type="number" min="0" max="24" step="0.5"
              placeholder={t('rec.durationPh')} value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('rec.quality')}</label>
            <StarRating value={quality} onChange={setQuality} />
          </div>
        </section>

        {/* Hydration — auto-saves via useWaterLog on each click */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>💧 {t('rec.hydration')}</h2>
          <HydrationCounter value={waterGlasses} onChange={setWater} />
        </section>

        {/* Energy */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>⚡ {t('rec.energy')}</h2>
          <ScaleRating value={energy} onChange={setEnergy} labels={[t('rec.energyLow'), t('rec.energyHigh')]} />
        </section>

        {/* Stress */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>🧠 {t('rec.stress')}</h2>
          <ScaleRating value={stress} onChange={setStress} labels={[t('rec.stressLow'), t('rec.stressHigh')]} />
        </section>

        {/* Soreness */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>💪 {t('rec.soreness')}</h2>
          {/* Едно изречение, защото числото се прилага върху всички мускулни
              групи еднакво. Докато полето питаше за мускулна умора, крепатурата
              в гърдите от вчера сваляше готовността за днешния краков ден. */}
          <p className={styles.cardHint}>{t('rec.sorenessHint')}</p>
          <ScaleRating value={soreness} onChange={setSoreness} labels={[t('rec.sorenessLow'), t('rec.sorenessHigh')]} />
        </section>

        {/* Mood */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>😊 {t('rec.mood')}</h2>
          <MoodPicker value={mood} onChange={setMood} />
        </section>

        {/* Notes */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>📝 {t('rec.notes')}</h2>
          <input className={styles.input} placeholder={t('rec.notesPh')}
            value={notes} onChange={e => setNotes(e.target.value)} />
        </section>

        <button type="submit"
          className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
          disabled={saving || !hasAnyValue}
        >
          {saved ? t('rec.saved') : saving ? '...' : t('rec.saveDay')}
        </button>
      </form>

      {/* Calendar */}
      {!loading && logs.length > 0 && (
        <section className={styles.calSection}>
          <h2 className={styles.calSectionTitle}>{t('rec.calendar')}</h2>
          <RecoveryCalendar logs={logs} />
        </section>
      )}

      {/* History */}
      {!loading && logs.length > 0 && (
        <section className={styles.histSection}>
          <h2 className={styles.histTitle}>{t('rec.history')}</h2>
          <div className={styles.histHeader}>
            <span className={styles.histDate}>{t('rec.col.date')}</span>
            <span className={styles.histScore}>{t('rec.col.score')}</span>
            <span className={styles.histSleep}>{t('rec.col.sleep')}</span>
            <span className={styles.histMood}>{t('rec.col.mood')}</span>
            <span className={styles.histHyd}>{t('rec.col.water')}</span>
          </div>
          {logs.slice(0, 14).map(l => <HistoryRow key={l.date} log={l} />)}
        </section>
      )}
    </div>
  )
}
