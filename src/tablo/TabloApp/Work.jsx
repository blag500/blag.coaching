import { useMemo, useState } from 'react'
import { compact, dowShort, indexDaily, lastDays, percent, series, shortDate, sum, weighted, weightedSeries } from '../calc'
import { DayBars, ShareBar, StackBars } from '../Charts/Charts.jsx'
import styles from './TabloApp.module.css'

/* Разделът „Работа": работата с Claude — тежест, промени, токени, сесии.
 * Всичко, което беше на първия екран и не казваше на човека какво да прави,
 * е тук. */

const RANGES = [{ key: 14, label: '14 дни' }, { key: 28, label: '28 дни' }]

export default function Work({ daily, sessions }) {
  const [n, setN] = useState(14)
  const days = useMemo(() => lastDays(n), [n])
  const idx = useMemo(() => indexDaily(daily), [daily])
  const work = weightedSeries(idx, days)
  const calls = series(idx, 'claude.calls', days)
  const commits = sum(series(idx, 'git.app', days)) + sum(series(idx, 'git.vault', days))
  const labels = days.map((d) => (n <= 14 ? dowShort(d) : shortDate(d).split(' ')[0]))
  const activeDays = work.filter((v) => v > 0).length
  const normal = sum(work) / Math.max(activeDays, 1)

  const rows = useMemo(() => sessions
    .map((s) => ({ ...s, w: weighted({ input: s.tok_input, cache_read: s.tok_cache_read, cache_write: s.tok_cache_write, output: s.tok_output }) }))
    .sort((a, b) => String(b.started_at).localeCompare(String(a.started_at))), [sessions])

  /* Тежестта по вид токен — пропорцията на цената, не цената. */
  const t = (k) => sum(series(idx, k, days))
  const parts = [
    { key: 'read', label: 'Прочетено от кеша', v: t('tok.cache_read') * 0.1, color: 'var(--series-1)' },
    { key: 'write', label: 'Записано в кеша', v: t('tok.cache_write') * 2, color: 'var(--series-2)' },
    { key: 'out', label: 'Отговорите на Claude', v: t('tok.output') * 5, color: 'var(--series-3)' },
    { key: 'in', label: 'Нов вход', v: t('tok.input'), color: 'var(--series-4)' },
  ]
  const total = sum(parts.map((p) => p.v))

  return (
    <>
      <div className={styles.chips} role="tablist" aria-label="Период">
        {RANGES.map((r) => (
          <button key={r.key} role="tab" aria-selected={n === r.key} type="button"
            className={styles.chip} onClick={() => setN(r.key)}>{r.label}</button>
        ))}
      </div>

      <div className={styles.stats}>
        <Stat label="Тежест" value={compact(sum(work))} sub={`за ${n} дни`} />
        <Stat label="Дни с работа" value={`${activeDays}`} sub={`от ${n}`} />
        <Stat label="Повиквания" value={compact(sum(calls))} sub="към модела" />
        <Stat label="Комити" value={commits} sub="приложение и трезор" />
      </div>

      <section className={styles.section} aria-labelledby="wH">
        <div className={styles.sectionHead}><h2 id="wH" className={styles.h2}>Тежест по дни</h2></div>
        <div className={`${styles.card} ${styles.chartCard}`}>
          <DayBars values={work} labels={labels} normal={normal} fmt={compact} title="Тежест по дни" />
          <p className={styles.muted}>Пунктирът е средният ден с работа: {compact(normal)}. Червено — над два пъти повече.</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="cH">
        <div className={styles.sectionHead}><h2 id="cH" className={styles.h2}>Промени по дни</h2></div>
        <div className={`${styles.card} ${styles.chartCard}`}>
          <StackBars labels={labels} title="Промени по дни"
            series={[
              { key: 'app', label: 'Приложение', color: 'var(--series-1)', values: series(idx, 'git.app', days) },
              { key: 'vault', label: 'Трезор', color: 'var(--series-2)', values: series(idx, 'git.vault', days) },
              { key: 'notes', label: 'Бележки', color: 'var(--series-3)', values: series(idx, 'vault.notes', days) },
            ]} />
          <Legend items={[['Приложение', 'var(--series-1)'], ['Трезор', 'var(--series-2)'], ['Бележки', 'var(--series-3)']]} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="mH">
        <div className={styles.sectionHead}>
          <h2 id="mH" className={styles.h2}>Откъде идва тежестта</h2>
          <span className={styles.count}>{compact(total)}</span>
        </div>
        <div className={`${styles.card} ${styles.chartCard} ${styles.shares}`}>
          {parts.map((p) => (
            <ShareBar key={p.key} label={p.label} color={p.color}
              value={percent(total ? p.v / total : 0)} share={total ? p.v / total : 0} />
          ))}
          <p className={styles.muted}>Много „записано“ значи нови или дълги разговори; „прочетено“ — дълги сесии, носени напред.</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="sH">
        <div className={styles.sectionHead}>
          <h2 id="sH" className={styles.h2}>Сесиите</h2>
          <span className={styles.count}>{rows.length}</span>
        </div>
        {rows.length ? (
          <ul className={`${styles.card} ${styles.list}`}>
            {rows.map((s) => (
              <li key={s.id} className={styles.row}>
                <span className={styles.rowMain}>
                  {s.title || s.project || s.id.slice(0, 8)}
                  <small>{new Date(s.started_at).toLocaleString('bg-BG', { timeZone: 'Europe/Sofia', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {(s.model || '—').replace('claude-', '')}</small>
                </span>
                <span className={styles.rowSide}>{compact(s.w)}</span>
              </li>
            ))}
          </ul>
        ) : <p className={`${styles.card} ${styles.empty}`}>Още няма записани сесии. Пусни <code>node scripts/tablo-sync.mjs</code> на компютъра.</p>}
      </section>
    </>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statSub}>{sub}</span>
    </div>
  )
}

function Legend({ items }) {
  return (
    <div className={styles.legend}>
      {items.map(([l, c]) => <span key={l}><i style={{ background: c }} />{l}</span>)}
    </div>
  )
}
