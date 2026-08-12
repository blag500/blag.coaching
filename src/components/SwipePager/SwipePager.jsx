import { useEffect, useRef, useState } from 'react'
import { isProtected } from '../../utils/gestures'
import styles from './SwipePager.module.css'

// Before either axis is committed to, this much travel decides which one wins.
const AXIS_LOCK   = 8
// A drag past this share of the screen goes through on distance alone.
const COMMIT_PART = 0.28
// A short but fast flick goes through too — the intent is obvious well before
// the finger has crossed a quarter of the screen.
const FLICK_SPEED = 0.45   // px per ms
const FLICK_MIN   = 40     // but never on a twitch

/**
 * Tabs that follow the finger.
 *
 * The incoming page is mounted and slides in over the one you are leaving, and
 * the change is committed only when the finger lifts — so a gesture can be
 * abandoned halfway and nothing moves. A swipe you cannot take back is a button
 * with extra steps.
 *
 * The page being left behind deliberately does not move. Translating it would
 * make it the containing block for every `position: fixed` element inside it,
 * and those are all over the app — the remaining-macros bar, the chat composer,
 * the SOS button. A fixed child of a transformed ancestor is positioned against
 * that ancestor's box rather than the screen, so each one would jump to the
 * bottom of the page the instant the drag began. The incoming pane is fixed and
 * viewport-sized, which makes it a correct frame for its own fixed children.
 *
 * At the first tab there is no page to the left, so dragging that way pulls the
 * side navigation out instead.
 */
export default function SwipePager({
  order, active, onChange, render, enabled = true,
  onEdgePull, onEdgeEnd,
}) {
  const hostRef = useRef(null)
  const [dx, setDxState]      = useState(0)
  const [settling, setSettle] = useState(false)
  // Which neighbour is being revealed: -1 for the tab on the left, +1 right.
  const [reveal, setReveal]   = useState(0)

  const idx = order.indexOf(active)

  // Mirrors for the listeners, which are bound once: a re-render in the middle
  // of a drag must not tear them down, and they must not read stale values.
  const dxRef     = useRef(0)
  const commitRef = useRef(null)
  const settleRef = useRef(false)
  const live      = useRef({})
  live.current = { order, active, idx, onChange, enabled, onEdgePull, onEdgeEnd }

  function setDx(v) { dxRef.current = v; setDxState(v) }

  /** The slide has landed; adopt the new tab in the same paint. */
  function finish() {
    if (!settleRef.current) return
    const target = commitRef.current
    commitRef.current = null
    settleRef.current = false
    setSettle(false)
    setDx(0)
    setReveal(0)
    // Instant, because the page has already travelled — animating it in again
    // would be the same move played twice.
    if (target) onChange(target, { instant: true })
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let startX = 0, startY = 0, startedAt = 0
    let axis = null              // null until locked, then 'x' or 'y'
    let dir  = 0                 // +1 revealing the tab on the right, -1 left
    let edge = false             // pulling the drawer instead of a page
    let width = window.innerWidth
    let lastX = 0, lastT = 0, speed = 0

    function reset() { axis = null; dir = 0; edge = false; speed = 0 }

    function onStart(e) {
      // A settle on its way to a new tab owns the screen until it lands.
      if (settleRef.current && commitRef.current) { axis = 'y'; return }
      reset()
      const l = live.current
      if (!l.enabled || e.touches.length !== 1) { axis = 'y'; return }
      const t = e.touches[0]
      if (isProtected(t.target)) { axis = 'y'; return }
      width = window.innerWidth
      startX = lastX = t.clientX
      startY = t.clientY
      startedAt = lastT = performance.now()
      settleRef.current = false
      setSettle(false)
    }

    function onMove(e) {
      if (axis === 'y' || e.touches.length !== 1) return
      const t  = e.touches[0]
      const mx = t.clientX - startX
      const my = t.clientY - startY

      if (axis === null) {
        if (Math.abs(mx) < AXIS_LOCK && Math.abs(my) < AXIS_LOCK) return
        // Whichever direction moved further first owns the gesture. Vertical
        // wins ties, because scrolling is the thing people do most.
        axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
        if (axis === 'y') return
      }

      // The screen is following the finger now, so the browser must stop trying
      // to scroll underneath it. This is why the listener is not passive.
      if (e.cancelable) e.preventDefault()

      const now = performance.now()
      const dt  = now - lastT
      if (dt > 0) speed = (t.clientX - lastX) / dt
      lastX = t.clientX
      lastT = now

      const l = live.current
      const wants = mx < 0 ? 1 : -1
      const has   = wants > 0 ? l.idx < l.order.length - 1 : l.idx > 0

      if (has) {
        if (edge) { edge = false; l.onEdgePull?.(null) }
        if (wants !== dir) { dir = wants; setReveal(wants) }
        setDx(mx)
        return
      }

      // Nothing to the left of the first tab — that pull opens the drawer.
      if (wants < 0 && l.onEdgePull) {
        if (!edge) { edge = true; if (dir !== 0) { dir = 0; setReveal(0) }; setDx(0) }
        l.onEdgePull(mx)
        return
      }

      if (dir !== 0) { dir = 0; setReveal(0) }
      setDx(0)
    }

    function onEnd() {
      if (axis !== 'x') { reset(); return }
      const l = live.current
      const travelled = lastX - startX
      const elapsed   = performance.now() - startedAt
      const fastEnough = Math.abs(speed) > FLICK_SPEED &&
                         Math.abs(travelled) > FLICK_MIN &&
                         Math.sign(speed) === Math.sign(travelled) &&
                         elapsed < 700

      if (edge) {
        l.onEdgeEnd?.(travelled > width * 0.35 || (fastEnough && travelled > 0))
        reset()
        return
      }

      const target = dir > 0 ? l.idx + 1 : l.idx - 1
      const exists = dir !== 0 && target >= 0 && target < l.order.length
      const farEnough = Math.abs(travelled) > width * COMMIT_PART

      const go     = exists && (farEnough || fastEnough)
      const nextDx = go ? -dir * width : 0
      commitRef.current = go ? l.order[target] : null
      reset()

      // A drag that ended exactly where it started animates nothing, so no
      // transitionend would ever arrive to finish the job.
      settleRef.current = true
      if (nextDx === dxRef.current) { finish(); return }
      setSettle(true)
      setDx(nextDx)
    }

    host.addEventListener('touchstart',  onStart, { passive: true })
    host.addEventListener('touchmove',   onMove,  { passive: false })
    host.addEventListener('touchend',    onEnd,   { passive: true })
    host.addEventListener('touchcancel', onEnd,   { passive: true })
    return () => {
      host.removeEventListener('touchstart',  onStart)
      host.removeEventListener('touchmove',   onMove)
      host.removeEventListener('touchend',    onEnd)
      host.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  function onTransitionEnd(e) {
    // Transitions bubble; only the pane's own slide means the gesture is over.
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    finish()
  }

  const neighbour = reveal !== 0 ? order[idx + reveal] : null
  const glide = settling ? 'transform 460ms var(--ease-drawer)' : 'none'

  return (
    <div className={styles.host} ref={hostRef}>
      {render(active)}

      {neighbour && (
        <div
          className={styles.incoming}
          style={{
            transform: `translate3d(${dx + reveal * window.innerWidth}px,0,0)`,
            transition: glide,
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {render(neighbour)}
        </div>
      )}
    </div>
  )
}
