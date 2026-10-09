/**
 * Плакатът за таблото във входа: cheatcode/brand/poster/vhod.html
 *   → cheatcode/brand/poster/vhod-a4.pdf (за печат) и vhod-a4.png (за преглед).
 *
 *   node scripts/build-poster.mjs
 *
 * QR кодът (qr-vhod.svg) е генериран към https://blag-coaching.com/vhod/ —
 * сменя ли се адресът, кодът се прави наново, не се рисува на ръка.
 */
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const exe = process.env.CHROMIUM_PATH || process.env.PW_CHROMIUM_PATH;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => { throw e; });
await page.goto(pathToFileURL(resolve('cheatcode/brand/poster/vhod.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: 'cheatcode/brand/poster/vhod-a4.pdf', format: 'A4', printBackground: true });
await page.locator('.page').screenshot({ path: 'cheatcode/brand/poster/vhod-a4.png' });
await browser.close();
console.log('cheatcode/brand/poster/vhod-a4.pdf, vhod-a4.png');
