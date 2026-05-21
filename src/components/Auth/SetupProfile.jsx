import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './SetupProfile.module.css'

const GOALS = [
  { id: 'loss',     label: 'ОТСЛАБВАНЕ'      },
  { id: 'gain',     label: 'КАЧВАНЕ НА МАСА' },
  { id: 'maintain', label: 'ПОДДРЪЖКА'        },
  { id: 'sport',    label: 'СПОРТНА ФОРМА'   },
]

export default function SetupProfile({ onDone }) {
  const { user, updateProfile } = useAuth()
  const [weight, setWeight] = useState('')
  const [goal, setGoal]     = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const tasks = []
    const kg = parseFloat(weight)
    if (kg > 0) {
      const today = new Date().toISOString().slice(0, 10)
      tasks.push(
        supabase.from('weight_logs').upsert(
          { user_id: user.id, date: today, kg },
          { onConflict: 'user_id,date' }
        )
      )
    }
    if (goal) tasks.push(updateProfile({ goal }))
    await Promise.all(tasks)
    setSaving(false)
    onDone()
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>СТЪПКА 2 ОТ 2</p>
        <h1 className={styles.title}>РАЗКАЖИ НИ ЗА СЕБЕ СИ</h1>
        <p className={styles.sub}>Помага на треньора ти да настрои плана.</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="setup-weight">Текущо тегло</label>
          <div className={styles.inputWrap}>
            <input
              id="setup-weight"
              className={styles.input}
              type="number"
              inputMode="decimal"
              min="30"
              max="300"
              step="0.1"
              placeholder="75.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
            <span className={styles.inputUnit}>кг</span>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Цел</label>
          <div className={styles.chips}>
            {GOALS.map(g => (
              <button
                key={g.id}
                className={`${styles.chip} ${goal === g.id ? styles.chipActive : ''}`}
                onClick={() => setGoal(prev => prev === g.id ? null : g.id)}
                type="button"
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className={styles.cta}
          onClick={handleSave}
          disabled={saving}
          type="button"
        >
          {saving ? '...' : 'ГОТОВО'}
        </button>
        <button className={styles.skip} onClick={onDone} type="button">
          Пропусни
        </button>
      </div>
    </div>
  )
}
