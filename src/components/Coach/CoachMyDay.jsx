import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useHabitsToday } from '../../hooks/useHabitsToday'
import styles from './CoachMyDay.module.css'
import { useSettings } from '../../contexts/SettingsContext'

const TODAY = new Date().toISOString().slice(0, 10)

function todayLabel() {
  return new Date().toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function CoachMyDay() {
  const { t } = useSettings()
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
        <h1 className={styles.title}>{t('cmd.title')}</h1>
        <p className={styles.subtitle}>{todayLabel()}</p>
      </header>

      {/* Training toggle */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('cmd.training')}</h2>
        <button
          className={`${styles.trainBtn} ${trained ? styles.trainBtnDone : ''}`}
          onClick={toggleTraining}
          disabled={trainLoading}
          type="button"
        >
          <span className={styles.trainEmoji}>{trained ? '💪' : '💤'}</span>
          <span>{trained ? t('cmd.trainedToday') : t('cmd.markTraining')}</span>
        </button>
        <p className={styles.trainHint}>
          {trained
            ? t('cmd.markedNote')
            : t('cmd.markHint')}
        </p>
      </section>

      {/* Habits */}
      {habits.length > 0 && (
        <section className={styles.card}>
          <div className={styles.sectionRow}>
            <h2 className={styles.sectionTitle}>{t('cmd.habitsToday')}</h2>
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
          <span className={styles.summaryLabel}>{t('cmd.training')}</span>
        </div>
        <div className={styles.summaryBox}>
          <span className={styles.summaryVal}>{habitsDone}/{habitsTotal}</span>
          <span className={styles.summaryLabel}>{t('cmd.habits')}</span>
        </div>
        <div className={styles.summaryBox}>
          <span className={`${styles.summaryVal} ${habitsDone === habitsTotal && habitsTotal > 0 ? styles.summaryGreen : styles.summaryMuted}`}>
            {habitsTotal > 0 ? `${Math.round((habitsDone / habitsTotal) * 100)}%` : '—'}
          </span>
          <span className={styles.summaryLabel}>{t('cmd.compliance')}</span>
        </div>
      </section>

      <p className={styles.vdahNote}>
        {t('cmd.footer')}
      </p>
    </div>
  )
}
