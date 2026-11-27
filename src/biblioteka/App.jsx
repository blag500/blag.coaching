import { useCallback, useEffect, useState } from 'react'
import { GROUPS, TOOLS } from './pages.js'
import { qrPath } from '../vrata/qr.js'

const TAGS = { live: 'на живо', test: 'проба', own: 'лично' }
const ALL = GROUPS.flatMap((g) => g.pages)

async function checkPage(path) {
  const t = performance.now()
  try {
    const r = await fetch(path, { cache: 'no-store' })
    return { ok: r.ok, code: r.status, ms: Math.round(performance.now() - t) }
  } catch {
    return { ok: false, code: 0, ms: Math.round(performance.now() - t) }
  }
}

/** Режимът на вратата — само „status“, нищо не се пише и нищо не се праща. */
async function checkZs() {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  try {
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zs-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ action: 'status' }),
    })
    const d = await r.json()
    return d.mode ? `SMS: ${d.mode.sms} · врата: ${d.mode.door}` : 'функцията не отговаря'
  } catch {
    return 'функцията не отговаря'
  }
}

function Qr({ url }) {
  const q = qrPath(url)
  return (
    <div className="b-qr">
      <svg viewBox={`0 0 ${q.size} ${q.size}`} shapeRendering="crispEdges" role="img" aria-label={`QR към ${url}`}>
        <rect width={q.size} height={q.size} fill="#fff" />
        <path d={q.d} fill="#000" />
      </svg>
      <span>Снимай с другото устройство</span>
    </div>
  )
}

function Card({ p, res, zs, onCheck }) {
  const [qr, setQr] = useState(false)
  const url = location.origin + p.path
  return (
    <li className="b-card">
      <div className="b-top">
        <a className="b-name" href={p.path}>{p.name}</a>
        <span className={`b-tag is-${p.tag}`}>{TAGS[p.tag]}</span>
      </div>
      <p className="b-note">{p.note}</p>
      <div className="b-meta">
        <code>{p.path}</code>
        {res && (
          <span className={res.ok ? 'is-ok' : 'is-bad'}>
            {res.ok ? 'отговаря' : 'не отговаря'} · {res.code || 'няма връзка'} · {res.ms} ms
          </span>
        )}
        {res === null && <span>проверявам…</span>}
      </div>
      {p.check === 'zs' && zs && <p className="b-mode">{zs}</p>}
      {p.tries && (
        <ul className="b-tries">
          {p.tries.map((t) => (
            <li key={t.path}><a href={t.path}><code>{t.path}</code></a> {t.note}</li>
          ))}
        </ul>
      )}
      <div className="b-actions">
        <a className="b-btn" href={p.path}>Отвори</a>
        <a className="b-ghost" href={p.path} target="_blank" rel="noopener">В нов таб</a>
        <button className="b-ghost" onClick={() => setQr((v) => !v)} aria-expanded={qr}>QR</button>
        <button className="b-ghost" onClick={onCheck}>Провери</button>
      </div>
      {qr && <Qr url={url} />}
    </li>
  )
}

export default function App() {
  const [res, setRes] = useState({})
  const [zs, setZs] = useState('')
  const [q, setQ] = useState('')

  const check = useCallback(async (path) => {
    setRes((r) => ({ ...r, [path]: null }))
    const out = await checkPage(path)
    setRes((r) => ({ ...r, [path]: out }))
  }, [])
  const checkAll = useCallback(() => {
    ALL.forEach((p) => check(p.path))
    checkZs().then(setZs)
  }, [check])
  useEffect(() => { checkAll() }, [checkAll])

  const done = ALL.filter((p) => res[p.path]).length
  const bad = ALL.filter((p) => res[p.path] && !res[p.path].ok).length
  const needle = q.trim().toLowerCase()
  const match = (p) => !needle || `${p.name} ${p.path} ${p.note}`.toLowerCase().includes(needle)

  return (
    <main className="b-page">
      <header className="b-head">
        <div>
          <h1>Библиотека</h1>
          <p className="b-sub">
            Всички страници на {location.host}. {done === ALL.length
              ? bad ? `${bad} от ${ALL.length} не отговарят.` : `Всички ${ALL.length} отговарят.`
              : `Проверявам ${done}/${ALL.length}…`}
          </p>
        </div>
        <button className="b-ghost" onClick={checkAll}>Провери всички</button>
      </header>

      <input className="b-search" type="search" placeholder="Търси: врата, табло, /shop/ …" value={q} onChange={(e) => setQ(e.target.value)} />

      {GROUPS.map((g) => {
        const pages = g.pages.filter(match)
        if (!pages.length) return null
        return (
          <section key={g.name} className="b-group">
            <h2>{g.name}</h2>
            <ul className="b-grid">
              {pages.map((p) => <Card key={p.path} p={p} res={res[p.path]} zs={zs} onCheck={() => check(p.path)} />)}
            </ul>
          </section>
        )
      })}

      <section className="b-group">
        <h2>Инструменти</h2>
        <ul className="b-tools">
          {TOOLS.filter((t) => !needle || `${t.name} ${t.note}`.toLowerCase().includes(needle)).map((t) => (
            <li key={t.url}><a href={t.url} target="_blank" rel="noopener">{t.name}</a> <span>{t.note}</span></li>
          ))}
        </ul>
      </section>
    </main>
  )
}
