import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { mealLabel } from './meals'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './QuickAddSheet.module.css'

/**
 * What the + on a meal section opens: the history, with a checkbox on each row,
 * so a handful of the usual foods go into that meal in one go. Portalled to the
 * body — the nutrition page lives under a swipe transform, and a fixed overlay
 * inside one is measured against the transform, not the screen.
 */
export default function QuickAddSheet({ meal, onAddRaw, onClose }) {
  const { t } = useSettings()
  const label = mealLabel(t, meal)
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery]     = useState('')
  const [checked, setChecked] = useState({})   // name -> bool
  const [adding, setAdding]   = useState(false)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    const t = setTimeout(() => {
      supabase.rpc('food_history', { search: query.trim() || null }).then(({ data }) => {
        if (!cancel) { setItems(data ?? []); setLoading(false) }
      })
    }, 200)
    return () => { cancel = true; clearTimeout(t) }
  }, [query])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const had = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = had
    }
  }, [onClose])

  const count = Object.values(checked).filter(Boolean).length
  const toggle = name => setChecked(c => ({ ...c, [name]: !c[name] }))

  async function addAll() {
    setAdding(true)
    for (const it of items) {
      if (!checked[it.name]) continue
      await onAddRaw({
        name:    it.name,
        grams:   Math.round(it.grams) || 0,
        kcal:    it.kcal,
        protein: it.protein,
        carbs:   it.carbs,
        fat:     it.fat,
        mealType: meal,
      })
    }
    setAdding(false)
    onClose()
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()} role="dialog" aria-label={t('quickAdd.title', { meal: label })}>
        <div className={styles.head}>
          <span className={styles.title}>{t('quickAdd.title', { meal: label })}</span>
          <button className={styles.close} onClick={onClose} type="button" aria-label="Затвори">×</button>
        </div>

        <input
          className={styles.search}
          type="search"
          placeholder="Търси в историята…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <div className={styles.list}>
          {loading ? (
            <p className={styles.empty}>Зарежда…</p>
          ) : items.length === 0 ? (
            <p className={styles.empty}>{query ? 'Няма съвпадение.' : 'Още нямаш логнати храни.'}</p>
          ) : (
            items.map(it => (
              <button
                key={it.name}
                className={`${styles.item} ${checked[it.name] ? styles.itemOn : ''}`}
                onClick={() => toggle(it.name)}
                type="button"
              >
                <span className={`${styles.box} ${checked[it.name] ? styles.boxOn : ''}`} aria-hidden="true">
                  {checked[it.name] ? '✓' : ''}
                </span>
                <span className={styles.info}>
                  <span className={styles.name}>{it.name}</span>
                  <span className={styles.macros}>{Math.round(it.grams)}g · {it.kcal} ккал</span>
                </span>
                <span className={styles.count}>×{it.times_used}</span>
              </button>
            ))
          )}
        </div>

        <button className={styles.addBtn} onClick={addAll} disabled={count === 0 || adding} type="button">
          {adding ? 'Добавя…' : count > 0 ? `Добави ${count}` : 'Избери храни'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
