import { useEffect, useRef, useState } from 'react'

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

const read = () => { try { return localStorage.getItem(TOKEN) } catch { return null } }
const save = (t) => { try { t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN) } catch { /* */ } }

export default function App() {
  const [token, setToken] = useState(read)
  const [mode, setMode] = useState(null)
  const [step, setStep] = useState(token ? 'ready' : 'phone')
  const [phone, setPhone] = useState('')
  const [terms, setTerms] = useState(false)
  const [code, setCode] = useState('')
  const [testCode, setTestCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [opened, setOpened] = useState(false)
  const timer = useRef(0)

  useEffect(() => { call('status').then((d) => d.mode && setMode(d.mode)) }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

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
    save(d.token); setToken(d.token); setStep('ready')
  })

  const openDoor = () => run(async () => {
    const d = await call('open', { token })
    if (d.error) {
      if (/не е разпознат/.test(d.error)) { save(null); setToken(null); setStep('phone') }
      return setErr(d.error)
    }
    setOpened(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpened(false), 5000)
  })

  const forget = () => run(async () => {
    await call('forget', { token })
    save(null); setToken(null); setStep('phone'); setPhone(''); setTerms(false)
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
          <p className="v-note">Пращаме код веднъж. После този телефон отваря с един бутон.</p>
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
          <button className={`v-open${opened ? ' is-open' : ''}`} onClick={openDoor} disabled={busy}>
            {opened ? 'Отворено — влез' : busy ? 'Отварям…' : 'Отвори'}
          </button>
          <p className="v-note">
            {opened ? 'Бравата е отключена за 3 секунди.' : 'Застани до вратата и натисни. Отвътре вратата се отваря винаги.'}
          </p>
          <button className="v-link" onClick={forget} disabled={busy}>Забрави този телефон</button>
        </section>
      )}

      {err && <p className="v-err" role="alert">{err}</p>}
    </main>
  )
}
