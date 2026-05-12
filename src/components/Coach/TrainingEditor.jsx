import { useState } from 'react'
import { TRAINING_SPLIT } from '../../data/appData'
import styles from './TrainingEditor.module.css'

function defaultPlan() {
  return TRAINING_SPLIT.map((d, i) => ({
    id: String(i),
    day: d.day,
    label: d.label,
    isRest: d.label === 'REST',
    muscles: d.muscles || [],
    exercises: (d.exercises || []).map((e, j) => ({
      id: `${i}-${j}`,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      notes: '',
    })),
  }))
}

function newExercise(dayId, pos) {
  return { id: `${dayId}-${Date.now()}`, name: '', sets: '3', reps: '10', notes: '' }
}

export default function TrainingEditor({ initialPlan, onSave, saving }) {
  const [days, setDays] = useState(() =>
    initialPlan && initialPlan.length === 7 ? initialPlan : defaultPlan()
  )
  const [openDay, setOpenDay] = useState(null)

  function updateDay(dayId, field, value) {
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, [field]: value } : d))
  }

  function toggleRest(dayId) {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d
      const isRest = !d.isRest
      return { ...d, isRest, label: isRest ? 'REST' : '', exercises: isRest ? [] : d.exercises }
    }))
  }

  function addExercise(dayId) {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d
      return { ...d, exercises: [...d.exercises, newExercise(dayId, d.exercises.length)] }
    }))
  }

  function removeExercise(dayId, exId) {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d
      return { ...d, exercises: d.exercises.filter(e => e.id !== exId) }
    }))
  }

  function updateExercise(dayId, exId, field, value) {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d
      return {
        ...d,
        exercises: d.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e),
      }
    }))
  }

  return (
    <div className={styles.wrap}>
      {days.map(day => {
        const isOpen = openDay === day.id
        return (
          <div key={day.id} className={`${styles.dayCard} ${day.isRest ? styles.dayRest : ''}`}>

            {/* Day header */}
            <div className={styles.dayHeader}>
              <button
                className={styles.dayToggle}
                onClick={() => setOpenDay(isOpen ? null : day.id)}
                type="button"
              >
                <span className={styles.dayName}>{day.day}</span>
                <span className={`${styles.dayLabel} ${day.isRest ? styles.restLabel : ''}`}>
                  {day.label || '—'}
                </span>
                <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
              </button>
              <button
                className={`${styles.restToggle} ${day.isRest ? styles.restActive : ''}`}
                onClick={() => toggleRest(day.id)}
                type="button"
              >
                REST
              </button>
            </div>

            {isOpen && !day.isRest && (
              <div className={styles.dayBody}>
                {/* Label input */}
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>Наименование</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="напр. UPPER / LOWER A"
                    value={day.label}
                    onChange={e => updateDay(day.id, 'label', e.target.value)}
                  />
                </div>

                {/* Exercises */}
                <div className={styles.exList}>
                  {day.exercises.map((ex, idx) => (
                    <div key={ex.id} className={styles.exRow}>
                      <span className={styles.exNum}>{idx + 1}</span>
                      <input
                        className={`${styles.exInput} ${styles.exName}`}
                        type="text"
                        placeholder="Упражнение"
                        value={ex.name}
                        onChange={e => updateExercise(day.id, ex.id, 'name', e.target.value)}
                      />
                      <input
                        className={`${styles.exInput} ${styles.exSets}`}
                        type="text"
                        placeholder="Серии"
                        value={ex.sets}
                        onChange={e => updateExercise(day.id, ex.id, 'sets', e.target.value)}
                      />
                      <input
                        className={`${styles.exInput} ${styles.exReps}`}
                        type="text"
                        placeholder="Повт."
                        value={ex.reps}
                        onChange={e => updateExercise(day.id, ex.id, 'reps', e.target.value)}
                      />
                      <button
                        className={styles.exRemove}
                        onClick={() => removeExercise(day.id, ex.id)}
                        type="button"
                        aria-label="Изтрий упражнение"
                      >×</button>
                    </div>
                  ))}
                </div>

                <button
                  className={styles.addExBtn}
                  onClick={() => addExercise(day.id)}
                  type="button"
                >
                  + Добави упражнение
                </button>
              </div>
            )}
          </div>
        )
      })}

      <button
        className={styles.saveBtn}
        onClick={() => onSave(days)}
        disabled={saving}
        type="button"
      >
        {saving ? '...' : 'Запази плана'}
      </button>
    </div>
  )
}
