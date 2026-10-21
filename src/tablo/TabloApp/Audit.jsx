import { useMemo, useState } from 'react'
import { Dot } from '../Charts/Charts.jsx'
import styles from './TabloApp.module.css'

/* Разделът „Одит": какво е намерено по проектите. Отгоре предложенията —
 * те чакат „да" от човека, не работа от Claude. После отвореното. Поправеното
 * и отказаното са сгънати: да се вижда, че ги има, без да са девет екрана. */

const SEV = { high: { label: 'Внимание', lv: 'high' }, watch: { label: 'Следи', lv: 'watch' }, low: { label: 'Дребно', lv: 'ok' } }
const STATES = [
  { id: 'proposal', label: 'Чакат твоето „да“', one: 'Предложение', open: true },
  { id: 'open', label: 'Отворени', one: 'Отворена', open: true },
  { id: 'fixed', label: 'Поправени', one: 'Поправена', open: false },
  { id: 'dropped', label: 'Отказани', one: 'Отказана', open: false },
]
const ORDER = { high: 0, watch: 1, low: 2 }

export default function Audit({ items, onSave }) {
  const findings = items.filter((i) => i.kind === 'finding')
  const areas = useMemo(() => ['Всички', ...new Set(findings.map((f) => f.area).filter(Boolean))], [findings])
  const [area, setArea] = useState('Всички')
  const shown = findings.filter((f) => area === 'Всички' || f.area === area)

  if (!findings.length) {
    return <p className={`${styles.card} ${styles.empty}`}>Находките от одита се появяват тук, щом Claude ги запише.</p>
  }

  return (
    <>
      <div className={styles.chips} role="tablist" aria-label="Проект">
        {areas.map((a) => (
          <button key={a} type="button" role="tab" aria-selected={area === a}
            className={styles.chip} onClick={() => setArea(a)}>{a}</button>
        ))}
      </div>

      {STATES.map((s) => {
        const rows = shown.filter((f) => f.state === s.id)
          .sort((a, b) => (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3) || a.sort - b.sort)
        if (!rows.length) return null
        const list = (
          <ul className={`${styles.card} ${styles.list}`}>
            {rows.map((f) => (
              <li key={f.id} className={styles.item}>
                <span className={styles.itemMeta}>
                  <Dot level={SEV[f.severity]?.lv ?? 'watch'} />{SEV[f.severity]?.label ?? '—'}
                  {f.area && <> · {f.area}</>}
                </span>
                <span className={styles.itemTitle}>{f.title}</span>
                {f.why && <Why text={f.why} />}
                {f.link && <code className={styles.code}>{f.link}</code>}
                <span className={styles.itemFoot}>
                  <span />
                  <select
                    className={styles.select}
                    value={f.state}
                    aria-label={`Състояние на „${f.title}“`}
                    onChange={(e) => onSave(f.id, { state: e.target.value })}
                  >
                    {STATES.map((o) => <option key={o.id} value={o.id}>{o.one}</option>)}
                  </select>
                </span>
              </li>
            ))}
          </ul>
        )
        return s.open ? (
          <section key={s.id} className={styles.section} aria-labelledby={`au-${s.id}`}>
            <div className={styles.sectionHead}>
              <h2 id={`au-${s.id}`} className={styles.h2}>{s.label}</h2>
              <span className={styles.count}>{rows.length}</span>
            </div>
            {list}
          </section>
        ) : (
          <details key={s.id} className={`${styles.section} ${styles.fold}`}>
            <summary>
              <h2 className={styles.h2}>{s.label}</h2>
              <span className={styles.count}>{rows.length}</span>
            </summary>
            {list}
          </details>
        )
      })}
    </>
  )
}

/* Обяснението в три реда; натискане го показва цяло и пак го свива. */
export function Why({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <span className={`${styles.itemWhy} ${open ? '' : styles.clamp}`} onClick={() => setOpen((o) => !o)}>{text}</span>
  )
}
