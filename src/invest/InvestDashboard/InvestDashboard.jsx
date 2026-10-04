import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  allocation, byCurrency, changeSince, depositSteps, dividendsByMonth,
  netDeposits, shortName, shortTicker, sofiaMidnight,
} from '../calc'
import ValueChart from '../ValueChart/ValueChart.jsx'
import styles from './InvestDashboard.module.css'

/* Таблото за сметката в Trading 212.
 *
 * Чете само от базата — invest-sync пише там всеки час. Бутонът „Обнови"
 * вика същата функция веднага, вместо да чака часа. */

const RANGES = [
  { key: '1Д', days: 1 },
  { key: '1С', days: 7 },
  { key: '1М', days: 30 },
  { key: '3М', days: 91, daily: true },
  { key: '1Г', days: 365, daily: true },
  { key: 'ВСИЧКО', days: null, daily: true },
]

const DAY = 24 * 60 * 60 * 1000

function money(v, currency, opts = {}) {
  if (v == null || !Number.isFinite(v)) return '—'
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency', currency: currency || 'EUR',
    // „$" и „£", не „щ.д." и „GBP" — цените на книгите са в чужди валути.
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2, maximumFractionDigits: 2, ...opts,
  }).format(v)
}

function signed(v, currency) {
  if (v == null || !Number.isFinite(v)) return '—'
  return (v > 0 ? '+' : v < 0 ? '−' : '') + money(Math.abs(v), currency)
}

function pct(v) {
  if (v == null || !Number.isFinite(v)) return ''
  const s = new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    .format(Math.abs(v * 100))
  return (v > 0 ? '+' : v < 0 ? '−' : '') + s + ' %'
}

function num(v, digits = 2) {
  return new Intl.NumberFormat('bg-BG', { maximumFractionDigits: digits }).format(v)
}

function tone(v) {
  if (!v) return ''
  return v > 0 ? styles.up : styles.down
}

function ago(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'току-що'
  if (min < 60) return `преди ${min} мин`
  const h = Math.round(min / 60)
  if (h < 24) return `преди ${h} ч`
  return new Date(iso).toLocaleString('bg-BG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/* PostgREST връща най-много 1000 реда наведнъж; историята се чете на парчета. */
async function readAll(query, page = 1000) {
  const out = []
  for (let from = 0; ; from += page) {
    const { data, error } = await query().range(from, from + page - 1)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < page) return out
  }
}

export default function InvestDashboard() {
  const [state, setState] = useState('loading') // loading | signedOut | denied | empty | ready | error
  const [latest, setLatest] = useState(null)
  const [series, setSeries] = useState([])
  const [transactions, setTransactions] = useState([])
  const [dividends, setDividends] = useState([])
  const [syncState, setSyncState] = useState([])
  const [range, setRange] = useState('1М')
  const [refreshing, setRefreshing] = useState(false)
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(null)

  const rangeDef = RANGES.find((r) => r.key === range)

  const loadSeries = useCallback(async (def) => {
    const byTime = (rows) => rows.sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at))
    const since = def.days ? new Date(Date.now() - def.days * DAY).toISOString() : null
    if (def.daily) {
      const rows = await readAll(() => {
        let q = supabase.from('invest_daily').select('taken_at,total_value').order('day')
        if (since) q = q.gte('taken_at', since)
        return q
      })
      setSeries(byTime(rows))
    } else {
      const rows = await readAll(() => supabase.from('invest_snapshots')
        .select('taken_at,total_value').gte('taken_at', since).order('taken_at'))
      setSeries(byTime(rows))
    }
  }, [])

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setState('signedOut'); return }

    const { data: owner, error: ownerErr } = await supabase.rpc('is_invest_owner')
    if (ownerErr) { setState('error'); setNote(ownerErr.message); return }
    if (!owner) { setState('denied'); return }

    try {
      const [snap, tx, div, sync] = await Promise.all([
        supabase.from('invest_snapshots').select('*')
          .order('taken_at', { ascending: false }).limit(1),
        readAll(() => supabase.from('invest_transactions').select('reference,at,type,amount,currency').order('at')),
        readAll(() => supabase.from('invest_dividends').select('reference,paid_on,ticker,name,amount,currency').order('paid_on', { ascending: false })),
        supabase.from('invest_sync_state').select('kind,done'),
      ])
      if (snap.error) throw snap.error
      const last = snap.data?.[0] ?? null
      setLatest(last)
      setTransactions(tx)
      setDividends(div)
      setSyncState(sync.data ?? [])
      setState(last ? 'ready' : 'empty')
    } catch (e) {
      setState('error'); setNote(e.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (state !== 'ready') return
    loadSeries(rangeDef).catch((e) => setNote(e.message))
  }, [state, rangeDef, loadSeries, latest])

  /* Базата за „Днес": последната снимка преди софийската полунощ. */
  const [dayBase, setDayBase] = useState(null)
  useEffect(() => {
    if (!latest) return
    supabase.from('invest_snapshots').select('taken_at,total_value')
      .lt('taken_at', new Date(sofiaMidnight()).toISOString())
      .order('taken_at', { ascending: false }).limit(1)
      .then(({ data }) => setDayBase(data?.[0] ?? null))
  }, [latest])

  async function refresh() {
    setRefreshing(true)
    setNote('')
    const { data, error } = await supabase.functions.invoke('invest-sync', { body: {} })
    setRefreshing(false)
    if (error || data?.error) {
      let msg = data?.error || error?.message || 'Грешка'
      try { msg = (await error?.context?.json())?.error ?? msg } catch { /* оставя първото */ }
      setNote(`Не се обнови: ${msg}`)
      return
    }
    await load()
  }

  const cur = latest?.currency || 'EUR'
  const positions = useMemo(() => latest?.positions ?? [], [latest])
  const sortedPositions = useMemo(() => [...positions].sort((a, b) => b.value - a.value), [positions])
  const steps = useMemo(() => depositSteps(transactions), [transactions])
  const historyDone = syncState.length === 2 && syncState.every((s) => s.done)

  const deposited = netDeposits(transactions)
  const totalReturn = latest && transactions.length ? latest.total_value - deposited : null
  const totalReturnPct = totalReturn != null && deposited > 0 ? totalReturn / deposited : null
  const today = changeSince(latest, dayBase, transactions)

  const rangeChange = useMemo(() => {
    if (!latest || series.length < 2) return null
    return changeSince(latest, series[0], transactions)
  }, [latest, series, transactions])

  const alloc = useMemo(() => allocation(positions), [positions])
  const currencies = useMemo(() => byCurrency(positions), [positions])
  const months = useMemo(() => dividendsByMonth(dividends), [dividends])
  const divYear = useMemo(() => {
    const y = new Date().getFullYear()
    return dividends.filter((d) => new Date(d.paid_on).getFullYear() === y)
      .reduce((s, d) => s + Number(d.amount), 0)
  }, [dividends])
  const div12 = months.reduce((s, m) => s + m.value, 0)
  const divAll = dividends.reduce((s, d) => s + Number(d.amount), 0)
  const monthMax = Math.max(...months.map((m) => m.value), 0)

  if (state === 'loading') {
    return <main className={styles.page}><p className={styles.center}>Зарежда…</p></main>
  }
  if (state === 'signedOut') {
    return (
      <main className={styles.page}>
        <div className={styles.center}>
          <p>Таблото е зад входа на Blag.</p>
          <a className={styles.button} href="/">Влез в приложението</a>
        </div>
      </main>
    )
  }
  if (state === 'denied') {
    return <main className={styles.page}><p className={styles.center}>Нямаш достъп до това табло.</p></main>
  }
  if (state === 'error') {
    return <main className={styles.page}><p className={styles.center}>Грешка: {note}</p></main>
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>ИНВЕСТИЦИИ</h1>
          <p className={styles.sub}>
            Trading 212 · Invest{latest ? ` · обновено ${ago(latest.taken_at)}` : ''}
          </p>
        </div>
        <button className={styles.refresh} onClick={refresh} disabled={refreshing}>
          {refreshing ? 'Обновява…' : 'Обнови'}
        </button>
      </header>

      {note && <p className={styles.note}>{note}</p>}

      {state === 'empty' ? (
        <section className={styles.card}>
          <p className={styles.muted}>
            Още няма снимка на сметката. Натисни „Обнови" — или изчакай следващия кръгъл час.
          </p>
        </section>
      ) : (
        <>
          <section className={`${styles.card} ${styles.hero}`}>
            <span className={styles.label}>Стойност на сметката</span>
            <strong className={styles.big}>{money(latest.total_value, cur)}</strong>
            {totalReturn != null ? (
              <span className={`${styles.delta} ${tone(totalReturn)}`}>
                {signed(totalReturn, cur)} {pct(totalReturnPct)} <em>общо</em>
              </span>
            ) : (
              <span className={`${styles.delta} ${tone(latest.unrealized)}`}>
                {signed(latest.unrealized, cur)} <em>по отворените позиции</em>
              </span>
            )}

            <div className={styles.tiles}>
              <Tile label="Днес" value={today ? signed(today.abs, cur) : '—'} sub={today ? pct(today.pct) : 'утре'} toneValue={today?.abs} />
              <Tile label="Внесени нето" value={transactions.length ? money(deposited, cur) : '—'} sub={historyDone ? '' : 'историята се тегли'} />
              <Tile label="Нереализирана" value={signed(latest.unrealized, cur)} sub={latest.total_cost ? pct(latest.unrealized / latest.total_cost) : ''} toneValue={latest.unrealized} />
              <Tile label="Реализирана" value={signed(latest.realized, cur)} toneValue={latest.realized} />
              <Tile label="Кеш" value={money(latest.cash_free, cur)} sub={latest.cash_in_pies ? `+ ${money(latest.cash_in_pies, cur)} в пайове` : ''} />
              <Tile label="Дивиденти" value={money(divAll, cur)} sub="за цялото време" />
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.head}>
              <h2 className={styles.h2}>Във времето</h2>
              {rangeChange && (
                <span className={`${styles.small} ${tone(rangeChange.abs)}`}>
                  {signed(rangeChange.abs, cur)} {pct(rangeChange.pct)}
                </span>
              )}
            </div>
            <div className={styles.chips} role="tablist">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  role="tab"
                  aria-selected={range === r.key}
                  className={`${styles.chip} ${range === r.key ? styles.chipOn : ''}`}
                  onClick={() => setRange(r.key)}
                >{r.key}</button>
              ))}
            </div>
            <ValueChart
              gradId="invest-value"
              points={series.map((s) => ({ t: new Date(s.taken_at).getTime(), v: Number(s.total_value) }))}
              steps={steps}
              currency={cur}
              daily={!!rangeDef.daily}
            />
            <p className={styles.legend}>
              <span className={styles.keyValue} /> стойност
              {steps.length > 0 && <><span className={styles.keyDeposit} /> внесени нето</>}
            </p>
          </section>

          <section className={styles.card}>
            <div className={styles.head}>
              <h2 className={styles.h2}>Позиции</h2>
              <span className={styles.small}>{positions.length}</span>
            </div>
            <ul className={styles.list}>
              {sortedPositions.map((p) => {
                const ret = p.cost ? p.pnl / p.cost : null
                const isOpen = open === p.ticker
                return (
                  <li key={p.ticker}>
                    <button className={styles.row} onClick={() => setOpen(isOpen ? null : p.ticker)} aria-expanded={isOpen}>
                      <span className={styles.rowMain}>
                        <span className={styles.name}>{shortName(p)}</span>
                        <span className={styles.meta}>{shortTicker(p.ticker)} · {num(p.qty, 4)} бр.</span>
                      </span>
                      <span className={styles.rowSide}>
                        <span className={styles.value}>{money(p.value, cur)}</span>
                        <span className={`${styles.meta} ${tone(p.pnl)}`}>{signed(p.pnl, cur)} {pct(ret)}</span>
                      </span>
                    </button>
                    {isOpen && (
                      <dl className={styles.detail}>
                        <div><dt>Средна цена</dt><dd>{money(p.avg, p.currency)}</dd></div>
                        <div><dt>Текуща цена</dt><dd>{money(p.price, p.currency)}</dd></div>
                        <div><dt>Платено</dt><dd>{money(p.cost, cur)}</dd></div>
                        <div><dt>От курса</dt><dd className={tone(p.fx)}>{signed(p.fx, cur)}</dd></div>
                        <div><dt>Дял</dt><dd>{latest.current_value ? pct(p.value / latest.current_value).replace('+', '') : '—'}</dd></div>
                        {p.opened && <div><dt>Отворена</dt><dd>{new Date(p.opened).toLocaleDateString('bg-BG')}</dd></div>}
                      </dl>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          <section className={styles.card}>
            <h2 className={styles.h2}>Разпределение</h2>
            <Bars items={alloc} currency={cur} />
            <h3 className={styles.h3}>По валута на книгата</h3>
            <Bars items={currencies} currency={cur} />
          </section>

          <section className={styles.card}>
            <div className={styles.head}>
              <h2 className={styles.h2}>Дивиденти</h2>
              <span className={styles.small}>{money(divYear, cur)} тази година</span>
            </div>
            <div className={styles.months} aria-label="Дивиденти по месеци">
              {months.map((m) => (
                <div key={m.key} className={styles.month} title={`${m.key}: ${money(m.value, cur)}`}>
                  <span className={styles.monthBar} style={{ height: monthMax ? `${Math.max(2, (m.value / monthMax) * 100)}%` : '2%' }} />
                  <span className={styles.monthLabel}>
                    {m.date.toLocaleDateString('bg-BG', { month: 'narrow' })}
                  </span>
                </div>
              ))}
            </div>
            <p className={styles.small}>Последните 12 месеца: {money(div12, cur)}</p>
            {dividends.length > 0 && (
              <ul className={styles.payouts}>
                {dividends.slice(0, 6).map((d) => (
                  <li key={d.reference}>
                    <span>{shortName(d)}</span>
                    <span className={styles.meta}>{new Date(d.paid_on).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}</span>
                    <span className={styles.up}>{money(Number(d.amount), cur)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className={styles.foot}>
            Снимка всеки час. Ключът към Trading 212 е само за четене.
          </p>
        </>
      )}
    </main>
  )
}

function Tile({ label, value, sub, toneValue }) {
  return (
    <div className={styles.tile}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.tileValue} ${tone(toneValue)}`}>{value}</span>
      {sub && <span className={styles.meta}>{sub}</span>}
    </div>
  )
}

function Bars({ items, currency }) {
  if (!items.length) return <p className={styles.muted}>Няма позиции.</p>
  return (
    <ul className={styles.bars}>
      {items.map((it, i) => (
        <li key={it.key}>
          <span className={styles.barLabel}>{it.label}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: `${it.share * 100}%`, opacity: 1 - i * 0.09 }} />
          </span>
          <span className={styles.barValue} title={money(it.value, currency)}>
            {new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 1 }).format(it.share * 100)} %
          </span>
        </li>
      ))}
    </ul>
  )
}
