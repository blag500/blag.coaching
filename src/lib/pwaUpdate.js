import { registerSW } from 'virtual:pwa-register'

// Manual PWA update flow. `registerType: 'prompt'` in vite.config keeps
// vite-plugin-pwa from reloading on its own — the ceremony is:
//
// 1. `registerSW({ immediate: true })` installs the SW on first visit.
// 2. A minute-heartbeat and every visibility/focus/pageshow calls
//    `registration.update()` — that's what actually fetches sw.js. iOS Safari
//    does not do this on its own while a PWA sits on screen; without the poll
//    users end up in the "delete and re-add" loop we're avoiding.
// 3. When a new SW finishes installing and enters "waiting", vite fires
//    `onNeedRefresh`. We dispatch a window event that the UpdateBanner listens
//    to; the tap on that banner calls `updateSW(true)`, which posts
//    SKIP_WAITING and reloads once the new SW takes control.

let updateSWHandle = null

export function setupPwaAutoUpdate() {
  if (!('serviceWorker' in navigator)) return

  updateSWHandle = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('pwa:need-refresh'))
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      const check = () => { registration.update().catch(() => {}) }

      let timer = null
      const startPolling = () => {
        if (timer) return
        timer = setInterval(check, 60_000)
      }
      const stopPolling = () => {
        if (!timer) return
        clearInterval(timer)
        timer = null
      }

      if (document.visibilityState === 'visible') startPolling()

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          check()
          startPolling()
        } else {
          stopPolling()
        }
      })

      window.addEventListener('pageshow', check)
      window.addEventListener('focus', check)
    },
  })
}

/** Called by the UpdateBanner's tap — activates the waiting SW and reloads. */
export function reloadWithNewSW() {
  if (updateSWHandle) return updateSWHandle(true)
  window.location.reload()
}
