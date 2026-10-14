import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { NavBar } from '../../components/BottomNav/BottomNav.jsx'
import Pictogram from '../../components/Pictogram/Pictogram.jsx'
import { useHideOnScroll } from '../../hooks/useHideOnScroll'
import { addDays, ago, sofiaDay } from '../calc'
import Overview from './Overview.jsx'
import Plan from './Plan.jsx'
import Work from './Work.jsx'
import Audit from './Audit.jsx'
import styles from './TabloApp.module.css'

/* Личното табло (/tablo/).
 *
 * Същият вход като приложението и /invest/: който е влязъл в Blag, е влязъл и
 * тук; вижда го само собственикът от tablo_owner. Четири раздела:
 *   Табло  — светлините, плочките, графиките: как върви изобщо.
 *   План   — стъпката, седмицата, идеите, чакащото. Тук се пише и отмята.
 *   Работа — сесиите с Claude и промените по кода, подробно.
 *   Одит   — какво е намерено по проектите: поправено, отворено, предложено.
 *
 * Числата за работата идват от компютъра (scripts/tablo-sync.mjs), бизнесът —
 * от tablo_business(); нищо от тях не се смята в браузъра от сурови редове. */

const TABS = [
  { id: 'board', label: 'Табло', Icon: () => <Pictogram name="dashboard" size={18} /> },
  { id: 'plan',  label: 'План',  Icon: () => <Pictogram name="target" size={18} /> },
  { id: 'work',  label: 'Работа', Icon: () => <Pictogram name="trend" size={18} /> },
  { id: 'audit', label: 'Одит',  Icon: () => <Pictogram name="check" size={18} /> },
]
const TITLES = { plan: 'План', work: 'Работа', audit: 'Одит' }

function tabFromHash() {
  const h = window.location.hash.replace('#', '')
  return TABS.some((t) => t.id === h) ? h : 'board'
}

function greeting(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Sofia', hour: 'numeric', hour12: false }).format(now))
  if (h < 5) return 'Лека нощ'
  if (h < 11) return 'Добро утро'
  if (h < 18) return 'Добър ден'
  return 'Добър вечер'
}

export default function TabloApp() {
  const [state, setState] = useState('loading') // loading | signedOut | denied | ready | error
  const [note, setNote] = useState('')
  const [items, setItems] = useState([])
  const [daily, setDaily] = useState([])
  const [sessions, setSessions] = useState([])
  const [business, setBusiness] = useState(null)
  const [sync, setSync] = useState([])
  const [tab, setTab] = useState(tabFromHash)

  useHideOnScroll(true)

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function go(id) {
    setTab(id)
    history.replaceState(null, '', id === 'board' ? window.location.pathname : `#${id}`)
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
      const [d, s, b, y] = await Promise.all([
        supabase.from('tablo_daily').select('day,key,value').gte('day', since).limit(5000),
        supabase.from('tablo_sessions').select('*').gte('started_at', `${addDays(sofiaDay(), -29)}T00:00:00Z`)
          .order('started_at', { ascending: false }).limit(200),
        supabase.rpc('tablo_business'),
        supabase.from('tablo_sync').select('*'),
        loadItems(),
      ])
      for (const r of [d, s, b, y]) if (r.error) throw r.error
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
          <a className={styles.button} href="/">Влез в приложението</a>
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

  const now = new Date()
  const computer = sync.find((x) => x.source === 'computer')

  return (
    <main className={styles.page}>
      <div className={styles.statusBar} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.hello}>
          <span className={styles.date}>
            {now.toLocaleDateString('bg-BG', { timeZone: 'Europe/Sofia', weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className={styles.title}>{TITLES[tab] ?? greeting(now)}</h1>
        </div>
        <span className={styles.synced} title={computer?.note ?? ''}>
          Компютърът: {ago(computer?.synced_at)}
        </span>
      </header>

      {note && <p className={styles.note} role="status">{note}</p>}

      {tab === 'board' && <Overview items={items} daily={daily} sessions={sessions} business={business} onGo={go} />}
      {tab === 'plan' && <Plan items={items} onSave={saveItem} onAdd={addItem} />}
      {tab === 'work' && <Work daily={daily} sessions={sessions} />}
      {tab === 'audit' && <Audit items={items} onSave={saveItem} />}

      <NavBar
        tabs={TABS}
        activeTab={tab}
        onTabChange={go}
        labels={{ nav: 'Раздели', show: 'Покажи разделите' }}
      />
    </main>
  )
}
