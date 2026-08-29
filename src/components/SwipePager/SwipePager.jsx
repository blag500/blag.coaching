import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { isProtected } from '../../utils/gestures'
import { PaneProvider } from './PaneContext'
import styles from './SwipePager.module.css'

/** A window-sized layer that travels with a pane; see PaneContext. */
function makeChromeLayer() {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;inset:0;pointer-events:none;'
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

// Below the pane that is arriving (95) for the page being left, above it for
// the page arriving, and both under the tab bar (100), which never moves.
const Z_LEAVING  = 90
const Z_ARRIVING = 96

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
 * There are two slots and they never trade contents. A page arrives into the
 * back slot, travels there, and when the journey ends that slot simply becomes
 * the front one — the class on it changes, the subtree inside does not. Moving
 * the arriving page into a different element instead would throw away
 * everything it had just built and mount it a second time: the screen would
 * blink, show the old day's numbers, and only then settle on the right ones.
 *
 * At the first tab there is no page to the left, so dragging that way pulls the
 * side navigation out instead.
 */
function SwipePager({
  order, active, onChange, render, enabled = true,
  onEdgePull, onEdgeEnd,
}, ref) {
  const hostRef   = useRef(null)
  const slotRefs  = useRef([null, null])

  const [chromes] = useState(() => [makeChromeLayer(), makeChromeLayer()])

  useEffect(() => {
    document.body.append(chromes[0], chromes[1])
    return () => { chromes[0].remove(); chromes[1].remove() }
  }, [chromes])

  // Which slot is the page the user is on. The other one is where an arriving
  // page is built; on commit the two swap roles rather than swapping contents.
  const [front, setFront] = useState(0)
  const back = 1 - front

  // Which page is mounted next to this one, as a signed distance in tabs. A
  // swipe only ever reveals ±1; a tap on the bar can be three tabs away, and
  // the page it names still arrives from its own side — the ones in between
  // are not passed through, the same way a book opens at a page rather than
  // riffling to it.
  const [reveal, setReveal] = useState(0)

  const idx = order.indexOf(active)

  // Mirrors for the listeners, which are bound once: a re-render in the middle
  // of a drag must not tear them down, and they must not read stale values.
  const offset    = useRef(0)     // where the panes are right now, in px
  const commitRef = useRef(null)
  const settling  = useRef(false)
  const live      = useRef({})
  live.current = { order, active, idx, onChange, enabled, onEdgePull, onEdgeEnd, front, back }

  /** Put both panes where the finger says, without going through React. */
  function place(dx, dir, animate) {
    offset.current = dx
    const w = window.innerWidth
    const ease = animate ? `transform ${GLIDE}ms var(--ease-drawer)` : 'none'
    const { front: f, back: b } = live.current

    const resting = dx === 0 && !animate
    const leaving = slotRefs.current[f]

    if (leaving) {
      leaving.style.transition = ease
      // At rest both the transform and the promotion are removed. Either one
      // would leave the page as the containing block for its fixed children.
      leaving.style.willChange = resting ? '' : 'transform'
      leaving.style.transform  = resting ? '' : `translate3d(${dx}px,0,0)`
    }
    // The chrome layer rides along, so a bar pinned to the bottom of the window
    // leaves with the page it belongs to instead of hanging behind.
    chromes[f].style.transition = ease
    chromes[f].style.transform  = resting ? '' : `translate3d(${dx}px,0,0)`

    if (dir !== 0) {
      const off = `translate3d(${dx + dir * w}px,0,0)`
      const arriving = slotRefs.current[b]
      if (arriving) {
        arriving.style.transition = ease
        arriving.style.transform  = off
      }
      chromes[b].style.transition = ease
      chromes[b].style.transform  = off
    }
  }

  // The chrome layers stack by role, not by slot, and the roles change hands.
  useLayoutEffect(() => {
    chromes[front].style.zIndex = Z_LEAVING
    chromes[back].style.zIndex  = Z_ARRIVING
  }, [chromes, front, back])

  /* A page built for a journey arrives already assembled.
     The arriving page is built at the start of the journey so it is ready when
     it lands — but that means the cards inside it would be rising while the
     page itself is sliding, two motions on one thing and neither of them
     readable. Sliding in is that page's entrance; it does not need a second
     one. The mark stays on the slot for good: an entrance is spent once, and
     only the page the app opens on never came from anywhere. */
  useLayoutEffect(() => {
    if (reveal !== 0 && slotRefs.current[back]) {
      slotRefs.current[back].dataset.arrive = 'off'
    }
  }, [back, reveal])

  // The arriving pane is mounted by React, so it starts with no transform of
  // its own. Placing it in a layout effect puts it off-screen before the frame
  // is painted, instead of letting it flash across the middle of the display.
  useLayoutEffect(() => {
    if (reveal !== 0) place(offset.current, Math.sign(reveal), false)
  }, [reveal])

  /** The slide has landed; the back slot becomes the front one. */
  function finish() {
    if (!settling.current) return
    const target = commitRef.current
    commitRef.current = null
    settling.current = false
    offset.current = 0
    for (const el of [slotRefs.current[0], slotRefs.current[1], chromes[0], chromes[1]]) {
      if (!el) continue
      el.style.transition = 'none'
      el.style.transform  = ''
      el.style.willChange = ''
    }
    setReveal(0)
    // One batch: the tab, the slot that holds it, and the fact that nothing is
    // revealed any more all land in the same render. Anything else and there is
    // a frame where the front slot is asked for a page it is not holding.
    if (target) {
      setFront(live.current.back)
      // Instant, because the page has already travelled — animating it in again
      // would be the same move played twice.
      onChange(target, { instant: true })
    }
  }

  /**
   * Натиснат таб.
   *
   * Дотук натискането само сменяше страницата и оставяше новата да изплува
   * на място, докато React я сглобява и вдига заявките ѝ — движение и работа
   * в един и същи кадър, затова се късаше. Тук ходът е същият, който прави
   * суайпът: двете страници тръгват заедно, старата излиза, новата влиза, и
   * чак когато пътуването свърши, табът се сменя. Разликата е само откъде
   * идва бутането — от пръст или от бутон.
   *
   * Връща дали е поело хода; ако не, викащият си остава с изплуването.
   */
  function glideTo(tab) {
    const l = live.current
    const target = l.order.indexOf(tab)
    if (!l.enabled || target === -1 || l.idx === -1 || target === l.idx) return false
    /* Тече пътуване: вторият натиск се преглъща, вместо да го разцепи по
       средата. Четиристотин милисекунди мълчание са по-малкото зло от две
       страници, които се разминават. */
    if (settling.current) return true
    if (!hostRef.current) return false
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false

    const delta = target - l.idx
    const dir   = Math.sign(delta)
    setReveal(delta)
    /* Един кадър, за да успее React да монтира новата страница и слоят отдолу
       да я сложи извън екрана. Да я пуснем да пътува в същия кадър, в който
       се появява, значи да тръгне от където и да е. */
    requestAnimationFrame(() => {
      if (!slotRefs.current[live.current.back]) return
      settling.current  = true
      commitRef.current = tab
      place(-dir * window.innerWidth, dir, true)
    })
    return true
  }

  useImperativeHandle(ref, () => ({ glideTo }), [])

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
      chromes[0].style.willChange = 'transform'
      chromes[1].style.willChange = 'transform'
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
        chromes[0].style.willChange = ''
        chromes[1].style.willChange = ''
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
    // Transitions bubble; only a pane's own slide means the gesture is over.
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    finish()
  }

  const neighbour = reveal !== 0 ? order[idx + reveal] : null
  // Stable objects, so a page's chrome is not torn down and rebuilt on every
  // render of the pager. The layer each slot owns never changes — only which
  // of the two is the live one does — so nothing portalled into it moves.
  const panes = useMemo(
    () => [
      { chrome: chromes[0], live: front === 0 },
      { chrome: chromes[1], live: front === 1 },
    ],
    [chromes, front],
  )

  return (
    <div className={styles.host} ref={hostRef}>
      {[0, 1].map(slot => {
        const isFront = slot === front
        const tab = isFront ? active : neighbour
        return (
          <div
            key={slot}
            ref={el => { slotRefs.current[slot] = el }}
            /* No transform is set on the front pane at rest. Any transform,
               even an identity one, makes an element the containing block for
               its fixed descendants, and the app pins things to the screen
               from inside pages. An empty back slot is taken out of the way
               entirely — left as .incoming it would be a full-screen sheet of
               background colour over the page. */
            className={isFront ? styles.current : (tab ? styles.incoming : styles.idle)}
            aria-hidden={isFront ? undefined : true}
            onTransitionEnd={onTransitionEnd}
          >
            {tab ? <PaneProvider value={panes[slot]}>{render(tab)}</PaneProvider> : null}
          </div>
        )
      })}
    </div>
  )
}

export default forwardRef(SwipePager)
