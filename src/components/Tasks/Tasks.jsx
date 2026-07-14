import { useState, useRef } from 'react'
import { useTasks } from '../../hooks/useTasks'
import styles from './Tasks.module.css'

const CATEGORIES = [
  { id: 'all',     label: 'Всички' },
  { id: 'general', label: 'Общи'   },
  { id: 'work',    label: 'Работа' },
  { id: 'health',  label: 'Здраве' },
  { id: 'sport',   label: 'Спорт'  },
  { id: 'finance', label: 'Финанси'},
  { id: 'personal',label: 'Лично'  },
]

const CAT_LABELS = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))

export default function Tasks() {
  const { tasks, loading, addTask, toggleTask, deleteTask } = useTasks()
  const [activeCat, setActiveCat]   = useState('all')
  const [text, setText]             = useState('')
  const [category, setCategory]     = useState('general')
  const [priority, setPriority]     = useState(1)
  const [showDone, setShowDone]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const inputRef = useRef(null)

  const visible = tasks.filter(t =>
    !t.done && (activeCat === 'all' || t.category === activeCat)
  )
  const done = tasks.filter(t =>
    t.done && (activeCat === 'all' || t.category === activeCat)
  )
  const high   = visible.filter(t => t.priority === 2)
  const normal = visible.filter(t => t.priority === 1)

  async function handleAdd() {
    if (!text.trim() || saving) return
    setSaving(true)
    await addTask({ text, category, priority })
    setText('')
    setSaving(false)
    inputRef.current?.focus()
  }

  if (loading) return <div className={styles.page} />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ЗАДАЧИ</h1>
        <span className={styles.count}>{visible.length} активни</span>
      </div>

      {/* Category filter */}
      <div className={styles.filters}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            className={`${styles.filterBtn} ${activeCat === c.id ? styles.filterBtnActive : ''}`}
            onClick={() => setActiveCat(c.id)}
            type="button"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* High priority */}
      {high.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>ВИСОК ПРИОРИТЕТ</div>
          {high.map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)}
        </div>
      )}

      {/* Normal priority */}
      {normal.length > 0 && (
        <div className={styles.section}>
          {high.length > 0 && <div className={styles.sectionLabel}>ОСТАНАЛИ</div>}
          {normal.map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)}
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 && done.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>✓</span>
          Няма активни задачи.<br />Добави нова отдолу.
        </div>
      )}

      {/* Completed section */}
      {done.length > 0 && (
        <>
          <button className={styles.doneToggle} onClick={() => setShowDone(v => !v)} type="button">
            <span className={`${styles.doneToggleArrow} ${showDone ? styles.doneToggleArrowOpen : ''}`}>▶</span>
            ИЗПЪЛНЕНИ
            <span className={styles.doneCount}>{done.length}</span>
          </button>
          {showDone && done.map(task => (
            <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
          ))}
        </>
      )}

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
          >
            + ДОБАВИ
          </button>
        </div>
        <div className={styles.addOptions}>
          {CATEGORIES.filter(c => c.id !== 'all').map(c => (
            <button
              key={c.id}
              className={`${styles.optBtn} ${category === c.id ? styles.optBtnActive : ''}`}
              onClick={() => setCategory(c.id)}
              type="button"
            >
              {c.label}
            </button>
          ))}
          <button
            className={`${styles.optBtn} ${priority === 2 ? styles.optBtnActive : ''}`}
            onClick={() => setPriority(p => p === 2 ? 1 : 2)}
            type="button"
          >
            ! Висок
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, onToggle, onDelete }) {
  return (
    <div className={[
      styles.taskItem,
      task.done        ? styles.taskItemDone : '',
      task.priority === 2 && !task.done ? styles.taskItemHigh : '',
    ].join(' ')}>
      <button
        className={`${styles.check} ${task.done ? styles.checkDone : ''}`}
        onClick={() => onToggle(task.id)}
        type="button"
        aria-label={task.done ? 'Отбележи като неизпълнена' : 'Отбележи като изпълнена'}
      >
        {task.done && (
          <svg className={styles.checkMark} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1.5 6 4.5 9 10.5 3" />
          </svg>
        )}
      </button>

      <div className={styles.taskBody} onClick={() => onToggle(task.id)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onToggle(task.id)}>
        <div className={`${styles.taskText} ${task.done ? styles.taskTextDone : ''}`}>
          {task.text}
        </div>
        <div className={styles.taskMeta}>
          {task.priority === 2 && !task.done && <span className={styles.priorityDot} />}
          {task.category && task.category !== 'general' && (
            <span className={styles.taskCat}>{CAT_LABELS[task.category] ?? task.category}</span>
          )}
        </div>
      </div>

      <button
        className={styles.delBtn}
        onClick={() => onDelete(task.id)}
        type="button"
        aria-label="Изтрий задача"
      >
        ×
      </button>
    </div>
  )
}
