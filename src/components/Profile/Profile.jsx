import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWeightLog } from '../../hooks/useWeightLog'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import WeightSparkline from './WeightSparkline'
import NotificationSettings from './NotificationSettings'
import styles from './Profile.module.css'

export default function Profile() {
  const { profile, updateProfile, signOut } = useAuth()
  const { weights, todayEntry, trend, addWeight } = useWeightLog()
  const [targetWeight, setTargetWeight] = useLocalStorage('blag_target_weight_v1', '')

  const [weightInput, setWeightInput] = useState(todayEntry ? String(todayEntry.kg) : '')
  const [weightSaved, setWeightSaved] = useState(false)

  const [form, setForm] = useState({
    name:         profile?.name         ?? '',
    targetWeight: targetWeight          ?? '',
    calories:     profile?.calories     ?? 2450,
    protein:      profile?.protein      ?? 180,
    carbs:        profile?.carbs        ?? 250,
    fat:          profile?.fat          ?? 70,
  })
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState(null)

  function handleWeightSave(e) {
    e.preventDefault()
    const kg = parseFloat(weightInput)
    if (!kg || kg < 20 || kg > 300) return
    addWeight(kg)
    setWeightSaved(true)
    setTimeout(() => setWeightSaved(false), 2000)
  }

  async function handleSettingsSave(e) {
    e.preventDefault()
    setSettingsError(null)

    const tw = form.targetWeight ? parseFloat(form.targetWeight) : ''
    setTargetWeight(tw)

    const { error } = await updateProfile({
      name:     form.name,
      calories: parseInt(form.calories) || 2450,
      protein:  parseInt(form.protein)  || 180,
      carbs:    parseInt(form.carbs)    || 250,
      fat:      parseInt(form.fat)      || 70,
    })

    if (error) {
      setSettingsError(error.message)
    } else {
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    }
  }

  const trendLabel = trend === null ? null
    : trend > 0 ? `+${trend} kg тази седмица ↑`
    : trend < 0 ? `${trend} kg тази седмица ↓`
    : 'Без промяна тази седмица'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ПРОФИЛ</h1>
        {profile?.name && <p className={styles.subtitle}>{profile.name}</p>}
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
              <label className={styles.label} htmlFor="s-cal">Калории</label>
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
              <label className={styles.label} htmlFor="s-prot">Протеин</label>
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

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="s-carbs">Въглехидрати</label>
              <div className={styles.numWrap}>
                <input
                  id="s-carbs"
                  className={styles.numInput}
                  type="number"
                  step="10"
                  min="0"
                  max="1000"
                  value={form.carbs}
                  onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))}
                />
                <span className={styles.unit}>g</span>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="s-fat">Мазнини</label>
              <div className={styles.numWrap}>
                <input
                  id="s-fat"
                  className={styles.numInput}
                  type="number"
                  step="5"
                  min="0"
                  max="500"
                  value={form.fat}
                  onChange={e => setForm(f => ({ ...f, fat: e.target.value }))}
                />
                <span className={styles.unit}>g</span>
              </div>
            </div>
          </div>

          {settingsError && <p className={styles.errorMsg}>{settingsError}</p>}

          <button type="submit" className={`${styles.saveSettingsBtn} ${settingsSaved ? styles.saved : ''}`}>
            {settingsSaved ? '✓ Запазено' : 'Запази настройките'}
          </button>
        </form>
      </section>

      {/* Push notifications */}
      <NotificationSettings />

      {/* Sign out */}
      <section className={styles.card}>
        <button className={styles.signOutBtn} onClick={signOut} type="button">
          Изход от акаунта
        </button>
      </section>
    </div>
  )
}
