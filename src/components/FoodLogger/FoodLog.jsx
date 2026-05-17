import { useState, useRef, useEffect } from 'react'
import styles from './FoodLog.module.css'

const UNDO_DELAY = 5000

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>
  )
}

export default function FoodLog({ log, onRemove, onClear, onEdit }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft]         = useState({})
  const [pending, setPending]     = useState(null) // { entry }
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleRemove(entry) {
    // Confirm any in-flight pending delete immediately before starting a new one
    if (pending) {
      clearTimeout(timerRef.current)
      onRemove(pending.entry.id)
    }
    timerRef.current = setTimeout(() => {
      onRemove(entry.id)
      setPending(null)
    }, UNDO_DELAY)
    setPending({ entry })
  }

  function handleUndo() {
    clearTimeout(timerRef.current)
    setPending(null)
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setDraft({
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
      setDraft({
        grams:   val,
        kcal:    String(Math.round(entry.kcal    * ratio)),
        protein: String(Math.round(entry.protein * ratio * 10) / 10),
        carbs:   String(Math.round(entry.carbs   * ratio * 10) / 10),
        fat:     String(Math.round(entry.fat     * ratio * 10) / 10),
      })
    } else {
      setDraft(prev => ({ ...prev, grams: val }))
    }
  }

  function handleSave(entry) {
    onEdit(entry.id, {
      grams:   parseFloat(draft.grams)            || 0,
      kcal:    Math.round(parseFloat(draft.kcal)   || 0),
      protein: Math.round((parseFloat(draft.protein) || 0) * 10) / 10,
      carbs:   Math.round((parseFloat(draft.carbs)   || 0) * 10) / 10,
      fat:     Math.round((parseFloat(draft.fat)     || 0) * 10) / 10,
    })
    setEditingId(null)
  }

  const visibleLog = log.filter(e => e.id !== pending?.entry.id)

  if (visibleLog.length === 0 && !pending) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🍽</span>
        <p>Няма добавени храни</p>
        <p className={styles.emptyHint}>Търси и добави храна по-горе</p>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.listHeader}>
        <span className={styles.listTitle}>Дневен лог ({visibleLog.length})</span>
        <button className={styles.clearBtn} onClick={onClear}>Изчисти</button>
      </div>

      <ul className={styles.list}>
        {visibleLog.map((entry, i) =>
          editingId === entry.id ? (
            <li key={entry.id} className={`${styles.entry} ${styles.entryEditing}`}>
              <div className={styles.editName}>{entry.name}</div>

              {entry.grams > 0 && (
                <div className={styles.editGramsRow}>
                  <label className={styles.editLabel}>Грамаж</label>
                  <input
                    className={styles.editInput}
                    type="number"
                    min="1"
                    value={draft.grams}
                    onChange={e => handleGramsChange(entry, e.target.value)}
                    autoFocus
                  />
                  <span className={styles.editUnit}>g</span>
                </div>
              )}

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

              <div className={styles.editActions}>
                <button className={styles.cancelEditBtn} onClick={() => setEditingId(null)} type="button">Отказ</button>
                <button className={styles.saveEditBtn} onClick={() => handleSave(entry)} type="button">Запази</button>
              </div>
            </li>
          ) : (
            <li key={entry.id} className={styles.entry} style={{ '--i': i }}>
              <div className={styles.entryLeft}>
                <span className={styles.entryName}>{entry.name}</span>
                <span className={styles.entryMacros}>
                  {entry.kcal} ккал · П{entry.protein}g · В{entry.carbs}g · М{entry.fat}g
                </span>
              </div>
              <div className={styles.entryRight}>
                <span className={styles.entryGrams}>{entry.grams > 0 ? `${entry.grams}g` : ''}</span>
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

      {pending && (
        <div className={styles.undoToast}>
          <span className={styles.undoText}>
            Премахнато: <strong>{pending.entry.name}</strong>
          </span>
          <button className={styles.undoBtn} onClick={handleUndo} type="button">
            <UndoIcon /> Отмени
          </button>
          <div className={styles.undoProgress} key={pending.entry.id} />
        </div>
      )}
    </div>
  )
}
