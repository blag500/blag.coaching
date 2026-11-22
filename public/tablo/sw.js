/* Service worker на таблото (/tablo/) — само за известията от бележките.
   Нищо не кешира и не прихваща заявки: таблото винаги е прясно, както досега.
   Пише се на ръка; приложението има свой (src/sw.js, обхват /), този е по-тесен. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'Табло', {
    body: d.body || '',
    tag: d.tag || 'tablo',
    icon: '/tablo/icon-192.png',
    badge: '/tablo/icon-192.png',
    data: { url: d.url || '/tablo/#notes' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/tablo/#notes'
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if (new URL(c.url).pathname.startsWith('/tablo/')) {
        await c.focus()
        return c.navigate ? c.navigate(url) : c.postMessage({ open: url })
      }
    }
    return self.clients.openWindow(url)
  })())
})
