import { useEffect, useRef, useState } from 'react'
import { euro } from './cart'
import { arrivalText, cutoffNote } from './delivery'
import { Icon, Stepper, factsFor, unitPrice, unitValue } from './ui'
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
  const cutoff = cutoffNote()
  const facts = factsFor(product)
  const m = product.per100

  return (
    <article className={styles.product}>
      <a href={`#/c/${product.category}`} onClick={(e) => { if (history.length > 1) { e.preventDefault(); history.back() } }} className={styles.back}>← Назад</a>
      <div className={styles.productImg}><img src={product.image} alt={product.name} width="300" height="300" /></div>
      <div className={styles.productBody}>
        <h1 className={styles.h1}>{product.name}</h1>
        <p className={styles.bigPrice}>{euro(product.price_cents)}{product.was_cents && <s className={styles.was}>{euro(product.was_cents)}</s>}<span className={styles.unit}>{[product.size_label, product.category === 'pantry' && unitPrice(product)].filter(Boolean).join(' · ')}</span></p>
        {product.description && <p className={styles.why}>{product.description}</p>}

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
            {m.source && <p className={styles.factNote} style={{ marginTop: 10, color: 'inherit', opacity: 0.6 }}>{shortSource(m.source)}</p>}
          </section>
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

        <ul className={styles.ships}>
          {courier && <li><b>Еконт или Спиди</b> — {arrivalText('office')}{cutoff ? ', ако поръчаш до 15:00' : ''} · 0 € над {euro(courier.free_from_cents)}</li>}
          {sofia && <li><b>До вратата в София</b> — {arrivalText('sofia').replace('до вратата ', '')} · 0 € над {euro(sofia.free_from_cents)}</li>}
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

/** Бележката под макросите — кратка; пълната остава, когато обяснява нещо (полиолите). */
function shortSource(src) {
  if (/^По етикета/.test(src)) return 'По етикета на производителя.'
  if (/^Ориентировъчно/.test(src)) return 'Ориентировъчно — точните са на опаковката.'
  return src
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
    <div className={styles.macroBar} title={`протеин ${pct(p)}, въглехидрати ${pct(c)}, мазнини ${pct(f)} от калориите`}>
      <i style={{ width: pct(p) }} /><i style={{ width: pct(c) }} /><i style={{ width: pct(f) }} />
    </div>
  )
}
