import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ContactForm.module.css'

export default function ContactForm() {
  const { profile, updateProfile } = useAuth()
  const [name,         setName]         = useState(profile?.name  || '')
  const [phone,        setPhone]        = useState(profile?.phone || '')
  const [age,          setAge]          = useState(profile?.age   || '')
  const [trainingDays, setTrainingDays] = useState(profile?.intake_training_days || null)
  const [goal,         setGoal]         = useState(profile?.intake_goal  || '')
  const [notes,        setNotes]        = useState(profile?.intake_notes || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    const updates = { intake_done: true }
    if (name.trim())   updates.name                 = name.trim()
    if (phone.trim())  updates.phone                = phone.trim()
    if (age)           updates.age                  = parseInt(age, 10)
    if (trainingDays)  updates.intake_training_days = trainingDays
    if (goal.trim())   updates.intake_goal          = goal.trim()
    if (notes.trim())  updates.intake_notes         = notes.trim()
    await updateProfile(updates)
    setSaving(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>СТЪПКА 2 ОТ 3</p>
        <h1 className={styles.title}>ТВОИТЕ ДАННИ</h1>
        <p className={styles.sub}>
          Треньорът ще се свърже с теб лично преди одобрение.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cf-name">Имe</label>
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
          <label className={styles.label} htmlFor="cf-phone">Телефон</label>
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
