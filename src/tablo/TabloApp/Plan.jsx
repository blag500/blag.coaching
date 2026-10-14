import { useState } from 'react'
import { addDays, dowShort, shortDate, sofiaDay } from '../calc'
import styles from './TabloApp.module.css'

/* Разделът „План": стъпката, седмицата, идеите, чакащото. Тук човекът пише
 * и отмята; Claude допълва от сесиите. Стъпката е една — вниманието е
 * по-тясното място от времето, затова таблото не дава списък от стъпки. */

export const STATUSES = [
  { id: 'doing', label: 'В работа', color: 'var(--ok)' },
  { id: 'think', label: 'Обмисля се', color: 'var(--series-1)' },
  { id: 'spark', label: 'Искра', color: 'var(--accent)' },
  { id: 'park', label: 'Отложено', color: 'var(--series-6)' },
  { id: 'done', label: 'Готово', color: 'var(--muted)' },
]

const AREAS = ['Blag', 'Чийт Код', 'Здраве и Сила', 'Позинг', 'Съдържание', 'Лично']

export default function Plan({ items, onSave, onAdd }) {
  const focus = items.find((i) => i.kind === 'focus')
  const insight = items.find((i) => i.kind === 'insight')
  const ideas = items.filter((i) => i.kind === 'idea')
  const you = items.filter((i) => i.kind === 'you')
  const decide = items.filter((i) => i.kind === 'decide')

  return (
    <>
      {focus && (
        <section className={`${styles.card} ${styles.focus} ${focus.done ? styles.focusDone : ''}`} aria-labelledby="focusH">
          <span id="focusH" className={styles.focusLabel}>Следващата стъпка</span>
          <p className={styles.focusText}>{focus.title}</p>
          {focus.why && <p className={styles.muted}>{focus.why}</p>}
          <div className={styles.focusRow}>
            {focus.done
              ? <span className={styles.meta}>Отметната. Кажи на Claude и той слага следващата.</span>
              : <button type="button" className={styles.primary} onClick={() => onSave(focus.id, { done: true, done_at: new Date().toISOString() })}>Готово</button>}
          </div>
        </section>
      )}

      <Week items={items} />

      <div className={styles.grid2}>
        <Ideas ideas={ideas} onSave={onSave} onAdd={onAdd} />
        <div className={styles.stack}>
          <Tasks title="Чака теб" id="youH" rows={you} onSave={onSave} empty="Нищо не те чака." />
          <Tasks title="Чака решение" id="decH" rows={decide} onSave={onSave} empty="Няма отворени решения." />
          {insight && (
            <section className={styles.card} aria-labelledby="insH2">
              <h2 id="insH2" className={styles.label}>Наблюдение</h2>
              <blockquote className={styles.insight}>{insight.title}</blockquote>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

function Week({ items }) {
  const today = sofiaDay()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const weekly = items.filter((i) => i.kind === 'weekly')
  const events = items.filter((i) => i.kind === 'event')
  return (
    <section className={styles.card} aria-labelledby="weekH">
      <h2 id="weekH" className={styles.h2}>Следващите седем дни</h2>
      <ol className={styles.week}>
        {days.map((d, i) => {
          const dow = new Date(`${d}T12:00:00Z`).getUTCDay()
          const rows = [
            ...weekly.filter((w) => w.dow === dow).map((w) => ({ ...w, fixed: true })),
            ...events.filter((e) => e.day === d),
          ]
          return (
            <li key={d} className={`${styles.day} ${i === 0 ? styles.today : ''}`}>
              <span className={styles.dayHead}>
                <b>{i === 0 ? 'Днес' : dowShort(d)}</b>
                <span>{shortDate(d)}</span>
              </span>
              {rows.length ? (
                <ul>
                  {rows.map((r) => <li key={r.id} className={r.fixed ? styles.fixed : ''}>{r.title}</li>)}
                </ul>
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
    <section className={styles.card} aria-labelledby="ideasH">
      <div className={styles.head}>
        <h2 id="ideasH" className={styles.h2}>Идеи</h2>
        <span className={styles.meta}>{live} живи</span>
      </div>
      {STATUSES.map((s) => {
        const rows = ideas.filter((i) => (i.status || 'spark') === s.id)
          .sort((a, b) => (a.sort - b.sort) || String(b.updated_at).localeCompare(String(a.updated_at)))
        if (!rows.length) return null
        return (
          <div key={s.id} className={styles.group}>
            <h3 className={styles.groupH}><i style={{ background: s.color }} />{s.label} · {rows.length}</h3>
            <ul className={styles.rows}>
              {rows.map((it) => (
                <li key={it.id} className={styles.idea}>
                  <div className={styles.ideaMain}>
                    <span className={styles.ideaTitle}>{it.title}{it.area && <small>{it.area}</small>}</span>
                    {it.why && <span className={styles.ideaWhy}>{it.why}</span>}
                  </div>
                  <select
                    id={`st-${it.id}`}
                    className={styles.status}
                    style={{ '--st': s.color }}
                    value={it.status || 'spark'}
                    aria-label={`Състояние на „${it.title}“`}
                    onChange={(e) => onSave(it.id, { status: e.target.value })}
                  >
                    {STATUSES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <form className={styles.add} onSubmit={submit}>
        <input id="ideaTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Нова идея" autoComplete="off" aria-label="Нова идея" />
        <select id="ideaArea" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Към кое">
          {AREAS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <button type="submit" className={styles.primary}>Добави</button>
      </form>
    </section>
  )
}

function Tasks({ title, id, rows, onSave, empty }) {
  const sorted = [...rows].sort((a, b) => (a.done - b.done) || (a.sort - b.sort))
  const open = rows.filter((r) => !r.done).length
  return (
    <section className={styles.card} aria-labelledby={id}>
      <div className={styles.head}>
        <h2 id={id} className={styles.h2}>{title}</h2>
        <span className={styles.meta}>{open} отворени</span>
      </div>
      {sorted.length ? (
        <ul className={styles.rows}>
          {sorted.map((t) => (
            <li key={t.id} className={`${styles.task} ${t.done ? styles.taskDone : ''}`}>
              <input
                type="checkbox"
                id={`tk-${t.id}`}
                checked={t.done}
                onChange={(e) => onSave(t.id, { done: e.target.checked, done_at: e.target.checked ? new Date().toISOString() : null })}
              />
              <label htmlFor={`tk-${t.id}`}>
                {t.title}
                {t.area && <small>{t.area}</small>}
              </label>
            </li>
          ))}
        </ul>
      ) : <p className={styles.muted}>{empty}</p>}
    </section>
  )
}
