import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { addLine, lineKey, readCart, setQty, writeCart } from './cart'
import Catalog from './Catalog.jsx'
import Product from './Product.jsx'
import { Cart, Checkout, Thanks } from './Checkout.jsx'
import styles from './Shop.module.css'

/* Онлайн магазинът „Здраве и Сила“ (/shop/).
 *
 * Без акаунт. Пет екрана по адреса след #: каталогът (#/?филтри), продуктът
 * (#/p/<id>), количката (#/cart), касата (#/checkout) и благодарността
 * (#/thanks/<поръчка>/<сесия>). Каталогът и доставката се четат направо от
 * базата; цената на поръчката я смята функцията shop-checkout, не браузърът.
 * Видът е простата система (src/plain.css); какво и защо е подредено така —
 * бележката „Магазин — проучване на UX“ в трезора (21.10.2026). */

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
  const [error, setError] = useState('')
  const [cart, setCart] = useState(readCart)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(0)

  useEffect(() => {
    const on = () => {
      const next = parseRoute()
      setRoute((prev) => {
        if (next.page !== 'catalog' || prev.page !== 'catalog') window.scrollTo({ top: 0 })
        return next
      })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    (async () => {
      const [p, d] = await Promise.all([
        supabase.from('shop_products').select('*').eq('active', true).order('sort'),
        supabase.from('shop_delivery').select('*').eq('active', true).order('sort'),
      ])
      if (p.error || d.error) { setError('Каталогът не се зареди. Опитай пак след малко.'); return }
      setProducts(p.data ?? [])
      setDelivery(d.data ?? [])
    })()
  }, [])

  const update = useCallback((next) => { setCart(next); writeCart(next) }, [])
  const clear = useCallback(() => update([]), [update])
  const add = useCallback((id, flavor, qty = 1) => {
    update(addLine(readCart(), id, flavor, qty))
    setToast(qty > 1 ? `Добавени ${qty} бр.` : 'Добавено в количката')
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [update])

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products])
  const lines = cart.map((r) => ({ ...r, key: lineKey(r), product: byId.get(r.id) })).filter((l) => l.product)
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const subtotal = lines.reduce((s, l) => s + l.qty * l.product.price_cents, 0)

  let body
  if (error) body = <p className={styles.empty}>{error}</p>
  else if (!products) body = <Skeleton />
  else if (route.page === 'p') body = <Product product={byId.get(route.args[0])} products={products} delivery={delivery} onAdd={add} />
  else if (route.page === 'cart') body = <Cart lines={lines} subtotal={subtotal} delivery={delivery} onQty={(k, q) => update(setQty(cart, k, q))} />
  else if (route.page === 'checkout') body = <Checkout lines={lines} subtotal={subtotal} delivery={delivery} onPaid={clear} />
  else if (route.page === 'thanks') body = <Thanks order={route.args[0]} session={route.args[1]} onDone={clear} />
  else body = <Catalog key="catalog" products={products} query={route.query} onAdd={add} />

  return (
    <>
      <div className={styles.testBar} role="note">Тестов режим — плащането е пробно, не се теглят пари.</div>
      <header className={styles.top}>
        <a href="#/" className={styles.brand} aria-label="Здраве и Сила — към каталога">
          <span className={styles.mark} aria-hidden="true">ЗС</span>
          <span>Здраве и Сила</span>
        </a>
        <a href="#/cart" className={styles.cartBtn} aria-label={`Количка, ${count} продукта`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" />
          </svg>
          {count > 0 && <span key={count} className={styles.badge}>{count}</span>}
        </a>
      </header>
      <main className={styles.page}>{body}</main>
      <footer className={styles.foot}>
        <p>Благ Холдинг ЕООД · ЕИК 208845685 · София</p>
        <p>Подбрано от Николай Благьов — треньор и натурален културист.</p>
      </footer>
      {toast && (
        <div className={styles.toast} role="status">
          <span>{toast}</span>
          {route.page !== 'cart' && <a href="#/cart" onClick={() => setToast(null)}>Виж количката</a>}
        </div>
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
