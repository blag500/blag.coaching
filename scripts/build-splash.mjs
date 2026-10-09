/**
 * Стъкленият сплаш на Чийт Код като видео:
 *   public/cheatcode/glass-chain.js → public/cheatcode/splash.mp4
 *
 *   node scripts/build-splash.mjs
 *
 * Защо видео: живата стъклена верига иска three.js (600 KB) и на телефон не
 * смогваше да тръгне навреме — сплашът оставаше плосък и на първото, и често
 * на следващите отваряния. Записаният клип е ~60 KB и тръгва веднага.
 *
 * Хореографията е същата като на плоския сплаш в cheatcode/page.html
 * (1400 ms след 120 ms закъснение): звената влизат, напъват се, при 54 % се
 * късат и отломките излитат. Първите 120 ms са празна земя — така клипът
 * върви в такт с името и надписа, които остават CSS.
 *
 * Земята е #141C18 — тъмната тема. Рисува се със SwiftShader, без видеокарта.
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const FPS = 30, LEAD = 120, RUN = 1400, TAIL = 100;
const exe = process.env.CHROMIUM_PATH || process.env.PW_CHROMIUM_PATH;
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => { throw e; });
/* Отделен файл, не setContent: празната страница няма право да чете file://. */
const base = pathToFileURL(resolve('public/cheatcode')).href + '/';
const stage = join(mkdtempSync(join(tmpdir(), 'cc-splash-')), 'stage.html');
writeFileSync(stage, `<!doctype html><base href="${base}">
<style>html,body{margin:0;background:#141C18}canvas{display:block;width:230px;height:230px}</style>
<canvas id="c"></canvas>
<script src="vendor/three-r128.min.js"></script><script src="glass-chain.js"></script>`);
await page.goto(pathToFileURL(stage).href);
await page.waitForFunction(() => window.GlassChain);
await page.evaluate(() => {
  const c = document.getElementById('c');
  window.gc = GlassChain(c, { tone: 'dark', still: true, sizeFrom: c, scale: 0.76 });
  if (!window.gc) throw new Error('без WebGL');
});

const out = 'public/cheatcode/splash.mp4';
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const total = Math.round((LEAD + RUN + TAIL) / 1000 * FPS);
for (let f = 0; f < total; f++) {
  const ms = f * 1000 / FPS;
  await page.evaluate((ms) => {
    const c = document.getElementById('c');
    const lead = ms < 120;
    c.style.visibility = lead ? 'hidden' : 'visible';
    if (lead) return;
    // Същите криви като живия сплаш преди (page.html, glassSplash).
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const back = (x) => { const k = 1.7; return 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2); };
    const p = Math.max(0, Math.min(1, (ms - 120) / 1400));
    const apart = p < 0.22 ? 1 - ease(p / 0.22) : 0;
    const k = p < 0.22 || p > 0.53 ? 0 : (p - 0.22) / 0.31;
    const shake = Math.sin(p * 1400 / 38) * 0.06 * k * k;
    const broken = p >= 0.54;
    const burst = broken ? Math.min(1, back(Math.min(1, (p - 0.54) / 0.4))) : 0;
    gc.pose({ apart, shake, broken, burst, swing: false });
    gc.draw(ms);
  }, ms);
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 230, height: 230 } });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log(`${out} — ${total} кадъра`);
