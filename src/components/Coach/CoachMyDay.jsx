import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useHabitsToday } from '../../hooks/useHabitsToday'
import styles from './CoachMyDay.module.css'

const TODAY = new Date().toISOString().slice(0, 10)

function todayLabel() {
  return new Date().toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function CoachMyDay() {
  const { user } = useAuth()
  const { habits, checked, toggle } = useHabitsToday()
  const [trained, setTrained]         = useState(false)
  const [trainLoading, setTrainLoading] = useState(true)
  const [note, setNote]               = useState('')
  const [savedNote, setSavedNote]     = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('workout_completions')
      .select('id')
      .eq('user_id', user.id)
      .eq('completed_date', TODAY)
      .limit(1)
      .then(({ data }) => {
        setTrained((data || []).length > 0)
        setTrainLoading(false)
      })
  }, [user])

  async function toggleTraining() {
    if (!user || trainLoading) return
    if (trained) {
      await supabase.from('workout_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('completed_date', TODAY)
      setTrained(false)
    } else {
      await supabase.from('workout_completions')
        .insert({ user_id: user.id, completed_date: TODAY, block_label: 'Тренировка' })
      setTrained(true)
    }
  }

  const habitsDone  = habits.filter(h => checked[h.id]).length
  const habitsTotal = habits.length

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>МОЙ ДЕН</h1>
        <p className={styles.subtitle}>{todayLabel()}</p>
      </header>

      {/* Training toggle */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>ТРЕНИРОВКА</h2>
        <button
          className={`${styles.trainBtn} ${trained ? styles.trainBtnDone : ''}`}
          onClick={toggleTraining}
          disabled={trainLoading}
          type="button"
        >
          <span className={styles.trainEmoji}>{trained ? '💪' : '💤'}</span>
          <span>{trained ? 'ТРЕНИРАХ ДНЕС' : 'ОТБЕЛЕЖИ ТРЕНИРОВКА'}</span>
        </button>
        <p className={styles.trainHint}>
          {trained
            ? 'Отбелязано — ще се вижда в ВДЪХНОВЕНИЕ'
            : 'Тук можеш да отбележиш, че си тренирал днес'}
        </p>
      </section>

      {/* Habits */}
      {habits.length > 0 && (
        <section className={styles.card}>
          <div className={styles.sectionRow}>
            <h2 className={styles.sectionTitle}>НАВИЦИ ДНЕС</h2>
            <span className={styles.habitCount}>
              {habitsDone}/{habitsTotal}
            </span>
          </div>
          <div className={styles.habitList}>
            {habits.map(h => {
              const done = !!checked[h.id]
              return (
                <button
                  key={h.id}
                  className={`${styles.habitItem} ${done ? styles.habitDone : ''}`}
                  onClick={() => toggle(h.id)}
                  type="button"
                >
                  <span className={styles.habitCheck}>{done ? '✓' : ''}</span>
                  <span className={styles.habitLabel}>{h.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Today summary */}
      <section className={styles.summaryRow}>
        <div className={styles.summaryBox}>
          <span className={`${styles.summaryVal} ${trained ? styles.summaryGreen : styles.summaryMuted}`}>
            {trained ? '✓' : '—'}
          </span>
          <span className={styles.summaryLabel}>ТРЕНИРОВКА</span>
        </div>
        <div className={styles.summaryBox}>
          <span className={styles.summaryVal}>{habitsDone}/{habitsTotal}</span>
          <span className={styles.summaryLabel}>НАВИЦИ</span>
        </div>
        <div className={styles.summaryBox}>
          <span className={`${styles.summaryVal} ${habitsDone === habitsTotal && habitsTotal > 0 ? styles.summaryGreen : styles.summaryMuted}`}>
            {habitsTotal > 0 ? `${Math.round((habitsDone / habitsTotal) * 100)}%` : '—'}
          </span>
          <span className={styles.summaryLabel}>СПАЗВАНЕ</span>
        </div>
      </section>

      <p className={styles.vdahNote}>
        Данните от тук се показват в <strong>ВДЪХНОВЕНИЕ</strong> на клиентите ти.
        Задай своето тренировъчно разписание от <strong>ТРЕНИРОВКА</strong> в менюто,
        за да виждаш и упражнения.
      </p>
    </div>
  )
}
