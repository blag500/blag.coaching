import { useEffect, useMemo, useState } from 'react'
import { euro } from './cart'
import { CATEGORIES, GOALS, Icon, unitPrice } from './ui'
import { Mark } from './Brand.jsx'
import styles from './Shop.module.css'

/* Началото. Най-горе — промоциите на седмицата с таймер (shop_deals, 140):
 * таймерът брои до истинския край, един за всички, и не се нулира; старата
 * цена е цената преди намалението. Отдолу — видовете, всеки със своя
 * страница (#/c/<вид>), и търсенето, което води във „Всички продукти“. */

function left(ms) {
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

function Countdown({ ends }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const l = left(new Date(ends).getTime() - now)
  if (!l) return <span className={styles.clock}>свърши</span>
  const pad = (n) => String(n).padStart(2, '0')
  const end = new Date(ends).toLocaleString('bg-BG', { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sofia' })
  return (
    <span className={styles.clock} role="timer" aria-label={`Свършва ${end}`}>
      {l.d > 0 && <span>{l.d} {l.d === 1 ? 'ден' : 'дни'}</span>}
      <b>{pad(l.h)}:{pad(l.m)}:{pad(l.s)}</b>
    </span>
  )
}

export default function Home({ products, deals, onAdd }) {
  const [q, setQ] = useState('')
  const live = deals.filter((d) => new Date(d.ends_at) > new Date())
  const dealProducts = live.map((d) => products.find((p) => p.id === d.product_id)).filter(Boolean)
  const ends = live.reduce((a, d) => (!a || d.ends_at < a ? d.ends_at : a), null)

  const cats = useMemo(() => CATEGORIES.map((c) => {
    const list = products.filter((p) => p.category === c.id)
    return { ...c, n: new Set(list.map((p) => p.size_group || p.id)).size, img: list[0]?.image }
  }).filter((c) => c.n > 0), [products])

  const search = (e) => {
    e.preventDefault()
    window.location.hash = `#/c/all${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`
  }

  return (
    <>
      {dealProducts.length > 0 && (
        <section className={styles.deals} aria-labelledby="deals-h">
          <header className={styles.dealsHead}>
            <h1 id="deals-h" className={styles.dealsTitle}>Промоции на седмицата</h1>
            <p className={styles.dealsMeta}>до края <Countdown ends={ends} /></p>
          </header>
          <ul className={styles.dealRow}>
            {dealProducts.map((p) => {
              const off = Math.round((1 - p.price_cents / p.was_cents) * 100)
              const need = p.flavors.length > 1
              return (
                <li key={p.id} className={styles.deal}>
                  <a href={`#/p/${p.id}`} className={styles.dealLink}>
                    <span className={styles.dealStage}>
                      <img src={p.image} alt="" width="300" height="300" />
                      <span className={styles.off}>−{off} %</span>
                    </span>
                    <span className={styles.dealName}>{p.name}</span>
                    <span className={styles.cardSize}>{p.size_label}</span>
                    <span className={styles.dealPrice}>
                      <b>{euro(p.price_cents)}</b><s>{euro(p.was_cents)}</s>
                    </span>
                    {unitPrice(p) && <span className={styles.unit}>{unitPrice(p)}</span>}
                  </a>
                  <button type="button" className={styles.dealAdd}
                    onClick={() => (need ? (window.location.hash = `#/p/${p.id}`) : onAdd(p.id, p.flavors[0] ?? null))}
                    aria-label={`Добави ${p.name} в количката`}>
                    <Icon name="plus" size={18} stroke={2.4} />{need ? 'Избери вкус' : 'Добави'}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className={styles.dealsNote}>Старата цена е цената преди промоцията. Промоционалната важи и в касата до края на таймера.</p>
        </section>
      )}

      <section className={styles.home}>
        <h2 className={styles.display}>Добавки <Mark size={0} className={styles.amp} /><span className={styles.srOnly}>и</span> храна.</h2>

        <form className={styles.search} onSubmit={search} role="search">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Креатин, грис, ванилия…" aria-label="Търси в магазина" enterKeyHint="search" />
        </form>

        <ul className={styles.cats}>
          {cats.map((c) => (
            <li key={c.id}>
              <a href={`#/c/${c.id}`} className={styles.cat}>
                <span className={styles.catImg}>{c.img && <img src={c.img} alt="" loading="lazy" width="300" height="300" />}</span>
                <b>{c.label}</b><small>{c.n}</small>
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.goals} role="group" aria-label="По цел">
          {GOALS.map((g) => (
            <a key={g.id} href={`#/c/all?goal=${g.id}`} className={styles.goal}><Icon name={g.id} size={18} />{g.label}</a>
          ))}
        </div>

        <a href="#/c/all" className={styles.allLink}>Всички {new Set(products.map((p) => p.size_group || p.id)).size} продукта →</a>
      </section>
    </>
  )
}
