/**
 * Рисува картинките на писмата на Чийт Код:
 *   cheatcode/brand/mail/hero.html → public/cheatcode/mail-hero.png (1200×380)
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

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

const page = await browser.newPage({ viewport: { width: 600, height: 190 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(resolve('cheatcode/brand/mail/hero.html')).href);
await page.locator('.hero').screenshot({ path: 'public/cheatcode/mail-hero.png' });
console.log('public/cheatcode/mail-hero.png');

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
