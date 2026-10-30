#!/usr/bin/env node
/* Колко тежи всяка папка → картата „Върви на компютъра“ в /tablo/.
 *
 *   node scripts/disk-sizes.mjs <id> "<заглавие>" <папка>
 *
 * Минава папките в <папка> една по една (връзките не се следват) и на 15 s
 * пише в tablo_jobs коя смята и колко е натрупала — като job-report.mjs, през
 * `supabase db query --linked`. Накрая в картата остават най-големите и колко
 * е свободно на диска; целият списък — в %TEMP%\disk-sizes-<id>.json.
 */
import { readdirSync, statSync, statfsSync, writeFileSync } from 'node:fs'
import { join, parse } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

const [id, title, dir] = process.argv.slice(2)
if (!id || !title || !dir) {
  console.error('node scripts/disk-sizes.mjs <id> "<заглавие>" <папка>')
  process.exit(1)
}
const ROOT = process.cwd()
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`)
const gb = (b) => b >= 1e9 ? `${(b / 1e9).toFixed(1).replace('.', ',')} GB` : `${Math.round(b / 1e6)} MB`

function write({ done, total, current, state, started }) {
  const sql = `insert into public.tablo_jobs (id, title, done, total, current, state, eta, started_at, updated_at)
values (${q(id)}, ${q(title)}, ${done}, ${total}, ${q(current)}, ${q(state)}, null, ${q(started.toISOString())}, now())
on conflict (id) do update set title = excluded.title, done = excluded.done, total = excluded.total,
  current = excluded.current, state = excluded.state, eta = null, updated_at = now(), hidden_at = null;`
  const file = join(tmpdir(), `disk-sizes-${process.pid}.sql`)
  writeFileSync(file, sql)
  try {
    execFileSync('supabase', ['db', 'query', '--linked', '-f', file, '-o', 'csv', '--agent', 'no'],
      { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] })
  } catch (e) {
    console.error('не записа:', e.message) // мрежата пада — следващият път
  }
}

const entries = readdirSync(dir, { withFileTypes: true })
const folders = entries.filter((e) => e.isDirectory() && !e.isSymbolicLink()).map((e) => e.name)
const started = new Date()
const total = folders.length + 1 // +1: файловете в корена
const sizes = []
let last = 0

// Обхождане без рекурсия — дълбоките node_modules не пълнят стека.
function sizeOf(path, onTick) {
  let sum = 0
  const stack = [path]
  while (stack.length) {
    const p = stack.pop()
    let list
    try { list = readdirSync(p, { withFileTypes: true }) } catch { continue }
    for (const e of list) {
      if (e.isSymbolicLink()) continue
      const f = join(p, e.name)
      if (e.isDirectory()) stack.push(f)
      else { try { sum += statSync(f).size } catch { /* заключен файл */ } }
    }
    onTick(sum)
  }
  return sum
}

const tick = (name, done) => (sum) => {
  if (Date.now() - last < 15000) return
  last = Date.now()
  write({ done, total, current: `${name} · ${gb(sum)} досега`, state: 'running', started })
}

let rootFiles = 0
for (const e of entries) if (e.isFile()) { try { rootFiles += statSync(join(dir, e.name)).size } catch { /* */ } }
sizes.push({ name: '(файловете в корена)', bytes: rootFiles })

for (const [i, name] of folders.entries()) {
  last = 0
  tick(name, i + 1)(0)
  const bytes = sizeOf(join(dir, name), tick(name, i + 1))
  sizes.push({ name, bytes })
  console.log(gb(bytes).padStart(9), name)
}

sizes.sort((a, b) => b.bytes - a.bytes)
const all = sizes.reduce((s, x) => s + x.bytes, 0)
let free = ''
try {
  const fs = statfsSync(parse(dir).root)
  free = ` · свободно на ${parse(dir).root.replace(/\\$/, '')} ${gb(fs.bavail * fs.bsize)}`
} catch { /* старите Node нямат statfs */ }
const top = sizes.slice(0, 4).map((x) => `${x.name} ${gb(x.bytes)}`).join(', ')
writeFileSync(join(tmpdir(), `disk-sizes-${id}.json`), JSON.stringify({ dir, at: new Date(), all, sizes }, null, 2))
write({ done: total, total, current: `общо ${gb(all)}${free}. Най-големи: ${top}`, state: 'done', started })
console.log(`\nобщо ${gb(all)}${free}`)
