/**
 * Рисува постовете и картинката за споделяне на здраве&сила:
 *   shop/brand/social/posts.html → shop/brand/social/out/p1…p5.png (1080×1350); p6–p8 са със снимките от photos/
 *                                 и public/shop/brand/og.png (1200×630)
 *
 *   node scripts/build-shop-art.mjs
 *
 * Числата (цена на доза, протеин на 100 г, доставката) се теглят от базата
 * през публичния ключ в .env.local — постът казва това, което казва магазинът.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2)))
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
const get = async (q) => (await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json()
const products = await get('shop_products?select=*&active=eq.true&order=sort')
const delivery = await get('shop_delivery?select=*&active=eq.true&order=sort')

mkdirSync('shop/brand/social/out', { recursive: true })
const exe = process.env.CHROMIUM_PATH || process.env.PW_CHROMIUM_PATH
const browser = await chromium.launch(exe ? { executablePath: exe } : {})
const page = await browser.newPage({ viewport: { width: 1300, height: 1500 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => { throw e })
await page.goto(pathToFileURL(resolve('shop/brand/social/posts.html')).href)
await page.evaluate((base) => { window.IMG_BASE = base }, pathToFileURL(resolve('public/shop/img')).href + '/')
await page.evaluate((D) => window.render(D), { products, delivery })
await page.evaluate(() => Promise.all(['600 64px Unbounded', '700 30px Inter', '600 30px Inter'].map((f) => document.fonts.load(f, 'здраве сила абв 123'))))
await page.waitForTimeout(500)
for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']) {
  await page.locator('#' + id).screenshot({ path: `shop/brand/social/out/${id}.png` })
  console.log(`shop/brand/social/out/${id}.png`)
}
await page.locator('#og').screenshot({ path: 'public/shop/brand/og.png' })
console.log('public/shop/brand/og.png')
await browser.close()
