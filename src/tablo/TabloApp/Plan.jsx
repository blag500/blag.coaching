import { useState } from 'react'
import { addDays, dowShort, shortDate, sofiaDay } from '../calc'
import { Why } from './Audit.jsx'
import styles from './TabloApp.module.css'

/* Разделът „План": седмицата и идеите. Стъпката и чакащото са в „Сега" —
 * тук не се повтарят. Идеите са по състояние; отворено е само „В работа",
 * другите се разгъват с натискане, за да не е списъкът дълъг пет екрана. */

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
    <>
      <Week items={items} />
      <Ideas ideas={items.filter((i) => i.kind === 'idea')} onSave={onSave} onAdd={onAdd} />
    </>
  )
}

function Week({ items }) {
  const today = sofiaDay()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const weekly = items.filter((i) => i.kind === 'weekly')
  const events = items.filter((i) => i.kind === 'event')
  return (
    <section className={styles.section} aria-labelledby="weekH">
      <div className={styles.sectionHead}><h2 id="weekH" className={styles.h2}>Седмицата</h2></div>
      <ol className={`${styles.card} ${styles.list}`}>
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
  const live = ideas.filter((i) => i.status !== 'done').length

  function submit(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    onAdd({ kind: 'idea', title: t, area, status: 'spark' })
    setTitle('')
  }

  return (
    <section className={styles.section} aria-labelledby="ideasH">
      <div className={styles.sectionHead}>
        <h2 id="ideasH" className={styles.h2}>Идеи</h2>
        <span className={styles.count}>{live}</span>
      </div>

      <form className={styles.add} onSubmit={submit}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Нова идея" autoComplete="off" aria-label="Нова идея" />
        <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Към кое">
          {AREAS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <button type="submit" className={styles.primary}>Добави</button>
      </form>

      <div className={styles.groups}>
        {STATUSES.map((s) => {
          const rows = ideas.filter((i) => (i.status || 'spark') === s.id)
            .sort((a, b) => (a.sort - b.sort) || String(b.updated_at).localeCompare(String(a.updated_at)))
          if (!rows.length) return null
          return (
            <details key={s.id} className={styles.group} open={s.id === 'doing'}>
              <summary>
                <h3 className={styles.groupH}><i style={{ background: s.color }} />{s.label}</h3>
                <span className={styles.count}>{rows.length}</span>
              </summary>
              <ul className={styles.list}>
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
            </details>
          )
        })}
      </div>
    </section>
  )
}
