// iOS Safari (both standalone PWA and in-browser) is stingy about checking for
// service-worker updates while the app is on screen — it happily runs stale JS
// for hours, and the fix in the wild is "delete the app and re-add". We work
// around that from the client:
//
// 1. Poll `registration.update()` every minute while the tab is visible and
//    every time the user comes back to it (visibilitychange, pageshow, focus).
//    That's what actually issues a network request for a new sw.js.
// 2. When a new SW takes control, reload the page once so the running JS
//    matches the just-installed cache. The sw already calls skipWaiting +
//    clients.claim on activate, so controllerchange fires as soon as the new
//    worker is ready — no user tap needed.
//
// The one-shot flag guards against reload loops if the browser fires
// controllerchange twice around navigation.

export function setupPwaAutoUpdate() {
  if (!('serviceWorker' in navigator)) return

  // Only reload on an actual UPDATE — first-ever install also fires
  // controllerchange and would otherwise refresh the very first visit.
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })

  navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg) return

    const check = () => { reg.update().catch(() => {}) }

    // A slow-and-steady heartbeat while the tab is in the foreground. One
    // minute is short enough to catch a deploy within a session, long enough
    // to stay off the network radar.
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

    // pageshow fires when iOS restores a PWA from the back-forward cache —
    // that is precisely the moment the app has been dormant and might be on
    // yesterday's build.
    window.addEventListener('pageshow', check)
    window.addEventListener('focus', check)
  })
}
