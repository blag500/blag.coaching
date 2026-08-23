import { useState } from 'react'
import { DEFAULT_TRAINING_BLOCKS } from '../../data/appData'
import styles from './TrainingEditor.module.css'

const GROUP_OPTIONS = [
  { id: 'upper', label: 'ГОРНА', hint: 'гърди · рамене · трицепс' },
  { id: 'pull',  label: 'ГРЪБ',  hint: 'лат · бицепс' },
  { id: 'lower', label: 'ДОЛНА', hint: 'крака · глутеус' },
  { id: 'extra', label: 'ЕКСТРА', hint: 'корем · предмишница · прасци · трапец' },
]

function freshBlock(pos) {
  return {
    id: String(Date.now() + pos),
    label: '',
    isRest: false,
    groups: [],
    muscles: [],
    exercises: [],
  }
}

function freshExercise(blockId) {
  return { id: `${blockId}-${Date.now()}`, name: '', sets: '3', reps: '10' }
}

function defaultBlocks(initialPlan) {
  if (initialPlan && initialPlan.length > 0 && initialPlan[0]?.day === undefined) {
    return initialPlan.map(block => {
      const blockId = block.id || crypto.randomUUID()
      return {
        ...block,
        id: blockId,
        exercises: (block.exercises || []).map(ex => ({
          ...ex,
          id: ex.id || crypto.randomUUID(),
        })),
      }
    })
  }
  // Deep-copy so DEFAULT_TRAINING_BLOCKS is never mutated by React state updates
  return DEFAULT_TRAINING_BLOCKS.map(block => ({
    ...block,
    exercises: block.exercises.map(ex => ({ ...ex })),
  }))
}

export default function TrainingEditor({ initialPlan, onSave, saving }) {
  const [blocks, setBlocks] = useState(() => defaultBlocks(initialPlan))
  const [openId, setOpenId] = useState(null)
  // The muscle field keeps the raw text the user is typing. Deriving the input's
  // value from the parsed array ate the comma the instant it was typed (the
  // empty trailing segment was filtered away), so a comma could never be typed.
  const [muscleRaw, setMuscleRaw] = useState({})

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
    setMuscleRaw(prev => ({ ...prev, [blockId]: raw }))
    const muscles = raw.split(',').map(s => s.trim()).filter(Boolean)
    updateBlock(blockId, 'muscles', muscles)
  }

  function toggleGroup(blockId, groupId) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b
      const current = new Set(Array.isArray(b.groups) ? b.groups : [])
      if (current.has(groupId)) current.delete(groupId)
      else current.add(groupId)
      return { ...b, groups: [...current] }
    }))
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

                {!block.isRest && (() => {
                  const chosen = new Set(Array.isArray(block.groups) ? block.groups : [])
                  const empty = chosen.size === 0
                  return (
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>
                        Мускулни групи за манекена
                        {empty && (
                          <span className={styles.needsPick}> · трябва избор</span>
                        )}
                      </label>
                      <div className={`${styles.chips} ${empty ? styles.chipsEmpty : ''}`}>
                        {GROUP_OPTIONS.map(g => (
                          <button
                            key={g.id}
                            type="button"
                            className={`${styles.chip} ${chosen.has(g.id) ? styles.chipOn : ''}`}
                            onClick={() => toggleGroup(block.id, g.id)}
                            title={g.hint}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

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
