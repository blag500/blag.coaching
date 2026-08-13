import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useExercisePhotos } from '../../hooks/useExercisePhotos'
import styles from './DayLog.module.css'

/** Blank row for a set that has not been entered yet. */
const EMPTY = { id: null, weight: '', reps: '' }

/**
 * A small square beside the exercise: the photo if there is one, a camera if
 * there is not. Tapping a photo opens it; tapping the empty square adds one.
 */
function ExerciseThumb({ name, url, busy, onPick, onZoom }) {
  const id = `ph-${name.replace(/\W+/g, '')}`
  if (url) {
    return (
      <button
        type="button"
        className={styles.thumb}
        onClick={() => onZoom({ url, name })}
        aria-label={`Виж ${name}`}
      >
        <img src={url} alt="" className={styles.thumbImg} />
      </button>
    )
  }
  return (
    <>
      <input
        id={id}
        type="file"
        accept="image/*"
        className={styles.fileInput}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }}
      />
      <label htmlFor={id} className={`${styles.thumb} ${styles.thumbEmpty}`} title={`Снимка на ${name}`}>
        {busy ? '…' : '▢'}
      </label>
    </>
  )
}

/**
 * A day's exercises, opened from the calendar and written to in place.
 *
 * One row per set, because a set of four is almost never four identical sets —
 * 80×10, 80×9, 80×7, 80×6 is what actually happens, and a single row carrying
 * "sets: 4" had nowhere to say it. The programme's prescribed count decides how
 * many rows appear, so the form already has the shape of the session.
 *
 * Rows already logged arrive filled in and stay editable: a set entered wrong
 * is the most common thing anyone needs to fix, and it should not require
 * finding another screen.
 */
export default function DayLog({ date, blockLabels, blocks, onLogged }) {
  const { user } = useAuth()
  const [rows, setRows] = useState({})   // planned name → [{ id, weight, reps }]
  const [busy, setBusy] = useState(null)
  const [saved, setSaved] = useState(null)
  // planned name → what was actually done instead, for this day only.
  const [swap, setSwap] = useState({})
  const [editing, setEditing] = useState(null)
  const { byName: photos, upload } = useExercisePhotos()
  const [uploading, setUploading] = useState(null)
  const [zoom, setZoom] = useState(null)

  const exercises = (blocks ?? [])
    .filter(b => blockLabels.includes(b.label))
    .flatMap(b => (b.exercises ?? []).map(e => ({ ...e, block: b.label })))

  const load = useCallback(() => {
    if (!user?.id) return
    supabase
      .from('exercise_logs')
      .select('id, exercise_name, weight, reps, sets, set_index, replaces')
      .eq('user_id', user.id)
      .eq('date', date)
      .then(({ data }) => {
        const m = {}
        const sw = {}
        for (const ex of exercises) {
          const planned = Math.max(1, parseInt(ex.sets) || 1)
          // Rows logged under the planned name, or under whatever stood in for
          // it that day — otherwise a substituted session reads as a skipped one.
          const mine = (data ?? [])
            .filter(r => r.exercise_name === ex.name || r.replaces === ex.name)
            .sort((a, b) => (a.set_index ?? 0) - (b.set_index ?? 0))

          const stood = mine.find(r => r.replaces === ex.name)
          if (stood) sw[ex.name] = stood.exercise_name

          // Enough rows for the programme, or for what was actually logged if
          // more sets were done than asked for.
          const count = Math.max(planned, mine.length)
          m[ex.name] = Array.from({ length: count }, (_, i) => {
            const hit = mine[i]
            return hit
              ? { id: hit.id, weight: hit.weight ?? '', reps: hit.reps ?? '' }
              : { ...EMPTY }
          })
        }
        setRows(m)
        setSwap(sw)
      })
  }, [user?.id, date, JSON.stringify(exercises.map(e => e.name + e.sets))])

  useEffect(() => { load() }, [load])

  function edit(name, i, field, value) {
    setRows(prev => ({
      ...prev,
      [name]: prev[name].map((r, j) => (j === i ? { ...r, [field]: value } : r)),
    }))
  }

  async function save(name, i) {
    const r = rows[name]?.[i]
    if (!user || !r?.weight) return
    const key = `${name}-${i}`
    setBusy(key)

    // Logged under whatever was actually done, with a note of what it replaced —
    // so the substitute builds its own history and the planned lift knows why
    // it has a gap that week.
    const done = swap[name] || name
    const payload = {
      user_id: user.id,
      date,
      exercise_name: done,
      weight: parseFloat(r.weight) || 0,
      reps:   parseInt(r.reps) || null,
      sets:   1,
      set_index: i,
      replaces: done === name ? null : name,
    }

    // Updated in place when the row exists, so correcting a set does not leave
    // the wrong figure sitting beside the right one.
    const { data, error } = r.id
      ? await supabase.from('exercise_logs').update(payload).eq('id', r.id).select().single()
      : await supabase.from('exercise_logs').insert(payload).select().single()

    setBusy(null)
    if (error) return
    setRows(prev => ({
      ...prev,
      [name]: prev[name].map((x, j) => (j === i ? { ...x, id: data.id } : x)),
    }))
    setSaved(key)
    setTimeout(() => setSaved(s => (s === key ? null : s)), 1500)
    onLogged?.()
  }

  async function clear(name, i) {
    const r = rows[name]?.[i]
    if (!r?.id) return
    setBusy(`${name}-${i}`)
    await supabase.from('exercise_logs').delete().eq('id', r.id)
    setBusy(null)
    setRows(prev => ({
      ...prev,
      [name]: prev[name].map((x, j) => (j === i ? { ...EMPTY } : x)),
    }))
    onLogged?.()
  }

  /** An extra set beyond the programme — it happened, so it can be recorded. */
  function addSet(name) {
    setRows(prev => ({ ...prev, [name]: [...prev[name], { ...EMPTY }] }))
  }

  if (!exercises.length) {
    return <p className={styles.empty}>Няма упражнения за този блок.</p>
  }

  return (
    <div className={styles.wrap}>
      {/* A framed card over a blurred screen, dismissed by tapping anywhere.
          Big enough to recognise a machine, small enough that the page behind
          still reads as where you were.

          Rendered into <body>, not here: the tab panes carry a transform for
          the swipe, and a transformed ancestor becomes the containing block for
          everything fixed inside it — so "inset: 0" would mean the full height
          of the scrolled page rather than the screen, and the card would land
          wherever the middle of that page happens to be. */}
      {zoom && createPortal(
        <div className={styles.lightbox} onClick={() => setZoom(null)} role="dialog" aria-modal="true">
          <div className={styles.lightboxCard}>
            <img src={zoom.url} alt={zoom.name} className={styles.lightboxImg} />
            <span className={styles.lightboxName}>{zoom.name}</span>
          </div>
        </div>,
        document.body,
      )}

      {exercises.map(ex => {
        const sets = rows[ex.name] ?? []
        const doneCount = sets.filter(s => s.id).length
        return (
          <div key={`${ex.block}-${ex.name}`} className={styles.exercise}>
            <div className={styles.head}>
              {/* The picture, where the name alone is not enough. "Тяга в
                  наклон" is four different movements depending on who wrote
                  it, and the person reading it in the gym is the one guessing. */}
              <ExerciseThumb
                name={swap[ex.name] || ex.name}
                url={photos[swap[ex.name] || ex.name]}
                busy={uploading === ex.name}
                onPick={async file => {
                  setUploading(ex.name)
                  await upload(swap[ex.name] || ex.name, file)
                  setUploading(null)
                }}
                onZoom={setZoom}
              />
              <span className={styles.nameWrap}>
                <span className={styles.name}>{swap[ex.name] || ex.name}</span>
                <button
                  type="button"
                  className={styles.swapBtn}
                  onClick={() => setEditing(editing === ex.name ? null : ex.name)}
                  aria-label={`Смени ${ex.name} за този ден`}
                >✎</button>
              </span>
              <span className={styles.target}>
                {doneCount}/{sets.length} × {ex.reps}
              </span>
            </div>

            {/* Today only. The programme is untouched, so next session comes
                back to it on its own. */}
            {swap[ex.name] && (
              <span className={styles.swapNote}>вместо {ex.name} · само за днес</span>
            )}

            {editing === ex.name && (
              <div className={styles.swapRow}>
                <input
                  className={styles.swapInput}
                  value={swap[ex.name] ?? ''}
                  placeholder={ex.name}
                  onChange={e => setSwap(p => ({ ...p, [ex.name]: e.target.value }))}
                  aria-label="Какво направи вместо него"
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.swapDone}
                  onClick={() => setEditing(null)}
                >Готово</button>
                {swap[ex.name] && (
                  <button
                    type="button"
                    className={styles.swapReset}
                    onClick={() => { setSwap(p => ({ ...p, [ex.name]: '' })); setEditing(null) }}
                  >Върни</button>
                )}
              </div>
            )}

            {sets.map((r, i) => {
              const key = `${ex.name}-${i}`
              return (
                <div key={i} className={`${styles.setRow} ${r.id ? styles.setDone : ''}`}>
                  <span className={styles.setNo}>{i + 1}</span>

                  <label className={styles.field}>
                    <input
                      className={styles.input}
                      type="number" min="0" step="0.5" inputMode="decimal"
                      value={r.weight}
                      placeholder="кг"
                      onChange={e => edit(ex.name, i, 'weight', e.target.value)}
                      aria-label={`${ex.name}, серия ${i + 1}, килограми`}
                    />
                  </label>

                  <span className={styles.times}>×</span>

                  <label className={styles.field}>
                    <input
                      className={styles.input}
                      type="number" min="0" step="1" inputMode="numeric"
                      value={r.reps}
                      placeholder={String(ex.reps ?? '')}
                      onChange={e => edit(ex.name, i, 'reps', e.target.value)}
                      aria-label={`${ex.name}, серия ${i + 1}, повторения`}
                    />
                  </label>

                  <button
                    type="button"
                    className={`${styles.save} ${r.id ? styles.saveEdit : ''}`}
                    onClick={() => save(ex.name, i)}
                    disabled={busy === key || !r.weight}
                  >
                    {saved === key ? '✓' : r.id ? '↻' : '✓'}
                  </button>

                  {r.id && (
                    <button
                      type="button"
                      className={styles.clear}
                      onClick={() => clear(ex.name, i)}
                      disabled={busy === key}
                      aria-label={`Изтрий серия ${i + 1}`}
                    >×</button>
                  )}
                </div>
              )
            })}

            <button type="button" className={styles.addSet} onClick={() => addSet(ex.name)}>
              + серия
            </button>
          </div>
        )
      })}
    </div>
  )
}
