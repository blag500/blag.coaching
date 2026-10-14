import { useMemo } from 'react'
import {
  compact, daysOpen, dowShort, fromPairs, healthScore, indexDaily, lastDays, level, LEVELS,
  percent, series, signedPercent, sum, weekVsNormal, weighted, weightedSeries,
} from '../calc'
import { DayBars, Dot, HealthRing, ShareBar, Spark, StackBars } from '../Charts/Charts.jsx'
import styles from './TabloApp.module.css'

/* Разделът „Табло": отгоре пръстенът и светлините, после четирите плочки с
 * криви, после работата и промените по дни, после приложението.
 *
 * Всяка светлина казва числото си и прага си — „Как се четат светлините"
 * отдолу е същата таблица, по която се смятат. Нищо не е оценка на око. */

const LEVEL_COLOR = { ok: 'var(--ok)', watch: 'var(--accent)', high: 'var(--red)' }

export default function Overview({ items, daily, sessions, business, onGo }) {
  const days28 = useMemo(() => lastDays(28), [])
  const days14 = days28.slice(-14)
  const idx = useMemo(() => indexDaily(daily), [daily])

  const work = useMemo(() => weightedSeries(idx, days28), [idx, days28])
  const commits = useMemo(() => {
    const app = series(idx, 'git.app', days28)
    const vault = series(idx, 'git.vault', days28)
    return days28.map((_, i) => app[i] + vault[i])
  }, [idx, days28])
  const loggers = useMemo(() => fromPairs(business?.active_loggers, days28), [business, days28])
  const orders = useMemo(() => fromPairs(business?.orders, days28), [business, days28])
  const errors = useMemo(() => fromPairs(business?.errors, days28), [business, days28])

  const focus = items.find((i) => i.kind === 'focus')
  const openYou = items.filter((i) => i.kind === 'you' && !i.done)
  const doing = items.filter((i) => i.kind === 'idea' && i.status === 'doing')
  const openFindings = items.filter((i) => i.kind === 'finding' && i.state === 'open')
  const insight = items.find((i) => i.kind === 'insight')

  const w = weekVsNormal(work)
  const c = weekVsNormal(commits)
  const o = weekVsNormal(orders)
  const loggersWeek = Math.round(sum(loggers.slice(-7)) / 7 * 10) / 10
  const errorsWeek = sum(errors.slice(-7))
  const focusAge = focus && !focus.done ? daysOpen(focus.updated_at) : 0

  const lights = [
    {
      key: 'focus', label: 'Стъпката', value: focus?.done ? 'чака нова' : `${focusAge} ${focusAge === 1 ? 'ден' : 'дни'} отворена`,
      level: focus?.done ? 'watch' : level(focusAge, 3, 7), rule: 'до 3 дни · до 7 · над 7',
    },
    {
      key: 'doing', label: 'Идеи в работа', value: `${doing.length}`,
      level: level(doing.length, 2, 3), rule: 'до 2 · 3 · над 3',
    },
    {
      key: 'you', label: 'Чака теб', value: `${openYou.length} отворени`,
      level: level(openYou.length, 3, 6), rule: 'до 3 · до 6 · над 6',
    },
    {
      key: 'work', label: 'Работа с Claude', value: w.change == null ? compact(w.week) : signedPercent(w.change).replace(' спрямо обичайното', ''),
      level: w.normal > 0 ? level(w.change, -0.25, -0.6, { low: true }) : (w.week > 0 ? 'ok' : 'watch'),
      rule: 'над −25 % · до −60 % · под −60 %',
    },
    {
      key: 'errors', label: 'Грешки в приложението', value: `${errorsWeek} за 7 дни`,
      level: level(errorsWeek, 5, 20), rule: 'до 5 · до 20 · над 20',
    },
    {
      key: 'orders', label: 'Поръчки в Чийт Код', value: `${o.week} за 7 дни`,
      level: level(o.week, 3, 1, { low: true }), rule: '3 и повече · 1–2 · нула',
    },
  ]
  const score = healthScore(lights)
  /* Първата буква малка, освен в собствено име: „поръчки в Чийт Код", не
     „поръчки в чийт код". */
  const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1)
  const highs = lights.filter((l) => l.level === 'high').map((l) => lower(l.label))
  const watches = lights.filter((l) => l.level === 'watch').map((l) => lower(l.label))
  const summary = [
    highs.length ? `Внимание: ${highs.join(', ')}.` : null,
    watches.length ? `Следи: ${watches.join(', ')}.` : null,
  ].filter(Boolean).join(' ') || 'Всичко е в обичайното.'

  /* Тежестта на работата за седмицата, по вид токен. */
  const mix = useMemo(() => {
    const last7 = days28.slice(-7)
    const t = (k) => sum(series(idx, k, last7))
    const parts = [
      { key: 'read', label: 'Прочетено от кеша', v: t('tok.cache_read') * 0.1, color: 'var(--series-1)' },
      { key: 'write', label: 'Записано в кеша', v: t('tok.cache_write') * 2, color: 'var(--series-4)' },
      { key: 'out', label: 'Отговорите на Claude', v: t('tok.output') * 5, color: 'var(--series-3)' },
      { key: 'in', label: 'Нов вход', v: t('tok.input'), color: 'var(--series-2)' },
    ]
    const total = sum(parts.map((p) => p.v))
    return { parts, total }
  }, [idx, days28])

  const normalDay = w.normal / 7
  const labels14 = days14.map(dowShort)

  return (
    <>
      <section className={`${styles.card} ${styles.healthCard}`} aria-labelledby="healthH">
        <h2 id="healthH" className={styles.srOnly}>Здраве</h2>
        <div className={styles.health}>
          <HealthRing score={score} lights={lights} />
          <ul className={styles.lights}>
            {lights.map((l) => (
              <li key={l.key}>
                <Dot level={l.level} />
                <span className={styles.lightLabel}>{l.label}</span>
                <span className={styles.lightValue}>{l.value} <b style={{ color: LEVEL_COLOR[l.level] }}>· {LEVELS[l.level].label}</b></span>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.summary}>{summary}</p>
      </section>

      {focus && (
        <button type="button" className={`${styles.card} ${styles.focusMini}`} onClick={() => onGo('plan')}>
          <span className={styles.label}>Следващата стъпка</span>
          <span className={styles.focusMiniText}>{focus.done ? 'Отметната. Кажи на Claude за следващата.' : focus.title}</span>
          {!!openFindings.length && <span className={styles.meta}>{openFindings.length} отворени находки от одита</span>}
        </button>
      )}

      <div className={styles.tiles}>
        <Kpi title="Работа с Claude" value={compact(w.week)} unit="тежест за 7 дни"
          lv={lights[3].level} delta={signedPercent(w.change)} normal={`обичайно ${compact(w.normal)}`}
          values={work} color="var(--series-1)" />
        <Kpi title="Промени" value={String(c.week)} unit="комита за 7 дни"
          lv={c.normal > 0 ? level(c.change, -0.3, -0.7, { low: true }) : 'ok'} delta={signedPercent(c.change)} normal={`обичайно ${Math.round(c.normal)}`}
          values={commits} color="var(--series-3)" />
        <Kpi title="Логват в приложението" value={String(loggersWeek).replace('.', ',')} unit="души на ден"
          lv={level(loggersWeek, 3, 1, { low: true })} delta={`от ${business?.clients ?? '—'} акаунта`} normal="последните 7 дни"
          values={loggers} color="var(--series-2)" />
        <Kpi title="Поръчки" value={String(o.week)} unit="за 7 дни"
          lv={lights[5].level} delta={`${business?.orders_total ?? 0} истински досега`} normal="пробните не се броят"
          values={orders} color="var(--series-4)" />
      </div>

      <div className={styles.grid2}>
        <section className={styles.card} aria-labelledby="workDaysH">
          <div className={styles.head}>
            <h2 id="workDaysH" className={styles.h2}>Работата по дни</h2>
            <span className={styles.meta}>последните 14</span>
          </div>
          <p className={styles.muted}>Тежестта на работата с Claude на ден. Пунктирът е обичайният ден за трите седмици преди тази; червено — над два пъти обичайното.</p>
          <DayBars values={work.slice(-14)} labels={labels14} normal={normalDay} fmt={compact} title="Тежест на работата по дни" />
          <p className={styles.meta}>Обичаен ден: {compact(normalDay)}</p>
        </section>

        <section className={styles.card} aria-labelledby="changesH">
          <div className={styles.head}>
            <h2 id="changesH" className={styles.h2}>Промените по дни</h2>
            <span className={styles.meta}>последните 14</span>
          </div>
          <p className={styles.muted}>Комитите в приложението и в трезора, и бележките на сесиите.</p>
          <StackBars
            labels={labels14}
            title="Промени по дни"
            series={[
              { key: 'app', label: 'Приложение', color: 'var(--series-1)', values: series(idx, 'git.app', days14) },
              { key: 'vault', label: 'Трезор', color: 'var(--series-2)', values: series(idx, 'git.vault', days14) },
              { key: 'notes', label: 'Бележки', color: 'var(--series-4)', values: series(idx, 'vault.notes', days14) },
            ]}
          />
          <div className={styles.legend}>
            <span><i style={{ background: 'var(--series-1)' }} />Приложение</span>
            <span><i style={{ background: 'var(--series-2)' }} />Трезор</span>
            <span><i style={{ background: 'var(--series-4)' }} />Бележки</span>
          </div>
        </section>
      </div>

      <section className={styles.card} aria-labelledby="mixH">
        <div className={styles.head}>
          <h2 id="mixH" className={styles.h2}>Откъде идва тежестта</h2>
          <span className={styles.meta}>{compact(mix.total)} за 7 дни</span>
        </div>
        <div className={styles.shares}>
          {mix.parts.map((p) => (
            <ShareBar key={p.key} label={p.label} color={p.color}
              value={percent(mix.total ? p.v / mix.total : 0)} share={mix.total ? p.v / mix.total : 0} />
          ))}
        </div>
        <p className={styles.meta}>Голям дял „записано в кеша" значи много нови или дълги разговори; „прочетено" — дълги сесии, в които контекстът се носи напред.</p>
      </section>

      <Sessions sessions={sessions} onGo={onGo} />

      <section className={styles.card} aria-labelledby="appH">
        <div className={styles.head}>
          <h2 id="appH" className={styles.h2}>Приложението</h2>
          <span className={styles.meta}>последните 28 дни</span>
        </div>
        <div className={styles.miniTiles}>
          <Mini label="Акаунти" value={business?.clients ?? '—'} />
          <Mini label="Нови" value={sum(fromPairs(business?.new_clients, days28))} />
          <Mini label="Въпроси към бота" value={sum(fromPairs(business?.bot, days28, 'calls'))} />
          <Mini label="Грешки" value={sum(errors)} />
        </div>
        {business?.top_errors?.length ? (
          <ul className={styles.rows}>
            {business.top_errors.map((e) => (
              <li key={e.message} className={styles.row}>
                <span className={styles.rowMain}>{e.message}</span>
                <span className={styles.rowSide}>{e.n}× · {e.screen || '—'}</span>
              </li>
            ))}
          </ul>
        ) : <p className={styles.muted}>Нито една грешка от телефоните за 28 дни.</p>}
      </section>

      {insight && (
        <section className={styles.card} aria-labelledby="insH">
          <h2 id="insH" className={styles.label}>Наблюдение</h2>
          <blockquote className={styles.insight}>{insight.title}</blockquote>
        </section>
      )}

      <section className={styles.card} aria-labelledby="rulesH">
        <h2 id="rulesH" className={styles.h2}>Как се четат светлините</h2>
        <p className={styles.muted}>Здравето е средното на шестте: наред е 100, следи — 50, внимание — 0. Тежестта на работата е входът по 1, прочетеното от кеша по 0,1, записаното по 2, отговорите по 5 — пропорцията на цената, не цената.</p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Светлина</th><th><Dot level="ok" /> Наред · <Dot level="watch" /> Следи · <Dot level="high" /> Внимание</th></tr>
            </thead>
            <tbody>
              {lights.map((l) => <tr key={l.key}><td>{l.label}</td><td>{l.rule}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function Kpi({ title, value, unit, lv, delta, normal, values, color }) {
  return (
    <section className={`${styles.card} ${styles.kpi}`} style={{ '--kpi-tone': LEVEL_COLOR[lv] }} aria-label={title}>
      <span className={styles.label}>{title}</span>
      <span className={styles.kpiValue}>{value}<small>{unit}</small></span>
      <span className={styles.kpiLevel}><Dot level={lv} />{LEVELS[lv].label}</span>
      <span className={styles.meta}>{delta}</span>
      <span className={styles.meta}>{normal}</span>
      <Spark values={values} color={color} />
    </section>
  )
}

function Mini({ label, value }) {
  return (
    <div className={styles.mini}>
      <span className={styles.label}>{label}</span>
      <span className={styles.miniValue}>{value}</span>
    </div>
  )
}

function Sessions({ sessions, onGo }) {
  const week = Date.now() - 7 * 864e5
  const rows = sessions
    .filter((s) => new Date(s.ended_at || s.started_at).getTime() >= week)
    .map((s) => ({ ...s, w: weighted({ input: s.tok_input, cache_read: s.tok_cache_read, cache_write: s.tok_cache_write, output: s.tok_output }) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 6)
  return (
    <section className={styles.card} aria-labelledby="sessH">
      <div className={styles.head}>
        <h2 id="sessH" className={styles.h2}>Сесиите тази седмица</h2>
        <button type="button" className={styles.linkBtn} onClick={() => onGo('work')}>Всички</button>
      </div>
      {rows.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Сесия</th><th className={styles.num}>Тежест</th><th className={styles.num}>Инструменти</th><th className={styles.num}>Кеш</th></tr></thead>
            <tbody>
              {rows.map((s) => {
                const total = Number(s.tok_input) + Number(s.tok_cache_read) + Number(s.tok_cache_write)
                return (
                  <tr key={s.id}>
                    <td className={styles.sessTitle}>{s.title || s.project || s.id.slice(0, 8)}</td>
                    <td className={styles.num}>{compact(s.w)}</td>
                    <td className={styles.num}>{s.tool_calls}</td>
                    <td className={styles.num}>{percent(total ? s.tok_cache_read / total : 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : <p className={styles.muted}>Няма сесии през последните 7 дни.</p>}
    </section>
  )
}
