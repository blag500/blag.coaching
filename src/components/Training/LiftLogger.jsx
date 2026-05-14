import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './LiftLogger.module.css'

export default function LiftLogger({ exercise, onClose }) {
  const { addExerciseLog } = useAuth()
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [sets, setSets] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!weight || !reps) return
    setSaving(true)
    await addExerciseLog(exercise.name, weight, reps, sets, notes)
    setSaving(false)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 1500)
  }

  return (
    <div className={styles.modal}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.content}>
        <h3 className={styles.title}>{exercise.name}</h3>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label}>Тегло (kg)</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="20.5"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Повторения</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={reps}
              onChange={e => setReps(e.target.value)}
              placeholder="8"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Серии</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={sets}
              onChange={e => setSets(e.target.value)}
              placeholder={exercise.sets}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Бележки (опционално)</label>
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Чувствах се добре, лесно беше..."
              rows="2"
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.cancel}
            onClick={onClose}
            type="button"
          >
            Отмени
          </button>
          <button
            className={`${styles.save} ${saved ? styles.saveDone : ''}`}
            onClick={handleSave}
            disabled={saving || !weight || !reps}
            type="button"
          >
            {saving ? '...' : saved ? '✓ Записано' : 'Запази'}
          </button>
        </div>
      </div>
    </div>
  )
}
