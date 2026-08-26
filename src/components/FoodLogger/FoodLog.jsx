import { useState, useRef, useEffect } from 'react'
import CopyPreviousDay from './CopyPreviousDay'
import QuickAddSheet from './QuickAddSheet'
import { MEALS, MEAL_LABEL_KEY } from './meals'
import { useSettings } from '../../contexts/SettingsContext'
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

  // Drag-to-move-meal — same recipe as the dashboard-cards reorder: a
  // long-press separates "pick this up" from "scroll the page", then the row
  // itself follows the finger via transform (no ghost), and drop over another
  // meal section changes meal_type. The hold is abandoned the moment the
  // finger travels, so a scroll that starts on a row is still a scroll.
  const HOLD_MS = 220
  const SCROLL_CANCEL_PX = 8

  const [dragId, setDragId] = useState(null)
  const [hoverMeal, setHoverMeal] = useState(null)
  const rowEls = useRef(new Map())     // entry id → element
  const hold  = useRef(null)           // pending long-press { timer, x, y }
  const drag  = useRef(null)           // live drag { entry, startY, grabY }
  const dragIdRef = useRef(null)

  function cancelHold() {
    if (hold.current) { clearTimeout(hold.current.timer); hold.current = null }
  }

  /** Which meal is under the finger, skipping the dragged row itself. Uses
   *  `elementsFromPoint` (the whole stack under the point) instead of the
   *  single top-most element, so a translated row sitting at z-index 20 does
   *  not always answer "you are still over your own meal". */
  function findMealAt(x, y) {
    const draggingEl = dragIdRef.current ? rowEls.current.get(dragIdRef.current) : null
    const stack = document.elementsFromPoint?.(x, y) || [document.elementFromPoint(x, y)]
    for (const el of stack) {
      if (!el) continue
      if (draggingEl && (el === draggingEl || draggingEl.contains(el))) continue
      const zone = el.closest?.('[data-drop-meal]')
      if (zone) return zone.getAttribute('data-drop-meal')
    }
    return null
  }

  /** Pointer down on the grip starts a drag immediately — the whole point of
   *  a visible handle is that its meaning is unambiguous. The rest of the row
   *  keeps its taps for edit/remove/photo. */
  function onGripPointerDown(e, entry) {
    if (editingId != null) return
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    cancelHold()
    const el = rowEls.current.get(entry.id)
    if (!el) return
    // Kill the itemIn entrance animation and any leftover transition —
    // both would fight the JS transform frame-by-frame and the row would
    // just sit still. willChange keeps the compositor's layer warm.
    el.style.animation = 'none'
    el.style.transition = 'none'
    el.style.willChange = 'transform'
    const slotTop = el.getBoundingClientRect().top
    drag.current = { entry, grabY: e.clientY - slotTop, slotTop }
    dragIdRef.current = entry.id
    setDragId(entry.id)
    // Some iOS PWAs stop firing pointermove on window if the source element
    // hadn't captured — captureEvents on the grip keeps them coming.
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* ignore */ }
  }

  // Live handlers held in a ref so we can attach the window listeners ONCE.
  // `onEdit` is a fresh function every render (bound to updateEntry from a
  // hook), and re-adding the listeners every render kept losing drags mid-way.
  const onEditRef = useRef(onEdit)
  onEditRef.current = onEdit

  useEffect(() => {
    function onMove(e) {
      // Still deciding whether this is a drag or a scroll.
      if (hold.current) {
        const dx = Math.abs(e.clientX - hold.current.x)
        const dy = Math.abs(e.clientY - hold.current.y)
        if (dx > SCROLL_CANCEL_PX || dy > SCROLL_CANCEL_PX) cancelHold()
        return
      }
      const d = drag.current
      if (!d) return
      const el = rowEls.current.get(d.entry.id)
      if (!el) return
      const shift = (e.clientY - d.grabY) - d.slotTop
      el.style.transition = 'none'
      el.style.transform = `translateY(${shift}px)`
      setHoverMeal(findMealAt(e.clientX, e.clientY))
    }
    function onUp(e) {
      cancelHold()
      const d = drag.current
      if (!d) { setHoverMeal(null); return }
      const el = rowEls.current.get(d.entry.id)
      if (el) {
        el.style.transition = 'transform 180ms cubic-bezier(.2,.7,.3,1)'
        el.style.transform = ''
        el.style.willChange = ''
        // Restore the entrance-animation slot after the settle transition ends.
        setTimeout(() => { if (el) el.style.animation = '' }, 220)
      }
      const target = findMealAt(e.clientX, e.clientY)
      if (target && target !== '_other' && target !== d.entry.meal_type) {
        onEditRef.current?.(d.entry.id, { meal_type: target })
      }
      drag.current = null
      dragIdRef.current = null
      setDragId(null)
      setHoverMeal(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // Refuse touchmove while a drag is live so the page can't scroll under it.
  // touch-action cannot flip mid-gesture, so this is the only path.
  useEffect(() => {
    if (!dragId) return
    const block = e => e.preventDefault()
    window.addEventListener('touchmove', block, { passive: false })
    return () => window.removeEventListener('touchmove', block)
  }, [dragId])

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
      <li
        key={entry.id}
        ref={el => {
          if (el) rowEls.current.set(entry.id, el)
          else rowEls.current.delete(entry.id)
        }}
        className={`${styles.entry} ${dragId === entry.id ? styles.entryDragging : ''}`}
        style={{ '--i': i }}
      >
        <span
          className={styles.entryGrip}
          onPointerDown={e => onGripPointerDown(e, entry)}
          aria-label="Влачи, за да преместиш"
          role="button"
        >
          <span /><span /><span />
        </span>
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
          <section
            key={group.id}
            className={`${styles.mealGroup} ${hoverMeal === group.id && dragId && drag.current?.entry?.meal_type !== group.id ? styles.mealGroupHover : ''}`}
            data-drop-meal={group.legacy ? '_other' : group.id}
          >
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
                {group.items.map((entry, i) => renderEntry(entry, i))}
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
