import { useMemo, useState } from 'react'
import { compact, dowShort, indexDaily, lastDays, percent, series, shortDate, sum, weighted, weightedSeries } from '../calc'
import { DayBars, StackBars } from '../Charts/Charts.jsx'
import styles from './TabloApp.module.css'

/* Разделът „Работа": същите числа като в таблото, но за 28 дни и с всички
 * сесии. Тук се вижда колко от седмицата е изработено и къде. */

const RANGES = [{ key: 14, label: '14 дни' }, { key: 28, label: '28 дни' }]

export default function Work({ daily, sessions }) {
  const [n, setN] = useState(28)
  const days = useMemo(() => lastDays(n), [n])
  const idx = useMemo(() => indexDaily(daily), [daily])
  const work = weightedSeries(idx, days)
  const calls = series(idx, 'claude.calls', days)
  const tools = series(idx, 'claude.tools', days)
  const labels = days.map((d) => (n <= 14 ? dowShort(d) : shortDate(d).split(' ')[0]))

  const rows = useMemo(() => sessions
    .map((s) => ({ ...s, w: weighted({ input: s.tok_input, cache_read: s.tok_cache_read, cache_write: s.tok_cache_write, output: s.tok_output }) }))
    .sort((a, b) => String(b.started_at).localeCompare(String(a.started_at))), [sessions])

  const activeDays = work.filter((v) => v > 0).length

  return (
    <>
      <div className={styles.segmentRow} role="tablist" aria-label="Период">
        {RANGES.map((r) => (
          <button key={r.key} role="tab" aria-selected={n === r.key} type="button"
            className={`${styles.seg} ${n === r.key ? styles.segOn : ''}`} onClick={() => setN(r.key)}>{r.label}</button>
        ))}
      </div>

      <div className={styles.miniTiles}>
        <div className={styles.mini}><span className={styles.label}>Тежест</span><span className={styles.miniValue}>{compact(sum(work))}</span></div>
        <div className={styles.mini}><span className={styles.label}>Повиквания</span><span className={styles.miniValue}>{compact(sum(calls))}</span></div>
        <div className={styles.mini}><span className={styles.label}>Инструменти</span><span className={styles.miniValue}>{compact(sum(tools))}</span></div>
        <div className={styles.mini}><span className={styles.label}>Дни с работа</span><span className={styles.miniValue}>{activeDays} от {n}</span></div>
      </div>

      <section className={styles.card} aria-labelledby="wH">
        <h2 id="wH" className={styles.h2}>Тежест по дни</h2>
        <DayBars values={work} labels={labels} normal={sum(work) / Math.max(activeDays, 1)} fmt={compact} title="Тежест по дни" />
        <p className={styles.meta}>Пунктирът е средният ден с работа в периода: {compact(sum(work) / Math.max(activeDays, 1))}.</p>
      </section>

      <section className={styles.card} aria-labelledby="tH">
        <h2 id="tH" className={styles.h2}>Токените по вид</h2>
        <StackBars labels={labels} fmt={compact} title="Токени по вид"
          series={[
            { key: 'w', label: 'Записано в кеша', color: 'var(--series-4)', values: series(idx, 'tok.cache_write', days) },
            { key: 'o', label: 'Отговори', color: 'var(--series-3)', values: series(idx, 'tok.output', days) },
            { key: 'i', label: 'Нов вход', color: 'var(--series-2)', values: series(idx, 'tok.input', days) },
          ]} />
        <div className={styles.legend}>
          <span><i style={{ background: 'var(--series-4)' }} />Записано в кеша</span>
          <span><i style={{ background: 'var(--series-3)' }} />Отговори</span>
          <span><i style={{ background: 'var(--series-2)' }} />Нов вход</span>
        </div>
        <p className={styles.meta}>Прочетеното от кеша не е тук — то е десетки пъти повече от останалото и би сплескало всичко до черта. Вижда се в дяла на таблото.</p>
      </section>

      <section className={styles.card} aria-labelledby="sH">
        <div className={styles.head}>
          <h2 id="sH" className={styles.h2}>Сесиите</h2>
          <span className={styles.meta}>{rows.length} за 30 дни</span>
        </div>
        {rows.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Сесия</th><th>Начало</th><th className={styles.num}>Тежест</th><th className={styles.num}>Повиквания</th><th className={styles.num}>Инстр.</th><th>Модел</th></tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className={styles.sessTitle}>{s.title || s.project || s.id.slice(0, 8)}</td>
                    <td className={styles.nowrap}>{new Date(s.started_at).toLocaleString('bg-BG', { timeZone: 'Europe/Sofia', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className={styles.num}>{compact(s.w)}</td>
                    <td className={styles.num}>{s.calls}</td>
                    <td className={styles.num}>{s.tool_calls}</td>
                    <td className={styles.nowrap}>{(s.model || '—').replace('claude-', '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className={styles.muted}>Още няма записани сесии. Пусни <code>node scripts/tablo-sync.mjs</code> на компютъра.</p>}
        <p className={styles.meta}>Делът на кеша в сесия: {percent(0)} значи всичко ново; над 90 % — дълга сесия, носена напред.</p>
      </section>
    </>
  )
}
