import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { HABITS } from '../../data/appData'
const DEFAULT_HABITS = HABITS
import TrainingEditor from './TrainingEditor'
import DatePicker from '../DatePicker/DatePicker'
import ChatPage from '../Chat/ChatPage'
import WeightChart from '../Profile/WeightChart'
import styles from './ClientDetail.module.css'

const TABS = [
  { id: 'progress',  label: 'ПРОГРЕС' },
  { id: 'chat',      label: 'ЧАТ' },
  { id: 'checkin',   label: 'CHECK-IN' },
  { id: 'sessions',  label: 'ГРАФИК' },
  { id: 'nutrition', label: 'ХРАНЕНЕ' },
  { id: 'lifts',     label: 'УПРАЖНЕНИЯ' },
  { id: 'plan',      label: 'ПЛАН' },
  { id: 'goals',     label: 'ЦЕЛИ' },
  { id: 'notes',     label: 'БЕЛЕЖКИ' },
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
    name:          initialClient.name          ?? '',
    target_weight: initialClient.target_weight ?? '',
    habits:        initialClient.habits        ?? null,
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
      setDeleteError(`Грешка: ${msg}`)
      setDeleting(false)
    }
  }

  async function saveGoals() {
    setSaving(true)
    const updates = {
      name:          edits.name,
      target_weight: parseFloat(edits.target_weight) || null,
      habits:        edits.habits,
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
          ← КЛИЕНТИ
        </button>
        <span className={styles.clientName}>{client.name || client.email}</span>
        <button
          className={`${styles.deleteBtn} ${confirmDelete ? styles.deleteBtnActive : ''}`}
          onClick={() => setConfirmDelete(v => !v)}
          type="button"
          aria-label="Изтрий профила"
        >
          <TrashIcon />
        </button>
      </header>

      {confirmDelete && (
        <div className={styles.deleteConfirm}>
          <p className={styles.deleteConfirmText}>
            Изтрий профила на <strong>{client.name || client.email}</strong>? Действието е необратимо.
          </p>
          {deleteError && (
            <p className={styles.deleteErrorText}>{deleteError}</p>
          )}
          <div className={styles.deleteConfirmActions}>
            <button className={styles.deleteCancelBtn} onClick={() => { setConfirmDelete(false); setDeleteError(null) }} type="button">
              Отказ
            </button>
            <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting} type="button">
              {deleting ? 'Изтрива...' : 'Да, изтрий'}
            </button>
          </div>
        </div>
      )}

      {/* Macro targets — always visible above tabs */}
      <div className={styles.macroBar}>
        <div className={styles.macroBarFields}>
          {[
            { key: 'calories', label: 'ККАЛ' },
            { key: 'protein',  label: 'ПРОТЕИН g' },
            { key: 'carbs',    label: 'ВЪГЛ g' },
            { key: 'fat',      label: 'МАЗН g' },
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
          {macroSaving ? '...' : macroSaved ? '✓' : 'Запази'}
        </button>
      </div>

      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.label}
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
      </div>
    </div>
  )
}

// ─── Progress Tab ────────────────────────────────────────────────────────────

function ProgressTab({ stats, client }) {
  if (!stats) {
    return <p className={styles.loading}>Зарежда...</p>
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
      {/* Kcal bars */}
      <section className={styles.chartSection}>
        <h3 className={styles.chartTitle}>ККАЛ — ПОСЛЕДНИ 7 ДНИ</h3>
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
        <p className={styles.chartNote}>Цел: {targetKcal} ккал (пунктирана линия)</p>
      </section>

      {/* Habit completion */}
      <section className={styles.chartSection}>
        <h3 className={styles.chartTitle}>НАВИЦИ — ПОСЛЕДНИ 7 ДНИ</h3>
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
          <h3 className={styles.chartTitle}>ТЕГЛО</h3>
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
  function set(field, value) {
    setEdits(prev => ({ ...prev, [field]: value }))
  }

  const hasIntake = client.phone || client.age || client.intake_training_days || client.intake_call_time || client.intake_goal || client.intake_notes

  return (
    <div className={styles.goalsTab}>
      {hasIntake && (
        <div className={styles.intakeSection}>
          <p className={styles.intakeSectionTitle}>ДАННИ ОТ КЛИЕНТА</p>
          {(client.phone || client.age || client.intake_training_days || client.intake_call_time) && (
            <div className={styles.intakeRow}>
              {client.phone && (
                <a href={`tel:${client.phone}`} className={styles.intakePhone}>
                  📞 {client.phone}
                </a>
              )}
              {client.intake_call_time && (
                <span className={styles.intakeAge}>🕐 {client.intake_call_time}ч.</span>
              )}
              {client.age && (
                <span className={styles.intakeAge}>{client.age} год.</span>
              )}
              {client.intake_training_days && (
                <span className={styles.intakeAge}>{client.intake_training_days}× тренировки/седм.</span>
              )}
            </div>
          )}
          {client.intake_goal && (
            <div className={styles.intakeBlock}>
              <span className={styles.intakeKey}>Цел</span>
              <p className={styles.intakeValue}>{client.intake_goal}</p>
            </div>
          )}
          {client.intake_notes && (
            <div className={styles.intakeBlock}>
              <span className={styles.intakeKey}>Здравни бележки</span>
              <p className={styles.intakeValue}>{client.intake_notes}</p>
            </div>
          )}
        </div>
      )}

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Имe</label>
        <input
          className={styles.fieldInput}
          type="text"
          value={edits.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Имe на клиента"
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Целево тегло</label>
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

      <button
        className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
        onClick={onSave}
        disabled={saving}
        type="button"
      >
        {saving ? '...' : saved ? '✓ Запазено' : 'Запази'}
      </button>
    </div>
  )
}

function HabitsEditor({ habits, onChange }) {
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
        <span className={styles.fieldLabel}>НАВИЦИ</span>
        {habits !== null && (
          <button className={styles.habitsResetBtn} onClick={resetToDefaults} type="button">
            Стандартни
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
          placeholder="Нов навик..."
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className={styles.habitAddBtn} onClick={add} type="button">+</button>
      </div>
    </div>
  )
}

// ─── Nutrition Tab ───────────────────────────────────────────────────────

function NutritionTab({ client }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft]       = useState({})
  const [showAdd, setShowAdd]   = useState(false)
  const [newEntry, setNewEntry] = useState({ name: '', grams: '', kcal: '', protein: '', carbs: '', fat: '' })
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

  return (
    <div className={styles.nutritionTab}>
      {mealPhotos.length > 0 && (
        <div className={styles.mealPhotoStrip}>
          <span className={styles.mealPhotoStripLabel}>СНИМКИ НА ЯСТИЯ — {mealPhotos.length}</span>
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
            placeholder="Наименование на храната..."
            value={newEntry.name}
            onChange={e => setNewEntry(prev => ({ ...prev, name: e.target.value }))}
          />
          <div className={styles.addFoodGrid}>
            {[
              { key: 'kcal',    label: 'Ккал *'   },
              { key: 'protein', label: 'Протеин g' },
              { key: 'carbs',   label: 'Въгл g'   },
              { key: 'fat',     label: 'Мазнини g' },
              { key: 'grams',   label: 'Грамаж g'  },
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
            <button className={styles.addFoodCancel} onClick={() => setShowAdd(false)} type="button">Отказ</button>
            <button
              className={styles.addFoodSubmit}
              onClick={handleAdd}
              disabled={adding || !newEntry.name.trim() || !newEntry.kcal}
              type="button"
            >
              {adding ? 'Добавя...' : '+ Добави'}
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.addFoodBtn} onClick={() => setShowAdd(true)} type="button">
          + Добави храна ръчно
        </button>
      )}

      {logs.length > 0 && (
        <div className={styles.dayTotal}>
          {totals.kcal} / {targetKcal} ккал · П{totals.protein}g · В{totals.carbs}g · М{totals.fat}g
        </div>
      )}

      {loading ? (
        <p className={styles.loading}>Зарежда...</p>
      ) : logs.length === 0 ? (
        <p className={styles.empty}>Няма логирани храни за тази дата</p>
      ) : (
        <div className={styles.logList}>
          {logs.map(entry =>
            editingId === entry.id ? (
              <div key={entry.id} className={`${styles.logEntry} ${styles.logEntryEditing}`}>
                <input
                  className={styles.logEditName}
                  type="text"
                  value={draft.name}
                  onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                />
                <div className={styles.logEditGrid}>
                  <div className={styles.logEditField}>
                    <label className={styles.logEditLabel}>Грамаж</label>
                    <input className={styles.logEditInput} type="number" min="0"
                      value={draft.grams}
                      onChange={e => handleDraftGramsChange(entry, e.target.value)}
                    />
                  </div>
                  {[
                    { key: 'kcal',    label: 'Ккал'      },
                    { key: 'protein', label: 'Протеин g'  },
                    { key: 'carbs',   label: 'Въгл g'     },
                    { key: 'fat',     label: 'Мазнини g'  },
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
                  <button className={styles.logEditCancel} onClick={() => setEditingId(null)} type="button">Отказ</button>
                  <button className={styles.logEditSave} onClick={() => saveEdit(entry.id)} type="button">Запази</button>
                </div>
              </div>
            ) : (
              <div key={entry.id} className={styles.logEntry}>
                {entry.photo_url && (
                  <button
                    type="button"
                    className={styles.logThumbBtn}
                    onClick={() => setLightboxUrl(entry.photo_url)}
                    aria-label="Виж снимката на ястието"
                  >
                    <img src={entry.photo_url} className={styles.logThumbImg} alt="" />
                  </button>
                )}
                <div className={styles.logLeft}>
                  <span className={styles.logName}>{entry.name}</span>
                  <span className={styles.logMacros}>
                    {entry.grams > 0 && <><span className={styles.logGrams}>{entry.grams}g</span> · </>}
                    {entry.kcal} ккал · П{Math.round(entry.protein * 10) / 10}g · В{Math.round(entry.carbs * 10) / 10}g · М{Math.round(entry.fat * 10) / 10}g
                  </span>
                </div>
                <div className={styles.logEntryActions}>
                  <button className={styles.logEditBtn} onClick={() => startEdit(entry)} type="button" aria-label="Редактирай">✎</button>
                  <button className={styles.logDeleteBtn} onClick={() => deleteEntry(entry.id)} type="button" aria-label="Изтрий">×</button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Meal photo lightbox */}
      {lightboxUrl && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'zoom-out' }}
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Ястие" style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: '12px', objectFit: 'contain' }} />
          <button type="button" onClick={() => setLightboxUrl(null)} aria-label="Затвори" style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', color: '#fff', fontSize: 20, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}
    </div>
  )
}

// ─── Lifts Tab ───────────────────────────────────────────────────────────

function LiftsTab({ clientId }) {
  const { addExerciseLogForClient, updateExerciseLog, removeExerciseLog } = useAuth()
  const [subTab,       setSubTab]       = useState('log')
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
      .select('id, exercise_name, date, weight, reps, sets, notes')
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
        >ДНЕВНИК</button>
        <button
          className={`${styles.liftsSubTab} ${subTab === 'progression' ? styles.liftsSubTabActive : ''}`}
          onClick={() => setSubTab('progression')} type="button"
        >ПРОГРЕСИЯ</button>
      </div>

      {/* ── DIARY view ── */}
      {subTab === 'log' && (
        <>
          <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />

          {showAdd ? (
            <div className={styles.addFoodForm}>
              <input
                className={styles.addFoodName}
                type="text"
                placeholder="Упражнение *"
                autoFocus
                value={newEntry.name}
                onChange={e => setNewEntry(p => ({ ...p, name: e.target.value }))}
              />
              <div className={styles.liftAddGrid}>
                {[
                  { key: 'weight', label: 'Кг',     step: '0.5' },
                  { key: 'reps',   label: 'Повт.',   step: '1'   },
                  { key: 'sets',   label: 'Серии',   step: '1'   },
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
                placeholder="Бележки (по избор)"
                value={newEntry.notes}
                onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))}
              />
              <div className={styles.addFoodActions}>
                <button className={styles.addFoodCancel} onClick={() => setShowAdd(false)} type="button">Отказ</button>
                <button
                  className={styles.addFoodSubmit}
                  onClick={handleAdd}
                  disabled={adding || !newEntry.name.trim()}
                  type="button"
                >
                  {adding ? 'Добавя...' : '+ Добави'}
                </button>
              </div>
            </div>
          ) : (
            <button className={styles.addFoodBtn} onClick={() => setShowAdd(true)} type="button">
              + Добави упражнение
            </button>
          )}

          {loading ? (
            <p className={styles.loading}>Зарежда...</p>
          ) : logs.length === 0 ? (
            <p className={styles.empty}>Няма логирани упражнения за тази дата</p>
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
                        { key: 'weight', label: 'Кг',   step: '0.5' },
                        { key: 'reps',   label: 'Повт.', step: '1'   },
                        { key: 'sets',   label: 'Серии', step: '1'   },
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
                      type="text" placeholder="Бележки"
                      value={draft.notes}
                      onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))}
                    />
                    <div className={styles.logEditActions}>
                      <button className={styles.logEditCancel} onClick={() => setEditingId(null)} type="button">Отказ</button>
                      <button className={styles.logEditSave} onClick={() => saveEdit(log.id)} type="button">Запази</button>
                    </div>
                  </div>
                ) : (
                  <div key={log.id} className={`${styles.liftEntry} ${styles.liftEntryRow}`}>
                    <div className={styles.liftInfo}>
                      <span className={styles.liftName}>{log.exercise_name}</span>
                      <span className={styles.liftStats}>
                        {log.weight != null && <span className={styles.liftKg}>{log.weight} кг</span>}
                        {log.reps && <span>{log.sets || 1} × {log.reps}</span>}
                        {log.notes && <span className={styles.liftNoteInline}>{log.notes}</span>}
                      </span>
                    </div>
                    <div className={styles.logEntryActions}>
                      <button className={styles.logEditBtn} onClick={() => startEdit(log)} type="button" aria-label="Редактирай">✎</button>
                      <button className={styles.logDeleteBtn} onClick={() => handleDelete(log.id)} type="button" aria-label="Изтрий">×</button>
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
            <p className={styles.loading}>Зарежда...</p>
          ) : exNames.length === 0 ? (
            <p className={styles.empty}>Няма записани упражнения</p>
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

// Editable progression history table for the coach view
function ProgHistoryTable({ rows, onDelete, onUpdate }) {
  const [editId, setEditId] = useState(null)
  const [draft,  setDraft]  = useState({})
  const [saving, setSaving] = useState(false)

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

  return (
    <div className={styles.exHistoryTable}>
      <div className={styles.exHistoryHeader}>
        <span>Дата</span>
        <span>Кг</span>
        <span>Серии × Повт.</span>
        <span />
      </div>
      {rows.map((row) =>
        editId === row.id ? (
          <div key={row.id} className={`${styles.exHistoryRow} ${styles.exHistoryRowEdit}`}>
            <span className={styles.exHistoryDate}>
              {new Date(row.date + 'T00:00:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}
            </span>
            <input
              className={styles.progEditInput}
              type="number" min="0" step="0.5" placeholder="кг"
              value={draft.weight}
              onChange={e => setDraft(p => ({ ...p, weight: e.target.value }))}
            />
            <div className={styles.progEditPair}>
              <input className={styles.progEditInput} type="number" min="0" placeholder="сер."
                value={draft.sets} onChange={e => setDraft(p => ({ ...p, sets: e.target.value }))} />
              <span className={styles.progEditSep}>×</span>
              <input className={styles.progEditInput} type="number" min="0" placeholder="повт."
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
              {row.weight != null ? `${row.weight} кг` : '—'}
            </span>
            <span>{row.sets && row.reps ? `${row.sets} × ${row.reps}` : '—'}</span>
            <div className={styles.progEditActions}>
              <button className={styles.progEditBtn} onClick={() => startEdit(row)} type="button" aria-label="Редактирай">✎</button>
              <button className={styles.progDeleteBtn} onClick={() => onDelete(row.id)} type="button" aria-label="Изтрий">✕</button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

// Simple weight-over-time sparkline for the progression view
function LiftProgressChart({ data }) {
  const pts = data
    .filter(r => r.weight != null)
    .map(r => ({ w: parseFloat(r.weight) }))
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

const GYM_PERF_LABEL = ['↓ СПАД', '= ЗАДРЖ', '↑ РЪСТ']
const GYM_PERF_COLOR = ['#EF5350', '#FFB74D', '#66BB6A']

// ─── Sessions Tab ────────────────────────────────────────────────────────────

const MONTHS_CD = ['ЯНУ','ФЕВ','МАР','АПР','МАЙ','ЮНИ','ЮЛИ','АВГ','СЕП','ОКТ','НОЕ','ДЕК']

function fmtSessionDT(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS_CD[d.getMonth()]}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const SESSION_STATUS_LABEL = {
  pending:   'ЧАКА',
  confirmed: 'ПОТВЪРД.',
  completed: 'ПРОВЕДЕНО',
  declined:  'ОТКАЗАНА',
  cancelled: 'ОТМЕНЕНА',
}

const PAY_LABEL = { invoiced: 'ИЗПРАТЕНА', paid: 'ПЛАТЕНО' }

function SessionsTab({ clientId, client }) {
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
      setInvoiceError(error?.message || data?.error || 'Грешка при изпращане')
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

  if (loading) return <p className={styles.loading}>Зарежда...</p>

  return (
    <div className={styles.sessionsTab}>
      {/* Default price setting */}
      <div className={styles.defaultPriceRow}>
        <span className={styles.defaultPriceLabel}>Цена на сесия</span>
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

      {sessions.length === 0 && <p className={styles.empty}>Няма сесии за този клиент</p>}

      {sessions.map(s => {
        const canInvoice = (s.status === 'confirmed' || s.status === 'completed') && !s.payment_status
        return (
          <div key={s.id} className={styles.sessionCard}>
            <div className={styles.sessionInfo}>
              <span className={styles.sessionDate}>{fmtSessionDT(s.scheduled_at)}</span>
              <span className={styles.sessionTitle}>{s.title}</span>
              {s.price_eur != null && (
                <span className={styles.sessionPrice}>{s.price_eur} €</span>
              )}
            </div>
            <div className={styles.sessionRight}>
              <div className={styles.sessionBadges}>
                <span className={`${styles.sessionStatusBadge} ${styles['sStatus_' + s.status] || ''}`}>
                  {SESSION_STATUS_LABEL[s.status] ?? s.status}
                </span>
                {s.payment_status && (
                  <span className={`${styles.sessionPayBadge} ${styles['sPay_' + s.payment_status] || ''}`}>
                    {PAY_LABEL[s.payment_status] ?? s.payment_status}
                  </span>
                )}
              </div>
              {canInvoice && (
                <button
                  className={styles.invoiceBtn}
                  onClick={() => openModal(s)}
                  type="button"
                >
                  ФАКТУРА
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
            <p className={styles.invoiceTitle}>ИЗПРАТИ ФАКТУРА</p>
            <p className={styles.invoiceSubtitle}>{modal.title} · {fmtSessionDT(modal.scheduled_at)}</p>
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
                Отказ
              </button>
              <button
                className={styles.invoiceConfirmBtn}
                onClick={handleInvoice}
                disabled={invoicing || !price || parseFloat(price) <= 0}
                type="button"
              >
                {invoicing ? 'Изпраща...' : 'Изпрати'}
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
  const photos = [...checkins]
    .filter(c => c.photo_url)
    .sort((a, b) => a.date.localeCompare(b.date)) // oldest left → newest right

  if (photos.length === 0) return null

  return (
    <div className={styles.photoTimeline}>
      <span className={styles.photoTimelineLabel}>ПРОГРЕС СНИМКИ — {photos.length}</span>
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
                <span className={styles.photoWeight}>{c.weight_kg}кг</span>
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
  { label: '7Д',    days: 7  },
  { label: '30Д',   days: 30 },
  { label: 'ВСИЧКО', days: null },
]

function CheckinTrends({ checkins }) {
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
        <span className={styles.trendsLabel}>СРЕДНИ СТОЙНОСТИ</span>
        <div className={styles.trendsPeriodBtns}>
          {TREND_PERIODS.map(p => (
            <button
              key={p.label}
              type="button"
              className={`${styles.trendsPeriodBtn} ${period === p.days ? styles.trendsPeriodBtnActive : ''}`}
              onClick={() => setPeriod(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.trendsStats}>
        {avgSleep !== null && (
          <div className={styles.trendsStat}>
            <span className={styles.trendsStatVal}>{avgSleep}<span className={styles.trendsStatUnit}>ч</span></span>
            <span className={styles.trendsStatLabel}>ср. сън</span>
          </div>
        )}
        {avgDesire !== null && (
          <div className={styles.trendsStat}>
            <span className={styles.trendsStatVal}>{avgDesire}<span className={styles.trendsStatUnit}>/5</span></span>
            <span className={styles.trendsStatLabel}>желание</span>
          </div>
        )}
        {hasGym && (
          <div className={styles.trendsStat}>
            <span className={styles.trendsStatVal}>
              {gymCounts[2] > 0 && <span style={{ color: '#66BB6A' }}>↑{gymCounts[2]} </span>}
              {gymCounts[1] > 0 && <span style={{ color: '#FFB74D' }}>={gymCounts[1]} </span>}
              {gymCounts[0] > 0 && <span style={{ color: '#EF5350' }}>↓{gymCounts[0]}</span>}
            </span>
            <span className={styles.trendsStatLabel}>зала</span>
          </div>
        )}
        {wLast !== null && (
          <div className={styles.trendsStat}>
            <span className={styles.trendsStatVal}>
              {wLast}<span className={styles.trendsStatUnit}>кг</span>
            </span>
            <span className={styles.trendsStatLabel}>
              {wDelta !== null
                ? <span style={{ color: wDelta < 0 ? '#66BB6A' : '#EF5350' }}>
                    {wDelta > 0 ? `+${wDelta}` : wDelta} кг
                  </span>
                : 'последно'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckinTab({ clientId }) {
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

  if (loading) return <p className={styles.loading}>Зарежда...</p>
  if (checkins.length === 0) return <p className={styles.empty}>Няма check-in записи</p>

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
                <span className={styles.checkinWeight}>{c.weight_kg} кг</span>
              )}
            </div>
            <div className={styles.checkinChips}>
              {c.sleep_hours != null && (
                <span className={styles.checkinChip}>{c.sleep_hours}ч сън</span>
              )}
              {c.gym_performance != null && (
                <span
                  className={styles.checkinChip}
                  style={{ color: GYM_PERF_COLOR[c.gym_performance], borderColor: GYM_PERF_COLOR[c.gym_performance] + '66' }}
                >
                  {GYM_PERF_LABEL[c.gym_performance]}
                </span>
              )}
              {c.training_desire != null && (
                <span className={styles.checkinChip}>желание {c.training_desire}/5</span>
              )}
            </div>
            {c.weekly_win && (
              <p className={styles.checkinWin}>Победа: {c.weekly_win}</p>
            )}
            {c.weekly_improve && (
              <p className={styles.checkinImprove}>Подобрение: {c.weekly_improve}</p>
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
  return (
    <div className={styles.notesTab}>
      <textarea
        className={styles.notesArea}
        placeholder="Бележки за клиента — прогрес, наблюдения, корекции..."
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
        {saving ? '...' : saved ? '✓ Запазено' : 'Запази бележките'}
      </button>
    </div>
  )
}
