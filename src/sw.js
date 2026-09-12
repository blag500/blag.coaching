import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

// Don't skipWaiting on install — the client shows a banner and calls
// SKIP_WAITING from the tap, so the user sees the update coming rather than
// being reloaded mid-thought.
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

/* Снимка, споделена отвън.
 *
 * Телефонът праща multipart POST на /share — адрес, който не съществува като
 * страница и не бива да стига до мрежата. Тук се разглобява, снимката се
 * оставя в собствен cache и браузърът се праща на /?share=1.
 *
 * Защо през cache, а не през postMessage: в мига на този POST приложението
 * най-често още не е отворено — няма на кого да се прати съобщение. Cache-ът
 * е единственото място, което преживява стартирането.
 *
 * 303, а не 302: така презареждането на страницата след това е GET, иначе
 * телефонът би повторил POST-а и снимката щеше да се впише два пъти.
 */
const SHARE_CACHE = 'blag-shared'
const SHARE_KEY   = '/__shared-photo'

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || url.pathname !== '/share') return

  event.respondWith((async () => {
    try {
      const form  = await event.request.formData()
      const photo = form.get('photo')
      if (photo && photo.size > 0) {
        const cache = await caches.open(SHARE_CACHE)
        await cache.put(SHARE_KEY, new Response(photo, {
          headers: {
            'content-type': photo.type || 'image/jpeg',
            'x-blag-name':  encodeURIComponent(photo.name || 'shared.jpg'),
          },
        }))
      }
    } catch {
      /* Счупен POST не бива да оставя човека на бял екран — пращаме го в
         приложението без снимка, а не в грешка. */
    }
    return Response.redirect('/?share=1', 303)
  })())
})

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
    self.registration.showNotification(data.title || 'Blag', {
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
