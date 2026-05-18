import { useState } from 'react'
import { DEFAULT_TRAINING_BLOCKS } from '../../data/appData'
import styles from './TrainingEditor.module.css'

function freshBlock(pos) {
  return {
    id: String(Date.now() + pos),
    label: '',
    isRest: false,
    muscles: [],
    exercises: [],
  }
}

function freshExercise(blockId) {
  return { id: `${blockId}-${Date.now()}`, name: '', sets: '3', reps: '10' }
}

function defaultBlocks(initialPlan) {
  if (initialPlan && initialPlan.length > 0 && initialPlan[0]?.day === undefined) {
    return initialPlan
  }
  return DEFAULT_TRAINING_BLOCKS
}

export default function TrainingEditor({ initialPlan, onSave, saving }) {
  const [blocks, setBlocks] = useState(() => defaultBlocks(initialPlan))
  const [openId, setOpenId] = useState(null)

  function updateBlock(id, field, value) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b))
  }

  function toggleRest(id) {
    setBlocks(prev => prev.map(b => b.id === id
      ? { ...b, isRest: !b.isRest, exercises: !b.isRest ? [] : b.exercises }
      : b
    ))
  }

  function addBlock() {
    const nb = freshBlock(blocks.length)
    setBlocks(prev => [...prev, nb])
    setOpenId(nb.id)
  }

  function removeBlock(id) {
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (openId === id) setOpenId(null)
  }

  function addExercise(blockId) {
    const ex = freshExercise(blockId)
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, exercises: [...b.exercises, ex] } : b
    ))
  }

  function removeExercise(blockId, exId) {
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, exercises: b.exercises.filter(e => e.id !== exId) } : b
    ))
  }

  function updateExercise(blockId, exId, field, value) {
    setBlocks(prev => prev.map(b =>
      b.id === blockId
        ? { ...b, exercises: b.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e) }
        : b
    ))
  }

  function updateMuscles(blockId, raw) {
    const muscles = raw.split(',').map(s => s.trim()).filter(Boolean)
    updateBlock(blockId, 'muscles', muscles)
  }

  return (
    <div className={styles.wrap}>
      {blocks.map((block, idx) => {
        const isOpen = openId === block.id
        return (
          <div key={block.id} className={`${styles.blockCard} ${block.isRest ? styles.blockRest : ''}`}>
            <div className={styles.blockHeader}>
              <button
                className={styles.blockToggle}
                onClick={() => setOpenId(isOpen ? null : block.id)}
                type="button"
              >
                <span className={styles.blockIdx}>{idx + 1}</span>
                <span className={styles.blockLabel}>{block.label || '(без име)'}</span>
                <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
              </button>
              <div className={styles.blockHeaderRight}>
                <button
                  className={`${styles.restToggle} ${block.isRest ? styles.restActive : ''}`}
                  onClick={() => toggleRest(block.id)}
                  type="button"
                >
                  REST
                </button>
                <button
                  className={styles.removeBlock}
                  onClick={() => removeBlock(block.id)}
                  type="button"
                  aria-label="Изтрий блок"
                >
                  ×
                </button>
              </div>
            </div>

            {isOpen && (
              <div className={styles.blockBody}>
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>Наименование на блока</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="напр. Upper A, Push, Крака..."
                    value={block.label}
                    onChange={e => updateBlock(block.id, 'label', e.target.value)}
                  />
                </div>

                {!block.isRest && (
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Мускулни групи (разделени със запетая)</label>
                    <input
                      className={styles.fieldInput}
                      type="text"
                      placeholder="напр. Гърди, Гръб, Рамене"
                      value={block.muscles.join(', ')}
                      onChange={e => updateMuscles(block.id, e.target.value)}
                    />
                  </div>
                )}

                {!block.isRest && (
                  <div className={styles.exList}>
                    {block.exercises.map((ex, i) => (
                      <div key={ex.id} className={styles.exRow}>
                        <span className={styles.exNum}>{i + 1}</span>
                        <input
                          className={`${styles.exInput} ${styles.exName}`}
                          type="text"
                          placeholder="Упражнение"
                          value={ex.name}
                          onChange={e => updateExercise(block.id, ex.id, 'name', e.target.value)}
                        />
                        <input
                          className={`${styles.exInput} ${styles.exSets}`}
                          type="text"
                          placeholder="Сер."
                          value={ex.sets}
                          onChange={e => updateExercise(block.id, ex.id, 'sets', e.target.value)}
                        />
                        <input
                          className={`${styles.exInput} ${styles.exReps}`}
                          type="text"
                          placeholder="Повт."
                          value={ex.reps}
                          onChange={e => updateExercise(block.id, ex.id, 'reps', e.target.value)}
                        />
                        <button
                          className={styles.exRemove}
                          onClick={() => removeExercise(block.id, ex.id)}
                          type="button"
                          aria-label="Изтрий упражнение"
                        >×</button>
                      </div>
                    ))}
                    <button
                      className={styles.addExBtn}
                      onClick={() => addExercise(block.id)}
                      type="button"
                    >
                      + Добави упражнение
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <button className={styles.addBlockBtn} onClick={addBlock} type="button">
        + Нов блок
      </button>

      <button
        className={styles.saveBtn}
        onClick={() => onSave(blocks)}
        disabled={saving}
        type="button"
      >
        {saving ? '...' : 'Запази плана'}
      </button>
    </div>
  )
}
