import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fromPairs, lastDays, level, LEVELS, sum } from '../calc'
import { Dot, Ring, Spark } from '../Charts/Charts.jsx'
import styles from './TabloApp.module.css'

/* Разделът „Сега" отговаря на един въпрос: какво правя сега. Плочки по
 * образеца на Home Assistant: в първата колона стъпката и това, което върви
 * на компютъра; във втората чакащото теб по проекти и решенията; в третата
 * бизнесът — пръстен с колко от числата са наред и редовете под него —
 * грешките и наблюдението.
 * Броевете са горе, в лентата. Нищо за работата на Claude — то е в „Работа". */

export default function Now({ items, business, onSave, onGo }) {
  const days28 = useMemo(() => lastDays(28), [])
  const focus = items.find((i) => i.kind === 'focus')
  const you = items.filter((i) => i.kind === 'you')
  const decide = items.filter((i) => i.kind === 'decide')
  const insight = items.find((i) => i.kind === 'insight')
  const proposals = items.filter((i) => i.kind === 'finding' && i.state === 'proposal').length

  const loggers = fromPairs(business?.active_loggers, days28)
  const orders = fromPairs(business?.orders, days28)
  const errors = fromPairs(business?.errors, days28)
  const loggersWeek = Math.round(sum(loggers.slice(-7)) / 7 * 10) / 10
  const ordersWeek = sum(orders.slice(-7))
  const errorsWeek = sum(errors.slice(-7))

  const newClients = fromPairs(business?.new_clients, days28)
  // промяната: последните 7 дни срещу предишните 7 — с думи, не само със стрелка
  const delta = (arr, { lowerIsBetter = false, avg = false } = {}) => {
    const k = avg ? 7 : 1
    const r = (v) => Math.round((v / k) * 10) / 10
    const now = r(sum(arr.slice(-7))), before = r(sum(arr.slice(-14, -7)))
    const bg = String(before).replace('.', ',')
    if (now === before) return { text: `като миналата седмица`, dir: 'flat' }
    const up = now > before
    return { text: `${up ? '▲' : '▼'} миналата седмица: ${bg}`, dir: up === !lowerIsBetter ? 'good' : 'bad' }
  }
  const stats = [
    { key: 'clients', label: 'Акаунти', value: business?.clients ?? '—', sub: `${sum(newClients)} нови за 28 дни`, series: newClients, delta: delta(newClients) },
    { key: 'loggers', label: 'Логват', value: String(loggersWeek).replace('.', ','), sub: 'души на ден, 7 дни', lv: level(loggersWeek, 3, 1, { low: true }), series: loggers, delta: delta(loggers, { avg: true }) },
    { key: 'orders', label: 'Поръчки', value: ordersWeek, sub: `за 7 дни · ${business?.orders_total ?? 0} досега`, lv: level(ordersWeek, 3, 1, { low: true }), series: orders, delta: delta(orders) },
    { key: 'errors', label: 'Грешки', value: errorsWeek, sub: 'от телефоните, 7 дни', lv: level(errorsWeek, 5, 20), series: errors, delta: delta(errors, { lowerIsBetter: true }) },
  ]
  // Пръстенът: колко от числата със светлина са наред. Не измислена оценка —
  // броят е точно този, който се вижда в редовете отдолу.
  const lit = stats.filter((s) => s.lv)
  const okN = lit.filter((s) => s.lv === 'ok').length
  const worst = lit.find((s) => s.lv === 'high') || lit.find((s) => s.lv === 'watch')
  const health = worst ? worst.lv : 'ok'

  return (
    <div className={styles.cols}>
      <div className={styles.col}>
        {focus && (
          <section className={`${styles.tile} ${styles.step}`} aria-labelledby="stepH">
            <div className={styles.tileHead}><h2 id="stepH" className={styles.tileH}>Следващата стъпка</h2></div>
            {focus.done ? (
              <p className={styles.stepText}>Отметната. Кажи на Claude за следващата.</p>
            ) : (
              <>
                <p className={styles.stepText}>{focus.title}</p>
                {focus.why && <p className={styles.muted}>{focus.why}</p>}
                <button type="button" className={styles.primary}
                  onClick={() => onSave(focus.id, { done: true, done_at: new Date().toISOString() })}>Готово</button>
              </>
            )}
          </section>
        )}
        <Jobs />
      </div>

      <div className={styles.col}>
        <Tasks title="Чака теб" id="youH" rows={you} onSave={onSave} empty="Нищо не те чака." byArea />
        <Tasks title="Чака решение" id="decH" rows={decide} onSave={onSave} empty="Няма отворени решения." />
        {proposals > 0 && (
          <button type="button" className={`${styles.tile} ${styles.linkCard}`} onClick={() => onGo('audit')}>
            <span>{proposals} {proposals === 1 ? 'предложение' : 'предложения'} от одита чакат твоето „да“</span>
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>

      <div className={styles.col}>
        <section className={styles.tile} aria-labelledby="bizH">
          <div className={styles.tileHead}>
            <h2 id="bizH" className={styles.tileH}>Бизнесът</h2>
            <span className={styles.tileHint}>28 дни</span>
          </div>
          <div className={styles.health}>
            <Ring value={lit.length ? okN / lit.length : 0} label={`${okN}/${lit.length}`} color={LEVEL_VAR[health]}
              title={`${okN} от ${lit.length} числа са наред`} />
            <div>
              <strong>{LEVELS[health].label}</strong>
              <p className={styles.muted}>{worst ? `${worst.label}: ${worst.value} ${worst.sub}` : 'Всички числа са наред.'}</p>
            </div>
          </div>
          <ul className={styles.rows}>
            {stats.map((s) => (
              <li key={s.key} className={styles.statRow}>
                <span className={styles.statLabel}>
                  {s.lv ? <Dot level={s.lv} /> : <i className={styles.dotGap} />}{s.label}
                  {s.lv && <span className={styles.srOnly}> · {LEVELS[s.lv].label}</span>}
                </span>
                <span className={styles.statValue}>{s.value}</span>
                <Spark values={s.series} label={`${s.label} за 28 дни`} />
                <span className={styles.statSub}>{s.sub} · <span className={styles.statDelta} data-dir={s.delta.dir}>{s.delta.text}</span></span>
              </li>
            ))}
          </ul>
        </section>
        {!!business?.top_errors?.length && (
          <section className={styles.tile} aria-labelledby="errH">
            <div className={styles.tileHead}>
              <h2 id="errH" className={styles.tileH}>Грешките</h2>
              <span className={styles.tileHint}>от телефоните</span>
            </div>
            <ul className={styles.rows}>
              {business.top_errors.map((e) => (
                <li key={e.message} className={styles.row}>
                  <span className={styles.rowMain}>{e.message}</span>
                  <span className={styles.rowSide}>{e.n}× · {e.screen || '—'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {insight && (
          <section className={styles.tile} aria-labelledby="insH">
            <div className={styles.tileHead}><h2 id="insH" className={styles.tileH}>Наблюдение</h2></div>
            <blockquote className={styles.quote}>{insight.title}</blockquote>
          </section>
        )}
      </div>
    </div>
  )
}

const LEVEL_VAR = { ok: 'var(--ok)', watch: 'var(--warn)', high: 'var(--bad)' }

export function Tasks({ title, id, rows, onSave, empty, byArea = false }) {
  const [pick, setPick] = useState(null)
  // Отметнатото стои два дни зачеркнато — да се види, че е минало — после изчезва.
  const recent = Date.now() - 2 * 864e5
  const sorted = rows
    .filter((r) => !r.done || new Date(r.done_at || r.updated_at).getTime() > recent)
    .sort((a, b) => (a.done - b.done) || (a.sort - b.sort))
  const open = rows.filter((r) => !r.done).length
  // по проект (area); проектът с най-много отворени е отгоре и избран
  const byName = new Map()
  for (const t of sorted) {
    const k = t.area || 'Друго'
    byName.set(k, [...(byName.get(k) || []), t])
  }
  const groups = [...byName].sort((a, b) => b[1].filter((t) => !t.done).length - a[1].filter((t) => !t.done).length)
  const chosen = byArea ? (groups.find(([n]) => n === pick) || groups[0]) : null
  const shown = byArea ? (chosen?.[1] ?? []) : sorted

  return (
    <section className={styles.tile} aria-labelledby={id}>
      <div className={styles.tileHead}>
        <h2 id={id} className={styles.tileH}>{title}</h2>
        <span className={styles.tileHint}>{open} отворени</span>
      </div>
      {byArea && groups.length > 1 && (
        <div className={styles.areas} role="tablist" aria-label="Проект">
          {groups.map(([name, g]) => {
            const left = g.filter((t) => !t.done)
            return (
              <button key={name} type="button" role="tab" aria-selected={chosen?.[0] === name}
                className={styles.area} onClick={() => setPick(name)}>
                <b>{name}<em>{left.length}</em></b>
                <span>{left.length ? left[0].title : 'готово'}</span>
              </button>
            )
          })}
        </div>
      )}
      {shown.length ? (
        <ul className={styles.rows}>
          {shown.map((t) => (
            <li key={t.id} className={`${styles.task} ${t.done ? styles.taskDone : ''}`}>
              <input
                type="checkbox"
                id={`tk-${t.id}`}
                checked={t.done}
                onChange={(e) => onSave(t.id, { done: e.target.checked, done_at: e.target.checked ? new Date().toISOString() : null })}
              />
              <label htmlFor={`tk-${t.id}`}>
                <span>{t.title}</span>
                {t.why && !t.done && <span className={styles.taskWhy}>{t.why}</span>}
                {!byArea && t.area && !t.done && <span className={styles.tag}>{t.area}</span>}
              </label>
            </li>
          ))}
        </ul>
      ) : <p className={styles.empty}>{empty}</p>}
    </section>
  )
}

/* „Върви на компютъра“: дългите задачи (scripts/job-report.mjs, disk-sizes.mjs
 * → tablo_jobs). Чете сама на 30 s, без да презарежда таблото. Всяка стои,
 * докато не я махнеш (hidden_at, миграция 148), но не повече от 3 дни.
 * Ако компютърът не се е обадил над 3 минути, го казва — лента, която стои,
 * лъже повече от липсата ѝ. */
function Jobs() {
  const [jobs, setJobs] = useState([])
  const [, tick] = useState(0)
  useEffect(() => {
    let live = true
    const read = async () => {
      const since = new Date(Date.now() - 3 * 864e5).toISOString()
      const { data } = await supabase.from('tablo_jobs').select('*').gte('updated_at', since).is('hidden_at', null)
        .order('started_at', { ascending: false })
      if (live) { setJobs(data ?? []); tick((n) => n + 1) }
    }
    read()
    const t = setInterval(read, 30000)
    return () => { live = false; clearInterval(t) }
  }, [])
  async function hide(id) {
    setJobs((all) => all.filter((j) => j.id !== id))
    await supabase.from('tablo_jobs').update({ hidden_at: new Date().toISOString() }).eq('id', id)
  }
  if (!jobs.length) return null
  const hm = (iso) => new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })
  return (
    <section className={styles.tile} aria-labelledby="jobsH">
      <div className={styles.tileHead}>
        <h2 id="jobsH" className={styles.tileH}>Върви на компютъра</h2>
        <span className={styles.tileHint}>на живо</span>
      </div>
      {jobs.map((j) => {
        const silent = j.state === 'running' && Date.now() - new Date(j.updated_at) > 3 * 60e3
        const pct = j.total ? Math.round((j.done / j.total) * 100) : 0
        const lv = j.state === 'done' ? 'ok' : silent || j.state === 'failed' ? 'bad' : 'watch'
        return (
          <div key={j.id} className={styles.job}>
            <Ring value={pct / 100} label={pct} unit="%" size={64} color={JOB_VAR[lv]} title={`${j.title}: ${pct} %`} />
            <div className={styles.jobText}>
            <div className={styles.jobTop}>
              <strong>{j.title}</strong>
              <span>{j.done} от {j.total}</span>
            </div>
            <button type="button" className={styles.jobHide} aria-label={`Махни „${j.title}“`} onClick={() => hide(j.id)}>Махни</button>
            <p className={styles.muted}>
              {j.state === 'done' ? [`Готово в ${hm(j.updated_at)}`, j.current].filter(Boolean).join(' · ')
                : j.state === 'failed' ? 'Спря с грешка'
                  : silent ? `Компютърът не се е обадил от ${hm(j.updated_at)}`
                    : [j.current && `сега: ${j.current}`, j.eta && `към ${hm(j.eta)}`].filter(Boolean).join(' · ')}
            </p>
            </div>
          </div>
        )
      })}
    </section>
  )
}

const JOB_VAR = { ok: 'var(--ok)', watch: 'var(--warn)', bad: 'var(--bad)' }
