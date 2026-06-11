import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ContactForm.module.css'

const CALL_TIMES = [
  { id: '8-12',  label: 'Сутринта', sub: '8–12ч'  },
  { id: '12-16', label: 'Обед',     sub: '12–16ч' },
  { id: '16-20', label: 'Следобед', sub: '16–20ч' },
  { id: '20+',   label: 'Вечерта',  sub: '20+ч'   },
]
const PRESET_IDS = CALL_TIMES.map(t => t.id)

export default function ContactForm() {
  const { profile, updateProfile } = useAuth()
  const existing = profile?.intake_call_time || null
  const [name,         setName]         = useState(profile?.name  || '')
  const [phone,        setPhone]        = useState(profile?.phone || '')
  const [age,          setAge]          = useState(profile?.age   || '')
  const [trainingDays, setTrainingDays] = useState(profile?.intake_training_days || null)
  const [callPreset,   setCallPreset]   = useState(PRESET_IDS.includes(existing) ? existing : null)
  const [callCustom,   setCallCustom]   = useState(existing && !PRESET_IDS.includes(existing) ? existing : '')
  const [customMode,   setCustomMode]   = useState(!!(existing && !PRESET_IDS.includes(existing)))
  const [goal,         setGoal]         = useState(profile?.intake_goal  || '')
  const [notes,        setNotes]        = useState(profile?.intake_notes || '')
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name.trim()) { setError('Моля, въведи своето име.'); return }
    if (!phone.trim()) { setError('Моля, въведи телефонен номер.'); return }
    setError('')
    setSaving(true)
    const updates = { intake_done: true }
    if (name.trim())   updates.name                 = name.trim()
    if (phone.trim())  updates.phone                = phone.trim()
    if (age)           updates.age                  = parseInt(age, 10)
    if (trainingDays)  updates.intake_training_days = trainingDays
    const finalCallTime = customMode ? callCustom : callPreset
    if (finalCallTime) updates.intake_call_time     = finalCallTime
    if (goal.trim())   updates.intake_goal          = goal.trim()
    if (notes.trim())  updates.intake_notes         = notes.trim()
    await updateProfile(updates)
    setSaving(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.brand}>BLAG COACHING</div>
        <p className={styles.eyebrow}>СТЪПКА 2 ОТ 3</p>
        <h1 className={styles.title}>ТВОИТЕ ДАННИ</h1>
        <p className={styles.sub}>
          Треньорът ще се свърже с теб лично преди одобрение.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cf-name">Имe <span className={styles.required}>*</span></label>
          <input
            id="cf-name"
            className={styles.input}
            type="text"
            autoComplete="name"
            placeholder="Иван Иванов"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cf-phone">Телефон <span className={styles.required}>*</span></label>
          <input
            id="cf-phone"
            className={styles.input}
            type="tel"
            autoComplete="tel"
            placeholder="+359 88 888 8888"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cf-age">Възраст</label>
          <input
            id="cf-age"
            className={`${styles.input} ${styles.inputNarrow}`}
            type="number"
            inputMode="numeric"
            placeholder="25"
            min="10"
            max="99"
            value={age}
            onChange={e => setAge(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Кога можем да те потърсим по телефона?
            <span className={styles.optional}> (по избор)</span>
          </label>
          <div className={styles.callTimeGrid}>
            {CALL_TIMES.map(t => (
              <button
                key={t.id}
                type="button"
                className={`${styles.callChip} ${!customMode && callPreset === t.id ? styles.callChipActive : ''}`}
                onClick={() => { setCustomMode(false); setCallPreset(prev => prev === t.id ? null : t.id) }}
              >
                <span className={styles.callChipLabel}>{t.label}</span>
                <span className={styles.callChipSub}>{t.sub}</span>
              </button>
            ))}
            <button
              type="button"
              className={`${styles.callChip} ${styles.callChipCustom} ${customMode ? styles.callChipActive : ''}`}
              onClick={() => setCustomMode(m => !m)}
            >
              <span className={styles.callChipLabel}>Конкретен час</span>
            </button>
          </div>
          {customMode && (
            <input
              type="time"
              className={`${styles.input} ${styles.inputNarrow}`}
              value={callCustom}
              onChange={e => setCallCustom(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            />
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Колко дни в седмицата искаш да тренираш?</label>
          <div className={styles.chips}>
            {[1, 2, 3, 4, 5, 6].map(d => (
              <button
                key={d}
                type="button"
                className={`${styles.chip} ${trainingDays === d ? styles.chipActive : ''}`}
                onClick={() => setTrainingDays(prev => prev === d ? null : d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cf-goal">Какво искаш да постигнеш?</label>
          <textarea
            id="cf-goal"
            className={styles.textarea}
            placeholder="Напр. искам да отслабна с 10кг до лятото..."
            rows={3}
            value={goal}
            onChange={e => setGoal(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cf-notes">
            Здравни бележки / наранявания
            <span className={styles.optional}> (по избор)</span>
          </label>
          <textarea
            id="cf-notes"
            className={styles.textarea}
            placeholder="Напр. болки в коляното, хранителни алергии..."
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}
        <button
          className={styles.cta}
          onClick={handleSubmit}
          disabled={saving}
          type="button"
        >
          {saving ? '...' : 'ИЗПРАТИ'}
        </button>
      </div>
    </div>
  )
}
