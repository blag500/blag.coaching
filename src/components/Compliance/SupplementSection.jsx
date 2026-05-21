import { useState } from 'react'
import { useSupplementsToday } from '../../hooks/useSupplementsToday'
import styles from './SupplementSection.module.css'

const REMINDER_OPTIONS = [
  { id: 'morning',   label: 'Сутрин' },
  { id: 'afternoon', label: 'Обед'   },
  { id: 'evening',   label: 'Вечер'  },
]

function AddForm({ onAdd, onCancel }) {
  const [name, setName]           = useState('')
  const [dose, setDose]           = useState('')
  const [reminders, setReminders] = useState([])
  const [saving, setSaving]       = useState(false)

  function toggleReminder(id) {
    setReminders(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onAdd({ name, dose, reminders })
    setSaving(false)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        placeholder="Название (напр. Креатин)"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />
      <input
        className={styles.input}
        placeholder="Доза (напр. 5g)"
        value={dose}
        onChange={e => setDose(e.target.value)}
      />
      <div className={styles.reminderRow}>
        {REMINDER_OPTIONS.map(opt => (
          <button
            key={opt.id}
            type="button"
            className={`${styles.reminderChip} ${reminders.includes(opt.id) ? styles.reminderChipOn : ''}`}
            onClick={() => toggleReminder(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className={styles.formActions}>
        <button type="submit" className={styles.saveBtn} disabled={!name.trim() || saving}>
          {saving ? '...' : 'Запази'}
        </button>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          Отказ
        </button>
      </div>
    </form>
  )
}

export default function SupplementSection() {
  const { supplements, takenIds, loading, toggle, addSupplement, removeSupplement } = useSupplementsToday()
  const [showAdd, setShowAdd] = useState(false)

  async function handleAdd(data) {
    await addSupplement(data)
    setShowAdd(false)
  }

  if (loading) return null

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>ДОБАВКИ</span>
        {!showAdd && (
          <button className={styles.addBtn} onClick={() => setShowAdd(true)} type="button">
            + Добави
          </button>
        )}
      </div>

      {supplements.length === 0 && !showAdd && (
        <p className={styles.empty}>Няма добавени добавки.</p>
      )}

      <div className={styles.list}>
        {supplements.map(sup => {
          const taken = takenIds.has(sup.id)
          return (
            <div
              key={sup.id}
              className={`${styles.item} ${taken ? styles.itemTaken : ''}`}
            >
              <button
                className={styles.checkbox}
                onClick={() => toggle(sup.id)}
                type="button"
                aria-pressed={taken}
              >
                {taken && (
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{sup.name}</span>
                {sup.dose && <span className={styles.itemDose}>{sup.dose}</span>}
              </div>
              <button
                className={styles.removeBtn}
                onClick={() => removeSupplement(sup.id)}
                type="button"
                aria-label="Премахни"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <AddForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
      )}
    </section>
  )
}
