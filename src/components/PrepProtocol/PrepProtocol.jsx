import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { usePrepProtocol, todayStr, dayFromIso, addDays, bmrFor, tdeeFor, timelineCheck } from '../../hooks/usePrepProtocol'
import PeakWeek from '../PeakWeek/PeakWeek'
import styles from './PrepProtocol.module.css'
import { loc } from '../../utils/locale'

// ── helpers ──────────────────────────────────────────────────────────

// Contest prep formula: 2.5g protein/kg to preserve muscle during cut
// Fat: 26% of kcal (supports hormonal balance — testosterone production needs dietary fat)
// Carbs: remainder
function macrosForKcal(kcal, weightKg) {
  const protein = Math.round(weightKg * 2.5)
  const fat     = Math.round((kcal * 0.26) / 9)
  const carbs   = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { protein, fat, carbs }
}

function fmtDate(iso) {
  if (!iso) return ''
  return dayFromIso(iso).toLocaleDateString(loc(), { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtShort(iso) {
  if (!iso) return ''
  return dayFromIso(iso).toLocaleDateString(loc(), { day: '2-digit', month: '2-digit' })
}

/** Седемте дни на седмицата, каквато е тя — а тя не започва в понеделник. */
function weekDaysFrom(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/* Буквата на деня се чете от самата дата, не от мястото в реда.
   Дотук клетките бяха надписани ПН…НД по индекс, а седмиците на протокола
   тръгват от деня, в който е започната подготовката. Започнеш ли в сряда,
   първата клетка е сряда и пишеше „ПН". Отделно променливата се казваше
   DAY_LABELS, а дефинираната беше DAY_LABEL_KEYS — оттам гърмеше екранът. */
function dowKey(iso) {
  return `daysMon.${(dayFromIso(iso).getDay() + 6) % 7}`
}

// ── Setup form ───────────────────────────────────────────────────────
function PrepSetup({ onSave, profile }) {
  const { t } = useSettings()
  const today = todayStr()
  const [form, setForm] = useState({
    competition_name: '',
    competition_date: '',
    target_weight:    '',
    start_weight:     profile?.weight_kg ? String(profile.weight_kg) : '',
    tdee:             '',
    ready_weeks:      2,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  // Една формула, споделена с протокола — две копия се разминават до месец.
  const suggestedTDEE = tdeeFor(profile)

  /* Стига ли срокът — на живо, докато човек пише.
     Дотук единствената проверка беше „датата да е в бъдещето", тоест 15 кг за
     8 седмици минаваше без дума. Подът при базовия обмен после хващаше
     симптома, но не казваше, че болестта е срокът. */
  const weeksTotal = form.competition_date
    ? Math.ceil((dayFromIso(form.competition_date) - dayFromIso(today)) / 86400000 / 7)
    : 0
  const activeWeeks = Math.max(0, weeksTotal - form.ready_weeks)
  const check = timelineCheck({
    startWeight:  parseFloat(form.start_weight),
    targetWeight: parseFloat(form.target_weight),
    activeWeeks,
    gender: profile?.gender,
  })
  // Откога трябваше да се тръгне, за да излезе при безопасно темпо.
  const shouldStart = check && !check.ok
    ? addDays(form.competition_date, -(check.weeksNeeded + form.ready_weeks) * 7)
    : null

  async function handleSave(e) {
    e.preventDefault()
    if (!form.competition_date || !form.target_weight || !form.start_weight) {
      setError(t('pp.err.fill')); return
    }
    if (form.competition_date <= today) {
      setError(t('pp.err.future')); return
    }
    setSaving(true); setError('')
    const { error: err } = await onSave({
      competition_name: form.competition_name || null,
      competition_date: form.competition_date,
      target_weight:    parseFloat(form.target_weight),
      start_weight:     parseFloat(form.start_weight),
      start_date:       today,
      ready_weeks:      form.ready_weeks,
      tdee:             parseInt(form.tdee) || suggestedTDEE || null,
    })
    setSaving(false)
    if (err) {
      const msg = err.message || ''
      if (msg.includes('Load failed') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError(t('pp.err.network'))
      } else if (msg.includes('schema') || msg.includes('relation') || msg.includes('does not exist')) {
        setError(t('pp.err.schemaCache'))
      } else {
        setError(msg || t('pp.err.save'))
      }
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.accentBar} />
          <div>
            <h1 className={styles.title}>{t('pp.title')}</h1>
            <p className={styles.subtitle}>{t('pp.subtitle')}</p>
          </div>
        </div>
      </header>

      <form className={styles.setupForm} onSubmit={handleSave}>
        <div className={styles.setupSection}>
          <label className={styles.label}>{t('pp.stage')}</label>
          <input className={styles.input} type="text"
            placeholder={t('pp.stagePh')}
            value={form.competition_name}
            onChange={e => set('competition_name', e.target.value)} />
        </div>

        <div className={styles.setupSection}>
          <label className={styles.label}>{t('pp.showDate')}</label>
          <input className={styles.input} type="date"
            value={form.competition_date}
            onChange={e => set('competition_date', e.target.value)}
            min={today} required />
        </div>

        <div className={styles.setupGrid}>
          <div className={styles.setupSection}>
            <label className={styles.label}>{t('pp.currentWeight')}</label>
            <input className={styles.input} type="number" step="0.1" min="40" max="200"
              placeholder="77.6"
              value={form.start_weight}
              onChange={e => set('start_weight', e.target.value)} required />
          </div>
          <div className={styles.setupSection}>
            <label className={styles.label}>{t('pp.stageWeight')}</label>
            <input className={styles.input} type="number" step="0.1" min="40" max="200"
              placeholder="75.0"
              value={form.target_weight}
              onChange={e => set('target_weight', e.target.value)} required />
          </div>
        </div>

        <div className={styles.setupSection}>
          <label className={styles.label}>
            {t('pp.tdee')}
            {suggestedTDEE && <span className={styles.labelHint}>{t('pp.tdeeHint', { n: suggestedTDEE })}</span>}
          </label>
          <input className={styles.input} type="number" min="1200" max="6000"
            placeholder={suggestedTDEE ? String(suggestedTDEE) : '2600'}
            value={form.tdee}
            onChange={e => set('tdee', e.target.value)} />
          <span className={styles.fieldNote}>{t('pp.tdeeNote')}</span>
        </div>

        <div className={styles.setupSection}>
          <label className={styles.label}>{t('pp.readyWeeks')}</label>
          <div className={styles.readyRow}>
            {[1, 2, 3].map(n => (
              <button key={n} type="button"
                className={`${styles.readySeg} ${form.ready_weeks === n ? styles.readySegOn : ''}`}
                onClick={() => set('ready_weeks', n)}>{n}</button>
            ))}
          </div>
          <span className={styles.fieldNote}>{t('pp.readyWeeksHint')}</span>
        </div>

        {/* Срокът е грешка №1 на подготовките, и е грешка, която се вижда още
            тук — преди да са минали дванайсет седмици по нея. */}
        {check && (
          <p className={check.ok ? styles.rateOk : styles.rateWarn}>
            {check.ok
              ? t('pp.rate.ok', { n: check.ratePct, safe: check.safePct })
              : t('pp.rate.short', {
                  n: check.ratePct, safe: check.safePct,
                  w: check.weeksShort, d: fmtDate(shouldStart),
                })}
          </p>
        )}

        {error && <p className={styles.errorMsg}>{error}</p>}

        <button className={styles.startBtn} type="submit" disabled={saving}>
          {saving ? t('pp.starting') : t('pp.startPrep')}
        </button>
      </form>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────
function PrepDashboard({ prep, plan, weightLogs, weekStats, onUpdate, onEnd, profile, onApplyMacros }) {
  const { t } = useSettings()
  const today = todayStr()
  const [weightInput, setWeightInput]     = useState('')
  const [weightSaved, setWeightSaved]     = useState(false)
  const [showEnd,     setShowEnd]         = useState(false)
  const [notesMode,   setNotesMode]       = useState(false)
  const [macroApplied, setMacroApplied]   = useState(false)
  const [tdeeInput,    setTdeeInput]      = useState('')
  const [tdeeSaved,    setTdeeSaved]      = useState(false)
  const [notes, setNotes] = useState({
    cardio_notes:      prep.cardio_notes     ?? '',
    supplement_notes:  prep.supplement_notes ?? '',
    general_notes:     prep.general_notes    ?? '',
  })
  const [notesSaved, setNotesSaved] = useState(false)

  const cw      = plan?.currentWeek

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

  const weekDays = cw ? weekDaysFrom(cw.weekStart) : []

  return (
    <div className={styles.page}>
      {/* ── Header countdown ── */}
      <header className={styles.dashHeader}>
        {prep.competition_name && <p className={styles.compName}>{prep.competition_name}</p>}
        {plan?.weeksOut != null ? (
          <div className={styles.countdownBlock}>
            <span className={styles.countdownNum}>{plan.weeksOut}</span>
            <span className={styles.countdownSub}>{plan.weeksOut === 1 ? t('pp.week') : t('pp.weeks')} {t('pp.toStage')}</span>
          </div>
        ) : (
          <p className={styles.countdown}>—</p>
        )}
        <p className={styles.compDate}>{fmtDate(prep.competition_date)}</p>

        <p className={styles.targetLine}>
          {prep.start_weight} → {prep.target_weight} {t('unit.kg')}{plan?.dailyKcal ? ` · ${plan.dailyKcal} ${t('unit.kcal')}/${t('bg.perDay').split(' ').pop()}` : ''}
        </p>
      </header>

      {/* ── Темпо ──
          Планът е запис: начертан е в началото и не се пипа, за да може
          въпросът „бях ли в графика в трета седмица" да има отговор. Темпото е
          сметка и се мени всеки ден: от последното мерене до целта, за дните,
          които остават. Затова двете стоят едно до друго. */}
      {plan?.pace && (
        <section className={`${styles.card} ${styles.paceCard}`}>
          <div className={styles.cardTitle}>{t('pp.pace')}</div>
          <div className={styles.macroRow}>
            <div className={styles.macroPill}>
              <span className={styles.macroPillVal}>{plan.pace.kgLeft} {t('unit.kg')}</span>
              <span className={styles.macroPillLabel}>{t('pp.paceLeft')}</span>
            </div>
            <div className={styles.macroPill}>
              <span className={styles.macroPillVal}>{plan.pace.kgPerWeek}</span>
              <span className={styles.macroPillLabel}>{t('pp.pacePerWeek')}</span>
            </div>
            {plan.pace.dailyKcal != null && (
              <div className={styles.macroPill}>
                <span className={`${styles.macroPillVal} ${styles.macroPillValAccent}`}>{plan.pace.dailyKcal}</span>
                <span className={styles.macroPillLabel}>{t('pp.paceKcal')}</span>
              </div>
            )}
          </div>
          {plan.offBy != null && (
            <p className={styles.paceNote}>
              {t('pp.offBy', { sign: plan.offBy > 0 ? '+' : '', diff: plan.offBy })}
            </p>
          )}
          {plan.timeline && !plan.timeline.ok && (
            <p className={styles.paceWarn}>
              {t('pp.rate.shortNow', {
                n: plan.timeline.ratePct,
                safe: plan.timeline.safePct,
                w: plan.timeline.weeksShort,
              })}
            </p>
          )}
          {plan.kcalFloored && (
            /* Аритметиката не знае, че под базовия обмен не се живее. */
            <p className={styles.paceWarn}>{t('pp.kcalFloor', { n: plan.kcalFloored })}</p>
          )}
        </section>
      )}

      {/* ── This week card ── */}
      {cw && (
        <section className={styles.card}>
          <div className={styles.cardTitle}>{t('pp.wk', { n: cw.number })} · {fmtShort(cw.weekStart)}–{fmtShort(cw.weekEnd)}</div>

          <div className={styles.weekMetrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>{t('pp.avgWeight')}</span>
              <span className={styles.metricVal}>
                {cw.avgWeight != null ? `${cw.avgWeight} ${t('unit.kg')}` : '—'}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>{t('pp.goal')}</span>
              <span className={styles.metricVal}>{cw.targetWeight} {t('unit.kg')}</span>
            </div>
            {cw.avgWeight != null && (
              <div className={styles.metric}>
                <span className={styles.metricLabel}>{t('pp.diff')}</span>
                <span className={`${styles.metricVal} ${cw.avgWeight > cw.targetWeight ? styles.metricBehind : styles.metricAhead}`}>
                  {cw.avgWeight > cw.targetWeight ? '+' : ''}{Math.round((cw.avgWeight - cw.targetWeight) * 10) / 10} {t('unit.kg')}
                </span>
              </div>
            )}
          </div>

          {/* 7-day weigh-in grid */}
          <div className={styles.weekGrid}>
            {weekDays.map(d => {
              const entry  = weightLogs.find(w => w.date === d)
              const isPast = d <= today
              const isToday = d === today
              return (
                <div key={d} className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ''} ${!isPast ? styles.dayCellFuture : ''}`}>
                  <span className={`${styles.dayLabel} ${isToday ? styles.dayCellDark : ''}`}>{t(dowKey(d))}</span>
                  <span className={`${styles.dayWeight} ${isToday ? styles.dayCellDark : ''}`}>{entry ? entry.kg : '·'}</span>
                </div>
              )
            })}
          </div>

          {/* Log today's weight */}
          <form className={styles.logForm} onSubmit={handleWeightLog}>
            <input
              className={styles.logInput}
              type="number" step="0.1" min="30" max="300"
              placeholder={todayWeight ? String(todayWeight.kg) : t('pp.morningWeightPh')}
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
            />
            <button className={`${styles.logBtn} ${weightSaved ? styles.logBtnSaved : ''}`} type="submit">
              {weightSaved ? '✓' : t('pp.record')}
            </button>
          </form>
        </section>
      )}

      {/* ── Cross-tab stats ── */}
      {weekStats && (
        <section className={styles.card}>
            <div className={styles.statsRow}>
            {weekStats.onTargetDays != null && (
              <div className={styles.statBlock}>
                <span className={styles.statVal}>{weekStats.onTargetDays}/{weekStats.loggedDays}</span>
                <span className={styles.statLabel}>{t('pp.food')}</span>
              </div>
            )}
            <div className={styles.statBlock}>
              <span className={styles.statVal}>{weekStats.trainDays}</span>
              <span className={styles.statLabel}>{t('pp.trainings')}</span>
            </div>
            {weekStats.habitPct != null && (
              <div className={styles.statBlock}>
                <span className={styles.statVal}>{weekStats.habitPct}%</span>
                <span className={styles.statLabel}>{t('pp.habits')}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Macro targets from prep ── */}
      <section className={styles.card}>
        <div className={styles.cardTitle}>{t('pp.macros')}</div>
        {!plan?.dailyKcal ? (
          <div className={styles.tdeeSetup}>
            <p className={styles.tdeeSetupNote}>{t('pp.tdeeSetupNote')}</p>
            <form className={styles.logForm} onSubmit={async e => {
              e.preventDefault()
              const v = parseInt(tdeeInput)
              if (!v || v < 1200 || v > 6000) return
              const { error } = await onUpdate.updatePrep({ tdee: v })
              if (!error) {
                setTdeeSaved(true)
                setTdeeInput('')
                setTimeout(() => setTdeeSaved(false), 2000)
              }
            }}>
              <input
                className={styles.logInput}
                type="number"
                min="1200"
                max="6000"
                placeholder={t('pp.tdeePh')}
                value={tdeeInput}
                onChange={e => setTdeeInput(e.target.value)}
              />
              <button className={`${styles.logBtn} ${tdeeSaved ? styles.logBtnSaved : ''}`} type="submit">
                {tdeeSaved ? '✓' : t('pp.save')}
              </button>
            </form>
          </div>
        ) : !profile?.weight_kg ? (
          <p className={styles.tdeeSetupNote}>{t('pp.weightSetupNote')}</p>
        ) : (
          (() => {
            /* Протеинът е 2.5 г на килограм — на кой килограм обаче. Полето в
               профила е попълнено веднъж и стои; подготовката мери всяка
               сутрин. Ако човек е свалил осем кила, старото поле иска двайсет
               грама протеин, които вече не му трябват. */
            const kg = plan.latestWeight ?? profile.weight_kg
            const m = macrosForKcal(plan.dailyKcal, kg)
            return (
              <>
                <div className={styles.macroRow}>
                  {[
                    { label: t('pp.macro.kcal'),    val: plan.dailyKcal, accent: true },
                    { label: t('pp.macro.protein'), val: `${m.protein}g` },
                    { label: t('pp.macro.carbs'),   val: `${m.carbs}g`  },
                    { label: t('pp.macro.fat'),     val: `${m.fat}g`    },
                  ].map(({ label, val, accent }) => (
                    <div key={label} className={styles.macroPill}>
                      <span className={accent ? `${styles.macroPillVal} ${styles.macroPillValAccent}` : styles.macroPillVal}>{val}</span>
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
                  {macroApplied ? t('pp.macroApplied') : t('pp.macroApply')}
                </button>
              </>
            )
          })()
        )}
      </section>

      {/* ── Weekly timeline ── */}
      {plan?.weeks?.length > 0 && (
        <section className={styles.card}>
          <div className={styles.cardTitle}>{t('pp.weeklyProgress')}</div>
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
                    <span className={styles.timelineWeekNum}>{t('pp.wk', { n: week.number })}</span>
                    <span className={styles.timelineWeeksOut}>{t('pp.weeksOutShort', { n: week.weeksOut })}</span>
                  </div>
                  <div className={styles.timelineDates}>{fmtShort(week.weekStart)}–{fmtShort(week.weekEnd)}</div>
                  <div className={styles.timelineTarget}>
                    {week.targetWeight} {t('unit.kg')}
                    {week.isBuffer && <span className={styles.bufferTag}>{t('pp.buffer')}</span>}
                  </div>
                  <div className={styles.timelineActual}>
                    {week.avgWeight != null ? (
                      <span className={diff > 0.2 ? styles.behind : diff < -0.2 ? styles.ahead : styles.onTrack}>
                        {week.avgWeight} {t('unit.kg')}
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
          <span className={styles.cardTitle}>{t('pp.notes')}</span>
          <button className={styles.editBtn} onClick={() => setNotesMode(m => !m)} type="button">
            {notesMode ? t('pp.cancel') : t('pp.edit')}
          </button>
        </div>

        {notesMode ? (
          <div className={styles.notesEdit}>
            {[
              { key: 'cardio_notes',      label: t('pp.notes.cardio') },
              { key: 'supplement_notes',  label: t('pp.notes.supp') },
              { key: 'general_notes',     label: t('pp.notes.general') },
            ].map(({ key, label }) => (
              <div key={key} className={styles.notesField}>
                <label className={styles.label}>{label}</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder={key === 'cardio_notes' ? t('pp.cardioPh') : ''}
                  value={notes[key]}
                  onChange={e => setNotes(p => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
            <button className={styles.saveNotesBtn} onClick={saveNotes} type="button">
              {notesSaved ? t('pp.notesSaved') : t('pp.save')}
            </button>
          </div>
        ) : (
          <div className={styles.notesView}>
            {[
              { label: t('pp.notes.cardioR'),  val: prep.cardio_notes     },
              { label: t('pp.notes.suppR'),    val: prep.supplement_notes },
              { label: t('pp.notes.generalR'), val: prep.general_notes    },
            ].map(({ label, val }) => val ? (
              <div key={label} className={styles.notesItem}>
                <span className={styles.notesItemLabel}>{label}:</span>
                <span className={styles.notesItemVal}>{val}</span>
              </div>
            ) : null)}
            {!prep.cardio_notes && !prep.supplement_notes && !prep.general_notes && (
              <p className={styles.notesEmpty}>{t('pp.notesEmpty')}</p>
            )}
          </div>
        )}
      </section>

      {/* ── End prep ── */}
      <section className={styles.card}>
        {!showEnd ? (
          <button className={styles.endBtn} onClick={() => setShowEnd(true)} type="button">
            {t('pp.endPrep')}
          </button>
        ) : (
          <div className={styles.endConfirm}>
            <p className={styles.endConfirmText}>{t('pp.endConfirm')}</p>
            <div className={styles.endConfirmBtns}>
              <button className={styles.endConfirmYes} onClick={onEnd} type="button">{t('pp.endYes')}</button>
              <button className={styles.endConfirmNo} onClick={() => setShowEnd(false)} type="button">{t('pp.endNo')}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ── Пистата ───────────────────────────────────────────────────────────
/**
 * Дългата подготовка, свита в един ред.
 *
 * Страницата вече е на пиковата седмица. Подготовката обаче не е декор — тя е
 * причината пиковата седмица изобщо да може да работи: източникът е ясен, че
 * ако не си стигнал слаб навреме, седемте дни отгоре не спасяват нищо. Затова
 * тя остава, но свита: един ред, който казва колко остава и в графика ли си, и
 * се разгъва само когато някой го поиска.
 */
function PrepRunway({ prep, plan, children }) {
  const { t } = useSettings()
  const [open, setOpen] = useState(false)

  if (!prep) {
    return (
      <div className={styles.runway}>
        <button className={styles.runwayBar} type="button" onClick={() => setOpen(o => !o)}>
          <span className={styles.runwayLabel}>{t('pp.title')}</span>
          <span className={styles.runwayVal}>{t('pw.runway.none')}</span>
          <span className={styles.runwayChev}>{open ? '⌃' : '⌄'}</span>
        </button>
        {open && children}
      </div>
    )
  }

  const status = plan?.offBy == null ? t('pw.runway.onTrack')
    : plan.offBy > 0 ? t('pw.runway.behind', { n: plan.offBy })
    : t('pw.runway.ahead', { n: Math.abs(plan.offBy) })

  return (
    <div className={styles.runway}>
      <button className={styles.runwayBar} type="button" onClick={() => setOpen(o => !o)}>
        <span className={styles.runwayLabel}>{prep.competition_name || t('pp.title')}</span>
        <span className={styles.runwayVal}>
          {plan?.weeksOut != null && <>{t('pw.runway.weeks', { n: plan.weeksOut })} · </>}
          {plan?.pace?.kgLeft != null && <>{t('pw.runway.kg', { n: plan.pace.kgLeft })} · </>}
          <span className={plan?.offBy > 0 ? styles.runwayBehind : styles.runwayOk}>{status}</span>
        </span>
        <span className={styles.runwayChev}>{open ? '⌃' : '⌄'}</span>
      </button>
      {open && children}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────
/**
 * Страницата „Протокол" е пиковата седмица; подготовката е пистата към нея.
 */
export default function PrepProtocol() {
  const { profile, updateProfile } = useAuth()
  const {
    prep, plan, weightLogs, weekStats, loading,
    createPrep, updatePrep, endPrep, logMorningWeight,
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

  const runway = (
    <PrepRunway prep={prep} plan={plan}>
      {prep ? (
        <PrepDashboard
          prep={prep}
          plan={plan}
          weightLogs={weightLogs}
          weekStats={weekStats}
          onUpdate={{ updatePrep, _logWeight: logMorningWeight }}
          onEnd={endPrep}
          profile={profile}
          onApplyMacros={handleApplyMacros}
        />
      ) : (
        <PrepSetup onSave={createPrep} profile={profile} />
      )}
    </PrepRunway>
  )

  return <PeakWeek prep={prep} runway={runway} />
}
