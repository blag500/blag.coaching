import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { HABITS } from '../../data/appData'
import TrainingEditor from './TrainingEditor'
import styles from './ClientDetail.module.css'

const TABS = [
  { id: 'progress', label: 'ПРОГРЕС' },
  { id: 'plan',     label: 'ПЛАН' },
  { id: 'goals',    label: 'ЦЕЛИ' },
  { id: 'notes',    label: 'БЕЛЕЖКИ' },
]

export default function ClientDetail({ client: initialClient, onBack }) {
  const { updateClientProfile, fetchClientFullStats } = useAuth()
  const [client, setClient] = useState(initialClient)
  const [tab, setTab] = useState('progress')
  const [stats, setStats] = useState(null)
  const [edits, setEdits] = useState({
    name:          initialClient.name          ?? '',
    calories:      initialClient.calories      ?? 2450,
    protein:       initialClient.protein       ?? 180,
    carbs:         initialClient.carbs         ?? 250,
    fat:           initialClient.fat           ?? 70,
    target_weight: initialClient.target_weight ?? '',
  })
  const [notes, setNotes] = useState(initialClient.coach_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)

  useEffect(() => {
    fetchClientFullStats(client.id).then(setStats)
  }, [client.id])

  async function saveGoals() {
    setSaving(true)
    const updates = {
      name:          edits.name,
      calories:      parseInt(edits.calories)      || 2450,
      protein:       parseInt(edits.protein)       || 180,
      carbs:         parseInt(edits.carbs)         || 250,
      fat:           parseInt(edits.fat)           || 70,
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
      </header>

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

      {/* Weight trend */}
      {weights.length > 0 && (
        <section className={styles.chartSection}>
          <h3 className={styles.chartTitle}>ТЕГЛО — ПОСЛЕДНИ ЗАПИСИ</h3>
          <div className={styles.weightList}>
            {weights.slice(-10).reverse().map(w => (
              <div key={w.date} className={styles.weightRow}>
                <span className={styles.weightDate}>{w.date}</span>
                <span className={styles.weightKg}>{w.kg} kg</span>
              </div>
            ))}
          </div>
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
        <label className={styles.fieldLabel}>Име</label>
        <input
          className={styles.fieldInput}
          type="text"
          value={edits.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Имe на клиента"
        />
      </div>

      <div className={styles.goalGrid}>
        {[
          { key: 'calories',      label: 'Калории',       unit: 'ккал' },
          { key: 'protein',       label: 'Протеин',        unit: 'g'    },
          { key: 'carbs',         label: 'Въглехидрати',   unit: 'g'    },
          { key: 'fat',           label: 'Мазнини',        unit: 'g'    },
          { key: 'target_weight', label: 'Целево тегло',   unit: 'kg'   },
        ].map(({ key, label, unit }) => (
          <div key={key} className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{label}</label>
            <div className={styles.inputWrap}>
              <input
                className={styles.fieldInput}
                type="number"
                min="0"
                value={edits[key]}
                onChange={e => set(key, e.target.value)}
              />
              <span className={styles.unit}>{unit}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
        onClick={onSave}
        disabled={saving}
        type="button"
      >
        {saving ? '...' : saved ? '✓ Запазено' : 'Запази целите'}
      </button>
    </div>
  )
}

// ─── Notes Tab ───────────────────────────────────────────────────────────────

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
