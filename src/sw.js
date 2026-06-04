import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

// Skip waiting only after precache install is complete (via autoUpdate message)
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({ cacheName: 'google-fonts-cache' })
)

registerRoute(
  ({ url }) => url.origin === 'https://world.openfoodfacts.org',
  new NetworkFirst({ cacheName: 'food-api-cache' })
)

// Push notifications (from Supabase Edge Function)
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  const notifTag  = data.tag  || 'default'
  const notifType = data.data?.type || notifTag

  event.waitUntil(
    self.registration.showNotification(data.title || 'Blag Coaching', {
      body:           data.body || 'Ново съобщение',
      icon:           '/icon-192.png',
      badge:          '/icon-192.png',
      tag:            notifTag,
      renotify:       true,   // vibrate again even when updating an existing tag
      data:           { type: notifType },
    })
  )
})

// Tap notification → open/focus the app then tell it what to open
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const notifType = event.notification.data?.type

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        const target = list.find(c => c.url.includes(self.location.origin)) || list[0]
        if (target) {
          target.focus()
          if (notifType === 'message') {
            target.postMessage({ type: 'OPEN_CHAT' })
          }
          return
        }
        return clients.openWindow('/')
      })
  )
})
