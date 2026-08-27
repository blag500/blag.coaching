import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './CopyPreviousDay.module.css'
import { loc } from '../../utils/locale'

/** The day before the one being viewed, as a date string. */
function dayBefore(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Carry a previous day's food across in one press.
 *
 * Most people eat close to the same thing most days, and re-entering it is the
 * work that makes them stop logging by week three. This looks one day back, and
 * if that day is also empty it keeps looking — up to a week — so a Monday can
 * copy the Friday you last ate properly.
 *
 * It only appears while the current day is empty. After something has been
 * logged, a button that silently doubles the day is a trap rather than a
 * shortcut.
 */
export default function CopyPreviousDay({ date, onAddRaw, onDone }) {
  const { user } = useAuth()
  const { t, lang } = useSettings()
  const [source, setSource] = useState(null)   // { date, rows }
  const [busy, setBusy]     = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function findLastDayWithFood() {
      let cursor = dayBefore(date)
      for (let i = 0; i < 7; i++) {
        const { data } = await supabase
          .from('food_logs')
          .select('name, grams, kcal, protein, carbs, fat')
          .eq('user_id', user.id)
          .eq('date', cursor)
        if (cancelled) return
        if (data?.length) { setSource({ date: cursor, rows: data }); return }
        cursor = dayBefore(cursor)
      }
      setSource(null)
    }

    findLastDayWithFood()
    return () => { cancelled = true }
  }, [user?.id, date])

  if (!source) return null

  const kcal = Math.round(source.rows.reduce((s, r) => s + (r.kcal || 0), 0))
  const when = new Date(source.date + 'T12:00:00')
  const isYesterday = source.date === dayBefore(date)
  const label = isYesterday
    ? t('copy.yesterday')
    : when.toLocaleDateString(loc(), { day: 'numeric', month: 'short' })

  async function copy() {
    if (busy) return
    setBusy(true)
    // Sequentially, not all at once: each insert is optimistic in the log hook
    // and firing ten in parallel makes the list arrive in a random order.
    for (const r of source.rows) {
      await onAddRaw({
        name: r.name,
        grams: r.grams,
        kcal: r.kcal,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        mealType: r.meal_type ?? undefined,
      })
    }
    setBusy(false)
    onDone?.()
  }

  return (
    <button className={styles.card} onClick={copy} disabled={busy} type="button">
      <span className={styles.main}>
        {busy ? t('copy.carrying') : t('copy.button', { label })}
      </span>
      <span className={styles.detail}>
        {t('copy.detail', {
          n: source.rows.length,
          noun: t(source.rows.length === 1 ? 'copy.record.one' : 'copy.record.other'),
          kcal,
        })}
      </span>
    </button>
  )
}
