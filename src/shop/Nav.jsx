import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CATEGORIES, GOALS, Icon } from './ui'
import { Wordmark } from './Brand.jsx'
import { NavBar } from '../components/BottomNav/BottomNav.jsx'
import styles from './Nav.module.css'

/* Долната лента на телефона — самата лента на приложението (NavBar), само в
 * гамата на магазина. Свива се в кръгче при четене надолу (useHideOnScroll в
 * ShopApp); на широк екран я няма, там е колоната отляво. */
const icon = (name) => function TabIcon() { return <Icon name={name} size={18} stroke={2} /> }
const HomeIcon = icon('home')
const GridIcon = icon('grid')
const MenuIcon = icon('menu')

export function TabBar({ active, count, onMenu }) {
  // Броят е върху знака на количката — лентата показва дума само под отворения раздел.
  const CartIcon = useMemo(() => function CartIcon() {
    return <span className={styles.cartIcon}><Icon name="cart" size={18} stroke={2} />{count > 0 && <b key={count}>{count}</b>}</span>
  }, [count])
  const tabs = [
    { id: 'home', label: 'Начало', Icon: HomeIcon, href: '#/' },
    { id: 'catalog', label: 'Продукти', Icon: GridIcon, href: '#/c/all' },
    { id: 'cart', label: 'Количка', Icon: CartIcon, href: '#/cart' },
    { id: 'menu', label: 'Меню', Icon: MenuIcon },
  ]
  const go = (id) => {
    if (id === 'menu') { onMenu(); return }
    window.location.hash = tabs.find((t) => t.id === id).href
  }
  return (
    <div className={styles.tabBar}>
      <NavBar tabs={tabs} activeTab={active} onTabChange={go} labels={{ nav: 'Магазин', show: 'Покажи менюто' }} />
    </div>
  )
}

/* Страничната навигация: панел отляво на всеки екран (☰ в хедъра) и
 * постоянна колона на широк екран в страниците с продукти. Един списък —
 * промоциите, видовете с броя, целите, всичко — на две места. */

export function useCategories(products) {
  return useMemo(() => CATEGORIES.map((c) => {
    const list = products.filter((p) => p.category === c.id)
    return { ...c, n: new Set(list.map((p) => p.size_group || p.id)).size, img: list[0]?.image }
  }).filter((c) => c.n > 0), [products])
}

function Links({ products, deals, current, onGo }) {
  const cats = useCategories(products)
  const live = deals.filter((d) => new Date(d.ends_at) > new Date()).length
  const all = new Set(products.map((p) => p.size_group || p.id)).size
  const is = (h) => (current === h ? 'page' : undefined)
  return (
    <nav aria-label="Магазин" className={styles.links}>
      <a href="#/" onClick={onGo} aria-current={is('#/')} className={styles.row}><Icon name="home" size={20} />Начало</a>
      {live > 0 && (
        <a href="#/" onClick={onGo} className={`${styles.row} ${styles.deal}`}><Icon name="clock" size={20} />Промоции на седмицата<span>{live}</span></a>
      )}
      <a href="#/c/all" onClick={onGo} aria-current={is('#/c/all')} className={styles.row}><Icon name="grid" size={20} />Всички продукти<span>{all}</span></a>

      <p className={styles.group}>Видове</p>
      {cats.map((c) => (
        <a key={c.id} href={`#/c/${c.id}`} onClick={onGo} aria-current={is(`#/c/${c.id}`)} className={`${styles.row} ${styles.cat}`}>
          <i>{c.img && <img src={c.img} alt="" width="40" height="40" loading="lazy" />}</i>{c.label}<span>{c.n}</span>
        </a>
      ))}

      <p className={styles.group}>По цел</p>
      {GOALS.map((g) => (
        <a key={g.id} href={`#/c/all?goal=${g.id}`} onClick={onGo} className={styles.row}><Icon name={g.id} size={20} />{g.label}</a>
      ))}

      <p className={styles.group}>Поръчка</p>
      <a href="#/cart" onClick={onGo} aria-current={is('#/cart')} className={styles.row}><Icon name="cart" size={20} />Количка</a>
      <p className={styles.small}>До 15:00 в делник тръгва същия ден. Еконт, Спиди или до вратата в София.</p>
    </nav>
  )
}

/** Панелът отляво. Escape, фонът и всяка връзка го затварят; фокусът влиза вътре. */
export function NavDrawer({ open, onClose, products, deals, current }) {
  const panel = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector('a, button')?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className={styles.wrap}>
      <button type="button" className={styles.scrim} aria-label="Затвори менюто" onClick={onClose} />
      <aside ref={panel} className={styles.drawer} role="dialog" aria-modal="true" aria-label="Меню">
        <header className={styles.head}>
          <Wordmark size={18} />
          <button type="button" className={styles.close} onClick={onClose} aria-label="Затвори менюто">✕</button>
        </header>
        <Links products={products} deals={deals} current={current} onGo={onClose} />
      </aside>
    </div>,
    document.body,
  )
}

/** Постоянната колона на широк екран (страниците с продукти). */
export function NavRail({ products, deals, current }) {
  return (
    <aside className={styles.rail}>
      <Links products={products} deals={deals} current={current} />
    </aside>
  )
}
