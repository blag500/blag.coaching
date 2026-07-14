import { useState, useRef } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { useTaskSuggestions } from '../../hooks/useTaskSuggestions'
import styles from './Tasks.module.css'

const TODAY = () => new Date().toISOString().slice(0, 10)
const IN7   = () => new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10)

function getTimeBucket(due_date) {
  if (!due_date) return 'later'
  const today = TODAY()
  const week  = IN7()
  if (due_date <= today) return 'today'
  if (due_date <= week)  return 'week'
  return 'later'
}

export default function Tasks() {
  const { tasks, loading, addTask, toggleTask, deleteTask } = useTasks()
  const { suggestions, dismiss } = useTaskSuggestions()
  const [text, setText]       = useState('')
  const [dueSlot, setDueSlot] = useState('later')  // 'today' | 'week' | 'later'
  const [highPrio, setHighPrio] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [saving, setSaving]   = useState(false)
  const inputRef = useRef(null)

  const active = tasks.filter(t => !t.done)
  const done   = tasks.filter(t => t.done)

  const todayTasks = active.filter(t => getTimeBucket(t.due_date) === 'today')
  const weekTasks  = active.filter(t => getTimeBucket(t.due_date) === 'week')
  const laterTasks = active.filter(t => getTimeBucket(t.due_date) === 'later')

  function dueDateForSlot(slot) {
    if (slot === 'today') return TODAY()
    if (slot === 'week')  return IN7()
    return null
  }

  async function handleAdd() {
    if (!text.trim() || saving) return
    setSaving(true)
    await addTask({
      text,
      priority: highPrio ? 2 : 1,
      due_date: dueDateForSlot(dueSlot),
    })
    setText('')
    setSaving(false)
    inputRef.current?.focus()
  }

  async function handleAddSuggestion(s) {
    await addTask({ text: s.text, priority: s.priority, due_date: s.due_date })
    dismiss(s.id)
  }

  if (loading) return <div className={styles.page} />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ЗАДАЧИ</h1>
        {active.length > 0 && (
          <span className={styles.badge}>{active.length} активни</span>
        )}
      </div>

      {/* Smart suggestions */}
      {suggestions.length > 0 && (
        <div className={styles.suggestionsBlock}>
          <div className={styles.suggestionsLabel}>💡 ПРЕПОРЪКИ</div>
          {suggestions.map(s => (
            <div key={s.id} className={styles.suggestionCard}>
              <span className={styles.suggestionIcon}>{s.icon}</span>
              <span className={styles.suggestionText}>{s.text}</span>
              <button
                className={styles.suggestionAdd}
                onClick={() => handleAddSuggestion(s)}
                type="button"
              >+ ДОБАВИ</button>
              <button
                className={styles.suggestionDismiss}
                onClick={() => dismiss(s.id)}
                type="button"
                aria-label="Скрий"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Time buckets */}
      {todayTasks.length > 0 && (
        <Section label="ДНЕС" tasks={todayTasks} onToggle={toggleTask} onDelete={deleteTask} />
      )}
      {weekTasks.length > 0 && (
        <Section label="ТАЗИ СЕДМИЦА" tasks={weekTasks} onToggle={toggleTask} onDelete={deleteTask} />
      )}
      {laterTasks.length > 0 && (
        <Section label="ПО-КЪСНО" tasks={laterTasks} onToggle={toggleTask} onDelete={deleteTask} />
      )}

      {active.length === 0 && suggestions.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>✓</div>
          <div>Всичко е готово.<br />Добави нова задача отдолу.</div>
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div className={styles.doneSection}>
          <button
            className={styles.doneToggle}
            onClick={() => setShowDone(v => !v)}
            type="button"
          >
            <span className={`${styles.doneArrow} ${showDone ? styles.doneArrowOpen : ''}`}>▶</span>
            ИЗПЪЛНЕНИ
            <span className={styles.doneBadge}>{done.length}</span>
          </button>
          {showDone && done.map(task => (
            <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
          ))}
        </div>
      )}

      {/* Spacer so last task isn't hidden behind add form */}
      <div className={styles.spacer} />

      {/* Add form */}
      <div className={styles.addForm}>
        <div className={styles.addRow}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Нова задача..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            className={styles.submitBtn}
            onClick={handleAdd}
            disabled={!text.trim() || saving}
            type="button"
          >+</button>
        </div>
        <div className={styles.addMeta}>
          {[
            { id: 'today', label: 'ДНЕС' },
            { id: 'week',  label: '+7 ДНИ' },
            { id: 'later', label: 'БЕЗ ДАТА' },
          ].map(opt => (
            <button
              key={opt.id}
              className={`${styles.metaBtn} ${dueSlot === opt.id ? styles.metaBtnActive : ''}`}
              onClick={() => setDueSlot(opt.id)}
              type="button"
            >{opt.label}</button>
          ))}
          <button
            className={`${styles.metaBtn} ${styles.metaBtnPrio} ${highPrio ? styles.metaBtnPrioActive : ''}`}
            onClick={() => setHighPrio(v => !v)}
            type="button"
          >! ВАЖНО</button>
        </div>
      </div>
    </div>
  )
}

function Section({ label, tasks, onToggle, onDelete }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{label}</div>
      {tasks.map(task => (
        <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </div>
  )
}

function TaskRow({ task, onToggle, onDelete }) {
  const today    = TODAY()
  const isOverdue = task.due_date && task.due_date < today && !task.done
  const isCoach   = !!task.created_by

  return (
    <div className={[
      styles.taskRow,
      task.done     ? styles.taskRowDone    : '',
      isOverdue     ? styles.taskRowOverdue : '',
    ].join(' ')}>
      <button
        className={`${styles.check} ${task.done ? styles.checkDone : ''}`}
        onClick={() => onToggle(task.id)}
        type="button"
      >
        {task.done && (
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
            <polyline points="1.5 6 4.5 9 10.5 3" />
          </svg>
        )}
      </button>

      <div className={styles.taskBody} onClick={() => onToggle(task.id)}>
        <div className={styles.taskText}>{task.text}</div>
        <div className={styles.taskTags}>
          {task.priority === 2 && !task.done && (
            <span className={styles.prioDot} />
          )}
          {isCoach && !task.done && (
            <span className={styles.coachTag}>от треньора</span>
          )}
          {task.due_date && !task.done && (
            <span className={`${styles.dateTag} ${isOverdue ? styles.dateTagOverdue : ''}`}>
              {isOverdue ? '⚠ ' : ''}{formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>

      <button
        className={styles.delBtn}
        onClick={() => onDelete(task.id)}
        type="button"
        aria-label="Изтрий"
      >×</button>
    </div>
  )
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  if (diff === 0)  return 'Днес'
  if (diff === 1)  return 'Утре'
  if (diff === -1) return 'Вчера'
  if (diff < 0)    return `${Math.abs(diff)}д закъснение`
  if (diff <= 7)   return `След ${diff}д`
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })
}
