import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useExercisePhotos } from '../../hooks/useExercisePhotos'
import { FINE_MUSCLES } from '../../utils/recovery'
import styles from './TrainingEditor.module.css'

// Fine-grained muscle chips на блок ниво — заменят стария 4-групов ГОРНА/ГРЪБ/
// ДОЛНА/ЕКСТРА. resolveGroups() в utils/recovery.js вече транслира fine id-та
// към широките групи, така че манекенът и recovery clock-ът продължават да
// работят без промяна.
const GROUP_OPTIONS = FINE_MUSCLES.map(m => ({
  id: m.id,
  label: m.label.toUpperCase(),
}))

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
  // От нулата — празен списък. „Готова програма" остава като отделен път от
  // Training.jsx (applyStarter копира DEFAULT_TRAINING_BLOCKS в профила преди
  // да отвори editor-а).
  return []
}

export default function TrainingEditor({ initialPlan, onSave, saving }) {
  const [blocks, setBlocks] = useState(() => defaultBlocks(initialPlan))
  const [openId, setOpenId] = useState(null)
  const { byName: photos, upload } = useExercisePhotos()
  // Modal state — { blockId, exercise } когато редактираме съществуващо, или
  // { blockId, exercise: null } когато добавяме ново.
  const [modal, setModal] = useState(null)

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

  function removeExercise(blockId, exId) {
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, exercises: b.exercises.filter(e => e.id !== exId) } : b
    ))
  }

  function saveExercise(blockId, ex) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b
      const exists = b.exercises.some(e => e.id === ex.id)
      const exercises = exists
        ? b.exercises.map(e => e.id === ex.id ? ex : e)
        : [...b.exercises, ex]
      return { ...b, exercises }
    }))
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
                    {block.exercises.map((ex, i) => {
                      const url = ex.name ? photos[ex.name] : null
                      const muscle = FINE_MUSCLES.find(m => m.id === ex.muscle)
                      return (
                        <div key={ex.id} className={styles.exRow}>
                          <span className={styles.exNum}>{i + 1}</span>
                          <button
                            type="button"
                            className={styles.exCard}
                            onClick={() => setModal({ blockId: block.id, exercise: ex })}
                          >
                            <span className={`${styles.exThumb} ${url ? styles.exThumbHas : ''}`}>
                              {url ? <img src={url} alt="" className={styles.exThumbImg} /> : '📷'}
                            </span>
                            <span className={styles.exBody}>
                              <span className={styles.exName}>{ex.name || '(без име)'}</span>
                              <span className={styles.exMeta}>
                                {muscle && <span className={styles.exMuscle}>{muscle.label}</span>}
                                <span className={styles.exReps}>{ex.sets || '?'} × {ex.reps || '?'}</span>
                                {ex.note && <span className={styles.exNoteDot} title={ex.note}>·</span>}
                              </span>
                            </span>
                          </button>
                          <button
                            className={styles.exRemove}
                            onClick={() => removeExercise(block.id, ex.id)}
                            type="button"
                            aria-label="Изтрий упражнение"
                          >×</button>
                        </div>
                      )
                    })}
                    <button
                      className={styles.addExBtn}
                      onClick={() => setModal({ blockId: block.id, exercise: null })}
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

      {modal && (
        <ExerciseModal
          blockId={modal.blockId}
          exercise={modal.exercise}
          photos={photos}
          upload={upload}
          onCancel={() => setModal(null)}
          onSave={ex => { saveExercise(modal.blockId, ex); setModal(null) }}
        />
      )}
    </div>
  )
}

function ExerciseModal({ blockId, exercise, photos, upload, onCancel, onSave }) {
  const isEdit = !!exercise
  const [name, setName]     = useState(exercise?.name ?? '')
  const [sets, setSets]     = useState(exercise?.sets ?? '3')
  const [reps, setReps]     = useState(exercise?.reps ?? '10')
  const [note, setNote]     = useState(exercise?.note ?? '')
  const [muscle, setMuscle] = useState(exercise?.muscle ?? '')
  const [busy, setBusy]     = useState(false)
  const photoUrl = name ? photos[name] : null

  async function handlePhoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !name.trim()) return
    setBusy(true)
    await upload(name.trim(), f)
    setBusy(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      id:     exercise?.id ?? `${blockId}-${Date.now()}`,
      name:   name.trim(),
      sets:   sets.trim() || '3',
      reps:   reps.trim() || '10',
      note:   note.trim(),
      muscle: muscle || null,
    })
  }

  return createPortal(
    <div className={styles.modalOverlay} onClick={onCancel}>
      <form className={styles.modal} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className={styles.modalHead}>
          <span className={styles.modalTitle}>{isEdit ? 'Редакция' : 'Ново упражнение'}</span>
          <button type="button" className={styles.modalClose} onClick={onCancel} aria-label="Затвори">×</button>
        </div>

        <label className={styles.modalPhoto}>
          <input type="file" accept="image/*" onChange={handlePhoto} disabled={!name.trim()} />
          {busy
            ? <span className={styles.modalPhotoBusy}>…</span>
            : photoUrl
              ? <img src={photoUrl} alt="" />
              : <span className={styles.modalPhotoEmpty}>{name.trim() ? '📷 Добави снимка' : 'Кръсти упражнението, за да добавиш снимка'}</span>}
        </label>

        <label className={styles.modalField}>
          <span>Име</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
                 placeholder="напр. Лежанка с щанга" autoFocus />
        </label>

        <div className={styles.modalRow}>
          <label className={styles.modalField}>
            <span>Серии</span>
            <input type="text" inputMode="numeric" value={sets} onChange={e => setSets(e.target.value)} />
          </label>
          <label className={styles.modalField}>
            <span>Повторения</span>
            <input type="text" value={reps} onChange={e => setReps(e.target.value)}
                   placeholder="напр. 8–10" />
          </label>
        </div>

        <label className={styles.modalField}>
          <span>Мускул</span>
          <select value={muscle} onChange={e => setMuscle(e.target.value)}>
            <option value="">(не е зададен)</option>
            {FINE_MUSCLES.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>

        <label className={styles.modalField}>
          <span>Бележка</span>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                    placeholder="Темпо, техника, каденс…" />
        </label>

        <div className={styles.modalActions}>
          <button type="button" className={styles.modalCancel} onClick={onCancel}>Отказ</button>
          <button type="submit" className={styles.modalSave} disabled={!name.trim()}>
            {isEdit ? 'Запази' : 'Добави'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
