/**
 * Знакът на здраве и сила — от проследения чертеж към магазина:
 *   shop/brand/logo/v5/mark-traced.svg   (пълният, 1:1 по картинката от Gemini)
 *   shop/brand/logo/v5/bold10-traced.svg (по-дебели линии — за 32 px и по-малко)
 *     → src/shop/markPaths.js             (пътищата за <Mark>)
 *     → public/shop/brand/mark.svg        (зелен, на прозрачно)
 *     → public/shop/brand/icon.svg        (овес на зелено, опростеният — за раздела в браузъра)
 *     → public/shop/brand/icon-180/192/512.png (овес на зелено, пълният)
 *
 *   node scripts/build-shop-mark.mjs
 *
 * Проследяването е в shop/brand/logo/v5/trace.mjs; правилата — shop/brand/RULES.md.
 */
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'

const GREEN = '#173F2E', OAT = '#EEEAE1'
const read = (f) => /d="([^"]+)"/.exec(readFileSync(f, 'utf8'))[1]
const full = read('shop/brand/logo/v5/mark-traced.svg')
const bold = read('shop/brand/logo/v5/bold10-traced.svg')

const exe = process.env.CHROMIUM_PATH || process.env.PW_CHROMIUM_PATH
const browser = await chromium.launch(exe ? { executablePath: exe } : {})
const page = await browser.newPage()
page.on('pageerror', (e) => { throw e })

// Квадрат около пълния знак с 6 % поле; опростеният се рисува в същия квадрат.
await page.setContent(`<svg viewBox="0 0 1024 1024"><path id="m" d="${full}"/></svg>`)
const bb = await page.evaluate(() => { const r = document.getElementById('m').getBBox(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
const side = Math.max(bb.w, bb.h) * 1.12
const vb = [bb.x + bb.w / 2 - side / 2, bb.y + bb.h / 2 - side / 2 + side * 0.01, side, side].map((n) => +n.toFixed(1)).join(' ')

writeFileSync('src/shop/markPaths.js', `/* Генерирано от scripts/build-shop-mark.mjs — не се пипа на ръка. */
export const VIEWBOX = '${vb}'
/** Пълният знак: сърце, чиято дясна половина е стегната ръка. */
export const MARK = '${full}'
/** По-дебели линии, без дребните детайли — за 32 px и по-малко. */
export const MARK_BOLD = '${bold}'
`)
const svg = (d, fill, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${bg ? `<rect x="${vb.split(' ')[0]}" y="${vb.split(' ')[1]}" width="${side}" height="${side}" fill="${bg}"/>` : ''}<path fill="${fill}" fill-rule="evenodd" d="${d}"/></svg>\n`
writeFileSync('public/shop/brand/mark.svg', svg(full, GREEN))
// Иконката: знакът е малко по-малък от плочката, за да диша и в кръгла маска.
const tile = (d) => {
  const [x, y] = vb.split(' ').map(Number), pad = side * 0.14
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(x - pad).toFixed(1)} ${(y - pad).toFixed(1)} ${(side + 2 * pad).toFixed(1)} ${(side + 2 * pad).toFixed(1)}"><rect x="${x - pad}" y="${y - pad}" width="${side + 2 * pad}" height="${side + 2 * pad}" fill="${GREEN}"/><path fill="${OAT}" fill-rule="evenodd" d="${d}"/></svg>\n`
}
writeFileSync('public/shop/brand/icon.svg', tile(bold))
for (const s of [180, 192, 512]) {
  await page.setViewportSize({ width: s, height: s })
  await page.setContent(`<style>html,body{margin:0}</style>${tile(full).replace('<svg ', `<svg width="${s}" height="${s}" `)}`)
  await page.screenshot({ path: `public/shop/brand/icon-${s}.png`, clip: { x: 0, y: 0, width: s, height: s } })
}
await browser.close()
console.log('src/shop/markPaths.js, public/shop/brand/mark.svg, icon.svg, icon-180/192/512.png — viewBox', vb)
