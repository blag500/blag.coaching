import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { euro } from './cart'
import { arrivalText } from './delivery'
import { FreeBar, Stepper } from './ui'
import { Mark } from './Brand.jsx'
import styles from './Shop.module.css'

/* Количката, касата и благодарността.
 *
 * Касата следва проучването: доставката е с дата, цената ѝ се вижда преди
 * плащането, телефонът казва защо го искаме, офисът на Еконт се избира от
 * списък, а грешката е под полето и казва какво точно липсва. */

export function Cart({ lines, subtotal, delivery, onQty }) {
  if (!lines.length) {
    return <div className={styles.emptyBox}><p>Количката е празна.</p><a href="#/" className={styles.primary}>Към каталога</a></div>
  }
  return (
    <>
      <h1 className={styles.h1}>Количка</h1>
      <FreeBar subtotal={subtotal} delivery={delivery} />
      <ul className={styles.lines}>
        {lines.map((l) => (
          <li key={l.key} className={styles.line}>
            <a href={`#/p/${l.product.id}`} className={styles.lineImg}><img src={l.product.image} alt="" width="64" height="64" /></a>
            <div className={styles.lineMain}>
              <span className={styles.lineName}>{l.product.name}</span>
              <span className={styles.cardSize}>{[l.product.size_label, l.flavor].filter(Boolean).join(' · ')}</span>
              <span className={styles.lineCtl}>
                <Stepper value={l.qty} onChange={(q) => onQty(l.key, q)} label={l.product.name} />
                <button type="button" className={styles.remove} onClick={() => onQty(l.key, 0)}>Махни</button>
              </span>
            </div>
            <span className={styles.linePrice}>{euro(l.qty * l.product.price_cents)}</span>
          </li>
        ))}
      </ul>
      <div className={styles.sum}><span>Сума</span><b>{euro(subtotal)}</b></div>
      <a href="#/checkout" className={`${styles.primary} ${styles.wide}`}>Към поръчката</a>
      <a href="#/" className={styles.continue}>← Продължи пазаруването</a>
    </>
  )
}

const DETAILS = {
  office: { label: 'Град и офис', placeholder: 'напр. София, офис Младост 1', error: 'Напиши град и офис.' },
  address: { label: 'Адрес за доставка', placeholder: 'град, улица, номер, вход, етаж', error: 'Напиши адрес — град, улица и номер.' },
  sofia: { label: 'Адрес в София и удобен час', placeholder: 'напр. Младост 3, бл. 312, след 18:00', error: 'Напиши адрес в София.' },
}

function validate(form, method) {
  const e = {}
  if (form.name.trim().split(/\s+/).length < 2) e.name = 'Напиши име и фамилия — куриерът ги иска.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Имейлът изглежда непълен — липсва @ или домейн.'
  if (form.phone.replace(/\D/g, '').length < 9) e.phone = 'Телефонът е твърде къс — напиши поне 9 цифри.'
  if (!method) e.delivery = 'Избери как да ти стигне.'
  else if (DETAILS[method.needs] && form.details.trim().length < 4) e.details = DETAILS[method.needs].error
  return e
}

export function Checkout({ lines, subtotal, delivery, onPaid }) {
  // Името, имейлът и телефонът се помнят от миналата поръчка — само в този телефон.
  const [form, setForm] = useState(() => {
    const empty = { name: '', email: '', phone: '', delivery: '', details: '' }
    try {
      const { name = '', email = '', phone = '' } = JSON.parse(localStorage.getItem('zs.contact') || '{}')
      return { ...empty, name, email, phone }
    } catch { return empty }
  })
  const [errors, setErrors] = useState({})
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(null)
  const method = delivery.find((d) => d.id === form.delivery)
  const free = method && method.free_from_cents != null && subtotal >= method.free_from_cents
  const shipping = method ? (free ? 0 : method.price_cents) : 0

  useEffect(() => { if (tried) setErrors(validate(form, method)) }, [form, method, tried])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'delivery' ? { details: '' } : {}) }))

  if (done) {
    return (
      <div className={`${styles.emptyBox} ${styles.thanks}`}>
        <span className="zs-beat"><Mark size={96} /></span>
        <h1 className={styles.h1}>Поръчка № {done}</h1>
        <p>Записана е. Плащането с карта още не е пуснато — ще ти пишем на имейла.</p>
        <a href="#/" className={styles.primary}>Към каталога</a>
      </div>
    )
  }
  if (!lines.length) return <div className={styles.emptyBox}><p>Количката е празна.</p><a href="#/" className={styles.primary}>Към каталога</a></div>

  async function submit(e) {
    e.preventDefault()
    setTried(true)
    const errs = validate(form, method)
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.querySelector(`[data-field="${Object.keys(errs)[0]}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setMsg('')
    setBusy(true)
    try { localStorage.setItem('zs.contact', JSON.stringify({ name: form.name, email: form.email, phone: form.phone })) } catch { /* частен прозорец */ }
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

  const field = (k, label, props, hint) => (
    <label data-field={k} className={errors[k] ? styles.hasError : undefined}>
      {label}
      <input value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${k}-err` : hint ? `${k}-hint` : undefined} {...props} />
      {hint && !errors[k] && <small id={`${k}-hint`} className={styles.hint}>{hint}</small>}
      {errors[k] && <small id={`${k}-err`} className={styles.fieldError}>{errors[k]}</small>}
    </label>
  )

  return (
    <form className={styles.checkout} onSubmit={submit} noValidate>
      <h1 className={styles.h1}>Поръчка</h1>
      <FreeBar subtotal={subtotal} delivery={delivery} />

      <fieldset className={styles.group}>
        <legend>Контакт</legend>
        {field('name', 'Име и фамилия', { autoComplete: 'name' })}
        {field('email', 'Имейл', { type: 'email', autoComplete: 'email', inputMode: 'email' }, 'За връзка по поръчката.')}
        {field('phone', 'Телефон', { type: 'tel', autoComplete: 'tel', inputMode: 'tel' }, 'Само за куриера — да се обади при доставката.')}
      </fieldset>

      <fieldset className={styles.group} data-field="delivery">
        <legend>Доставка</legend>
        {delivery.map((d) => {
          const isFree = d.price_cents === 0 || (d.free_from_cents != null && subtotal >= d.free_from_cents)
          return (
            <label key={d.id} className={styles.option}>
              <input type="radio" name="delivery" value={d.id} checked={form.delivery === d.id} onChange={set('delivery')} />
              <span className={styles.optionMain}><b>{d.label}</b><small>{arrivalText(d.needs)}</small></span>
              <span className={styles.optionPrice}>{isFree ? 'безплатно' : euro(d.price_cents)}</span>
            </label>
          )
        })}
        {errors.delivery && <small className={styles.fieldError}>{errors.delivery}</small>}
        {method?.id === 'econt-office'
          ? <OfficePicker value={form.details} onChange={(v) => setForm((f) => ({ ...f, details: v }))} error={errors.details} />
          : method && DETAILS[method.needs] && field('details', DETAILS[method.needs].label, { placeholder: DETAILS[method.needs].placeholder, autoComplete: method.needs === 'office' ? 'off' : 'street-address' })}
      </fieldset>

      <div className={styles.summary}>
        {lines.map((l) => (
          <div key={l.key} className={styles.sumLine}><span>{l.qty} × {l.product.name}{l.flavor ? ` · ${l.flavor}` : ''}</span><span>{euro(l.qty * l.product.price_cents)}</span></div>
        ))}
        <div><span>Доставка</span><span>{method ? (shipping ? euro(shipping) : 'безплатно') : '—'}</span></div>
        <div className={styles.total}><span>Общо</span><b>{euro(subtotal + shipping)}</b></div>
      </div>
      {msg && <p className={styles.error} role="alert">{msg}</p>}
      <button type="submit" className={`${styles.primary} ${styles.wide}`} disabled={busy}>
        {busy ? 'Изпраща…' : `Плати ${euro(subtotal + shipping)} с карта`}
      </button>
      <p className={styles.note}>Плащането минава през Stripe — данните на картата не стигат до нас.</p>
    </form>
  )
}

/* Офисът на Еконт — от списък с търсене по град, име или адрес. Списъкът
   (scripts/shop-econt-offices.mjs) се тегли чак когато е избран Еконт. */
let officesCache = null

function OfficePicker({ value, onChange, error }) {
  const [offices, setOffices] = useState(officesCache)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(!value)

  useEffect(() => {
    if (officesCache) return
    fetch('/shop/econt-offices.json').then((r) => r.json()).then((d) => { officesCache = d; setOffices(d) }).catch(() => setOffices([]))
  }, [])

  const hits = useMemo(() => {
    if (!offices || q.trim().length < 2) return []
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    // Първо градът, който е написан; после София (повечето купувачи); после другите.
    const rank = (o) => (words.some((w) => o.t.toLowerCase().startsWith(w)) ? 0 : o.t === 'София' ? 1 : 2)
    return offices
      .filter((o) => words.every((w) => `${o.t} ${o.n} ${o.a}`.toLowerCase().includes(w)))
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 30)
  }, [offices, q])

  if (value && !open) {
    return (
      <div data-field="details" className={styles.picked}>
        <span><b>Офис на Еконт</b><br />{value}</span>
        <button type="button" className={styles.ghost} onClick={() => { setOpen(true); onChange('') }}>Смени</button>
      </div>
    )
  }
  return (
    <div data-field="details" className={error ? styles.hasError : undefined}>
      <label className={styles.stackLabel}>Офис или автомат на Еконт
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Град, квартал или адрес — напр. Младост" autoComplete="off"
          aria-invalid={!!error} aria-controls="econt-list" />
      </label>
      {error && <small className={styles.fieldError}>{error}</small>}
      {offices === null && <small className={styles.hint}>Зарежда офисите…</small>}
      {q.trim().length >= 2 && (
        <ul id="econt-list" className={styles.officeList} role="listbox">
          {hits.map((o) => (
            <li key={o.c}>
              <button type="button" role="option" aria-selected="false" onClick={() => { onChange(`${o.t} — ${o.n}${o.m ? ' (автомат)' : ''}, ${o.a} [${o.c}]`); setOpen(false) }}>
                <b>{o.t} · {o.n}</b>{o.m ? <em>автомат</em> : null}<small>{o.a}</small>
              </button>
            </li>
          ))}
          {!hits.length && offices && <li className={styles.hint}>Няма офис с това име. Опитай с града.</li>}
        </ul>
      )}
    </div>
  )
}

export function Thanks({ order, session, onDone }) {
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
    <div className={`${styles.emptyBox} ${styles.thanks}`}>
      {state.paid && <span className="zs-beat"><Mark size={96} /></span>}
      <h1 className={styles.h1}>{state.paid ? `Благодарим! Поръчка № ${state.number}` : 'Плащането не е потвърдено'}</h1>
      <p>{state.paid
        ? 'Плащането мина. Ще ти пишем на имейла, когато пратката тръгне.'
        : 'Ако си платил, ще го видим до няколко минути. Ако не — количката те чака.'}</p>
      <a href={state.paid ? '#/' : '#/cart'} className={styles.primary}>{state.paid ? 'Към каталога' : 'Към количката'}</a>
    </div>
  )
}

