import { useState, useRef } from 'react'
import styles from './FoodLog.module.css'

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

export default function FoodLog({ log, onRemove, onClear, onEdit, onAddRaw, onPhotoUpload, onPhotoRemove }) {
  const [editingId,    setEditingId]    = useState(null)
  const [draft,        setDraft]        = useState({})
  const [lastRemoved,  setLastRemoved]  = useState(null)
  const [uploadingId,  setUploadingId]  = useState(null)
  const [lightboxUrl,  setLightboxUrl]  = useState(null)

  const photoInputRef  = useRef()
  const photoTargetRef = useRef(null)  // which entry id the next pick targets

  function handleRemove(entry) {
    setLastRemoved(entry)
    onRemove(entry.id)
  }

  function handleUndo() {
    if (!lastRemoved) return
    onAddRaw({
      name:    lastRemoved.name,
      grams:   lastRemoved.grams,
      kcal:    lastRemoved.kcal,
      protein: lastRemoved.protein,
      carbs:   lastRemoved.carbs,
      fat:     lastRemoved.fat,
    })
    setLastRemoved(null)
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setDraft({
      name:    entry.name,
      grams:   String(entry.grams || ''),
      kcal:    String(entry.kcal),
      protein: String(entry.protein),
      carbs:   String(entry.carbs),
      fat:     String(entry.fat),
    })
  }

  function handleGramsChange(entry, val) {
    const g = parseFloat(val)
    if (g > 0 && entry.grams > 0) {
      const ratio = g / entry.grams
      setDraft(prev => ({
        ...prev,
        grams:   val,
        kcal:    String(Math.round(entry.kcal    * ratio)),
        protein: String(Math.round(entry.protein * ratio * 10) / 10),
        carbs:   String(Math.round(entry.carbs   * ratio * 10) / 10),
        fat:     String(Math.round(entry.fat     * ratio * 10) / 10),
      }))
    } else {
      setDraft(prev => ({ ...prev, grams: val }))
    }
  }

  function handleSave(entry) {
    onEdit(entry.id, {
      name:    draft.name.trim() || entry.name,
      grams:   parseFloat(draft.grams)              || 0,
      kcal:    Math.round(parseFloat(draft.kcal)     || 0),
      protein: Math.round((parseFloat(draft.protein) || 0) * 10) / 10,
      carbs:   Math.round((parseFloat(draft.carbs)   || 0) * 10) / 10,
      fat:     Math.round((parseFloat(draft.fat)     || 0) * 10) / 10,
    })
    setEditingId(null)
  }

  function openPhotoPicker(entryId) {
    photoTargetRef.current = entryId
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
      photoInputRef.current.click()
    }
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files[0]
    if (!file || !photoTargetRef.current || !onPhotoUpload) return
    const id = photoTargetRef.current
    setUploadingId(id)
    await onPhotoUpload(id, file)
    setUploadingId(null)
    photoTargetRef.current = null
  }

  if (log.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🍽</span>
        <p className={styles.emptyTitle}>Няма логнато хранене днес</p>
        <p className={styles.emptyHint}>Търси продукт или сканирай баркод по-горе</p>
        <button
          className={styles.emptyBtn}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          type="button"
        >
          + ДОБАВИ ХРАНА
        </button>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {/* Hidden file input shared across all entries */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoSelected}
      />

      <div className={styles.listHeader}>
        <span className={styles.listTitle}>Дневен лог ({log.length})</span>
        <div className={styles.headerActions}>
          <button
            className={`${styles.undoBtn} ${lastRemoved ? styles.undoBtnActive : ''}`}
            onClick={handleUndo}
            disabled={!lastRemoved}
            type="button"
            aria-label="Отмени последното премахване"
            title="Отмени"
          >
            <UndoIcon />
          </button>
          <button className={styles.clearBtn} onClick={onClear} type="button">Изчисти</button>
        </div>
      </div>

      <ul className={styles.list}>
        {log.map((entry, i) =>
          editingId === entry.id ? (
            <li key={entry.id} className={`${styles.entry} ${styles.entryEditing}`}>
              <div className={styles.editNameField}>
                <label className={styles.editLabel} htmlFor={`edit-name-${entry.id}`}>Наименование</label>
                <input
                  id={`edit-name-${entry.id}`}
                  className={styles.editInput}
                  type="text"
                  value={draft.name}
                  onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className={styles.editGramsRow}>
                <label className={styles.editLabel}>Грамаж</label>
                <input
                  className={styles.editInput}
                  type="number"
                  min="0"
                  value={draft.grams}
                  onChange={e => handleGramsChange(entry, e.target.value)}
                />
                <span className={styles.editUnit}>g</span>
              </div>

              <div className={styles.editMacroGrid}>
                {[
                  { key: 'kcal',    label: 'ккал' },
                  { key: 'protein', label: 'Протеин' },
                  { key: 'carbs',   label: 'Въгл.' },
                  { key: 'fat',     label: 'Мазн.' },
                ].map(({ key, label }) => (
                  <div key={key} className={styles.editMacroField}>
                    <label className={styles.editLabel}>{label}</label>
                    <input
                      className={styles.editInput}
                      type="number"
                      min="0"
                      value={draft[key]}
                      onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {onPhotoUpload && (
                <div className={styles.editPhotoRow}>
                  {entry.photo_url ? (
                    <button
                      type="button"
                      className={styles.editPhotoRemoveBtn}
                      onClick={() => onPhotoRemove && onPhotoRemove(entry.id, entry.photo_url)}
                    >
                      × Премахни снимката
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.editPhotoAddBtn}
                      onClick={() => openPhotoPicker(entry.id)}
                      disabled={uploadingId === entry.id}
                    >
                      {uploadingId === entry.id ? (
                        <><span className={styles.uploadDot} /> Качва...</>
                      ) : (
                        <><CameraIcon /> Добави снимка</>
                      )}
                    </button>
                  )}
                </div>
              )}

              <div className={styles.editActions}>
                <button className={styles.cancelEditBtn} onClick={() => setEditingId(null)} type="button">Отказ</button>
                <button className={styles.saveEditBtn} onClick={() => handleSave(entry)} type="button">Запази</button>
              </div>
            </li>
          ) : (
            <li key={entry.id} className={styles.entry} style={{ '--i': i }}>
              {/* Meal photo: thumbnail on left side if present */}
              {entry.photo_url && (
                <button
                  type="button"
                  className={styles.thumbBtn}
                  onClick={() => setLightboxUrl(entry.photo_url)}
                  aria-label="Виж снимката"
                >
                  <img src={entry.photo_url} className={styles.thumbImg} alt="" />
                </button>
              )}

              <div className={styles.entryLeft}>
                <span className={styles.entryName}>{entry.name}</span>
                <span className={styles.entryMacros}>
                  {entry.grams > 0 && <><span className={styles.entryGrams}>{entry.grams}g</span> · </>}
                  {entry.kcal} ккал · П{entry.protein}g · В{entry.carbs}g · М{entry.fat}g
                </span>
              </div>

              <div className={styles.entryRight}>
                <button
                  className={styles.editBtn}
                  onClick={() => startEdit(entry)}
                  aria-label={`Редактирай ${entry.name}`}
                  type="button"
                >
                  ✎
                </button>
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemove(entry)}
                  aria-label={`Премахни ${entry.name}`}
                  type="button"
                >
                  ×
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className={styles.lightbox} onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} className={styles.lightboxImg} alt="Ястие" />
          <button type="button" className={styles.lightboxClose} onClick={() => setLightboxUrl(null)} aria-label="Затвори">×</button>
        </div>
      )}
    </div>
  )
}
