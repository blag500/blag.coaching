import { useState } from 'react'
import { MET_ACTIVITIES, calcKcal } from '../../hooks/useActivityLog'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ActivityLog.module.css'

export default function ActivityLog({ activities, totalKcalBurned, onAdd, onRemove }) {
  const { profile } = useAuth()
  const [selectedId, setSelectedId] = useState(MET_ACTIVITIES[0].id)
  const [duration, setDuration] = useState('30')
  const [adding, setAdding] = useState(false)

  const weightKg = profile?.weight_kg ?? 75
  const selected = MET_ACTIVITIES.find(a => a.id === selectedId)
  const preview = selected ? calcKcal(selected.met, weightKg, parseInt(duration) || 0) : 0

  async function handleAdd() {
    const mins = parseInt(duration)
    if (!mins || mins <= 0) return
    setAdding(true)
    await onAdd(selectedId, mins)
    setAdding(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        <div className={styles.chips}>
          {MET_ACTIVITIES.map(act => (
            <button
              key={act.id}
              type="button"
              className={`${styles.chip} ${selectedId === act.id ? styles.chipActive : ''}`}
              onClick={() => setSelectedId(act.id)}
            >
              {act.label}
            </button>
          ))}
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
              placeholder="мин."
            />
            <span className={styles.durationUnit}>мин.</span>
          </div>
          {preview > 0 && (
            <span className={styles.preview}>≈ {preview} ккал</span>
          )}
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAdd}
            disabled={adding || !parseInt(duration)}
          >
            {adding ? '...' : '+ ДОБАВИ'}
          </button>
        </div>
      </div>

      {activities.length > 0 && (
        <div className={styles.list}>
          {activities.map(a => (
            <div key={a.id} className={styles.entry}>
              <div className={styles.entryInfo}>
                <span className={styles.entryName}>{a.activity}</span>
                <span className={styles.entryMeta}>{a.duration_min} мин</span>
              </div>
              <span className={styles.entryKcal}>−{a.kcal_burned} ккал</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onRemove(a.id)}
                aria-label="Изтрий"
              >
                ×
              </button>
            </div>
          ))}
          <div className={styles.total}>
            <span className={styles.totalLabel}>ОБЩО ИЗГОРЕНИ</span>
            <span className={styles.totalVal}>{totalKcalBurned} ккал</span>
          </div>
        </div>
      )}

      {activities.length === 0 && (
        <p className={styles.empty}>Няма записана активност за днес</p>
      )}
    </div>
  )
}
