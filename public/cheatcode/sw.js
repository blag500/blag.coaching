/* Генериран от scripts/build-cheatcode.mjs — не се пипа на ръка. */
const CACHE = 'cheatcode-1b3e3ba08b16';
const PRECACHE = ["/cheatcode/","/cheatcode/manifest.webmanifest","/cheatcode/icon-192.png","/cheatcode/icon-512.png","/cheatcode/icon-maskable-512.png","/cheatcode/apple-icon.png","/cheatcode/favicon.svg","/cheatcode/vendor/three-r128.min.js","/cheatcode/glass-chain.js","/cheatcode/banan.jpg","/cheatcode/gris-banan.jpg","/cheatcode/gris-biskviti.jpg","/cheatcode/gris-choko.jpg","/cheatcode/gris-oba.jpg","/cheatcode/gris.jpg","/cheatcode/kakao.jpg","/cheatcode/kayma.jpg","/cheatcode/protein.jpg","/cheatcode/yagodi.jpg"];

/* Без skipWaiting при инсталиране: новият чака, докато лентата на
   страницата не го пусне — иначе страницата се сменя под пръста на човека. */
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cheatcode-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/cheatcode/', copy)); }
          return res;
        })
        .catch(() => caches.match('/cheatcode/'))
    );
    return;
  }

  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (fonts || (url.origin === self.location.origin && url.pathname.startsWith('/cheatcode/'))) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
