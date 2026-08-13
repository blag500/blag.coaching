import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './DayLog.module.css'

/**
 * A day's exercises, opened from the calendar and written to in place.
 *
 * Progression could be read but not recorded here: logging lived at the top of
 * the page behind a modal, while the record of what was done lived at the
 * bottom. Opening a day and typing into it is the same gesture as reading it,
 * so it belongs in the same place.
 *
 * Rows already logged arrive filled in and stay editable — a set entered wrong
 * is the most common thing anyone needs to fix, and it should not require
 * finding another screen.
 */
export default function DayLog({ date, blockLabels, blocks, onLogged }) {
  const { user } = useAuth()
  const [rows, setRows]   = useState({})   // exercise name → { id, weight, reps, sets }
  const [busy, setBusy]   = useState(null)
  const [saved, setSaved] = useState(null)

  // Which exercises belong to the blocks trained that day.
  const exercises = (blocks ?? [])
    .filter(b => blockLabels.includes(b.label))
    .flatMap(b => (b.exercises ?? []).map(e => ({ ...e, block: b.label })))

  const load = useCallback(() => {
    if (!user?.id) return
    supabase
      .from('exercise_logs')
      .select('id, exercise_name, weight, reps, sets')
      .eq('user_id', user.id)
      .eq('date', date)
      .then(({ data }) => {
        const m = {}
        for (const r of data ?? []) {
          // Newest wins if a lift was logged more than once that day.
          m[r.exercise_name] = {
            id: r.id,
            weight: r.weight ?? '',
            reps:   r.reps   ?? '',
            sets:   r.sets   ?? '',
          }
        }
        setRows(m)
      })
  }, [user?.id, date])

  useEffect(() => { load() }, [load])

  function edit(name, field, value) {
    setRows(prev => ({ ...prev, [name]: { ...prev[name], [field]: value } }))
  }

  async function save(name) {
    const r = rows[name]
    if (!user || !r?.weight) return
    setBusy(name)

    const payload = {
      user_id: user.id,
      date,
      exercise_name: name,
      weight: parseFloat(r.weight) || 0,
      reps:   parseInt(r.reps) || null,
      sets:   parseInt(r.sets) || null,
    }

    // Update in place when the row already exists, so editing a mistake does
    // not leave the wrong figure behind alongside the correction.
    const { data, error } = r.id
      ? await supabase.from('exercise_logs').update(payload).eq('id', r.id).select().single()
      : await supabase.from('exercise_logs').insert(payload).select().single()

    setBusy(null)
    if (error) return
    setRows(prev => ({ ...prev, [name]: { ...prev[name], id: data.id } }))
    setSaved(name)
    setTimeout(() => setSaved(s => (s === name ? null : s)), 1800)
    onLogged?.()
  }

  async function clear(name) {
    const r = rows[name]
    if (!r?.id) return
    setBusy(name)
    await supabase.from('exercise_logs').delete().eq('id', r.id)
    setBusy(null)
    setRows(prev => ({ ...prev, [name]: { weight: '', reps: '', sets: '' } }))
    onLogged?.()
  }

  if (!exercises.length) {
    return <p className={styles.empty}>Няма упражнения за този блок.</p>
  }

  return (
    <div className={styles.wrap}>
      {exercises.map(ex => {
        const r = rows[ex.name] ?? {}
        const logged = !!r.id
        return (
          <div key={`${ex.block}-${ex.name}`} className={styles.row}>
            <div className={styles.head}>
              <span className={styles.name}>{ex.name}</span>
              <span className={styles.target}>{ex.sets} × {ex.reps}</span>
            </div>

            <div className={styles.inputs}>
              {[
                { k: 'weight', unit: 'кг',   ph: '0' },
                { k: 'reps',   unit: 'повт', ph: String(ex.reps ?? '') },
                { k: 'sets',   unit: 'сер',  ph: String(ex.sets ?? '') },
              ].map(f => (
                <label key={f.k} className={styles.field}>
                  <input
                    className={styles.input}
                    type="number" min="0" step={f.k === 'weight' ? '0.5' : '1'}
                    inputMode="decimal"
                    value={r[f.k] ?? ''}
                    placeholder={f.ph}
                    onChange={e => edit(ex.name, f.k, e.target.value)}
                    aria-label={`${ex.name} ${f.unit}`}
                  />
                  <span className={styles.unit}>{f.unit}</span>
                </label>
              ))}

              <button
                type="button"
                className={`${styles.save} ${logged ? styles.saveEdit : ''}`}
                onClick={() => save(ex.name)}
                disabled={busy === ex.name || !r.weight}
              >
                {saved === ex.name ? '✓' : logged ? 'Обнови' : 'Запиши'}
              </button>

              {logged && (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => clear(ex.name)}
                  disabled={busy === ex.name}
                  aria-label={`Изтрий ${ex.name}`}
                >×</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
