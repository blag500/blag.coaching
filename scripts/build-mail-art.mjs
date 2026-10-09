/**
 * Рисува картинките на писмата на Чийт Код:
 *   cheatcode/brand/mail/glass.html → public/cheatcode/mail-hero.png (1200×380)
 *                                    и public/cheatcode/og.png (1200×630)
 *   иконката на приложението (#icon, #mask в същата страница)
 *     → public/cheatcode/apple-icon.png, icon-512.png, icon-192.png,
 *       icon-maskable-512.png
 *   символите s-kcal/s-protein/s-carbs/s-fat от cheatcode/page.html
 *     → public/cheatcode/mail-kcal.png … mail-fat.png (48×48, цветът на
 *       макроса в тъмната тема на страницата)
 *
 *   node scripts/build-mail-art.mjs
 *
 * Картинки, не HTML: Gmail и Outlook режат градиентите и не показват SVG.
 * Двоен размер, за да са остри на телефон. CHROMIUM_PATH, ако Playwright не
 * намира свой браузър.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/* Стъклената верига е WebGL. Без видеокарта (облачна сесия, CI) Chromium
   рисува със SwiftShader — флаговете го разрешават. */
const exe = process.env.CHROMIUM_PATH || process.env.PW_CHROMIUM_PATH;
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

/* Шапката на писмата и картинката за споделяне — от една страница, със
   стъклената верига (cheatcode/brand/mail/glass.html). */
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => { throw e; });
await page.goto(pathToFileURL(resolve('cheatcode/brand/mail/glass.html')).href);
await page.evaluate(() => window.ready);
await page.locator('#hero').screenshot({ path: 'public/cheatcode/mail-hero.png' });
console.log('public/cheatcode/mail-hero.png');
const og = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
await og.goto(pathToFileURL(resolve('cheatcode/brand/mail/glass.html')).href);
await og.evaluate(() => window.ready);
await og.locator('#og').screenshot({ path: 'public/cheatcode/og.png' });
console.log('public/cheatcode/og.png');

/* Иконката на приложението — същата стъклена верига, квадрат. Три размера
   от една рисунка: devicePixelRatio мащабира платното, не картинката. */
for (const [sel, dpr, out] of [['#icon', 2, 'apple-icon.png'], ['#icon', 1, 'icon-512.png'],
  ['#icon', 0.375, 'icon-192.png'], ['#mask', 1, 'icon-maskable-512.png']]) {
  const ic = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: dpr });
  await ic.goto(pathToFileURL(resolve('cheatcode/brand/mail/glass.html')).href);
  await ic.evaluate(() => window.ready);
  await ic.locator(sel).screenshot({ path: `public/cheatcode/${out}` });
  console.log(`public/cheatcode/${out}`);
  await ic.close();
}

/* Символите се вадят от страницата, не се преписват: една рисунка на едно място. */
const src = readFileSync('cheatcode/page.html', 'utf8');
const MACROS = { kcal: '#D4AC66', protein: '#5FB2F0', carbs: '#6FC475', fat: '#C58FD0' };
const icon = await browser.newPage({ viewport: { width: 24, height: 24 }, deviceScaleFactor: 2 });
for (const [name, color] of Object.entries(MACROS)) {
  const m = src.match(new RegExp(`<g id="s-${name}">([\\s\\S]*?)\\n    </g>`));
  if (!m) throw new Error(`няма s-${name} в cheatcode/page.html`);
  await icon.setContent(
    `<style>html,body{margin:0;background:transparent}</style>` +
    `<svg width="24" height="24" viewBox="0 0 24 24" style="color:${color};display:block">${m[1]}</svg>`);
  const out = `public/cheatcode/mail-${name}.png`;
  await icon.locator('svg').screenshot({ path: out, omitBackground: true });
  console.log(out);
}
await browser.close();
