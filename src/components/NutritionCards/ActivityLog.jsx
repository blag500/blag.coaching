import { useState, useMemo, useRef, useEffect } from 'react'
import { MET_ACTIVITIES, calcKcal } from '../../hooks/useActivityLog'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ActivityLog.module.css'
import { useSettings } from '../../contexts/SettingsContext'

export default function ActivityLog({ activities, totalKcalBurned, onAdd, onRemove }) {
  const { t } = useSettings()
  const { profile } = useAuth()
  const [selectedId, setSelectedId] = useState(MET_ACTIVITIES[0].id)
  const [duration, setDuration] = useState('30')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)

  const weightKg = profile?.weight_kg ?? 75
  const selected = MET_ACTIVITIES.find(a => a.id === selectedId)
  const preview = selected ? calcKcal(selected.met, weightKg, parseInt(duration) || 0) : 0

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return MET_ACTIVITIES
    return MET_ACTIVITIES.filter(a => a.label.toLowerCase().includes(q))
  }, [query])

  // Close the dropdown when tapping outside
  useEffect(() => {
    if (!dropdownOpen) return
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [dropdownOpen])

  function pick(id) {
    setSelectedId(id)
    setDropdownOpen(false)
    setQuery('')
  }

  async function handleAdd() {
    const mins = parseInt(duration)
    if (!mins || mins <= 0) { setError(t('al.errMinutes')); return }
    setError('')
    setAdding(true)
    const res = await onAdd(selectedId, mins)
    setAdding(false)
    if (res?.error) setError(t('al.errSave'))
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        {/* Searchable activity dropdown */}
        <div className={styles.selectWrap} ref={wrapRef}>
          <button
            type="button"
            className={styles.selectBtn}
            onClick={() => setDropdownOpen(o => !o)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <span className={styles.selectValue}>{selected?.label ?? t('al.pickActivity')}</span>
            <span className={`${styles.selectChevron} ${dropdownOpen ? styles.selectChevronOpen : ''}`}>›</span>
          </button>

          {dropdownOpen && (
            <div className={styles.selectPanel}>
              <input
                className={styles.searchInput}
                type="text"
                placeholder={t('al.searchPh')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              <ul className={styles.optionList} role="listbox">
                {filtered.map(a => (
                  <li key={a.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={a.id === selectedId}
                      className={`${styles.option} ${a.id === selectedId ? styles.optionActive : ''}`}
                      onClick={() => pick(a.id)}
                    >
                      {a.label}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className={styles.optionEmpty}>{t('al.noResult')}</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.row}>
          <div className={styles.durationWrap}>
            <input
              className={styles.durationInput}
              type="number"
              min="1"
              max="480"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder={t('al.minPh')}
            />
            <span className={styles.durationUnit}>{t('al.minUnit')}</span>
          </div>
          {preview > 0 && (
            <span className={styles.preview}>{t('al.preview', { n: preview })}</span>
          )}
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAdd}
            disabled={adding || !parseInt(duration)}
          >
            {adding ? '...' : t('al.add')}
          </button>
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>

      {activities.length > 0 && (
        <div className={styles.list}>
          {activities.map(a => (
            <div key={a.id} className={styles.entry}>
              <div className={styles.entryInfo}>
                <span className={styles.entryName}>{a.activity}</span>
                <span className={styles.entryMeta}>{t('al.entryMeta', { n: a.duration_min })}</span>
              </div>
              <span className={styles.entryKcal}>{t('al.entryKcal', { n: a.kcal_burned })}</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onRemove(a.id)}
                aria-label={t('al.delete')}
              >
                ×
              </button>
            </div>
          ))}
          <div className={styles.total}>
            <span className={styles.totalLabel}>{t('al.totalLabel')}</span>
            <span className={styles.totalVal}>{t('al.totalVal', { n: totalKcalBurned })}</span>
          </div>
        </div>
      )}

      {activities.length === 0 && (
        <p className={styles.empty}>{t('al.empty')}</p>
      )}
    </div>
  )
}
