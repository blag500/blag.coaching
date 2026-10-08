import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../contexts/SettingsContext'
import Pictogram from '../Pictogram/Pictogram'
import styles from './CheatcodeOrders.module.css'

/* Поръчките от Чийт Код — работният екран на кухнята.
 *
 * Вижда го само собственикът (cheatcode_owner, миграция 126): редът носи име
 * и телефон на клиент, а треньорските акаунти са два. Проверката е и в
 * базата — тук само решаваме дали да показваме секцията изобщо.
 *
 * Отворените поръчки са отгоре, по реда, в който трябва да се сготвят.
 * Едно голямо копче мести поръчката напред: нова → потвърдена → готова →
 * взета. Отказът е отделно и по-тихо, защото е изключението. Новите поръчки
 * пристигат на живо (realtime, миграция 130); при връщане към приложението
 * списъкът се чете наново, в случай че връзката е спала. */

const NEXT = { new: 'confirmed', confirmed: 'ready', ready: 'picked_up' }
const OPEN = ['new', 'confirmed', 'ready']
const WEEK = 7 * 24 * 3600 * 1000

function euro(cents) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function hhmm(iso) {
  return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sofia' })
}

function dayLabel(iso, t) {
  const d = new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Sofia' })
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Sofia' })
  if (d === today) return t('cco.today')
  return new Date(iso).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', timeZone: 'Europe/Sofia' })
}

export default function CheatcodeOrders() {
  const { t } = useSettings()
  const [owner, setOwner]   = useState(false)
  const [orders, setOrders] = useState([])
  const [busy, setBusy]     = useState(null)
  const [showDone, setShowDone] = useState(false)

  const load = useCallback(async () => {
    const since = new Date(Date.now() - WEEK).toISOString()
    const { data } = await supabase
      .from('cheatcode_orders')
      .select('id, code, created_at, name, phone, email, mailed, pickup_time, note, lines, box_count, total_cents, status, test')
      .or(`status.in.(${OPEN.join(',')}),created_at.gte.${since}`)
      .order('created_at', { ascending: false })
      .limit(80)
    setOrders(data || [])
  }, [])

  useEffect(() => {
    let alive = true
    supabase.rpc('is_cheatcode_owner').then(({ data }) => { if (alive && data === true) setOwner(true) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!owner) return
    load()
    const channel = supabase
      .channel('cheatcode-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cheatcode_orders' }, () => load())
      .subscribe()
    const onShow = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onShow)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [owner, load])

  async function setStatus(order, status) {
    setBusy(order.id)
    const prev = orders
    setOrders(list => list.map(o => (o.id === order.id ? { ...o, status } : o)))
    const { error } = await supabase.from('cheatcode_orders').update({ status }).eq('id', order.id)
    if (error) setOrders(prev)
    setBusy(null)
  }

  if (!owner) return null

  const open = orders.filter(o => OPEN.includes(o.status))
    .sort((a, b) => OPEN.indexOf(a.status) - OPEN.indexOf(b.status) || a.created_at.localeCompare(b.created_at))
  const closed = orders.filter(o => !OPEN.includes(o.status))
  const fresh = open.filter(o => o.status === 'new').length

  return (
    <section className={styles.wrap} aria-label={t('cco.title')}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          {t('cco.title')}
          {fresh > 0 && <span className={styles.badge}>{fresh}</span>}
        </span>
        <span className={styles.headMeta}>{t('cco.open', { n: open.length })}</span>
      </div>

      {open.length === 0 ? (
        <p className={styles.empty}>{t('cco.empty')}</p>
      ) : (
        <div className={styles.list}>
          {open.map(o => <OrderCard key={o.id} o={o} t={t} busy={busy === o.id} onSet={setStatus} />)}
        </div>
      )}

      {closed.length > 0 && (
        <>
          <button type="button" className={styles.toggle} onClick={() => setShowDone(v => !v)} aria-expanded={showDone}>
            {showDone ? t('cco.hideDone') : t('cco.showDone', { n: closed.length })}
          </button>
          {showDone && (
            <div className={styles.list}>
              {closed.map(o => <OrderCard key={o.id} o={o} t={t} busy={busy === o.id} onSet={setStatus} />)}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function OrderCard({ o, t, busy, onSet }) {
  const next = NEXT[o.status]
  const allerg = [...new Set((o.lines || []).flatMap(l => l.allerg || []))]
  const closed = !OPEN.includes(o.status)
  return (
    <article className={`${styles.card} ${styles['s_' + o.status]} ${closed ? styles.closed : ''}`}>
      <div className={styles.top}>
        <span className={styles.code}>{o.code}</span>
        {o.test && <span className={styles.test}>{t('cco.test')}</span>}
        <span className={`${styles.status} ${styles['st_' + o.status]}`}>{t('cco.st.' + o.status)}</span>
      </div>

      <div className={styles.who}>
        <span className={styles.name}>{o.name}</span>
        <a href={`tel:${o.phone.replace(/\s+/g, '')}`} className={styles.phone}>
          <Pictogram name="phone" size={13} /> {o.phone}
        </a>
        {/* Имейл значи, че поръчката, „Готова“ и „Откажи“ пращат писмо на
            клиента (131, 132). До него — кои писма наистина са тръгнали:
            `mailed` се пише чак след като Resend е приел писмото. */}
        {o.email && (
          <span className={styles.email}>
            <Pictogram name="mail" size={13} /> {o.email}
            <span className={(o.mailed || []).length ? styles.mailed : styles.unmailed}>
              {(o.mailed || []).length
                ? t('cco.mail.sent', { list: o.mailed.map(s => t('cco.mail.' + s)).join(', ') })
                : t('cco.mail.none')}
            </span>
          </span>
        )}
      </div>

      <p className={styles.when}>
        {o.pickup_time
          ? t('cco.pickup', { time: o.pickup_time })
          : t('cco.noPickup')}
        <span className={styles.dot}>·</span>
        {t('cco.placed', { day: dayLabel(o.created_at, t), time: hhmm(o.created_at) })}
      </p>

      <ul className={styles.lines}>
        {(o.lines || []).map((l, i) => (
          <li key={i}>
            <div className={styles.lineTop}>
              <span><b>{l.qty}×</b> {l.name}</span>
              <span className={styles.num}>{euro(l.unit * l.qty)}</span>
            </div>
            {l.cfg && <span className={styles.cfg}>{l.cfg}</span>}
            <span className={styles.macros}>
              {l.kcal} {t('cco.kcal')} · <i className={styles.p}>{l.p}</i> · <i className={styles.c}>{l.c}</i> · <i className={styles.f}>{l.f}</i>
            </span>
          </li>
        ))}
      </ul>

      {allerg.length > 0 && <p className={styles.allerg}>{t('cco.allergens', { list: allerg.join(', ') })}</p>}
      {o.note && <p className={styles.note}>„{o.note}“</p>}

      <div className={styles.foot}>
        <span className={styles.total}>{euro(o.total_cents)}<small>{t('cco.boxes', { n: o.box_count })}</small></span>
        <div className={styles.actions}>
          {(o.status === 'new' || o.status === 'confirmed') && (
            <button type="button" className={styles.cancel} disabled={busy} onClick={() => onSet(o, 'cancelled')}>
              {t('cco.cancel')}
            </button>
          )}
          {next && (
            <button type="button" className={styles.next} disabled={busy} onClick={() => onSet(o, next)}>
              {t('cco.to.' + next)}
            </button>
          )}
          {closed && (
            <button type="button" className={styles.cancel} disabled={busy} onClick={() => onSet(o, 'new')}>
              {t('cco.reopen')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
