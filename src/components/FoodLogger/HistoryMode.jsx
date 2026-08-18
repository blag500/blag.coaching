import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import MealPicker from './MealPicker'
import styles from './HistoryMode.module.css'

/**
 * Every food ever logged, one row each — not a window on recent entries.
 * Portions can be adjusted before adding, names corrected everywhere at once,
 * and mistakes forgotten for good.
 */
export default function HistoryMode({ onAddRaw, meal, onMealChange }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery]     = useState('')
  const [openName, setOpen]   = useState(null)
  const [grams, setGrams]     = useState('100')
  const [draftName, setDraft] = useState('')
  // Editable per-portion macros — a wrong figure should be correctable here
  // rather than forcing a fresh entry every time it is used.
  const [macros, setMacros]   = useState({ kcal: '', protein: '', carbs: '', fat: '' })
  const [busy, setBusy]       = useState(false)
  const [note, setNote]       = useState('')
  const timer = useRef(null)

  const load = useCallback(async (search) => {
    const { data, error } = await supabase.rpc('food_history', { search: search || null })
    if (!error) setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load('') }, [load])

  // Debounced so typing does not fire a query per keystroke.
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => load(query.trim()), 220)
    return () => clearTimeout(timer.current)
  }, [query, load])

  function open(item) {
    setOpen(item.name)
    setDraft(item.name)
    setGrams(String(item.grams > 0 ? Math.round(item.grams) : 100))
    setMacros({
      kcal:    String(item.kcal),
      protein: String(item.protein),
      carbs:   String(item.carbs),
      fat:     String(item.fat),
    })
    setNote('')
  }

  // Macros are stored against the reference portion, so scale to whatever
  // portion is being logged now.
  function scaled(item) {
    const g = parseFloat(grams) || 0
    const base = parseFloat(item.grams) || g || 100
    const r = base > 0 ? g / base : 1
    const num = (v) => parseFloat(v) || 0
    return {
      kcal:    Math.round(num(macros.kcal) * r),
      protein: Math.round(num(macros.protein) * r * 10) / 10,
      carbs:   Math.round(num(macros.carbs)   * r * 10) / 10,
      fat:     Math.round(num(macros.fat)     * r * 10) / 10,
    }
  }

  function add(item) {
    const g = parseFloat(grams)
    if (!g || g <= 0) return
    onAddRaw({
      name:  draftName.trim() || item.name,
      grams: Math.round(g),
      ...scaled(item),
    })
    setOpen(null)
  }

  async function rename(item) {
    const next = draftName.trim()
    if (!next || next === item.name) return
    setBusy(true)
    const { error } = await supabase.rpc('rename_food', { old_name: item.name, new_name: next })
    setBusy(false)
    if (error) { setNote('Неуспешно преименуване'); return }
    setOpen(null)
    setNote(`Преименувано на „${next}" навсякъде`)
    load(query.trim())
    setTimeout(() => setNote(''), 2600)
  }

  async function forget(item) {
    if (!confirm(`Да изтрия ли „${item.name}" от цялата история? Записите в дневника също се махат.`)) return
    setBusy(true)
    const { error } = await supabase.rpc('forget_food', { food_name: item.name })
    setBusy(false)
    if (error) { setNote('Неуспешно изтриване'); return }
    setOpen(null)
    load(query.trim())
    setNote(`„${item.name}" е премахнато`)
    setTimeout(() => setNote(''), 2600)
  }

  return (
    <div className={styles.wrap}>
      <input
        className={styles.search}
        type="search"
        placeholder="Търси в историята…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        aria-label="Търси храна"
      />

      {note && <p className={styles.note}>{note}</p>}

      {loading ? (
        <p className={styles.empty}>Зарежда…</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>
          {query ? 'Няма съвпадение.' : 'Още нямаш логнати храни.'}
        </p>
      ) : (
        <ul className={styles.list}>
          {items.map(item => {
            const isOpen = openName === item.name
            return (
              <li key={item.name} className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}>
                <button className={styles.row} onClick={() => isOpen ? setOpen(null) : open(item)} type="button">
                  <span className={styles.info}>
                    <span className={styles.name}>{item.name}</span>
                    <span className={styles.macros}>
                      {Math.round(item.grams)}g · {item.kcal} ккал · П{item.protein} В{item.carbs} М{item.fat}
                    </span>
                  </span>
                  <span className={styles.count}>×{item.times_used}</span>
                </button>

                {isOpen && (
                  <div className={styles.panel}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Име</span>
                      <input
                        className={styles.input}
                        value={draftName}
                        onChange={e => setDraft(e.target.value)}
                        aria-label="Име на храната"
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Грамаж</span>
                      <input
                        className={styles.input}
                        type="number" min="1" inputMode="numeric"
                        value={grams}
                        onChange={e => setGrams(e.target.value)}
                        aria-label="Грамаж"
                      />
                    </label>

                    <div className={styles.macroGrid}>
                      {[
                        { k: 'kcal',    label: 'ККАЛ', color: 'var(--accent)' },
                        { k: 'protein', label: 'П',    color: 'var(--macro-protein)' },
                        { k: 'carbs',   label: 'В',    color: 'var(--macro-carbs)' },
                        { k: 'fat',     label: 'М',    color: 'var(--macro-fat)' },
                      ].map(({ k, label, color }) => (
                        <label className={styles.macroCell} key={k}>
                          <span className={styles.macroTag} style={{ color }}>{label}</span>
                          <input
                            className={styles.macroInput}
                            type="number" min="0" step="0.1" inputMode="decimal"
                            value={macros[k]}
                            onChange={e => setMacros(m => ({ ...m, [k]: e.target.value }))}
                            aria-label={label}
                          />
                        </label>
                      ))}
                    </div>

                    <p className={styles.preview}>
                      {(() => {
                        const s = scaled(item)
                        return `За ${Math.round(parseFloat(grams) || 0)}g → ${s.kcal} ккал · П ${s.protein}g · В ${s.carbs}g · М ${s.fat}g`
                      })()}
                    </p>

                    {onMealChange && <MealPicker value={meal} onChange={onMealChange} />}

                    <div className={styles.actions}>
                      <button className={styles.addBtn} onClick={() => add(item)} type="button">
                        + Добави
                      </button>
                      {draftName.trim() && draftName.trim() !== item.name && (
                        <button className={styles.renameBtn} onClick={() => rename(item)}
                                disabled={busy} type="button">
                          Преименувай навсякъде
                        </button>
                      )}
                      <button className={styles.forgetBtn} onClick={() => forget(item)}
                              disabled={busy} type="button" aria-label="Изтрий от историята">
                        Изтрий
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
