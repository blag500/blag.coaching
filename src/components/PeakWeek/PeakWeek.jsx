import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { loc } from '../../utils/locale'
import { usePeakWeek } from '../../hooks/usePeakWeek'
import { tdeeFor } from '../../hooks/usePrepProtocol'
import { PHASE, ADJUST, CARB_MIN, CARB_MAX, VOLUME_CUT } from '../../utils/peakWeek'
import styles from './PeakWeek.module.css'

/**
 * Пиковата седмица.
 *
 * Страницата има една задача: да каже какво се прави днес и да улови кога
 * човекът е изглеждал както трябва. Всичко останало е контекст.
 *
 * Затова редът е такъв: колко дни остават → какво се прави днес → мерене и вид
 * → настройките на зареждането → правилата. Настройките са надолу нарочно.
 * Веднъж нагласени, те не се пипат цяла седмица, а горе стои това, което се
 * гледа по три пъти на ден.
 */

function fmtDay(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(loc(), { day: 'numeric', month: 'long' })
}

function dowKey(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return `daysMon.${(new Date(y, m - 1, d).getDay() + 6) % 7}`
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' })
}

// ── Настройка ────────────────────────────────────────────────────────

/**
 * Настройката.
 *
 * Групирана на три части, защото един списък от девет полета с обяснение под
 * всяко се чете като стена. Заглавията не са украса — те казват кое поле за
 * какво пита: шоуто, ти сега, зареждането.
 */
function PeakSetup({ onSave, profile, prep, suggestedCarbPerKg, latestKg }) {
  const { t } = useSettings()
  const [form, setForm] = useState({
    show_date:      prep?.competition_date ?? '',
    show_name:      prep?.competition_name ?? '',
    division:       '',
    weight_limit:   '',
    division_notes: '',
    weight:         latestKg != null ? String(latestKg) : '',
    tdee:           String(prep?.tdee ?? tdeeFor(profile) ?? ''),
    cardio_min:     '',
    carb_per_kg:    String(suggestedCarbPerKg ?? 5),
    load_days:      3,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const kg    = parseFloat(form.weight)
  const limit = parseFloat(form.weight_limit)
  const overLimit = Number.isFinite(limit) && Number.isFinite(kg) && kg > limit

  async function submit(e) {
    e.preventDefault()
    if (!form.show_date) { setError(t('pw.err.date')); return }
    if (!kg || kg < 30 || kg > 300) { setError(t('pw.err.weight')); return }
    setSaving(true); setError('')
    const { error: err } = await onSave({
      show_date:      form.show_date,
      show_name:      form.show_name || null,
      division:       form.division || null,
      weight_limit:   Number.isFinite(limit) ? limit : null,
      division_notes: form.division_notes || null,
      tdee:           parseInt(form.tdee) || null,
      cardio_min:     parseInt(form.cardio_min) || 0,
      carb_per_kg:    parseFloat(form.carb_per_kg) || 5,
      load_days:      Number(form.load_days),
      prep_id:        prep?.id ?? null,
    }, kg)
    setSaving(false)
    if (err) {
      /* Суровата грешка от Postgres не е за клиента. Най-честата тук е липсваща
         миграция или неопреснен schema кеш, и тя има име. */
      const msg = err.message || ''
      if (/schema cache|column|relation|does not exist/i.test(msg)) setError(t('pp.err.schemaCache'))
      else if (/Load failed|Failed to fetch|NetworkError/i.test(msg)) setError(t('pp.err.network'))
      else setError(msg || t('pw.err.save'))
    }
  }

  return (
    <form className={styles.setup} onSubmit={submit}>
      <div className={styles.group}>
        <div className={styles.groupTitle}>{t('pw.setup.gShow')}</div>

        <div className={styles.field}>
          <label className={styles.label}>{t('pw.setup.showDate')}</label>
          <input className={styles.input} type="date" required
            value={form.show_date} onChange={e => set('show_date', e.target.value)} />
          <span className={styles.hint}>{t('pw.setup.showDateHint')}</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('pw.setup.showName')}</label>
          <input className={styles.input} type="text" placeholder={t('pw.setup.showNamePh')}
            value={form.show_name} onChange={e => set('show_name', e.target.value)} />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('pw.setup.division')}</label>
          <input className={styles.input} type="text" placeholder={t('pw.setup.divisionPh')}
            value={form.division} onChange={e => set('division', e.target.value)} />
        </div>

        {/* Лимитът се въвежда, не се изчислява: таблиците по височина се
            различават по федерация и по година, а числото, което треньорът
            знае, е точно. */}
        <div className={styles.field}>
          <label className={styles.label}>{t('pw.setup.limit')}</label>
          <input className={styles.input} type="number" inputMode="decimal" step="0.1"
            min="30" max="200" placeholder={t('pw.setup.limitPh')}
            value={form.weight_limit} onChange={e => set('weight_limit', e.target.value)} />
          <span className={styles.hint}>{t('pw.setup.limitHint')}</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('pw.setup.divisionNotes')}</label>
          <textarea className={styles.textarea} rows={3}
            placeholder={t('pw.setup.divisionNotesPh')}
            value={form.division_notes} onChange={e => set('division_notes', e.target.value)} />
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupTitle}>{t('pw.setup.gYou')}</div>

        <div className={styles.field}>
          <label className={styles.label}>{t('pw.setup.weight')}</label>
          <input className={styles.input} type="number" inputMode="decimal" step="0.1"
            min="30" max="300" required
            value={form.weight} onChange={e => set('weight', e.target.value)} />
          <span className={styles.hint}>{t('pw.setup.weightHint')}</span>
        </div>

        {/* Предупреждението стои под цялото поле, не между него и обяснението
            му — иначе обяснението изглежда като част от тревогата. */}
        {overLimit && (
          <p className={styles.warn}>
            {t('pw.setup.overLimit', { n: Math.round((kg - limit) * 10) / 10 })}
          </p>
        )}

        <div className={styles.field}>
          <label className={styles.label}>{t('pw.setup.tdee')}</label>
          <input className={styles.input} type="number" inputMode="numeric" min="1200" max="6000"
            value={form.tdee} onChange={e => set('tdee', e.target.value)} />
          <span className={styles.hint}>{t('pw.setup.tdeeHint')}</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('pw.setup.cardio')}</label>
          <input className={styles.input} type="number" inputMode="numeric" min="0" max="180"
            placeholder="0"
            value={form.cardio_min} onChange={e => set('cardio_min', e.target.value)} />
          <span className={styles.hint}>{t('pw.setup.cardioHint')}</span>
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupTitle}>{t('pw.setup.gLoad')}</div>

        <div className={styles.field}>
          <label className={styles.label}>{t('pw.setup.perKg')}</label>
          <input className={styles.input} type="number" inputMode="decimal" step="0.1"
            min={CARB_MIN} max={CARB_MAX}
            value={form.carb_per_kg} onChange={e => set('carb_per_kg', e.target.value)} />
          <span className={styles.hint}>
            {t('pw.setup.perKgHint')}
            {Number.isFinite(kg) && form.carb_per_kg
              ? ' \u00b7 ' + t('pw.setup.perKgCalc', { n: Math.round(kg * parseFloat(form.carb_per_kg)) })
              : ''}
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('pw.setup.loadDays')}</label>
          <div className={styles.segRow}>
            {[2, 3].map(n => (
              <button key={n} type="button"
                className={`${styles.seg} ${Number(form.load_days) === n ? styles.segOn : ''}`}
                onClick={() => set('load_days', n)}>{n}</button>
            ))}
          </div>
          <span className={styles.hint}>{t('pw.setup.loadDaysHint')}</span>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.primaryBtn} type="submit" disabled={saving}>
        {saving ? '\u2026' : t('pw.setup.start')}
      </button>
    </form>
  )
}

// ── Лентата с осемте дни ─────────────────────────────────────────────

function DayStrip({ plan, selected, today, onSelect }) {
  const { t } = useSettings()
  const ref = useRef(null)

  // Днешният ден се докарва във видимото при отваряне — на телефон лентата
  // излиза извън екрана и денят по средата на седмицата остава скрит.
  useEffect(() => {
    const el = ref.current?.querySelector(`[data-d="${selected}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [selected])

  return (
    <div className={styles.strip} ref={ref}>
      {plan.days.map(d => (
        <button
          key={d.date}
          type="button"
          data-d={d.date}
          className={[
            styles.stripDay,
            styles[`ph_${d.phase}`],
            d.date === selected ? styles.stripOn : '',
            d.date === today ? styles.stripToday : '',
            d.date < today ? styles.stripPast : '',
          ].filter(Boolean).join(' ')}
          onClick={() => onSelect(d.date)}
        >
          <span className={styles.stripDow}>{t(dowKey(d.date))}</span>
          <span className={styles.stripNum}>{d.daysOut === 0 ? '★' : d.daysOut}</span>
        </button>
      ))}
    </div>
  )
}

// ── Мерене през деня ─────────────────────────────────────────────────

function LookCard({ pw }) {
  const { t } = useSettings()
  const { user } = useAuth()
  const { today, todayLogs, morning, lookWeight, addLog, removeLog, markLook, week } = pw

  const [kg, setKg]         = useState('')
  const [busy, setBusy]     = useState(false)
  const [upBusy, setUpBusy] = useState(false)
  const fileRef = useRef(null)

  async function record(isLook) {
    const v = parseFloat(kg)
    if (!v || v < 30 || v > 300) return
    setBusy(true)
    await addLog({ kg: v, isLook })
    setKg('')
    setBusy(false)
  }

  async function upload(file) {
    if (!file || !user) return
    setUpBusy(true)
    const ext  = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/peak/${today}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('form-checkins').upload(path, file, { contentType: file.type, upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('form-checkins').getPublicUrl(path)
      const v = parseFloat(kg)
      await addLog({ kg: Number.isFinite(v) ? v : null, photoUrl: data.publicUrl })
      setKg('')
    }
    setUpBusy(false)
  }

  return (
    <section className={`${styles.card} ${styles.lookCard}`}>
      <div className={styles.cardTitle}>{t('pw.look')}</div>
      <p className={styles.note}>{t('pw.lookNote')}</p>

      <div className={styles.lookRow}>
        <div className={styles.lookCell}>
          <span className={styles.lookVal}>{lookWeight != null ? lookWeight : '—'}</span>
          <span className={styles.lookLabel}>{t('pw.lookTarget')}</span>
        </div>
        <div className={styles.lookCell}>
          <span className={styles.lookValSm}>{morning?.kg ?? '—'}</span>
          <span className={styles.lookLabel}>{t('pw.morning')}</span>
        </div>
        {lookWeight != null && morning?.kg != null && (
          <div className={styles.lookCell}>
            <span className={styles.lookValSm}>
              {Math.round((lookWeight - morning.kg) * 10) / 10 > 0 ? '+' : ''}
              {Math.round((lookWeight - morning.kg) * 10) / 10}
            </span>
            <span className={styles.lookLabel}>{t('pw.toGain')}</span>
          </div>
        )}
      </div>

      <div className={styles.measureRow}>
        <input
          className={styles.input}
          type="number" inputMode="decimal" step="0.1" min="30" max="300"
          placeholder={t('pw.measurePh')}
          value={kg}
          onChange={e => setKg(e.target.value)}
        />
        <button className={styles.ghostBtn} type="button" disabled={busy || !kg}
          onClick={() => record(false)}>{t('pw.record')}</button>
        <button className={styles.lookBtn} type="button" disabled={busy || !kg}
          onClick={() => record(true)} title={t('pw.thisIsIt')}>★</button>
      </div>

      <button className={styles.photoBtn} type="button" disabled={upBusy}
        onClick={() => fileRef.current?.click()}>
        {upBusy ? '…' : t('pw.addPhoto')}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />

      {todayLogs.length > 0 ? (
        <ul className={styles.logList}>
          {todayLogs.map(l => (
            <li key={l.id} className={`${styles.logItem} ${l.is_look ? styles.logLook : ''}`}>
              <span className={styles.logTime}>{fmtTime(l.logged_at)}</span>
              {l.photo_url && <img className={styles.logThumb} src={l.photo_url} alt="" loading="lazy" />}
              <span className={styles.logKg}>{l.kg != null ? `${l.kg} ${t('unit.kg')}` : '—'}</span>
              <button className={styles.logStar} type="button"
                onClick={() => markLook(l.id, !l.is_look)}
                aria-label={t('pw.thisIsIt')}>{l.is_look ? '★' : '☆'}</button>
              <button className={styles.logDel} type="button"
                onClick={() => removeLog(l.id)} aria-label={t('pw.remove')}>×</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t('pw.noLogs')}</p>
      )}

      {week?.look_weight == null && lookWeight != null && (
        <button className={styles.pinBtn} type="button"
          onClick={() => pw.updateWeek({ look_weight: lookWeight })}>
          {t('pw.pinLook', { n: lookWeight })}
        </button>
      )}
    </section>
  )
}

/**
 * Категорията и нейният таван.
 *
 * Стои високо, защото при категория с лимит тя мени смисъла на всичко под нея:
 * зареждането качва два-три килограма за три дни, и при таван това е разликата
 * между да излезеш и да те претеглят извън класа.
 */
function DivisionCard({ week, latestKg, lookWeight }) {
  const { t } = useSettings()
  if (!week.division && week.weight_limit == null && !week.division_notes) return null

  const limit = week.weight_limit
  const over  = limit != null && latestKg != null
    ? Math.round((latestKg - limit) * 10) / 10
    : null
  const lookOver = limit != null && lookWeight != null
    ? Math.round((lookWeight - limit) * 10) / 10
    : null

  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>{t('pw.division')}</div>
      {week.division && <p className={styles.divisionName}>{week.division}</p>}

      {limit != null && (
        <div className={styles.lookRow}>
          <div className={styles.lookCell}>
            <span className={styles.lookValSm}>{limit}</span>
            <span className={styles.lookLabel}>{t('pw.limit')}</span>
          </div>
          {over != null && (
            <div className={styles.lookCell}>
              <span className={`${styles.lookValSm} ${over > 0 ? styles.overLimit : styles.underLimit}`}>
                {over > 0 ? '+' : ''}{over}
              </span>
              <span className={styles.lookLabel}>{t('pw.vsLimitNow')}</span>
            </div>
          )}
          {lookOver != null && (
            <div className={styles.lookCell}>
              <span className={`${styles.lookValSm} ${lookOver > 0 ? styles.overLimit : styles.underLimit}`}>
                {lookOver > 0 ? '+' : ''}{lookOver}
              </span>
              <span className={styles.lookLabel}>{t('pw.vsLimitLook')}</span>
            </div>
          )}
        </div>
      )}

      {limit != null && lookOver != null && lookOver > 0 && (
        /* Зареждането качва тегло нарочно. При таван това трябва да се каже
           преди петък, не в събота на кантара. */
        <p className={styles.warn}>{t('pw.limitWarn', { n: lookOver })}</p>
      )}

      {week.division_notes && <p className={styles.divisionNotes}>{week.division_notes}</p>}
    </section>
  )
}

// ── Денят ────────────────────────────────────────────────────────────

function DayCard({ day, pw, onApplyMacros }) {
  const { t } = useSettings()
  const [applied, setApplied] = useState(false)
  const done = pw.doneFor(day.date)
  const isToday = day.date === pw.today

  const checks = [
    day.carbs != null && { id: 'food',  label: t('pw.done.food') },
    day.training === 'deload' ? { id: 'train', label: t('pw.done.train') } : { id: 'rest', label: t('pw.done.rest') },
    day.steps && { id: 'steps', label: t('pw.done.steps', { n: day.steps.toLocaleString(loc()) }) },
  ].filter(Boolean)

  return (
    <section className={styles.card}>
      <div className={styles.dayHead}>
        <div>
          <div className={`${styles.phaseTag} ${styles[`tag_${day.phase}`]}`}>{t(`pw.phase.${day.phase}`)}</div>
          <div className={styles.dayDate}>{t(dowKey(day.date))} · {fmtDay(day.date)}</div>
        </div>
        <div className={styles.dayOut}>
          {day.daysOut === 0 ? t('pw.showToday') : day.daysOut === 1 ? t('pw.tomorrow') : day.daysOut}
        </div>
      </div>

      <p className={styles.note}>{t(`pw.phaseNote.${day.phase}`)}</p>

      {/* Храна */}
      {day.carbs != null ? (
        <>
          <div className={styles.macroRow}>
            {[
              { k: 'pp.macro.carbs',   v: `${day.carbs}g`,   accent: day.phase === PHASE.load },
              { k: 'pp.macro.protein', v: `${day.protein}g` },
              { k: 'pp.macro.fat',     v: `${day.fat}g` },
              { k: 'pp.macro.kcal',    v: day.kcal },
            ].map(({ k, v, accent }) => (
              <div key={k} className={styles.macro}>
                <span className={`${styles.macroVal} ${accent ? styles.macroAccent : ''}`}>{v}</span>
                <span className={styles.macroLabel}>{t(k)}</span>
              </div>
            ))}
          </div>
          {isToday && (
            <button
              className={`${styles.applyBtn} ${applied ? styles.applyDone : ''}`}
              type="button"
              onClick={async () => {
                await onApplyMacros({
                  calories: day.kcal, protein: day.protein, carbs: day.carbs, fat: day.fat,
                })
                setApplied(true)
                setTimeout(() => setApplied(false), 3000)
              }}
            >
              {applied ? t('pw.applied') : t('pw.apply')}
            </button>
          )}
        </>
      ) : (
        <p className={styles.warn}>{t('pw.noTdee')}</p>
      )}

      {/* Тренировка и стъпки */}
      <div className={styles.lineRow}>
        <span className={styles.lineLabel}>{t('pw.training')}</span>
        <span className={styles.lineVal}>
          {day.training === 'rest'
            ? t('pw.train.rest')
            : t('pw.train.deload', { n: Math.round(VOLUME_CUT * 100) })}
        </span>
      </div>
      {day.steps && (
        <div className={styles.lineRow}>
          <span className={styles.lineLabel}>{t('pw.steps')}</span>
          <span className={styles.lineVal}>{day.steps.toLocaleString(loc())}</span>
        </div>
      )}

      {/* Отмятане */}
      <div className={styles.checks}>
        {checks.map(c => (
          <button key={c.id} type="button"
            className={`${styles.check} ${done.includes(c.id) ? styles.checkOn : ''}`}
            onClick={() => pw.toggleDone(day.date, c.id)}>
            <span className={styles.checkBox}>{done.includes(c.id) ? '✓' : ''}</span>
            {c.label}
          </button>
        ))}
      </div>
    </section>
  )
}

// ── Настройките на зареждането ───────────────────────────────────────

function LoadCard({ pw }) {
  const { t } = useSettings()
  const { week, plan, updateWeek, latestKg } = pw
  const [open, setOpen] = useState(false)

  const perKg = Number(week.carb_per_kg)
  const grams = latestKg ? Math.round(latestKg * perKg) : null

  return (
    <section className={styles.card}>
      <button className={styles.cardTitleRow} type="button" onClick={() => setOpen(o => !o)}>
        <span className={styles.cardTitle}>{t('pw.loadCard')}</span>
        <span className={styles.chev}>{open ? '⌃' : '⌄'}</span>
      </button>

      <p className={styles.loadSummary}>
        {t('pw.loadSummary', { days: week.load_days, perKg, grams: grams ?? '—' })}
      </p>

      {plan?.lowLoad && (
        /* Протеинът пада от 2.2 на 1.6 г/кг, мазнините наполовина. При ниско
           г/кг въглехидратите не покриват разликата и „зареждането" излиза
           дефицит — точно в дните, в които човек трябва да се напълни. */
        <p className={styles.warn}>
          {t('pw.lowLoad', {
            kcal: plan.lowLoad.loadKcal,
            tdee: plan.lowLoad.tdee,
            need: plan.lowLoad.needPerKg,
          })}
          {' '}
          <button className={styles.inlineBtn} type="button"
            onClick={() => updateWeek({ carb_per_kg: plan.lowLoad.needPerKg })}>
            {t('pw.lowLoadFix', { n: plan.lowLoad.needPerKg })}
          </button>
        </p>
      )}

      {open && (
        <div className={styles.loadEdit}>
          <div className={styles.field}>
            <label className={styles.label}>{t('pw.setup.perKg')}</label>
            <div className={styles.stepper}>
              <button type="button" className={styles.stepBtn}
                onClick={() => updateWeek({ carb_per_kg: Math.max(CARB_MIN, Math.round((perKg - 0.5) * 10) / 10) })}>−</button>
              <span className={styles.stepVal}>{perKg}</span>
              <button type="button" className={styles.stepBtn}
                onClick={() => updateWeek({ carb_per_kg: Math.min(CARB_MAX, Math.round((perKg + 0.5) * 10) / 10) })}>+</button>
            </div>
            <span className={styles.hint}>{t('pw.setup.perKgHint')}</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('pw.setup.loadDays')}</label>
            <div className={styles.segRow}>
              {[2, 3].map(n => (
                <button key={n} type="button"
                  className={`${styles.seg} ${week.load_days === n ? styles.segOn : ''}`}
                  onClick={() => updateWeek({ load_days: n })}>{n}</button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('pw.adjustQ')}</label>
            <div className={styles.segRow}>
              {[ADJUST.keep, ADJUST.hold, ADJUST.pull].map(a => (
                <button key={a} type="button"
                  className={`${styles.seg} ${week.adjust_choice === a ? styles.segOn : ''}`}
                  onClick={() => updateWeek({ adjust_choice: a })}>{t(`pw.adjust.${a}`)}</button>
              ))}
            </div>
            <span className={styles.hint}>{t('pw.adjustHint')}</span>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Правила и забрани ────────────────────────────────────────────────

function RulesCard({ day }) {
  const { t } = useSettings()
  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>{t('pw.rules')}</div>
      <ul className={styles.rules}>
        {day.rules.map(k => <li key={k} className={styles.rule}>{t(k)}</li>)}
      </ul>
    </section>
  )
}

function NeverCard() {
  const { t } = useSettings()
  return (
    <section className={`${styles.card} ${styles.neverCard}`}>
      <div className={styles.cardTitle}>{t('pw.never')}</div>
      <ul className={styles.rules}>
        {['taper', 'diuretics', 'cutBoth', 'dryLoad', 'lastMinute'].map(k => (
          <li key={k} className={styles.never}>{t(`pw.never.${k}`)}</li>
        ))}
      </ul>
      <p className={styles.source}>{t('pw.source')}</p>
    </section>
  )
}

// ── Главният компонент ───────────────────────────────────────────────

export default function PeakWeek({ prep = null, runway = null }) {
  const { t } = useSettings()
  const { profile, updateProfile } = useAuth()
  const pw = usePeakWeek()
  const [selected, setSelected] = useState(null)
  const [showEnd, setShowEnd]   = useState(false)

  const { week, plan, loading, today, state } = pw

  // Изборът следва днешния ден, докато човек не пипне лентата сам.
  useEffect(() => {
    if (!plan) return
    setSelected(s => (s && plan.days.some(d => d.date === s)) ? s : (
      plan.days.find(d => d.date === today)?.date ?? plan.days[0].date
    ))
  }, [plan?.showDate, today])

  if (loading) return <div className={styles.page}><div className={styles.loadingDot} /></div>

  if (!week) {
    return (
      <div className={styles.page}>
        {runway}
        <header className={styles.head}>
          <h1 className={styles.title}>{t('pw.title')}</h1>
          <p className={styles.subtitle}>{t('pw.setupIntro')}</p>
        </header>
        <PeakSetup
          onSave={pw.createWeek}
          profile={profile}
          prep={prep}
          latestKg={pw.latestKg}
          suggestedCarbPerKg={pw.suggestedCarbPerKg}
        />
        <NeverCard />
      </div>
    )
  }

  const day = plan?.days.find(d => d.date === selected) ?? plan?.days[0]

  return (
    <div className={styles.page}>
      {runway}

      <header className={styles.head}>
        <h1 className={styles.title}>{t('pw.title')}</h1>
        {week.show_name && <p className={styles.showName}>{week.show_name}</p>}
        <p className={styles.subtitle}>{fmtDay(week.show_date)}</p>

        {state === 'before' && (
          <p className={styles.stateNote}>{t('pw.startsOn', { d: fmtDay(plan.startDate) })}</p>
        )}
        {state === 'after' && <p className={styles.stateNote}>{t('pw.over')}</p>}
        {state === 'during' && pw.current && (
          <div className={styles.countdown}>
            <span className={styles.countNum}>
              {pw.current.daysOut === 0 ? '★' : pw.current.daysOut}
            </span>
            <span className={styles.countSub}>
              {pw.current.daysOut === 0 ? t('pw.showToday')
                : pw.current.daysOut === 1 ? t('pw.tomorrow')
                : t('pw.daysOut')}
            </span>
          </div>
        )}
      </header>

      {plan && <DayStrip plan={plan} selected={selected} today={today} onSelect={setSelected} />}

      <DivisionCard week={week} latestKg={pw.latestKg} lookWeight={pw.lookWeight} />

      {day && <DayCard day={day} pw={pw} onApplyMacros={updateProfile} />}

      {state === 'during' && <LookCard pw={pw} />}

      <LoadCard pw={pw} />

      {day && <RulesCard day={day} />}

      <NeverCard />

      <section className={styles.card}>
        {!showEnd ? (
          <button className={styles.endBtn} type="button" onClick={() => setShowEnd(true)}>
            {t('pw.end')}
          </button>
        ) : (
          <div className={styles.endConfirm}>
            <p className={styles.note}>{t('pw.endConfirm')}</p>
            <div className={styles.endRow}>
              <button className={styles.endYes} type="button" onClick={pw.endWeek}>{t('pp.endYes')}</button>
              <button className={styles.endNo}  type="button" onClick={() => setShowEnd(false)}>{t('pp.endNo')}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
