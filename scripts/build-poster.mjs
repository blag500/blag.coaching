/**
 * Картата за таблото във входа: cheatcode/brand/poster/kod.html
 *   → cheatcode/brand/poster/kod.pdf (за печат, 105 × 148 мм) и kod.png (за преглед).
 * (До 09.10 тук беше плакат A4 — „прекалено старомоден", сменен с картата.)
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
const page = await browser.newPage({ viewport: { width: 500, height: 700 }, deviceScaleFactor: 4 });
page.on('pageerror', (e) => { throw e; });
await page.goto(pathToFileURL(resolve('cheatcode/brand/poster/kod.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: 'cheatcode/brand/poster/kod.pdf', width: '105mm', height: '148mm', printBackground: true });
await page.locator('.card').screenshot({ path: 'cheatcode/brand/poster/kod.png' });
await browser.close();
console.log('cheatcode/brand/poster/kod.pdf, kod.png');
