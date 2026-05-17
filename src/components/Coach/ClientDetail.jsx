import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { HABITS } from '../../data/appData'
import TrainingEditor from './TrainingEditor'
import DatePicker from '../DatePicker/DatePicker'
import Chat from '../Chat/Chat'
import WeightChart from '../Profile/WeightChart'
import styles from './ClientDetail.module.css'

const TABS = [
  { id: 'progress', label: 'ПРОГРЕС' },
  { id: 'nutrition', label: 'ХРАНЕНЕ' },
  { id: 'lifts',    label: 'УПРАЖНЕНИЯ' },
  { id: 'plan',     label: 'ПЛАН' },
  { id: 'goals',    label: 'ЦЕЛИ' },
  { id: 'notes',    label: 'БЕЛЕЖКИ' },
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
  const { updateClientProfile, deleteClientProfile, fetchClientFullStats, fetchExerciseLogs } = useAuth()
  const [client, setClient] = useState(initialClient)
  const [tab, setTab] = useState('progress')
  const [stats, setStats] = useState(null)
  const [exerciseLogs, setExerciseLogs] = useState([])
  const [macros, setMacros] = useState({
    calories: initialClient.calories ?? 2450,
    protein:  initialClient.protein  ?? 180,
    carbs:    initialClient.carbs    ?? 250,
    fat:      initialClient.fat      ?? 70,
  })
  const [macroSaving, setMacroSaving] = useState(false)
  const [macroSaved,  setMacroSaved]  = useState(false)
  const [edits, setEdits] = useState({
    name:          initialClient.name          ?? '',
    target_weight: initialClient.target_weight ?? '',
  })
  const [notes, setNotes] = useState(initialClient.coach_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    fetchClientFullStats(client.id).then(setStats)
    fetchExerciseLogs(client.id, today).then(({ data }) => setExerciseLogs(data || []))
  }, [client.id])

  async function saveMacros() {
    setMacroSaving(true)
    const updates = {
      calories: parseInt(macros.calories) || 2450,
      protein:  parseInt(macros.protein)  || 180,
      carbs:    parseInt(macros.carbs)    || 250,
      fat:      parseInt(macros.fat)      || 70,
    }
    await updateClientProfile(client.id, updates)
    setClient(prev => ({ ...prev, ...updates }))
    setMacroSaving(false)
    setMacroSaved(true)
    setTimeout(() => setMacroSaved(false), 2000)
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await deleteClientProfile(client.id)
    if (!error) {
      onDelete(client.id)
    } else {
      console.error('delete client failed:', error)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function saveGoals() {
    setSaving(true)
    const updates = {
      name:          edits.name,
      target_weight: parseFloat(edits.target_weight) || null,
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
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">
          ← КЛИЕНТИ
        </button>
        <span className={styles.clientName}>{client.name || client.email}</span>
        <button
          className={styles.chatBtn}
          onClick={() => setShowChat(v => !v)}
          type="button"
          aria-label="Чат с клиента"
        >
          💬
        </button>
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
          <div className={styles.deleteConfirmActions}>
            <button className={styles.deleteCancelBtn} onClick={() => setConfirmDelete(false)} type="button">
              Отказ
            </button>
            <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting} type="button">
              {deleting ? 'Изтрива...' : 'Да, изтрий'}
            </button>
          </div>
        </div>
      )}

      {showChat && (
        <Chat
          clientId={client.id}
          clientName={client.name || client.email}
          onClose={() => setShowChat(false)}
        />
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

      <div className={styles.body}>
        {tab === 'progress' && <ProgressTab stats={stats} client={client} />}
        {tab === 'nutrition' && <NutritionTab client={client} />}
        {tab === 'lifts' && <LiftsTab logs={exerciseLogs} />}
        {tab === 'plan' && (
          <TrainingEditor
            initialPlan={client.training_plan}
            onSave={savePlan}
            saving={savingPlan}
          />
        )}
        {tab === 'goals' && (
          <GoalsTab
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

  const targetKcal = client.calories || 2450
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

function GoalsTab({ edits, setEdits, onSave, saving, saved }) {
  function set(field, value) {
    setEdits(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className={styles.goalsTab}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Ime</label>
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

  const targetKcal = client.calories || 2450

  return (
    <div className={styles.nutritionTab}>
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
                <div className={styles.logLeft}>
                  <span className={styles.logName}>{entry.name}</span>
                  <span className={styles.logMacros}>
                    {entry.kcal} ккал{entry.grams > 0 ? ` · ${entry.grams}g` : ''} · П{Math.round(entry.protein * 10) / 10}g · В{Math.round(entry.carbs * 10) / 10}g · М{Math.round(entry.fat * 10) / 10}g
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
    </div>
  )
}

// ─── Lifts Tab ───────────────────────────────────────────────────────────

function LiftsTab({ logs }) {
  return (
    <div className={styles.liftsTab}>
      {logs.length === 0 ? (
        <p className={styles.empty}>Няма логирани упражнения</p>
      ) : (
        <div className={styles.liftList}>
          {logs.map(log => (
            <div key={log.id} className={styles.liftEntry}>
              <div className={styles.liftName}>{log.exercise_name}</div>
              <div className={styles.liftStats}>
                <span>{log.weight ? `${log.weight} kg` : '—'}</span>
                <span>{log.reps ? `${log.reps} × ${log.sets || 1}` : '—'}</span>
              </div>
              {log.notes && <p className={styles.liftNotes}>{log.notes}</p>}
            </div>
          ))}
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
