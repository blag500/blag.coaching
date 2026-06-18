import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './LiftLogger.module.css'

// Simple SVG line chart for weight progression
function ProgressChart({ entries }) {
  if (entries.length < 2) return null

  const W = 280, H = 80, PAD = 8
  const weights = entries.map(e => e.weight).filter(w => w > 0)
  if (weights.length < 2) return null

  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1

  const pts = entries
    .filter(e => e.weight > 0)
    .map((e, i, arr) => {
      const x = PAD + (i / (arr.length - 1)) * (W - PAD * 2)
      const y = PAD + (1 - (e.weight - min) / range) * (H - PAD * 2)
      return `${x},${y}`
    })
    .join(' ')

  const lastEntry = entries.filter(e => e.weight > 0).at(-1)
  const [lx, ly] = pts.split(' ').at(-1).split(',').map(Number)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart}>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
      {entries.filter(e => e.weight > 0).map((e, i, arr) => {
        const x = PAD + (i / (arr.length - 1)) * (W - PAD * 2)
        const y = PAD + (1 - (e.weight - min) / range) * (H - PAD * 2)
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" />
      })}
      <text x={lx} y={ly - 7} textAnchor="middle" fontSize="9" fill="var(--accent)" fontFamily="var(--font-body)">
        {lastEntry?.weight}kg
      </text>
    </svg>
  )
}

export default function LiftLogger({ exercise, date, onClose, onSaved }) {
  const { user, addExerciseLog } = useAuth()
  const todayStr   = new Date().toISOString().slice(0, 10)
  const logDate    = date || todayStr
  const isOtherDate = logDate !== todayStr

  const [weight, setWeight] = useState('')
  const [reps, setReps]     = useState('')
  const [sets, setSets]     = useState('')
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('exercise_logs')
      .select('date, weight, reps, sets')
      .eq('user_id', user.id)
      .eq('exercise_name', exercise.name)
      .order('date', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setHistory(data) })
  }, [user?.id, exercise.name])

  async function handleSave() {
    if (!weight || !reps) return
    setSaving(true)
    const { data } = await addExerciseLog(exercise.name, weight, reps, sets, notes, logDate)
    setSaving(false)
    setSaved(true)
    const w = parseFloat(weight)
    setHistory(prev => [
      { date: logDate, weight: w, reps: parseInt(reps), sets: parseInt(sets) || null },
      ...prev,
    ])
    if (data?.id) onSaved?.({ id: data.id, exerciseName: exercise.name, weight: w })
    setTimeout(() => { setSaved(false); onClose() }, 1400)
  }

  // Chart needs entries in chronological order
  const chartEntries = [...history].reverse()

  return (
    <div className={styles.modal}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.content}>
        <h3 className={styles.title}>{exercise.name}</h3>
        {exercise.sets && (
          <p className={styles.target}>Цел: {exercise.sets} серии × {exercise.reps} повт.</p>
        )}
        {isOtherDate && (
          <p className={styles.dateNote}>
            📅 За {new Date(logDate + 'T12:00:00').toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        )}

        <div className={styles.fields}>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Тегло (kg)</label>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="20.5"
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Повторения</label>
              <input
                className={styles.input}
                type="number"
                inputMode="numeric"
                min="0"
                value={reps}
                onChange={e => setReps(e.target.value)}
                placeholder="8"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Серии</label>
              <input
                className={styles.input}
                type="number"
                inputMode="numeric"
                min="0"
                value={sets}
                onChange={e => setSets(e.target.value)}
                placeholder={exercise.sets || '3'}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Бележки (опционално)</label>
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Чувствах се добре..."
              rows="2"
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose} type="button">Отмени</button>
          <button
            className={`${styles.save} ${saved ? styles.saveDone : ''}`}
            onClick={handleSave}
            disabled={saving || !weight || !reps}
            type="button"
          >
            {saving ? '...' : saved ? '✓ Записано' : 'Запази'}
          </button>
        </div>

        {/* Progression */}
        {history.length > 0 && (
          <div className={styles.history}>
            <p className={styles.historyTitle}>ПРОГРЕСИЯ</p>
            {chartEntries.filter(e => e.weight > 0).length >= 2 && (
              <ProgressChart entries={chartEntries} />
            )}
            <table className={styles.histTable}>
              <thead>
                <tr>
                  <th className={styles.histTh}>Дата</th>
                  <th className={styles.histTh}>Тегло</th>
                  <th className={styles.histTh}>Повт.</th>
                  <th className={styles.histTh}>Сер.</th>
                </tr>
              </thead>
              <tbody>
                {history.map((e, i) => (
                  <tr key={i} className={styles.histRow}>
                    <td className={styles.histTd}>{e.date?.slice(5)}</td>
                    <td className={styles.histTd}>{e.weight ? `${e.weight}kg` : '—'}</td>
                    <td className={styles.histTd}>{e.reps ?? '—'}</td>
                    <td className={styles.histTd}>{e.sets ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
