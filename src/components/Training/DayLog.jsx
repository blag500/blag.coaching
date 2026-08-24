import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useExercisePhotos } from '../../hooks/useExercisePhotos'
import { setPace, formatPace } from '../../utils/setPace'
import styles from './DayLog.module.css'

/** Blank row for a set that has not been entered yet. */
const EMPTY = { id: null, weight: '', reps: '', created_at: null }

/** Long enough that it does not fire mid-number, short enough that putting the
 *  phone down never loses a set. Blur commits sooner than this anyway. */
const AUTOSAVE_MS = 1200

/** What a row is worth saving as — two rows with the same signature are the
 *  same set, so nothing is written twice. */
const sig = r => `${r.weight}|${r.reps}`

/** One plate's worth of adjustment. The stepper moves the load, not the reps —
 *  reps get typed once and then mostly repeat. */
const STEP = 2.5

/** When the rest chip stops counting up quietly and says you are good to go —
 *  and buzzes once, for the eyes that are not on the phone. A middle default
 *  between a heavy triple and an isolation drop set. */
const REST_TARGET = 120

/** The set a new row most likely repeats: the nearest one above it with a
 *  weight in it. What "carry the last set" and the ghost placeholders read off. */
function prevSet(sets, i) {
  for (let j = i - 1; j >= 0; j--) {
    if (String(sets[j]?.weight).trim() !== '') return sets[j]
  }
  return null
}

/** What a finished exercise says on its one line, once it is folded away. */
function summarise(sets) {
  const done = sets.filter(s => s.id && s.weight !== '')
  if (!done.length) return ''
  const weights = [...new Set(done.map(s => String(s.weight)))]
  // The usual case is one load across the sets, and repeating it three times
  // says nothing three times.
  if (weights.length === 1) {
    return `${weights[0]}кг × ${done.map(s => s.reps || '?').join(', ')}`
  }
  return done.map(s => `${s.weight}×${s.reps || '?'}`).join(' · ')
}

/**
 * A day's exercises, opened from the calendar and written to in place.
 *
 * One row per set, because a set of four is almost never four identical sets —
 * 80×10, 80×9, 80×7, 80×6 is what actually happens. The programme's prescribed
 * count decides how many rows appear, so the form already has the shape of the
 * session.
 *
 * The row itself is only the numbers. A save button and a delete button on
 * every row put thirty-six controls on a six-exercise day, nearly all of them
 * for something done rarely or not at all: typing a number and moving on is the
 * actual gesture, so that is what saves. Emptying a row deletes it, which is
 * what empty already means.
 */
export default function DayLog({ date, blockLabels, blocks, onLogged }) {
  const { user } = useAuth()
  const { restTimer } = useSettings()
  const [rows, setRows] = useState({})   // planned name → [{ id, weight, reps }]
  const [lastSess, setLastSess] = useState({}) // planned name → last session's sets
  const [rest, setRest] = useState(null) // { name, since } — the running rest clock
  const [now, setNow]   = useState(Date.now())
  const buzzedRef       = useRef(false)
  const [saved, setSaved] = useState(null)
  const [swap, setSwap] = useState({})   // planned name → what stood in, today
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState({})   // explicit fold state, overrides default
  const { byName: photos } = useExercisePhotos()
  const [zoom, setZoom] = useState(null)

  // Autosave reads the newest values from a ref: a debounced call fired from a
  // closure would still be holding whatever was on screen when the timer was
  // set, and would save the number as it looked one keystroke ago.
  const rowsRef    = useRef(rows)
  const swapRef    = useRef(swap)
  const timers     = useRef({})
  const inflight   = useRef({})
  const lastSaved  = useRef({})
  useEffect(() => { rowsRef.current = rows }, [rows])
  useEffect(() => { swapRef.current = swap }, [swap])

  const exercises = (blocks ?? [])
    .filter(b => blockLabels.includes(b.label))
    .flatMap(b => (b.exercises ?? []).map(e => ({ ...e, block: b.label })))

  const load = useCallback(() => {
    if (!user?.id) return
    supabase
      .from('exercise_logs')
      .select('id, exercise_name, weight, reps, sets, set_index, replaces, created_at')
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

          const count = Math.max(planned, mine.length)
          m[ex.name] = Array.from({ length: count }, (_, i) => {
            const hit = mine[i]
            const row = hit
              ? { id: hit.id, weight: hit.weight ?? '', reps: hit.reps ?? '', created_at: hit.created_at }
              : { ...EMPTY }
            // Remembered as already stored, so simply focusing a loaded row and
            // leaving it does not write it back unchanged.
            lastSaved.current[`${ex.name}-${i}`] = sig(row)
            return row
          })
        }
        setRows(m)
        setSwap(sw)
      })
  }, [user?.id, date, JSON.stringify(exercises.map(e => e.name + e.sets))])

  useEffect(() => { load() }, [load])

  // The last time each of these lifts was trained, set for set. It seeds the
  // ghost on a fresh row: the first set of the day opens on last session's
  // numbers, so repeating is one tap and progressing is one press of +.
  useEffect(() => {
    if (!user?.id || !exercises.length) return
    supabase
      .from('exercise_logs')
      .select('exercise_name, replaces, weight, reps, date, set_index')
      .eq('user_id', user.id)
      .lt('date', date)
      .order('date', { ascending: false })
      .order('set_index', { ascending: true })
      .limit(300)
      .then(({ data }) => {
        const byName = {}
        for (const ex of exercises) {
          const rows = (data ?? []).filter(
            r => r.exercise_name === ex.name || r.replaces === ex.name
          )
          if (!rows.length) continue
          // Newest row first, so its date is the session to echo — and only
          // that session's sets, in order.
          const day = rows[0].date
          byName[ex.name] = rows
            .filter(r => r.date === day)
            .sort((a, b) => (a.set_index ?? 0) - (b.set_index ?? 0))
            .map(r => ({ weight: r.weight, reps: r.reps }))
        }
        setLastSess(byName)
      })
  }, [user?.id, date, JSON.stringify(exercises.map(e => e.name))])

  /** What an empty row echoes: the set above it today if there is one, else the
   *  matching set from last session (its last set if the counts differ). */
  const echo = (sets, i, name) =>
    prevSet(sets, i) ?? lastSess[name]?.[i] ?? lastSess[name]?.at(-1) ?? null

  // The rest clock ticks once a second while it runs, and buzzes the phone the
  // moment it reaches the target — the one signal that reaches you when the
  // screen is dark on the bench beside you.
  useEffect(() => {
    if (!rest) return
    const id = setInterval(() => {
      setNow(Date.now())
      if (!buzzedRef.current && (Date.now() - rest.since) / 1000 >= REST_TARGET) {
        buzzedRef.current = true
        navigator.vibrate?.(180)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [rest?.since])

  /** A finished set starts the clock over — unless the user turned the rest
   *  timer off in Profile, in which case saved sets stay quiet. */
  function startRest(name) {
    if (!restTimer) return
    buzzedRef.current = false
    setNow(Date.now())
    setRest({ name, since: Date.now() })
  }

  /** Every pending timer fires before the panel goes, so a set typed and then
   *  closed straight away is still on record.
   *
   *  Through a ref, not the closure: this runs once at unmount and would
   *  otherwise be holding the first render's `date`, writing the last set of a
   *  session to whichever day the panel was first opened on. */
  const commitRef = useRef(null)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(() => () => {
    for (const key of Object.keys(timers.current)) {
      clearTimeout(timers.current[key])
      const cut = key.lastIndexOf('-')
      commitRef.current?.(key.slice(0, cut), +key.slice(cut + 1))
    }
  }, [])

  /**
   * Write the row if it has changed. Emptied rows are deleted: a set with no
   * numbers in it is a set that did not happen, and that is what clearing it
   * has always looked like.
   */
  async function commit(name, i) {
    const r = rowsRef.current[name]?.[i]
    if (!user || !r) return
    const key = `${name}-${i}`
    if (inflight.current[key]) return
    if (lastSaved.current[key] === sig(r)) return

    const blank = String(r.weight).trim() === '' && String(r.reps).trim() === ''

    if (blank) {
      if (!r.id) { lastSaved.current[key] = sig(r); return }
      inflight.current[key] = true
      await supabase.from('exercise_logs').delete().eq('id', r.id)
      inflight.current[key] = false
      lastSaved.current[key] = sig(EMPTY)
      setRows(prev => ({
        ...prev,
        [name]: prev[name].map((x, j) => (j === i ? { ...EMPTY } : x)),
      }))
      onLogged?.()
      return
    }

    // Reps alone are not a set yet — the weight is what is being recorded.
    if (String(r.weight).trim() === '') return

    // A fresh row, not an edit to one already saved — this is the moment a set
    // is actually finished, so it is the moment rest starts.
    const isNew = !r.id
    inflight.current[key] = true
    // Logged under whatever was actually done, with a note of what it replaced —
    // so the substitute builds its own history and the planned lift knows why
    // it has a gap that week.
    const done = swapRef.current[name] || name
    // Bulgarian iOS decimal keys deliver a comma; parseFloat treats "60,5" as
    // 60. Normalising before parsing is what lets a half plate save.
    const parsedWeight = parseFloat(String(r.weight).replace(',', '.')) || 0
    const payload = {
      user_id: user.id,
      date,
      exercise_name: done,
      weight: parsedWeight,
      reps:   parseInt(r.reps) || null,
      sets:   1,
      set_index: i,
      replaces: done === name ? null : name,
    }

    const { data, error } = r.id
      ? await supabase.from('exercise_logs').update(payload).eq('id', r.id).select().single()
      : await supabase.from('exercise_logs').insert(payload).select().single()

    inflight.current[key] = false
    if (error) return

    lastSaved.current[key] = sig(r)
    setRows(prev => ({
      ...prev,
      [name]: prev[name].map((x, j) => (j === i ? { ...x, id: data.id, created_at: data.created_at } : x)),
    }))
    setSaved(key)
    setTimeout(() => setSaved(s => (s === key ? null : s)), 1400)
    if (isNew) startRest(name)
    onLogged?.()
  }

  function edit(name, i, field, value) {
    setRows(prev => ({
      ...prev,
      [name]: prev[name].map((r, j) => (j === i ? { ...r, [field]: value } : r)),
    }))
    const key = `${name}-${i}`
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => commit(name, i), AUTOSAVE_MS)
  }

  /** Same debounce as a keystroke: a filled row schedules its own save. */
  function schedule(name, i) {
    const key = `${name}-${i}`
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => commit(name, i), AUTOSAVE_MS)
  }

  /**
   * Nudge the load by one plate. On an empty row this is also where the last
   * set carries over — the weight starts from the one above and the reps come
   * with it — so bumping a fresh row is one gesture: repeat, then correct.
   */
  function bump(name, i, dir) {
    setRows(prev => {
      const sets = prev[name]
      const r = sets[i]
      const prevR = echo(sets, i, name)
      const norm = v => parseFloat(String(v ?? '').replace(',', '.')) || 0
      const empty = String(r.weight).trim() === ''
      const base = empty ? norm(prevR?.weight) : norm(r.weight)
      const next = Math.max(0, Math.round((base + dir * STEP) * 2) / 2)
      const reps = empty && String(r.reps).trim() === '' ? (prevR?.reps ?? r.reps) : r.reps
      return {
        ...prev,
        [name]: sets.map((x, j) => (j === i ? { ...x, weight: String(next), reps } : x)),
      }
    })
    schedule(name, i)
  }

  /** Half plate on and off. iOS numpads in the app do not carry a comma or a
   *  dot, so decimals cannot be typed at all — a tap does what the keyboard
   *  will not, and toggles instead of adding so it never gets stuck at 62.5. */
  function toggleHalf(name, i) {
    setRows(prev => {
      const sets = prev[name]
      const r = sets[i]
      const prevR = echo(sets, i, name)
      const norm = v => parseFloat(String(v ?? '').replace(',', '.')) || 0
      const empty = String(r.weight).trim() === ''
      const base = empty ? norm(prevR?.weight) : norm(r.weight)
      const hasHalf = Math.abs(base - Math.floor(base) - 0.5) < 0.01
      const next = hasHalf ? Math.floor(base) : base + 0.5
      const reps = empty && String(r.reps).trim() === '' ? (prevR?.reps ?? r.reps) : r.reps
      return {
        ...prev,
        [name]: sets.map((x, j) => (j === i ? { ...x, weight: String(next), reps } : x)),
      }
    })
    schedule(name, i)
  }

  /** Carry the last set here whole — the same load and reps, no change. The
   *  stepper is for when there is a change; this is for when there is not. */
  function repeat(name, i) {
    let done = false
    setRows(prev => {
      const sets = prev[name]
      const p = echo(sets, i, name)
      if (!p) return prev
      done = true
      return {
        ...prev,
        [name]: sets.map((x, j) => (j === i ? { ...x, weight: String(p.weight), reps: p.reps } : x)),
      }
    })
    if (done) schedule(name, i)
  }

  /** Leaving a field is the clearest sign the number is finished. */
  function blur(name, i) {
    const key = `${name}-${i}`
    clearTimeout(timers.current[key])
    commit(name, i)
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
          Rendered into <body>: the tab panes carry a transform for the swipe,
          and a transformed ancestor becomes the containing block for everything
          fixed inside it, so "inset: 0" would mean the height of the scrolled
          page rather than the screen. */}
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
        const complete = sets.length > 0 && doneCount === sets.length
        // Stay open by default. Auto-folding on "complete" was firing on the
        // first set whenever the plan only prescribed one, and hiding rows
        // the user still wanted to add — a fold has to be their decision, not
        // the app's guess.
        const isOpen = open[ex.name] ?? true
        const shown  = swap[ex.name] || ex.name
        const pace   = setPace(sets.filter(s => s.id))

        // Photo attached in the editor, if any — quiet thumbnail that opens
        // into a lightbox on tap. No upload UI here; that lives with the plan.
        const photoUrl = photos[shown]
        const thumb = photoUrl ? (
          <button
            type="button"
            className={styles.thumb}
            onClick={() => setZoom({ url: photoUrl, name: shown })}
            aria-label={`Виж ${shown}`}
          >
            <img src={photoUrl} alt="" className={styles.thumbImg} />
          </button>
        ) : null

        if (!isOpen) {
          return (
            <div key={`${ex.block}-${ex.name}`} className={styles.folded}>
              {thumb}
              <button
                type="button"
                className={styles.foldedMain}
                onClick={() => setOpen(p => ({ ...p, [ex.name]: true }))}
              >
                <span className={styles.foldedTick}>✓</span>
                <span className={styles.foldedName}>{shown}</span>
                <span className={styles.foldedSum}>{summarise(sets)}</span>
              </button>
            </div>
          )
        }

        return (
          <div key={`${ex.block}-${ex.name}`} className={styles.exercise}>
            <div className={styles.head}>
              {thumb}
              <span className={styles.nameWrap}>
                <span className={styles.name}>{shown}</span>
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
              {complete && (
                <button
                  type="button"
                  className={styles.fold}
                  onClick={() => setOpen(p => ({ ...p, [ex.name]: false }))}
                  aria-label="Сгъни"
                >▴</button>
              )}
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
                <button type="button" className={styles.swapDone} onClick={() => setEditing(null)}>
                  Готово
                </button>
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
              const empty = String(r.weight).trim() === ''
              // What this row would repeat — the set above today, or last
              // session's. Drives the ghost load, the ghost reps, and the
              // one-tap carry at the end of an empty row.
              const prev = empty ? echo(sets, i, ex.name) : null
              return (
                <div key={i} className={`${styles.setRow} ${r.id ? styles.setDone : ''}`}>
                  <span className={styles.setNo}>{i + 1}</span>

                  {/* − load + : the plate stepper. On an empty row the first
                      press also carries the set above, so it doubles as repeat. */}
                  <div className={styles.stepper}>
                    <button
                      type="button" className={styles.step} tabIndex={-1}
                      onClick={() => bump(ex.name, i, -1)}
                      aria-label={`${ex.name}, серия ${i + 1}, по-малко тегло`}
                    >−</button>

                    <input
                      className={styles.input}
                      type="number"
                      step="0.5"
                      min="0"
                      inputMode="decimal"
                      value={r.weight}
                      placeholder={prev ? String(prev.weight) : 'кг'}
                      onChange={e => edit(ex.name, i, 'weight', e.target.value)}
                      onBlur={() => blur(ex.name, i)}
                      aria-label={`${ex.name}, серия ${i + 1}, килограми`}
                    />

                    <button
                      type="button" className={styles.step} tabIndex={-1}
                      onClick={() => bump(ex.name, i, +1)}
                      aria-label={`${ex.name}, серия ${i + 1}, повече тегло`}
                    >+</button>
                  </div>

                  <span className={styles.times}>×</span>

                  <label className={styles.field}>
                    <input
                      className={styles.input}
                      type="number" min="0" step="1" inputMode="numeric"
                      value={r.reps}
                      placeholder={prev ? String(prev.reps ?? ex.reps ?? '') : String(ex.reps ?? '')}
                      onChange={e => edit(ex.name, i, 'reps', e.target.value)}
                      onBlur={() => blur(ex.name, i)}
                      aria-label={`${ex.name}, серия ${i + 1}, повторения`}
                    />
                  </label>

                  {/* An empty row that has something to repeat offers it in one
                      tap; otherwise the slot just answers whether the set is on
                      record, since saving is automatic. */}
                  {empty && prev ? (
                    <button
                      type="button" className={styles.repeat}
                      onClick={() => repeat(ex.name, i)}
                      aria-label={`Повтори ${prev.weight}кг × ${prev.reps ?? '?'}`}
                      title="Повтори предната серия"
                    >⟳</button>
                  ) : (
                    <span className={`${styles.mark} ${saved === key ? styles.markFlash : ''}`}>
                      {saved === key ? '✓' : r.id ? '·' : ''}
                    </span>
                  )}
                </div>
              )
            })}

            <div className={styles.footRow}>
              <button type="button" className={styles.addSet} onClick={() => addSet(ex.name)}>
                + серия
              </button>

              {/* While the clock is running it is the loud thing on the row;
                  tapping it stops it. Otherwise the quiet retrospective pace,
                  read off the save times, takes the slot back. */}
              {rest?.name === ex.name ? (() => {
                const sec  = Math.max(0, Math.floor((now - rest.since) / 1000))
                const over = sec >= REST_TARGET
                return (
                  <button
                    type="button"
                    className={`${styles.rest} ${over ? styles.restDone : ''}`}
                    onClick={() => setRest(null)}
                    title="Спри почивката"
                  >
                    {over ? `✓ готов · ${formatPace(sec)}` : `⏱ почивка ${formatPace(sec)}`}
                  </button>
                )
              })() : pace != null ? (
                <span className={styles.pace} title="Средно време от серия до серия, включително самата серия">
                  {formatPace(pace)} между сериите
                </span>
              ) : null}

              {/* Explicit "done with this lift" — folds the card so the eye
                  moves to the next one. Appears as soon as anything is logged;
                  tapping it while a set has both weight and reps also stops the
                  rest clock, because staying on the row implies more sets and
                  leaving it does not. */}
              {doneCount > 0 && (
                <button
                  type="button"
                  className={styles.doneLift}
                  onClick={() => {
                    setRest(null)
                    setOpen(p => ({ ...p, [ex.name]: false }))
                  }}
                >
                  ✓ Готов
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
