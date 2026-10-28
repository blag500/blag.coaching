// mark-traced.svg → изрязан квадратен знак в няколко цвята + лист за гледане (sheet.png).
//   node shop/brand/logo/v5/finish.mjs   (от корена на repo-то)
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const here = 'shop/brand/logo/v5';
const d = /d="([^"]+)"/.exec(readFileSync(join(here, 'mark-traced.svg'), 'utf8'))[1];
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
await p.setContent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path id="m" d="${d}"/></svg>`);
const bb = await p.evaluate(() => { const r = document.getElementById('m').getBBox(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
// Квадрат около знака с 6% поле; оптичният център — малко над геометричния.
const side = Math.max(bb.w, bb.h) * 1.12;
const vx = bb.x + bb.w / 2 - side / 2, vy = bb.y + bb.h / 2 - side / 2 + side * 0.01;
const vb = `${vx.toFixed(1)} ${vy.toFixed(1)} ${side.toFixed(1)} ${side.toFixed(1)}`;
const mark = (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><title>здраве и сила</title><path fill="${color}" fill-rule="evenodd" d="${d}"/></svg>\n`;
const V = { green: '#173F2E', ink: '#12140F', 'on-dark': '#EEEAE1', bright: '#1F7A45' };
for (const [k, c] of Object.entries(V)) writeFileSync(join(here, `mark-${k}.svg`), mark(c));

const inline = (color, size) => mark(color).replace('<svg ', `<svg width="${size}" height="${size}" `);
const F = 'file:///D:/blag-ai/fonts/';
const tiles = [['#FFFFFF', V.green, 'зелено на бяло'], ['#EEEAE1', V.green, 'зелено на овес'], ['#173F2E', '#EEEAE1', 'овес на зелено'],
               ['#2E3338', '#F4F4F0', 'както на табелата'], ['#EEEAE1', V.ink, 'мастило']]
  .map(([bg, c, n]) => `<div><div class="c" style="background:${bg}">${inline(c, 190)}</div><p>${n}</p></div>`).join('');
const sizes = [128, 64, 48, 32, 24, 16].map((s) => `<div class="s">${inline(V.green, s)}<i>${s}</i></div>`).join('');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><style>
@font-face{font-family:'Golos Text';src:url(${F}GolosText.ttf);font-weight:400 900}
body{margin:0;background:#fff;font-family:'Segoe UI',sans-serif;color:#12140F}
.wrap{padding:40px 48px;width:1260px} h1{font-size:30px;margin:0 0 6px} .lead{font-size:17px;color:#55584F;margin:0 0 22px}
h2{font-size:19px;margin:28px 0 12px} .row{display:flex;gap:16px} .c{width:220px;height:220px;border-radius:22px;display:grid;place-items:center}
.row p{font-size:15px;color:#55584F;margin:6px 0 0} .s{display:flex;flex-direction:column;align-items:center;gap:6px;justify-content:end} .s i{font-size:13px;color:#77796F;font-style:normal}
.sizes{display:flex;gap:26px;align-items:end;background:#EEEAE1;padding:20px 26px;border-radius:18px;width:max-content}
.lk{display:flex;align-items:center;gap:18px;font:800 64px 'Golos Text';margin:6px 0 14px}
.sign{display:flex;align-items:center;gap:16px;background:#2E3338;border-radius:18px;padding:24px 36px;width:max-content;font:800 78px 'Golos Text';color:#F4F4F0}
</style><div class="wrap"><h1>Знакът от Gemini, начертан като вектор</h1>
<p class="lead">Проследен 1:1 от картинката (без житния клас) — чист SVG, мащабира се до всякакъв размер.</p>
<div class="row">${tiles}</div>
<h2>Размери</h2><div class="sizes">${sizes}</div>
<h2>С името</h2>
<div class="lk" style="color:#173F2E">${inline(V.green, 120)}<span>здраве и сила</span></div>
<div class="sign"><span>ЗДРАВЕ</span>${inline('#F4F4F0', 120)}<span>СИЛА</span></div></div>`;
writeFileSync(join(here, 'sheet.html'), html);
await p.goto(pathToFileURL(join(process.cwd(), here, 'sheet.html')).href);
await p.evaluate(() => document.fonts.ready);
await p.locator('.wrap').screenshot({ path: join(here, 'sheet.png') });
await b.close();
console.log('viewBox', vb);
