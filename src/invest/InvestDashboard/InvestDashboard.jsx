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
 * вика същата функция веднага, вместо да чака часа.
 *
 * Златото тук е само в марката, не в данните: лентите и стълбовете носят
 * тоновете на сериите, а посоката — зелено и червено. Плътен метал върху
 * всяка лента правеше всичко еднакво важно. */

const RANGES = [
  { key: '1Д', days: 1 },
  { key: '1С', days: 7 },
  { key: '1М', days: 30 },
  { key: '3М', days: 91, daily: true },
  { key: '1Г', days: 365, daily: true },
  { key: 'ВСИЧКО', days: null, daily: true },
]

const DAY = 24 * 60 * 60 * 1000
const TOP = 5   // позиции със собствен цвят; останалите са „Други"

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

function share(v) {
  return new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 1 }).format(v * 100) + ' %'
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

function greeting(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Sofia', hour: 'numeric', hour12: false }).format(now))
  if (h < 5) return 'Лека нощ'
  if (h < 11) return 'Добро утро'
  if (h < 18) return 'Добър ден'
  return 'Добър вечер'
}

const seriesVar = (i) => `var(--series-${Math.min(i + 1, 6)})`

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
  const [split, setSplit] = useState('positions') // positions | currency
  const [refreshing, setRefreshing] = useState(false)
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(null)
  const [dayBase, setDayBase] = useState(null)

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
  const colorOf = useMemo(() => {
    const m = new Map()
    sortedPositions.forEach((p, i) => m.set(p.ticker, seriesVar(Math.min(i, TOP))))
    return m
  }, [sortedPositions])
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

  const parts = useMemo(
    () => (split === 'positions' ? allocation(positions, TOP) : byCurrency(positions)),
    [split, positions],
  )
  const months = useMemo(() => dividendsByMonth(dividends), [dividends])
  const divYear = useMemo(() => {
    const y = new Date().getFullYear()
    return dividends.filter((d) => new Date(d.paid_on).getFullYear() === y)
      .reduce((s, d) => s + Number(d.amount), 0)
  }, [dividends])
  const div12 = months.reduce((s, m) => s + m.value, 0)
  const divAll = dividends.reduce((s, d) => s + Number(d.amount), 0)
  const monthMax = Math.max(...months.map((m) => m.value), 0)

  /* Чиповете горе: какво си струва да се види, без да се превърта.
     Само факти — без оценка и без съвет. */
  const chips = useMemo(() => {
    if (!latest) return []
    const out = []
    if (today) out.push({ key: 'today', dot: today.abs >= 0 ? 'up' : 'down', title: 'Днес', text: `${signed(today.abs, cur)} · ${pct(today.pct)}` })
    const losing = positions.filter((p) => p.pnl < 0).length
    out.push({ key: 'pos', title: `${positions.length} позиции`, text: losing ? `${losing} на загуба` : 'всички на печалба' })
    const top = sortedPositions[0]
    if (top && latest.current_value > 0) {
      out.push({ key: 'top', color: seriesVar(0), title: 'Най-голям дял', text: `${shortTicker(top.ticker)} · ${share(top.value / latest.current_value)}` })
    }
    const lastDiv = dividends[0]
    if (lastDiv) {
      out.push({ key: 'div', title: 'Последен дивидент', text: `${money(Number(lastDiv.amount), cur)} · ${new Date(lastDiv.paid_on).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}` })
    }
    if (!historyDone) out.push({ key: 'sync', dot: 'wait', title: 'Историята', text: 'се тегли на части' })
    return out
  }, [latest, today, positions, sortedPositions, dividends, historyDone, cur])

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

  const now = new Date()

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.hello}>
          <span className={styles.date}>
            {now.toLocaleDateString('bg-BG', { timeZone: 'Europe/Sofia', weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className={styles.title}>{greeting(now)}</h1>
        </div>
        <div className={styles.headerSide}>
          {latest && <span className={styles.updated}>{ago(latest.taken_at)}</span>}
          <button
            className={styles.refresh}
            onClick={refresh}
            disabled={refreshing}
            aria-label="Обнови"
            data-spinning={refreshing || undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5" />
            </svg>
          </button>
        </div>
      </header>

      {note && <p className={styles.note}>{note}</p>}

      {state === 'empty' ? (
        <section className={styles.card}>
          <p className={styles.muted}>
            Още няма снимка на сметката. Натисни бутона горе вдясно — или изчакай следващия кръгъл час.
          </p>
        </section>
      ) : (
        <>
          <div className={styles.chips}>
            {chips.map((c) => (
              <span key={c.key} className={styles.chip}>
                {c.dot && <i className={`${styles.dot} ${styles[`dot_${c.dot}`]}`} />}
                {c.color && <i className={styles.dot} style={{ background: c.color }} />}
                <b>{c.title}</b>
                <span>{c.text}</span>
              </span>
            ))}
          </div>

          <div className={styles.grid}>
            <section className={`${styles.card} ${styles.hero}`}>
              <div className={styles.head}>
                <span className={styles.label}>Стойност на сметката</span>
                <span className={styles.label}>Trading 212 · Invest</span>
              </div>
              <strong className={styles.big}>{money(latest.total_value, cur)}</strong>
              {totalReturn != null ? (
                <span className={styles.deltaRow}>
                  <span className={`${styles.pill} ${tone(totalReturn)}`}>
                    {signed(totalReturn, cur)} · {pct(totalReturnPct)}
                  </span>
                  <span className={styles.meta}>спрямо внесеното</span>
                </span>
              ) : (
                <span className={styles.deltaRow}>
                  <span className={`${styles.pill} ${tone(latest.unrealized)}`}>{signed(latest.unrealized, cur)}</span>
                  <span className={styles.meta}>по отворените позиции</span>
                </span>
              )}

              <div className={styles.tiles}>
                <Tile label="Внесени нето" value={transactions.length ? money(deposited, cur) : '—'} meta={historyDone ? '' : 'тегли се'} />
                <Tile label="Нереализирана" value={signed(latest.unrealized, cur)} meta={latest.total_cost ? pct(latest.unrealized / latest.total_cost) : ''} toneValue={latest.unrealized} />
                <Tile label="Реализирана" value={signed(latest.realized, cur)} toneValue={latest.realized} />
                <Tile label="Кеш" value={money(latest.cash_free, cur)} meta={latest.cash_in_pies ? `+ ${money(latest.cash_in_pies, cur)} в пайове` : 'свободен'} />
                <Tile label="Инвестирано" value={money(latest.current_value, cur)} meta={latest.total_cost ? `платено ${money(latest.total_cost, cur, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}` : ''} />
                <Tile label="Дивиденти" value={money(divAll, cur)} meta="за цялото време" />
              </div>
            </section>

            <section className={`${styles.card} ${styles.chartCard}`}>
              <div className={styles.head}>
                <span className={styles.label}>Във времето</span>
                {rangeChange && (
                  <span className={`${styles.small} ${tone(rangeChange.abs)}`}>
                    {signed(rangeChange.abs, cur)} · {pct(rangeChange.pct)}
                  </span>
                )}
              </div>
              <Segmented
                label="Период"
                value={range}
                onChange={setRange}
                options={RANGES.map((r) => ({ value: r.key, label: r.key }))}
              />
              <ValueChart
                gradId="invest-value"
                points={series.map((s) => ({ t: new Date(s.taken_at).getTime(), v: Number(s.total_value) }))}
                steps={steps}
                currency={cur}
                daily={!!rangeDef.daily}
                trend={rangeChange ? Math.sign(rangeChange.abs) : 0}
              />
              <p className={styles.legend}>
                <span className={`${styles.keyValue} ${rangeChange && rangeChange.abs < 0 ? styles.keyDown : ''}`} /> стойност
                {steps.length > 0 && <><span className={styles.keyDeposit} /> внесени нето</>}
              </p>
            </section>

            <section className={`${styles.card} ${styles.positionsCard}`}>
              <div className={styles.head}>
                <span className={styles.label}>Позиции</span>
                <span className={styles.label}>{positions.length} · по стойност</span>
              </div>
              <ul className={styles.list}>
                {sortedPositions.map((p) => {
                  const ret = p.cost ? p.pnl / p.cost : null
                  const isOpen = open === p.ticker
                  return (
                    <li key={p.ticker}>
                      <button className={styles.row} onClick={() => setOpen(isOpen ? null : p.ticker)} aria-expanded={isOpen}>
                        <i className={styles.rowDot} style={{ background: colorOf.get(p.ticker) }} />
                        <span className={styles.rowMain}>
                          <span className={styles.name}>{shortName(p)}</span>
                          <span className={styles.meta}>{shortTicker(p.ticker)} · {num(p.qty, 4)} бр.</span>
                        </span>
                        <span className={styles.rowSide}>
                          <span className={styles.value}>{money(p.value, cur)}</span>
                          <span className={`${styles.pillSmall} ${tone(p.pnl)}`}>{pct(ret)}</span>
                        </span>
                      </button>
                      {isOpen && (
                        <dl className={styles.detail}>
                          <div><dt>Средна цена</dt><dd>{money(p.avg, p.currency)}</dd></div>
                          <div><dt>Текуща цена</dt><dd>{money(p.price, p.currency)}</dd></div>
                          <div><dt>Платено</dt><dd>{money(p.cost, cur)}</dd></div>
                          <div><dt>Печалба</dt><dd className={tone(p.pnl)}>{signed(p.pnl, cur)}</dd></div>
                          <div><dt>От курса</dt><dd className={tone(p.fx)}>{signed(p.fx, cur)}</dd></div>
                          <div><dt>Дял</dt><dd>{latest.current_value ? share(p.value / latest.current_value) : '—'}</dd></div>
                          {p.opened && <div><dt>Отворена</dt><dd>{new Date(p.opened).toLocaleDateString('bg-BG')}</dd></div>}
                        </dl>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className={`${styles.card} ${styles.splitCard}`}>
              <div className={styles.head}>
                <span className={styles.label}>Разпределение</span>
                <span className={styles.label}>{money(latest.current_value, cur, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</span>
              </div>
              <Segmented
                label="Разпределение по"
                value={split}
                onChange={setSplit}
                options={[{ value: 'positions', label: 'Позиции' }, { value: 'currency', label: 'Валута' }]}
              />
              {parts.length ? (
                <>
                  <div className={styles.stack} aria-hidden="true">
                    {parts.map((it, i) => (
                      <span key={it.key} style={{ flexGrow: it.share, background: it.key === '_rest' ? 'var(--series-6)' : seriesVar(i) }} />
                    ))}
                  </div>
                  <ul className={styles.legendList}>
                    {parts.map((it, i) => (
                      <li key={it.key}>
                        <i className={styles.rowDot} style={{ background: it.key === '_rest' ? 'var(--series-6)' : seriesVar(i) }} />
                        <span className={styles.legendName}>{it.label}</span>
                        <span className={styles.meta}>{share(it.share)}</span>
                        <span className={styles.legendValue}>{money(it.value, cur)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <p className={styles.muted}>Няма позиции.</p>}
            </section>

            <section className={`${styles.card} ${styles.divCard}`}>
              <div className={styles.head}>
                <span className={styles.label}>Дивиденти</span>
                <span className={styles.label}>по месеци</span>
              </div>
              <div className={styles.divStats}>
                <div><span className={styles.meta}>12 месеца</span><strong>{money(div12, cur)}</strong></div>
                <div><span className={styles.meta}>Тази година</span><strong>{money(divYear, cur)}</strong></div>
                <div><span className={styles.meta}>Общо</span><strong>{money(divAll, cur)}</strong></div>
              </div>
              <div className={styles.months} aria-label="Дивиденти по месеци">
                {months.map((m, i) => (
                  <div key={m.key} className={styles.month} title={`${m.date.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' })}: ${money(m.value, cur)}`}>
                    <span
                      className={`${styles.monthBar} ${i === months.length - 1 ? styles.monthNow : ''} ${m.value ? '' : styles.monthEmpty}`}
                      style={{ height: monthMax && m.value ? `${Math.max(6, (m.value / monthMax) * 100)}%` : undefined }}
                    />
                    <span className={styles.monthLabel}>
                      {m.date.toLocaleDateString('bg-BG', { month: 'short' }).replace('.', '').slice(0, 3)}
                    </span>
                  </div>
                ))}
              </div>
              {dividends.length > 0 && (
                <ul className={styles.payouts}>
                  {dividends.slice(0, 5).map((d) => (
                    <li key={d.reference}>
                      <i className={styles.rowDot} style={{ background: colorOf.get(d.ticker) ?? 'var(--series-6)' }} />
                      <span className={styles.legendName}>{shortName(d)}</span>
                      <span className={styles.meta}>{new Date(d.paid_on).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })}</span>
                      <span className={styles.up}>{money(Number(d.amount), cur)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <p className={styles.foot}>
            Снимка всеки час. Ключът към Trading 212 е само за четене.
          </p>
        </>
      )}
    </main>
  )
}

function Tile({ label, value, meta, toneValue }) {
  return (
    <div className={styles.tile}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.tileValue} ${tone(toneValue)}`}>{value}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
    </div>
  )
}

/* Сегментиран превключвател: една писта, избраното е светлото хапче в нея.
   Не злато — изборът е състояние, не действие. */
function Segmented({ label, value, options, onChange }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className={styles.segmented} role="tablist" aria-label={label} style={{ '--n': options.length, '--i': idx }}>
      <span className={styles.segThumb} aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={styles.segBtn}
          onClick={() => onChange(o.value)}
        >{o.label}</button>
      ))}
    </div>
  )
}
