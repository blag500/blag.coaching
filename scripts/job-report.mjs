#!/usr/bin/env node
/* Дълга задача на компютъра → картата „Върви на компютъра“ в /tablo/.
 *
 *   node scripts/job-report.mjs <id> "<заглавие>" <папка>
 *
 * Папката е опашка на Wan2GP: по един <име>.json за всяко пускане, <име>.log
 * до него и progress.txt, в който пускащият скрипт дописва „<име> HH:MM“ след
 * всяко готово и „ALL DONE“ накрая. На 30 s скриптът смята колко са готови,
 * кое върви (и докъде е по лога), очаквания край по средното досега, и пише
 * ред в tablo_jobs през `supabase db query --linked` — без ключ, като
 * tablo-sync.mjs. Спира сам, когато опашката свърши.
 */
import { readdirSync, readFileSync, existsSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

const [id, title, dir] = process.argv.slice(2)
if (!id || !title || !dir) {
  console.error('node scripts/job-report.mjs <id> "<заглавие>" <папка>')
  process.exit(1)
}
const ROOT = process.cwd()
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`)
// progress.txt идва от PowerShell — UTF-16 с BOM
const readText = (f) => {
  const b = readFileSync(f)
  return b[0] === 0xff && b[1] === 0xfe ? b.toString('utf16le').slice(1) : b.toString('utf8')
}

function status() {
  const names = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()
  const pf = join(dir, 'progress.txt')
  const lines = existsSync(pf) ? readText(pf).split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : []
  const finished = lines.filter((l) => l !== 'ALL DONE').map((l) => l.split(' ')[0])
  const allDone = lines.includes('ALL DONE')
  const next = names.find((n) => !finished.includes(n))
  let current = null
  let pct = 0
  if (next && existsSync(join(dir, `${next}.log`))) {
    // последното „[12/279] VAE Decoding“ или „[1/3] Denoising“ в лога
    const log = readText(join(dir, `${next}.log`)).replace(/\r/g, '\n')
    const m = [...log.matchAll(/\[(\d+)\/(\d+)\]\s+([A-Za-z ]+?)\s*\|/g)].pop()
    if (m) {
      const stage = m[3].trim()
      // приблизително: зареждане 0–15 %, шумът 15–45 %, декодирането 45–100 %
      const f = +m[1] / +m[2]
      pct = stage.startsWith('Denois') ? 15 + f * 30 : stage.startsWith('VAE') ? 45 + f * 55 : f * 15
      current = `${next} · ${Math.round(pct)} %`
    } else current = `${next} · зарежда`
  }
  // средното време на клип от разликите в progress.txt; първият — от началото
  const started = statSync(join(dir, names[0] + '.json')).mtimeMs
  const span = (Date.now() - started) / 1000
  const done = finished.length
  const per = done ? span / (done + pct / 100) : null
  const eta = per && !allDone ? new Date(Date.now() + per * (names.length - done - pct / 100) * 1000) : null
  return { total: names.length, done, current, allDone, eta, started: new Date(started) }
}

function write(s, state) {
  const sql = `insert into public.tablo_jobs (id, title, done, total, current, state, eta, started_at, updated_at)
values (${q(id)}, ${q(title)}, ${s.done}, ${s.total}, ${q(s.current)}, ${q(state)}, ${s.eta ? q(s.eta.toISOString()) : 'null'}, ${q(s.started.toISOString())}, now())
on conflict (id) do update set title = excluded.title, done = excluded.done, total = excluded.total,
  current = excluded.current, state = excluded.state, eta = excluded.eta, updated_at = now();`
  const file = join(tmpdir(), `job-report-${process.pid}.sql`)
  writeFileSync(file, sql)
  execFileSync('supabase', ['db', 'query', '--linked', '-f', file, '-o', 'csv', '--agent', 'no'],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] })
}

for (;;) {
  const s = status()
  try {
    write(s, s.allDone ? 'done' : 'running')
    console.log(new Date().toTimeString().slice(0, 5), `${s.done}/${s.total}`, s.current || '', s.eta ? 'до ' + s.eta.toTimeString().slice(0, 5) : '')
  } catch (e) {
    console.error('не записа:', e.message) // мрежата пада — следващият път
  }
  if (s.allDone) break
  await new Promise((r) => setTimeout(r, 30000))
}
