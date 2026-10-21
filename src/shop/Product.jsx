import { useEffect, useRef, useState } from 'react'
import { euro } from './cart'
import { arrivalText, cutoffNote } from './delivery'
import { GOALS, Icon, Stepper, factsFor, unitPrice, unitValue } from './ui'
import styles from './Shop.module.css'

/* Продуктът. Фактите са едри числа (сравнява се с цифри), размерите са редове
 * с цена на доза и най-изгодният е отбелязан, храната показва макросите на
 * 100 г, доставката е като дата, а на телефона бутонът „Добави“ слиза в
 * плаваща лента долу, щом основният излезе от екрана. */

export default function Product({ product, products, delivery, onAdd }) {
  const [flavor, setFlavor] = useState(null)
  const [qty, setQty] = useState(1)
  const [docked, setDocked] = useState(false)
  const [added, setAdded] = useState(false)
  const buyRef = useRef(null)

  useEffect(() => {
    setFlavor(product?.flavors?.length === 1 ? product.flavors[0] : null)
    setQty(1)
  }, [product?.id])

  useEffect(() => {
    if (!buyRef.current) return undefined
    const io = new IntersectionObserver(([e]) => setDocked(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(buyRef.current)
    return () => io.disconnect()
  }, [product?.id])

  if (!product) return <div className={styles.emptyBox}><p>Този продукт го няма.</p><a href="#/" className={styles.primary}>Към каталога</a></div>

  const sizes = product.size_group ? products.filter((p) => p.size_group === product.size_group) : []
  const cheapest = sizes.length > 1 ? sizes.reduce((a, b) => (unitValue(b) < unitValue(a) ? b : a)).id : null
  const need = product.flavors.length > 1 && !flavor
  const add = () => {
    onAdd(product.id, flavor, qty)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1400)
  }
  const courier = delivery.find((d) => d.needs === 'office')
  const sofia = delivery.find((d) => d.needs === 'sofia')
  const goals = GOALS.filter((g) => product.goals.includes(g.id))
  const cutoff = cutoffNote()
  const facts = factsFor(product)
  const m = product.per100

  return (
    <article className={styles.product}>
      <a href="#/" onClick={(e) => { if (history.length > 1) { e.preventDefault(); history.back() } }} className={styles.back}>← Каталог</a>
      <div className={styles.productImg}><img src={product.image} alt={product.name} width="300" height="300" /></div>
      <div className={styles.productBody}>
        {goals.length > 0 && <p className={styles.goalTags}>{goals.map((g) => <a key={g.id} href={`#/?goal=${g.id}`}>{g.label}</a>)}</p>}
        <h1 className={styles.h1}>{product.name}</h1>
        <p className={styles.cardSize}>{product.size_label}</p>
        <p className={styles.bigPrice}>{euro(product.price_cents)}
          {unitPrice(product) && <span className={styles.unit}>{unitPrice(product)}</span>}
        </p>

        {facts.length > 1 && (
          <div className={styles.factGrid} style={{ '--n': facts.length }}>
            {facts.map((f) => <div key={f.l}><b>{f.v}</b><small>{f.l}</small></div>)}
          </div>
        )}

        {m && (
          <section className={styles.macros} aria-label="Хранителни стойности на 100 г">
            <h2>На 100 г · грамове</h2>
            <div className={styles.macroGrid}>
              <div><b>{Math.round(m.kcal)}</b><small>ккал</small></div>
              <div><b>{fmt1(m.protein)}</b><small>протеин</small></div>
              <div><b>{fmt1(m.carbs)}</b><small>въглехидр.</small></div>
              <div><b>{fmt1(m.fat)}</b><small>мазнини</small></div>
            </div>
            <MacroBar m={m} />
            {m.source && <p className={styles.factNote} style={{ marginTop: 10, color: 'inherit', opacity: 0.6 }}>{m.source}</p>}
          </section>
        )}

        {product.description && (
          <p className={styles.why}>{product.description}</p>
        )}

        {sizes.length > 1 && (
          <fieldset className={styles.fGroup}>
            <legend>Размер</legend>
            <div className={styles.sizes}>
              {sizes.map((s) => (
                <a key={s.id} href={`#/p/${s.id}`} className={styles.sizeRow} aria-current={s.id === product.id ? 'true' : undefined}
                  aria-label={`${s.size_label.split(' · ')[0]} · ${euro(s.price_cents)}${unitPrice(s) ? ` · ${unitPrice(s)}` : ''}`}
                  onClick={(e) => { e.preventDefault(); history.replaceState(null, '', `#/p/${s.id}`); window.dispatchEvent(new HashChangeEvent('hashchange')) }}>
                  <b>{s.size_label.split(' · ')[0]}{s.id === cheapest && <em>най-изгодно</em>}</b>
                  <small>{[s.size_label.split(' · ')[1], unitPrice(s)].filter(Boolean).join(' · ')}</small>
                  <strong>{euro(s.price_cents)}</strong>
                </a>
              ))}
            </div>
          </fieldset>
        )}

        {product.flavors.length > 1 && (
          <fieldset className={styles.fGroup}>
            <legend>Вкус {flavor ? <b>· {flavor}</b> : null}</legend>
            <div className={styles.pills}>
              {product.flavors.map((f) => (
                <button key={f} type="button" className={styles.pill} aria-pressed={flavor === f} onClick={() => setFlavor(f)}>{f}</button>
              ))}
            </div>
          </fieldset>
        )}

        <div className={styles.buyRow} ref={buyRef}>
          <Stepper value={qty} onChange={setQty} label={product.name} min={1} />
          <button type="button" className={`${styles.primary} ${added ? styles.primaryDone : ''}`} disabled={need} onClick={add}>
            {added ? <><Icon name="check" size={18} stroke={2.4} />Добавено</> : need ? 'Избери вкус' : `Добави · ${euro(product.price_cents * qty)}`}
          </button>
        </div>

        <ul className={styles.facts}>
          {cutoff && <li><Icon name="clock" size={18} /><span><b>{cutoff}.</b></span></li>}
          {courier && <li><Icon name="truck" size={18} /><span>Еконт или Спиди: {arrivalText('office')}. Безплатно над {euro(courier.free_from_cents)}.</span></li>}
          {sofia && <li><Icon name="gift" size={18} /><span>До вратата в София: {arrivalText('sofia')}. Безплатно над {euro(sofia.free_from_cents)}.</span></li>}
          <li><Icon name="card" size={18} /><span>Плащане с карта през Stripe — данните на картата не стигат до нас.</span></li>
        </ul>
      </div>

      {docked && (
        <div className={styles.dock}>
          <span className={styles.dockPrice}>{euro(product.price_cents * qty)}{flavor ? <small>{flavor}</small> : null}</span>
          <button type="button" className={`${styles.primary} ${added ? styles.primaryDone : ''}`}
            onClick={() => (need ? buyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : add())}>
            {added ? 'Добавено' : need ? 'Избери вкус' : 'Добави'}
          </button>
        </div>
      )}
    </article>
  )
}

const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString('bg-BG')

/** Лентата на калориите: колко идва от протеин, въглехидрати и мазнини (4/4/9). */
function MacroBar({ m }) {
  const p = m.protein * 4
  const c = m.carbs * 4
  const f = m.fat * 9
  const sum = p + c + f || 1
  const pct = (x) => `${Math.round((x / sum) * 100)}%`
  return (
    <>
      <div className={styles.macroBar} aria-hidden="true">
        <i style={{ width: pct(p) }} /><i style={{ width: pct(c) }} /><i style={{ width: pct(f) }} />
      </div>
      <div className={styles.macroKey}>
        <span>протеин {pct(p)}</span><span>въглехидрати {pct(c)}</span><span>мазнини {pct(f)}</span>
      </div>
    </>
  )
}
