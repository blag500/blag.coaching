/**
 * Прави публичната страница на Чийт Код от източника ѝ.
 *
 *   node scripts/build-cheatcode.mjs            # cheatcode/page.html → public/cheatcode/
 *   node scripts/build-cheatcode.mjs <друг.html>
 *
 * Източникът е `cheatcode/page.html` — тялото на страницата без обвивка.
 * Дълго време той живееше като артефакт в Claude и се пренасяше на ръка;
 * оттогава остана разделението, но вече и двете са в repo-то.
 *
 * Разликите между източника и изхода са три и всичките са тук, а не в
 * нечия памет:
 *   1. Източникът няма <!doctype>, <head> и charset — тук се слагат.
 *   2. Снимките се сервират от /cheatcode/, не от съседния файл.
 *   3. Страницата е проба: noindex плюс ред, който го казва на човек.
 *   4. Тя е и приложение (PWA): манифест, иконки и собствен service worker
 *      със scope /cheatcode/ — по-тесен от този на blag.coaching, значи
 *      тук командва той. `sw.js` се пише оттук с версия от съдържанието:
 *      промени ли се страницата или снимка, старият кеш се изхвърля сам.
 *
 * Снимките живеят направо в `public/cheatcode/` и не се копират — само се
 * проверява, че всяка, която страницата иска, наистина е там.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const SRC = process.argv[2] || 'cheatcode/page.html';
const OUT_DIR = 'public/cheatcode';

let s = readFileSync(SRC, 'utf8');

/* Снимките идват от папката, в която живее страницата. Без наклонената черта
   отпред относителният път се мери спрямо /cheatcode без наклонена и снимките
   се търсят в корена. */
const wanted = new Set();
s = s.replace(/'([\w-]+\.jpe?g)'/g, (_, f) => { wanted.add(f); return `'/cheatcode/${f}'`; });
s = s.replace(/src="([\w-]+\.jpe?g)"/g, (_, f) => { wanted.add(f); return `src="/cheatcode/${f}"`; });

/* Ред, който казва на човека какво гледа. */
const notice =
  '  <p class="foot">Пробна страница. Още не приемаме поръчки — бутонът само ' +
  'показва какво би отишло в кутията.</p>\n';
s = s.replace('</div>\n\n<div class="order">', notice + '</div>\n\n<div class="order">');

const title = (s.match(/<title>([^<]*)<\/title>/) || [, 'Чийт Код'])[1];

const head =
  '<!doctype html>\n<html lang="bg">\n<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="robots" content="noindex, nofollow">\n' +
  '<meta name="description" content="Конфигурируемо ястие — избираш грамажа, макросите се смятат.">\n' +
  '<meta name="theme-color" content="#141C18">\n' +
  /* Знакът: две посоки, нагоре и надолу. SVG-то носи плътен фон нарочно —
     на 16 пиксела прозрачен знак се губи в лентата с раздели, каквато и
     да е темата ѝ. */
  '<link rel="icon" href="/cheatcode/favicon.svg" type="image/svg+xml">\n' +
  /* iOS не чете SVG за иконка на началния екран, а прозрачен ъгъл боядисва
     в черно — затова квадратен PNG с плътно поле. */
  '<link rel="apple-touch-icon" href="/cheatcode/icon-180.png">\n' +
  '<link rel="manifest" href="/cheatcode/manifest.webmanifest">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="mobile-web-app-capable" content="yes">\n' +
  '<meta name="apple-mobile-web-app-title" content="Cheat Code">\n' +
  /* Прозрачна лента: страницата е тъмна и тръгва изпод часовника — хедърът
     си взима отстъпа от safe-area-inset-top. */
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
  /* Самостоятелната страница няма нулиращ стил отникъде. [hidden] е
     задължителното: display:grid го бие иначе. */
  '<style>*,*::before,*::after{box-sizing:border-box}img{max-width:100%}' +
  '[hidden]{display:none!important}html{color-scheme:dark light}body{margin:0}</style>\n';

const bodyAt = s.indexOf('<div class="wrap">');
/* Регистрацията е тук, не в източника: източникът се гледа и сам, а там
   service worker няма какво да прави. */
const register =
  "<script>if('serviceWorker' in navigator)addEventListener('load',function(){" +
  "navigator.serviceWorker.register('/cheatcode/sw.js',{scope:'/cheatcode/'}).catch(function(){})});</script>\n";
const out = head + s.slice(0, bodyAt) + '</head>\n<body>\n' + s.slice(bodyAt) + '\n' + register + '</body>\n</html>\n';

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'index.html'), out);

/* Service worker-ът. Предварително пази страницата, иконките и снимките,
   които страницата иска — отворена веднъж, тя тръгва и без мрежа.
   Страницата се тегли първо от мрежата (иначе промяна стига до човека чак
   на второто отваряне), снимките и шрифтовете — първо от кеша. */
const precache = ['/cheatcode/', '/cheatcode/manifest.webmanifest', '/cheatcode/icon-192.png',
  '/cheatcode/icon-512.png', '/cheatcode/icon-maskable-512.png', '/cheatcode/icon-180.png', '/cheatcode/favicon.svg',
  ...[...wanted].sort().map((f) => `/cheatcode/${f}`)];
const digest = createHash('sha256');
digest.update(out);
for (const p of precache.slice(1)) {
  const file = join(OUT_DIR, p.replace('/cheatcode/', ''));
  if (existsSync(file)) digest.update(readFileSync(file));
}
const version = digest.digest('hex').slice(0, 12);
const sw = `/* Генериран от scripts/build-cheatcode.mjs — не се пипа на ръка. */
const CACHE = 'cheatcode-${version}';
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
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
`;
writeFileSync(join(OUT_DIR, 'sw.js'), sw);

console.log(`${OUT_DIR}/index.html — ${(out.length / 1024).toFixed(1)} KB, заглавие „${title}", ${wanted.size} снимки, sw ${version}`);

const missing = [...wanted].filter((f) => !existsSync(join(OUT_DIR, f)));
if (missing.length) {
  console.error(`ЛИПСВАТ в ${OUT_DIR}: ${missing.join(', ')}`);
  process.exitCode = 1;
}
