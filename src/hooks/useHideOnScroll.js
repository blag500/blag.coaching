import { useEffect } from 'react'

// Nothing hides while you are still near the top — a bar that vanishes on the
// first flick feels twitchy rather than helpful.
const KEEP_UNTIL = 72
// Going down asks for a deliberate push; coming back needs only a nudge, which
// is what makes "I want the header" feel instant.
const DOWN_STEP = 12
const UP_STEP   = 5

/**
 * Hides the top bar while reading down and brings it back on the slightest
 * scroll up.
 *
 * Writes a data attribute on <html> instead of returning state: the header is
 * rendered inside every page, so React state here would re-render the whole
 * tree on every scroll frame to move one element. The CSS reads the attribute.
 */
export function useHideOnScroll(enabled = true) {
  useEffect(() => {
    const root = document.documentElement
    if (!enabled) { delete root.dataset.header; return }

    let last     = Math.max(window.scrollY, 0)
    let anchor   = last          // where the current direction began
    let goingDown = true
    let frame    = null

    function read() {
      frame = null
      const y = Math.max(window.scrollY, 0)

      if (y <= KEEP_UNTIL) {
        anchor = y
        last = y
        delete root.dataset.header
        return
      }

      const down = y > last
      // A direction change restarts the measurement, so a reversal is judged on
      // its own travel rather than on how far the previous one went.
      if (down !== goingDown) { goingDown = down; anchor = last }
      last = y

      const travel = Math.abs(y - anchor)
      if (down && travel > DOWN_STEP)       root.dataset.header = 'hidden'
      else if (!down && travel > UP_STEP)   delete root.dataset.header
    }

    function onScroll() {
      if (frame === null) frame = requestAnimationFrame(read)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame !== null) cancelAnimationFrame(frame)
      delete root.dataset.header
    }
  }, [enabled])
}
