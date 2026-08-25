import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './ContactForm.module.css'

const CALL_KEYS = [
  { id: '8-12',  labelKey: 'intake.callMorning',   subKey: 'intake.callMorningH'   },
  { id: '12-16', labelKey: 'intake.callNoon',      subKey: 'intake.callNoonH'      },
  { id: '16-20', labelKey: 'intake.callAfternoon', subKey: 'intake.callAfternoonH' },
  { id: '20+',   labelKey: 'intake.callEvening',   subKey: 'intake.callEveningH'   },
]
const PRESET_IDS = CALL_KEYS.map(t => t.id)

export default function ContactForm() {
  const { profile, updateProfile } = useAuth()
  const { t } = useSettings()
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
    if (!name.trim()) { setError(t('intake.errName')); return }
    if (!phone.trim()) { setError(t('intake.errPhone')); return }
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
        <div className={styles.brand}>BLAG</div>
        <p className={styles.eyebrow}>{t('intake.eyebrow')}</p>
        <h1 className={styles.title}>{t('intake.title')}</h1>
        <p className={styles.sub}>{t('intake.sub')}</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cf-name">{t('intake.name')} <span className={styles.required}>*</span></label>
          <input
            id="cf-name"
            className={styles.input}
            type="text"
            autoComplete="name"
            placeholder={t('intake.namePh')}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cf-phone">{t('intake.phone')} <span className={styles.required}>*</span></label>
          <input
            id="cf-phone"
            className={styles.input}
            type="tel"
            autoComplete="tel"
            placeholder={t('intake.phonePh')}
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cf-age">{t('intake.age')}</label>
          <input
            id="cf-age"
            className={`${styles.input} ${styles.inputNarrow}`}
            type="number"
            inputMode="numeric"
            placeholder={t('intake.agePh')}
            min="10"
            max="99"
            value={age}
            onChange={e => setAge(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            {t('intake.callQ')}
            <span className={styles.optional}>{t('intake.optional')}</span>
          </label>
          <div className={styles.callTimeGrid}>
            {CALL_KEYS.map(k => (
              <button
                key={k.id}
                type="button"
                className={`${styles.callChip} ${!customMode && callPreset === k.id ? styles.callChipActive : ''}`}
                onClick={() => { setCustomMode(false); setCallPreset(prev => prev === k.id ? null : k.id) }}
              >
                <span className={styles.callChipLabel}>{t(k.labelKey)}</span>
                <span className={styles.callChipSub}>{t(k.subKey)}</span>
              </button>
            ))}
            <button
              type="button"
              className={`${styles.callChip} ${styles.callChipCustom} ${customMode ? styles.callChipActive : ''}`}
              onClick={() => setCustomMode(m => !m)}
            >
              <span className={styles.callChipLabel}>{t('intake.callCustom')}</span>
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
          <label className={styles.label}>{t('intake.daysQ')}</label>
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
          <label className={styles.label} htmlFor="cf-goal">{t('intake.goalQ')}</label>
          <textarea
            id="cf-goal"
            className={styles.textarea}
            placeholder={t('intake.goalPh')}
            rows={3}
            value={goal}
            onChange={e => setGoal(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="cf-notes">
            {t('intake.notesQ')}
            <span className={styles.optional}>{t('intake.optional')}</span>
          </label>
          <textarea
            id="cf-notes"
            className={styles.textarea}
            placeholder={t('intake.notesPh')}
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
          {saving ? '...' : t('intake.submit')}
        </button>
      </div>
    </div>
  )
}
