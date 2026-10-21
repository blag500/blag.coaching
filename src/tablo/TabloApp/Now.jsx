import { useMemo } from 'react'
import { fromPairs, lastDays, level, LEVELS, sum } from '../calc'
import { Dot } from '../Charts/Charts.jsx'
import styles from './TabloApp.module.css'

/* Разделът „Сега" отговаря на един въпрос: какво правя сега. Отгоре
 * стъпката, после чакащото теб и решенията — с отметка направо оттук.
 * Отдолу четирите числа на бизнеса, всяко със своята светлина. Нищо за
 * работата на Claude — то е в „Работа". */

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

  const stats = [
    { key: 'clients', label: 'Акаунти', value: business?.clients ?? '—', sub: `${sum(fromPairs(business?.new_clients, days28))} нови за 28 дни` },
    { key: 'loggers', label: 'Логват', value: String(loggersWeek).replace('.', ','), sub: 'души на ден, 7 дни', lv: level(loggersWeek, 3, 1, { low: true }) },
    { key: 'orders', label: 'Поръчки', value: ordersWeek, sub: `за 7 дни · ${business?.orders_total ?? 0} досега`, lv: level(ordersWeek, 3, 1, { low: true }) },
    { key: 'errors', label: 'Грешки', value: errorsWeek, sub: 'от телефоните, 7 дни', lv: level(errorsWeek, 5, 20) },
  ]

  return (
    <>
      {focus && (
        <section className={`${styles.card} ${styles.step}`} aria-labelledby="stepH">
          <span id="stepH" className={styles.eyebrow}>Следващата стъпка</span>
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

      <Tasks title="Чака теб" id="youH" rows={you} onSave={onSave} empty="Нищо не те чака." />
      <Tasks title="Чака решение" id="decH" rows={decide} onSave={onSave} empty="Няма отворени решения." />

      {proposals > 0 && (
        <button type="button" className={`${styles.card} ${styles.linkCard}`} onClick={() => onGo('audit')}>
          <span>{proposals} {proposals === 1 ? 'предложение' : 'предложения'} от одита чакат твоето „да“</span>
          <span aria-hidden="true">→</span>
        </button>
      )}

      <section className={styles.section} aria-labelledby="bizH">
        <div className={styles.sectionHead}>
          <h2 id="bizH" className={styles.h2}>Бизнесът</h2>
        </div>
        <div className={styles.stats}>
          {stats.map((s) => (
            <div key={s.key} className={styles.stat}>
              <span className={styles.statLabel}>
                {s.lv && <Dot level={s.lv} />}{s.label}
                {s.lv && <span className={styles.srOnly}> · {LEVELS[s.lv].label}</span>}
              </span>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statSub}>{s.sub}</span>
            </div>
          ))}
        </div>
        {!!business?.top_errors?.length && (
          <ul className={`${styles.card} ${styles.list}`}>
            {business.top_errors.map((e) => (
              <li key={e.message} className={styles.row}>
                <span className={styles.rowMain}>{e.message}</span>
                <span className={styles.rowSide}>{e.n}× · {e.screen || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {insight && (
        <section className={styles.section} aria-labelledby="insH">
          <div className={styles.sectionHead}><h2 id="insH" className={styles.h2}>Наблюдение</h2></div>
          <blockquote className={styles.quote}>{insight.title}</blockquote>
        </section>
      )}
    </>
  )
}

export function Tasks({ title, id, rows, onSave, empty }) {
  // Отметнатото стои два дни зачеркнато — да се види, че е минало — после изчезва.
  const recent = Date.now() - 2 * 864e5
  const sorted = rows
    .filter((r) => !r.done || new Date(r.done_at || r.updated_at).getTime() > recent)
    .sort((a, b) => (a.done - b.done) || (a.sort - b.sort))
  const open = rows.filter((r) => !r.done).length
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h2 id={id} className={styles.h2}>{title}</h2>
        <span className={styles.count}>{open}</span>
      </div>
      {sorted.length ? (
        <ul className={`${styles.card} ${styles.list}`}>
          {sorted.map((t) => (
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
                {t.area && <span className={styles.tag}>{t.area}</span>}
              </label>
            </li>
          ))}
        </ul>
      ) : <p className={`${styles.card} ${styles.empty}`}>{empty}</p>}
    </section>
  )
}
