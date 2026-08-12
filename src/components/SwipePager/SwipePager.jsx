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
// There is nothing beyond the first and last tab, so the edge pulls back.
const RUBBER      = 0.28

/**
 * Tabs that follow the finger.
 *
 * The incoming page is mounted and moved with the drag, and the change is only
 * committed when the finger lifts — so a gesture can be abandoned halfway and
 * the page falls back where it came from. That is the whole point: a swipe you
 * cannot take back is a button with extra steps.
 */
export default function SwipePager({ order, active, onChange, render, enabled = true }) {
  const hostRef = useRef(null)
  const [dx, setDxState]      = useState(0)
  const [settling, setSettle] = useState(false)
  // Which neighbour is being revealed: -1 for the tab on the left, +1 right.
  const [reveal, setReveal]   = useState(0)

  const idx = order.indexOf(active)

  // Mirrors of the state for the listeners, which are bound once and must not
  // read stale values — and a re-render mid-drag must not tear them down.
  const dxRef      = useRef(0)
  const commitRef  = useRef(null)
  const settleRef  = useRef(false)
  const live       = useRef({})
  live.current = { order, active, idx, onChange, enabled }

  function setDx(v) { dxRef.current = v; setDxState(v) }

  /** The slide has finished; adopt the new tab in the same paint. */
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
    let dir  = 0
    let width = window.innerWidth
    let lastX = 0, lastT = 0, speed = 0

    function reset() { axis = null; dir = 0; speed = 0 }

    function onStart(e) {
      // A settle that is on its way to a new tab owns the screen until it lands.
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

      // The page is following the finger now, so the browser must stop trying
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
        if (wants !== dir) { dir = wants; setReveal(wants) }
        setDx(mx)
      } else {
        // Nothing to reveal — let it stretch a little and pull back.
        if (dir !== 0) { dir = 0; setReveal(0) }
        setDx(mx * RUBBER)
      }
    }

    function onEnd() {
      if (axis !== 'x') { reset(); return }
      const l = live.current
      const travelled = lastX - startX
      const elapsed   = performance.now() - startedAt

      const target = dir > 0 ? l.idx + 1 : l.idx - 1
      const exists  = dir !== 0 && target >= 0 && target < l.order.length
      const farEnough  = Math.abs(travelled) > width * COMMIT_PART
      const fastEnough = Math.abs(speed) > FLICK_SPEED &&
                         Math.abs(travelled) > FLICK_MIN &&
                         Math.sign(speed) === Math.sign(travelled) &&
                         elapsed < 700

      const go     = exists && (farEnough || fastEnough)
      const nextDx = go ? -dir * width : 0
      commitRef.current = go ? l.order[target] : null
      reset()

      // A drag that ended exactly where it started animates nothing, so no
      // transitionend would ever arrive to finish the job.
      if (nextDx === dxRef.current) {
        settleRef.current = true
        finish()
        return
      }
      settleRef.current = true
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
  const moving    = dx !== 0 || settling
  const glide     = settling ? 'transform 460ms var(--ease-drawer)' : 'none'

  // At rest the transform is removed entirely rather than left at zero. Any
  // transform — even an identity one — makes the element the containing block
  // for position: fixed descendants, which would drop every modal and sheet
  // inside a page to the bottom of the document instead of the screen.
  const restingStyle = {
    transform:  moving ? `translate3d(${dx}px,0,0)` : 'none',
    transition: glide,
    willChange: moving ? 'transform' : 'auto',
  }

  return (
    <div className={styles.host} ref={hostRef}>
      <div
        className={styles.current}
        style={restingStyle}
        onTransitionEnd={onTransitionEnd}
      >
        {render(active)}
      </div>

      {neighbour && (
        <div
          className={styles.incoming}
          style={{
            transform: `translate3d(${dx + reveal * window.innerWidth}px,0,0)`,
            transition: glide,
          }}
          aria-hidden="true"
        >
          {render(neighbour)}
        </div>
      )}
    </div>
  )
}
