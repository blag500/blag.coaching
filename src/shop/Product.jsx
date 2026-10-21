import { useEffect, useRef, useState } from 'react'
import { euro } from './cart'
import { arrivalText, cutoffNote } from './delivery'
import { GOALS, Stepper, unitPrice } from './ui'
import styles from './Shop.module.css'

/* Продуктът. Размерите на едно и също са бутони (не падащо меню), цената на
 * доза е до цената, доставката е като дата, а на телефона бутонът „Добави“
 * слиза в лента долу, щом основният излезе от екрана. */

export default function Product({ product, products, delivery, onAdd }) {
  const [flavor, setFlavor] = useState(null)
  const [qty, setQty] = useState(1)
  const [docked, setDocked] = useState(false)
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
  const need = product.flavors.length > 1 && !flavor
  const add = () => onAdd(product.id, flavor, qty)
  const courier = delivery.find((d) => d.needs === 'office')
  const sofia = delivery.find((d) => d.needs === 'sofia')
  const goals = GOALS.filter((g) => product.goals.includes(g.id))
  const cutoff = cutoffNote()

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
        <p className={styles.lead}>{product.description}</p>

        {sizes.length > 1 && (
          <fieldset className={styles.fGroup}>
            <legend>Размер</legend>
            <div className={styles.pills}>
              {sizes.map((s) => (
                <a key={s.id} href={`#/p/${s.id}`} className={styles.pill} aria-current={s.id === product.id ? 'true' : undefined}
                  onClick={(e) => { e.preventDefault(); history.replaceState(null, '', `#/p/${s.id}`); window.dispatchEvent(new HashChangeEvent('hashchange')) }}>
                  {s.size_label.split(' · ')[0]} · {euro(s.price_cents)}
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
          <button type="button" className={styles.primary} disabled={need} onClick={add}>
            {need ? 'Избери вкус' : `Добави · ${euro(product.price_cents * qty)}`}
          </button>
        </div>

        <ul className={styles.facts}>
          {cutoff && <li><b>{cutoff}.</b></li>}
          {courier && <li>Еконт или Спиди: {arrivalText('office')}. Безплатно над {euro(courier.free_from_cents)}.</li>}
          {sofia && <li>До вратата в София: {arrivalText('sofia')}. Безплатно над {euro(sofia.free_from_cents)}.</li>}
          <li>Плащане с карта през Stripe — данните на картата не стигат до нас.</li>
        </ul>
      </div>

      {docked && (
        <div className={styles.dock}>
          <span className={styles.dockPrice}>{euro(product.price_cents * qty)}{flavor ? <small>{flavor}</small> : null}</span>
          <button type="button" className={styles.primary}
            onClick={() => (need ? buyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : add())}>
            {need ? 'Избери вкус' : 'Добави'}
          </button>
        </div>
      )}
    </article>
  )
}
