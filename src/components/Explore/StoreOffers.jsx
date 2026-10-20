import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './StoreOffers.module.css'

/* Офертите от Lidl и Kaufland, подредени по това колко дава всяко евро.
 *
 * Редовете пише offers-sync всяка сутрин; тук само се четат. Макросите на
 * 100 г са от таблицата на храните във функцията — магазините не ги
 * публикуват — затова под списъка стои, че са ориентир. */

const TABS = [
  { id: 'protein', labelKey: 'so.tab.protein', match: o => o.macro === 'protein', sort: byPerEur },
  { id: 'carbs',   labelKey: 'so.tab.carbs',   match: o => o.macro === 'carbs',   sort: byPerEur },
  { id: 'fat',     labelKey: 'so.tab.fat',     match: o => o.macro === 'fat',     sort: byPerEur },
  { id: 'produce', labelKey: 'so.tab.produce', match: o => o.produce,             sort: byDiscount },
  { id: 'all',     labelKey: 'so.tab.all',     match: () => true,                 sort: byDiscount },
]

const STORES = [
  { id: null,       labelKey: 'so.store.all' },
  { id: 'lidl',     label: 'Lidl' },
  { id: 'kaufland', label: 'Kaufland' },
]

function byPerEur(a, b) { return (b.per_eur ?? -1) - (a.per_eur ?? -1) }
function byDiscount(a, b) { return (b.discount ?? -1) - (a.discount ?? -1) || a.price - b.price }

const todayIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Sofia' })

const money = n => Number(n).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const grams = n => Math.round(Number(n)).toLocaleString('bg-BG')
const shortDate = iso => { const [, m, d] = iso.split('-'); return `${d}.${m}.` }
const per100 = n => Number(n).toLocaleString('bg-BG', { maximumFractionDigits: 1 })

function OfferRow({ o }) {
  const { t } = useSettings()
  const macroKey = o.macro ? `so.macro.${o.macro}` : null
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.name}>{o.name}</span>
        <span className={styles.meta}>
          <span className={styles.store}>{o.store === 'lidl' ? 'Lidl' : 'Kaufland'}</span>
          {o.detail && <> · {o.detail}</>}
          {o.pack && <> · {o.pack}</>}
        </span>
        <span className={styles.per100}>
          {t('so.per100', { p: per100(o.protein), c: per100(o.carbs), f: per100(o.fat) })}
        </span>
        <span className={styles.until}>{t('so.until', { date: shortDate(o.valid_to) })}</span>
      </div>

      <div className={styles.rowSide}>
        <span className={styles.price}>
          {money(o.price)} €
          {o.discount > 0 && <span className={styles.discount}>−{o.discount}%</span>}
        </span>
        {o.old_price && <span className={styles.oldPrice}>{money(o.old_price)} €</span>}
        {o.per_eur != null && macroKey && (
          <span className={styles.yield} data-macro={o.macro}>
            <strong>{grams(o.per_eur)} г</strong> {t(macroKey)}
          </span>
        )}
      </div>
    </li>
  )
}

export default function StoreOffers({ onBack }) {
  const { t } = useSettings()
  const [rows, setRows] = useState(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState('protein')
  const [store, setStore] = useState(null)

  useEffect(() => {
    let alive = true
    const today = todayIso()
    supabase.from('store_offers')
      .select('id, store, name, detail, pack, price, old_price, discount, valid_to, macro, produce, protein, carbs, fat, per_eur')
      .lte('valid_from', today)
      .gte('valid_to', today)
      .limit(1000)
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { setFailed(true); setRows([]) }
        else setRows(data ?? [])
      })
    return () => { alive = false }
  }, [])

  const current = TABS.find(x => x.id === tab)
  const shown = useMemo(() => (rows ?? [])
    .filter(o => (!store || o.store === store) && current.match(o))
    .sort(current.sort), [rows, store, current])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">{t('ep.back')}</button>
        <h1 className={styles.title}>{t('so.title')}</h1>
        <p className={styles.subtitle}>{t('so.subtitle')}</p>
      </header>

      <div className={styles.tabs} role="tablist">
        {TABS.map(x => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            className={`${styles.tab} ${tab === x.id ? styles.tabActive : ''}`}
            data-macro={x.id}
            onClick={() => setTab(x.id)}
          >
            {t(x.labelKey)}
          </button>
        ))}
      </div>

      <div className={styles.stores}>
        {STORES.map(s => (
          <button
            key={s.id ?? 'all'}
            type="button"
            className={`${styles.storeBtn} ${store === s.id ? styles.storeBtnActive : ''}`}
            onClick={() => setStore(s.id)}
          >
            {s.label ?? t(s.labelKey)}
          </button>
        ))}
      </div>

      {rows === null ? (
        <p className={styles.empty}>{t('chat.loading')}</p>
      ) : failed ? (
        <p className={styles.empty}>{t('so.failed')}</p>
      ) : shown.length === 0 ? (
        <p className={styles.empty}>{t('so.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {shown.map(o => <OfferRow key={o.id} o={o} />)}
        </ul>
      )}

      <p className={styles.note}>{t('so.note')}</p>
    </div>
  )
}
