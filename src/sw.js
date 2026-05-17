import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

self.addEventListener('install', () => self.skipWaiting())
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
  event.waitUntil(
    self.registration.showNotification(data.title || 'Blag Coaching', {
      body: data.body || 'Ново съобщение',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  )
})

// Tap notification → open/focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        if (list.length) return list[0].focus()
        return clients.openWindow('/')
      })
  )
})
