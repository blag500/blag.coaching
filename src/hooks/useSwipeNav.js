import { useEffect, useRef } from 'react'

const MIN_DISTANCE = 56    // shorter than this is a tap that wandered
const DOMINANCE    = 1.5   // horizontal must clearly beat vertical
const MAX_DURATION = 600   // a slow drag is not a swipe

/**
 * Swipe left to go to the tab on the right, and back the other way.
 *
 * The whole difficulty is telling a page swipe apart from every other drag on
 * the screen — a chart being panned, a row of chips being scrolled, a slider
 * being set, or simply a scroll that drifted sideways. So the gesture has to be
 * fast, mostly horizontal, and must not have begun inside anything that scrolls
 * horizontally itself.
 */
export function useSwipeNav({ onNext, onPrev, enabled = true }) {
  // The callbacks are fresh closures on every render, so depending on them
  // directly would tear the listeners down and rebuild them constantly — and if
  // that happened between touchstart and touchend, the swipe in progress would
  // be dropped. The listeners are bound once and read the latest handlers here.
  const latest = useRef({ onNext, onPrev, enabled })
  latest.current = { onNext, onPrev, enabled }

  useEffect(() => {
    let startX = 0, startY = 0, startedAt = 0, tracking = false

    function onStart(e) {
      if (!latest.current.enabled) { tracking = false; return }
      // Two fingers is a pinch or a system gesture, never a tab change.
      if (e.touches.length !== 1) { tracking = false; return }
      const t = e.touches[0]
      if (isProtected(t.target)) { tracking = false; return }
      startX = t.clientX
      startY = t.clientY
      startedAt = Date.now()
      tracking = true
    }

    function onEnd(e) {
      if (!tracking) return
      tracking = false
      if (Date.now() - startedAt > MAX_DURATION) return

      const t  = e.changedTouches[0]
      const dx = t.clientX - startX
      const dy = t.clientY - startY

      if (Math.abs(dx) < MIN_DISTANCE) return
      if (Math.abs(dx) < Math.abs(dy) * DOMINANCE) return

      if (!latest.current.enabled) return
      if (dx < 0) latest.current.onNext()
      else        latest.current.onPrev()
    }

    function onCancel() { tracking = false }

    window.addEventListener('touchstart',  onStart,  { passive: true })
    window.addEventListener('touchend',    onEnd,    { passive: true })
    window.addEventListener('touchcancel', onCancel, { passive: true })
    return () => {
      window.removeEventListener('touchstart',  onStart)
      window.removeEventListener('touchend',    onEnd)
      window.removeEventListener('touchcancel', onCancel)
    }
  }, [])
}

/** Anything that owns horizontal drags for itself, or sits on top of the tabs. */
function isProtected(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.dataset?.noSwipe !== undefined) return true
    if (n.getAttribute?.('role') === 'dialog') return true

    const tag = n.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        tag === 'CANVAS' || tag === 'VIDEO') return true

    const cs = getComputedStyle(n)

    // Every sheet, drawer, modal and popover in the app is fixed, and none of
    // them should move the tab sitting behind them. The bottom nav is fixed
    // too, which is just as well — swiping across the nav bar is not a page
    // gesture either. The header is sticky, so it stays swipeable.
    if (cs.position === 'fixed') return true

    if (n.scrollWidth > n.clientWidth + 4 &&
        (cs.overflowX === 'auto' || cs.overflowX === 'scroll')) return true
  }
  return false
}
