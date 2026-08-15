import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { CARDS, DEFAULT_ORDER, layout } from '../TodayDashboard/cards'
import styles from './DashboardCards.module.css'

/**
 * Which cards the dashboard shows, and in what order.
 *
 * Two people using this for two different things want two different pages: one
 * is cutting and opens it for the weight and the macros, another is building a
 * habit and only wants the chips. Rather than guess an order that suits the
 * average of them — which suits neither — the page is theirs to arrange.
 *
 * Hold a row, then drag it. Not the browser's drag-and-drop, which does not
 * exist on touch, and not pointer-down-to-drag either: this list sits inside a
 * scrolling page, and a row that grabs the finger the instant it lands makes
 * the page impossible to scroll past. The hold is what separates "I am moving
 * this" from "I am moving the page", and the hold is abandoned the moment the
 * finger travels — so a scroll that starts on a row is still a scroll.
 */
const HOLD_MS = 220
const SCROLL_CANCEL_PX = 8

export default function DashboardCards() {
  const { profile, updateProfile } = useAuth()
  const [order, setOrder] = useState(() => layout(profile?.dashboard_cards).visible)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dragId, setDragId] = useState(null)

  const listRef = useRef(null)
  const hold = useRef(null)      // pending long-press: { timer, x, y }
  const drag = useRef(null)      // live drag: { id, index }
  const orderRef = useRef(order) // the drag reads and writes this synchronously
  orderRef.current = order

  const hidden = DEFAULT_ORDER.filter(id => !order.includes(id))
  const meta = id => CARDS.find(c => c.id === id)

  async function persist(next) {
    setSaving(true)
    const { error: err } = await updateProfile({ dashboard_cards: next })
    setSaving(false)
    // Loudly, because the previous version failed in silence: the list
    // rearranged itself on screen and reverted on the next load, which reads as
    // the feature not working rather than as the write not landing.
    if (err) {
      console.error('dashboard_cards update failed', err)
      /* The reason, not just the fact. "Опитай пак." sent us looking at the
         drag code for an hour when the database was answering "column
         profiles.dashboard_cards does not exist" the whole time — and a person
         retrying a save that cannot succeed has been told the wrong thing. */
      setError(err.message || 'Не се записа. Опитай пак.')
    } else {
      setError('')
    }
  }

  function commit(next) { setOrder(next); persist(next) }

  // ── Dragging ──────────────────────────────────────────────────────────────

  /* Two things move, and they move for different reasons.
     The held row follows the finger, continuously, because a finger that has
     picked something up expects it under the fingertip and nowhere else. The
     rows it displaces slide into their new places, because a row that teleports
     leaves the eye to work out after the fact what changed.
     The second one is done with FLIP: React has already rearranged the list by
     the time this can see it, so each row is measured where it landed, put back
     where it was with a transform, and then released — which the compositor
     animates without laying anything out again. */
  const MOVE_MS = 190
  const EASE = 'cubic-bezier(.2,.7,.3,1)'

  const rowEls = useRef(new Map())   // id → element
  const prevTops = useRef(new Map()) // where each row was before this render
  const shift = useRef(0)            // how far the held row is from its slot
  const grab = useRef(0)             // where in the row the finger took hold
  const pointer = useRef({ x: 0, y: 0 })
  const dragIdRef = useRef(null)

  const still = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  /** Where a row sits with its transform discounted — its slot, not its skin. */
  function slotTop(id, el) {
    return el.getBoundingClientRect().top - (id === dragIdRef.current ? shift.current : 0)
  }

  /** The same, but measured from the top of the list instead of the top of the
      window. The list scrolls with the page and sits inside a tab that carries
      its own transform, so viewport coordinates taken one render apart are not
      comparable — the difference between them counts the scrolling as movement
      and flings the row that far. */
  function slotIn(id, el, listTop) { return slotTop(id, el) - listTop }

  /** Keeps the held row under the fingertip, whatever slot it now occupies. */
  function follow() {
    const el = rowEls.current.get(dragIdRef.current)
    if (!el) return
    shift.current = (pointer.current.y - grab.current) - slotTop(dragIdRef.current, el)
    el.style.transition = 'none'
    el.style.transform = `translateY(${shift.current}px)`
  }

  /** Which slot the fingertip is over, measured by slots rather than by skins:
      the held row's own box has been dragged away from where it belongs. */
  function indexAt(clientY) {
    const rows = [...(listRef.current?.children ?? [])]
    for (let i = 0; i < rows.length; i++) {
      const id = orderRef.current[i]
      const r = rows[i].getBoundingClientRect()
      const top = slotTop(id, rows[i])
      if (clientY < top + r.height) return i
    }
    return rows.length - 1
  }

  function onMove(e) {
    pointer.current = { x: e.clientX, y: e.clientY }

    // Still deciding whether this is a drag or a scroll.
    if (hold.current) {
      const dx = Math.abs(e.clientX - hold.current.x)
      const dy = Math.abs(e.clientY - hold.current.y)
      if (dx > SCROLL_CANCEL_PX || dy > SCROLL_CANCEL_PX) cancelHold()
      return
    }
    if (!drag.current) return

    follow()

    const to = indexAt(e.clientY)
    const from = drag.current.index
    if (to === from || to < 0) return

    const next = [...orderRef.current]
    next.splice(to, 0, next.splice(from, 1)[0])
    drag.current.index = to
    orderRef.current = next
    setOrder(next)
  }

  function onUp() {
    cancelHold()
    if (!drag.current) return
    const moved = drag.current
    const el = rowEls.current.get(moved.id)

    // Released, so it travels the last stretch to its slot rather than snapping
    // there — the only moment in the gesture where the row moves on its own.
    if (el) {
      el.style.transition = still ? 'none' : `transform ${MOVE_MS}ms ${EASE}`
      el.style.transform = ''
    }
    shift.current = 0
    drag.current = null
    dragIdRef.current = null
    setDragId(null)

    // One write at the end, not one per row crossed.
    if (moved.index !== moved.from) persist(orderRef.current)
  }

  function cancelHold() {
    if (hold.current) { clearTimeout(hold.current.timer); hold.current = null }
  }

  function onDown(e, id, index) {
    // Left button / touch / pen only, and never from the "Скрий" button.
    if (e.button != null && e.button !== 0) return
    if (e.target.closest('button')) return
    pointer.current = { x: e.clientX, y: e.clientY }
    hold.current = {
      x: e.clientX,
      y: e.clientY,
      timer: setTimeout(() => {
        hold.current = null
        const el = rowEls.current.get(id)
        /* Cleared before it is measured: the row may still carry a transform
           from the last time something moved past it, and every offset from
           here on is computed against this one reading. */
        if (el) { el.style.transition = 'none'; el.style.transform = '' }
        grab.current = el ? pointer.current.y - el.getBoundingClientRect().top : 0
        shift.current = 0
        drag.current = { id, index, from: index }
        dragIdRef.current = id
        setDragId(id)
      }, HOLD_MS),
    }
  }

  /* FLIP, after every reordering: measure where each row landed, put it back
     where it was, and let go on the next frame. Runs before paint, so the
     displaced rows are never seen in their new places — they are only ever seen
     travelling to them. */
  useLayoutEffect(() => {
    const els = [...rowEls.current.entries()].filter(([, el]) => el?.isConnected)

    /* Every leftover transform is stripped before anything is measured. A row
       caught mid-animation reports where it is passing through rather than
       where it belongs, and the next displacement is then computed from that
       error and added to it. Two quick swaps were enough to send the list
       across the screen. */
    els.forEach(([id, el]) => {
      if (id === dragIdRef.current) return
      el.style.transition = 'none'
      el.style.transform = ''
    })

    const listTop = listRef.current?.getBoundingClientRect().top ?? 0
    const now = new Map()
    els.forEach(([id, el]) => now.set(id, slotIn(id, el, listTop)))

    if (prevTops.current.size && !still) {
      now.forEach((top, id) => {
        if (id === dragIdRef.current) return          // that one follows the finger
        const was = prevTops.current.get(id)
        if (was == null || Math.abs(was - top) < 0.5) return
        const el = rowEls.current.get(id)
        el.style.transform = `translateY(${was - top}px)`
        requestAnimationFrame(() => {
          // Gone from the list between the two frames — nothing left to release.
          if (!el.isConnected) return
          el.style.transition = `transform ${MOVE_MS}ms ${EASE}`
          el.style.transform = ''
        })
      })
    }
    prevTops.current = now
  }, [order])

  /* Bound to the window rather than to the row: once a row is moving, the
     pointer spends most of its time over its neighbours, and a listener on the
     row itself would stop hearing about it.
     Called through a ref because the listeners are attached once, and the
     handlers they would otherwise capture reach updateProfile — which closes
     over the session. A session refreshed an hour into the visit would leave
     the drag writing with the old one. */
  const handlers = useRef({ onMove, onUp })
  handlers.current = { onMove, onUp }

  useEffect(() => {
    const move = e => handlers.current.onMove(e)
    const up = () => handlers.current.onUp()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  /* The page must not scroll under a row that is being dragged. touch-action
     cannot do it — changing it mid-gesture does not affect the gesture already
     in flight — so the touchmove is refused outright while a drag is live, and
     only then. */
  useEffect(() => {
    if (!dragId) return
    const block = e => e.preventDefault()
    window.addEventListener('touchmove', block, { passive: false })
    return () => window.removeEventListener('touchmove', block)
  }, [dragId])

  /* Slotted in where the default order would have put it, rather than appended:
     someone switching the weight card back on wants it back near the top, not
     underneath the shop. Everything already in the list keeps its arrangement. */
  function show(id) {
    const rank = x => DEFAULT_ORDER.indexOf(x)
    const at = order.findIndex(x => rank(x) > rank(id))
    const next = [...order]
    next.splice(at === -1 ? next.length : at, 0, id)
    commit(next)
  }

  function hide(id) { commit(order.filter(x => x !== id)) }

  /* Keyboard equivalent. Holding a row is a gesture a keyboard cannot make, and
     without this the setting would be operable only by people who can. */
  function onKeyDown(e, index) {
    const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    if (!delta || !e.altKey) return
    const to = index + delta
    if (to < 0 || to >= order.length) return
    e.preventDefault()
    const next = [...order]
    ;[next[index], next[to]] = [next[to], next[index]]
    commit(next)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>ТАБЛОТО</span>
        {saving && <span className={styles.saving}>записва…</span>}
      </div>
      <p className={styles.lead}>
        Задръж и влачи, за да пренаредиш.
      </p>
      {error && (
        <p className={styles.error}>
          Не се записа. <span className={styles.errorWhy}>{error}</span>
        </p>
      )}

      <ul className={styles.list} ref={listRef}>
        {order.map((id, i) => (
          <li
            key={id}
            ref={el => {
              if (el) rowEls.current.set(id, el)
              else rowEls.current.delete(id)
            }}
            className={`${styles.row} ${dragId === id ? styles.rowDrag : ''}`}
            onPointerDown={e => onDown(e, id, i)}
            onKeyDown={e => onKeyDown(e, i)}
            tabIndex={0}
            role="button"
            aria-label={`${meta(id)?.label}. Alt със стрелка нагоре или надолу мести.`}
          >
            <span className={styles.grip} aria-hidden="true">
              <span /><span /><span />
            </span>
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
        <p className={styles.empty}>Няма нищо избрано — страницата ще е празна.</p>
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
