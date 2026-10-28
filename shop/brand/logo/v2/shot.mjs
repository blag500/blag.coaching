// sheet.html → sheet.png (за гледане от телефона)
import { chromium } from '@playwright/test';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(here, 'sheet.html')).href);
await page.locator('.wrap').screenshot({ path: join(here, 'sheet.png') });
await browser.close();
console.log(join(here, 'sheet.png'));
