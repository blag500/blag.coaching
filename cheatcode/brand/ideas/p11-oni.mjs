// Три геометрични они. Знакът е един цвят (currentColor); очите и устата са
// дупки през маска, така че фонът прозира — устата е входът за зуума.
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
mkdirSync(join(out, 'svg'), { recursive: true });

// Общите части. Очите са весели „^“ — лукави, не гневни.
const eyes = (y = 33) =>
  `<path d="M18.5 ${y} l5 -4.5 l5 4.5 M35.5 ${y} l5 -4.5 l5 4.5" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
// Устата: плосък горен ръб, кръгло дъно. Два зъба влизат от горния ръб —
// дупката остава едно цяло.
const mouth = (top = 39, w = 30, h = 14) => {
  const x = 32 - w / 2;
  return `<path d="M${x} ${top} h${w} v2 a${w / 2} ${h - 2} 0 0 1 -${w} 0 z" fill="#000"/>` +
    `<path d="M${x + 4} ${top - 0.5} h6.5 l-3.25 6 z M${x + w - 10.5} ${top - 0.5} h6.5 l-3.25 6 z" fill="#fff"/>`;
};

function mark(id, solid, cuts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<mask id="${id}"><rect width="64" height="64" fill="#fff"/>${cuts}</mask>` +
    `<g fill="currentColor" mask="url(#${id})">${solid}</g></svg>`;
}

const marks = {
  // A: маска с рога.
  a: mark('a',
    `<rect x="9" y="18" width="46" height="41" rx="15"/>` +
    `<path d="M15 27 Q8 14 11 3 Q19 12 27 19 z M49 27 Q56 14 53 3 Q45 12 37 19 z"/>`,
    eyes() + mouth()),
  // B: рогата са вилица и лъжица.
  b: mark('b',
    `<rect x="9" y="20" width="46" height="39" rx="15"/>` +
    `<rect x="9.5" y="2" width="3.4" height="10" rx="1.7"/><rect x="15.3" y="2" width="3.4" height="10" rx="1.7"/><rect x="21.1" y="2" width="3.4" height="10" rx="1.7"/>` +
    `<rect x="9.5" y="9" width="15" height="5" rx="2.5"/><rect x="15" y="12" width="4" height="10"/>` +
    `<ellipse cx="47" cy="8.5" rx="6" ry="7.5"/><rect x="45" y="14" width="4" height="8"/>`,
    eyes(35) + mouth(41, 30, 13)),
  // C: най-малкото — кръг, къси рога, намигване.
  c: mark('c',
    `<circle cx="32" cy="37" r="24"/>` +
    `<path d="M14 24 L12 6 L26 15 z M50 24 L52 6 L38 15 z"/>`,
    `<path d="M18.5 33 l5 -4.5 l5 4.5" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<path d="M36 31 h9" stroke="#000" stroke-width="4" stroke-linecap="round"/>` +
    mouth(39, 32, 15)),
};

for (const [k, s] of Object.entries(marks)) writeFileSync(join(out, 'svg', `p11-oni-${k}.svg`), s);

const tile = (s, px, bg, fg) =>
  `<div style="width:${px}px;height:${px}px;border-radius:${px * 0.22}px;background:${bg};color:${fg};display:grid;place-items:center">` +
  `<div style="width:${px * 0.78}px;height:${px * 0.78}px">${s}</div></div>`;
const col = (k, label) => `
  <div class="col">
    <div style="width:220px;height:220px;color:#1F6B4E">${marks[k]}</div>
    <div class="row">${[128, 64, 32, 16].map(p => tile(marks[k], p, '#4FBF8E', '#141C18')).join('')}</div>
    <div class="row dark">${[64, 32, 16].map(p => tile(marks[k], p, '#141C18', '#4FBF8E')).join('')}<span>тъмен фон</span></div>
    <b>${label}</b>
  </div>`;
const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#F2F4EC;font:14px system-ui;color:#141C18;padding:28px;display:flex;gap:36px}
  .col{display:grid;gap:16px;justify-items:center}.row{display:flex;gap:12px;align-items:center}
  .dark{background:#0d1310;padding:10px 12px;border-radius:12px;color:#bbb;font-size:12px}
  svg{width:100%;height:100%;display:block}</style>
  ${col('a', 'A · маска с рога')}${col('b', 'B · рога вилица и лъжица')}${col('c', 'C · кръг, намигване')}`;
// Всяко svg е вградено, затова всяка маска получава свое id.
let m = 0;
const fixed = html.replace(/<svg[\s\S]*?<\/svg>/g, svg => {
  m++; return svg.replace(/id="[^"]+"/, `id="k${m}"`).replace(/url\(#[^)]+\)/, `url(#k${m})`);
});
writeFileSync(join(out, 'oni.html'), fixed);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1060, height: 560 }, deviceScaleFactor: 2 });
await p.goto('file:///' + join(out, 'oni.html').replace(/\\/g, '/'));
await p.screenshot({ path: join(out, 'oni.png'), fullPage: true });
await b.close();
