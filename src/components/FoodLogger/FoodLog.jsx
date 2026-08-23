import { useState, useRef } from 'react'
import CopyPreviousDay from './CopyPreviousDay'
import QuickAddSheet from './QuickAddSheet'
import { MEALS, MEAL_LABEL } from './meals'
import Pictogram from '../Pictogram/Pictogram'
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

export default function FoodLog({ log, onRemove, onClear, onEdit, onAddRaw, onPhotoUpload, onPhotoRemove, date }) {
  const [editingId,    setEditingId]    = useState(null)
  const [draft,        setDraft]        = useState({})
  const [lastRemoved,  setLastRemoved]  = useState(null)
  const [uploadingId,  setUploadingId]  = useState(null)
  const [lightboxUrl,  setLightboxUrl]  = useState(null)
  const [quickMeal,    setQuickMeal]    = useState(null)  // section + → history sheet

  const photoInputRef  = useRef()
  const photoTargetRef = useRef(null)  // which entry id the next pick targets

  function handleRemove(entry) {
    setLastRemoved(entry)
    onRemove(entry.id)
  }

  function handleUndo() {
    if (!lastRemoved) return
    onAddRaw({
      name:     lastRemoved.name,
      grams:    lastRemoved.grams,
      kcal:     lastRemoved.kcal,
      protein:  lastRemoved.protein,
      carbs:    lastRemoved.carbs,
      fat:      lastRemoved.fat,
      mealType: lastRemoved.meal_type ?? undefined,
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

  // One log row, in either its editing or its resting shape. Pulled out of the
  // list so the day can be drawn as meal sections without duplicating it.
  function renderEntry(entry, i) {
    return editingId === entry.id ? (
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
          <span className={styles.entryName}>
            {entry.name}
            {/* Small and beside the name, not a banner: the estimate is
                usually close, and a row of warnings down the day would
                teach everyone to stop reading them. */}
            {entry.estimated && (
              <svg viewBox="0 0 20 20" width="11" height="11" className={styles.estMark}
                   aria-label="изчислено приблизително" role="img">
                <path d="M5 8.2c1.4-1.6 2.6-1.6 4 0s2.6 1.6 4 0M5 12.4c1.4-1.6 2.6-1.6 4 0s2.6 1.6 4 0"
                      fill="none" stroke="currentColor" strokeWidth="1.7"
                      strokeLinecap="round" transform="translate(1,0)" />
              </svg>
            )}
          </span>
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
  }

  // Every day wears the same four sections whether or not they hold anything,
  // so the shape of the day is a given the client fills in rather than a list
  // that appears as they log. Anything from before meals existed (or without
  // one) gathers under "Друго", shown only when it has rows and never offered as
  // a place to add to.
  const groups = MEALS.map(m => ({
    id: m.id,
    label: m.label,
    items: log.filter(e => e.meal_type === m.id),
  }))
  const other = log.filter(e => !MEAL_LABEL[e.meal_type])
  if (other.length) groups.push({ id: '_other', label: 'Друго', items: other, legacy: true })

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

      {log.length > 0 && (
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
            <button className={styles.clearBtn} onClick={onClear} type="button" aria-label="Изчисти деня" title="Изчисти">
              <TrashIcon />
            </button>
          </div>
        </div>
      )}

      {/* The day as its meals: each section a small header with a calorie
          subtotal and a + that targets it for the next add. Empty sections stay,
          so the four meals are always there to add into. */}
      {groups.map((group, gi) => {
        const kcal    = Math.round(group.items.reduce((s, e) => s + (e.kcal    || 0), 0))
        const protein = Math.round(group.items.reduce((s, e) => s + (e.protein || 0), 0))
        const carbs   = Math.round(group.items.reduce((s, e) => s + (e.carbs   || 0), 0))
        const fat     = Math.round(group.items.reduce((s, e) => s + (e.fat     || 0), 0))
        return (
          <section key={group.id} className={styles.mealGroup}>
            <div className={styles.mealHead}>
              <span className={styles.mealName}>{group.label}</span>
              <span className={styles.mealHeadRight}>
                {group.items.length > 0 && (
                  <span className={styles.mealTotals}>
                    <span className={`${styles.macro} ${styles.macroP}`} title="Протеин">
                      <Pictogram name="protein" size={13} />
                      {protein}
                    </span>
                    <span className={`${styles.macro} ${styles.macroC}`} title="Въглехидрати">
                      <Pictogram name="carbs" size={13} />
                      {carbs}
                    </span>
                    <span className={`${styles.macro} ${styles.macroF}`} title="Мазнини">
                      <Pictogram name="fat" size={13} />
                      {fat}
                    </span>
                    <span className={styles.mealKcal}>{kcal} ккал</span>
                  </span>
                )}
                {!group.legacy && onAddRaw && (
                  <button
                    className={styles.mealAdd}
                    onClick={() => setQuickMeal(group.id)}
                    type="button"
                    aria-label={`Добави в ${group.label}`}
                  >
                    +
                  </button>
                )}
              </span>
            </div>
            {group.items.length > 0 ? (
              <ul className={styles.list}>
                {group.items.map((entry, i) => renderEntry(entry, gi * 100 + i))}
              </ul>
            ) : (
              <p className={styles.mealEmpty}>–</p>
            )}
          </section>
        )
      })}

      {log.length === 0 && onAddRaw && date && (
        <CopyPreviousDay date={date} onAddRaw={onAddRaw} />
      )}

      {quickMeal && (
        <QuickAddSheet
          meal={quickMeal}
          onAddRaw={onAddRaw}
          onClose={() => setQuickMeal(null)}
        />
      )}

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
