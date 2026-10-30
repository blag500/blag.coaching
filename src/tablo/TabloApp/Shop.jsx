import { useMemo, useState } from 'react'
import { Dot } from '../Charts/Charts.jsx'
import styles from './TabloApp.module.css'

/* Разделът „Магазин": колко печели всеки продукт. Цената на едро е в
 * shop_supply — чете я само собственикът (RLS), затова е тук, а не в /shop/.
 * Маржът е върху продажната цена: (цена − доставна) / цена. При промоция
 * се показва и маржът на промоционалната цена — с него се продава.
 * Поръчките: платените, без тестовите отпреди пускането на живо. */

const eur = (c) => (c / 100).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const pct = (x) => `${Math.round(x * 100)} %`
const level = (m) => (m < 0.15 ? 'high' : m < 0.25 ? 'watch' : 'ok')

const CATS = { protein: 'Протеин', creatine: 'Креатин', amino: 'Аминокиселини', preworkout: 'Преди тренировка',
  vitamins: 'Витамини', electrolytes: 'Електролити', snacks: 'Снаксове', pantry: 'За готвене' }
const SORTS = [
  { id: 'low', label: 'Най-нисък марж' },
  { id: 'high', label: 'Най-висок марж' },
  { id: 'eur', label: 'Най-много € на брой' },
]

export default function Shop({ products, supply, deals, orders }) {
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('low')

  const rows = useMemo(() => {
    const cost = new Map(supply.map((s) => [s.product_id, s]))
    const now = new Date()
    const live = new Map(deals.filter((d) => new Date(d.starts_at) <= now && new Date(d.ends_at) > now).map((d) => [d.product_id, d]))
    const next = new Map(deals.filter((d) => new Date(d.starts_at) > now).map((d) => [d.product_id, d]))
    return products.filter((p) => cost.has(p.id)).map((p) => {
      const c = cost.get(p.id).cost_cents
      const d = live.get(p.id)
      const sell = d ? d.deal_price_cents : p.price_cents
      return {
        ...p, cost: c, supplier: cost.get(p.id).supplier,
        margin: (p.price_cents - c) / p.price_cents, profit: p.price_cents - c,
        deal: d, dealMargin: d ? (d.deal_price_cents - c) / d.deal_price_cents : null,
        nextDeal: next.get(p.id), sellMargin: (sell - c) / sell,
      }
    })
  }, [products, supply, deals])

  const shown = rows.filter((r) => cat === 'all' || r.category === cat)
    .sort((a, b) => (sort === 'low' ? a.sellMargin - b.sellMargin : sort === 'high' ? b.sellMargin - a.sellMargin : b.profit - a.profit))

  // Средният марж — прост (по продукт), докато няма продажби, по които да се претегли.
  const avg = rows.length ? rows.reduce((s, r) => s + r.margin, 0) / rows.length : 0
  const thin = rows.filter((r) => r.sellMargin < 0.15).length
  const paid = orders.filter((o) => o.paid_at && !o.test_mode)
  const revenue = paid.reduce((s, o) => s + o.subtotal_cents, 0)
  const costOf = new Map(supply.map((s) => [s.product_id, s.cost_cents]))
  const gross = paid.reduce((s, o) => s + (o.items ?? []).reduce((t, i) => t + i.qty * (i.price_cents - (costOf.get(i.id) ?? i.price_cents)), 0), 0)
  const tests = orders.filter((o) => o.test_mode).length

  const stats = [
    { key: 'avg', label: 'Среден марж', value: pct(avg), sub: `${rows.length} продукта`, lv: level(avg) },
    { key: 'thin', label: 'Под 15 %', value: String(thin), sub: 'с цената, на която се продават сега', lv: thin ? 'watch' : 'ok' },
    { key: 'orders', label: 'Платени поръчки', value: String(paid.length), sub: tests ? `+ ${tests} тестови` : 'на живо' },
    { key: 'gross', label: 'Брутна печалба', value: eur(gross), sub: `от ${eur(revenue)} продажби` },
  ]

  return (
    <>
      <div className={styles.stats}>
        {stats.map((s) => (
          <div key={s.key} className={styles.stat}>
            <span className={styles.statLabel}>{s.lv && <Dot level={s.lv} />}{s.label}</span>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statSub}>{s.sub}</span>
          </div>
        ))}
      </div>

      <section className={styles.tile} aria-labelledby="shopH">
      <div className={styles.tileHead}><h2 id="shopH" className={styles.tileH}>Продуктите</h2><span className={styles.tileHint}>{shown.length} · доставна цена с ДДС</span></div>
      <div className={styles.chips} role="tablist" aria-label="Вид">
        {[['all', 'Всички'], ...Object.entries(CATS)].filter(([id]) => id === 'all' || rows.some((r) => r.category === id)).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={cat === id} className={styles.chip} onClick={() => setCat(id)}>{label}</button>
        ))}
      </div>

      <div className={styles.itemFoot}>
        <span />
        <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Подреди">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <ul className={styles.rows}>
        {shown.map((r) => (
          <li key={r.id} className={styles.item}>
            <span className={styles.itemMeta}>
              <Dot level={level(r.sellMargin)} />{CATS[r.category]} · {r.supplier}
              {r.deal && <> · <b>промоция до {new Date(r.deal.ends_at).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', timeZone: 'Europe/Sofia' })}</b></>}
              {r.nextDeal && <> · следващата седмица {eur(r.nextDeal.deal_price_cents)}</>}
            </span>
            <span className={styles.itemTitle}>{r.name} <span className={styles.statSub}>{r.size_label}</span></span>
            <span className={styles.marginRow}>
              <span><small>цена</small>{eur(r.price_cents)}</span>
              <span><small>доставна</small>{eur(r.cost)}</span>
              <span><small>марж</small><b>{pct(r.margin)}</b> · {eur(r.profit)}</span>
              {r.deal && <span><small>с промоцията</small><b>{pct(r.dealMargin)}</b> · {eur(r.deal.deal_price_cents - r.cost)}</span>}
            </span>
          </li>
        ))}
      </ul>
      </section>
    </>
  )
}
