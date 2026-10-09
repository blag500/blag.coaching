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
 *   3. Страницата не се индексира (noindex). Редът „Пробна страница“ отпадна
 *      на 09.10: заместването отдавна не намираше мястото си, а поръчките
 *      вече са истински (LIVE в page.html).
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

const title = (s.match(/<title>([^<]*)<\/title>/) || [, 'Чийт Код'])[1];

const head =
  '<!doctype html>\n<html lang="bg">\n<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="robots" content="noindex, nofollow">\n' +
  '<meta name="description" content="Конфигурируемо ястие — избираш грамажа, макросите се смятат.">\n' +
  /* Картинката при споделяне на линка: стъклената верига на тъмната земя
     (scripts/build-mail-art.mjs → og.png). Пълен адрес — Viber, Messenger и
     WhatsApp не тръгват по относителен. */
  '<meta property="og:type" content="website">\n' +
  '<meta property="og:title" content="CHEAT CODE — храната, която си знае числата">\n' +
  '<meta property="og:description" content="Настройваш порцията до грам, макросите и цената се движат заедно с нея.">\n' +
  '<meta property="og:url" content="https://blag-coaching.com/cheatcode/">\n' +
  '<meta property="og:image" content="https://blag-coaching.com/cheatcode/og.png">\n' +
  '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n' +
  '<meta name="twitter:card" content="summary_large_image">\n' +
  '<meta name="theme-color" content="#1E2923">\n' +
  /* Знакът: две посоки, нагоре и надолу. SVG-то носи плътен фон нарочно —
     на 16 пиксела прозрачен знак се губи в лентата с раздели, каквато и
     да е темата ѝ. */
  '<link rel="icon" href="/cheatcode/favicon.svg" type="image/svg+xml">\n' +
  /* iOS не чете SVG за иконка на началния екран, а прозрачен ъгъл боядисва
     в черно — затова квадратен PNG с плътно поле. 1024, не класическите 180:
     на новите iPhone иконата е по-голяма от 180 пиксела и iOS я разпъваше
     размазана. Смалява се чисто, разпъване — не. */
  '<link rel="apple-touch-icon" href="/cheatcode/apple-icon.png">\n' +
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
   service worker няма какво да прави.

   Обновяването е като в blag.coaching (src/lib/pwaUpdate.js): iOS не пита
   за нов sw.js, докато приложението стои отворено на началния екран, и
   човек остава на старата версия, докато не го убие от превключвателя.
   Затова update() при всяко връщане към страницата и на минута, докато се
   гледа. Новият worker чака; лентата горе го казва и докосването го пуска
   (SKIP_WAITING) и презарежда, щом поеме — никой не се презарежда насред
   избора на грамаж. */
const updateBar =
  '<div class="upd" id="upd" role="status" hidden>' +
  '<span>Има нова версия</span>' +
  '<button type="button" id="updGo" aria-label="Обнови" title="Обнови">' +
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.2"/><path d="M19.8 3.9v4.4h-4.4"/></svg>' +
  '</button></div>\n';
/* Над всичко, сплаша (90) включително: ако има нова версия, това е първото,
   което човек трябва да види. */
const updateStyle =
  '<style>.upd{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;' +
  'justify-content:space-between;gap:12px;padding:10px 16px;padding-top:calc(10px + env(safe-area-inset-top));' +
  'background:var(--accent);color:var(--ground-flat);font-size:13px;line-height:1.3;' +
  'animation:updIn 300ms var(--ease) both}' +
  '.upd button{flex-shrink:0;width:36px;height:36px;border:0;border-radius:50%;display:grid;place-items:center;' +
  'background:var(--ground-flat);color:var(--accent);cursor:pointer;-webkit-tap-highlight-color:transparent}' +
  '.upd button:focus-visible{outline:2px solid var(--ground-flat);outline-offset:3px}' +
  '@keyframes updIn{from{transform:translateY(-100%)}to{transform:none}}</style>\n';
const register = `<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  var bar = document.getElementById('upd');
  var reloading = false;
  function show() { bar.hidden = false; }
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading) { location.reload(); }
  });
  document.getElementById('updGo').addEventListener('click', function () {
    navigator.serviceWorker.getRegistration('/cheatcode/').then(function (reg) {
      if (reg && reg.waiting) { reloading = true; reg.waiting.postMessage({ type: 'SKIP_WAITING' }); }
      else location.reload();
    });
  });
  addEventListener('load', function () {
    navigator.serviceWorker.register('/cheatcode/sw.js', { scope: '/cheatcode/' }).then(function (reg) {
      /* Само ако вече има стар worker: първото инсталиране не е „нова версия". */
      if (reg.waiting && navigator.serviceWorker.controller) show();
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () {
          if (w.state === 'installed' && navigator.serviceWorker.controller) show();
        });
      });
      function check() { reg.update().catch(function () {}); }
      var timer = null;
      function poll(on) {
        if (on && !timer) timer = setInterval(check, 60000);
        if (!on && timer) { clearInterval(timer); timer = null; }
      }
      poll(document.visibilityState === 'visible');
      document.addEventListener('visibilitychange', function () {
        var on = document.visibilityState === 'visible';
        if (on) check();
        poll(on);
      });
      addEventListener('pageshow', check);
      addEventListener('focus', check);
    }).catch(function () {});
  });
})();
</script>
`;
const out = head + updateStyle + s.slice(0, bodyAt) + '</head>\n<body>\n' + updateBar + s.slice(bodyAt) + '\n' + register + '</body>\n</html>\n';

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'index.html'), out);

/* Service worker-ът. Предварително пази страницата, иконките и снимките,
   които страницата иска — отворена веднъж, тя тръгва и без мрежа.
   Страницата се тегли първо от мрежата (иначе промяна стига до човека чак
   на второто отваряне), снимките и шрифтовете — първо от кеша. */
const precache = ['/cheatcode/', '/cheatcode/manifest.webmanifest', '/cheatcode/icon-192.png',
  '/cheatcode/icon-512.png', '/cheatcode/icon-maskable-512.png', '/cheatcode/apple-icon.png', '/cheatcode/favicon.svg',
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

  /* Видеото — направо от мрежата. Safari го тегли на парчета (Range) и
     иска 206; отговор от кеша е цял файл и iOS отказва да го пусне. */
  if (url.pathname.endsWith('.mp4')) return;

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
