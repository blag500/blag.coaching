import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { addDays, ago, sofiaDay } from '../calc'
import Now from './Now.jsx'
import Plan from './Plan.jsx'
import Work from './Work.jsx'
import Audit from './Audit.jsx'
import Shop from './Shop.jsx'
import styles from './TabloApp.module.css'

/* Личното табло (/tablo/).
 *
 * Същият вход като приложението и /invest/: който е влязъл в Blag, е влязъл и
 * тук; вижда го само собственикът от tablo_owner. Пет раздела, всеки с
 * една работа:
 *   Сега   — какво правя сега: стъпката, чакащото теб, решенията, бизнесът.
 *   План   — седмицата и идеите.
 *   Одит   — отвореното и предложенията; поправеното е сгънато.
 *   Магазин — маржът на всеки продукт и промоциите (цените на едро са само тук).
 *   Работа — работата с Claude: токени, промени, сесии. За Claude, не за човека.
 *
 * Видът е собствен: src/plain.css и отгоре src/tablo/tablo.css — тъмно
 * винаги, плочки по образеца на Home Assistant (31.10), не темите на
 * приложението. Числата за работата идват от компютъра
 * (scripts/tablo-sync.mjs), бизнесът — от tablo_business(). */

const TABS = [
  { id: 'now', label: 'Сега', icon: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /> },
  { id: 'plan', label: 'План', icon: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /> },
  { id: 'audit', label: 'Одит', icon: <path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /> },
  { id: 'shop', label: 'Магазин', icon: <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 20h.01M17 20h.01" /> },
  { id: 'work', label: 'Работа', icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
]

function greeting(d) {
  const h = Number(d.toLocaleString('en-GB', { timeZone: 'Europe/Sofia', hour: '2-digit', hour12: false }))
  return h >= 4 && h < 11 ? 'Добро утро' : h >= 11 && h < 18 ? 'Добър ден' : 'Добър вечер'
}

function tabFromHash() {
  const h = window.location.hash.replace('#', '')
  return TABS.some((t) => t.id === h) ? h : 'now'
}

export default function TabloApp() {
  const [state, setState] = useState('loading') // loading | signedOut | denied | ready | error
  const [note, setNote] = useState('')
  const [items, setItems] = useState([])
  const [daily, setDaily] = useState([])
  const [sessions, setSessions] = useState([])
  const [business, setBusiness] = useState(null)
  const [sync, setSync] = useState([])
  const [shop, setShop] = useState({ products: [], supply: [], deals: [], orders: [] })
  const [tab, setTab] = useState(tabFromHash)
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 20000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function go(id) {
    setTab(id)
    history.replaceState(null, '', id === 'now' ? window.location.pathname : `#${id}`)
    window.scrollTo({ top: 0 })
  }

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase.from('tablo_items').select('*').order('sort')
    if (error) throw error
    setItems(data ?? [])
  }, [])

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setState('signedOut'); return }

    const { data: owner, error: ownerErr } = await supabase.rpc('is_tablo_owner')
    if (ownerErr) { setState('error'); setNote(ownerErr.message); return }
    if (!owner) { setState('denied'); return }

    try {
      const since = addDays(sofiaDay(), -55)
      const [d, s, b, y, sp, ss, sd, so] = await Promise.all([
        supabase.from('tablo_daily').select('day,key,value').gte('day', since).limit(5000),
        supabase.from('tablo_sessions').select('*').gte('started_at', `${addDays(sofiaDay(), -29)}T00:00:00Z`)
          .order('started_at', { ascending: false }).limit(200),
        supabase.rpc('tablo_business'),
        supabase.from('tablo_sync').select('*'),
        supabase.from('shop_products').select('id, name, size_label, category, price_cents').eq('active', true).order('sort'),
        supabase.from('shop_supply').select('product_id, supplier, cost_cents'),
        supabase.from('shop_deals').select('*'),
        supabase.from('shop_orders').select('subtotal_cents, items, paid_at, test_mode').limit(2000),
        loadItems(),
      ])
      for (const r of [d, s, b, y]) if (r.error) throw r.error
      // Магазинът не спира таблото, ако някоя от таблиците му не отговори.
      setShop({ products: sp.data ?? [], supply: ss.data ?? [], deals: sd.data ?? [], orders: so.data ?? [] })
      setDaily(d.data ?? [])
      setSessions(s.data ?? [])
      setBusiness(b.data ?? null)
      setSync(y.data ?? [])
      setState('ready')
    } catch (e) {
      setState('error'); setNote(e.message)
    }
  }, [loadItems])

  useEffect(() => { load() }, [load])

  /* Една промяна по ред: оптимистично на екрана, после в базата. Ако базата
     откаже, редовете се презареждат и казваме защо. */
  const saveItem = useCallback(async (id, patch) => {
    const stamp = new Date().toISOString()
    setItems((all) => all.map((it) => (it.id === id ? { ...it, ...patch, updated_at: stamp } : it)))
    const { error } = await supabase.from('tablo_items').update({ ...patch, updated_at: stamp }).eq('id', id)
    if (error) { setNote(`Не се записа: ${error.message}`); await loadItems() }
  }, [loadItems])

  const addItem = useCallback(async (row) => {
    const id = `${row.kind}-${Date.now().toString(36)}`
    const full = { id, by_claude: false, sort: 99, ...row }
    setItems((all) => [...all, { ...full, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
    const { error } = await supabase.from('tablo_items').insert(full)
    if (error) { setNote(`Не се записа: ${error.message}`); await loadItems() }
  }, [loadItems])

  if (state === 'loading') {
    return <main className={styles.page}><p className={styles.center}>Зарежда…</p></main>
  }
  if (state === 'signedOut') {
    return (
      <main className={styles.page}>
        <div className={styles.center}>
          <p>Таблото е зад входа на Blag.</p>
          <a className={styles.primary} href="/">Влез в приложението</a>
        </div>
      </main>
    )
  }
  if (state === 'denied') {
    return <main className={styles.page}><p className={styles.center}>Нямаш достъп до това табло.</p></main>
  }
  if (state === 'error') {
    return <main className={styles.page}><p className={styles.center}>Грешка: {note}</p></main>
  }

  const computer = sync.find((x) => x.source === 'computer')
  const current = TABS.find((t) => t.id === tab)
  const open = (k) => items.filter((i) => i.kind === k && !i.done).length
  const proposals = items.filter((i) => i.kind === 'finding' && i.state === 'proposal').length
  const waiting = open('you')

  // Броевете горе водят до своето: двата първи — до списъка в „Сега“.
  function jump(id) {
    if (tab !== 'now') go('now')
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  return (
    <>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.hello}>
            <p className={styles.greet}>{greeting(clock)}</p>
            <div className={styles.where}>
              <h1 className={styles.title}>{current.label}</h1>
              <span>{clock.toLocaleDateString('bg-BG', { timeZone: 'Europe/Sofia', weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
          </div>
          <time className={styles.clock} dateTime={clock.toISOString()}>
            {clock.toLocaleTimeString('bg-BG', { timeZone: 'Europe/Sofia', hour: '2-digit', minute: '2-digit' })}
          </time>
          <div className={styles.pills}>
            <button type="button" className={styles.pill} data-lv={waiting ? 'watch' : 'ok'} onClick={() => jump('youH')}>
              <i aria-hidden="true" />{waiting} {waiting === 1 ? 'нещо те чака' : 'неща те чакат'}
            </button>
            <button type="button" className={styles.pill} onClick={() => jump('decH')}>{open('decide')} за решаване</button>
            <button type="button" className={styles.pill} onClick={() => go('audit')}>{proposals} от одита</button>
            <span className={styles.pill} data-quiet title={computer?.note ?? ''}>Компютърът: {ago(computer?.synced_at)}</span>
          </div>
        </header>

        {note && <p className={styles.note} role="status">{note}</p>}

        {tab === 'now' && <Now items={items} daily={daily} business={business} onSave={saveItem} onGo={go} />}
        {tab === 'plan' && <Plan items={items} onSave={saveItem} onAdd={addItem} />}
        {tab === 'audit' && <Audit items={items} onSave={saveItem} />}
        {tab === 'shop' && <Shop {...shop} />}
        {tab === 'work' && <Work daily={daily} sessions={sessions} />}
      </main>

      <nav className={styles.bar} aria-label="Раздели">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={styles.barBtn} aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => go(t.id)}>
            <span className={styles.barIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}
