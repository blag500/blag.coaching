import { useEffect, useMemo, useState } from 'react'
import { euro } from './cart'
import { cutoffNote } from './delivery'
import { CATEGORIES, GOALS, Icon, PRICES, Sheet, TAGS, flavorColor, unitPrice, unitValue } from './ui'
import styles from './Shop.module.css'

/* Каталогът. Всичко, което човек е избрал — търсене, цел, филтри, подредба —
 * живее в адреса (#/?goal=strength&cat=protein…), за да оцелее „назад“ и да
 * може да се прати като линк. Броят до всеки филтър е колко продукта ще
 * останат, ако се добави (проучването: най-силната промяна във филтрите). */

const SORTS = [
  { id: '', label: 'Препоръчани' },
  { id: 'dose', label: 'Най-изгодно' },
  { id: 'price', label: 'Цена ↑' },
  { id: 'price-desc', label: 'Цена ↓' },
  { id: 'protein', label: 'Протеин на 100 г' },
]

const LISTS = ['cat', 'goal', 'tag', 'price']

export function readQuery(query) {
  const q = new URLSearchParams(query)
  const out = { q: q.get('q') || '', sort: q.get('sort') || '' }
  for (const k of LISTS) out[k] = (q.get(k) || '').split(',').filter(Boolean)
  return out
}

function writeQuery(state) {
  const q = new URLSearchParams()
  if (state.q) q.set('q', state.q)
  for (const k of LISTS) if (state[k].length) q.set(k, state[k].join(','))
  if (state.sort) q.set('sort', state.sort)
  const s = q.toString()
  history.replaceState(null, '', `#/${s ? `?${s}` : ''}`)
}

const norm = (s) => s.toLowerCase().replace(/ё/g, 'е')

/** Минава ли продуктът филтрите, като по желание пропусне една група (за броя). */
function passes(p, f, skip) {
  if (f.q && !norm(`${p.name} ${p.description} ${p.flavors.join(' ')}`).includes(norm(f.q))) return false
  if (skip !== 'cat' && f.cat.length && !f.cat.includes(p.category)) return false
  if (skip !== 'goal' && f.goal.length && !f.goal.some((g) => p.goals.includes(g))) return false
  if (skip !== 'tag' && f.tag.length && !f.tag.every((t) => p.tags.includes(t))) return false
  if (skip !== 'price' && f.price.length && !f.price.some((id) => PRICES.find((r) => r.id === id)?.test(p.price_cents))) return false
  return true
}

export default function Catalog({ products, query, onAdd, delivery }) {
  const [f, setF] = useState(() => readQuery(query))
  const [sheet, setSheet] = useState(false)
  const [quick, setQuick] = useState(null)
  const [justAdded, setJustAdded] = useState(null)

  useEffect(() => { writeQuery(f) }, [f])

  // Връщане от продукт: на същото място в списъка.
  useEffect(() => {
    const y = Number(sessionStorage.getItem('zs.scroll') || 0)
    if (y) requestAnimationFrame(() => window.scrollTo(0, y))
    return () => sessionStorage.setItem('zs.scroll', String(window.scrollY))
  }, [])

  // Размерите на един продукт са една карта; продуктът ги показва като редове.
  const cards = useMemo(() => {
    const seen = new Map()
    for (const p of products) {
      if (!p.size_group) { seen.set(p.id, { ...p, sizes: 1 }); continue }
      const first = seen.get(p.size_group)
      if (first) first.sizes += 1
      else seen.set(p.size_group, { ...p, sizes: 1 })
    }
    return [...seen.values()]
  }, [products])

  // „Най-изгодно“ — най-ниската цена на доза (на кг за храната) във вида си,
  // само там, където има с какво да се сравни. Смята се, не се пише на ръка.
  const best = useMemo(() => {
    const out = new Set()
    for (const c of CATEGORIES) {
      const list = cards.filter((p) => p.category === c.id && unitPrice(p))
      if (list.length < 3) continue
      out.add(list.reduce((a, b) => (unitValue(b) < unitValue(a) ? b : a)).id)
    }
    return out
  }, [cards])

  const shown = useMemo(() => {
    const list = cards.filter((p) => passes(p, f))
    if (f.sort === 'dose') list.sort((a, b) => unitValue(a) - unitValue(b))
    if (f.sort === 'price') list.sort((a, b) => a.price_cents - b.price_cents)
    if (f.sort === 'price-desc') list.sort((a, b) => b.price_cents - a.price_cents)
    if (f.sort === 'protein') list.sort((a, b) => (b.per100?.protein ?? -1) - (a.per100?.protein ?? -1))
    return list
  }, [cards, f])

  const count = (group, id) => cards.filter((p) => passes(p, { ...f, [group]: [id] }, null) && passes(p, f, group)).length
  const toggle = (group, id) => setF((s) => ({ ...s, [group]: s[group].includes(id) ? s[group].filter((x) => x !== id) : [...s[group], id] }))
  const applied = [
    ...f.goal.map((id) => ({ group: 'goal', id, label: GOALS.find((g) => g.id === id)?.label })),
    ...f.cat.map((id) => ({ group: 'cat', id, label: CATEGORIES.find((c) => c.id === id)?.label })),
    ...f.tag.map((id) => ({ group: 'tag', id, label: TAGS.find((t) => t.id === id)?.label })),
    ...f.price.map((id) => ({ group: 'price', id, label: PRICES.find((r) => r.id === id)?.label })),
  ].filter((a) => a.label)
  const clearAll = () => setF((s) => ({ ...s, q: '', cat: [], goal: [], tag: [], price: [] }))

  const addNow = (p) => {
    onAdd(p.id, p.flavors[0] ?? null)
    setJustAdded(p.id)
    window.setTimeout(() => setJustAdded((x) => (x === p.id ? null : x)), 900)
  }

  const courier = delivery.find((d) => d.needs === 'office')
  const cutoff = cutoffNote()

  return (
    <>
      <section className={styles.hero}>
        <HeroArt products={products} />
        <p className={styles.kicker}><i aria-hidden="true" />{cutoff ? `${cutoff}` : 'Поръчай сега — тръгва в следващия работен ден'}</p>
        <h1 className={styles.display}>Добавки и храна, <em>подбрани</em> от треньор.</h1>
        <p className={styles.lead}>Тесен избор вместо хиляди продукти — подбран от Николай Благьов, треньор. До всеки продукт е сметната цената на доза, а до храната — макросите на 100 г.</p>
        <ul className={styles.promises}>
          <li><Icon name="clock" /><b>До 15:00</b>тръгва същия ден</li>
          <li><Icon name="truck" /><b>{courier ? `над ${euro(courier.free_from_cents).replace(',00', '')}` : 'Еконт'}</b>безплатна доставка</li>
          <li><Icon name="card" /><b>С карта</b>през Stripe</li>
        </ul>
      </section>

      <label className={styles.search}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input type="search" value={f.q} onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))}
          placeholder="Търси: креатин, грис, ванилия…" aria-label="Търси в магазина" />
      </label>

      <h2 className={styles.h2}>По цел</h2>
      <div className={styles.goals}>
        {GOALS.map((g) => (
          <button key={g.id} type="button" className={styles.goal} aria-pressed={f.goal.includes(g.id)} onClick={() => toggle('goal', g.id)}>
            <Icon name={g.id} size={26} />
            <b>{g.label}</b><small>{g.hint}</small>
          </button>
        ))}
      </div>

      <div className={styles.catRow} role="group" aria-label="Вид">
        {CATEGORIES.filter((c) => cards.some((p) => p.category === c.id)).map((c) => (
          <button key={c.id} type="button" className={styles.catChip} aria-pressed={f.cat.includes(c.id)}
            onClick={() => setF((s) => ({ ...s, cat: s.cat.includes(c.id) ? [] : [c.id] }))}>
            {c.label}<span>{cards.filter((p) => p.category === c.id).length}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <button type="button" className={styles.filterBtn} onClick={() => setSheet(true)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Филтри{applied.length ? ` · ${applied.length}` : ''}
        </button>
        <label className={styles.sort}>
          <span className={styles.srOnly}>Подреди по</span>
          <select value={f.sort} onChange={(e) => setF((s) => ({ ...s, sort: e.target.value }))}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {(applied.length > 0 || f.q) && (
        <div className={styles.applied}>
          {f.q && <button type="button" className={styles.appliedChip} onClick={() => setF((s) => ({ ...s, q: '' }))}>„{f.q}“ <span aria-hidden="true">✕</span></button>}
          {applied.map((a) => (
            <button key={a.group + a.id} type="button" className={styles.appliedChip} onClick={() => toggle(a.group, a.id)}
              aria-label={`Махни ${a.label}`}>{a.label} <span aria-hidden="true">✕</span></button>
          ))}
          <button type="button" className={styles.clearAll} onClick={clearAll}>Изчисти всичко</button>
        </div>
      )}

      <p className={styles.count} aria-live="polite">{shown.length} {shown.length === 1 ? 'продукт' : 'продукта'}</p>

      {shown.length ? (
        <ul className={styles.grid}>
          {shown.map((p, i) => (
            <li key={p.id} className={styles.card} style={{ '--i': Math.min(i, 12) }}>
              <a href={`#/p/${p.id}`} className={styles.cardLink}>
                <span className={styles.stage}>
                  <img className={styles.stageImg} src={p.image} alt="" loading="lazy" width="300" height="300" />
                  {best.has(p.id)
                    ? <span className={styles.flag}>Най-изгодно {p.category === 'pantry' ? 'на кг' : 'на доза'}</span>
                    : p.tags.includes('high_protein') ? <span className={`${styles.flag} ${styles.flagMuted}`}>Много протеин</span> : null}
                </span>
                <span className={styles.cardName}>{p.name}</span>
                <span className={styles.cardSize}>{p.sizes > 1 ? `${p.sizes} размера` : p.size_label}</span>
                {p.flavors.length > 1 && (
                  <span className={styles.cardMeta}>
                    <span className={styles.dots} aria-hidden="true">{p.flavors.slice(0, 5).map((fl) => <i key={fl} style={{ background: flavorColor(fl) }} />)}</span>
                    {p.flavors.length} вкуса
                  </span>
                )}
                {p.per100 && (
                  <span className={styles.macroLine} title="на 100 г">
                    <span>{Math.round(p.per100.protein)} г протеин</span>
                    <span>{Math.round(p.per100.kcal)} ккал</span>
                  </span>
                )}
              </a>
              <div className={styles.cardFoot}>
                <span className={styles.priceBox}>
                  <span className={styles.price}>{p.sizes > 1 ? 'от ' : ''}{euro(p.price_cents)}</span>
                  {unitPrice(p) && <span className={styles.unit}>{unitPrice(p)}</span>}
                </span>
                <button type="button" className={`${styles.addSmall} ${justAdded === p.id ? styles.addDone : ''}`}
                  onClick={() => (p.flavors.length > 1 || p.sizes > 1 ? setQuick(p) : addNow(p))}
                  aria-label={`Добави ${p.name} в количката`}>
                  <Icon name={justAdded === p.id ? 'check' : 'plus'} size={20} stroke={2.4} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.emptyBox}>
          <p>Нищо не отговаря на всички филтри.</p>
          <button type="button" className={styles.primary} onClick={clearAll}>Изчисти филтрите</button>
        </div>
      )}

      {sheet && (
        <Sheet title="Филтри" onClose={() => setSheet(false)}
          footer={<>
            <button type="button" className={styles.ghost} onClick={clearAll}>Изчисти</button>
            <button type="button" className={styles.primary} onClick={() => setSheet(false)}>Покажи {shown.length} {shown.length === 1 ? 'продукт' : 'продукта'}</button>
          </>}>
          <Group title="Цел" group="goal" items={GOALS} f={f} count={count} toggle={toggle} />
          <Group title="Вид" group="cat" items={CATEGORIES} f={f} count={count} toggle={toggle} />
          <Group title="Хранене" group="tag" items={TAGS} f={f} count={count} toggle={toggle} />
          <Group title="Цена" group="price" items={PRICES} f={f} count={count} toggle={toggle} />
        </Sheet>
      )}

      {quick && <QuickAdd product={quick} products={products} onAdd={onAdd} onClose={() => setQuick(null)} />}
    </>
  )
}

function Group({ title, group, items, f, count, toggle }) {
  return (
    <fieldset className={styles.fGroup}>
      <legend>{title}</legend>
      {items.map((it) => {
        const n = count(group, it.id)
        const on = f[group].includes(it.id)
        return (
          <label key={it.id} className={`${styles.fOption} ${!n && !on ? styles.fEmpty : ''}`}>
            <input type="checkbox" checked={on} disabled={!n && !on} onChange={() => toggle(group, it.id)} />
            <span>{it.label}</span>
            <span className={styles.fCount}>{n}</span>
          </label>
        )
      })}
    </fieldset>
  )
}

/** Вкус и размер, без да се отваря продуктът. */
function QuickAdd({ product, products, onAdd, onClose }) {
  const sizes = product.size_group ? products.filter((p) => p.size_group === product.size_group) : [product]
  const [id, setId] = useState(product.id)
  const p = sizes.find((s) => s.id === id) ?? product
  const [flavor, setFlavor] = useState(p.flavors.length === 1 ? p.flavors[0] : null)
  const need = p.flavors.length > 1 && !flavor
  return (
    <Sheet title={product.name} onClose={onClose}
      footer={<button type="button" className={`${styles.primary} ${styles.wide}`} disabled={need}
        onClick={() => { onAdd(p.id, flavor); onClose() }}>{need ? 'Избери вкус' : `Добави · ${euro(p.price_cents)}`}</button>}>
      {sizes.length > 1 && (
        <fieldset className={styles.fGroup}>
          <legend>Размер</legend>
          <div className={styles.pills}>
            {sizes.map((s) => (
              <button key={s.id} type="button" className={styles.pill} aria-pressed={s.id === id}
                onClick={() => { setId(s.id); setFlavor(s.flavors.length === 1 ? s.flavors[0] : null) }}>
                {s.size_label.split(' · ')[0]} · {euro(s.price_cents)}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {p.flavors.length > 1 && (
        <fieldset className={styles.fGroup}>
          <legend>Вкус {flavor ? <b>· {flavor}</b> : null}</legend>
          <div className={styles.pills}>
            {p.flavors.map((fl) => (
              <button key={fl} type="button" className={styles.pill} aria-pressed={flavor === fl} onClick={() => setFlavor(fl)}>{fl}</button>
            ))}
          </div>
        </fieldset>
      )}
    </Sheet>
  )
}

/** Колажът вдясно на началото (само на широк екран): по един продукт от вид,
 *  върху лаймов кръг, леко плуващи. Снимките са същите като в каталога. */
const HERO_PICK = ['core-champs-whey-2270', '6pak-creatine-500', 'izzi-rice-semolina-500', 'oetker-cocoa-100', 'keskin-peanut-butter-280']

function HeroArt({ products }) {
  const pick = HERO_PICK.map((id) => products.find((p) => p.id === id)).filter(Boolean)
  if (pick.length < 3) return null
  return (
    <div className={styles.heroArt} aria-hidden="true">
      <span className={styles.heroDisc} />
      {pick.map((p, i) => <img key={p.id} src={p.image} alt="" className={styles[`heroImg${i}`]} />)}
    </div>
  )
}
