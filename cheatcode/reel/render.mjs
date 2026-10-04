/**
 * Изважда клипа кадър по кадър и го подава направо на ffmpeg.
 *
 *   node render.mjs                 целият клип → out.mp4
 *   node render.mjs 40 62           само този отрязък, за преглед
 *   node render.mjs --sheet 6 20 33 контактен лист от изброените секунди
 *
 * Кадрите се четат от `toDataURL`, не със снимка на елемента: снимката
 * минава през оформлението на страницата и връща каквото е на екрана,
 * а на екрана canvas-ът е смален. `toDataURL` чете самия буфер — 1920×1080,
 * точно това, което е нарисувано.
 *
 * Няма междинни файлове. 4500 JPEG-а на диска са 1.5 GB и после пак
 * трябва да се четат; тук всеки кадър отива директно в тръбата.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';

/* Скриптът се пуска от папката, в която е инсталиран playwright, а пише
   при клипа. Затова изходът се мери спрямо REEL_DIR, не спрямо cwd. */
const DIR = process.env.REEL_DIR || process.cwd();
const at = p => isAbsolute(p) ? p : join(DIR, p);

/* Клипът живее извън всякакъв проект и няма свой node_modules. ESM търси
   пакета спрямо мястото на скрипта, не спрямо работната папка, затова
   playwright се разрешава явно от проекта, който вече го има. */
const HOST = process.env.PW_HOST || 'C:/Users/Nikolay/Desktop/su/business/blag coaching';
const { chromium } = createRequire(join(HOST, 'package.json'))('playwright');

const FPS = 30;
const URL = process.env.PAGE || 'http://127.0.0.1:8899/';

const args = process.argv.slice(2);
const sheetMode = args[0] === '--sheet';
const marks = sheetMode ? args.slice(1).map(Number) : null;
const t0 = !sheetMode && args[0] != null ? Number(args[0]) : 0;
const t1raw = !sheetMode && args[1] != null ? Number(args[1]) : null;
const OUT = at(process.env.OUT || 'out.mp4');

const browser = await chromium.launch({ executablePath: process.env.PW_EXEC || undefined, args: ['--force-color-profile=srgb', '--disable-lcd-text'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });

const problems = [];
page.on('pageerror', e => problems.push(String(e)));

await page.goto(URL);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });

/* Дължината идва от самата страница. Два клипа с различна дължина не бива
   да се помнят на две места. */
const DUR = await page.evaluate(() => window.__DUR ?? 150);

const grab = async (t) => {
  await page.evaluate(tt => window.__seek(tt), t);
  const url = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/jpeg', 0.94));
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};

if (sheetMode) {
  mkdirSync(at('sheet'), { recursive: true });
  for (let i = 0; i < marks.length; i++) {
    writeFileSync(at(`sheet/${String(i).padStart(2, '0')}_t${marks[i]}.jpg`), await grab(marks[i]));
  }
  console.log(`${marks.length} кадъра в sheet/`);
  if (problems.length) console.error('ГРЕШКИ:', problems.slice(0, 5));
  await browser.close();
  process.exit(0);
}

const t1 = t1raw ?? DUR;
const total = Math.round((t1 - t0) * FPS);
const ff = spawn('ffmpeg', [
  '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  OUT,
], { stdio: ['pipe', 'ignore', 'pipe'] });

let ffErr = '';
ff.stderr.on('data', d => { ffErr += d; if (ffErr.length > 8000) ffErr = ffErr.slice(-4000); });

const started = Date.now();
for (let f = 0; f < total; f++) {
  const buf = await grab(t0 + f / FPS);
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 150 === 0 || f === total - 1) {
    const done = f + 1, el = (Date.now() - started) / 1000;
    const eta = el / done * (total - done);
    process.stdout.write(
      `\r${String(Math.round(done / total * 100)).padStart(3)}%  ` +
      `${done}/${total}  ${el.toFixed(0)}s изтекли  ~${eta.toFixed(0)}s остават   `);
  }
}
ff.stdin.end();
process.stdout.write('\n');

const code = await new Promise(r => ff.on('close', r));
await browser.close();

if (problems.length) console.error('ГРЕШКИ В СТРАНИЦАТА:', problems.slice(0, 5));
if (code !== 0) { console.error(ffErr.slice(-1500)); process.exit(1); }
console.log(`готово → ${OUT}`);
