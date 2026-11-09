import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './TabloApp.module.css'
import s from './Money.module.css'

/* Разделът „Пари": къде отиват парите, кога идват новите разходи и колко
 * остава. Числата не са в кода (repo-то е публично): един ред JSON в
 * tablo_money, който чете само собственикът. Пише го компютърът —
 * D:\blag-ai\pari\build.py от картовото извлечение на Trading 212, Булбанк
 * и фиксираните разходи.
 *
 * Всичко напред е сметка тук: наличното днес, минус обичайното на ден,
 * минус графика (вноски, кредит, сметки, бръснар), плюс заплатата. Плъзгачите
 * горе („ако купя…“, „ако харча…“) местят всяка графика под тях. */

const CAT = {
  food: { label: 'Храна', color: 'var(--cat-food)' },
  coffee: { label: 'Кафе и закуски', color: 'var(--cat-coffee)' },
  moto: { label: 'Мотор и гориво', color: 'var(--cat-moto)' },
  clothes: { label: 'Дрехи', color: 'var(--cat-clothes)' },
  subs: { label: 'Абонаменти и техника', color: 'var(--cat-subs)' },
  travel: { label: 'Транспорт и пътувания', color: 'var(--cat-travel)' },
  bills: { label: 'Сметки', color: 'var(--cat-bills)' },
  other: { label: 'Други', color: 'var(--cat-other)' },
  debt: { label: 'Кредит', color: 'var(--cat-debt)' },
  invest: { label: 'Инвестиции', color: 'var(--cat-invest)' },
  care: { label: 'Бръснар', color: 'var(--cat-care)' },
  biz: { label: 'Благ Холдинг', color: 'var(--cat-other)' },
  salary: { label: 'Заплата', color: 'var(--ok)' },
  family: { label: 'От семейството', color: 'var(--ok)' },
  oneoff: { label: 'Еднократно', color: 'var(--warn)' },
  move: { label: 'Между сметките', color: 'var(--ink-3)' },
  fixed: { label: 'Фиксирано', color: 'var(--cat-debt)' },
}
const SPEND = ['food', 'coffee', 'moto', 'clothes', 'subs', 'travel', 'bills', 'other']
const MONTH_DAYS = 30.44

const eur = (v, d = 0) => `${(v ?? 0).toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d })} €`
const eur2 = (v) => eur(v, 2)
const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + eur(Math.abs(v), 2)
const toT = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))
const fromT = (t) => new Date(t).toISOString().slice(0, 10)
const add = (d, n) => fromT(toT(d) + n * 864e5)
const diff = (a, b) => Math.round((toT(b) - toT(a)) / 864e5)
const dm = (d) => `${+d.slice(8, 10)}.${d.slice(5, 7)}`
const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд']
const wd = (d) => (new Date(toT(d)).getUTCDay() + 6) % 7
const MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември']
const monthName = (ym) => MONTHS[+ym.slice(5, 7) - 1]
const todayISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Sofia' })

/* ── Сметката ─────────────────────────────────────────────────────────── */

function useModel(data, opts) {
  return useMemo(() => {
    if (!data) return null
    // one: 1 = еднократно, 2 = абонамент, който е във фиксираните — и двете не влизат в „на ден“.
    const card = data.card.map(([d, t, mer, amt, cat, one]) => ({ d, t, mer, amt, cat, one: one === 1, fix: one === 2 }))
    const days = diff(data.period[0], data.period[1]) + 1
    const regular = card.filter((r) => !r.one && !r.fix)
    const dailyRate = regular.reduce((a, r) => a + r.amt, 0) / days
    const perCat = Object.fromEntries(SPEND.map((c) => [c, regular.filter((r) => r.cat === c).reduce((a, r) => a + r.amt, 0) / days]))
    const cash = data.cash.t212 + data.cash.pot + data.cash.bank

    const daily = opts.daily ?? dailyRate
    const salary = opts.salary ?? data.salary.mid
    const events = data.events.map(([d, name, amt, kind]) => ({ d, name, amt: kind === 'salary' ? salary : amt, kind }))
    const last = events.reduce((m, e) => (e.d > m ? e.d : m), data.asOf)
    const byDay = new Map()
    for (const e of events) byDay.set(e.d, [...(byDay.get(e.d) ?? []), e])

    // Ден по ден: всекидневното и закръгленията излизат всеки ден, графикът — в своя.
    const proj = []
    let bal = cash - (opts.buy || 0)
    proj.push({ d: data.asOf, bal, evs: opts.buy ? [{ name: 'Покупката', amt: -opts.buy, kind: 'oneoff' }] : [] })
    for (let d = add(data.asOf, 1); d <= last; d = add(d, 1)) {
      const evs = byDay.get(d) ?? []
      bal += -daily - data.roundups + evs.reduce((a, e) => a + e.amt, 0)
      proj.push({ d, bal, evs })
    }
    const paydays = events.filter((e) => e.kind === 'salary').map((e) => e.d)
    const nextPay = paydays[0]
    const beforePay = proj.find((p) => p.d === add(nextPay, -1)) ?? proj[0]
    const low = proj.reduce((m, p) => (p.bal < m.bal ? p : m), proj[0])
    const free = low.bal - data.reserve
    const daysLeft = Math.max(1, diff(data.asOf, nextPay))
    // Колко може на ден до заплатата, така че в деня преди нея да остане резервът.
    const safeDaily = daily + (beforePay.bal - data.reserve) / daysLeft

    const fixed = data.fixed.map(([name, amt, freq, when, group]) => ({ name, amt, freq, when, group }))
    const fixedSum = fixed.reduce((a, f) => a + f.amt, 0)
    const everyday = daily * MONTH_DAYS
    const monthFree = salary - fixedSum - everyday

    return { card, days, dailyRate, perCat, cash, daily, salary, events, proj, paydays, nextPay, beforePay, low, free,
      daysLeft, safeDaily, fixed, fixedSum, everyday, monthFree, byDay }
  }, [data, opts.buy, opts.daily, opts.salary])
}

/* ── Малките части ────────────────────────────────────────────────────── */

function Tile({ id, title, hint, wide, children, className = '' }) {
  return (
    <section className={`${styles.tile} ${wide ? s.wide : ''} ${className}`} aria-labelledby={id}>
      <div className={styles.tileHead}><h2 id={id} className={styles.tileH}>{title}</h2>{hint && <span className={styles.tileHint}>{hint}</span>}</div>
      {children}
    </section>
  )
}

function Ring({ value, color, children, size = 132, stroke = 10 }) {
  const r = 50 - stroke / 2 - 1, c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className={s.ring} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--sunken)" strokeWidth={stroke} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${v * c} ${c}`} transform="rotate(-90 50 50)" className={s.ringArc} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div className={s.ringIn}>{children}</div>
    </div>
  )
}

/* Числото, което се брои нагоре, когато се промени. */
function Count({ value, fmt = eur }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const a = from.current, b = value, t0 = performance.now()
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(b); from.current = b; return }
    let raf
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 600), e = 1 - (1 - k) ** 3
      setShown(a + (b - a) * e)
      if (k < 1) raf = requestAnimationFrame(step); else from.current = b
    }
    raf = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value])
  return <>{fmt(shown)}</>
}

/* ── Горе: колко имаш, колко е свободно, колко дни остават ───────────── */

function Hero({ data, m }) {
  const cycle = diff(add(m.nextPay, -31), m.nextPay)
  const lv = m.free < 0 ? 'var(--bad)' : m.free < 150 ? 'var(--warn)' : 'var(--ok)'
  const parts = [
    { k: 'Trading 212', v: data.cash.t212, c: 'var(--cat-invest)' },
    { k: 'Spending pot', v: data.cash.pot, c: 'var(--cat-subs)' },
    { k: 'Булбанк', v: data.cash.bank, c: 'var(--cat-travel)' },
  ]
  return (
    <div className={s.hero}>
      <div className={`${s.heroMain} ${styles.tile}`}>
        <span className={s.kicker}>Свободни за монитор, дрехи, техника</span>
        <strong className={s.big} style={{ '--lv': lv }}><Count value={m.free} /></strong>
        <span className={s.heroSub}>
          Най-ниската точка до февруари е {eur(m.low.bal)} на {dm(m.low.d)}. Резервът от {eur(data.reserve)} стои настрана.
        </span>
        <div className={s.cashBar} aria-label="Къде са парите сега">
          {parts.map((p) => <span key={p.k} style={{ flexGrow: Math.max(p.v, m.cash * 0.02), background: p.c }} title={`${p.k}: ${eur2(p.v)}`} />)}
        </div>
        <div className={s.cashLegend}>
          <span>Имаш <b><Count value={m.cash} fmt={eur2} /></b></span>
          {parts.map((p) => <span key={p.k}><i style={{ background: p.c }} />{p.k} {eur2(p.v)}</span>)}
          <span><i style={{ background: 'var(--ink-3)' }} />Инвестирани {eur2(data.invested)}</span>
        </div>
      </div>

      <div className={`${s.heroRing} ${styles.tile}`}>
        <Ring value={1 - m.daysLeft / cycle} color="var(--select)">
          <b className={s.ringNum}>{m.daysLeft}</b><span className={s.ringUnit}>{m.daysLeft === 1 ? 'ден' : 'дни'}</span>
        </Ring>
        <div className={s.ringText}>
          <span className={s.kicker}>до заплатата</span>
          <b>{new Date(toT(m.nextPay)).toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</b>
          <span className={styles.muted}>{eur(data.salary.min)}–{eur(data.salary.max)}</span>
        </div>
      </div>

      <div className={`${s.heroRing} ${styles.tile}`}>
        <Ring value={m.safeDaily > 0 ? m.daily / m.safeDaily : 1} color={m.daily > m.safeDaily ? 'var(--bad)' : 'var(--ok)'}>
          <b className={s.ringNum}>{Math.max(0, Math.round(m.safeDaily))}</b><span className={s.ringUnit}>€ / ден</span>
        </Ring>
        <div className={s.ringText}>
          <span className={s.kicker}>можеш на ден</span>
          <b>харчиш {eur(m.daily, 1)}</b>
          <span className={styles.muted}>и на {dm(add(m.nextPay, -1))} пак остават {eur(data.reserve)}</span>
        </div>
      </div>
    </div>
  )
}

/* ── „Ако…“: плъзгачите ───────────────────────────────────────────────── */

function WhatIf({ data, m, buy, setBuy, daily, setDaily, salary, setSalary }) {
  const presets = [...data.outlet.map(([n, v]) => [n, v]), ['Монитор 250 €', 250], ['Монитор 400 €', 400]]
  return (
    <Tile id="ifH" title="Ако…" hint="местиш и всичко отдолу се смята наново" wide className={s.whatif}>
      <div className={s.sliders}>
        <label className={s.slider}>
          <span className={s.sliderHead}><span>Купувам днес</span><b>{eur(buy)}</b></span>
          <input id="m-buy" type="range" min="0" max="1000" step="5" value={buy} onChange={(e) => setBuy(+e.target.value)} />
          <span className={s.presets}>
            {presets.map(([n, v]) => (
              <button key={n} type="button" className={styles.chip} aria-selected={buy === v} onClick={() => setBuy(buy === v ? 0 : v)}>{n}</button>
            ))}
          </span>
        </label>
        <label className={s.slider}>
          <span className={s.sliderHead}><span>Харча на ден</span><b>{eur(daily, 1)}</b></span>
          <input id="m-daily" type="range" min="10" max="45" step="0.5" value={daily} onChange={(e) => setDaily(+e.target.value)} />
          <span className={styles.muted}>Досега: {eur(m.dailyRate, 1)} на ден без еднократните. Всеки евро по-малко на ден е {eur(MONTH_DAYS)} в месеца.</span>
        </label>
        <div className={s.slider}>
          <span className={s.sliderHead}><span>Заплата</span><b>{eur(salary)}</b></span>
          <div className={styles.seg} role="tablist">
            {[data.salary.min, data.salary.mid, data.salary.max].map((v) => (
              <button key={v} type="button" role="tab" aria-selected={salary === v} className={styles.segBtn} onClick={() => setSalary(v)}>{eur(v)}</button>
            ))}
          </div>
        </div>
      </div>
      <div className={s.verdict} data-lv={m.free < 0 ? 'bad' : m.free < 150 ? 'warn' : 'ok'}>
        {m.free >= 0
          ? <>След това остават <b>{eur(m.free)}</b> свободни до февруари. От декември всяка заплата ще ти оставя по <b>{eur(m.monthFree)}</b>: {eur(m.salary)} минус сметките ({eur(m.fixedSum)}) и {eur(m.daily)} на ден за всичко останало ({eur(m.everyday)}).</>
          : <>Не стига: на {dm(m.low.d)} ще си с <b>{eur(-m.free)}</b> под резерва. Изчакай заплатата или намали на ден.</>}
      </div>
    </Tile>
  )
}

/* ── Пистата: колко ще имаш всеки ден до февруари ────────────────────── */

function Runway({ data, m }) {
  const W = 960, H = 300, pad = { l: 52, r: 16, t: 28, b: 30 }
  const [hover, setHover] = useState(null)
  const ref = useRef(null)
  const p = m.proj
  const max = Math.max(...p.map((x) => x.bal), data.reserve) * 1.08
  const min = Math.min(0, ...p.map((x) => x.bal))
  const x = (i) => pad.l + (i / (p.length - 1)) * (W - pad.l - pad.r)
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b)
  const line = p.map((q, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(q.bal).toFixed(1)}`).join('')
  const area = `${line}L${x(p.length - 1)},${y(min)}L${x(0)},${y(min)}Z`
  const step = max > 2000 ? 500 : 250
  const ticks = []
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v)
  const months = p.map((q, i) => [q, i]).filter(([q]) => q.d.slice(8) === '01')

  function move(e) {
    const r = ref.current.getBoundingClientRect()
    const fx = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((fx - pad.l) / (W - pad.l - pad.r)) * (p.length - 1))
    setHover(Math.max(0, Math.min(p.length - 1, i)))
  }
  const h = hover != null ? p[hover] : null
  return (
    <Tile id="runH" title="Колко ще имаш всеки ден" hint={`до ${dm(p[p.length - 1].d)} · с ${eur(m.daily, 1)} на ден`} wide>
      <div className={s.chartWrap}>
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className={s.svg} onPointerMove={move} onPointerLeave={() => setHover(null)} role="img"
          aria-label="Наличното по дни до края на февруари">
          <defs>
            <linearGradient id="runFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--ok)" stopOpacity="0.45" />
              <stop offset="1" stopColor="var(--ok)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="runLine" x1="0" x2="0" y1={y(max)} y2={y(min)} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--ok)" />
              <stop offset={Math.max(0, Math.min(1, (y(data.reserve) - y(max)) / (y(min) - y(max))))} stopColor="var(--ok)" />
              <stop offset={Math.max(0, Math.min(1, (y(data.reserve) - y(max)) / (y(min) - y(max))))} stopColor="var(--bad)" />
              <stop offset="1" stopColor="var(--bad)" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={s.grid} />
              <text x={pad.l - 8} y={y(t)} dy="0.35em" textAnchor="end" className={s.axis}>{t.toLocaleString('bg-BG')}</text>
            </g>
          ))}
          {months.map(([q, i]) => (
            <text key={q.d} x={x(i)} y={H - 8} className={s.axis} textAnchor="middle">{monthName(q.d)}</text>
          ))}
          <rect x={pad.l} y={y(data.reserve)} width={W - pad.l - pad.r} height={Math.max(0, y(min) - y(data.reserve))} className={s.danger} />
          <line x1={pad.l} x2={W - pad.r} y1={y(data.reserve)} y2={y(data.reserve)} className={s.reserve} />
          <text x={W - pad.r} y={y(data.reserve) - 6} textAnchor="end" className={s.reserveText}>резерв {eur(data.reserve)}</text>
          <path d={area} fill="url(#runFill)" />
          <path d={line} fill="none" stroke="url(#runLine)" strokeWidth="2.5" strokeLinejoin="round" className={s.draw} />
          {p.map((q, i) => q.evs.some((e) => e.kind === 'salary') && (
            <g key={q.d}>
              <line x1={x(i)} x2={x(i)} y1={pad.t - 6} y2={y(min)} className={s.payLine} />
              <text x={x(i)} y={pad.t - 12} textAnchor="middle" className={s.payText}>заплата</text>
            </g>
          ))}
          <circle cx={x(p.indexOf(m.low))} cy={y(m.low.bal)} r="5" className={s.lowDot} />
          <text x={x(p.indexOf(m.low))} y={y(m.low.bal) + 18} textAnchor="middle" className={s.lowText}>дъно {eur(m.low.bal)}</text>
          <circle cx={x(0)} cy={y(p[0].bal)} r="5" className={s.nowDot} />
          {h && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(min)} className={s.cursor} />
              <circle cx={x(hover)} cy={y(h.bal)} r="5" className={s.cursorDot} />
            </g>
          )}
        </svg>
        {h && (
          <div className={s.tip} style={{ left: `${(x(hover) / W) * 100}%` }}>
            <b>{dm(h.d)} · {WD[wd(h.d)]}</b>
            <span className={s.tipBig}>{eur(h.bal)}</span>
            {h.evs.map((e, i) => <span key={i} className={s.tipRow}><i style={{ background: CAT[e.kind]?.color }} />{e.name}<em>{sign(e.amt)}</em></span>)}
            {!h.evs.length && hover > 0 && <span className={s.tipRow}>само обичайното, {eur(m.daily + data.roundups, 1)}</span>}
          </div>
        )}
      </div>
    </Tile>
  )
}

/* ── Потокът на една заплата ──────────────────────────────────────────── */

/* Всекидневните по вид; видовете под 45 € на месец стават един ред,
   иначе надписите им лягат един върху друг. */
function flowDaily(m) {
  const all = SPEND.map((c) => ({ k: CAT[c].label, v: (m.perCat[c] / m.dailyRate) * m.everyday, c: CAT[c].color, g: 'Всекидневни' }))
  const big = all.filter((n) => n.v >= 45)
  const rest = all.filter((n) => n.v < 45 && n.v > 0)
  if (rest.length) big.push({ k: 'Дребни (абонаменти, транспорт…)', v: rest.reduce((a, n) => a + n.v, 0), c: 'var(--cat-other)', g: 'Всекидневни' })
  return big
}

function Flow({ m }) {
  const nodes = [
    { k: 'Кредит', v: m.fixed.filter((f) => f.group === 'debt').reduce((a, f) => a + f.amt, 0), c: 'var(--cat-debt)', g: 'Фиксирани' },
    { k: 'VUSA и закръгляния', v: m.fixed.filter((f) => f.group === 'invest').reduce((a, f) => a + f.amt, 0), c: 'var(--cat-invest)', g: 'Фиксирани' },
    { k: 'Бръснар', v: m.fixed.filter((f) => f.group === 'care').reduce((a, f) => a + f.amt, 0), c: 'var(--cat-care)', g: 'Фиксирани' },
    { k: 'Сметки, абонаменти, паркинг', v: m.fixed.filter((f) => ['bills', 'subs', 'moto', 'biz'].includes(f.group)).reduce((a, f) => a + f.amt, 0), c: 'var(--cat-bills)', g: 'Фиксирани' },
    ...flowDaily(m),
  ].sort((a, b) => (a.g === b.g ? b.v - a.v : a.g === 'Фиксирани' ? -1 : 1))
  if (m.monthFree > 0) nodes.push({ k: 'Свободни', v: m.monthFree, c: 'var(--cat-free)', g: 'Остават' })
  const total = nodes.reduce((a, n) => a + n.v, 0)
  const W = 960, H = 440, gap = 6, nodeW = 14, lx = 150, rx = 620
  const usable = H - 20 - gap * (nodes.length - 1)
  const k = usable / total
  let ly = 10, ry = 10
  const ribbons = nodes.map((n) => {
    const h = n.v * k
    const r = { ...n, h, y0: ly, y1: ry }
    ly += h; ry += h + gap
    return r
  })
  const [on, setOn] = useState(null)
  return (
    <Tile id="flowH" title="Къде отива една заплата" hint={`${eur(m.salary)} · средно на месец`} wide>
      <div className={s.chartWrap}>
        <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label="Заплатата, разделена по разходи">
          <defs>
            {ribbons.map((r, i) => (
              <linearGradient key={i} id={`fl${i}`} x1="0" x2="1">
                <stop offset="0" stopColor="var(--ok)" stopOpacity="0.55" />
                <stop offset="1" stopColor={r.c} stopOpacity="0.8" />
              </linearGradient>
            ))}
          </defs>
          <rect x={lx - nodeW} y={10} width={nodeW} height={ly - 10} rx="4" fill="var(--ok)" className={s.glowOk} />
          <text x={lx - nodeW - 10} y={(ly + 10) / 2 - 8} textAnchor="end" className={s.flowBig}>Заплата</text>
          <text x={lx - nodeW - 10} y={(ly + 10) / 2 + 14} textAnchor="end" className={s.flowVal}>{eur(m.salary)}</text>
          {ribbons.map((r, i) => {
            const mx = (lx + rx) / 2
            const d = `M${lx},${r.y0} C${mx},${r.y0} ${mx},${r.y1} ${rx},${r.y1} L${rx},${r.y1 + r.h} C${mx},${r.y1 + r.h} ${mx},${r.y0 + r.h} ${lx},${r.y0 + r.h}Z`
            const dim = on != null && on !== i
            return (
              <g key={r.k} onPointerEnter={() => setOn(i)} onPointerLeave={() => setOn(null)} className={s.ribbon} style={{ opacity: dim ? 0.18 : 1 }}>
                <path d={d} fill={`url(#fl${i})`} />
                <rect x={rx} y={r.y1} width={nodeW} height={Math.max(2, r.h)} rx="3" fill={r.c} />
                <text x={rx + nodeW + 10} y={r.y1 + r.h / 2} dy="0.35em" className={s.flowLabel}>
                  {r.k} <tspan className={s.flowNum}>{eur(r.v)}</tspan> <tspan className={s.flowPct}>{Math.round((r.v / m.salary) * 100)} %</tspan>
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className={s.flowSum}>
        <span><i style={{ background: 'var(--cat-debt)' }} />Фиксирани <b>{eur(m.fixedSum)}</b></span>
        <span><i style={{ background: 'var(--cat-food)' }} />Всекидневни <b>{eur(m.everyday)}</b></span>
        <span><i style={{ background: 'var(--cat-free)' }} />Остават <b>{eur(m.monthFree)}</b></span>
      </div>
    </Tile>
  )
}

/* ── Календарът: кога идва всеки разход ───────────────────────────────── */

function Calendar({ data, m }) {
  const months = [...new Set([data.asOf.slice(0, 7), ...m.proj.map((p) => p.d.slice(0, 7))])]
  const [ym, setYm] = useState(months[0])
  const [pick, setPick] = useState(data.asOf)
  const first = `${ym}-01`
  const lead = wd(first)
  const len = diff(first, add(`${months[months.indexOf(ym) + 1] ?? add(first, 32).slice(0, 7)}-01`, 0))
  const realLen = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate()
  void len
  const projMap = new Map(m.proj.map((p) => [p.d, p]))
  const spentMap = new Map()
  for (const r of m.card) spentMap.set(r.d, (spentMap.get(r.d) ?? 0) + r.amt)
  const today = todayISO()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: realLen }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)]
  const sel = projMap.get(pick)
  const pickedCard = m.card.filter((r) => r.d === pick)
  return (
    <Tile id="calH" title="Календар на плащанията" hint="точка = плащане от графика" wide>
      <div className={styles.seg} role="tablist" aria-label="Месец">
        {months.map((x) => (
          <button key={x} type="button" role="tab" aria-selected={ym === x} className={styles.segBtn} onClick={() => setYm(x)}>{monthName(x)}</button>
        ))}
      </div>
      <div className={s.cal}>
        {WD.map((w) => <span key={w} className={s.calWd}>{w}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />
          const p = projMap.get(d)
          const evs = p?.evs ?? []
          const past = d <= data.asOf
          const spent = spentMap.get(d)
          const inflow = evs.some((e) => e.amt > 0)
          return (
            <button key={d} type="button" className={s.calDay} data-today={d === today || undefined} data-past={past || undefined}
              data-in={inflow || undefined} aria-pressed={pick === d} onClick={() => setPick(d)}>
              <span className={s.calNum}>{+d.slice(8)}</span>
              <span className={s.calDots}>{evs.map((e, j) => <i key={j} style={{ background: CAT[e.kind]?.color }} />)}</span>
              {p && !past && <span className={s.calBal} data-low={p.bal < data.reserve || undefined}>{Math.round(p.bal)}</span>}
              {past && spent && <span className={s.calSpent}>−{Math.round(spent)}</span>}
            </button>
          )
        })}
      </div>
      <div className={s.calDetail}>
        <b>{new Date(toT(pick)).toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</b>
        {sel && <span className={styles.muted}>Вечерта: {eur(sel.bal)}</span>}
        {sel?.evs.map((e, i) => <span key={i} className={s.tipRow}><i style={{ background: CAT[e.kind]?.color }} />{e.name}<em>{sign(e.amt)}</em></span>)}
        {pickedCard.map((r, i) => <span key={`c${i}`} className={s.tipRow}><i style={{ background: CAT[r.cat].color }} />{r.mer} · {r.t}<em>−{eur2(r.amt)}</em></span>)}
        {!sel?.evs.length && !pickedCard.length && <span className={styles.muted}>Нищо от графика. Само обичайното на ден.</span>}
      </div>
    </Tile>
  )
}

/* ── Поничката: дяловете ──────────────────────────────────────────────── */

function Donut({ m }) {
  const [withOne, setWithOne] = useState(false)
  const [on, setOn] = useState(null)
  const rows = SPEND.map((c) => ({ c, v: m.card.filter((r) => r.cat === c && (withOne || !r.one)).reduce((a, r) => a + r.amt, 0) }))
    .filter((r) => r.v > 0).sort((a, b) => b.v - a.v)
  const total = rows.reduce((a, r) => a + r.v, 0)
  const R = 80, C = 2 * Math.PI * R
  let acc = 0
  const act = on != null ? rows[on] : null
  return (
    <Tile id="donH" title="Дяловете" hint={`${m.days} дни · карта`}>
      <div className={styles.seg} role="tablist">
        <button type="button" role="tab" aria-selected={!withOne} className={styles.segBtn} onClick={() => setWithOne(false)}>Обичайното</button>
        <button type="button" role="tab" aria-selected={withOne} className={styles.segBtn} onClick={() => setWithOne(true)}>С еднократните</button>
      </div>
      <div className={s.donut}>
        <svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Дялове по вид">
          {rows.map((r, i) => {
            const len = (r.v / total) * C
            const el = (
              <circle key={r.c} cx="100" cy="100" r={R} fill="none" stroke={CAT[r.c].color} strokeWidth={on === i ? 30 : 22}
                strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 100 100)"
                className={s.seg2} onPointerEnter={() => setOn(i)} onPointerLeave={() => setOn(null)} />
            )
            acc += len
            return el
          })}
          <text x="100" y="94" textAnchor="middle" className={s.donutBig}>{eur(act ? act.v : total)}</text>
          <text x="100" y="116" textAnchor="middle" className={s.donutSub}>{act ? `${CAT[act.c].label} · ${Math.round((act.v / total) * 100)} %` : 'общо'}</text>
        </svg>
        <ul className={s.legend}>
          {rows.map((r, i) => (
            <li key={r.c} onPointerEnter={() => setOn(i)} onPointerLeave={() => setOn(null)} data-on={on === i || undefined}>
              <i style={{ background: CAT[r.c].color }} /><span>{CAT[r.c].label}</span>
              <b>{eur(r.v)}</b><em>{Math.round((r.v / total) * 100)} %</em>
            </li>
          ))}
        </ul>
      </div>
    </Tile>
  )
}

/* ── По месеци ────────────────────────────────────────────────────────── */

function Months({ m }) {
  const yms = [...new Set(m.card.map((r) => r.d.slice(0, 7)))]
  const [perDay, setPerDay] = useState(true)
  const span = (ym) => {
    const f = m.card.filter((r) => r.d.startsWith(ym)).map((r) => r.d).sort()
    const dim = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate()
    const a = ym === yms[0] ? +f[0].slice(8) : 1
    const b = ym === yms[yms.length - 1] ? +f[f.length - 1].slice(8) : dim
    return b - a + 1
  }
  const data = yms.map((ym) => {
    const n = span(ym)
    const vals = Object.fromEntries(SPEND.map((c) => [c, m.card.filter((r) => r.d.startsWith(ym) && r.cat === c).reduce((a, r) => a + r.amt, 0) / (perDay ? n : 1)]))
    return { ym, n, vals, tot: Object.values(vals).reduce((a, v) => a + v, 0) }
  })
  const top = Math.max(...data.map((d) => d.tot)) * 1.1
  return (
    <Tile id="monH" title="По месеци" hint={perDay ? '€ на ден — непълните месеци се сравняват честно' : 'общо за месеца'}>
      <div className={styles.seg} role="tablist">
        <button type="button" role="tab" aria-selected={perDay} className={styles.segBtn} onClick={() => setPerDay(true)}>На ден</button>
        <button type="button" role="tab" aria-selected={!perDay} className={styles.segBtn} onClick={() => setPerDay(false)}>За месеца</button>
      </div>
      <div className={s.months}>
        {data.map((d) => (
          <div key={d.ym} className={s.monCol}>
            <b className={s.monTot}>{eur(d.tot, perDay ? 1 : 0)}</b>
            <div className={s.monBar}>
              {SPEND.map((c) => d.vals[c] > 0 && (
                <span key={c} style={{ height: `${(d.vals[c] / top) * 100}%`, background: CAT[c].color }} title={`${CAT[c].label}: ${eur(d.vals[c], perDay ? 1 : 2)}`} />
              ))}
            </div>
            <span className={s.monName}>{monthName(d.ym).slice(0, 3)}{d.n < 28 ? ` · ${d.n} д.` : ''}</span>
          </div>
        ))}
      </div>
    </Tile>
  )
}

/* ── Топлинната карта: всеки ден ──────────────────────────────────────── */

function Heat({ data, m }) {
  const [on, setOn] = useState(null)
  const byDay = new Map()
  for (const r of m.card) byDay.set(r.d, [...(byDay.get(r.d) ?? []), r])
  const start = add(data.period[0], -wd(data.period[0]))
  const end = data.period[1]
  const weeks = Math.ceil((diff(start, end) + 1) / 7)
  const max = Math.max(...[...byDay.values()].map((rs) => rs.filter((r) => !r.one).reduce((a, r) => a + r.amt, 0)))
  const cell = 15, gap = 3
  const sel = on && byDay.get(on)
  return (
    <Tile id="heatH" title="Всеки ден" hint="по-ярко = повече · без еднократните">
      <div className={s.heatWrap}>
        <svg viewBox={`0 0 ${24 + weeks * (cell + gap)} ${7 * (cell + gap) + 16}`} className={s.heat} role="img" aria-label="Харчено по дни">
          {WD.map((w, i) => i % 2 === 0 && <text key={w} x="0" y={16 + i * (cell + gap) + cell * 0.75} className={s.axis}>{w}</text>)}
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const d = add(start, i)
            if (d < data.period[0] || d > end) return null
            const rs = byDay.get(d) ?? []
            const v = rs.filter((r) => !r.one).reduce((a, r) => a + r.amt, 0)
            const big = rs.some((r) => r.one)
            const col = Math.floor(i / 7), row = i % 7
            return (
              <rect key={d} x={24 + col * (cell + gap)} y={16 + row * (cell + gap)} width={cell} height={cell} rx="3"
                fill={v ? 'var(--cat-food)' : 'var(--sunken)'} fillOpacity={v ? 0.18 + 0.82 * Math.sqrt(v / max) : 1}
                stroke={big ? 'var(--warn)' : on === d ? 'var(--ink)' : 'none'} strokeWidth="1.5"
                onPointerEnter={() => setOn(d)} onClick={() => setOn(d)} className={s.heatCell}>
                <title>{`${dm(d)}: ${eur2(v)}`}</title>
              </rect>
            )
          })}
          {Array.from({ length: weeks }, (_, w) => {
            const d = add(start, w * 7)
            return d.slice(8) <= '07' && <text key={w} x={24 + w * (cell + gap)} y="10" className={s.axis}>{monthName(d).slice(0, 3)}</text>
          })}
        </svg>
      </div>
      <div className={s.heatDetail}>
        {sel ? (
          <>
            <b>{dm(on)} · {WD[wd(on)]} — {eur2(sel.reduce((a, r) => a + r.amt, 0))}</b>
            {sel.map((r, i) => <span key={i} className={s.tipRow}><i style={{ background: CAT[r.cat].color }} />{r.mer} · {r.t}<em>{eur2(r.amt)}</em></span>)}
          </>
        ) : <span className={styles.muted}>Посочи ден. Оранжевата рамка значи еднократна покупка.</span>}
      </div>
    </Tile>
  )
}

/* ── Навиците: по ден от седмицата и по час ───────────────────────────── */

function Habits({ data, m }) {
  const reg = m.card.filter((r) => !r.one)
  const nW = Array(7).fill(0)
  for (let d = data.period[0]; d <= data.period[1]; d = add(d, 1)) nW[wd(d)]++
  const byW = Array(7).fill(0); reg.forEach((r) => { byW[wd(r.d)] += r.amt })
  const avgW = byW.map((v, i) => v / nW[i])
  const byH = Array(24).fill(0); reg.forEach((r) => { byH[+r.t.slice(0, 2)] += r.amt })
  const mw = Math.max(...avgW), mh = Math.max(...byH)
  const topW = avgW.indexOf(mw)
  const peakH = byH.indexOf(mh)
  return (
    <Tile id="habH" title="Кога харчиш" hint="без еднократните">
      <div className={s.wdBars}>
        {avgW.map((v, i) => (
          <div key={i} className={s.wdCol} data-top={i === topW || undefined}>
            <span className={s.wdVal}>{Math.round(v)}</span>
            <span className={s.wdBar} style={{ height: `${(v / mw) * 100}%` }} />
            <span className={s.wdName}>{WD[i]}</span>
          </div>
        ))}
      </div>
      <p className={styles.muted}>Средно на ден от седмицата. Най-скъп е {['понеделникът', 'вторникът', 'сряда', 'четвъртъкът', 'петъкът', 'съботата', 'неделята'][topW]}: {eur(mw, 1)}.</p>
      <div className={s.hours}>
        {byH.map((v, h) => <span key={h} style={{ height: `${Math.max(3, (v / mh) * 100)}%`, opacity: v ? 1 : 0.25 }} title={`${h}:00 — ${eur(v)}`} data-peak={h === peakH || undefined} />)}
      </div>
      <div className={s.hoursAxis}><span>0</span><span>6</span><span>12</span><span>18</span><span>23 ч.</span></div>
      <p className={styles.muted}>Най-много отива около {peakH}:00 ({eur(mh)} за целия период).</p>
    </Tile>
  )
}

/* ── Наблюденията: изводите, които иначе се смятат на ръка ───────────── */

function Insights({ data, m }) {
  const reg = m.card.filter((r) => !r.one)
  const by = (re) => reg.filter((r) => re.test(r.mer))
  const kauf = by(/Kaufland/)
  const small = reg.filter((r) => r.amt < 5)
  const coffee = (ym) => m.card.filter((r) => r.cat === 'coffee' && r.d.startsWith(ym)).reduce((a, r) => a + r.amt, 0)
  const c9 = coffee('2026-09'), c10 = coffee('2026-10')
  const motoMonth = m.perCat.moto * MONTH_DAYS
  const ones = m.card.filter((r) => r.one).reduce((a, r) => a + r.amt, 0) + data.extra.reduce((a, [, v]) => a + v, 0)
  const items = [
    { lv: 'watch', big: `${kauf.length}×`, t: `Kaufland за ${m.days} дни — почти всеки ден, средно ${eur2(kauf.reduce((a, r) => a + r.amt, 0) / kauf.length)}. Едно голямо пазаруване седмично обикновено излиза по-евтино от седем малки.` },
    { lv: c10 > c9 ? 'watch' : 'ok', big: `${c10 > c9 ? '+' : ''}${Math.round(((c10 - c9) / c9) * 100)} %`, t: `Кафе и закуски: ${eur(c9)} през септември, ${eur(c10)} през октомври.` },
    { lv: 'info', big: eur(small.reduce((a, r) => a + r.amt, 0)), t: `${small.length} плащания под 5 € — ${Math.round((small.length / reg.length) * 100)} % от всички. Дребните не се усещат, но се трупат.` },
    { lv: 'info', big: eur(motoMonth), t: 'Моторът (гориво и части) на месец без еднократните ремонти. Паркомястото е отделно — 36 €.' },
    { lv: 'warn', big: eur(ones), t: `Еднократни за ${m.days} дни: части, костюм, Airbnb, тен за състезание… ≈ ${eur((ones / m.days) * MONTH_DAYS)} на месец. Резервът от ${eur(data.reserve)} е точно за тях.` },
    { lv: 'ok', big: `+${eur(3 * MONTH_DAYS)}`, t: 'Ако харчиш с 3 € по-малко на ден — толкова повече свободни на месец. Плъзни „Харча на ден“ горе и виж.' },
  ]
  return (
    <Tile id="insH" title="Какво виждам" hint="смята се от плащанията" wide>
      <div className={s.insights}>
        {items.map((it, i) => (
          <div key={i} className={s.insight} data-lv={it.lv}>
            <b>{it.big}</b><span>{it.t}</span>
          </div>
        ))}
      </div>
    </Tile>
  )
}

/* ── Къде плащаш най-много ────────────────────────────────────────────── */

function Merchants({ m }) {
  const map = new Map()
  for (const r of m.card) {
    const x = map.get(r.mer) ?? { mer: r.mer, v: 0, n: 0, cat: r.cat }
    x.v += r.amt; x.n++; map.set(r.mer, x)
  }
  const rows = [...map.values()].sort((a, b) => b.v - a.v).slice(0, 12)
  const max = rows[0]?.v || 1
  return (
    <Tile id="merH" title="Където плащаш най-много" hint="топ 12 · целият период">
      <ul className={s.merch}>
        {rows.map((r) => (
          <li key={r.mer}>
            <span className={s.merchFill} style={{ width: `${(r.v / max) * 100}%`, background: CAT[r.cat].color }} />
            <span className={s.merchName}>{r.mer}</span>
            <span className={s.merchN}>{r.n}×</span>
            <b>{eur(r.v)}</b>
          </li>
        ))}
      </ul>
    </Tile>
  )
}

/* ── Фиксираните ──────────────────────────────────────────────────────── */

function Fixed({ m }) {
  const max = Math.max(...m.fixed.map((f) => f.amt))
  return (
    <Tile id="fixH" title="Всеки месец, сигурно" hint={`${eur(m.fixedSum)} на месец`}>
      <ul className={s.fixed}>
        {m.fixed.map((f) => (
          <li key={f.name}>
            <i style={{ background: CAT[f.group]?.color ?? 'var(--cat-other)' }} />
            <span className={s.fixedName}>{f.name}<em>{f.when}</em></span>
            <span className={s.fixedTrack}><span style={{ width: `${(f.amt / max) * 100}%`, background: CAT[f.group]?.color ?? 'var(--cat-other)' }} /></span>
            <b>{eur2(f.amt)}</b>
          </li>
        ))}
      </ul>
    </Tile>
  )
}

/* ── Булбанк и еднократните ───────────────────────────────────────────── */

function Bank({ data, m }) {
  const rows = [...data.bank].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  const ones = [
    ...m.card.filter((r) => r.one).map((r) => [r.d, r.mer, r.amt, 'карта']),
    ...data.extra.map(([d, v]) => [d, 'Превод от Trading 212', v, 'превод']),
    ...data.bank.filter((b) => b[3] === 'oneoff').map(([d, n, v]) => [d, n, -v, 'Булбанк']),
  ].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  return (
    <>
      <Tile id="bankH" title="Булбанк" hint="заплатата, кредитът, сметките">
        <ul className={s.rows}>
          {rows.map(([d, n, v, k], i) => (
            <li key={i}><span className={s.rowD}>{dm(d)}</span><i style={{ background: CAT[k]?.color }} /><span className={s.rowN}>{n}</span><b data-in={v > 0 || undefined}>{sign(v)}</b></li>
          ))}
        </ul>
      </Tile>
      <Tile id="oneH" title="Еднократните" hint={`${ones.length} · ${eur(ones.reduce((a, r) => a + r[2], 0))}`}>
        <ul className={s.rows}>
          {ones.map(([d, n, v, k], i) => (
            <li key={i}><span className={s.rowD}>{dm(d)}</span><i style={{ background: 'var(--warn)' }} /><span className={s.rowN}>{n}<em>{k}</em></span><b>−{eur2(v)}</b></li>
          ))}
        </ul>
      </Tile>
    </>
  )
}

/* ── Всички плащания ──────────────────────────────────────────────────── */

function Ledger({ m }) {
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('date')
  const [all, setAll] = useState(false)
  const rows = m.card.filter((r) => (cat === 'all' || r.cat === cat) && (!q || r.mer.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (sort === 'date' ? (b.d + b.t).localeCompare(a.d + a.t) : b.amt - a.amt))
  const sum = rows.reduce((a, r) => a + r.amt, 0)
  return (
    <Tile id="ledH" title="Всички плащания с картата" hint={`${rows.length} · ${eur2(sum)}`} wide>
      <div className={s.ledTools}>
        <input id="m-q" className={s.search} type="search" placeholder="Търси търговец…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className={styles.seg} role="tablist">
          <button type="button" role="tab" aria-selected={sort === 'date'} className={styles.segBtn} onClick={() => setSort('date')}>По дата</button>
          <button type="button" role="tab" aria-selected={sort === 'amt'} className={styles.segBtn} onClick={() => setSort('amt')}>По сума</button>
        </div>
      </div>
      <div className={styles.chips} role="tablist" aria-label="Вид">
        {[['all', 'Всички'], ...SPEND.map((c) => [c, CAT[c].label])].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={cat === id} className={styles.chip} onClick={() => setCat(id)}>
            {id !== 'all' && <i className={s.chipDot} style={{ background: CAT[id].color }} />}{label}
          </button>
        ))}
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>Дата</th><th>Час</th><th>Търговец</th><th>Вид</th><th className={s.r}>Сума</th></tr></thead>
          <tbody>
            {(all ? rows : rows.slice(0, 30)).map((r, i) => (
              <tr key={i} data-one={r.one || undefined}>
                <td className={s.num}>{dm(r.d)}</td><td className={s.num}>{r.t}</td><td>{r.mer}</td>
                <td><span className={s.tag} style={{ '--c': CAT[r.cat].color }}>{CAT[r.cat].label}</span>{r.one && <span className={s.tag} style={{ '--c': 'var(--warn)' }}>еднократно</span>}</td>
                <td className={`${s.num} ${s.r}`}>{eur2(r.amt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 30 && <button type="button" className={styles.chip} onClick={() => setAll(!all)}>{all ? 'По-малко' : `Покажи всички ${rows.length}`}</button>}
    </Tile>
  )
}

/* ── Разделът ─────────────────────────────────────────────────────────── */

export default function Money() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [buy, setBuy] = useState(0)
  const [daily, setDaily] = useState(null)
  const [salary, setSalary] = useState(null)

  useEffect(() => {
    supabase.from('tablo_money').select('data, updated_at').eq('id', 'current').maybeSingle().then(({ data: row, error }) => {
      if (error) setErr(error.message)
      else if (!row) setErr('Още няма данни. Пусни D:\\blag-ai\\pari\\build.py и money.sql.')
      else { setData(row.data); setSalary(row.data.salary.mid) }
    })
  }, [])

  const base = useModel(data, {})
  const dailyNow = daily ?? (base ? Math.round(base.dailyRate * 2) / 2 : 24)
  const m = useModel(data, { buy, daily: dailyNow, salary })

  if (err) return <p className={styles.empty}>{err}</p>
  if (!m) return <p className={styles.empty}>Зарежда…</p>

  return (
    <div className={s.page}>
      <Hero data={data} m={m} />
      <WhatIf data={data} m={m} buy={buy} setBuy={setBuy} daily={dailyNow} setDaily={setDaily} salary={salary} setSalary={setSalary} />
      <Runway data={data} m={m} />
      <Flow m={m} />
      <Insights data={data} m={m} />
      <Calendar data={data} m={m} />
      <Donut m={m} />
      <Months m={m} />
      <Heat data={data} m={m} />
      <Habits data={data} m={m} />
      <Merchants m={m} />
      <Fixed m={m} />
      <Bank data={data} m={m} />
      <Ledger m={m} />
      <p className={s.source}>Към {dm(data.asOf)} · карта от {dm(data.period[0])} до {dm(data.period[1])} (извлечение от Paynetics{data.cardEnd && data.cardEnd < data.period[1] ? ` до ${dm(data.cardEnd)}, после от Trading 212 без имената` : ''}), Булбанк. Обновява се всеки час. Напред е сметка, не обещание.</p>
    </div>
  )
}
