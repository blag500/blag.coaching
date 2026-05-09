import { useState } from 'react'
import { useWeightLog } from '../../hooks/useWeightLog'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import WeightSparkline from './WeightSparkline'
import NotificationSettings from './NotificationSettings'
import styles from './Profile.module.css'

const DEFAULT_PROFILE = { name: '', targetWeight: '', calories: 2450, protein: 180 }

export default function Profile() {
  const { weights, todayEntry, trend, addWeight } = useWeightLog()
  const [profile, setProfile] = useLocalStorage('blag_profile_v1', DEFAULT_PROFILE)

  const [weightInput, setWeightInput] = useState(todayEntry ? String(todayEntry.kg) : '')
  const [weightSaved, setWeightSaved] = useState(false)

  const [form, setForm] = useState({
    name:         profile.name ?? '',
    targetWeight: profile.targetWeight ?? '',
    calories:     profile.calories ?? 2450,
    protein:      profile.protein ?? 180,
  })
  const [settingsSaved, setSettingsSaved] = useState(false)

  function handleWeightSave(e) {
    e.preventDefault()
    const kg = parseFloat(weightInput)
    if (!kg || kg < 20 || kg > 300) return
    addWeight(kg)
    setWeightSaved(true)
    setTimeout(() => setWeightSaved(false), 2000)
  }

  function handleSettingsSave(e) {
    e.preventDefault()
    setProfile({
      name:         form.name,
      targetWeight: form.targetWeight ? parseFloat(form.targetWeight) : '',
      calories:     parseInt(form.calories) || 2450,
      protein:      parseInt(form.protein) || 180,
    })
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  const trendLabel = trend === null ? null
    : trend > 0 ? `+${trend} kg тази седмица ↑`
    : trend < 0 ? `${trend} kg тази седмица ↓`
    : 'Без промяна тази седмица'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ПРОФИЛ</h1>
        {profile.name && <p className={styles.subtitle}>{profile.name}</p>}
      </header>

      {/* Weight tracker */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>ТЕГЛО</h2>

        <form onSubmit={handleWeightSave} className={styles.weightForm}>
          <label className={styles.label} htmlFor="weight-input">Днешно тегло</label>
          <div className={styles.weightRow}>
            <input
              id="weight-input"
              className={styles.weightInput}
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="85.0"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
            />
            <span className={styles.unit}>kg</span>
            <button type="submit" className={styles.saveWeightBtn}>
              {weightSaved ? '✓' : 'Запази'}
            </button>
          </div>
        </form>

        {trendLabel && <p className={styles.trend}>{trendLabel}</p>}

        {weights.length >= 2 && (
          <div className={styles.sparklineWrap}>
            <WeightSparkline weights={weights} />
          </div>
        )}

        {weights.length < 2 && (
          <p className={styles.emptyHint}>Запиши тегло поне 2 дни, за да видиш графика</p>
        )}
      </section>

      {/* Settings */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>НАСТРОЙКИ</h2>

        <form onSubmit={handleSettingsSave} className={styles.settingsForm}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="s-name">Твоето име</label>
            <input
              id="s-name"
              className={styles.textInput}
              type="text"
              placeholder="Николай"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="s-target">Целево тегло (kg)</label>
            <input
              id="s-target"
              className={styles.textInput}
              type="number"
              step="0.5"
              min="30"
              max="250"
              placeholder="80"
              value={form.targetWeight}
              onChange={e => setForm(f => ({ ...f, targetWeight: e.target.value }))}
            />
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="s-cal">Калории/ден</label>
              <div className={styles.numWrap}>
                <input
                  id="s-cal"
                  className={styles.numInput}
                  type="number"
                  step="50"
                  min="500"
                  max="6000"
                  value={form.calories}
                  onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                />
                <span className={styles.unit}>kcal</span>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="s-prot">Протеин/ден</label>
              <div className={styles.numWrap}>
                <input
                  id="s-prot"
                  className={styles.numInput}
                  type="number"
                  step="5"
                  min="30"
                  max="500"
                  value={form.protein}
                  onChange={e => setForm(f => ({ ...f, protein: e.target.value }))}
                />
                <span className={styles.unit}>g</span>
              </div>
            </div>
          </div>

          <button type="submit" className={`${styles.saveSettingsBtn} ${settingsSaved ? styles.saved : ''}`}>
            {settingsSaved ? '✓ Запазено' : 'Запази настройките'}
          </button>
        </form>
      </section>

      {/* Push notifications */}
      <NotificationSettings />
    </div>
  )
}
