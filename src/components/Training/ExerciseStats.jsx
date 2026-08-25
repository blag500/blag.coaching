import { useMemo, useId } from 'react'
import { e1RM, kg, bigNum, dayDate, weeklyCounts, MONTHS_SHORT } from '../../utils/training'
import styles from './ExerciseStats.module.css'

const W = 320, H = 150
const PL = 38, PR = 10, PT = 12, PB = 24
const CW = W - PL - PR
const CH = H - PT - PB

function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i]
    const dx = (c.x - p.x) * 0.4
    d += ` C${p.x + dx},${p.y} ${c.x - dx},${c.y} ${c.x},${c.y}`
  }
  return d
}

/** A date as it fits under a tick: "14 мар". */
const tick = ds => {
  const d = dayDate(ds)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()}`
}

/**
 * A measurement over time.
 *
 * Every axis here is a weight, so the scale is padded rather than zeroed: a 2kg
 * gain on a 100kg lift is the whole story of a training block, and a chart that
 * starts at zero draws it as a flat line.
 */
function LineChart({ points, color, unit, format = kg }) {
  const gid = useId().replace(/:/g, '')
  if (points.length === 0) return <p className={styles.noData}>Няма данни.</p>

  const vals = points.map(p => p.value)
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const pad = Math.max((hi - lo) * 0.2, Math.max(hi * 0.02, 1))
  const min = lo - pad, max = hi + pad
  const range = max - min || 1

  const toX = i => PL + (i / Math.max(points.length - 1, 1)) * CW
  const toY = v => PT + (1 - (v - min) / range) * CH
  const pts = points.map((p, i) => ({ ...p, x: toX(i), y: toY(p.value) }))
  const line = smoothPath(pts)
  const last = pts[pts.length - 1]
  const area = pts.length > 1
    ? `${line} L${last.x},${H - PB} L${pts[0].x},${H - PB} Z`
    : null

  const yTicks = [0, 1, 2, 3].map(i => {
    const v = min + (i / 3) * range
    return { v, y: toY(v) }
  })
  const n = pts.length
  const xIdxs = n <= 3 ? [...Array(n).keys()] : [0, Math.round((n - 1) / 2), n - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map(t => (
        <g key={t.y}>
          <line x1={PL} y1={t.y} x2={W - PR} y2={t.y} stroke="var(--border)" strokeWidth="1" />
          <text x={PL - 5} y={t.y + 3.5} textAnchor="end" fontSize="9" fill="var(--muted)"
                fontFamily="var(--font-body)">{format(t.v)}</text>
        </g>
      ))}

      {xIdxs.map(i => (
        <text key={i} x={pts[i].x} y={H - PB + 14} textAnchor="middle" fontSize="9"
              fill="var(--muted)" fontFamily="var(--font-body)">{tick(pts[i].date)}</text>
      ))}

      {area && <path d={area} fill={`url(#${gid})`} />}
      {pts.length > 1 && (
        <path d={line} fill="none" stroke={color} strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
      )}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 3} fill={color} />
      ))}
      <text x={last.x} y={Math.max(PT + 8, last.y - 9)} textAnchor={last.x > W - 50 ? 'end' : 'middle'}
            fontSize="10.5" fill={color} fontFamily="var(--font-heading)">
        {format(last.value)}{unit}
      </text>
    </svg>
  )
}

/** A count or a total per period. Bars start at zero, because they are amounts. */
function BarChart({ bars, color, format = bigNum, integer = false }) {
  if (!bars.length) return <p className={styles.noData}>Няма данни.</p>
  const raw = Math.max(...bars.map(b => b.value), 1)
  // A count axis rounded up to an even number, so the midpoint tick is a whole
  // session rather than 1.5 rounded to 2 — which drew an axis reading 0, 2, 3.
  const max = integer ? Math.max(2, Math.ceil(raw / 2) * 2) : raw
  const slot = CW / bars.length
  const bw = Math.max(2, Math.min(slot * 0.68, 22))

  const yTicks = [0, 1, 2].map(i => {
    const v = (i / 2) * max
    return { v, y: PT + (1 - i / 2) * CH }
  })
  const n = bars.length
  const xIdxs = n <= 3 ? [...Array(n).keys()] : [0, Math.round((n - 1) / 2), n - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img">
      {yTicks.map(t => (
        <g key={t.y}>
          <line x1={PL} y1={t.y} x2={W - PR} y2={t.y} stroke="var(--border)" strokeWidth="1" />
          <text x={PL - 5} y={t.y + 3.5} textAnchor="end" fontSize="9" fill="var(--muted)"
                fontFamily="var(--font-body)">{format(t.v)}</text>
        </g>
      ))}

      {bars.map((b, i) => {
        const h = (b.value / max) * CH
        const x = PL + i * slot + (slot - bw) / 2
        return (
          <rect key={i} x={x} y={PT + CH - h} width={bw} height={Math.max(b.value > 0 ? 2 : 0, h)}
                rx="2" fill={color} opacity={b.value > 0 ? 1 : 0}>
            <title>{`${b.label} — ${format(b.value)}`}</title>
          </rect>
        )
      })}

      {xIdxs.map(i => (
        <text key={i} x={PL + i * slot + slot / 2} y={H - PB + 14} textAnchor="middle" fontSize="9"
              fill="var(--muted)" fontFamily="var(--font-body)">{bars[i].label}</text>
      ))}
    </svg>
  )
}

function Panel({ title, sub, children }) {
  return (
    <section className={styles.panel}>
      <h3 className={styles.panelTitle}>{title}</h3>
      {sub && <p className={styles.panelSub}>{sub}</p>}
      {children}
    </section>
  )
}

/**
 * One lift, over its whole history.
 *
 * The old progression chart plotted a single line for a single exercise and
 * left the reader to work out whether a heavier bar for fewer reps was
 * progress. Four measurements answer that between them: the heaviest set is the
 * number people actually chase, the estimated 1RM is the one that accounts for
 * reps, volume is how much work it took, and frequency is whether the lift is
 * being trained at all — which is nearly always the real explanation for a
 * flat line.
 */
export default function ExerciseStats({ name, sessions, onBack }) {
  const data = useMemo(() => {
    const rows = []
    for (const s of [...sessions].reverse()) {          // oldest first
      const ex = s.exerciseList?.find(e => e.name === name)
      if (!ex) continue
      let topWeight = 0, best1rm = 0, volume = 0, reps = 0
      for (const set of ex.sets) {
        const w = Number(set.weight) || 0
        topWeight = Math.max(topWeight, w)
        best1rm = Math.max(best1rm, e1RM(w, set.reps))
        volume += w * (Number(set.reps) || 0)
        reps += Number(set.reps) || 0
      }
      rows.push({ date: s.date, topWeight, best1rm, volume, reps, sets: ex.sets.length })
    }
    return rows
  }, [sessions, name])

  const weekly = useMemo(
    () => weeklyCounts(data.map(r => r.date), 20),
    [data],
  )

  if (!data.length) {
    return (
      <div className={styles.page}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Назад">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
        <p className={styles.noData}>Няма логнати серии за {name}.</p>
      </div>
    )
  }

  const bestWeight = Math.max(...data.map(r => r.topWeight))
  const best1rm = Math.max(...data.map(r => r.best1rm))
  const bestVolume = Math.max(...data.map(r => r.volume))
  const totalSets = data.reduce((a, r) => a + r.sets, 0)

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Назад">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
        <h1 className={styles.name}>{name}</h1>
      </div>

      <div className={styles.summary}>
        <div className={styles.sumCell}>
          <span className={styles.sumNum}>{kg(bestWeight)}<span className={styles.sumUnit}>кг</span></span>
          <span className={styles.sumLabel}>НАЙ-ТЕЖКА СЕРИЯ</span>
        </div>
        <div className={styles.sumCell}>
          <span className={styles.sumNum}>{kg(best1rm)}<span className={styles.sumUnit}>кг</span></span>
          <span className={styles.sumLabel}>ИЗЧИСЛЕН 1ПМ</span>
        </div>
        <div className={styles.sumCell}>
          <span className={styles.sumNum}>{bigNum(bestVolume)}</span>
          <span className={styles.sumLabel}>НАЙ-ДОБЪР ОБЕМ</span>
        </div>
        <div className={styles.sumCell}>
          <span className={styles.sumNum}>{totalSets}</span>
          <span className={styles.sumLabel}>СЕРИИ ОБЩО</span>
        </div>
      </div>

      <Panel title="ЛИЧЕН РЕКОРД" sub="най-тежката серия във всяка тренировка">
        <LineChart points={data.map(r => ({ date: r.date, value: r.topWeight }))}
                   color="var(--accent)" unit="кг" />
      </Panel>

      <Panel title="ИЗЧИСЛЕН 1ПМ" sub="тежест и повторения заедно, по Epley">
        <LineChart points={data.map(r => ({ date: r.date, value: r.best1rm }))}
                   color="#CE93D8" unit="кг" />
      </Panel>

      <Panel title="ОБЕМ" sub="тежест × повторения за тренировка">
        <BarChart bars={data.map(r => ({ label: tick(r.date), value: r.volume }))}
                  color="#4FC3F7" />
      </Panel>

      <Panel title="ЧЕСТОТА" sub="тренировки с това упражнение на седмица">
        <BarChart
          bars={weekly.map(b => ({ label: tick(b.start), value: b.value }))}
          color="#81C784"
          format={v => String(Math.round(v))}
          integer
        />
      </Panel>
    </div>
  )
}
