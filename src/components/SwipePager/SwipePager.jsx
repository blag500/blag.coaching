import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { isProtected } from '../../utils/gestures'
import { PaneProvider } from './PaneContext'
import styles from './SwipePager.module.css'

/** A window-sized layer that travels with a pane; see PaneContext. */
function makeChromeLayer(z) {
  const el = document.createElement('div')
  el.style.cssText =
    `position:fixed;inset:0;pointer-events:none;z-index:${z};`
  return el
}

// Before either axis is committed to, this much travel decides which one wins.
const AXIS_LOCK   = 8
// A drag past this share of the screen goes through on distance alone.
const COMMIT_PART = 0.28
// A short but fast flick goes through too — the intent is obvious well before
// the finger has crossed a quarter of the screen.
const FLICK_SPEED = 0.45   // px per ms
const FLICK_MIN   = 40     // but never on a twitch
const GLIDE       = 420    // ms to finish or undo the journey

/**
 * Tabs that follow the finger — both pages moving together, the way a strip of
 * paper slides past a window rather than one sheet being laid over another.
 *
 * While the finger is down the panes are moved by writing to their style
 * directly instead of through React state. A drag produces a touchmove on every
 * frame, and re-rendering the whole page tree sixty times a second to change one
 * number is what makes a gesture feel heavy. React is told only about things
 * that actually change the markup: which neighbour is mounted, and whether the
 * slide is settling.
 *
 * At the first tab there is no page to the left, so dragging that way pulls the
 * side navigation out instead.
 */
export default function SwipePager({
  order, active, onChange, render, enabled = true,
  onEdgePull, onEdgeEnd,
}) {
  const hostRef = useRef(null)
  const curRef  = useRef(null)
  const incRef  = useRef(null)

  // Below the incoming pane (95) for the page being left, above it for the page
  // arriving, and both under the tab bar (100), which never moves.
  const [curChrome] = useState(() => makeChromeLayer(90))
  const [incChrome] = useState(() => makeChromeLayer(96))

  useEffect(() => {
    document.body.append(curChrome, incChrome)
    return () => { curChrome.remove(); incChrome.remove() }
  }, [curChrome, incChrome])
  // Which neighbour is mounted: -1 for the tab on the left, +1 for the right.
  const [reveal, setReveal] = useState(0)

  const idx = order.indexOf(active)

  // Mirrors for the listeners, which are bound once: a re-render in the middle
  // of a drag must not tear them down, and they must not read stale values.
  const offset    = useRef(0)     // where the panes are right now, in px
  const commitRef = useRef(null)
  const settling  = useRef(false)
  const live      = useRef({})
  live.current = { order, active, idx, onChange, enabled, onEdgePull, onEdgeEnd }

  /** Put both panes where the finger says, without going through React. */
  function place(dx, dir, animate) {
    offset.current = dx
    const w = window.innerWidth
    const ease = animate ? `transform ${GLIDE}ms var(--ease-drawer)` : 'none'

    const resting = dx === 0 && !animate

    if (curRef.current) {
      curRef.current.style.transition = ease
      // At rest both the transform and the promotion are removed. Either one
      // would leave the page as the containing block for its fixed children.
      curRef.current.style.willChange = resting ? '' : 'transform'
      curRef.current.style.transform  = resting ? '' : `translate3d(${dx}px,0,0)`
    }
    // The chrome layer rides along, so a bar pinned to the bottom of the window
    // leaves with the page it belongs to instead of hanging behind.
    curChrome.style.transition = ease
    curChrome.style.transform  = resting ? '' : `translate3d(${dx}px,0,0)`

    if (dir !== 0) {
      const off = `translate3d(${dx + dir * w}px,0,0)`
      if (incRef.current) {
        incRef.current.style.transition = ease
        incRef.current.style.transform  = off
      }
      incChrome.style.transition = ease
      incChrome.style.transform  = off
    }
  }

  // The incoming pane is mounted by React, so it starts with no transform of
  // its own. Placing it in a layout effect puts it off-screen before the frame
  // is painted, instead of letting it flash across the middle of the display.
  useLayoutEffect(() => {
    if (reveal !== 0) place(offset.current, reveal, false)
  }, [reveal])

  /** The slide has landed; adopt the new tab in the same paint. */
  function finish() {
    if (!settling.current) return
    const target = commitRef.current
    commitRef.current = null
    settling.current = false
    offset.current = 0
    if (curRef.current) {
      curRef.current.style.transition = 'none'
      curRef.current.style.transform  = ''
      curRef.current.style.willChange = ''
    }
    for (const el of [curChrome, incChrome]) {
      el.style.transition = 'none'
      el.style.transform  = ''
      el.style.willChange = ''
    }
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
      if (settling.current && commitRef.current) { axis = 'y'; return }
      reset()
      const l = live.current
      if (!l.enabled || e.touches.length !== 1) { axis = 'y'; return }
      const t = e.touches[0]
      if (isProtected(t.target)) { axis = 'y'; return }
      width = window.innerWidth
      startX = lastX = t.clientX
      startY = t.clientY
      startedAt = lastT = performance.now()
      settling.current = false
      // The chrome layers are promoted now, while the finger is still, so a
      // layer is not being created on the first frame of movement. The page
      // itself waits until the gesture is known to be horizontal: promoting it
      // would make it the containing block for its fixed children, and doing
      // that on every tap would jolt them for as long as a finger is down.
      curChrome.style.willChange = 'transform'
      incChrome.style.willChange = 'transform'
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
        place(mx, dir, false)
        return
      }

      // Nothing to the left of the first tab — that pull opens the drawer.
      if (wants < 0 && l.onEdgePull) {
        if (!edge) { edge = true; if (dir !== 0) { dir = 0; setReveal(0) }; place(0, 0, false) }
        l.onEdgePull(mx)
        return
      }

      if (dir !== 0) { dir = 0; setReveal(0) }
      place(0, 0, false)
    }

    function onEnd() {
      if (axis !== 'x') {
        curChrome.style.willChange = ''
        incChrome.style.willChange = ''
        reset()
        return
      }
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

      const go       = exists && (farEnough || fastEnough)
      const nextDx   = go ? -dir * width : 0
      commitRef.current = go ? l.order[target] : null
      const settledDir  = dir
      reset()

      settling.current = true
      // A drag that ended exactly where it started animates nothing, so no
      // transitionend would ever arrive to finish the job.
      if (nextDx === offset.current) { finish(); return }
      place(nextDx, settledDir, true)
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
  // Stable objects, so a page's chrome is not torn down and rebuilt on every
  // render of the pager.
  const curPane = useMemo(() => ({ chrome: curChrome, live: true  }), [curChrome])
  const incPane = useMemo(() => ({ chrome: incChrome, live: false }), [incChrome])

  return (
    <div className={styles.host} ref={hostRef}>
      {/* No transform is set here at rest. Any transform, even an identity one,
          makes an element the containing block for its fixed descendants, and
          the app pins things to the screen from inside pages. */}
      <div className={styles.current} ref={curRef} onTransitionEnd={onTransitionEnd}>
        <PaneProvider value={curPane}>{render(active)}</PaneProvider>
      </div>

      {neighbour && (
        <div className={styles.incoming} ref={incRef} aria-hidden="true">
          <PaneProvider value={incPane}>{render(neighbour)}</PaneProvider>
        </div>
      )}
    </div>
  )
}
