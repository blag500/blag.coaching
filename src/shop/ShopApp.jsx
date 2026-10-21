import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { addLine, euro, lineKey, readCart, setQty, writeCart } from './cart'
import styles from './Shop.module.css'

/* Онлайн магазинът „Здраве и Сила“ (/shop/).
 *
 * Без акаунт. Пет екрана по адреса след #: каталогът (#/), продуктът
 * (#/p/<id>), количката (#/cart), касата (#/checkout) и благодарността
 * (#/thanks/<поръчка>/<сесия>). Каталогът и доставката се четат направо от
 * базата; цената на поръчката я смята функцията shop-checkout, не браузърът.
 * Видът е простата система (src/plain.css), не темите на приложението. */

export const CATEGORIES = [
  { id: 'all', label: 'Всичко' },
  { id: 'protein', label: 'Протеин' },
  { id: 'creatine', label: 'Креатин' },
  { id: 'amino', label: 'Аминокиселини' },
  { id: 'preworkout', label: 'Преди тренировка' },
  { id: 'vitamins', label: 'Витамини' },
  { id: 'electrolytes', label: 'Електролити' },
  { id: 'snacks', label: 'Снаксове' },
]

function parseRoute() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  return { page: parts[0] || 'catalog', args: parts.slice(1).map(decodeURIComponent) }
}

export const go = (path) => { window.location.hash = path }

export default function ShopApp() {
  const [route, setRoute] = useState(parseRoute)
  const [products, setProducts] = useState(null)
  const [delivery, setDelivery] = useState([])
  const [error, setError] = useState('')
  const [cart, setCart] = useState(readCart)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const on = () => { setRoute(parseRoute()); window.scrollTo({ top: 0 }) }
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
    setToast('Добавено в количката')
    window.clearTimeout(add.t)
    add.t = window.setTimeout(() => setToast(''), 1800)
  }, [update])

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products])
  const lines = cart.map((r) => ({ ...r, key: lineKey(r), product: byId.get(r.id) })).filter((l) => l.product)
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const subtotal = lines.reduce((s, l) => s + l.qty * l.product.price_cents, 0)

  let body
  if (error) body = <p className={styles.empty}>{error}</p>
  else if (!products) body = <p className={styles.empty}>Зарежда…</p>
  else if (route.page === 'p') body = <Product product={byId.get(route.args[0])} onAdd={add} />
  else if (route.page === 'cart') body = <Cart lines={lines} subtotal={subtotal} onQty={(k, q) => update(setQty(cart, k, q))} />
  else if (route.page === 'checkout') body = <Checkout lines={lines} subtotal={subtotal} delivery={delivery} onPaid={clear} />
  else if (route.page === 'thanks') body = <Thanks order={route.args[0]} session={route.args[1]} onDone={clear} />
  else body = <Catalog products={products} category={route.page === 'c' ? route.args[0] : 'all'} onAdd={add} />

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
          {count > 0 && <span className={styles.badge}>{count}</span>}
        </a>
      </header>
      <main className={styles.page}>{body}</main>
      <footer className={styles.foot}>
        <p>Благ Холдинг ЕООД · ЕИК 208845685 · София</p>
        <p>Подбрано от Николай Благьов — треньор и натурален културист.</p>
      </footer>
      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </>
  )
}

/* ── Каталогът ─────────────────────────────────────────────────────────────── */

function Catalog({ products, category, onAdd }) {
  const shown = category === 'all' ? products : products.filter((p) => p.category === category)
  return (
    <>
      <section className={styles.hero}>
        <h1 className={styles.h1}>Добавки и протеинови снаксове</h1>
        <p className={styles.lead}>Тесен избор вместо хиляди продукти: протеин, креатин, витамини и снаксове, подбрани от треньор. Доставка с Еконт, Спиди или до вратата в София.</p>
      </section>
      <nav className={styles.chips} aria-label="Категории">
        {CATEGORIES.map((c) => (
          <a key={c.id} href={c.id === 'all' ? '#/' : `#/c/${c.id}`} className={styles.chip}
            aria-current={category === c.id ? 'page' : undefined}>{c.label}</a>
        ))}
      </nav>
      <ul className={styles.grid}>
        {shown.map((p) => (
          <li key={p.id} className={styles.card}>
            <a href={`#/p/${p.id}`} className={styles.cardLink}>
              <img src={p.image} alt="" loading="lazy" width="300" height="300" />
              <span className={styles.cardName}>{p.name}</span>
              <span className={styles.cardSize}>{p.size_label}</span>
            </a>
            <div className={styles.cardFoot}>
              <span className={styles.price}>{euro(p.price_cents)}</span>
              {p.flavors.length > 1
                ? <a href={`#/p/${p.id}`} className={styles.addSmall}>Избери вкус</a>
                : <button type="button" className={styles.addSmall} onClick={() => onAdd(p.id, p.flavors[0] ?? null)}
                    aria-label={`Добави ${p.name} в количката`}>Добави</button>}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

/* ── Продуктът ─────────────────────────────────────────────────────────────── */

function Product({ product, onAdd }) {
  const [flavor, setFlavor] = useState(product?.flavors?.length === 1 ? product.flavors[0] : null)
  const [qty, setQ] = useState(1)
  if (!product) return <p className={styles.empty}>Този продукт го няма. <a href="#/">Към каталога</a></p>
  const needFlavor = product.flavors.length > 1 && !flavor
  return (
    <article className={styles.product}>
      <a href="#/" className={styles.back}>← Каталог</a>
      <div className={styles.productImg}><img src={product.image} alt={product.name} width="300" height="300" /></div>
      <div className={styles.productBody}>
        <h1 className={styles.h1}>{product.name}</h1>
        <p className={styles.cardSize}>{product.size_label}</p>
        <p className={styles.bigPrice}>{euro(product.price_cents)}</p>
        <p className={styles.lead}>{product.description}</p>
        {product.flavors.length > 1 && (
          <fieldset className={styles.flavors}>
            <legend>Вкус</legend>
            {product.flavors.map((f) => (
              <label key={f} className={styles.flavor}>
                <input type="radio" name="flavor" value={f} checked={flavor === f} onChange={() => setFlavor(f)} />
                <span>{f}</span>
              </label>
            ))}
          </fieldset>
        )}
        <div className={styles.buyRow}>
          <Stepper value={qty} onChange={setQ} label={product.name} />
          <button type="button" className={styles.primary} disabled={needFlavor}
            onClick={() => onAdd(product.id, flavor, qty)}>{needFlavor ? 'Избери вкус' : 'Добави в количката'}</button>
        </div>
      </div>
    </article>
  )
}

function Stepper({ value, onChange, label }) {
  return (
    <span className={styles.stepper}>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`По-малко ${label}`}>−</button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(50, value + 1))} aria-label={`Повече ${label}`}>+</button>
    </span>
  )
}

/* ── Количката ─────────────────────────────────────────────────────────────── */

function Cart({ lines, subtotal, onQty }) {
  if (!lines.length) {
    return <div className={styles.emptyBox}><p>Количката е празна.</p><a href="#/" className={styles.primary}>Към каталога</a></div>
  }
  return (
    <>
      <h1 className={styles.h1}>Количка</h1>
      <ul className={styles.lines}>
        {lines.map((l) => (
          <li key={l.key} className={styles.line}>
            <img src={l.product.image} alt="" width="64" height="64" />
            <div className={styles.lineMain}>
              <span className={styles.lineName}>{l.product.name}</span>
              <span className={styles.cardSize}>{[l.product.size_label, l.flavor].filter(Boolean).join(' · ')}</span>
              <Stepper value={l.qty} onChange={(q) => onQty(l.key, q)} label={l.product.name} />
            </div>
            <span className={styles.linePrice}>{euro(l.qty * l.product.price_cents)}</span>
          </li>
        ))}
      </ul>
      <div className={styles.sum}>
        <span>Сума</span><b>{euro(subtotal)}</b>
      </div>
      <p className={styles.note}>Доставката се избира на следващата стъпка. С куриер е безплатна над 60 €, до вратата в София — над 40 €.</p>
      <a href="#/checkout" className={`${styles.primary} ${styles.wide}`}>Към поръчката</a>
    </>
  )
}

/* ── Касата ────────────────────────────────────────────────────────────────── */

const DETAILS = {
  office: { label: 'Град и офис', placeholder: 'напр. София, офис Младост 1' },
  address: { label: 'Адрес за доставка', placeholder: 'град, улица, номер, вход, етаж' },
  sofia: { label: 'Адрес в София и удобен час', placeholder: 'напр. Младост 3, бл. 312, след 18:00' },
}

function Checkout({ lines, subtotal, delivery, onPaid }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', delivery: '', details: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const method = delivery.find((d) => d.id === form.delivery)
  const free = method && method.free_from_cents != null && subtotal >= method.free_from_cents
  const shipping = method ? (free ? 0 : method.price_cents) : 0

  if (done) {
    return (
      <div className={styles.emptyBox}>
        <h1 className={styles.h1}>Поръчка № {done}</h1>
        <p>Записана е. Плащането с карта още не е пуснато в тестовия режим — ще ти пишем на имейла.</p>
        <a href="#/" className={styles.primary}>Към каталога</a>
      </div>
    )
  }
  if (!lines.length) return <div className={styles.emptyBox}><p>Количката е празна.</p><a href="#/" className={styles.primary}>Към каталога</a></div>

  async function submit(e) {
    e.preventDefault()
    setMsg('')
    if (!method) { setMsg('Избери начин на доставка.'); return }
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('shop-checkout', {
      body: {
        action: 'create',
        items: lines.map((l) => ({ id: l.id, flavor: l.flavor, qty: l.qty })),
        customer: { name: form.name, email: form.email, phone: form.phone },
        delivery: { id: form.delivery, details: form.details },
      },
    })
    if (error || data?.error) {
      let text = data?.error
      try { text = text || (await error.context.json()).error } catch { /* без тяло */ }
      setMsg(text || 'Поръчката не мина. Опитай пак.')
      setBusy(false)
      return
    }
    if (data?.url) { window.location.href = data.url; return }
    if (!data?.number) { setMsg('Поръчката не мина. Опитай пак.'); setBusy(false); return }
    onPaid()
    setDone(data.number)
    setBusy(false)
  }

  return (
    <form className={styles.checkout} onSubmit={submit}>
      <h1 className={styles.h1}>Поръчка</h1>
      <fieldset className={styles.group}>
        <legend>Контакт</legend>
        <label>Име и фамилия<input required autoComplete="name" value={form.name} onChange={set('name')} /></label>
        <label>Имейл<input required type="email" autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label>Телефон<input required type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} /></label>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Доставка</legend>
        {delivery.map((d) => {
          const isFree = d.free_from_cents != null && subtotal >= d.free_from_cents
          return (
            <label key={d.id} className={styles.option}>
              <input type="radio" name="delivery" value={d.id} checked={form.delivery === d.id} onChange={set('delivery')} />
              <span className={styles.optionMain}><b>{d.label}</b><small>{d.hint}</small></span>
              <span className={styles.optionPrice}>{d.price_cents === 0 || isFree ? 'безплатно' : euro(d.price_cents)}</span>
            </label>
          )
        })}
        {method && DETAILS[method.needs] && (
          <label>{DETAILS[method.needs].label}
            <input required value={form.details} onChange={set('details')} placeholder={DETAILS[method.needs].placeholder} />
          </label>
        )}
      </fieldset>
      <div className={styles.summary}>
        <div><span>Продукти</span><span>{euro(subtotal)}</span></div>
        <div><span>Доставка</span><span>{method ? (shipping ? euro(shipping) : 'безплатно') : '—'}</span></div>
        <div className={styles.total}><span>Общо</span><b>{euro(subtotal + shipping)}</b></div>
      </div>
      {msg && <p className={styles.error} role="alert">{msg}</p>}
      <button type="submit" className={`${styles.primary} ${styles.wide}`} disabled={busy}>
        {busy ? 'Изпраща…' : `Плати ${euro(subtotal + shipping)} с карта`}
      </button>
      <p className={styles.note}>Плащането минава през Stripe. Данните на картата не стигат до нас.</p>
    </form>
  )
}

/* ── Благодарността ────────────────────────────────────────────────────────── */

function Thanks({ order, session, onDone }) {
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    (async () => {
      const { data } = await supabase.functions.invoke('shop-checkout', { body: { action: 'confirm', order, session } })
      if (data?.paid) onDone()
      setState({ loading: false, number: data?.number, paid: !!data?.paid })
    })()
  }, [order, session, onDone])
  if (state.loading) return <p className={styles.empty}>Проверяваме плащането…</p>
  return (
    <div className={styles.emptyBox}>
      <h1 className={styles.h1}>{state.paid ? `Благодарим! Поръчка № ${state.number}` : 'Плащането не е потвърдено'}</h1>
      <p>{state.paid
        ? 'Плащането мина. Ще ти пишем на имейла, когато пратката тръгне.'
        : 'Ако си платил, ще го видим до няколко минути. Ако не — количката те чака.'}</p>
      <a href={state.paid ? '#/' : '#/cart'} className={styles.primary}>{state.paid ? 'Към каталога' : 'Към количката'}</a>
    </div>
  )
}
