#!/usr/bin/env node
/**
 * Качва бележки в мозъка на бота.
 *
 * Минава през папка с markdown, реже всеки файл по заглавия и го праща на
 * крайната функция `knowledge`, която смята вгражданията и ги записва.
 * Непроменен файл се прескача — отпечатъкът на съдържанието се пази в базата,
 * така че второто пускане върху хиляда бележки не струва нищо.
 *
 * Пуска се така:
 *
 *   node scripts/sync-knowledge.mjs "D:/obsidian/Треньорство" --scope private
 *   node scripts/sync-knowledge.mjs "D:/obsidian/За клиенти" --scope shared
 *
 * Обхватът е важен и затова е изричен, без подразбиране за „всички":
 *   private — влиза само в отговорите до самия Николай;
 *   shared  — влиза и в отговорите до клиентите му.
 *
 * Материал, платен от треньора, се качва като `private`, докато той сам не
 * реши кое от него да стига до клиент — и дори тогава ботът го преразказва със
 * свои думи, вместо да го препише: така е написано правилото в подканата.
 *
 * Иска две неща от средата:
 *   SUPABASE_URL     — https://<проект>.supabase.co
 *   BOT_SECRET       — същата тайна като на нощната обиколка
 *   OWNER_EMAIL      — чие е знанието
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, extname, basename } from 'node:path'

const root   = process.argv[2]
const scope  = (process.argv.includes('--scope')
  ? process.argv[process.argv.indexOf('--scope') + 1]
  : 'private')

const URL_BASE = process.env.SUPABASE_URL
const SECRET   = process.env.BOT_SECRET
const OWNER    = process.env.OWNER_EMAIL

if (!root) {
  console.error('Кажи коя папка: node scripts/sync-knowledge.mjs <папка> [--scope private|shared]')
  process.exit(1)
}
if (!URL_BASE || !SECRET || !OWNER) {
  console.error('Липсва SUPABASE_URL, BOT_SECRET или OWNER_EMAIL в средата.')
  process.exit(1)
}
if (!['private', 'shared'].includes(scope)) {
  console.error('Обхватът е private или shared.')
  process.exit(1)
}

/** Всички .md файлове, без папките на самия Obsidian. */
async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) { out.push(...await walk(full)); continue }
    if (extname(entry.name).toLowerCase() === '.md') out.push(full)
  }
  return out
}

const files = await walk(root)
console.log(`${files.length} бележки в ${root}`)

let added = 0, skipped = 0, failed = 0

for (const file of files) {
  const text = await readFile(file, 'utf8')
  /* Празна бележка и бележка от три думи не са знание — те са заглавие, което
     чака да бъде написано. */
  if (text.replace(/\s/g, '').length < 200) { skipped++; continue }

  const rel = relative(root, file).replace(/\\/g, '/')
  const res = await fetch(`${URL_BASE}/functions/v1/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bot-secret': SECRET },
    body: JSON.stringify({
      ownerEmail: OWNER,
      source: basename(file, '.md'),
      origin: rel,
      scope,
      text,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) { failed++; console.error(`✗ ${rel}: ${data.error ?? res.status}`); continue }
  if (data.skipped) { skipped++; continue }
  added++
  console.log(`✓ ${rel} — ${data.chunks} парчета`)
}

console.log(`\nготово: ${added} качени, ${skipped} прескочени, ${failed} паднали`)
