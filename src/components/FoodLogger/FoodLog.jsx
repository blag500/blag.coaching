import { useState } from 'react'
import styles from './FoodLog.module.css'

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>
  )
}

export default function FoodLog({ log, onRemove, onClear, onEdit, onAddRaw }) {
  const [editingId, setEditingId]     = useState(null)
  const [draft, setDraft]             = useState({})
  const [lastRemoved, setLastRemoved] = useState(null)

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
      name:    draft.name.trim() || entry.name,
      grams:   parseFloat(draft.grams)              || 0,
      kcal:    Math.round(parseFloat(draft.kcal)     || 0),
      protein: Math.round((parseFloat(draft.protein) || 0) * 10) / 10,
      carbs:   Math.round((parseFloat(draft.carbs)   || 0) * 10) / 10,
      fat:     Math.round((parseFloat(draft.fat)     || 0) * 10) / 10,
    })
    setEditingId(null)
  }

  if (log.length === 0) {
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

              {entry.grams > 0 && (
                <div className={styles.editGramsRow}>
                  <label className={styles.editLabel}>Грамаж</label>
                  <input
                    className={styles.editInput}
                    type="number"
                    min="1"
                    value={draft.grams}
                    onChange={e => handleGramsChange(entry, e.target.value)}
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
    </div>
  )
}
