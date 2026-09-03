import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTasks } from '../../hooks/useTasks'
import DayTimeline from './DayTimeline'
import { useTaskSuggestions } from '../../hooks/useTaskSuggestions'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './Tasks.module.css'
import { loc } from '../../utils/locale'

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
  const { tasks, loading, addTask, updateTask, toggleTask, deleteTask } = useTasks()
  const { user } = useAuth()
  const { suggestions, dismiss } = useTaskSuggestions()
  const { t } = useSettings()
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

  /* Кога е тренирал днес — от самите серии.
     Няма отделен запис за час на тренировката и не трябва да има: времето,
     по което човек е вдигал, е в сериите, и то е истинското. Ден без вписани
     серии просто няма блок — по-добре, отколкото да се измисли час,
     който никой не е казал. */
  const [workoutSpan, setWorkoutSpan] = useState(null)
  useEffect(() => {
    if (!user?.id) return
    let alive = true
    Promise.all([
      supabase.from('exercise_logs').select('created_at').eq('user_id', user.id).eq('date', TODAY()),
      supabase.from('workout_completions').select('block_label').eq('user_id', user.id).eq('completed_date', TODAY()),
    ]).then(([logs, done]) => {
      if (!alive) return
      const stamps = (logs.data ?? []).map(r => new Date(r.created_at)).filter(d => !Number.isNaN(+d))
      if (stamps.length === 0) { setWorkoutSpan(null); return }
      const toH = d => d.getHours() + d.getMinutes() / 60
      const start = Math.min(...stamps.map(toH))
      const end   = Math.max(...stamps.map(toH))
      setWorkoutSpan({
        start,
        // Една серия е точка, не отсечка — получава половин час, за да се види.
        end: end - start < 0.5 ? start + 0.5 : end,
        label: done.data?.[0]?.block_label || t('tl.workout'),
      })
    })
    return () => { alive = false }
  }, [user?.id])

  /** Задача, вписана директно в час от линията. */
  async function handleSlot(time) {
    const what = window.prompt(t('tl.promptWhat'))
    if (!what || !what.trim()) return
    await addTask({ text: what, due_date: TODAY(), start_time: time, duration_min: 60 })
  }

  /** Натиснат блок — отмята се готов. */
  function handleBlock(task) { toggleTask(task.id) }

  async function handleAddSuggestion(s) {
    await addTask({ text: s.text, priority: s.priority, due_date: s.due_date })
    dismiss(s.id)
  }

  if (loading) return <div className={styles.page} />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('tasks.title')}</h1>
        {active.length > 0 && (
          <span className={styles.badge}>{t('tasks.active', { n: active.length })}</span>
        )}
      </div>

      {/* Smart suggestions */}
      {suggestions.length > 0 && (
        <div className={styles.suggestionsBlock}>
          <div className={styles.suggestionsLabel}>{t('tasks.suggestions')}</div>
          {suggestions.map(s => (
            <div key={s.id} className={styles.suggestionCard}>
              <span className={styles.suggestionIcon}>{s.icon}</span>
              <span className={styles.suggestionText}>{s.text}</span>
              <button
                className={styles.suggestionAdd}
                onClick={() => handleAddSuggestion(s)}
                type="button"
              >{t('tasks.suggestAdd')}</button>
              <button
                className={styles.suggestionDismiss}
                onClick={() => dismiss(s.id)}
                type="button"
                aria-label={t('tasks.hide')}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Денът като линия.
          Списъкът отдолу казва какво има за вършене; тук се вижда кога.
          Задача без час не се появява тук — тя си е ред в списъка. */}
      <div className={styles.timelineBlock}>
        <div className={styles.timelineHead}>
          <span className={styles.timelineLabel}>{t('tl.title')}</span>
          <span className={styles.timelineHint}>{t('tl.hint')}</span>
        </div>
        <DayTimeline
          date={TODAY()}
          tasks={tasks}
          workoutSpan={workoutSpan}
          onPickSlot={handleSlot}
          onOpenTask={handleBlock}
          onResize={(id, minutes) => updateTask(id, { duration_min: minutes })}
        />
      </div>

      {/* Time buckets */}
      {todayTasks.length > 0 && (
        <Section label={t('tasks.today')} tasks={todayTasks} onToggle={toggleTask} onDelete={deleteTask} />
      )}
      {weekTasks.length > 0 && (
        <Section label={t('tasks.week')} tasks={weekTasks} onToggle={toggleTask} onDelete={deleteTask} />
      )}
      {laterTasks.length > 0 && (
        <Section label={t('tasks.later')} tasks={laterTasks} onToggle={toggleTask} onDelete={deleteTask} />
      )}

      {active.length === 0 && suggestions.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>✓</div>
          <div>{t('tasks.emptyMain')}<br />{t('tasks.emptySub')}</div>
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
            {t('tasks.done')}
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
            placeholder={t('tasks.placeholder')}
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
            { id: 'today', label: t('tasks.slot.today') },
            { id: 'week',  label: t('tasks.slot.week') },
            { id: 'later', label: t('tasks.slot.later') },
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
          >{t('tasks.important')}</button>
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
  const { t } = useSettings()
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
            <span className={styles.coachTag}>{t('tasks.fromCoach')}</span>
          )}
          {task.due_date && !task.done && (
            <span className={`${styles.dateTag} ${isOverdue ? styles.dateTagOverdue : ''}`}>
              {isOverdue ? '⚠ ' : ''}{formatDate(task.due_date, t)}
            </span>
          )}
        </div>
      </div>

      <button
        className={styles.delBtn}
        onClick={() => onDelete(task.id)}
        type="button"
        aria-label={t('tasks.delete')}
      >×</button>
    </div>
  )
}

function formatDate(iso, t) {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  if (diff === 0)  return t('tasks.date.today')
  if (diff === 1)  return t('tasks.date.tomorrow')
  if (diff === -1) return t('tasks.date.yesterday')
  if (diff < 0)    return t('tasks.date.overdueDays', { n: Math.abs(diff) })
  if (diff <= 7)   return t('tasks.date.inDays', { n: diff })
  return d.toLocaleDateString(loc(), { day: 'numeric', month: 'short' })
}
