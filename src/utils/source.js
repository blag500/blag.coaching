/**
 * Remember where a visitor came from, until there is an account to attach it to.
 *
 * A TikTok video cannot carry a link — the viewer reads the address, holds it in
 * their head and types it — so "?src=tiktok" on the end of the address is the
 * only thread back to the video. It has to survive the whole visit: someone
 * arrives, looks around, registers ten minutes later, and by then the parameter
 * is long gone from the URL.
 *
 * Kept for a month. Longer and a visitor who came back in March would still be
 * credited to a video from January, which is a lie that flatters.
 */
const KEY = 'blag.src'
const MAX_AGE = 30 * 24 * 60 * 60 * 1000

/** Read it off the address once, on arrival, and stop it cluttering the bar. */
export function captureSource() {
  try {
    const p = new URLSearchParams(window.location.search)
    const src = p.get('src') || p.get('utm_source')
    if (!src) return
    localStorage.setItem(KEY, JSON.stringify({ src: src.slice(0, 40), at: Date.now() }))
    // Taken out of the address so a shared link does not credit the sharer's
    // campaign to everyone they send it to.
    p.delete('src'); p.delete('utm_source')
    const rest = p.toString()
    window.history.replaceState({}, '',
      window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash)
  } catch { /* private mode, or no storage: not worth failing a page load over */ }
}

export function readSource() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { src, at } = JSON.parse(raw)
    if (!src || Date.now() - at > MAX_AGE) return null
    return src
  } catch { return null }
}
