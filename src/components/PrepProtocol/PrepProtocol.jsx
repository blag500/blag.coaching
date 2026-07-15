import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePrepProtocol } from '../../hooks/usePrepProtocol'
import styles from './PrepProtocol.module.css'

// ── helpers ──────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10) }

// Contest prep formula: 2.5g protein/kg (vs 2g in general calc) to preserve muscle during cut
// Fat: 20% of kcal (lower than general 25% to free calories for protein/carbs)
// Carbs: remainder
function macrosForKcal(kcal, weightKg) {
  const protein = Math.round(weightKg * 2.5)
  const fat     = Math.round((kcal * 0.20) / 9)
  const carbs   = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { protein, fat, carbs }
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtShort(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit' })
}

// Get Mon–Sun of current week including past days
function currentWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

// ── Setup form ───────────────────────────────────────────────────────
function PrepSetup({ onSave, profile }) {
  const today = todayStr()
  const [form, setForm] = useState({
    competition_name: '',
    competition_date: '',
    target_weight:    '',
    start_weight:     profile?.weight_kg ? String(profile.weight_kg) : '',
    tdee:             '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  // Auto-compute TDEE from profile if possible
  function calcTDEE() {
    const { gender, age, height_cm, weight_kg, activity_level } = profile ?? {}
    if (!gender || !age || !height_cm || !weight_kg) return null
    const bmr = gender === 'male'
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
      : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    const mults = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
    return Math.round(bmr * (mults[activity_level] ?? 1.55))
  }

  const suggestedTDEE = calcTDEE()

  async function handleSave(e) {
    e.preventDefault()
    if (!form.competition_date || !form.target_weight || !form.start_weight) {
      setError('Попълни датата, началното и целевото тегло'); return
    }
    if (form.competition_date <= today) {
      setError('Датата на състезанието трябва да е в бъдещето'); return
    }
    setSaving(true); setError('')
    const { error: err } = await onSave({
      competition_name: form.competition_name || null,
      competition_date: form.competition_date,
      target_weight:    parseFloat(form.target_weight),
      start_weight:     parseFloat(form.start_weight),
      start_date:       today,
      tdee:             parseInt(form.tdee) || suggestedTDEE || null,
    })
    setSaving(false)
    if (err) {
      const msg = err.message || ''
      if (msg.includes('Load failed') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('Мрежова грешка — провери връзката и опитай пак')
      } else if (msg.includes('schema') || msg.includes('relation') || msg.includes('does not exist')) {
        setError('Таблицата не е готова — презареди schema кеша в Supabase Dashboard')
      } else {
        setError(msg || 'Грешка при запис')
      }
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <span className={styles.trophyIcon}>🏆</span>
          <div>
            <h1 className={styles.title}>БОДИБИЛДИНГ ПРОТОКОЛ</h1>
            <p className={styles.subtitle}>Задай целта. Следи прогреса.</p>
          </div>
        </div>
      </header>

      <form className={styles.setupForm} onSubmit={handleSave}>
        <div className={styles.setupSection}>
          <label className={styles.label}>СЦЕНАТА</label>
          <input className={styles.input} type="text"
            placeholder="Balkans Classic 2026 (по желание)"
            value={form.competition_name}
            onChange={e => set('competition_name', e.target.value)} />
        </div>

        <div className={styles.setupSection}>
          <label className={styles.label}>ДАТА НА СЪСТЕЗАНИЕТО</label>
          <input className={styles.input} type="date"
            value={form.competition_date}
            onChange={e => set('competition_date', e.target.value)}
            min={today} required />
        </div>

        <div className={styles.setupGrid}>
          <div className={styles.setupSection}>
            <label className={styles.label}>ТЕКУЩО ТЕГЛО (кг)</label>
            <input className={styles.input} type="number" step="0.1" min="40" max="200"
              placeholder="77.6"
              value={form.start_weight}
              onChange={e => set('start_weight', e.target.value)} required />
          </div>
          <div className={styles.setupSection}>
            <label className={styles.label}>СЦЕНИЧНО ТЕГЛО (кг)</label>
            <input className={styles.input} type="number" step="0.1" min="40" max="200"
              placeholder="75.0"
              value={form.target_weight}
              onChange={e => set('target_weight', e.target.value)} required />
          </div>
        </div>

        <div className={styles.setupSection}>
          <label className={styles.label}>
            ПОДДЪРЖАЩИ КАЛОРИИ / TDEE
            {suggestedTDEE && <span className={styles.labelHint}> (изчислено: {suggestedTDEE} ккал)</span>}
          </label>
          <input className={styles.input} type="number" min="1200" max="6000"
            placeholder={suggestedTDEE ? String(suggestedTDEE) : '2600'}
            value={form.tdee}
            onChange={e => set('tdee', e.target.value)} />
          <span className={styles.fieldNote}>Нужно за изчисляване на дневните калории по план</span>
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <button className={styles.startBtn} type="submit" disabled={saving}>
          {saving ? 'СТАРТИРА...' : 'СТАРТИРАЙ ПРЕПА →'}
        </button>
      </form>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────
function PrepDashboard({ prep, plan, weightLogs, weekStats, onUpdate, onEnd, onReforecast, profile, onApplyMacros }) {
  const today = todayStr()
  const [weightInput, setWeightInput]     = useState('')
  const [weightSaved, setWeightSaved]     = useState(false)
  const [showEnd,     setShowEnd]         = useState(false)
  const [reforecastConfirm, setReforecastConfirm] = useState(false)
  const [notesMode,   setNotesMode]       = useState(false)
  const [macroApplied, setMacroApplied]   = useState(false)
  const [notes, setNotes] = useState({
    cardio_notes:      prep.cardio_notes     ?? '',
    supplement_notes:  prep.supplement_notes ?? '',
    general_notes:     prep.general_notes    ?? '',
  })
  const [notesSaved, setNotesSaved] = useState(false)

  const cw      = plan?.currentWeek
  const daysOut = plan?.weeksOut != null
    ? `${plan.weeksOut} ${plan.weeksOut === 1 ? 'СЕДМИЦА' : 'СЕДМИЦИ'} ДО СЦЕНАТА`
    : null

  // Today's weight already logged?
  const todayWeight = weightLogs.find(w => w.date === today)

  async function handleWeightLog(e) {
    e.preventDefault()
    const kg = parseFloat(weightInput)
    if (!kg || kg < 30 || kg > 300) return
    await onUpdate._logWeight(kg)
    setWeightSaved(true)
    setWeightInput('')
    setTimeout(() => setWeightSaved(false), 2500)
  }

  async function saveNotes() {
    await onUpdate.updatePrep(notes)
    setNotesSaved(true)
    setNotesMode(false)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const weekDays = cw ? currentWeekDays(cw.weekStart) : []

  return (
    <div className={styles.page}>
      {/* ── Header countdown ── */}
      <header className={styles.dashHeader}>
        <div className={styles.dashHeaderTop}>
          <span className={styles.trophyIcon}>🏆</span>
          <div>
            {prep.competition_name && <p className={styles.compName}>{prep.competition_name}</p>}
            <p className={styles.countdown}>{daysOut ?? '—'}</p>
          </div>
        </div>
        <p className={styles.compDate}>{fmtDate(prep.competition_date)}</p>

        <div className={styles.targetRow}>
          <div className={styles.targetPill}>
            <span className={styles.targetLabel}>СТАРТ</span>
            <span className={styles.targetVal}>{prep.start_weight} кг</span>
          </div>
          <div className={styles.targetArrow}>→</div>
          <div className={styles.targetPill}>
            <span className={styles.targetLabel}>СЦЕНА</span>
            <span className={styles.targetVal}>{prep.target_weight} кг</span>
          </div>
          {plan?.dailyKcal && (
            <>
              <div className={styles.targetArrow}>·</div>
              <div className={styles.targetPill}>
                <span className={styles.targetLabel}>ККАЛ/ДЕН</span>
                <span className={styles.targetVal}>{plan.dailyKcal}</span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Reforecast banner ── */}
      {plan?.reforecastNeeded && !reforecastConfirm && (
        <div className={styles.reforecastBanner}>
          <div className={styles.reforecastText}>
            <strong>Корекция на плана</strong>
            <span>
              Миналата седмица: {plan.reforecastDiff > 0 ? '+' : ''}{plan.reforecastDiff} кг спрямо целта.
              Да преизчислим оставащите седмици?
            </span>
          </div>
          <div className={styles.reforecastBtns}>
            <button className={styles.reforecastYes} onClick={() => { onReforecast(); setReforecastConfirm(true) }} type="button">
              ДА
            </button>
            <button className={styles.reforecastNo} onClick={() => setReforecastConfirm(true)} type="button">
              НЕ
            </button>
          </div>
        </div>
      )}

      {/* ── This week card ── */}
      {cw && (
        <section className={styles.card}>
          <div className={styles.cardTitle}>СЕДМИЦА {cw.number} — {cw.weeksOut} СЕДМ. ДО СЦЕНАТА</div>
          <div className={styles.cardSub}>{fmtShort(cw.weekStart)} – {fmtShort(cw.weekEnd)}</div>

          <div className={styles.weekMetrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>СР. ТЕГЛО</span>
              <span className={styles.metricVal}>
                {cw.avgWeight != null ? `${cw.avgWeight} кг` : '—'}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>ЦЕЛ</span>
              <span className={styles.metricVal}>{cw.targetWeight} кг</span>
            </div>
            {cw.avgWeight != null && (
              <div className={styles.metric}>
                <span className={styles.metricLabel}>РАЗЛИКА</span>
                <span className={`${styles.metricVal} ${cw.avgWeight > cw.targetWeight ? styles.metricBehind : styles.metricAhead}`}>
                  {cw.avgWeight > cw.targetWeight ? '+' : ''}{Math.round((cw.avgWeight - cw.targetWeight) * 10) / 10} кг
                </span>
              </div>
            )}
          </div>

          {/* 7-day weigh-in grid */}
          <div className={styles.weekGrid}>
            {weekDays.map((d, i) => {
              const entry  = weightLogs.find(w => w.date === d)
              const isPast = d <= today
              const isToday = d === today
              return (
                <div key={d} className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ''} ${!isPast ? styles.dayCellFuture : ''}`}>
                  <span className={styles.dayLabel}>{DAY_LABELS[i]}</span>
                  <span className={styles.dayWeight}>{entry ? entry.kg : '·'}</span>
                </div>
              )
            })}
          </div>

          {/* Log today's weight */}
          <form className={styles.logForm} onSubmit={handleWeightLog}>
            <input
              className={styles.logInput}
              type="number" step="0.1" min="30" max="300"
              placeholder={todayWeight ? String(todayWeight.kg) : 'Сутрешно тегло (кг)'}
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
            />
            <button className={`${styles.logBtn} ${weightSaved ? styles.logBtnSaved : ''}`} type="submit">
              {weightSaved ? '✓' : 'ЗАПИШИ'}
            </button>
          </form>
        </section>
      )}

      {/* ── Cross-tab stats ── */}
      {weekStats && (
        <section className={styles.card}>
          <div className={styles.cardTitle}>ТАЗИ СЕДМИЦА — ОТ ДРУГИТЕ ТАБОВЕ</div>
          <div className={styles.statsRow}>
            {weekStats.nutritionPct != null && (
              <div className={styles.statBlock}>
                <span className={styles.statVal} style={{ color: '#ffb74d' }}>{weekStats.nutritionPct}%</span>
                <span className={styles.statLabel}>хранене</span>
              </div>
            )}
            <div className={styles.statBlock}>
              <span className={styles.statVal} style={{ color: '#66BB6A' }}>{weekStats.trainDays}</span>
              <span className={styles.statLabel}>тренировки</span>
            </div>
            {weekStats.habitPct != null && (
              <div className={styles.statBlock}>
                <span className={styles.statVal} style={{ color: '#AB47BC' }}>{weekStats.habitPct}%</span>
                <span className={styles.statLabel}>навици</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Macro targets from prep ── */}
      {plan?.dailyKcal && profile?.weight_kg && (
        <section className={styles.card}>
          <div className={styles.cardTitle}>МАКРОСИ ОТ ПРЕПА</div>
          {(() => {
            const m = macrosForKcal(plan.dailyKcal, profile.weight_kg)
            return (
              <>
                <div className={styles.macroRow}>
                  {[
                    { label: 'ККАЛ',    val: plan.dailyKcal, color: '#F06292' },
                    { label: 'ПРОТЕИН', val: `${m.protein}g`, color: '#66BB6A' },
                    { label: 'ВЪГЛ',    val: `${m.carbs}g`,  color: '#4FC3F7' },
                    { label: 'МАЗН',    val: `${m.fat}g`,    color: '#FFB74D' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className={styles.macroPill}>
                      <span className={styles.macroPillVal} style={{ color }}>{val}</span>
                      <span className={styles.macroPillLabel}>{label}</span>
                    </div>
                  ))}
                </div>
                <button
                  className={`${styles.applyMacroBtn} ${macroApplied ? styles.applyMacroBtnDone : ''}`}
                  type="button"
                  onClick={async () => {
                    await onApplyMacros({ calories: plan.dailyKcal, ...m })
                    setMacroApplied(true)
                    setTimeout(() => setMacroApplied(false), 3000)
                  }}
                >
                  {macroApplied ? '✓ ЗАПИСАНО В ХРАНЕНЕ' : 'ПРИЛОЖИ КЪМ ХРАНЕНЕ →'}
                </button>
              </>
            )
          })()}
        </section>
      )}

      {/* ── Weekly timeline ── */}
      {plan?.weeks?.length > 0 && (
        <section className={styles.card}>
          <div className={styles.cardTitle}>СЕДМИЧНА ПРОГРЕСИЯ</div>
          <div className={styles.timeline}>
            {[...plan.weeks].reverse().map(week => {
              const isCurrent = cw?.number === week.number
              const isPast    = week.weekEnd < today
              const diff = week.avgWeight != null
                ? Math.round((week.avgWeight - week.targetWeight) * 10) / 10
                : null

              return (
                <div key={week.number} className={`${styles.timelineRow} ${isCurrent ? styles.timelineRowCurrent : ''} ${isPast ? styles.timelineRowPast : ''}`}>
                  <div className={styles.timelineWeek}>
                    <span className={styles.timelineWeekNum}>С{week.number}</span>
                    <span className={styles.timelineWeeksOut}>{week.weeksOut} out</span>
                  </div>
                  <div className={styles.timelineDates}>{fmtShort(week.weekStart)}–{fmtShort(week.weekEnd)}</div>
                  <div className={styles.timelineTarget}>{week.targetWeight} кг</div>
                  <div className={styles.timelineActual}>
                    {week.avgWeight != null ? (
                      <span className={diff > 0.2 ? styles.behind : diff < -0.2 ? styles.ahead : styles.onTrack}>
                        {week.avgWeight} кг
                      </span>
                    ) : (
                      <span className={styles.empty}>—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Protocol notes ── */}
      <section className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>ПРОТОКОЛ БЕЛЕЖКИ</span>
          <button className={styles.editBtn} onClick={() => setNotesMode(m => !m)} type="button">
            {notesMode ? 'ОТКАЗ' : 'РЕДАКТИРАЙ'}
          </button>
        </div>

        {notesMode ? (
          <div className={styles.notesEdit}>
            {[
              { key: 'cardio_notes',      label: 'КАРДИО' },
              { key: 'supplement_notes',  label: 'ДОБАВКИ' },
              { key: 'general_notes',     label: 'БЕЛЕЖКИ' },
            ].map(({ key, label }) => (
              <div key={key} className={styles.notesField}>
                <label className={styles.label}>{label}</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder={key === 'cardio_notes' ? 'Без кардио / 3×30мин LISS...' : ''}
                  value={notes[key]}
                  onChange={e => setNotes(p => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
            <button className={styles.saveNotesBtn} onClick={saveNotes} type="button">
              {notesSaved ? '✓ ЗАПАЗЕНО' : 'ЗАПАЗИ'}
            </button>
          </div>
        ) : (
          <div className={styles.notesView}>
            {[
              { label: 'Кардио',    val: prep.cardio_notes     },
              { label: 'Добавки',   val: prep.supplement_notes },
              { label: 'Бележки',   val: prep.general_notes    },
            ].map(({ label, val }) => val ? (
              <div key={label} className={styles.notesItem}>
                <span className={styles.notesItemLabel}>{label}:</span>
                <span className={styles.notesItemVal}>{val}</span>
              </div>
            ) : null)}
            {!prep.cardio_notes && !prep.supplement_notes && !prep.general_notes && (
              <p className={styles.notesEmpty}>Добави бележки към протокола →</p>
            )}
          </div>
        )}
      </section>

      {/* ── End prep ── */}
      <section className={styles.card}>
        {!showEnd ? (
          <button className={styles.endBtn} onClick={() => setShowEnd(true)} type="button">
            Приключи препа
          </button>
        ) : (
          <div className={styles.endConfirm}>
            <p className={styles.endConfirmText}>Сигурен ли си? Препът ще бъде архивиран.</p>
            <div className={styles.endConfirmBtns}>
              <button className={styles.endConfirmYes} onClick={onEnd} type="button">ДА, ПРИКЛЮЧИ</button>
              <button className={styles.endConfirmNo} onClick={() => setShowEnd(false)} type="button">ОТКАЗ</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────
export default function PrepProtocol() {
  const { profile, updateProfile } = useAuth()
  const {
    prep, plan, weightLogs, weekStats, loading,
    createPrep, updatePrep, endPrep, logMorningWeight, applyReforecast,
  } = usePrepProtocol()

  async function handleApplyMacros({ calories, protein, carbs, fat }) {
    await updateProfile({ calories, protein, carbs, fat })
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingDot} />
      </div>
    )
  }

  if (!prep) {
    return <PrepSetup onSave={createPrep} profile={profile} />
  }

  return (
    <PrepDashboard
      prep={prep}
      plan={plan}
      weightLogs={weightLogs}
      weekStats={weekStats}
      onUpdate={{ updatePrep, _logWeight: logMorningWeight }}
      onEnd={endPrep}
      onReforecast={applyReforecast}
      profile={profile}
      onApplyMacros={handleApplyMacros}
    />
  )
}
