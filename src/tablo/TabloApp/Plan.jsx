import { useState } from 'react'
import { addDays, dowShort, shortDate, sofiaDay } from '../calc'
import { Meter } from '../Charts/Charts.jsx'
import { Why } from './Audit.jsx'
import styles from './TabloApp.module.css'

/* Разделът „План": седмицата и идеите. Стъпката и чакащото са в „Сега" —
 * тук не се повтарят. Идеите: отгоре колко има по проект (ленти, като
 * „Top consumers" в образеца), после превключвател по състояние — вижда се
 * едно състояние наведнъж, „В работа" е първото. */

export const STATUSES = [
  { id: 'doing', label: 'В работа', color: 'var(--ok)' },
  { id: 'think', label: 'Обмисля се', color: 'var(--series-1)' },
  { id: 'spark', label: 'Искра', color: 'var(--warn)' },
  { id: 'park', label: 'Отложено', color: 'var(--series-4)' },
  { id: 'done', label: 'Готово', color: 'var(--ink-3)' },
]

const AREAS = ['Blag', 'Чийт Код', 'Здраве и Сила', 'Позинг', 'Съдържание', 'Лично']

export default function Plan({ items, onSave, onAdd }) {
  return (
    <div className={`${styles.cols} ${styles.cols12}`}>
      <div className={styles.col}><Week items={items} /></div>
      <div className={styles.col}><Ideas ideas={items.filter((i) => i.kind === 'idea')} onSave={onSave} onAdd={onAdd} /></div>
    </div>
  )
}

function Week({ items }) {
  const today = sofiaDay()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const weekly = items.filter((i) => i.kind === 'weekly')
  const events = items.filter((i) => i.kind === 'event')
  return (
    <section className={styles.tile} aria-labelledby="weekH">
      <div className={styles.tileHead}><h2 id="weekH" className={styles.tileH}>Седмицата</h2><span className={styles.tileHint}>7 дни напред</span></div>
      <ol className={styles.week}>
        {days.map((d, i) => {
          const dow = new Date(`${d}T12:00:00Z`).getUTCDay()
          const rows = [
            ...weekly.filter((w) => w.dow === dow),
            ...events.filter((e) => e.day === d),
          ]
          return (
            <li key={d} className={`${styles.day} ${i === 0 ? styles.today : ''}`}>
              <span className={styles.dayHead}>
                <b>{i === 0 ? 'Днес' : dowShort(d)}</b>
                <span>{shortDate(d)}</span>
              </span>
              {rows.length ? (
                <ul className={styles.dayItems}>{rows.map((r) => <li key={r.id}>{r.title}</li>)}</ul>
              ) : <span className={styles.free}>Свободно</span>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Ideas({ ideas, onSave, onAdd }) {
  const [title, setTitle] = useState('')
  const [area, setArea] = useState(AREAS[0])
  const [status, setStatus] = useState('doing')
  const live = ideas.filter((i) => i.status !== 'done')
  const byArea = [...live.reduce((m, i) => m.set(i.area || 'Друго', (m.get(i.area || 'Друго') || 0) + 1), new Map())]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], k) => ({ name, value, color: AREA_COLORS[k % AREA_COLORS.length] }))
  const rows = ideas.filter((i) => (i.status || 'spark') === status)
    .sort((a, b) => (a.sort - b.sort) || String(b.updated_at).localeCompare(String(a.updated_at)))

  function submit(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    onAdd({ kind: 'idea', title: t, area, status: 'spark' })
    setTitle('')
  }

  return (
    <section className={styles.tile} aria-labelledby="ideasH">
      <div className={styles.tileHead}>
        <h2 id="ideasH" className={styles.tileH}>Идеи</h2>
        <span className={styles.tileHint}>{live.length} живи</span>
      </div>

      {byArea.length > 1 && <Meter rows={byArea} />}

      <div className={styles.seg} role="tablist" aria-label="Състояние">
        {STATUSES.map((s) => {
          const n = ideas.filter((i) => (i.status || 'spark') === s.id).length
          return (
            <button key={s.id} type="button" role="tab" aria-selected={status === s.id} onClick={() => setStatus(s.id)}>
              {s.label}<span>{n}</span>
            </button>
          )
        })}
      </div>

      {rows.length ? (
        <ul className={styles.rows}>
          {rows.map((it) => (
            <li key={it.id} className={styles.item}>
              <span className={styles.itemTitle}>{it.title}</span>
              {it.why && <Why text={it.why} />}
              <span className={styles.itemFoot}>
                {it.area ? <span className={styles.tag}>{it.area}</span> : <span />}
                <select
                  className={styles.select}
                  value={it.status || 'spark'}
                  aria-label={`Състояние на „${it.title}“`}
                  onChange={(e) => onSave(it.id, { status: e.target.value })}
                >
                  {STATUSES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </span>
            </li>
          ))}
        </ul>
      ) : <p className={styles.empty}>Нищо в „{STATUSES.find((s) => s.id === status).label}“.</p>}

      <form className={styles.add} onSubmit={submit}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Нова идея" autoComplete="off" aria-label="Нова идея" />
        <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Към кое">
          {AREAS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <button type="submit" className={styles.primary}>Добави</button>
      </form>
    </section>
  )
}

const AREA_COLORS = ['var(--series-2)', 'var(--series-1)', 'var(--series-3)', 'var(--ok)', 'var(--warn)', 'var(--series-4)']
