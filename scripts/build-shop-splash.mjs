/**
 * Сплашът на магазина като видео: стъкленият знак (public/shop/glass-mark.js)
 * → public/shop/brand/splash.mp4 и splash-poster.png
 *
 *   node scripts/build-shop-splash.mjs
 *
 * Защо видео: живият знак иска three.js (600 KB) и на телефон не смогва да
 * тръгне навреме — същото като сплаша на Чийт Код (build-splash.mjs).
 * Хореографията следва Splash в src/shop/Brand.jsx: знакът израства за
 * 450 ms, после удря като сърце и ръката се стяга. Земята е зелената на
 * марката (--brand), за да се слее с фона на сплаша без шев.
 * Рисува се със SwiftShader, без видеокарта.
 */
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const FPS = 30, MS = 1500, SIZE = 300
const d = /\sd="([^"]+)"/.exec(readFileSync('public/shop/brand/mark.svg', 'utf8'))[1]
const exe = process.env.CHROMIUM_PATH || process.env.PW_CHROMIUM_PATH
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 2 })
page.on('pageerror', (e) => { throw e })
const base = pathToFileURL(resolve('public')).href + '/'
const stage = join(mkdtempSync(join(tmpdir(), 'zs-splash-')), 'stage.html')
writeFileSync(stage, `<!doctype html><base href="${base}">
<style>html,body{margin:0;background:#173F2E}canvas{display:block;width:${SIZE}px;height:${SIZE}px}</style>
<canvas id="c"></canvas><script src="cheatcode/vendor/three-r128.min.js"></script><script src="shop/glass-mark.js"></script>`)
await page.goto(pathToFileURL(stage).href)
await page.waitForFunction(() => window.GlassMark)
await page.evaluate((d) => {
  const c = document.getElementById('c')
  window.gm = GlassMark(c, { d, tone: 'dark', still: true, sizeFrom: c })
  if (!window.gm) throw new Error('без WebGL')
  gm.pose({ swing: false, beatAt: 0.55 })
}, d)

const out = 'public/shop/brand/splash.mp4'
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] })
const total = Math.round(MS / 1000 * FPS)
for (let f = 0; f < total; f++) {
  const ms = f * 1000 / FPS
  await page.evaluate((ms) => {
    const k = Math.min(1, ms / 450), e = 1 - Math.pow(1 - k, 3)
    gm.pose({ grow: 0.55 + 0.45 * e, turn: (1 - e) * -0.6 })
    gm.draw(ms)
  }, ms)
  const buf = await page.screenshot({ type: 'png' })
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
}
ff.stdin.end()
await new Promise((r) => ff.on('close', r))
// Последният кадър — постер, ако видеото не тръгне.
await page.screenshot({ path: 'public/shop/brand/splash-poster.png' })
await browser.close()
console.log(`${out} — ${total} кадъра; public/shop/brand/splash-poster.png`)
