import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useExercisePhotos } from '../../hooks/useExercisePhotos'
import { FINE_MUSCLES, GROUP_LABEL_KEYS } from '../../utils/recovery'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './TrainingEditor.module.css'

// Fine-grained muscle chips на блок ниво — заменят стария 4-групов ГОРНА/ГРЪБ/
// ДОЛНА/ЕКСТРА. resolveGroups() в utils/recovery.js вече транслира fine id-та
// към широките групи, така че манекенът и recovery clock-ът продължават да
// работят без промяна.
const GROUP_OPTIONS = FINE_MUSCLES.map(m => ({
  id: m.id,
  labelKey: m.labelKey,
}))

/* Два списъка, разделени по кръста.
 *
 * Дотук тук стояха осемнайсет хапчета едно до друго — и то празни, защото
 * чипът рисуваше g.label, а обектът има само labelKey. Изборът беше
 * гадаене по местоположение.
 *
 * Кръстът е границата, защото тя е една и всеки знае къде е. Коремът,
 * косите и долният гръб са над него — трупът е горна част. */
const LOWER_IDS = new Set(['quads', 'hamstrings', 'glutes', 'adductors', 'abductors', 'calves'])

/* Как се казва един записан идентификатор.
   Планове от преди фините мускули пазят широката група — 'upper', 'lower',
   'pull', 'extra'. Без това те не се намират в списъка с фините и блокът
   изглежда без избрани групи, без да е — тоест мълчаливо лъже. */
function groupLabelKey(id) {
  return GROUP_OPTIONS.find(g => g.id === id)?.labelKey ?? GROUP_LABEL_KEYS[id] ?? null
}
const UPPER_OPTIONS = GROUP_OPTIONS.filter(g => !LOWER_IDS.has(g.id))
const LOWER_OPTIONS = GROUP_OPTIONS.filter(g =>  LOWER_IDS.has(g.id))

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
  // Training.jsx (applyStarter копира defaultTrainingBlocks() в профила преди
  // да отвори editor-а).
  return []
}

export default function TrainingEditor({ initialPlan, onSave, saving }) {
  const { t } = useSettings()
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
                <span className={styles.blockLabel}>{block.label || t('te.unnamedBlock')}</span>
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
                  aria-label={t('te.deleteBlock')}
                >
                  ×
                </button>
              </div>
            </div>

            {isOpen && (
              <div className={styles.blockBody}>
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{t('te.blockName')}</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder={t('te.blockNamePh')}
                    value={block.label}
                    onChange={e => updateBlock(block.id, 'label', e.target.value)}
                  />
                </div>

                {!block.isRest && (() => {
                  const chosen = new Set(Array.isArray(block.groups) ? block.groups : [])
                  const empty = chosen.size === 0
                  const summary = empty
                    ? t('te.needsChoice')
                    : [...chosen].map(id => groupLabelKey(id)).filter(Boolean).map(k => t(k).toUpperCase()).join(' · ')
                  return (
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>{t('te.mannequinGroups')}</label>

                      {/* Избраното — винаги видимо, с х за махане. Падащият списък
                          добавя; той не е мястото, където се чете какво вече е избрано. */}
                      {!empty && (
                        <div className={styles.muscleChosen}>
                          {[...chosen].map(id => {
                            const key = groupLabelKey(id)
                            if (!key) return null
                            return (
                              <button
                                key={id}
                                type="button"
                                className={styles.chipOn}
                                onClick={() => toggleGroup(block.id, id)}
                                aria-label={t('te.muscleRemove', { name: t(key) })}
                              >
                                {t(key)} <span aria-hidden="true">×</span>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      <div className={styles.muscleSelects}>
                        {[
                          { key: 'te.upperHalf', opts: UPPER_OPTIONS },
                          { key: 'te.lowerHalf', opts: LOWER_OPTIONS },
                        ].map(({ key, opts }) => (
                          <select
                            key={key}
                            className={`${styles.muscleSelect} ${empty ? styles.muscleSelectEmpty : ''}`}
                            value=""
                            onChange={e => { if (e.target.value) toggleGroup(block.id, e.target.value) }}
                            aria-label={t(key)}
                          >
                            <option value="">{t(key)}</option>
                            {opts.map(g => (
                              <option key={g.id} value={g.id} disabled={chosen.has(g.id)}>
                                {t(g.labelKey)}
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>

                      {empty && <p className={styles.muscleNeed}>{summary}</p>}
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
                              <span className={styles.exName}>
                                <span className={styles.exNameText}>{ex.name || t('te.unnamedBlock')}</span>
                                {ex.note && <span className={styles.exNote}>· {ex.note}</span>}
                              </span>
                              <span className={styles.exMeta}>
                                {muscle && <span className={styles.exMuscle}>{t(muscle.labelKey)}</span>}
                                <span className={styles.exReps}>{ex.sets || '?'} × {ex.reps || '?'}</span>
                              </span>
                            </span>
                          </button>
                          <button
                            className={styles.exRemove}
                            onClick={() => removeExercise(block.id, ex.id)}
                            type="button"
                            aria-label={t('te.deleteExercise')}
                          >×</button>
                        </div>
                      )
                    })}
                    <button
                      className={styles.addExBtn}
                      onClick={() => setModal({ blockId: block.id, exercise: null })}
                      type="button"
                    >
                      {t('te.addExercise')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <button className={styles.addBlockBtn} onClick={addBlock} type="button">
        {t('te.newBlock')}
      </button>

      <button
        className={styles.saveBtn}
        onClick={() => onSave(blocks)}
        disabled={saving}
        type="button"
      >
        {saving ? '...' : t('te.savePlan')}
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
  const { t } = useSettings()
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
          <span className={styles.modalTitle}>{isEdit ? t('te.modalEdit') : t('te.modalNew')}</span>
          <button type="button" className={styles.modalClose} onClick={onCancel} aria-label={t('te.close')}>×</button>
        </div>

        <label className={styles.modalPhoto}>
          <input type="file" accept="image/*" onChange={handlePhoto} disabled={!name.trim()} />
          {busy
            ? <span className={styles.modalPhotoBusy}>…</span>
            : photoUrl
              ? <img src={photoUrl} alt="" />
              : <span className={styles.modalPhotoEmpty}>{name.trim() ? t('te.addPhoto') : t('te.nameFirst')}</span>}
        </label>

        <label className={styles.modalField}>
          <span>{t('te.name')}</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
                 placeholder={t('te.namePh')} autoFocus />
        </label>

        <div className={styles.modalRow}>
          <label className={styles.modalField}>
            <span>{t('te.sets')}</span>
            <input type="text" inputMode="numeric" value={sets} onChange={e => setSets(e.target.value)} />
          </label>
          <label className={styles.modalField}>
            <span>{t('te.reps')}</span>
            <input type="text" value={reps} onChange={e => setReps(e.target.value)}
                   placeholder={t('te.repsPh')} />
          </label>
        </div>

        <label className={styles.modalField}>
          <span>{t('te.muscle')}</span>
          <select value={muscle} onChange={e => setMuscle(e.target.value)}>
            <option value="">{t('te.muscleNone')}</option>
            {FINE_MUSCLES.map(m => (
              <option key={m.id} value={m.id}>{t(m.labelKey)}</option>
            ))}
          </select>
        </label>

        <label className={styles.modalField}>
          <span>{t('te.note')}</span>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                    placeholder={t('te.notePh')} />
        </label>

        <div className={styles.modalActions}>
          <button type="button" className={styles.modalCancel} onClick={onCancel}>{t('te.cancel')}</button>
          <button type="submit" className={styles.modalSave} disabled={!name.trim()}>
            {isEdit ? t('te.save') : t('te.add')}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
