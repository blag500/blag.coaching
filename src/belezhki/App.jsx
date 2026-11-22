import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Notes from './Notes.jsx'
import Floaters from './Floaters.jsx'
import styles from './App.module.css'

function greeting(d) {
  const h = d.getHours()
  return h >= 4 && h < 11 ? 'Добро утро' : h >= 11 && h < 18 ? 'Добър ден' : 'Добър вечер'
}

export default function App() {
  const [state, setState] = useState('loading') // loading | signedOut | denied | ready | error
  const [note, setNote] = useState('')
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 20000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setState('signedOut'); return }
      const { data: owner, error } = await supabase.rpc('is_tablo_owner')
      if (error) { setState('error'); setNote(error.message); return }
      setState(owner ? 'ready' : 'denied')
    })()
  }, [])

  if (state !== 'ready') {
    return (
      <main className={styles.page}>
        <div className={styles.center}>
          {state === 'loading' && <p>Зарежда…</p>}
          {state === 'signedOut' && (<><p>Бележките са зад входа на Blag.</p><a className={styles.primary} href="/?next=/belezhki/">Влез</a></>)}
          {state === 'denied' && <p>Нямаш достъп.</p>}
          {state === 'error' && <p>Грешка: {note}</p>}
        </div>
      </main>
    )
  }

  return (
    <>
    <Floaters />
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.greet}>{greeting(clock)}</p>
          <h1 className={styles.title}>Бележки</h1>
        </div>
        <div className={styles.side}>
          <span className={styles.date}>
            {clock.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          {/* Иконката на началния екран няма „презареди“ — ето го. */}
          <button type="button" className={styles.refresh} aria-label="Опресни" onClick={() => location.reload()}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
            </svg>
          </button>
        </div>
      </header>
      <Notes />
    </main>
    </>
  )
}
