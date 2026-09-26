import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import Pictogram from '../Pictogram/Pictogram'
import RecipeForm from './RecipeForm'
import RecipeReader from './RecipeReader'
import { perServing } from './recipeMath'
import styles from './RecipeLibrary.module.css'

export const CATEGORIES = ['pre', 'post', 'breakfast', 'lunch', 'dinner', 'snack']

/**
 * Библиотеката в Хранене — едно място за рецептите.
 *
 * Дотук имаше три: „Рецепти" (таблица recipes), „Библиотека" (моите храни и
 * две вградени карти) и шаблоните в meal_library. Сега е една — рецептите от
 * recipes: твоите и споделените от треньора. Картата отваря четеца, стъпка
 * по стъпка, а от последната страница ястието се вписва в дневника.
 */
export default function RecipeLibrary({ onAddRaw, fabHost }) {
  const { t } = useSettings()
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery]     = useState('')
  const [filter, setFilter]   = useState('all')
  const [reading, setReading] = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | recipe

  useEffect(() => {
    if (!user?.id) return
    let alive = true
    supabase.from('recipes').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) console.error('recipes load:', error)
        setRecipes(data || [])
        setLoading(false)
      })
    return () => { alive = false }
  }, [user?.id])

  const withMacros = useMemo(
    () => recipes.map(r => ({ ...r, _m: perServing(r) })),
    [recipes],
  )

  /* Филтрите са само тези, по които има какво да се намери — бутон, който
     води до празен списък, е обещание, което екранът не спазва. */
  const chips = useMemo(() => {
    const out = [{ id: 'all', label: t('rlib.all') }]
    if (withMacros.some(r => r.prep_min && r.prep_min <= 10)) out.push({ id: 'quick', label: t('rlib.quick') })
    if (withMacros.some(r => r._m.protein >= 30)) out.push({ id: 'protein', label: t('rlib.protein') })
    for (const c of CATEGORIES) if (withMacros.some(r => r.category === c)) out.push({ id: c, label: t(`rlib.cat.${c}`) })
    if (withMacros.some(r => r.user_id === user?.id)) out.push({ id: 'mine', label: t('rlib.mine') })
    return out
  }, [withMacros, t, user?.id])

  const q = query.trim().toLowerCase()
  const shown = withMacros.filter(r => {
    if (q && !r.name.toLowerCase().includes(q) &&
        !(r.ingredients || []).some(i => (i.name || '').toLowerCase().includes(q))) return false
    if (filter === 'quick')   return r.prep_min && r.prep_min <= 10
    if (filter === 'protein') return r._m.protein >= 30
    if (filter === 'mine')    return r.user_id === user?.id
    if (CATEGORIES.includes(filter)) return r.category === filter
    return true
  })

  function saved(row) {
    setRecipes(prev => {
      const rest = prev.filter(r => r.id !== row.id)
      return [row, ...rest]
    })
    setEditing(null)
    setReading(row)
  }

  if (editing) {
    return (
      <RecipeForm
        recipe={editing === 'new' ? null : editing}
        onSave={saved}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className={styles.lib}>
      <div className={styles.search}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('rlib.search')}
          aria-label={t('rlib.search')}
        />
      </div>

      {chips.length > 1 && (
        <div className={styles.chips} role="tablist">
          {chips.map(c => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={filter === c.id}
              className={`${styles.chip} ${filter === c.id ? styles.chipOn : ''}`}
              onClick={() => { haptic('toggle'); setFilter(c.id) }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {loading ? null : recipes.length === 0 ? (
        <div className={styles.empty}>
          <Pictogram name="meal" size={34} className={styles.emptyIcon} />
          <p>{t('rlib.empty')}</p>
          <button type="button" className={styles.emptyBtn} onClick={() => setEditing('new')}>
            {t('rlib.first')}
          </button>
        </div>
      ) : shown.length === 0 ? (
        <p className={styles.none}>{t('rlib.none')}</p>
      ) : (
        <div className={styles.grid}>
          {shown.map(r => {
            const steps = (r.steps || []).length
            return (
              <button key={r.id} type="button" className={styles.card} onClick={() => { haptic('tap'); setReading(r) }}>
                <div className={styles.photo}>
                  {r.photo_url
                    ? <img src={r.photo_url} alt="" loading="lazy" />
                    : <Pictogram name="meal" size={28} />}
                  {r.prep_min ? <span className={styles.time}>{t('rr.minutes', { n: r.prep_min })}</span> : null}
                  {r.user_id !== user?.id && <span className={styles.coach}>{t('rlib.coach')}</span>}
                </div>
                <div className={styles.body}>
                  <span className={styles.name}>{r.name}</span>
                  <span className={styles.macros}>
                    <b>{Math.round(r._m.kcal)}</b> {t('rr.kcal')}
                    <span className={styles.p}> · {Math.round(r._m.protein)}P</span>
                  </span>
                  {steps > 0 && <span className={styles.steps}>{t('rlib.steps', { n: steps })}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {createPortal(
        <button
          type="button"
          className={styles.fab}
          onClick={() => setEditing('new')}
          aria-label={t('rlib.add')}
        >
          <Pictogram name="plus" size={22} />
        </button>,
        fabHost ?? document.body,
      )}

      {reading && (
        <RecipeReader
          recipe={reading}
          onClose={() => setReading(null)}
          onLog={onAddRaw}
          onEdit={reading.user_id === user?.id ? () => { const r = reading; setReading(null); setEditing(r) } : null}
        />
      )}
    </div>
  )
}
