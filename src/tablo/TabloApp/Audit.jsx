import { useMemo, useState } from 'react'
import { Dot, Meter, Ring } from '../Charts/Charts.jsx'
import styles from './TabloApp.module.css'

/* Разделът „Одит": какво е намерено по проектите. Отгоре плочка с пръстен —
 * колко от намереното е поправено — и колко е отворено по проект, в цвета на
 * най-тежката находка там. После предложенията — те чакат „да" от човека, не
 * работа от Claude — и отвореното. Поправеното и отказаното са сгънати. */

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
    return <p className={`${styles.tile} ${styles.empty}`}>Находките от одита се появяват тук, щом Claude ги запише.</p>
  }

  const live = findings.filter((f) => f.state === 'open' || f.state === 'proposal')
  const counted = findings.filter((f) => f.state !== 'dropped')
  const fixed = counted.filter((f) => f.state === 'fixed').length
  const perArea = [...live.reduce((m, f) => {
    const k = f.area || 'Друго', cur = m.get(k) || { n: 0, sev: 'low' }
    m.set(k, { n: cur.n + 1, sev: (ORDER[f.severity] ?? 3) < ORDER[cur.sev] ? f.severity : cur.sev })
    return m
  }, new Map())].sort((a, b) => b[1].n - a[1].n)
    .map(([name, v]) => ({ name, value: v.n, color: SEV_VAR[v.sev] }))

  return (
    <div className={styles.cols}>
      <div className={styles.col}>
        <section className={styles.tile} aria-labelledby="auSum">
          <div className={styles.tileHead}><h2 id="auSum" className={styles.tileH}>Накратко</h2><span className={styles.tileHint}>всички проекти</span></div>
          <div className={styles.health}>
            <Ring value={counted.length ? fixed / counted.length : 0} label={counted.length ? Math.round((fixed / counted.length) * 100) : 0} unit="%"
              color="var(--ok)" title={`Поправени ${fixed} от ${counted.length}`} />
            <div>
              <strong>{fixed} от {counted.length} поправени</strong>
              <p className={styles.muted}>{live.filter((f) => f.state === 'open').length} отворени · {live.filter((f) => f.state === 'proposal').length} чакат „да“</p>
            </div>
          </div>
          {perArea.length > 0 && <Meter rows={perArea} />}
          <div className={styles.legend}>
            {Object.entries(SEV).map(([k, v]) => <span key={k}><i style={{ background: SEV_VAR[k] }} />{v.label}</span>)}
          </div>
        </section>
      </div>
      <div className={`${styles.col} ${styles.colWide}`}>
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
          <ul className={styles.rows}>
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
          <section key={s.id} className={styles.tile} aria-labelledby={`au-${s.id}`}>
            <div className={styles.tileHead}>
              <h2 id={`au-${s.id}`} className={styles.tileH}>{s.label}</h2>
              <span className={styles.tileHint}>{rows.length}</span>
            </div>
            {list}
          </section>
        ) : (
          <details key={s.id} className={`${styles.tile} ${styles.fold}`}>
            <summary>
              <h2 className={styles.tileH}>{s.label}</h2>
              <span className={styles.tileHint}>{rows.length}</span>
            </summary>
            {list}
          </details>
        )
      })}
      </div>
    </div>
  )
}

const SEV_VAR = { high: 'var(--bad)', watch: 'var(--warn)', low: 'var(--ok)' }

/* Обяснението в три реда; натискане го показва цяло и пак го свива. */
export function Why({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <span className={`${styles.itemWhy} ${open ? '' : styles.clamp}`} onClick={() => setOpen((o) => !o)}>{text}</span>
  )
}
