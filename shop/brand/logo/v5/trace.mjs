// gemini-source.jpg → mark-traced.svg (чрез trace.html). Пуска се от корена на repo-то:
//   node shop/brand/logo/v5/trace.mjs [eps] [fill|growN]   (growN → линиите по-дебели с N px, за малките размери)
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const here = 'shop/brand/logo/v5';
const eps = process.argv[2] || '0.7';
const fill = process.argv[3] === 'fill';
const grow = process.argv[3]?.startsWith('grow') ? process.argv[3].slice(4) : '';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage();
const src = pathToFileURL(join(process.cwd(), here, 'gemini-source.jpg')).href;
await p.goto(pathToFileURL(join(process.cwd(), here, 'trace.html')).href + `?src=${encodeURIComponent(src)}&eps=${eps}${fill ? '&fill=1' : ''}${grow ? '&grow=' + grow : ''}`);
await p.waitForFunction(() => window.result);
const r = await p.evaluate(() => window.result);
await b.close();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.W} ${r.H}"><path fill="#173F2E" fill-rule="evenodd" d="${r.d}"/></svg>\n`;
writeFileSync(join(here, grow ? `bold${grow}-traced.svg` : fill ? 'silhouette-traced.svg' : 'mark-traced.svg'), svg);
console.log(`${r.loops} контура, ${(svg.length / 1024).toFixed(1)} KB`);
