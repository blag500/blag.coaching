/**
 * Whether a touch that started on this element belongs to something other than
 * a page swipe — anything that owns horizontal drags for itself, or anything
 * sitting on top of the tabs.
 */
export function isProtected(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.dataset?.noSwipe !== undefined) return true
    if (n.getAttribute?.('role') === 'dialog') return true

    const tag = n.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        tag === 'CANVAS' || tag === 'VIDEO') return true

    const cs = getComputedStyle(n)

    // Every sheet, drawer, modal and popover in the app is fixed, and none of
    // them should move the tab sitting behind them. The bottom nav is fixed
    // too, which is just as well — dragging across the nav bar is not a page
    // gesture either. The header is sticky, so it stays swipeable.
    if (cs.position === 'fixed') return true

    if (n.scrollWidth > n.clientWidth + 4 &&
        (cs.overflowX === 'auto' || cs.overflowX === 'scroll')) return true
  }
  return false
}
