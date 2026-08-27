import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { supabase } from '../../lib/supabase'
import { HABITS } from '../../data/appData'
const DEFAULT_HABITS = HABITS
import TrainingEditor from './TrainingEditor'
import DatePicker from '../DatePicker/DatePicker'
import ChatPage from '../Chat/ChatPage'
import WeightChart from '../Profile/WeightChart'
import { useClientTasks } from '../../hooks/useTasks'
import ReadinessWidget from '../ReadinessWidget/ReadinessWidget'
import ClientReminderSettings from './ClientReminderSettings'
import SessionHistory from '../Training/SessionHistory'
import ExerciseStats from '../Training/ExerciseStats'
import { useTrainingHistory } from '../../hooks/useTrainingHistory'
import { MEALS, MEAL_LABEL_KEY, defaultMeal } from '../FoodLogger/meals'
import styles from './ClientDetail.module.css'

const TABS = [
  { id: 'progress',   labelKey: 'cd.tab.progress' },
  { id: 'chat',       labelKey: 'cd.tab.chat' },
  { id: 'checkin',    label: 'CHECK-IN' },
  { id: 'sessions',   labelKey: 'cd.tab.sessions' },
  { id: 'nutrition',  labelKey: 'cd.tab.nutrition' },
  { id: 'lifts',      labelKey: 'cd.tab.lifts' },
  { id: 'plan',       labelKey: 'cd.tab.plan' },
  { id: 'goals',      labelKey: 'cd.tab.goals' },
  { id: 'notes',      labelKey: 'cd.tab.notes' },
  { id: 'tasks',      labelKey: 'cd.tab.tasks' },
  { id: 'reminders',  labelKey: 'cd.tab.reminders' },
]

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

export default function ClientDetail({ client: initialClient, onBack, onDelete }) {
  const { updateClientProfile, deleteClientProfile, fetchClientFullStats } = useAuth()
  const { t } = useSettings()
  const [client, setClient] = useState(initialClient)
  const [tab, setTab] = useState('progress')
  const [stats, setStats] = useState(null)
  const [macros, setMacros] = useState({
    calories: initialClient.calories ?? '',
    protein:  initialClient.protein  ?? '',
    carbs:    initialClient.carbs    ?? '',
    fat:      initialClient.fat      ?? '',
  })
  const [macroSaving, setMacroSaving] = useState(false)
  const [macroSaved,  setMacroSaved]  = useState(false)
  const [edits, setEdits] = useState({
    name:               initialClient.name               ?? '',
    target_weight:      initialClient.target_weight      ?? '',
    habits:             initialClient.habits             ?? null,
    eat_back_calories:  initialClient.eat_back_calories  ?? false,
  })
  const [notes, setNotes] = useState(initialClient.coach_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    fetchClientFullStats(client.id).then(setStats)
  }, [client.id])

  async function saveMacros() {
    setMacroSaving(true)
    const updates = {
      calories: parseInt(macros.calories) || null,
      protein:  parseInt(macros.protein)  || null,
      carbs:    parseInt(macros.carbs)    || null,
      fat:      parseInt(macros.fat)      || null,
    }
    await updateClientProfile(client.id, updates)
    setClient(prev => ({ ...prev, ...updates }))
    setMacroSaving(false)
    setMacroSaved(true)
    setTimeout(() => setMacroSaved(false), 2000)
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await deleteClientProfile(client.id)
    if (!error) {
      onDelete(client.id)
    } else {
      const msg = error?.message || error?.context?.responseText || JSON.stringify(error)
      setDeleteError(t('cd.error', { msg }))
      setDeleting(false)
    }
  }

  async function saveGoals() {
    setSaving(true)
    const updates = {
      name:               edits.name,
      target_weight:      parseFloat(edits.target_weight) || null,
      habits:             edits.habits,
      eat_back_calories:  edits.eat_back_calories,
    }
    await updateClientProfile(client.id, updates)
    setClient(prev => ({ ...prev, ...updates }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveNotes() {
    setSaving(true)
    await updateClientProfile(client.id, { coach_notes: notes })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function savePlan(days) {
    setSavingPlan(true)
    await updateClientProfile(client.id, { training_plan: days })
    setClient(prev => ({ ...prev, training_plan: days }))
    setSavingPlan(false)
  }

  return (
    <div className={`${styles.page} ${tab === 'chat' ? styles.pageChat : ''}`}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">
          {t('cd.backToClients')}
        </button>
        <span className={styles.clientName}>{client.name || client.email}</span>
        <button
          className={`${styles.deleteBtn} ${confirmDelete ? styles.deleteBtnActive : ''}`}
          onClick={() => setConfirmDelete(v => !v)}
          type="button"
          aria-label={t('cd.deleteProfile')}
        >
          <TrashIcon />
        </button>
      </header>

      {confirmDelete && (
        <div className={styles.deleteConfirm}>
          <p className={styles.deleteConfirmText}>
            {t('cd.deleteConfirm', { name: client.name || client.email })}
          </p>
          {deleteError && (
            <p className={styles.deleteErrorText}>{deleteError}</p>
          )}
          <div className={styles.deleteConfirmActions}>
            <button className={styles.deleteCancelBtn} onClick={() => { setConfirmDelete(false); setDeleteError(null) }} type="button">
              {t('cd.cancel')}
            </button>
            <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting} type="button">
              {deleting ? t('cd.deleting') : t('cd.confirmDelete')}
            </button>
          </div>
        </div>
      )}

      {/* Macro targets — always visible above tabs */}
      <div className={styles.macroBar}>
        <div className={styles.macroBarFields}>
          {[
            { key: 'calories', label: t('cd.kcal') },
            { key: 'protein',  label: t('cd.proteinG') },
            { key: 'carbs',    label: t('cd.carbsG') },
            { key: 'fat',      label: t('cd.fatG') },
          ].map(({ key, label }) => (
            <div key={key} className={styles.macroField}>
              <label className={styles.macroLabel}>{label}</label>
              <input
                className={styles.macroInput}
                type="number"
                min="0"
                value={macros[key]}
                onChange={e => setMacros(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <button
          className={`${styles.macroSaveBtn} ${macroSaved ? styles.macroSaveBtnDone : ''}`}
          onClick={saveMacros}
          disabled={macroSaving}
          type="button"
        >
          {macroSaving ? '...' : macroSaved ? '✓' : t('cd.save')}
        </button>
      </div>

      <div className={styles.tabBar}>
        {TABS.map(item => (
          <button
            key={item.id}
            className={`${styles.tab} ${tab === item.id ? styles.tabActive : ''}`}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <div className={tab === 'chat' ? styles.bodyChat : styles.body}>
        {tab === 'progress' && <ProgressTab stats={stats} client={client} />}
        {tab === 'chat'      && <ChatPage clientId={client.id} clientName={client.name || client.email} clientAvatarUrl={client.avatar_url} embedded />}
        {tab === 'checkin'   && <CheckinTab clientId={client.id} />}
        {tab === 'sessions'  && <SessionsTab clientId={client.id} client={client} />}
        {tab === 'nutrition' && <NutritionTab client={client} />}
        {tab === 'lifts' && <LiftsTab clientId={client.id} />}
        {tab === 'plan' && (
          <TrainingEditor
            initialPlan={client.training_plan}
            onSave={savePlan}
            saving={savingPlan}
          />
        )}
        {tab === 'goals' && (
          <GoalsTab
            client={client}
            edits={edits}
            setEdits={setEdits}
            onSave={saveGoals}
            saving={saving}
            saved={saved}
          />
        )}
        {tab === 'notes' && (
          <NotesTab
            notes={notes}
            setNotes={setNotes}
            onSave={saveNotes}
            saving={saving}
            saved={saved}
          />
        )}
        {tab === 'tasks' && <ClientTasksTab clientId={client.id} />}
        {tab === 'reminders' && (
          <ClientReminderSettings clientId={client.id} clientName={client.name || client.email} />
        )}
      </div>
    </div>
  )
}

// ─── Progress Tab ────────────────────────────────────────────────────────────

function ProgressTab({ stats, client }) {
  const { t } = useSettings()
  if (!stats) {
    return <p className={styles.loading}>{t('cd.loading')}</p>
  }

  const { foodByDay, habitsByDay, weights } = stats
  const totalHabits = HABITS.length

  const days = []
  for (let i = 6; i >= 0; i--) {
    const d       = new Date(Date.now() - i * 86400000)
    const dateStr = d.toISOString().slice(0, 10)
    days.push({
      date:    dateStr,
      dayName: d.toLocaleDateString('bg-BG', { weekday: 'short' }),
      kcal:    foodByDay[dateStr]            || 0,
      habits:  habitsByDay[dateStr]?.completed || 0,
    })
  }

  const targetKcal = client.calories || 0
  const maxKcal    = Math.max(...days.map(d => d.kcal), targetKcal)

  return (
    <div className={styles.progressTab}>
      {/* Client readiness */}
      <section className={styles.chartSection}>
        <h3 className={styles.chartTitle}>{t('cd.readinessToday')}</h3>
        {/* The coach came here to look, so the coach gets the breakdown. */}
        <ReadinessWidget detailed client={{ id: client.id, calories: client.calories, protein: client.protein }} />
      </section>

      {/* Kcal bars */}
      <section className={styles.chartSection}>
        <h3 className={styles.chartTitle}>{t('cd.kcal7')}</h3>
        <div className={styles.barChart}>
          {days.map(d => (
            <div key={d.date} className={styles.barCol}>
              <div className={styles.barWrap}>
                <div
                  className={styles.bar}
                  style={{ height: d.kcal > 0 ? `${Math.min(100, (d.kcal / maxKcal) * 100)}%` : '2px' }}
                  data-empty={d.kcal === 0}
                />
                <div
                  className={styles.targetLine}
                  style={{ bottom: `${(targetKcal / maxKcal) * 100}%` }}
                />
              </div>
              <span className={styles.barDay}>{d.dayName}</span>
              <span className={styles.barVal}>{d.kcal > 0 ? d.kcal : '—'}</span>
            </div>
          ))}
        </div>
        <p className={styles.chartNote}>{t('cd.kcalGoalNote', { n: targetKcal })}</p>
      </section>

      {/* Habit completion */}
      <section className={styles.chartSection}>
        <h3 className={styles.chartTitle}>{t('cd.habits7')}</h3>
        <div className={styles.habitRows}>
          {days.map(d => {
            const pct = totalHabits > 0 ? (d.habits / totalHabits) * 100 : 0
            return (
              <div key={d.date} className={styles.habitRow}>
                <span className={styles.habitDay}>{d.dayName}</span>
                <div className={styles.habitBarWrap}>
                  <div className={styles.habitBar} style={{ width: `${pct}%` }} />
                </div>
                <span className={styles.habitCount}>{d.habits}/{totalHabits}</span>
              </div>
            )
          })}
        </div>
      </section>

      {weights.length > 0 && (
        <section className={styles.chartSection}>
          <h3 className={styles.chartTitle}>{t('cd.weight')}</h3>
          <WeightChart
            weights={weights}
            targetWeight={client.target_weight ? parseFloat(client.target_weight) : null}
            gradId="wcClient"
          />
        </section>
      )}
    </div>
  )
}

// ─── Goals Tab ───────────────────────────────────────────────────────────────

function GoalsTab({ client, edits, setEdits, onSave, saving, saved }) {
  const { t } = useSettings()
  function set(field, value) {
    setEdits(prev => ({ ...prev, [field]: value }))
  }

  const hasIntake = client.phone || client.age || client.intake_training_days || client.intake_call_time || client.intake_goal || client.intake_notes

  return (
    <div className={styles.goalsTab}>
      {hasIntake && (
        <div className={styles.intakeSection}>
          <p className={styles.intakeSectionTitle}>{t('cd.intakeTitle')}</p>
          {(client.phone || client.age || client.intake_training_days || client.intake_call_time) && (
            <div className={styles.intakeRow}>
              {client.phone && (
                <a href={`tel:${client.phone}`} className={styles.intakePhone}>
                  📞 {client.phone}
                </a>
              )}
              {client.intake_call_time && (
                <span className={styles.intakeAge}>{t('cd.callTime', { time: client.intake_call_time })}</span>
              )}
              {client.age && (
                <span className={styles.intakeAge}>{t('cd.age', { n: client.age })}</span>
              )}
              {client.intake_training_days && (
                <span className={styles.intakeAge}>{t('cd.trainingDays', { n: client.intake_training_days })}</span>
              )}
            </div>
          )}
          {client.intake_goal && (
            <div className={styles.intakeBlock}>
              <span className={styles.intakeKey}>{t('cd.goal')}</span>
              <p className={styles.intakeValue}>{client.intake_goal}</p>
            </div>
          )}
          {client.intake_notes && (
            <div className={styles.intakeBlock}>
              <span className={styles.intakeKey}>{t('cd.healthNotes')}</span>
              <p className={styles.intakeValue}>{client.intake_notes}</p>
            </div>
          )}
        </div>
      )}

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>{t('cd.name')}</label>
        <input
          className={styles.fieldInput}
          type="text"
          value={edits.name}
          onChange={e => set('name', e.target.value)}
          placeholder={t('cd.namePh')}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>{t('cd.targetWeight')}</label>
        <div className={styles.inputWrap}>
          <input
            className={styles.fieldInput}
            type="number"
            min="0"
            value={edits.target_weight}
            onChange={e => set('target_weight', e.target.value)}
            placeholder="—"
          />
          <span className={styles.unit}>kg</span>
        </div>
      </div>

      <HabitsEditor
        habits={edits.habits}
        onChange={h => setEdits(prev => ({ ...prev, habits: h }))}
      />

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>{t('cd.calorieBalance')}</label>
        <button
          type="button"
          className={`${styles.toggleSwitch} ${edits.eat_back_calories ? styles.toggleSwitchOn : ''}`}
          onClick={() => set('eat_back_calories', !edits.eat_back_calories)}
        >
          <span className={styles.toggleSwitchKnob} />
          <span className={styles.toggleSwitchLabel}>
            {edits.eat_back_calories ? t('cd.eatBackOn') : t('cd.eatBackOff')}
          </span>
        </button>
      </div>

      <button
        className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
        onClick={onSave}
        disabled={saving}
        type="button"
      >
        {saving ? '...' : saved ? t('cd.saved') : t('cd.save')}
      </button>
    </div>
  )
}

function HabitsEditor({ habits, onChange }) {
  const { t } = useSettings()
  const list = habits ?? DEFAULT_HABITS
  const [newEmoji, setNewEmoji] = useState('')
  const [newLabel, setNewLabel] = useState('')

  function update(idx, field, value) {
    const next = list.map((h, i) => i === idx ? { ...h, [field]: value } : h)
    onChange(next)
  }

  function remove(idx) {
    onChange(list.filter((_, i) => i !== idx))
  }

  function add() {
    if (!newLabel.trim()) return
    const id = newLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now()
    onChange([...list, { id, emoji: newEmoji || '•', label: newLabel.trim() }])
    setNewEmoji('')
    setNewLabel('')
  }

  function resetToDefaults() {
    onChange(null)
  }

  return (
    <div className={styles.habitsEditorSection}>
      <div className={styles.habitsEditorHeader}>
        <span className={styles.fieldLabel}>{t('cd.habits')}</span>
        {habits !== null && (
          <button className={styles.habitsResetBtn} onClick={resetToDefaults} type="button">
            {t('cd.standard')}
          </button>
        )}
      </div>
      <div className={styles.habitsList}>
        {list.map((h, i) => (
          <div key={h.id} className={styles.habitRow}>
            <input
              className={styles.habitEmojiInput}
              value={h.emoji}
              onChange={e => update(i, 'emoji', e.target.value)}
              maxLength={2}
            />
            <input
              className={styles.habitLabelInput}
              value={h.label}
              onChange={e => update(i, 'label', e.target.value)}
            />
            <button className={styles.habitRemoveBtn} onClick={() => remove(i)} type="button">✕</button>
          </div>
        ))}
      </div>
      <div className={styles.habitAddRow}>
        <input
          className={styles.habitEmojiInput}
          value={newEmoji}
          onChange={e => setNewEmoji(e.target.value)}
          placeholder="🔥"
          maxLength={2}
        />
        <input
          className={styles.habitLabelInput}
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder={t('cd.newHabitPh')}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className={styles.habitAddBtn} onClick={add} type="button">+</button>
      </div>
    </div>
  )
}

// ─── Nutrition Tab ───────────────────────────────────────────────────────

function NutritionTab({ client }) {
  const { t } = useSettings()
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft]       = useState({})
  const [showAdd, setShowAdd]   = useState(false)
  const [newEntry, setNewEntry] = useState({ name: '', grams: '', kcal: '', protein: '', carbs: '', fat: '' })
  const [addMeal, setAddMeal]   = useState(defaultMeal())  // meal the coach files a manual add under
  const [adding, setAdding]     = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [mealPhotos, setMealPhotos] = useState([])

  // Fetch recent meal photos (last 30 days) once on mount
  useEffect(() => {
    const since = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
    supabase.from('food_logs')
      .select('id, name, date, photo_url')
      .eq('user_id', client.id)
      .gte('date', since)
      .not('photo_url', 'is', null)
      .order('date', { ascending: false })
      .then(({ data }) => setMealPhotos(data || []))
  }, [client.id])

  useEffect(() => {
    setLoading(true)
    supabase.from('food_logs').select('*')
      .eq('user_id', client.id).eq('date', selectedDate).order('added_at')
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [client.id, selectedDate])

  function startEdit(entry) {
    setEditingId(entry.id)
    setDraft({
      name:    entry.name,
      grams:   String(entry.grams || 0),
      kcal:    String(entry.kcal),
      protein: String(entry.protein),
      carbs:   String(entry.carbs),
      fat:     String(entry.fat),
    })
  }

  function handleDraftGramsChange(entry, val) {
    const g = parseFloat(val)
    if (g > 0 && entry.grams > 0) {
      const ratio = g / entry.grams
      setDraft(prev => ({
        ...prev,
        grams:   val,
        kcal:    String(Math.round(entry.kcal    * ratio)),
        protein: String(Math.round(entry.protein * ratio * 10) / 10),
        carbs:   String(Math.round(entry.carbs   * ratio * 10) / 10),
        fat:     String(Math.round(entry.fat     * ratio * 10) / 10),
      }))
    } else {
      setDraft(prev => ({ ...prev, grams: val }))
    }
  }

  async function saveEdit(id) {
    const updates = {
      name:    draft.name.trim(),
      grams:   parseFloat(draft.grams)              || 0,
      kcal:    Math.round(parseFloat(draft.kcal)     || 0),
      protein: Math.round((parseFloat(draft.protein) || 0) * 10) / 10,
      carbs:   Math.round((parseFloat(draft.carbs)   || 0) * 10) / 10,
      fat:     Math.round((parseFloat(draft.fat)     || 0) * 10) / 10,
    }
    await supabase.from('food_logs').update(updates).eq('id', id)
    setLogs(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    setEditingId(null)
  }

  async function deleteEntry(id) {
    await supabase.from('food_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(e => e.id !== id))
  }

  async function handleAdd() {
    if (!newEntry.name.trim() || !newEntry.kcal) return
    setAdding(true)
    const entry = {
      user_id: client.id,
      date:    selectedDate,
      name:    newEntry.name.trim(),
      grams:   parseFloat(newEntry.grams)              || 0,
      kcal:    Math.round(parseFloat(newEntry.kcal)     || 0),
      protein: Math.round((parseFloat(newEntry.protein) || 0) * 10) / 10,
      carbs:   Math.round((parseFloat(newEntry.carbs)   || 0) * 10) / 10,
      fat:     Math.round((parseFloat(newEntry.fat)     || 0) * 10) / 10,
      meal_type: addMeal,
    }
    const { data } = await supabase.from('food_logs').insert(entry).select().single()
    if (data) {
      setLogs(prev => [...prev, data])
      setNewEntry({ name: '', grams: '', kcal: '', protein: '', carbs: '', fat: '' })
      setShowAdd(false)
    }
    setAdding(false)
  }

  const totals = logs.reduce((acc, e) => ({
    kcal:    Math.round(acc.kcal    + (e.kcal    || 0)),
    protein: Math.round((acc.protein + (e.protein || 0)) * 10) / 10,
    carbs:   Math.round((acc.carbs   + (e.carbs   || 0)) * 10) / 10,
    fat:     Math.round((acc.fat     + (e.fat     || 0)) * 10) / 10,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  const targetKcal = client.calories || 0

  // One log row in either shape — pulled out so the coach's day can be drawn as
  // meal sections, the same split the client sees.
  function renderLogEntry(entry) {
    return editingId === entry.id ? (
      <div key={entry.id} className={`${styles.logEntry} ${styles.logEntryEditing}`}>
        <input
          className={styles.logEditName}
          type="text"
          value={draft.name}
          onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
        />
        <div className={styles.logEditGrid}>
          <div className={styles.logEditField}>
            <label className={styles.logEditLabel}>{t('cd.grams')}</label>
            <input className={styles.logEditInput} type="number" min="0"
              value={draft.grams}
              onChange={e => handleDraftGramsChange(entry, e.target.value)}
            />
          </div>
          {[
            { key: 'kcal',    label: t('cd.kcalTitle') },
            { key: 'protein', label: t('cd.proteinLower') },
            { key: 'carbs',   label: t('cd.carbsLower') },
            { key: 'fat',     label: t('cd.fatLower') },
          ].map(({ key, label }) => (
            <div key={key} className={styles.logEditField}>
              <label className={styles.logEditLabel}>{label}</label>
              <input className={styles.logEditInput} type="number" min="0"
                value={draft[key]}
                onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className={styles.logEditActions}>
          <button className={styles.logEditCancel} onClick={() => setEditingId(null)} type="button">{t('cd.cancel')}</button>
          <button className={styles.logEditSave} onClick={() => saveEdit(entry.id)} type="button">{t('cd.save')}</button>
        </div>
      </div>
    ) : (
      <div key={entry.id} className={styles.logEntry}>
        {entry.photo_url && (
          <button
            type="button"
            className={styles.logThumbBtn}
            onClick={() => setLightboxUrl(entry.photo_url)}
            aria-label={t('cd.viewMealPhoto')}
          >
            <img src={entry.photo_url} className={styles.logThumbImg} alt="" />
          </button>
        )}
        <div className={styles.logLeft}>
          <span className={styles.logName}>{entry.name}</span>
          <span className={styles.logMacros}>
            {entry.grams > 0 && <><span className={styles.logGrams}>{entry.grams}g</span> · </>}
            {t('cd.rowMacros', { kcal: entry.kcal, p: Math.round(entry.protein * 10) / 10, c: Math.round(entry.carbs * 10) / 10, f: Math.round(entry.fat * 10) / 10 })}
          </span>
        </div>
        <div className={styles.logEntryActions}>
          <button className={styles.logEditBtn} onClick={() => startEdit(entry)} type="button" aria-label={t('cd.edit')}>✎</button>
          <button className={styles.logDeleteBtn} onClick={() => deleteEntry(entry.id)} type="button" aria-label={t('cd.delete')}>×</button>
        </div>
      </div>
    )
  }

  // The client's day split into its meals, in order; anything without one falls
  // to "Друго" so no row is lost. Empty meals draw nothing.
  const logGroups = MEALS.map(m => ({
    id: m.id,
    label: t(m.labelKey),
    items: logs.filter(e => e.meal_type === m.id),
  }))
  const otherLogs = logs.filter(e => !MEAL_LABEL_KEY[e.meal_type])
  if (otherLogs.length) logGroups.push({ id: '_other', label: t('meal.other'), items: otherLogs })
  const shownLogGroups = logGroups.filter(g => g.items.length > 0)

  return (
    <div className={styles.nutritionTab}>
      {mealPhotos.length > 0 && (
        <div className={styles.mealPhotoStrip}>
          <span className={styles.mealPhotoStripLabel}>{t('cd.mealPhotos', { n: mealPhotos.length })}</span>
          <div className={styles.mealPhotoScroll}>
            {mealPhotos.map(p => (
              <button
                key={p.id}
                type="button"
                className={styles.mealPhotoItem}
                onClick={() => { setLightboxUrl(p.photo_url); setSelectedDate(p.date) }}
              >
                <img src={p.photo_url} className={styles.mealPhotoImg} alt={p.name} />
                <span className={styles.mealPhotoDate}>{p.date.slice(5)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />

      {showAdd ? (
        <div className={styles.addFoodForm}>
          <input
            className={styles.addFoodName}
            type="text"
            placeholder={t('cd.foodNamePh')}
            value={newEntry.name}
            onChange={e => setNewEntry(prev => ({ ...prev, name: e.target.value }))}
          />
          <div className={styles.addMealTabs}>
            {MEALS.map(m => (
              <button
                key={m.id}
                type="button"
                className={`${styles.addMealTab} ${addMeal === m.id ? styles.addMealTabActive : ''}`}
                onClick={() => setAddMeal(m.id)}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>
          <div className={styles.addFoodGrid}>
            {[
              { key: 'kcal',    label: t('cd.kcalReq') },
              { key: 'protein', label: t('cd.proteinLower') },
              { key: 'carbs',   label: t('cd.carbsLower') },
              { key: 'fat',     label: t('cd.fatLower') },
              { key: 'grams',   label: t('cd.gramsG') },
            ].map(({ key, label }) => (
              <div key={key} className={styles.addFoodField}>
                <label className={styles.addFoodLabel}>{label}</label>
                <input
                  className={styles.addFoodInput}
                  type="number" min="0" step="0.1" placeholder="0"
                  value={newEntry[key]}
                  onChange={e => setNewEntry(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className={styles.addFoodActions}>
            <button className={styles.addFoodCancel} onClick={() => setShowAdd(false)} type="button">{t('cd.cancel')}</button>
            <button
              className={styles.addFoodSubmit}
              onClick={handleAdd}
              disabled={adding || !newEntry.name.trim() || !newEntry.kcal}
              type="button"
            >
              {adding ? t('cd.adding') : t('cd.add')}
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.addFoodBtn} onClick={() => setShowAdd(true)} type="button">
          {t('cd.addFoodManual')}
        </button>
      )}

      {logs.length > 0 && (
        <div className={styles.dayTotal}>
          {t('cd.dayTotals', { kcal: totals.kcal, target: targetKcal, p: totals.protein, c: totals.carbs, f: totals.fat })}
        </div>
      )}

      {loading ? (
        <p className={styles.loading}>{t('cd.loading')}</p>
      ) : logs.length === 0 ? (
        <p className={styles.empty}>{t('cd.noFood')}</p>
      ) : (
        shownLogGroups.map(group => {
          const kcal = Math.round(group.items.reduce((s, e) => s + (e.kcal || 0), 0))
          return (
            <section key={group.id} className={styles.mealGroup}>
              <div className={styles.mealHead}>
                <span className={styles.mealName}>{group.label}</span>
                <span className={styles.mealKcal}>{t('cd.mealKcal', { n: kcal })}</span>
              </div>
              <div className={styles.logList}>
                {group.items.map(renderLogEntry)}
              </div>
            </section>
          )
        })
      )}

      {/* Meal photo lightbox */}
      {lightboxUrl && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'zoom-out' }}
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt={t('cd.dishAlt')} style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: '12px', objectFit: 'contain' }} />
          <button type="button" onClick={() => setLightboxUrl(null)} aria-label={t('cd.close')} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', color: '#fff', fontSize: 20, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}
    </div>
  )
}

// ─── Lifts Tab ───────────────────────────────────────────────────────────

function LiftsTab({ clientId }) {
  const { t } = useSettings()
  const { addExerciseLogForClient, updateExerciseLog, removeExerciseLog } = useAuth()
  const [subTab,       setSubTab]       = useState('log')
  // The client's own session view, read-only. A coach opening a client before a
  // call wants what the client sees — the session as it was performed, and one
  // lift's whole arc — not a date picker and a list of loose rows to reassemble
  // in their head.
  const { sessions: clientSessions } = useTrainingHistory(clientId)
  const [statsEx,      setStatsEx]      = useState(null)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [logs,         setLogs]         = useState([])
  const [loading,      setLoading]      = useState(false)
  const [showAdd,      setShowAdd]      = useState(false)
  const [newEntry,     setNewEntry]     = useState({ name: '', weight: '', reps: '', sets: '', notes: '' })
  const [adding,       setAdding]       = useState(false)
  const [editingId,    setEditingId]    = useState(null)
  const [draft,        setDraft]        = useState({})
  // progression
  const [allLogs,      setAllLogs]      = useState(null)
  const [selectedEx,   setSelectedEx]   = useState(null)

  // Fetch diary logs for selected date
  useEffect(() => {
    if (subTab !== 'log') return
    setLoading(true)
    supabase.from('exercise_logs').select('*')
      .eq('user_id', clientId).eq('date', selectedDate).order('created_at')
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [clientId, selectedDate, subTab])

  // Fetch all logs for progression (lazy, cached until invalidated)
  useEffect(() => {
    if (subTab !== 'progression') return
    if (allLogs !== null) return
    supabase.from('exercise_logs')
      .select('id, exercise_name, date, weight, reps, sets, notes, set_index, replaces')
      .eq('user_id', clientId)
      .order('date', { ascending: true })
      .then(({ data }) => {
        const d = data || []
        setAllLogs(d)
        if (d.length > 0 && !selectedEx) {
          const names = [...new Set(d.map(r => r.exercise_name))].sort()
          setSelectedEx(names[0])
        }
      })
  }, [subTab, clientId, allLogs, selectedEx])

  function invalidateAll() {
    setAllLogs(null)
  }

  // Progression: inline edit/delete without full re-fetch
  async function handleProgDelete(logId) {
    await removeExerciseLog(logId)
    setAllLogs(prev => prev ? prev.filter(l => l.id !== logId) : null)
  }

  async function handleProgUpdate(logId, updates) {
    const { data } = await updateExerciseLog(logId, updates)
    if (data) {
      setAllLogs(prev => prev ? prev.map(l => l.id === logId ? { ...l, ...updates } : l) : null)
    }
  }

  async function handleAdd() {
    if (!newEntry.name.trim()) return
    setAdding(true)
    const { data } = await addExerciseLogForClient(
      clientId, newEntry.name.trim(),
      newEntry.weight, newEntry.reps, newEntry.sets, newEntry.notes,
      selectedDate
    )
    if (data) {
      setLogs(prev => [...prev, data])
      setNewEntry({ name: '', weight: '', reps: '', sets: '', notes: '' })
      setShowAdd(false)
      invalidateAll()
    }
    setAdding(false)
  }

  function startEdit(log) {
    setEditingId(log.id)
    setDraft({
      name:   log.exercise_name,
      weight: String(log.weight ?? ''),
      reps:   String(log.reps   ?? ''),
      sets:   String(log.sets   ?? ''),
      notes:  log.notes ?? '',
    })
  }

  async function saveEdit(id) {
    const updates = {
      exercise_name: draft.name.trim(),
      weight: draft.weight ? parseFloat(draft.weight) : null,
      reps:   draft.reps   ? parseInt(draft.reps)     : null,
      sets:   draft.sets   ? parseInt(draft.sets)     : null,
      notes:  draft.notes.trim() || null,
    }
    const { data } = await updateExerciseLog(id, updates)
    if (data) {
      setLogs(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
      invalidateAll()
    }
    setEditingId(null)
  }

  async function handleDelete(id) {
    await removeExerciseLog(id)
    setLogs(prev => prev.filter(l => l.id !== id))
    invalidateAll()
  }

  const exNames   = allLogs ? [...new Set(allLogs.map(r => r.exercise_name))].sort() : []
  const exHistory = selectedEx && allLogs ? allLogs.filter(r => r.exercise_name === selectedEx) : []

  return (
    <div className={styles.liftsTab}>

      {/* Sub-tab toggle */}
      <div className={styles.liftsSubTabs}>
        <button
          className={`${styles.liftsSubTab} ${subTab === 'log' ? styles.liftsSubTabActive : ''}`}
          onClick={() => setSubTab('log')} type="button"
        >{t('cd.liftLog')}</button>
        <button
          className={`${styles.liftsSubTab} ${subTab === 'progression' ? styles.liftsSubTabActive : ''}`}
          onClick={() => setSubTab('progression')} type="button"
        >{t('cd.liftProgression')}</button>
        <button
          className={`${styles.liftsSubTab} ${subTab === 'sessions' ? styles.liftsSubTabActive : ''}`}
          onClick={() => { setSubTab('sessions'); setStatsEx(null) }} type="button"
        >{t('cd.liftSessions')}</button>
      </div>

      {/* ── SESSIONS view — the same screens the client has ── */}
      {subTab === 'sessions' && (
        statsEx ? (
          <ExerciseStats name={statsEx} sessions={clientSessions} onBack={() => setStatsEx(null)} />
        ) : (
          <SessionHistory
            sessions={clientSessions}
            onOpenExercise={setStatsEx}
            /* Editing lives in ДНЕВНИК, where the coach already has add, edit
               and delete on every row. Two ways to change the same number is
               how they end up disagreeing. */
            onEditDay={date => { setSelectedDate(date); setSubTab('log') }}
          />
        )
      )}

      {/* ── DIARY view ── */}
      {subTab === 'log' && (
        <>
          <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />

          {showAdd ? (
            <div className={styles.addFoodForm}>
              <input
                className={styles.addFoodName}
                type="text"
                placeholder={t('cd.exercisePh')}
                autoFocus
                value={newEntry.name}
                onChange={e => setNewEntry(p => ({ ...p, name: e.target.value }))}
              />
              <div className={styles.liftAddGrid}>
                {[
                  { key: 'weight', label: t('cd.kg'),   step: '0.5' },
                  { key: 'reps',   label: t('cd.reps'), step: '1'   },
                  { key: 'sets',   label: t('cd.sets'), step: '1'   },
                ].map(({ key, label, step }) => (
                  <div key={key} className={styles.addFoodField}>
                    <label className={styles.addFoodLabel}>{label}</label>
                    <input
                      className={styles.addFoodInput}
                      type="number" min="0" step={step} placeholder="—"
                      value={newEntry[key]}
                      onChange={e => setNewEntry(p => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <input
                className={styles.addFoodName}
                type="text"
                placeholder={t('cd.notesOptPh')}
                value={newEntry.notes}
                onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))}
              />
              <div className={styles.addFoodActions}>
                <button className={styles.addFoodCancel} onClick={() => setShowAdd(false)} type="button">{t('cd.cancel')}</button>
                <button
                  className={styles.addFoodSubmit}
                  onClick={handleAdd}
                  disabled={adding || !newEntry.name.trim()}
                  type="button"
                >
                  {adding ? t('cd.adding') : t('cd.add')}
                </button>
              </div>
            </div>
          ) : (
            <button className={styles.addFoodBtn} onClick={() => setShowAdd(true)} type="button">
              {t('cd.addExercise')}
            </button>
          )}

          {loading ? (
            <p className={styles.loading}>{t('cd.loading')}</p>
          ) : logs.length === 0 ? (
            <p className={styles.empty}>{t('cd.noLifts')}</p>
          ) : (
            <div className={styles.liftList}>
              {logs.map(log =>
                editingId === log.id ? (
                  <div key={log.id} className={`${styles.logEntry} ${styles.logEntryEditing}`}>
                    <input
                      className={styles.logEditName}
                      type="text"
                      value={draft.name}
                      onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
                    />
                    <div className={styles.liftEditGrid}>
                      {[
                        { key: 'weight', label: t('cd.kg'),   step: '0.5' },
                        { key: 'reps',   label: t('cd.reps'), step: '1'   },
                        { key: 'sets',   label: t('cd.sets'), step: '1'   },
                      ].map(({ key, label, step }) => (
                        <div key={key} className={styles.logEditField}>
                          <label className={styles.logEditLabel}>{label}</label>
                          <input className={styles.logEditInput}
                            type="number" min="0" step={step}
                            value={draft[key]}
                            onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                    <input
                      className={`${styles.logEditInput} ${styles.liftNotesInput}`}
                      type="text" placeholder={t('cd.notesPh')}
                      value={draft.notes}
                      onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))}
                    />
                    <div className={styles.logEditActions}>
                      <button className={styles.logEditCancel} onClick={() => setEditingId(null)} type="button">{t('cd.cancel')}</button>
                      <button className={styles.logEditSave} onClick={() => saveEdit(log.id)} type="button">{t('cd.save')}</button>
                    </div>
                  </div>
                ) : (
                  <div key={log.id} className={`${styles.liftEntry} ${styles.liftEntryRow}`}>
                    <div className={styles.liftInfo}>
                      <span className={styles.liftName}>{log.exercise_name}</span>
                      <span className={styles.liftStats}>
                        {log.weight != null && <span className={styles.liftKg}>{t('cd.kgUnit', { n: log.weight })}</span>}
                        {log.reps && <span>{log.sets || 1} × {log.reps}</span>}
                        {log.notes && <span className={styles.liftNoteInline}>{log.notes}</span>}
                      </span>
                    </div>
                    <div className={styles.logEntryActions}>
                      <button className={styles.logEditBtn} onClick={() => startEdit(log)} type="button" aria-label={t('cd.edit')}>✎</button>
                      <button className={styles.logDeleteBtn} onClick={() => handleDelete(log.id)} type="button" aria-label={t('cd.delete')}>×</button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}

      {/* ── PROGRESSION view ── */}
      {subTab === 'progression' && (
        <div className={styles.progressionWrap}>
          {allLogs === null ? (
            <p className={styles.loading}>{t('cd.loading')}</p>
          ) : exNames.length === 0 ? (
            <p className={styles.empty}>{t('cd.noLiftsAny')}</p>
          ) : (
            <>
              <div className={styles.exPicker}>
                {exNames.map(name => (
                  <button
                    key={name}
                    className={`${styles.exPickerChip} ${selectedEx === name ? styles.exPickerChipActive : ''}`}
                    onClick={() => setSelectedEx(name)}
                    type="button"
                  >
                    {name}
                  </button>
                ))}
              </div>

              {selectedEx && exHistory.length > 0 && (
                <div className={styles.exHistoryWrap}>
                  {exHistory.filter(r => r.weight != null).length > 1 && (
                    <LiftProgressChart data={exHistory} />
                  )}
                  <ProgHistoryTable
                    rows={[...exHistory].reverse()}
                    onDelete={handleProgDelete}
                    onUpdate={handleProgUpdate}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * One entry per session, not per set.
 *
 * A workout used to be a single row carrying "sets: 4". Since one row per set
 * it is four rows, so the table listed the same date four times and the chart
 * drew four points inside one day — 80×10, 9, 7, 6 came out as a descent, as
 * though the client had weakened over the course of an hour. The more sets
 * someone logs, the worse it reads.
 */
function toSessions(rows) {
  const byDate = {}
  for (const r of rows) (byDate[r.date] ??= []).push(r)

  return Object.entries(byDate)
    .map(([date, sets]) => {
      const ordered = [...sets].sort((a, b) => (a.set_index ?? 0) - (b.set_index ?? 0))
      const withWeight = ordered.filter(r => r.weight != null)
      // Judged on the best set by what it was worth, so a heavier set for fewer
      // reps does not read as a better day than a lighter one for many more.
      const top = withWeight.reduce(
        (best, r) => (!best || e1RM(r) > e1RM(best) ? r : best), null)
      return {
        date,
        sets: ordered,
        top,
        // Legacy rows are a whole exercise carrying its own count; rows since
        // are one set each. Counting the column is right for both.
        setCount: ordered.reduce((n, r) => n + (r.sets || 1), 0),
        // What this stood in for, if the client swapped a machine that day —
        // otherwise a substitute shows up as an unexplained new exercise.
        replaces: ordered.find(r => r.replaces)?.replaces ?? null,
        volume: ordered.reduce((v, r) => v + (r.weight || 0) * (r.reps || 0) * (r.sets || 1), 0),
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Epley: folds weight and reps into one comparable number. */
function e1RM(r) {
  if (!r?.weight) return 0
  return r.weight * (1 + (r.reps || 1) / 30)
}

/** "4 × 10, 9, 7, 6" when the sets differ, "4 × 8" when they do not. */
function setsLabel(s) {
  const reps = s.sets.filter(r => r.weight != null).map(r => r.reps).filter(Boolean)
  if (!reps.length) return '—'
  // Four eights are "4 × 8", not "4 × 8, 8, 8, 8" — repeating a number four
  // times says the same thing four times.
  const same = new Set(reps).size === 1
  return same ? `${s.setCount} × ${reps[0]}` : `${s.setCount} × ${reps.join(', ')}`
}

// Editable progression history table for the coach view
function ProgHistoryTable({ rows, onDelete, onUpdate }) {
  const { t } = useSettings()
  const [editId, setEditId] = useState(null)
  const [draft,  setDraft]  = useState({})
  const [saving, setSaving] = useState(false)
  const [open,   setOpen]   = useState(null)   // which session shows its sets

  // Newest first, as the table has always read.
  const sessions = toSessions(rows).reverse()

  function startEdit(row) {
    setEditId(row.id)
    setDraft({
      weight: String(row.weight ?? ''),
      reps:   String(row.reps   ?? ''),
      sets:   String(row.sets   ?? ''),
      notes:  row.notes || '',
    })
  }

  async function saveEdit() {
    setSaving(true)
    const updates = {
      weight: draft.weight ? parseFloat(draft.weight) : null,
      reps:   draft.reps   ? parseInt(draft.reps)     : null,
      sets:   draft.sets   ? parseInt(draft.sets)     : null,
      notes:  draft.notes.trim() || null,
    }
    await onUpdate(editId, updates)
    setSaving(false)
    setEditId(null)
  }

  /** One set: the same editable row the table has always had. */
  function renderSetRow(row) {
    return editId === row.id ? (
            <div key={row.id} className={`${styles.exHistoryRow} ${styles.exHistoryRowEdit}`}>
              <span className={styles.exHistoryDate}>
                {new Date(row.date + 'T00:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}
              </span>
              <input
                className={styles.progEditInput}
                type="number" min="0" step="0.5" placeholder={t('cd.phKg')}
                value={draft.weight}
                onChange={e => setDraft(p => ({ ...p, weight: e.target.value }))}
              />
              <div className={styles.progEditPair}>
                <input className={styles.progEditInput} type="number" min="0" placeholder={t('cd.phSets')}
                  value={draft.sets} onChange={e => setDraft(p => ({ ...p, sets: e.target.value }))} />
                <span className={styles.progEditSep}>×</span>
                <input className={styles.progEditInput} type="number" min="0" placeholder={t('cd.phReps')}
                  value={draft.reps} onChange={e => setDraft(p => ({ ...p, reps: e.target.value }))} />
              </div>
              <div className={styles.progEditActions}>
                <button className={styles.progSaveBtn} onClick={saveEdit} disabled={saving} type="button">✓</button>
                <button className={styles.progCancelBtn} onClick={() => setEditId(null)} type="button">✕</button>
              </div>
            </div>
    ) : (
            <div key={row.id} className={styles.exHistoryRow}>
              <span className={styles.exHistoryDate}>
                {new Date(row.date + 'T00:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}
              </span>
              <span className={styles.exHistoryKg}>
                {row.weight != null ? t('cd.kgUnit', { n: row.weight }) : '—'}
              </span>
              <span>{row.sets && row.reps ? `${row.sets} × ${row.reps}` : '—'}</span>
              <div className={styles.progEditActions}>
                <button className={styles.progEditBtn} onClick={() => startEdit(row)} type="button" aria-label={t('cd.edit')}>✎</button>
                <button className={styles.progDeleteBtn} onClick={() => onDelete(row.id)} type="button" aria-label={t('cd.delete')}>✕</button>
              </div>
            </div>
    )
  }

  return (
    <div className={styles.exHistoryTable}>
      <div className={styles.exHistoryHeader}>
        <span>{t('cd.thDate')}</span>
        <span>{t('cd.kg')}</span>
        <span>{t('cd.thSetsReps')}</span>
        <span />
      </div>
      {sessions.map(s => {
        const isOpen = open === s.date
        const multi  = s.sets.length > 1
        return (
          <div key={s.date} className={styles.progSession}>
            <div
              className={styles.exHistoryRow}
              onClick={multi ? () => setOpen(isOpen ? null : s.date) : undefined}
              style={multi ? { cursor: 'pointer' } : undefined}
            >
              <span className={styles.exHistoryDate}>
                {new Date(s.date + 'T00:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}
              </span>
              <span className={styles.exHistoryKg}>
                {s.top?.weight != null ? t('cd.kgUnit', { n: s.top.weight }) : '—'}
              </span>
              <span>{setsLabel(s)}</span>
              <div className={styles.progEditActions}>
                {/* Sets open for editing; a single legacy row edits in place,
                    so nothing that worked before stops working. */}
                {multi
                  ? <button className={styles.progEditBtn} type="button" aria-label={t('cd.setsAria')}>{isOpen ? '▴' : '▾'}</button>
                  : <button className={styles.progEditBtn} onClick={() => startEdit(s.sets[0])} type="button" aria-label={t('cd.edit')}>✎</button>}
                {!multi && (
                  <button className={styles.progDeleteBtn} onClick={() => onDelete(s.sets[0].id)} type="button" aria-label={t('cd.delete')}>✕</button>
                )}
              </div>
            </div>

            {/* Total moved, where the top set alone hides a harder session. */}
            {(s.volume > 0 || s.replaces) && (
              <span className={styles.progVolume}>
                {s.volume > 0 && t('cd.volume', { n: Math.round(s.volume).toLocaleString('bg-BG') })}
                {s.volume > 0 && s.replaces && ' · '}
                {s.replaces && t('cd.replaces', { name: s.replaces })}
              </span>
            )}

            {isOpen && s.sets.map(row => renderSetRow(row))}
          </div>
        )
      })}
    </div>
  )
}

// Simple weight-over-time sparkline for the progression view
function LiftProgressChart({ data }) {
  // One point per session, on the best set of the day by what it was worth.
  // Plotting every row drew four points inside a single workout, so a normal
  // set of 10, 9, 7, 6 came out as a week-long decline.
  const pts = toSessions(data)
    .filter(s => s.top?.weight != null)
    .map(s => ({ w: parseFloat(s.top.weight) }))
  if (pts.length < 2) return null

  const W = 280, H = 72
  const pad = { l: 30, r: 8, t: 8, b: 8 }
  const iW = W - pad.l - pad.r
  const iH = H - pad.t - pad.b
  const minW = Math.min(...pts.map(p => p.w))
  const maxW = Math.max(...pts.map(p => p.w))
  const rng  = maxW - minW || 1

  const xs = pts.map((_, i) => pad.l + (i / (pts.length - 1)) * iW)
  const ys = pts.map(p  => pad.t + iH - ((p.w - minW) / rng) * iH)
  const poly = pts.map((_, i) => `${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.liftSparkline} aria-hidden="true">
      <polyline
        points={poly}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r="3" fill="var(--accent)" />
      ))}
      <text x={pad.l - 4} y={pad.t + 7}  textAnchor="end" fill="var(--muted)" fontSize="9">{maxW}</text>
      <text x={pad.l - 4} y={pad.t + iH} textAnchor="end" fill="var(--muted)" fontSize="9">{minW}</text>
    </svg>
  )
}

// ─── Check-in Tab ────────────────────────────────────────────────────────────

const GYM_PERF_LABEL_KEYS = ['cd.gym.down', 'cd.gym.hold', 'cd.gym.up']
const GYM_PERF_COLOR = ['#EF5350', 'var(--accent)', '#66BB6A']

// ─── Sessions Tab ────────────────────────────────────────────────────────────


function fmtSessionDT(t, iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')} ${t(`monthsShort.${d.getMonth()}`).toUpperCase()}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const SESSION_STATUS_LABEL_KEYS = {
  pending:   'cd.sess.pending',
  confirmed: 'cd.sess.confirmed',
  completed: 'cd.sess.completed',
  declined:  'cd.sess.declined',
  cancelled: 'cd.sess.cancelled',
}

const PAY_LABEL_KEYS = { invoiced: 'cd.pay.invoiced', paid: 'cd.pay.paid' }

function SessionsTab({ clientId, client }) {
  const { t } = useSettings()
  const [sessions,     setSessions]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(null)
  const [price,        setPrice]        = useState('')
  const [defaultPrice, setDefaultPrice] = useState(String(client?.session_price_eur ?? ''))
  const [savingDefault, setSavingDefault] = useState(false)
  const [invoicing,    setInvoicing]    = useState(false)
  const [invoiceError, setInvoiceError] = useState(null)

  useEffect(() => {
    supabase
      .from('training_sessions')
      .select('*')
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setSessions(data || []); setLoading(false) })
  }, [clientId])

  async function saveDefaultPrice() {
    const val = parseFloat(defaultPrice) || null
    setSavingDefault(true)
    await supabase.from('profiles').update({ session_price_eur: val }).eq('id', clientId)
    setSavingDefault(false)
  }

  function openModal(s) {
    setModal(s)
    setPrice(String(client?.session_price_eur ?? ''))
    setInvoiceError(null)
  }

  async function handleInvoice() {
    const priceVal = parseFloat(price)
    if (!priceVal || priceVal <= 0) return
    setInvoicing(true)
    setInvoiceError(null)
    const { data, error } = await supabase.functions.invoke('create-invoice', {
      body: { session_id: modal.id, price_eur: priceVal },
    })
    if (error || data?.error) {
      setInvoiceError(error?.message || data?.error || t('cd.invoiceError'))
      setInvoicing(false)
      return
    }
    setSessions(prev => prev.map(s =>
      s.id === modal.id
        ? { ...s, payment_status: 'invoiced', stripe_invoice_id: data.invoice_id, price_eur: priceVal }
        : s
    ))
    setModal(null)
    setPrice('')
    setInvoicing(false)
  }

  if (loading) return <p className={styles.loading}>{t('cd.loading')}</p>

  return (
    <div className={styles.sessionsTab}>
      {/* Default price setting */}
      <div className={styles.defaultPriceRow}>
        <span className={styles.defaultPriceLabel}>{t('cd.sessionPrice')}</span>
        <input
          className={styles.defaultPriceInput}
          type="number"
          min="0"
          step="0.01"
          placeholder="—"
          value={defaultPrice}
          onChange={e => setDefaultPrice(e.target.value)}
          onBlur={saveDefaultPrice}
        />
        <span className={styles.defaultPriceCurrency}>EUR</span>
        {savingDefault && <span className={styles.defaultPriceSaving}>…</span>}
      </div>

      {sessions.length === 0 && <p className={styles.empty}>{t('cd.noSessions')}</p>}

      {sessions.map(s => {
        const canInvoice = (s.status === 'confirmed' || s.status === 'completed') && !s.payment_status
        return (
          <div key={s.id} className={styles.sessionCard}>
            <div className={styles.sessionInfo}>
              <span className={styles.sessionDate}>{fmtSessionDT(t, s.scheduled_at)}</span>
              <span className={styles.sessionTitle}>{s.title}</span>
              {s.price_eur != null && (
                <span className={styles.sessionPrice}>{s.price_eur} €</span>
              )}
            </div>
            <div className={styles.sessionRight}>
              <div className={styles.sessionBadges}>
                <span className={`${styles.sessionStatusBadge} ${styles['sStatus_' + s.status] || ''}`}>
                  {SESSION_STATUS_LABEL_KEYS[s.status] ?? s.status}
                </span>
                {s.payment_status && (
                  <span className={`${styles.sessionPayBadge} ${styles['sPay_' + s.payment_status] || ''}`}>
                    {PAY_LABEL_KEYS[s.payment_status] ?? s.payment_status}
                  </span>
                )}
              </div>
              {canInvoice && (
                <button
                  className={styles.invoiceBtn}
                  onClick={() => openModal(s)}
                  type="button"
                >
                  {t('cd.invoice')}
                </button>
              )}
            </div>
          </div>
        )
      })}

      {modal && (
        <div className={styles.invoiceOverlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.invoiceSheet}>
            <div className={styles.handle} />
            <p className={styles.invoiceTitle}>{t('cd.sendInvoice')}</p>
            <p className={styles.invoiceSubtitle}>{modal.title} · {fmtSessionDT(t, modal.scheduled_at)}</p>
            <div className={styles.priceRow}>
              <input
                className={styles.priceInput}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
                autoFocus
              />
              <span className={styles.priceCurrency}>EUR</span>
            </div>
            {invoiceError && <p className={styles.invoiceError}>{invoiceError}</p>}
            <div className={styles.invoiceActions}>
              <button
                className={styles.invoiceCancelBtn}
                onClick={() => setModal(null)}
                disabled={invoicing}
                type="button"
              >
                {t('cd.cancel')}
              </button>
              <button
                className={styles.invoiceConfirmBtn}
                onClick={handleInvoice}
                disabled={invoicing || !price || parseFloat(price) <= 0}
                type="button"
              >
                {invoicing ? t('cd.sending') : t('cd.send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Photo Timeline ───────────────────────────────────────────────────────────

function PhotoTimeline({ checkins, onPhotoClick }) {
  const { t } = useSettings()
  const photos = [...checkins]
    .filter(c => c.photo_url)
    .sort((a, b) => a.date.localeCompare(b.date)) // oldest left → newest right

  if (photos.length === 0) return null

  return (
    <div className={styles.photoTimeline}>
      <span className={styles.photoTimelineLabel}>{t('cd.progressPhotos', { n: photos.length })}</span>
      <div className={styles.photoScroll}>
        {photos.map((c, i) => {
          const isLatest = i === photos.length - 1
          return (
            <button
              key={c.id}
              type="button"
              className={`${styles.photoItem} ${isLatest ? styles.photoItemLatest : ''}`}
              onClick={() => onPhotoClick(c.photo_url)}
            >
              <img src={c.photo_url} className={styles.photoImg} alt={c.date} />
              <span className={styles.photoDate}>
                {new Date(c.date + 'T12:00').toLocaleDateString('bg-BG', { day: '2-digit', month: 'short' })}
              </span>
              {c.weight_kg != null && (
                <span className={styles.photoWeight}>{t('cd.photoWeight', { n: c.weight_kg })}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Checkin Tab ──────────────────────────────────────────────────────────────

const TREND_PERIODS = [
  { labelKey: 'cd.period7',   days: 7  },
  { labelKey: 'cd.period30',  days: 30 },
  { labelKey: 'cd.periodAll', days: null },
]

function CheckinTrends({ checkins }) {
  const { t } = useSettings()
  const [period, setPeriod] = useState(30)

  const filtered = period === null ? checkins : checkins.filter(c => {
    const cutoff = new Date(Date.now() - period * 86400000).toISOString().slice(0, 10)
    return c.date >= cutoff
  })

  if (filtered.length === 0) return null

  const sleepArr   = filtered.filter(c => c.sleep_hours    != null).map(c => c.sleep_hours)
  const desireArr  = filtered.filter(c => c.training_desire != null).map(c => c.training_desire)
  const gymCounts  = [0, 0, 0]
  filtered.forEach(c => { if (c.gym_performance != null) gymCounts[c.gym_performance]++ })

  const weightArr  = filtered.filter(c => c.weight_kg != null).sort((a, b) => a.date.localeCompare(b.date))
  const wFirst     = weightArr[0]?.weight_kg ?? null
  const wLast      = weightArr[weightArr.length - 1]?.weight_kg ?? null
  const wDelta     = wFirst !== null && wLast !== null && wFirst !== wLast
    ? Math.round((wLast - wFirst) * 10) / 10 : null

  const avgSleep   = sleepArr.length  ? (sleepArr.reduce((a, b) => a + b, 0)  / sleepArr.length).toFixed(1)  : null
  const avgDesire  = desireArr.length ? (desireArr.reduce((a, b) => a + b, 0) / desireArr.length).toFixed(1) : null
  const hasGym     = gymCounts.some(n => n > 0)

  return (
    <div className={styles.checkinTrends}>
      <div className={styles.trendsPeriodRow}>
        <span className={styles.trendsLabel}>{t('cd.averages')}</span>
        <div className={styles.trendsPeriodBtns}>
          {TREND_PERIODS.map(p => (
            <button
              key={p.labelKey}
              type="button"
              className={`${styles.trendsPeriodBtn} ${period === p.days ? styles.trendsPeriodBtnActive : ''}`}
              onClick={() => setPeriod(p.days)}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.trendsStats}>
        {avgSleep !== null && (
          <div className={styles.trendsStat}>
            <span className={styles.trendsStatVal}>{avgSleep}<span className={styles.trendsStatUnit}>{t('cd.hoursUnit')}</span></span>
            <span className={styles.trendsStatLabel}>{t('cd.avgSleep')}</span>
          </div>
        )}
        {avgDesire !== null && (
          <div className={styles.trendsStat}>
            <span className={styles.trendsStatVal}>{avgDesire}<span className={styles.trendsStatUnit}>/5</span></span>
            <span className={styles.trendsStatLabel}>{t('cd.desire')}</span>
          </div>
        )}
        {hasGym && (
          <div className={styles.trendsStat}>
            <span className={styles.trendsStatVal}>
              {gymCounts[2] > 0 && <span style={{ color: '#66BB6A' }}>↑{gymCounts[2]} </span>}
              {gymCounts[1] > 0 && <span style={{ color: 'var(--accent)' }}>={gymCounts[1]} </span>}
              {gymCounts[0] > 0 && <span style={{ color: '#EF5350' }}>↓{gymCounts[0]}</span>}
            </span>
            <span className={styles.trendsStatLabel}>{t('cd.gym')}</span>
          </div>
        )}
        {wLast !== null && (
          <div className={styles.trendsStat}>
            <span className={styles.trendsStatVal}>
              {wLast}<span className={styles.trendsStatUnit}>{t('cd.kgShort')}</span>
            </span>
            <span className={styles.trendsStatLabel}>
              {wDelta !== null
                ? <span style={{ color: wDelta < 0 ? '#66BB6A' : '#EF5350' }}>
                    {t('cd.weightDelta', { sign: wDelta > 0 ? '+' : '', n: wDelta })}
                  </span>
                : t('cd.latest')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckinTab({ clientId }) {
  const { t } = useSettings()
  const [checkins,  setCheckins]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [lightbox,  setLightbox]  = useState(null)

  useEffect(() => {
    supabase
      .from('form_checkins')
      .select('*')
      .eq('user_id', clientId)
      .order('date', { ascending: false })
      .limit(60)
      .then(({ data }) => { setCheckins(data || []); setLoading(false) })
  }, [clientId])

  if (loading) return <p className={styles.loading}>{t('cd.loading')}</p>
  if (checkins.length === 0) return <p className={styles.empty}>{t('cd.noCheckins')}</p>

  return (
    <div className={styles.checkinTab}>
      <PhotoTimeline checkins={checkins} onPhotoClick={setLightbox} />
      <CheckinTrends checkins={checkins} />
      {checkins.map(c => (
        <div key={c.id} className={styles.checkinCard}>
          {c.photo_url && (
            <button
              type="button"
              className={styles.checkinPhotoBtn}
              onClick={() => setLightbox(c.photo_url)}
            >
              <img src={c.photo_url} className={styles.checkinThumb} alt={c.date} />
            </button>
          )}
          <div className={styles.checkinBody}>
            <div className={styles.checkinRow}>
              <span className={styles.checkinDate}>
                {new Date(c.date + 'T12:00').toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </span>
              {c.weight_kg != null && (
                <span className={styles.checkinWeight}>{t('cd.kgUnit', { n: c.weight_kg })}</span>
              )}
            </div>
            <div className={styles.checkinChips}>
              {c.sleep_hours != null && (
                <span className={styles.checkinChip}>{t('cd.sleepChip', { n: c.sleep_hours })}</span>
              )}
              {c.gym_performance != null && (
                <span
                  className={styles.checkinChip}
                  style={{ color: GYM_PERF_COLOR[c.gym_performance], borderColor: GYM_PERF_COLOR[c.gym_performance] + '66' }}
                >
                  {t(GYM_PERF_LABEL_KEYS[c.gym_performance])}
                </span>
              )}
              {c.training_desire != null && (
                <span className={styles.checkinChip}>{t('cd.desireChip', { n: c.training_desire })}</span>
              )}
            </div>
            {c.weekly_win && (
              <p className={styles.checkinWin}>{t('cd.weeklyWin', { text: c.weekly_win })}</p>
            )}
            {c.weekly_improve && (
              <p className={styles.checkinImprove}>{t('cd.weeklyImprove', { text: c.weekly_improve })}</p>
            )}
            {c.notes && (
              <p className={styles.checkinNotes}>{c.notes}</p>
            )}
          </div>
        </div>
      ))}

      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'zoom-out' }}
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Check-in" style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}

function NotesTab({ notes, setNotes, onSave, saving, saved }) {
  const { t } = useSettings()
  return (
    <div className={styles.notesTab}>
      <textarea
        className={styles.notesArea}
        placeholder={t('cd.notesTextPh')}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={12}
      />
      <button
        className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
        onClick={onSave}
        disabled={saving}
        type="button"
      >
        {saving ? '...' : saved ? t('cd.saved') : t('cd.saveNotes')}
      </button>
    </div>
  )
}

// ─── Client Tasks Tab (coach view) ───────────────────────────────────────────

const TODAY_STR = () => new Date().toISOString().slice(0, 10)
const IN7_STR   = () => new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10)

function ClientTasksTab({ clientId }) {
  const { t } = useSettings()
  const { tasks, loading, pushTask, deleteTask, toggleTask } = useClientTasks(clientId)
  const [text, setText]       = useState('')
  const [dueSlot, setDueSlot] = useState('today')
  const [highPrio, setHighPrio] = useState(false)
  const [saving, setSaving]   = useState(false)
  const inputRef = useRef(null)

  function dueDateForSlot(slot) {
    if (slot === 'today') return TODAY_STR()
    if (slot === 'week')  return IN7_STR()
    return null
  }

  async function handlePush() {
    if (!text.trim() || saving) return
    setSaving(true)
    await pushTask({ text, due_date: dueDateForSlot(dueSlot), priority: highPrio ? 2 : 1 })
    setText('')
    setSaving(false)
    inputRef.current?.focus()
  }

  const active = tasks.filter(t => !t.done)
  const done   = tasks.filter(t => t.done)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Push form */}
      <div className={styles.coachTaskForm}>
        <input
          ref={inputRef}
          className={styles.coachTaskInput}
          type="text"
          placeholder={t('cd.taskPh')}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePush()}
        />
        <button
          className={styles.coachTaskSubmit}
          onClick={handlePush}
          disabled={!text.trim() || saving}
          type="button"
        >{t('cd.send2')}</button>
        <div className={styles.coachTaskMeta}>
          {[
            { id: 'today', label: t('cd.due.today') },
            { id: 'week',  label: t('cd.due.week') },
            { id: 'later', label: t('cd.due.later') },
          ].map(opt => (
            <button
              key={opt.id}
              className={`${styles.coachMetaBtn} ${dueSlot === opt.id ? styles.coachMetaBtnActive : ''}`}
              onClick={() => setDueSlot(opt.id)}
              type="button"
            >{opt.label}</button>
          ))}
          <button
            className={`${styles.coachMetaBtn} ${highPrio ? styles.coachMetaBtnPrio : ''}`}
            onClick={() => setHighPrio(v => !v)}
            type="button"
          >{t('cd.important')}</button>
        </div>
      </div>

      {loading && <p className={styles.loading}>{t('cd.loading')}</p>}

      {!loading && active.length === 0 && done.length === 0 && (
        <p className={styles.loading} style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
          {t('cd.noTasks')}
        </p>
      )}

      {active.map(task => (
        <CoachTaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
      ))}

      {done.length > 0 && (
        <div style={{ marginTop: 8, opacity: 0.45 }}>
          <div className={styles.sectionLabel} style={{ marginBottom: 6 }}>{t('cd.doneTasks')}</div>
          {done.map(task => (
            <CoachTaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
          ))}
        </div>
      )}
    </div>
  )
}

function CoachTaskRow({ task, onToggle, onDelete }) {
  const today     = TODAY_STR()
  const isOverdue = task.due_date && task.due_date < today && !task.done
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
      opacity: task.done ? 0.45 : 1,
    }}>
      <button
        onClick={() => onToggle(task.id)}
        type="button"
        style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
          border: task.done ? 'none' : '1.5px solid var(--border)',
          background: task.done ? 'var(--accent)' : 'transparent',
          color: '#0C0A06', cursor: 'pointer', padding: 0, marginTop: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {task.done && (
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
            <polyline points="1.5 6 4.5 9 10.5 3" />
          </svg>
        )}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: isOverdue ? '#ef5350' : 'var(--text)',
          textDecoration: task.done ? 'line-through' : 'none',
        }}>{task.text}</div>
        {task.due_date && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: isOverdue ? '#ef5350' : 'var(--muted)', marginTop: 3 }}>
            {isOverdue ? '⚠ ' : ''}{task.due_date}
          </div>
        )}
      </div>
      <button
        onClick={() => onDelete(task.id)}
        type="button"
        style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', padding: 0 }}
      >×</button>
    </div>
  )
}
