import { useEffect, useMemo, useState } from 'react'
import { euro } from './cart'
import { CATEGORIES, GOALS, PRICES, Sheet, TAGS, unitPrice } from './ui'
import styles from './Shop.module.css'

/* Каталогът. Всичко, което човек е избрал — търсене, цел, филтри, подредба —
 * живее в адреса (#/?goal=strength&cat=protein…), за да оцелее „назад“ и да
 * може да се прати като линк. Броят до всеки филтър е колко продукта ще
 * останат, ако се добави (проучването: най-силната промяна във филтрите). */

const SORTS = [
  { id: '', label: 'Препоръчани' },
  { id: 'dose', label: 'Цена на доза' },
  { id: 'price', label: 'Цена ↑' },
  { id: 'price-desc', label: 'Цена ↓' },
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

const perDose = (p) => (p.servings > 1 ? p.price_cents / p.servings : p.price_cents)

export default function Catalog({ products, query, onAdd }) {
  const [f, setF] = useState(() => readQuery(query))
  const [sheet, setSheet] = useState(false)
  const [quick, setQuick] = useState(null)

  useEffect(() => { writeQuery(f) }, [f])

  // Връщане от продукт: на същото място в списъка.
  useEffect(() => {
    const y = Number(sessionStorage.getItem('zs.scroll') || 0)
    if (y) requestAnimationFrame(() => window.scrollTo(0, y))
    return () => sessionStorage.setItem('zs.scroll', String(window.scrollY))
  }, [])

  // Размерите на един продукт са една карта; продуктът ги показва като бутони.
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

  const shown = useMemo(() => {
    const list = cards.filter((p) => passes(p, f))
    if (f.sort === 'dose') list.sort((a, b) => perDose(a) - perDose(b))
    if (f.sort === 'price') list.sort((a, b) => a.price_cents - b.price_cents)
    if (f.sort === 'price-desc') list.sort((a, b) => b.price_cents - a.price_cents)
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

  return (
    <>
      <section className={styles.hero}>
        <h1 className={styles.h1}>Добавки и протеинови снаксове</h1>
        <p className={styles.lead}>Тесен избор вместо хиляди продукти, подбран от треньор. Доставка с Еконт, Спиди или до вратата в София.</p>
      </section>

      <label className={styles.search}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input type="search" value={f.q} onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))}
          placeholder="Търси: креатин, ванилия, витамин D…" aria-label="Търси в магазина" />
      </label>

      <h2 className={styles.h2}>По цел</h2>
      <div className={styles.goals}>
        {GOALS.map((g) => (
          <button key={g.id} type="button" className={styles.goal} aria-pressed={f.goal.includes(g.id)} onClick={() => toggle('goal', g.id)}>
            <b>{g.label}</b><small>{g.hint}</small>
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
          {shown.map((p) => (
            <li key={p.id} className={styles.card}>
              <a href={`#/p/${p.id}`} className={styles.cardLink}>
                <img src={p.image} alt="" loading="lazy" width="300" height="300" />
                <span className={styles.cardName}>{p.name}</span>
                <span className={styles.cardSize}>{p.sizes > 1 ? `${p.sizes} размера` : p.size_label}</span>
                {p.flavors.length > 1 && <span className={styles.cardMeta}>{p.flavors.length} вкуса</span>}
              </a>
              <div className={styles.cardFoot}>
                <span className={styles.priceBox}>
                  <span className={styles.price}>{p.sizes > 1 ? 'от ' : ''}{euro(p.price_cents)}</span>
                  {unitPrice(p) && <span className={styles.unit}>{unitPrice(p)}</span>}
                </span>
                <button type="button" className={styles.addSmall}
                  onClick={() => (p.flavors.length > 1 || p.sizes > 1 ? setQuick(p) : onAdd(p.id, p.flavors[0] ?? null))}
                  aria-label={`Добави ${p.name} в количката`}>Добави</button>
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
          <legend>Вкус</legend>
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
