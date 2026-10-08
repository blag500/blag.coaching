/**
 * Рисува шапката на писмата на Чийт Код:
 *   cheatcode/brand/mail/hero.html → public/cheatcode/mail-hero.png (1200×380)
 *
 *   node scripts/build-mail-art.mjs
 *
 * Картинка, не HTML: Gmail и Outlook режат градиентите и не показват SVG, а
 * шапката е точно земята на страницата и словният знак. Двоен размер, за да е
 * остра на телефон. CHROMIUM_PATH, ако Playwright не намира свой браузър.
 */
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 600, height: 190 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(resolve('cheatcode/brand/mail/hero.html')).href);
await page.locator('.hero').screenshot({ path: 'public/cheatcode/mail-hero.png' });
await browser.close();
console.log('public/cheatcode/mail-hero.png');
