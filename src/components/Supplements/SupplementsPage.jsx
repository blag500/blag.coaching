import { useState } from 'react'
import { useSupplements } from '../../hooks/useSupplements'
import styles from './SupplementsPage.module.css'

const TIMING_OPTIONS = [
  'Сутринта', 'На гладно', 'Преди тренировка',
  'След тренировка', 'Вечерта', 'Преди сън',
]

export default function SupplementsPage() {
  const { supplements, taken, loading, toggle, addSupplement, removeSupplement, takenCount, totalCount, streak, getSupplementStreak } = useSupplements()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDose, setNewDose] = useState('')
  const [newTiming, setNewTiming] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    await addSupplement({ name: newName.trim(), dose: newDose.trim(), timing: newTiming })
    setNewName('')
    setNewDose('')
    setNewTiming('')
    setShowAdd(false)
    setSaving(false)
  }

  if (loading) return null

  const allDone = totalCount > 0 && takenCount === totalCount

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>СУПЛЕМЕНТИ</h1>
          <p className={styles.subtitle}>ДНЕВЕН СТЕК</p>
        </div>
        <div className={styles.headerRight}>
          {streak > 1 && (
            <div className={styles.streakBadge}>
              <span className={styles.streakFire}>🔥</span>
              <span className={styles.streakNum}>{streak}</span>
            </div>
          )}
          {totalCount > 0 && (
            <div className={`${styles.badge} ${allDone ? styles.badgeDone : ''}`}>
              <span className={styles.badgeNum}>{takenCount}</span>
              <span className={styles.badgeOf}>/{totalCount}</span>
            </div>
          )}
        </div>
      </header>

      <div className={styles.list}>
        {supplements.length === 0 ? (
          <div className={styles.empty}>
            <p>Стекът е празен.</p>
            <p className={styles.emptyHint}>Добави суплементи с бутона долу.</p>
          </div>
        ) : (
          supplements.map(s => {
            const suppStreak = getSupplementStreak(s.id)
            return (
              <div key={s.id} className={`${styles.row} ${taken[s.id] ? styles.rowDone : ''}`}>
                <button
                  className={`${styles.check} ${taken[s.id] ? styles.checkDone : ''}`}
                  onClick={() => toggle(s.id)}
                  type="button"
                  aria-label={taken[s.id] ? 'Отмени' : 'Маркирай като взет'}
                >
                  {taken[s.id] && <span>✓</span>}
                </button>
                <div className={styles.info}>
                  <span className={`${styles.name} ${taken[s.id] ? styles.nameDone : ''}`}>{s.name}</span>
                  <div className={styles.metaRow}>
                    {(s.dose || s.timing) && (
                      <span className={styles.meta}>{[s.dose, s.timing].filter(Boolean).join(' · ')}</span>
                    )}
                    {suppStreak > 1 && (
                      <span className={styles.suppStreak}>🔥 {suppStreak}</span>
                    )}
                  </div>
                </div>
                <button className={styles.del} onClick={() => removeSupplement(s.id)} type="button" aria-label="Изтрий">
                  ×
                </button>
              </div>
            )
          })
        )}
      </div>

      {showAdd ? (
        <div className={styles.addForm}>
          <input
            className={styles.input}
            placeholder="Магнезий бисглицинат"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
          />
          <input
            className={styles.input}
            placeholder="Доза (напр. 400mg)"
            value={newDose}
            onChange={e => setNewDose(e.target.value)}
          />
          <div className={styles.timingChips}>
            {TIMING_OPTIONS.map(t => (
              <button
                key={t}
                type="button"
                className={`${styles.chip} ${newTiming === t ? styles.chipActive : ''}`}
                onClick={() => setNewTiming(prev => prev === t ? '' : t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className={styles.addActions}>
            <button className={styles.cancelBtn} onClick={() => setShowAdd(false)} type="button">
              ОТКАЗ
            </button>
            <button
              className={styles.saveBtn}
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              type="button"
            >
              {saving ? '...' : '+ ДОБАВИ'}
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.addBtn} onClick={() => setShowAdd(true)} type="button">
          + ДОБАВИ СУПЛЕМЕНТ
        </button>
      )}
    </div>
  )
}
