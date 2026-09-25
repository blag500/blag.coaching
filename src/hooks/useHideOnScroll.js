import { useEffect } from 'react'

// Nothing collapses while you are still near the top — a bar that vanishes on
// the first flick feels twitchy rather than helpful.
const KEEP_UNTIL = 72
// Going down asks for a deliberate push; coming back needs only a nudge, which
// is what makes "I want the nav" feel instant.
const DOWN_STEP = 12
const UP_STEP   = 5

/**
 * The bottom nav, the way Reddit does it: `data-nav="collapsed"` on <html>
 * folds it into a small round button while reading down, and it opens again on
 * the slightest scroll up or a tap on that button (see BottomNav). The header
 * no longer moves at all — its pills float over the page.
 *
 * Writes a data attribute instead of returning state: React state here would
 * re-render the whole tree on every scroll frame to move one element. The CSS
 * reads the attribute.
 */
export function useHideOnScroll(enabled = true) {
  useEffect(() => {
    const root = document.documentElement
    if (!enabled) { delete root.dataset.nav; return }

    let last      = Math.max(window.scrollY, 0)
    let anchor    = last          // where the current direction began
    let goingDown = true
    let frame     = null

    function read() {
      frame = null
      const y = Math.max(window.scrollY, 0)

      if (y <= KEEP_UNTIL) {
        anchor = y
        last = y
        delete root.dataset.nav
        return
      }

      const down = y > last
      // A direction change restarts the measurement, so a reversal is judged on
      // its own travel rather than on how far the previous one went.
      if (down !== goingDown) { goingDown = down; anchor = last }
      last = y

      const travel = Math.abs(y - anchor)
      if (down && travel > DOWN_STEP)       root.dataset.nav = 'collapsed'
      else if (!down && travel > UP_STEP)   delete root.dataset.nav
    }

    function onScroll() {
      if (frame === null) frame = requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame !== null) cancelAnimationFrame(frame)
      delete root.dataset.nav
    }
  }, [enabled])
}
