import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useWeightLog } from '../../hooks/useWeightLog'
import { useHabitHistory } from '../../hooks/useHabitHistory'
import { parseWeight } from '../../utils/weight'
import { supabase } from '../../lib/supabase'
import WeightChart from './WeightChart'
import NotificationSettings from './NotificationSettings'
import DashboardCards from './DashboardCards'
import HabitsEditor from './HabitsEditor'
import UsernameField from './UsernameField'
import TrainingEditor from '../Coach/TrainingEditor'
import ActivityCalendar from './ActivityCalendar'
import FormCheckin from './FormCheckin'
import ProgressPhotos from '../ProgressPhotos/ProgressPhotos'
import WeeklySnapshot from './WeeklySnapshot'
import AvatarCropper from './AvatarCropper'
import AppHeader from '../AppHeader/AppHeader'
import TodayDashboard from '../TodayDashboard/TodayDashboard'
import Pictogram from '../Pictogram/Pictogram'
import { layout } from '../TodayDashboard/cards'
import styles from './Profile.module.css'
import { loc } from '../../utils/locale'

  function calcStreak(history) {
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const e = history.get(iso)
    if (e && e.completed === e.total && e.total > 0) streak++
    else break
  }
  return streak
}

const MACRO_COLORS = {
  calories: '#F06292',
  protein:  'var(--macro-protein)',
  carbs:    'var(--macro-carbs)',
  fat:      'var(--accent)',
}

/* Трите раздела на страницата.
   Профилът пое и таблото за деня, а сборът е твърде дълъг за един скрол:
   най-често отваряното — картите за днес — би стояло над петстотин пиксела
   настройки, които се пипат веднъж на месец. Затова лента, а не заглавия. */
const SEGMENTS = [
  { id: 'today',    key: 'profile.seg.today',    icon: 'dashboard' },
  { id: 'progress', key: 'profile.seg.progress', icon: 'trend'     },
  { id: 'settings', key: 'profile.seg.settings', icon: 'gear'      },
]

export default function Profile({ onMenuOpen, onNavigate }) {
  const { profile, user, updateProfile, signOut } = useAuth()
  const { theme, setTheme, lang, setLang, restTimer, setRestTimer, t } = useSettings()
  const { weights, todayEntry, trend, addWeight, removeWeight } = useWeightLog()
  const history = useHabitHistory()
  /* profiles.target_weight, not localStorage.
     Onboarding writes this column and the coach edits it from the client panel,
     so a second copy in the browser meant three places could disagree: the goal
     line on the chart below, the fraction on the Днес card, and whatever the
     coach had set. It also vanished when the client opened the app anywhere
     else. */
  const targetWeight = profile?.target_weight ?? ''

  const [name, setName]           = useState(profile?.name ?? '')
  /* Биото стои до името, защото е същото нещо: как те вижда друг човек.
     Показва се на картата, която се отваря от кръгчето във фийда. */
  const [bio, setBio]             = useState(profile?.bio ?? '')
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState(null)

  const [weightInput, setWeightInput] = useState('')
  const [weightSaved, setWeightSaved] = useState(false)
  const [weightError, setWeightError] = useState('')
  const [targetSaved, setTargetSaved] = useState(false)

  const [pwOpen, setPwOpen]           = useState(false)
  const [pwValue, setPwValue]         = useState('')
  const [pwSaving, setPwSaving]       = useState(false)
  const [pwStatus, setPwStatus]       = useState('') // '' | 'saved' | 'err:<msg>'

  async function handlePasswordSave() {
    setPwStatus('')
    if (pwValue.length < 6) { setPwStatus('err:' + t('profile.password.min')); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwValue })
    setPwSaving(false)
    if (error) { setPwStatus('err:' + (error.message || t('profile.password.err'))); return }
    setPwValue('')
    setPwStatus('saved')
    setTimeout(() => { setPwStatus(''); setPwOpen(false) }, 1800)
  }

  // Pre-fill once today's entry loads from DB (useState runs before fetch completes)
  useEffect(() => {
    if (todayEntry) setWeightInput(String(todayEntry.kg))
  }, [todayEntry?.date])
  const [targetInput, setTargetInput] = useState(String(targetWeight ?? ''))
  /* The profile arrives after the first render, and it changes again when the
     coach edits the goal from their panel — so the field follows the column
     rather than being seeded from it once and drifting. */
  useEffect(() => { setTargetInput(String(profile?.target_weight ?? '')) },
    [profile?.target_weight])

  /* Anyone who set a goal before it moved to the database still has it in this
     browser, and moving the source without moving the value would have quietly
     thrown their number away. Carried up once, then the old copy is deleted so
     it can never come back and overwrite a newer one. */
  useEffect(() => {
    if (!profile || profile.target_weight != null) return
    let old = null
    try { old = JSON.parse(localStorage.getItem('blag_target_weight_v1')) } catch { /* nothing to carry */ }
    const kg = parseWeight(old)
    if (kg === null) return
    updateProfile({ target_weight: kg }).then(({ error }) => {
      if (!error) localStorage.removeItem('blag_target_weight_v1')
    })
  }, [profile?.id, profile?.target_weight])

  /* Денят е това, с което страницата отваря. Разделът не се помни между
     влизанията нарочно: който е бил в настройките сутринта, вечерта иска пак
     да види чашите вода, а не полето за смяна на парола. */
  const [seg, setSeg] = useState('today')

  /* Дневното мерене се въвежда на картата в ДНЕС. Формулярът тук се показва
     само на този, който е махнал тази карта от таблото си — иначе един и същ
     килограм би имал две полета на една страница. */
  const weighInOnToday = layout(profile?.dashboard_cards).visible.includes('weight')

  const [savingCoachPlan, setSavingCoachPlan] = useState(false)
  const [weightRange, setWeightRange] = useState('1M')
  const [showAllWeights, setShowAllWeights] = useState(false)
  const isCoach = profile?.role === 'coach'

  // Editable macro targets (coach sets their own; clients read-only via profile)
  const [macros, setMacros] = useState({
    calories: profile?.calories ?? '',
    protein:  profile?.protein  ?? '',
    carbs:    profile?.carbs    ?? '',
    fat:      profile?.fat      ?? '',
  })
  const [macrosSaving, setMacrosSaving] = useState(false)
  const [macrosSaved,  setMacrosSaved]  = useState(false)

  useEffect(() => {
    if (profile?.name) setName(profile.name)
  }, [profile?.name])

  useEffect(() => { setBio(profile?.bio ?? '') }, [profile?.bio])

  const streak = useMemo(() => calcStreak(history), [history])

  const startWeight  = weights[0]?.kg ?? null
  const latestWeight = weights[weights.length - 1]?.kg ?? null
  const targetW      = targetWeight ? parseFloat(targetWeight) : null

  let weightProgress = null
  if (startWeight && latestWeight && targetW && startWeight !== targetW) {
    if (targetW < startWeight) {
      weightProgress = Math.min(100, Math.max(0, Math.round((startWeight - latestWeight) / (startWeight - targetW) * 100)))
    } else {
      weightProgress = Math.min(100, Math.max(0, Math.round((latestWeight - startWeight) / (targetW - startWeight) * 100)))
    }
  }

  const trendLabel = trend === null ? null
    : trend > 0 ? t('profile.weight.trendUp',   { n: trend })
    : trend < 0 ? t('profile.weight.trendDown', { n: trend })
    :             t('profile.weight.trendFlat')

  const RANGE_DAYS = { '2W': 14, '1M': 30, '3M': 90, 'ALL': null }
  const WEIGHT_ROWS_SHOWN = 7
  const filteredWeights = useMemo(() => {
    const days = RANGE_DAYS[weightRange]
    if (!days) return weights
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
    return weights.filter(w => w.date >= cutoff)
  }, [weights, weightRange])

  useEffect(() => { setShowAllWeights(false) }, [weightRange])

  // Newest first, each row carrying its delta against the previous entry
  const weightRows = useMemo(() => {
    const rows = [...filteredWeights].reverse()
    return rows.map((entry, i) => {
      const prev = rows[i + 1]
      return { ...entry, delta: prev ? Math.round((entry.kg - prev.kg) * 10) / 10 : null }
    })
  }, [filteredWeights])

  const weightStats = useMemo(() => {
    if (filteredWeights.length === 0) return null
    const kgs = filteredWeights.map(w => w.kg)
    const change = filteredWeights.length >= 2
      ? Math.round((kgs[kgs.length - 1] - kgs[0]) * 10) / 10
      : null
    return {
      count: filteredWeights.length,
      min:   Math.min(...kgs),
      max:   Math.max(...kgs),
      change,
    }
  }, [filteredWeights])

  async function handleNameSave(e) {
    e.preventDefault()
    setNameError(null)
    const { error } = await updateProfile({ name, bio: bio.trim() || null })
    if (error) setNameError(error.message)
    else { setNameSaved(true); setTimeout(() => setNameSaved(false), 2000) }
  }

  async function handleWeightSave(e) {
    e.preventDefault()
    // parseFloat stops at the comma, so "86,4" was being logged as 86 — the
    // decimal is the whole point of weighing yourself daily.
    const kg = parseWeight(weightInput)
    if (kg === null) { setWeightError(t('profile.weight.errCheck')); return }
    setWeightError('')
    const { error } = await addWeight(kg)
    if (error) {
      setWeightError(t('profile.weight.errSave'))
    } else {
      setWeightSaved(true)
      setTimeout(() => setWeightSaved(false), 3000)
    }
  }

  async function handleTargetSave() {
    const v = parseWeight(targetInput)
    if (v === null && targetInput.trim() !== '') return
    const { error } = await updateProfile({ target_weight: v })
    if (error) return
    setTargetSaved(true)
    setTimeout(() => setTargetSaved(false), 3000)
  }

  async function handleSaveCoachPlan(days) {
    setSavingCoachPlan(true)
    await updateProfile({ training_plan: days })
    setSavingCoachPlan(false)
  }

  const avatarInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [cropFile, setCropFile] = useState(null)

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropFile(file)
    e.target.value = ''
  }

  async function handleCropConfirm(blob) {
    setCropFile(null)
    if (!user) return
    setAvatarUploading(true)
    const path = `${user.id}/avatar.jpg`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile({ avatar_url: publicUrl + `?t=${Date.now()}` })
    }
    setAvatarUploading(false)
  }

  async function handleMacrosSave() {
    setMacrosSaving(true)
    await updateProfile({
      calories: parseInt(macros.calories) || 0,
      protein:  parseInt(macros.protein)  || 0,
      carbs:    parseInt(macros.carbs)    || 0,
      fat:      parseInt(macros.fat)      || 0,
    })
    setMacrosSaving(false)
    setMacrosSaved(true)
    setTimeout(() => setMacrosSaved(false), 2000)
  }

  return (
    <div className={styles.page}>
      {cropFile && (
        <AvatarCropper
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
      <AppHeader
        onMenuOpen={onMenuOpen}
        /* No plan above the name. It printed FREE over his own profile — the
           one screen where the reader already knows what they are paying, and
           the last place a reminder of it belongs. */
        title={profile?.name || t('profile.title')}
        avatarUrl={profile?.avatar_url}
        avatarInitial={(profile?.name || '?')[0].toUpperCase()}
        onAvatarClick={() => avatarInputRef.current?.click()}
        avatarEditable
        avatarBusy={avatarUploading}
      />

      <div className={styles.segments} role="tablist" aria-label={t('profile.seg.aria')}>
        {SEGMENTS.map(sg => (
          <button
            key={sg.id}
            type="button"
            role="tab"
            aria-selected={seg === sg.id}
            className={`${styles.segment} ${seg === sg.id ? styles.segmentOn : ''}`}
            onClick={() => setSeg(sg.id)}
          >
            <Pictogram name={sg.icon} size={16} className={styles.segmentIcon} />
            <span className={styles.segmentLabel}>{t(sg.key)}</span>
          </button>
        ))}
      </div>

      {/* ── ДНЕС ──
          Същите карти, които доскоро бяха отделен таб: готовност, навици,
          тегло, вода, макроси, стек. Подредбата им е клиентска и се редактира
          в НАСТРОЙКИ, един раздел вдясно. */}
      {seg === 'today' && (
        <TodayDashboard
          embedded
          onNavigate={onNavigate}
          onHabitsSetup={() => setSeg('settings')}
        />
      )}

      {seg === 'progress' && (<>

      {/* Form check-in — daily action, lives at the top */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('profile.formCheckin')}</h2>
        <FormCheckin />
      </section>

      {/* Progress photo timeline */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('profile.progressPhotos')}</h2>
        <ProgressPhotos />
      </section>

      {/* Activity calendar */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('profile.activity')}</h2>
        <p className={styles.sectionSub}>{t('profile.activitySub')}</p>
        <ActivityCalendar />
      </section>

      {/* Weekly snapshot */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('profile.weeklySnapshot')}</h2>
        <WeeklySnapshot kcalTarget={parseInt(macros.calories) || 0} />
      </section>

      {/* Macro targets — editable for coach, read-only display for clients */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>
          {isCoach ? t('profile.macros') : t('profile.macrosReadonly')}
        </h2>
        <div className={styles.macroEditGrid}>
          {[
            { key: 'calories', label: t('profile.macros.calories'), unit: t('unit.kcal'), color: MACRO_COLORS.calories },
            { key: 'protein',  label: t('profile.macros.protein'),  unit: 'g',           color: MACRO_COLORS.protein  },
            { key: 'carbs',    label: t('profile.macros.carbs'),    unit: 'g',           color: MACRO_COLORS.carbs    },
            { key: 'fat',      label: t('profile.macros.fat'),      unit: 'g',           color: MACRO_COLORS.fat      },
          ].map(({ key, label, unit, color }) => (
            <div key={key} className={styles.macroEditField}>
              <span className={styles.macroEditLabel} style={{ color }}>{label}</span>
              {isCoach ? (
                <input
                  className={styles.macroEditInput}
                  type="number"
                  min="0"
                  value={macros[key]}
                  onChange={e => setMacros(prev => ({ ...prev, [key]: e.target.value }))}
                />
              ) : (
                <span className={styles.macroEditValue} style={{ color }}>
                  {profile?.[key === 'calories' ? 'calories' : key] ?? '—'}
                </span>
              )}
              <span className={styles.macroEditUnit}>{unit}</span>
            </div>
          ))}
        </div>
        {isCoach && (
          <button
            className={`${styles.saveSettingsBtn} ${macrosSaved ? styles.saved : ''}`}
            onClick={handleMacrosSave}
            disabled={macrosSaving}
            type="button"
          >
            {macrosSaving ? '...' : macrosSaved ? t('profile.saved') : t('profile.macros.save')}
          </button>
        )}
      </section>

      {/* Weight tracker */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('profile.weight')}</h2>

        {!weighInOnToday && (
        <form onSubmit={handleWeightSave} className={styles.weightForm}>
          <label className={styles.label} htmlFor="weight-input">{t('profile.weight.today')}</label>
          <div className={styles.weightRow}>
            <input
              id="weight-input"
              className={styles.weightInput}
              type="number"
              step="0.01"
              min="20"
              max="300"
              placeholder="85.00"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
            />
            <span className={styles.unit}>kg</span>
            <button type="submit" className={`${styles.saveWeightBtn} ${weightSaved ? styles.saveWeightBtnSaved : ''}`}>
              {weightSaved ? '✓' : t('profile.save')}
            </button>
          </div>
          {weightSaved && <p className={styles.savedMsg}>{t('profile.weight.savedMsg', { kg: weightInput })}</p>}
          {weightError && <p className={styles.errorMsg}>{weightError}</p>}
        </form>
        )}

        {/* Target weight */}
        <div className={styles.targetRow}>
          <label className={styles.label} htmlFor="target-input">{t('profile.weight.target')}</label>
          <div className={styles.weightRow}>
            <input
              id="target-input"
              className={styles.weightInput}
              type="number"
              step="0.5"
              min="30"
              max="250"
              placeholder="80.0"
              value={targetInput}
              onChange={e => setTargetInput(e.target.value)}
              onBlur={handleTargetSave}
            />
            <span className={styles.unit}>kg</span>
          </div>
          {targetSaved && <p className={styles.savedMsg}>{t('profile.weight.targetSaved')}</p>}
        </div>

        {/* Progress bar */}
        {weightProgress !== null && (
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${weightProgress}%` }} />
            </div>
            <span className={styles.progressLabel}>{t('profile.weight.progress', { pct: weightProgress })}</span>
          </div>
        )}

        {trendLabel && <p className={styles.trend}>{trendLabel}</p>}

        {weights.length >= 2 && (
          <>
            <div className={styles.sparklineWrap}>
              <WeightChart
                weights={weights}
                targetWeight={targetW}
                gradId="wcProfile"
                range={weightRange}
                onRange={setWeightRange}
              />
            </div>

            {weightStats && (
              <div className={styles.weightStatsRow}>
                <div className={styles.weightStat}>
                  <span className={styles.weightStatVal}>{weightStats.count}</span>
                  <span className={styles.weightStatLabel}>{t('profile.weight.stat.records')}</span>
                </div>
                <div className={styles.weightStat}>
                  <span className={styles.weightStatVal}>{weightStats.min}</span>
                  <span className={styles.weightStatLabel}>{t('profile.weight.stat.min')}</span>
                </div>
                <div className={styles.weightStat}>
                  <span className={styles.weightStatVal}>{weightStats.max}</span>
                  <span className={styles.weightStatLabel}>{t('profile.weight.stat.max')}</span>
                </div>
                {weightStats.change !== null && (
                  <div className={styles.weightStat}>
                    <span className={`${styles.weightStatVal} ${weightStats.change > 0 ? styles.up : weightStats.change < 0 ? styles.down : ''}`}>
                      {weightStats.change > 0 ? `+${weightStats.change}` : weightStats.change}
                    </span>
                    <span className={styles.weightStatLabel}>{t('profile.weight.stat.change')}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {weightRows.length > 0 ? (
          <>
            <div className={styles.weightTableWrap}>
              <table className={styles.weightTable}>
                <thead>
                  <tr>
                    <th className={styles.weightTh}>{t('profile.weight.col.date')}</th>
                    <th className={styles.weightTh}>{t('profile.weight.col.weight')}</th>
                    <th className={styles.weightTh}>{t('profile.weight.col.change')}</th>
                    <th className={styles.weightTh} />
                  </tr>
                </thead>
                <tbody>
                  {(showAllWeights ? weightRows : weightRows.slice(0, WEIGHT_ROWS_SHOWN)).map((entry, i) => (
                    <tr
                      key={entry.date}
                      className={i === 0 ? styles.weightTrLatest : styles.weightTr}
                    >
                      <td className={styles.weightTd}>
                        {new Date(entry.date).toLocaleDateString(loc(), { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td className={styles.weightTd}>{entry.kg} kg</td>
                      <td className={styles.weightTd}>
                        {entry.delta === null ? '—' : (
                          <span className={entry.delta > 0 ? styles.deltaUp : entry.delta < 0 ? styles.deltaDown : styles.deltaNeutral}>
                            {entry.delta > 0 ? `+${entry.delta}` : entry.delta} kg
                          </span>
                        )}
                      </td>
                      <td className={styles.weightTd}>
                        <button
                          className={styles.weightDeleteBtn}
                          onClick={() => removeWeight(entry.date)}
                          type="button"
                          aria-label={t('foodlog.delete')}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {weightRows.length > WEIGHT_ROWS_SHOWN && (
              <button
                className={styles.weightMoreBtn}
                onClick={() => setShowAllWeights(v => !v)}
                type="button"
              >
                {showAllWeights
                  ? t('profile.weight.showLess')
                  : t('profile.weight.showAll', { n: weightRows.length })}
              </button>
            )}
          </>
        ) : (
          <p className={styles.emptyHint}>{t('profile.weight.empty')}</p>
        )}
      </section>

      {/* Coach: Edit own training plan */}
      {isCoach && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>{t('profile.myPlan')}</h2>
          <TrainingEditor
            initialPlan={profile.training_plan}
            onSave={handleSaveCoachPlan}
            saving={savingCoachPlan}
          />
        </section>
      )}

      </>)}

      {seg === 'settings' && (<>

      {/* Name */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('profile.name')}</h2>
        <form onSubmit={handleNameSave} className={styles.nameForm}>
          <input
            className={styles.textInput}
            type="text"
            placeholder={t('profile.name.placeholder')}
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <label className={styles.label} htmlFor="bio-input">{t('profile.bio')}</label>
          <textarea
            id="bio-input"
            className={styles.bioInput}
            rows={3}
            maxLength={240}
            placeholder={t('profile.bio.placeholder')}
            value={bio}
            onChange={e => setBio(e.target.value)}
          />
          <span className={styles.bioCount}>{bio.length}/240</span>
          {nameError && <p className={styles.errorMsg}>{nameError}</p>}
          <button type="submit" className={`${styles.saveSettingsBtn} ${nameSaved ? styles.saved : ''}`}>
            {nameSaved ? t('profile.saved') : t('profile.save')}
          </button>
        </form>

        <UsernameField />
      </section>

      <NotificationSettings />

      {/* Custom habits — the six defaults are a starting point, not a rule.
          The list you check off each day is the one you'll actually use, and
          "8000 стъпки" is not the same target for a runner and someone at a
          desk job. Editor lives here because habits are how *this* client
          measures their week. */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('profile.habits')}</h2>
        <p className={styles.sectionSub}>{t('profile.habits.sub')}</p>
        <HabitsEditor />
      </section>

      {/* Next to the theme and the language, because it is the same kind of
          setting: how the app looks to this person, not what it knows. */}
      <DashboardCards />

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('settings.appearance')}</h2>
        <div className={styles.settingsRow}>
          <span className={styles.settingsLabel}>{t('settings.theme')}</span>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${theme === 'dark'  ? styles.toggleBtnActive : ''}`}
              onClick={() => setTheme('dark')}
            >🌙 {t('settings.theme.dark')}</button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${theme === 'light' ? styles.toggleBtnActive : ''}`}
              onClick={() => setTheme('light')}
            >☀️ {t('settings.theme.light')}</button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${theme === 'glass' ? styles.toggleBtnActive : ''}`}
              onClick={() => setTheme('glass')}
            >💎 {t('settings.theme.glass')}</button>
          </div>
        </div>
        <div className={styles.settingsRow}>
          <span className={styles.settingsLabel}>{t('settings.language')}</span>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${lang === 'bg' ? styles.toggleBtnActive : ''}`}
              onClick={() => setLang('bg')}
            >BG</button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${lang === 'en' ? styles.toggleBtnActive : ''}`}
              onClick={() => setLang('en')}
            >EN</button>
          </div>
        </div>
        <div className={styles.settingsRow}>
          <span className={styles.settingsLabel}>{t('profile.restTimer')}</span>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${restTimer ? styles.toggleBtnActive : ''}`}
              onClick={() => setRestTimer(true)}
            >{t('profile.restTimer.on')}</button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${!restTimer ? styles.toggleBtnActive : ''}`}
              onClick={() => setRestTimer(false)}
            >{t('profile.restTimer.off')}</button>
          </div>
        </div>
      </section>

      {/* Password change — lives here rather than on the auth screen, where a
          "forgotten password" flow was competing with the magic-link login.
          Anyone in the app is already signed in; supabase.auth.updateUser
          accepts the new password against the current session, no old one
          needed. */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('profile.password')}</h2>
        {!pwOpen ? (
          <button
            className={styles.pwOpenBtn}
            onClick={() => setPwOpen(true)}
            type="button"
          >
            {t('profile.password.change')}
          </button>
        ) : (
          <div className={styles.pwForm}>
            <input
              type="password"
              className={styles.pwInput}
              value={pwValue}
              onChange={e => { setPwValue(e.target.value); if (pwStatus.startsWith('err')) setPwStatus('') }}
              placeholder={t('profile.password.placeholder')}
              autoComplete="new-password"
              minLength={6}
            />
            <div className={styles.pwActions}>
              <button
                className={`${styles.pwSaveBtn} ${pwStatus === 'saved' ? styles.pwSaveBtnSaved : ''}`}
                onClick={handlePasswordSave}
                disabled={pwSaving || pwValue.length < 6}
                type="button"
              >
                {pwSaving ? '...' : pwStatus === 'saved' ? t('profile.password.saved') : t('profile.save')}
              </button>
              <button
                className={styles.pwCancelBtn}
                onClick={() => { setPwOpen(false); setPwValue(''); setPwStatus('') }}
                type="button"
              >
                {t('profile.password.cancel')}
              </button>
            </div>
            {pwStatus.startsWith('err') && (
              <p className={styles.pwError}>{pwStatus.slice(4)}</p>
            )}
          </div>
        )}
      </section>

      <section className={styles.card}>
        <button className={styles.signOutBtn} onClick={signOut} type="button">
          {t('profile.signOut')}
        </button>
      </section>

      </>)}
    </div>
  )
}
