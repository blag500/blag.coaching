import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { defaultHabits } from '../../data/appData'
import styles from './HabitsEditor.module.css'
import { useSettings } from '../../contexts/SettingsContext'

/**
 * Custom habits — the six defaults were "everyone's habits", which is nobody's.
 * A person cutting sugar for three months wants "Без захар" until they don't;
 * a runner wants "10K стъпки" not "8K". This editor lets each client keep the
 * list that means something to their own week.
 *
 * Empties revert to the default set on save, so an inadvertent "clear all"
 * still leaves the client with something to check off.
 */
export default function HabitsEditor() {
  const { t } = useSettings()
  const { profile, updateProfile } = useAuth()

  const initial = profile?.habits?.length > 0 ? profile.habits : defaultHabits(t)
  const [rows, setRows] = useState(() => initial.map(h => ({ ...h })))
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Follow the server if it changed under us — but only when the local list
  // is not being edited.
  const lastServerRef = useRef(JSON.stringify(initial))
  useEffect(() => {
    if (dirty) return
    const nextServer = JSON.stringify(profile?.habits?.length > 0 ? profile.habits : defaultHabits(t))
    if (nextServer !== lastServerRef.current) {
      lastServerRef.current = nextServer
      setRows(JSON.parse(nextServer))
    }
  }, [profile?.habits, dirty])

  function update(i, patch) {
    setRows(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
    setDirty(true); setSaved(false); setErr('')
  }
  function remove(i) {
    setRows(prev => prev.filter((_, j) => j !== i))
    setDirty(true); setSaved(false)
  }
  function add() {
    setRows(prev => [...prev, {
      id: `h_${Math.random().toString(36).slice(2, 8)}`,
      emoji: '✅',
      label: '',
    }])
    setDirty(true); setSaved(false)
  }
  function reset() {
    setRows(defaultHabits(t))
    setDirty(true); setSaved(false)
  }
  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    setRows(prev => {
      const c = [...prev]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })
    setDirty(true); setSaved(false)
  }

  async function save() {
    setErr('')
    // Trim + drop blanks; empty label = the row was never finished.
    const clean = rows
      .map(r => ({ ...r, label: (r.label || '').trim(), emoji: (r.emoji || '').trim() || '•' }))
      .filter(r => r.label.length > 0)
    setSaving(true)
    const { error } = await updateProfile({ habits: clean.length ? clean : null })
    setSaving(false)
    if (error) { setErr(error.message || t('he.saveFailed')); return }
    setDirty(false); setSaved(true)
    lastServerRef.current = JSON.stringify(clean.length ? clean : defaultHabits(t))
    setTimeout(() => setSaved(false), 1600)
  }

  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {rows.map((h, i) => (
          <li key={i} className={styles.row}>
            <input
              className={styles.emoji}
              value={h.emoji ?? ''}
              onChange={e => update(i, { emoji: e.target.value })}
              maxLength={4}
              aria-label={t('he.emoji')}
            />
            <input
              className={styles.label}
              value={h.label ?? ''}
              onChange={e => update(i, { label: e.target.value })}
              placeholder={t('he.namePh')}
              aria-label={t('he.nameAria')}
            />
            <div className={styles.reorder}>
              <button
                type="button"
                className={styles.reorderBtn}
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={t('he.up')}
              >▲</button>
              <button
                type="button"
                className={styles.reorderBtn}
                onClick={() => move(i, +1)}
                disabled={i === rows.length - 1}
                aria-label={t('he.down')}
              >▼</button>
            </div>
            <button
              type="button"
              className={styles.remove}
              onClick={() => remove(i)}
              aria-label={t('he.remove')}
            >×</button>
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        <button type="button" className={styles.addBtn} onClick={add}>
          {t('he.add')}
        </button>
        <button type="button" className={styles.resetBtn} onClick={reset}>
          {t('he.defaults')}
        </button>
      </div>

      {dirty && (
        <button
          type="button"
          className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
          onClick={save}
          disabled={saving}
        >
          {saved ? t('he.saved') : saving ? '...' : t('he.save')}
        </button>
      )}

      {err && <p className={styles.err}>{err}</p>}
    </div>
  )
}
