import { useMemo, useState } from 'react'
import { Dot } from '../Charts/Charts.jsx'
import styles from './TabloApp.module.css'

/* Разделът „Одит": какво е намерено по проектите. Всяка находка е ред с
 * тежест (внимание / следи / дребно) и състояние. Поправеното стои отдолу,
 * за да се вижда какво е свършено, а предложенията за махане — отделно,
 * защото те чакат „да" от човека, не работа от Claude. */

const SEV = { high: { label: 'Внимание', lv: 'high' }, watch: { label: 'Следи', lv: 'watch' }, low: { label: 'Дребно', lv: 'ok' } }
const STATES = [
  { id: 'open', label: 'Отворени', one: 'Отворена' },
  { id: 'proposal', label: 'Предложения', one: 'Предложение' },
  { id: 'fixed', label: 'Поправени', one: 'Поправена' },
  { id: 'dropped', label: 'Отказани', one: 'Отказана' },
]
const ORDER = { high: 0, watch: 1, low: 2 }

export default function Audit({ items, onSave }) {
  const findings = items.filter((i) => i.kind === 'finding')
  const areas = useMemo(() => ['Всички', ...new Set(findings.map((f) => f.area).filter(Boolean))], [findings])
  const [area, setArea] = useState('Всички')
  const shown = findings.filter((f) => area === 'Всички' || f.area === area)

  if (!findings.length) {
    return (
      <section className={styles.card}>
        <h2 className={styles.h2}>Одит</h2>
        <p className={styles.muted}>Находките от одита се появяват тук, щом Claude ги запише.</p>
      </section>
    )
  }

  const counts = STATES.map((s) => ({ ...s, n: findings.filter((f) => f.state === s.id).length }))

  return (
    <>
      <div className={styles.miniTiles}>
        {counts.map((c) => (
          <div key={c.id} className={styles.mini}>
            <span className={styles.label}>{c.label}</span>
            <span className={styles.miniValue}>{c.n}</span>
          </div>
        ))}
      </div>

      <div className={styles.chipsRow} role="tablist" aria-label="Проект">
        {areas.map((a) => (
          <button key={a} type="button" role="tab" aria-selected={area === a}
            className={`${styles.seg} ${area === a ? styles.segOn : ''}`} onClick={() => setArea(a)}>{a}</button>
        ))}
      </div>

      {STATES.map((s) => {
        const rows = shown.filter((f) => f.state === s.id)
          .sort((a, b) => (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3) || a.sort - b.sort)
        if (!rows.length) return null
        return (
          <section key={s.id} className={styles.card} aria-labelledby={`au-${s.id}`}>
            <div className={styles.head}>
              <h2 id={`au-${s.id}`} className={styles.h2}>{s.label}</h2>
              <span className={styles.meta}>{rows.length}</span>
            </div>
            <ul className={styles.rows}>
              {rows.map((f) => (
                <li key={f.id} className={styles.finding}>
                  <div className={styles.findingHead}>
                    <span className={styles.findingSev}><Dot level={SEV[f.severity]?.lv ?? 'watch'} />{SEV[f.severity]?.label ?? '—'}</span>
                    {f.area && <span className={styles.findingArea}>{f.area}</span>}
                  </div>
                  <span className={styles.ideaTitle}>{f.title}</span>
                  {f.why && <span className={styles.ideaWhy}>{f.why}</span>}
                  {f.link && <code className={styles.findingLink}>{f.link}</code>}
                  <select
                    id={`fs-${f.id}`}
                    className={styles.status}
                    value={f.state}
                    aria-label={`Състояние на „${f.title}“`}
                    onChange={(e) => onSave(f.id, { state: e.target.value })}
                  >
                    {STATES.map((o) => <option key={o.id} value={o.id}>{o.one}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}
