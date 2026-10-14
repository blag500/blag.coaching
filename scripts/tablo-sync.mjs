#!/usr/bin/env node
/* Числата за /tablo/, които живеят само на компютъра.
 *
 *   node scripts/tablo-sync.mjs           смята и пише в базата
 *   node scripts/tablo-sync.mjs --dry     само показва какво би писал
 *
 * Три извора:
 *   1. Историята на сесиите с Claude Code (~/.claude/projects/**.jsonl) —
 *      сесии, повиквания, инструменти и токени по дни и по сесия.
 *   2. git — промените по дни в repo-то и в трезора.
 *   3. Трезорът — бележките на сесиите по дни.
 *
 * Пише през `supabase db query --linked`: CLI-то е влязло на този компютър,
 * така че скриптът не държи ключ. Изпълнява се от корена на repo-то (там е
 * връзката към проекта). Всяко пускане презаписва последните DAYS дни —
 * повторно пускане не удвоява нищо.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

const DAYS = 90
const DRY = process.argv.includes('--dry')
const ROOT = process.cwd()
const VAULT = process.env.TABLO_VAULT || 'D:/obsidian/blag'
const REPOS = [
  { key: 'app', path: ROOT },
  { key: 'vault', path: VAULT },
]

const sofiaDay = (iso) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' }).format(new Date(iso))
const since = sofiaDay(new Date(Date.now() - DAYS * 864e5).toISOString())

/* ── 1. Сесиите с Claude ──────────────────────────────────────────────────── */

function* jsonlFiles(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) yield* jsonlFiles(p)
    else if (name.endsWith('.jsonl')) yield p
  }
}

/* Първото нещо, което човекът е написал — без системните бележки и без
   вмъкнатите от инструментите съобщения. Става заглавие на реда. */
function humanText(msg) {
  let c = msg?.content
  if (Array.isArray(c)) c = c.filter((x) => x?.type === 'text').map((x) => x.text).join(' ')
  if (typeof c !== 'string') return null
  c = c.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim()
  if (!c || c.startsWith('<') || c.startsWith('This session is being continued') ||
      c.startsWith('Deliver to the session') || c.includes('[Request interrupted')) return null
  return c.replace(/\s+/g, ' ')
}

const sessions = new Map()   // sessionId → агрегат
const daily = new Map()      // 'YYYY-MM-DD|key' → число
const bump = (day, key, v) => {
  if (day < since || !v) return
  const k = `${day}|${key}`
  daily.set(k, (daily.get(k) || 0) + v)
}

const projectsDir = join(homedir(), '.claude', 'projects')
for (const file of jsonlFiles(projectsDir)) {
  // Едно повикване към модела се пише в няколко реда (по един на блок) с
  // един и същ requestId — s.calls го пази веднъж, с последната му употреба.
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue
    let d
    try { d = JSON.parse(line) } catch { continue }
    const sid = d.sessionId || d.session_id
    if (!sid || !d.timestamp) continue
    let s = sessions.get(sid)
    if (!s) {
      s = { id: sid, started: d.timestamp, ended: d.timestamp, project: d.cwd ? basename(d.cwd) : null,
            title: null, model: null, tools: 0, calls: new Map() }
      sessions.set(sid, s)
    }
    if (d.timestamp < s.started) s.started = d.timestamp
    if (d.timestamp > s.ended) s.ended = d.timestamp
    if (!s.project && d.cwd) s.project = basename(d.cwd)

    if (d.type === 'user' && !d.isMeta && !s.title) {
      const t = humanText(d.message)
      if (t) s.title = t.length > 90 ? t.slice(0, 89) + '…' : t
    }
    if (d.type === 'assistant' && d.message) {
      const m = d.message
      if (m.model && !m.model.startsWith('<')) s.model = m.model
      if (Array.isArray(m.content)) {
        const n = m.content.filter((x) => x?.type === 'tool_use').length
        if (n) { s.tools += n; bump(sofiaDay(d.timestamp), 'claude.tools', n) }
      }
      if (m.usage && d.requestId) s.calls.set(d.requestId, { at: d.timestamp, u: m.usage })
    }
  }
}

const rows = []
for (const s of sessions.values()) {
  const tot = { input: 0, read: 0, write: 0, output: 0 }
  for (const { at, u } of s.calls.values()) {
    const day = sofiaDay(at)
    const input = u.input_tokens || 0
    const read = u.cache_read_input_tokens || 0
    const write = u.cache_creation_input_tokens || 0
    const output = u.output_tokens || 0
    tot.input += input; tot.read += read; tot.write += write; tot.output += output
    bump(day, 'claude.calls', 1)
    bump(day, 'tok.input', input)
    bump(day, 'tok.cache_read', read)
    bump(day, 'tok.cache_write', write)
    bump(day, 'tok.output', output)
  }
  if (!s.calls.size) continue
  bump(sofiaDay(s.started), 'claude.sessions', 1)
  if (sofiaDay(s.ended) >= since) rows.push({ ...s, tot, n: s.calls.size })
}

/* ── 2. git ───────────────────────────────────────────────────────────────── */

for (const r of REPOS) {
  if (!existsSync(join(r.path, '.git'))) continue
  let out = ''
  try {
    out = execFileSync('git', ['-C', r.path, 'log', `--since=${since}`, '--date=iso-strict', '--pretty=%ad'],
      { encoding: 'utf8', maxBuffer: 32 << 20 })
  } catch { continue }
  for (const at of out.split('\n').filter(Boolean)) bump(sofiaDay(at), `git.${r.key}`, 1)
}

/* ── 3. Бележките в трезора ───────────────────────────────────────────────── */

if (existsSync(VAULT)) {
  for (const name of readdirSync(VAULT)) {
    const m = /^(\d{4}-\d{2}-\d{2}) .+\.md$/.exec(name)
    if (m) bump(m[1], 'vault.notes', 1)
  }
}

/* ── Записът ──────────────────────────────────────────────────────────────── */

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const sql = []
sql.push('begin;')
sql.push(`delete from public.tablo_daily where day >= ${q(since)} and (key like 'claude.%' or key like 'tok.%' or key like 'git.%' or key = 'vault.notes');`)
const dailyRows = [...daily].map(([k, v]) => { const [day, key] = k.split('|'); return `(${q(day)}, ${q(key)}, ${v})` })
for (let i = 0; i < dailyRows.length; i += 500) {
  sql.push(`insert into public.tablo_daily (day, key, value) values ${dailyRows.slice(i, i + 500).join(',')};`)
}
for (const s of rows) {
  sql.push(`insert into public.tablo_sessions (id, started_at, ended_at, project, title, model, calls, tool_calls, tok_input, tok_cache_read, tok_cache_write, tok_output)
values (${q(s.id)}, ${q(s.started)}, ${q(s.ended)}, ${q(s.project)}, ${q(s.title)}, ${q(s.model)}, ${s.n}, ${s.tools}, ${s.tot.input}, ${s.tot.read}, ${s.tot.write}, ${s.tot.output})
on conflict (id) do update set ended_at = excluded.ended_at, project = excluded.project, title = coalesce(public.tablo_sessions.title, excluded.title),
  model = excluded.model, calls = excluded.calls, tool_calls = excluded.tool_calls, tok_input = excluded.tok_input,
  tok_cache_read = excluded.tok_cache_read, tok_cache_write = excluded.tok_cache_write, tok_output = excluded.tok_output;`)
}
sql.push(`insert into public.tablo_sync (source, synced_at, note) values ('computer', now(), ${q(`${rows.length} сесии, ${dailyRows.length} числа`)})
on conflict (source) do update set synced_at = excluded.synced_at, note = excluded.note;`)
sql.push('commit;')

console.log(`сесии: ${rows.length}, числа по дни: ${dailyRows.length}, от ${since}`)
if (DRY) {
  const byKey = {}
  for (const [k, v] of daily) { const key = k.split('|')[1]; byKey[key] = (byKey[key] || 0) + v }
  console.log(byKey)
  process.exit(0)
}

const file = join(tmpdir(), `tablo-sync-${process.pid}.sql`)
writeFileSync(file, sql.join('\n'))
execFileSync('supabase', ['db', 'query', '--linked', '-f', file, '-o', 'csv', '--agent', 'no'],
  { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] })
console.log('записано')
