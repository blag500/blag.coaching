import { useEffect, useState } from 'react'
import { payload, qrPath, windowNow, WINDOW_MS } from './qr.js'

const URL_ = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zs-access`
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const TOKEN = 'zs_door_token'

async function call(action, body = {}) {
  try {
    const r = await fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ action, ...body }),
    })
    const data = await r.json().catch(() => ({}))
    return r.ok ? data : { error: data.error || 'Нещо се обърка. Опитай пак.', mode: data.mode }
  } catch {
    return { error: 'Няма връзка. Провери интернета.' }
  }
}

const QRID = 'zs_qr_id'
const get = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const put = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k) } catch { /* */ } }
const read = () => get(TOKEN)
const save = (t, q) => { put(TOKEN, t); put(QRID, t ? q : null) }

/** Личният QR — сменя се с всеки 30-секунден прозорец; лентата отдолу показва колко остава. */
function MyQr({ token, qrId }) {
  const [qr, setQr] = useState(null)
  const [left, setLeft] = useState(1)
  useEffect(() => {
    let w = -1, alive = true
    const tick = async () => {
      const now = windowNow()
      setLeft(1 - (Date.now() % WINDOW_MS) / WINDOW_MS)
      if (now === w) return
      w = now
      const text = await payload(token, qrId, now)
      if (alive) setQr(qrPath(text))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => { alive = false; clearInterval(id) }
  }, [token, qrId])
  return (
    <div className="v-qr">
      {qr ? (
        <svg viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label="QR за вратата" shapeRendering="crispEdges">
          <rect width={qr.size} height={qr.size} fill="#fff" />
          <path d={qr.d} fill="#000" />
        </svg>
      ) : <div className="v-qr-empty" />}
      <div className="v-qr-bar"><span style={{ transform: `scaleX(${left})` }} /></div>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(read)
  const [qrId, setQrId] = useState(() => get(QRID))
  const [mode, setMode] = useState(null)
  const [step, setStep] = useState(token ? 'ready' : 'phone')
  const [phone, setPhone] = useState('')
  const [terms, setTerms] = useState(false)
  const [code, setCode] = useState('')
  const [testCode, setTestCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { call('status').then((d) => d.mode && setMode(d.mode)) }, [])
  // Още ли е разпознат този телефон? (нова регистрация от друг телефон го гаси)
  useEffect(() => {
    if (!token) return
    call('me', { token }).then((d) => {
      if (d.qr_id) { setQrId(d.qr_id); put(QRID, d.qr_id) }
      else if (d.error && /не е разпознат|спрян/.test(d.error)) { save(null); setToken(null); setStep('phone'); setErr(d.error) }
    })
  }, [token])

  const run = async (fn) => { setBusy(true); setErr(''); try { await fn() } finally { setBusy(false) } }

  const sendCode = () => run(async () => {
    const d = await call('start', { phone, terms })
    if (d.mode) setMode(d.mode)
    if (d.error) return setErr(d.error)
    setPhone(d.phone); setTestCode(d.test_code || ''); setCode(''); setStep('code')
  })

  const checkCode = () => run(async () => {
    const d = await call('verify', { phone, code })
    if (d.error) return setErr(d.error)
    save(d.token, d.qr_id); setToken(d.token); setQrId(d.qr_id); setStep('ready')
  })

  const forget = () => run(async () => {
    await call('forget', { token })
    save(null); setToken(null); setQrId(null); setStep('phone'); setPhone(''); setTerms(false)
  })

  const testing = mode && (mode.sms === 'test' || mode.door === 'sim')

  return (
    <main className="v-page">
      {testing && (
        <p className="v-test">
          Тестов режим: {mode.sms === 'test' ? 'кодът се показва тук, не идва SMS' : 'SMS-ите са истински'} ·{' '}
          {mode.door === 'sim' ? 'вратата е симулация' : 'вратата е истинска'}
        </p>
      )}

      <header className="v-head">
        <h1>Вратата</h1>
        <p className="v-sub">Здраве и Сила · Брадистилов 10 · денонощно</p>
      </header>

      {step === 'phone' && (
        <form className="v-card" onSubmit={(e) => { e.preventDefault(); sendCode() }}>
          <label className="v-label" htmlFor="ph">Телефон</label>
          <input
            id="ph" className="v-input" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="0888 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} required
          />
          <p className="v-note">Пращаме код веднъж. После този телефон показва твоя QR за вратата.</p>
          <label className="v-check">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>Приемам правилата на магазина и записа от камерите при влизане.</span>
          </label>
          <button className="v-btn" disabled={busy || !terms || !phone}>{busy ? 'Пращам…' : 'Прати код'}</button>
        </form>
      )}

      {step === 'code' && (
        <form className="v-card" onSubmit={(e) => { e.preventDefault(); checkCode() }}>
          <label className="v-label" htmlFor="cd">Кодът от SMS-а</label>
          {testCode && <p className="v-testcode">Тестов код: <b>{testCode}</b></p>}
          <input
            id="cd" className="v-input v-code" inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} placeholder="••••••" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus required
          />
          <p className="v-note">Пратен на {phone}. Важи 10 минути.</p>
          <button className="v-btn" disabled={busy || code.length !== 6}>{busy ? 'Проверявам…' : 'Потвърди'}</button>
          <button type="button" className="v-link" onClick={() => { setStep('phone'); setErr('') }}>Друг номер</button>
        </form>
      )}

      {step === 'ready' && (
        <section className="v-card v-ready">
          {qrId ? <MyQr token={token} qrId={qrId} /> : <div className="v-qr"><div className="v-qr-empty" /></div>}
          <p className="v-note">Покажи го на четеца до вратата. Сменя се на 30 секунди, затова снимка на екрана не отваря.</p>
          {qrId && <p className="v-qrid">Номер {qrId}</p>}
          <button className="v-link" onClick={forget} disabled={busy}>Забрави този телефон</button>
          {testing && <a className="v-link" href="/chetec/">Тестов четец (на втори телефон или лаптоп)</a>}
        </section>
      )}

      {err && <p className="v-err" role="alert">{err}</p>}
    </main>
  )
}
