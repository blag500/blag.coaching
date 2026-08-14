import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { CARDS, DEFAULT_ORDER, layout } from '../TodayDashboard/cards'
import styles from './DashboardCards.module.css'

/**
 * Which cards Днес shows, and in what order.
 *
 * Two people using this for two different things want two different pages: one
 * is cutting and opens it for the weight and the macros, another is building a
 * habit and only wants the six chips. Rather than guess an order that suits the
 * average of them — which suits neither — the page is theirs to arrange.
 *
 * Arrows rather than drag and drop. Dragging a row inside a scrolling page on a
 * phone fights the scroll, and the fight is lost by the person whose finger
 * moves eight pixels before it moves eighty. Two taps always work.
 *
 * Saved on every change instead of behind a "save" button: there is nothing to
 * validate and nothing to undo that a second tap does not undo, so a button
 * would only be one more thing to forget to press.
 */
export default function DashboardCards() {
  const { profile, updateProfile } = useAuth()
  const [order, setOrder] = useState(() => layout(profile?.dashboard_cards).visible)
  const [saving, setSaving] = useState(false)

  const hidden = DEFAULT_ORDER.filter(id => !order.includes(id))
  const meta = id => CARDS.find(c => c.id === id)

  async function commit(next) {
    setOrder(next)
    setSaving(true)
    await updateProfile({ dashboard_cards: next })
    setSaving(false)
  }

  function move(i, delta) {
    const j = i + delta
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    commit(next)
  }

  /* Slotted in where the default order would have put it, rather than appended:
     someone switching the weight card back on wants it back near the top, not
     underneath the shop. Everything already in the list keeps the arrangement
     it has — only the returning card is placed. */
  function show(id) {
    const rank = x => DEFAULT_ORDER.indexOf(x)
    const at = order.findIndex(x => rank(x) > rank(id))
    const next = [...order]
    next.splice(at === -1 ? next.length : at, 0, id)
    commit(next)
  }

  function hide(id) { commit(order.filter(x => x !== id)) }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>СТРАНИЦАТА „ДНЕС"</span>
        {saving && <span className={styles.saving}>записва…</span>}
      </div>
      <p className={styles.lead}>
        Подреди какво виждаш, когато отвориш приложението.
      </p>

      <ul className={styles.list}>
        {order.map((id, i) => (
          <li key={id} className={styles.row}>
            <div className={styles.arrows}>
              <button
                type="button" className={styles.arrow} onClick={() => move(i, -1)}
                disabled={i === 0} aria-label="Нагоре"
              >↑</button>
              <button
                type="button" className={styles.arrow} onClick={() => move(i, 1)}
                disabled={i === order.length - 1} aria-label="Надолу"
              >↓</button>
            </div>
            <div className={styles.text}>
              <span className={styles.name}>{meta(id)?.label ?? id}</span>
              <span className={styles.hint}>{meta(id)?.hint}</span>
            </div>
            <button type="button" className={styles.toggle} onClick={() => hide(id)}>
              Скрий
            </button>
          </li>
        ))}
      </ul>

      {order.length === 0 && (
        <p className={styles.empty}>
          Няма нищо избрано — страницата ще е празна.
        </p>
      )}

      {hidden.length > 0 && (
        <>
          <span className={styles.subhead}>СКРИТИ</span>
          <ul className={styles.list}>
            {hidden.map(id => (
              <li key={id} className={`${styles.row} ${styles.rowOff}`}>
                <div className={styles.text}>
                  <span className={styles.name}>{meta(id)?.label ?? id}</span>
                  <span className={styles.hint}>{meta(id)?.hint}</span>
                </div>
                <button type="button" className={styles.toggleOn} onClick={() => show(id)}>
                  Покажи
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
