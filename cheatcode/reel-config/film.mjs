/* Клипът на конфигуратора: истинската страница /cheatcode, снимана кадър по кадър.
 *
 *   node cheatcode/reel-config/film.mjs --sheet 1 3 6 9 11 13.5   кадри в sheet/
 *   node cheatcode/reel-config/film.mjs                          → configurator.mp4
 *   node cheatcode/reel-config/film.mjs --short                  → public/cheatcode/how.mp4
 *     („Как работи“ в страницата: ястие → „Настрой точно“ → плъзгачите)
 *
 * Пуска се от корена на repo-то (там е node_modules с Playwright).
 *
 * Детерминизъм: анимациите и преходите на страницата са изключени, а
 * часовникът ѝ е виртуален — page.clock върви точно 1/30 s на кадър. Така
 * таймерите на страницата (смяната на изгледите, тоста) падат в един и същ
 * кадър при всяко пускане, а сцената решава всичко останало от t. */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../public');
const FPS = 30;
const args = process.argv.slice(2);
const SHORT = args.includes('--short');
const sheet = args[0] === '--sheet' ? args.slice(1).filter(a => a !== '--short').map(Number) : null;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  const file = p === '/__stage' ? path.join(HERE, 'stage.html')
             : path.join(ROOT, p.endsWith('/') ? p + 'index.html' : p);
  fs.readFile(file, (e, d) => {
    if (e) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); r.end(d);
  });
}).listen(8890);

const exe = process.env.CHROMIUM_PATH || process.env.PW_CHROMIUM_PATH;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, colorScheme: 'dark', locale: 'bg-BG' });
/* Сплашът вече е част от клипа. Страницата сама го маха по свой таймер —
   тук това се спира, а сцената решава кога си отива (виж stage.html). */
await ctx.addInitScript(() => {
  window.__keepSplash = true;
  const rm = Element.prototype.remove;
  Element.prototype.remove = function () {
    if (this.id === 'splash' && window.__keepSplash) return;
    return rm.call(this);
  };
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.clock.install({ time: new Date('2026-10-07T10:00:00+03:00') });
await page.goto('http://127.0.0.1:8890/__stage' + (SHORT ? '?short=1' : ''));
await page.evaluate(() => window.__boot());
await page.clock.pauseAt(new Date('2026-10-07T10:05:00+03:00'));

const total = Math.round((await page.evaluate(() => window.__DUR)) * FPS);
let ff = null;
const out = SHORT ? path.join(ROOT, 'cheatcode', 'how.mp4') : path.join(HERE, 'configurator.mp4');
if (!sheet) {
  ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    /* В страницата клипът е колкото пощенска картичка: изрязан до надписа
       и телефона (полето на сцената там е празно място), 720 широк — файлът
       е три пъти по-лек. Пропорцията 720×1390 стои и в CSS на .how. */
    ...(SHORT ? ['-vf', 'crop=860:1660:110:40,scale=720:-2'] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', SHORT ? '23' : '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
} else fs.mkdirSync(path.join(HERE, 'sheet'), { recursive: true });

const want = sheet ? new Set(sheet.map(s => Math.round(s * FPS))) : null;
const last = sheet ? Math.max(...want) : total - 1;
for (let f = 0; f <= last; f++) {
  const t = f / FPS;
  await page.evaluate(t => window.__apply(t), t);
  await page.clock.runFor(1000 / FPS);
  await page.evaluate(t => window.__apply(t), t);   // след таймерите на кадъра — пак същото t
  if (sheet && !want.has(f)) continue;
  const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
  if (sheet) fs.writeFileSync(path.join(HERE, 'sheet', `f${String(f).padStart(3, '0')}.jpg`), buf);
  else if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (!sheet && f % 60 === 0) process.stdout.write(`${t.toFixed(0)}s `);
}
if (ff) { ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('\n→', out); }
console.log(errors.length ? 'page errors:\n' + errors.join('\n') : 'no page errors');
await browser.close(); srv.close();
