import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { addLine, euro, lineKey, readCart, setQty, writeCart } from './cart'
import Catalog from './Catalog.jsx'
import Home from './Home.jsx'
import Product from './Product.jsx'
import { Cart, Checkout, Thanks } from './Checkout.jsx'
import { Mark, Splash, Wordmark } from './Brand.jsx'
import { NavDrawer, NavRail } from './Nav.jsx'
import { Icon } from './ui'
import styles from './Shop.module.css'

/* Онлайн магазинът здраве&сила (/shop/).
 *
 * Без акаунт. Пет екрана по адреса след #: каталогът (#/?филтри), продуктът
 * (#/p/<id>), количката (#/cart), касата (#/checkout) и благодарността
 * (#/thanks/<поръчка>/<сесия>). Каталогът и доставката се четат направо от
 * базата; цената на поръчката я смята функцията shop-checkout, не браузърът.
 * Видът е гамата на марката (shop.css върху src/plain.css); защо е подредено
 * така — бележките „Магазин — проучване на UX“ и „Магазин — вид“ в трезора. */

function parseRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path, query = ''] = raw.split('?')
  const parts = path.split('/').filter(Boolean)
  return { page: parts[0] || 'catalog', args: parts.slice(1).map(decodeURIComponent), query }
}

export default function ShopApp() {
  const [route, setRoute] = useState(parseRoute)
  const [products, setProducts] = useState(null)
  const [delivery, setDelivery] = useState([])
  const [deals, setDeals] = useState([])
  const [error, setError] = useState('')
  const [cart, setCart] = useState(readCart)
  const [toast, setToast] = useState(null)
  const [bump, setBump] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const closeNav = useCallback(() => setNavOpen(false), [])
  const toastTimer = useRef(0)

  useEffect(() => {
    const on = () => {
      const next = parseRoute()
      setNavOpen(false)
      setRoute((prev) => {
        if (next.page !== 'catalog' || prev.page !== 'catalog') window.scrollTo({ top: 0 })
        return next
      })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    (async () => {
      const now = new Date().toISOString()
      const [p, d, x] = await Promise.all([
        supabase.from('shop_products').select('*').eq('active', true).order('sort'),
        supabase.from('shop_delivery').select('*').eq('active', true).order('sort'),
        supabase.from('shop_deals').select('*').lte('starts_at', now).gt('ends_at', now).order('sort'),
      ])
      if (p.error || d.error) { setError('Каталогът не се зареди. Опитай пак след малко.'); return }
      // Промоцията сменя цената навсякъде — карта, продукт, количка; касата я
      // смята пак от базата. was_cents е цената преди нея.
      const live = new Map((x.data ?? []).map((r) => [r.product_id, r]))
      setDeals(x.data ?? [])
      setProducts((p.data ?? []).map((r) => (live.has(r.id)
        ? { ...r, was_cents: live.get(r.id).was_cents, price_cents: live.get(r.id).deal_price_cents, deal_ends: live.get(r.id).ends_at }
        : r)))
      setDelivery(d.data ?? [])
    })()
  }, [])

  const update = useCallback((next) => { setCart(next); writeCart(next) }, [])
  const clear = useCallback(() => update([]), [update])
  const add = useCallback((id, flavor, qty = 1) => {
    update(addLine(readCart(), id, flavor, qty))
    setToast(qty > 1 ? `Добавени ${qty} бр.` : 'Добавено в количката')
    setBump((n) => n + 1)
    try { navigator.vibrate?.(12) } catch { /* няма вибрация */ }
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [update])

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products])
  const lines = cart.map((r) => ({ ...r, key: lineKey(r), product: byId.get(r.id) })).filter((l) => l.product)
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const subtotal = lines.reduce((s, l) => s + l.qty * l.product.price_cents, 0)

  let body
  if (error) body = <p className={styles.empty}>{error}</p>
  else if (!products) body = <Skeleton />
  else if (route.page === 'p') body = <Product key={route.args[0]} product={byId.get(route.args[0])} products={products} delivery={delivery} onAdd={add} />
  else if (route.page === 'cart') body = <Cart lines={lines} subtotal={subtotal} delivery={delivery} onQty={(k, q) => update(setQty(cart, k, q))} />
  else if (route.page === 'checkout') body = <Checkout lines={lines} subtotal={subtotal} delivery={delivery} onPaid={clear} />
  else if (route.page === 'thanks') body = <Thanks order={route.args[0]} session={route.args[1]} onDone={clear} />
  else if (route.page === 'c') {
    body = (
      <div className={styles.withRail}>
        <NavRail products={products} deals={deals} current={`#/c/${route.args[0] || 'all'}`} />
        <div><Catalog key={`c-${route.args[0] || 'all'}`} products={products} cat={route.args[0] || 'all'} query={route.query} onAdd={add} /></div>
      </div>
    )
  }
  else body = <Home products={products} deals={deals} onAdd={add} />

  const onCatalog = (route.page === 'catalog' || route.page === 'c') && products && !error

  return (
    <>
      <Splash />
      <div className={styles.testBar} role="note">Тестов режим — плащането е пробно</div>
      <header className={`${styles.top} ${scrolled ? styles.scrolled : ''} ${route.page === 'c' ? styles.wide : ''}`}>
        <div className={styles.topIn}>
          <button type="button" className={styles.menuBtn} onClick={() => setNavOpen(true)} aria-label="Меню" aria-expanded={navOpen}>
            <Icon name="menu" size={22} stroke={2} />
          </button>
          <a href="#/" className={styles.brand} aria-label="здраве и сила — към началото">
            <Wordmark size={19} className={bump ? 'zs-beat' : ''} key={bump} />
          </a>
          <a href="#/cart" className={`${styles.cartBtn} ${count ? styles.cartFull : ''}`} aria-label={`Количка, ${count} продукта`}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" />
            </svg>
            {count > 0 ? <><span aria-hidden="true">{toast ? 'Добавено' : euro(subtotal)}</span><span key={count} className={styles.badge}>{count}</span></> : <span>Количка</span>}
          </a>
        </div>
      </header>
      <main className={`${styles.page} ${route.page === 'c' ? styles.wide : ''}`}>{body}</main>
      <NavDrawer open={navOpen} onClose={closeNav} products={products ?? []} deals={deals}
        current={route.page === 'c' ? `#/c/${route.args[0] || 'all'}` : route.page === 'cart' ? '#/cart' : route.page === 'catalog' ? '#/' : ''} />
      <p role="status" className={styles.srOnly}>{toast || ''}</p>
      <footer className={styles.foot}>
        <div className={styles.footMark}><Mark size={34} /><Wordmark size={16} /></div>
        <p>Благ Холдинг ЕООД · ЕИК 208845685 · София</p>
        <p>Подбрано от Николай Благьов — треньор и натурален културист.</p>
      </footer>
      {onCatalog && count > 0 && (
        <a href="#/cart" key={`bar${bump}`} className={`${styles.cartBar} ${bump ? styles.cartBarBump : ''}`}>
          <span aria-hidden="true">{toast || `${count} ${count === 1 ? 'продукт' : 'продукта'}`}<b>{euro(subtotal)}</b></span>
          <i>Количка →</i>
        </a>
      )}
    </>
  )
}

/** Сиви карти, докато каталогът се зарежда — страницата не подскача. */
function Skeleton() {
  return (
    <ul className={styles.grid} aria-hidden="true" style={{ marginTop: 24 }}>
      {Array.from({ length: 6 }, (_, i) => <li key={i} className={`${styles.card} ${styles.skel}`} />)}
    </ul>
  )
}
