import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

const URL_ = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zs-access`
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const STORE = 'zs_reader'
const UNLOCK_MS = 3000 // колкото държи релето (toggle_after: 3 във функцията)

async function call(action, body = {}) {
  try {
    const r = await fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ action, ...body }),
    })
    const data = await r.json().catch(() => ({}))
    return r.ok ? data : { error: data.error || 'Нещо се обърка.', status: r.status, mode: data.mode }
  } catch {
    return { error: 'Няма връзка с базата.', status: 0 }
  }
}

const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) } catch { return null } }
const keep = (v) => { try { v ? localStorage.setItem(STORE, JSON.stringify(v)) : localStorage.removeItem(STORE) } catch { /* */ } }
const hhmmss = (d) => d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

/** Кратък звук: висок двоен за „отворено“, нисък за „отказ“. */
let ac
function beep(ok) {
  try {
    ac ??= new AudioContext()
    const tones = ok ? [880, 1320] : [220]
    tones.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain()
      o.frequency.value = f; o.type = 'sine'
      const t = ac.currentTime + i * 0.12
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + (ok ? 0.1 : 0.35))
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.4)
    })
  } catch { /* без звук */ }
}

function Pair({ onPaired }) {
  const [name, setName] = useState('Вратата · тест')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    const d = await call('pair', { name })
    setBusy(false)
    if (d.error) return setErr(d.error)
    const r = { reader: d.reader, key: d.key, name: d.name }
    keep(r); onPaired(r)
  }
  return (
    <form className="c-card c-pair" onSubmit={go}>
      <h1>Четецът</h1>
      <p className="c-note">
        Това устройство става четецът при вратата. Базата му дава номер и таен ключ, и всяко влизане
        се записва с него. Сдвояване от страницата има само докато вратата е в тестов режим.
      </p>
      <label className="c-label" htmlFor="nm">Име на четеца</label>
      <input id="nm" className="c-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      <button className="c-btn" disabled={busy}>{busy ? 'Сдвоявам…' : 'Сдвои'}</button>
      {err && <p className="c-err" role="alert">{err}</p>}
    </form>
  )
}

function Terminal({ me, onUnpair }) {
  const video = useRef(null)
  const [facing, setFacing] = useState('user') // при вратата клиентът стои срещу екрана
  const [camErr, setCamErr] = useState('')
  const [door, setDoor] = useState({ kind: 'locked' })
  const [left, setLeft] = useState(0)
  const [online, setOnline] = useState(null)
  const [mode, setMode] = useState(null)
  const [log, setLog] = useState([])
  const [manual, setManual] = useState('')
  const busy = useRef(false)
  const timer = useRef(0) // един таймер за вратата: ново прочитане спира стария
  const lastQr = useRef({ text: '', at: 0 })

  // „Жив съм“ — веднага и на всяка минута. 401 = четецът е спрян или изтрит.
  useEffect(() => {
    let alive = true
    const ping = async () => {
      const d = await call('ping', { reader: me.reader, key: me.key })
      if (!alive) return
      if (d.mode) setMode(d.mode)
      if (d.status === 401) { setOnline(false); setDoor({ kind: 'bad', text: 'Четецът е спрян. Сдвои го наново.' }) }
      else setOnline(!d.error)
    }
    ping()
    const id = setInterval(ping, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [me])

  // Екранът да не гасне, докато четецът е отворен.
  useEffect(() => {
    let lock
    const get = () => navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    get()
    const vis = () => document.visibilityState === 'visible' && get()
    document.addEventListener('visibilitychange', vis)
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release().catch(() => {}) }
  }, [])

  useEffect(() => () => clearInterval(timer.current), [])

  const submit = useCallback(async (text) => {
    busy.current = true
    clearInterval(timer.current)
    const d = await call('scan', { qr: text, reader: me.reader, key: me.key })
    const at = new Date()
    if (d.mode) setMode(d.mode)
    if (d.error) {
      beep(false)
      setDoor({ kind: 'bad', text: d.error })
      setLog((l) => [{ at, ok: false, text: d.error, qr: /^ZS1\.([0-9A-F]{10})\./.exec(text)?.[1] }, ...l].slice(0, 30))
      const until = Date.now() + 2000
      timer.current = setInterval(() => {
        if (Date.now() >= until) { clearInterval(timer.current); setDoor({ kind: 'locked' }); busy.current = false }
      }, 100)
      return
    }
    beep(true)
    setDoor({ kind: 'open', repeat: d.repeat })
    if (!d.repeat) setLog((l) => [{ at, ok: true, text: 'Отворено', qr: d.qr }, ...l].slice(0, 30))
    const until = Date.now() + UNLOCK_MS
    timer.current = setInterval(() => {
      const ms = until - Date.now()
      setLeft(Math.max(0, ms))
      if (ms <= 0) { clearInterval(timer.current); setDoor({ kind: 'locked' }); busy.current = false }
    }, 100)
  }, [me])

  // Камерата → jsQR на всеки ~150 ms. Един и същи QR не се праща пак до 4 секунди.
  useEffect(() => {
    let stream, raf, stop = false, t = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    setCamErr('')
    const tick = (now) => {
      if (stop) return
      raf = requestAnimationFrame(tick)
      const v = video.current
      if (!v || v.readyState < 2 || busy.current || now - t < 150) return
      t = now
      const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w) || 360
      canvas.width = w; canvas.height = h
      ctx.drawImage(v, 0, 0, w, h)
      const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
      if (!hit) return
      if (hit.data === lastQr.current.text && Date.now() - lastQr.current.at < 4000) return
      lastQr.current = { text: hit.data, at: Date.now() }
      submit(hit.data)
    }
    if (!navigator.mediaDevices?.getUserMedia) { setCamErr('Тук камерата не е достъпна (нужен е https).'); return }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false })
      .then((s) => {
        stream = s
        if (stop) return s.getTracks().forEach((x) => x.stop())
        video.current.srcObject = s
        video.current.play().catch(() => {})
        raf = requestAnimationFrame(tick)
      })
      .catch(() => setCamErr('Няма достъп до камерата. Разреши я в браузъра и презареди.'))
    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((x) => x.stop()) }
  }, [facing, submit])

  const testing = mode && mode.door === 'sim'
  const label = door.kind === 'open' ? (door.repeat ? 'Вече отворено' : 'Отключено')
    : door.kind === 'bad' ? 'Отказ' : 'Заключено'

  return (
    <div className="c-term">
      <header className="c-head">
        <div>
          <h1>{me.name}</h1>
          <p className="c-sub">
            <span className={`c-dot is-${online == null ? 'wait' : online ? 'on' : 'off'}`} />
            {online == null ? 'свързвам…' : online ? 'на линия' : 'няма връзка'} · {me.reader}
            {testing && ' · бравата е симулация'}
          </p>
        </div>
        <button className="c-ghost" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}>
          {facing === 'user' ? 'Задна камера' : 'Предна камера'}
        </button>
      </header>

      <div className={`c-cam is-${door.kind}`}>
        <video ref={video} muted playsInline className={facing === 'user' ? 'is-mirror' : ''} />
        <div className="c-frame" aria-hidden="true" />
      </div>

      <section className={`c-door is-${door.kind}`} role="status" aria-live="polite">
        <div className="c-lock">{label}</div>
        <p className="c-door-text">
          {door.kind === 'open' ? `Бравата се заключва след ${(left / 1000).toFixed(1)} с`
            : door.kind === 'bad' ? door.text
            : 'Покажи QR-а от blag-coaching.com/vrata/ пред камерата.'}
        </p>
        {door.kind === 'open' && <div className="c-bar"><span style={{ transform: `scaleX(${left / UNLOCK_MS})` }} /></div>}
      </section>

      {camErr && <p className="c-err">{camErr}</p>}

      <section className="c-card c-log">
        <h2 className="c-label">Последни прочитания</h2>
        {log.length === 0 ? <p className="c-note">Още няма.</p> : (
          <ul>
            {log.map((e, i) => (
              <li key={i} className={e.ok ? 'is-ok' : 'is-bad'}>
                <time>{hhmmss(e.at)}</time>
                <span className="c-qr">{e.qr ?? '—'}</span>
                <span>{e.text}</span>
              </li>
            ))}
          </ul>
        )}
        <details className="c-manual">
          <summary>QR на ръка (без камера)</summary>
          <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { submit(manual.trim()); setManual('') } }}>
            <input className="c-input" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="ZS1.…" />
            <button className="c-btn">Прати</button>
          </form>
        </details>
        <button className="c-link" onClick={onUnpair}>Отвържи този четец</button>
      </section>
    </div>
  )
}

export default function App() {
  const [me, setMe] = useState(load)
  return (
    <main className="c-page">
      {me ? <Terminal me={me} onUnpair={() => { keep(null); setMe(null) }} /> : <Pair onPaired={setMe} />}
    </main>
  )
}
