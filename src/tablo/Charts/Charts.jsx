import { useId } from 'react'
import styles from './Charts.module.css'

/* Графиките на таблото. Само SVG, без библиотека — като WeightChart.
 * Цветовете идват от темата: --ok, --accent, --red, --series-*. */

const LEVEL_COLOR = { ok: 'var(--ok)', watch: 'var(--accent)', high: 'var(--red)' }

/* Пръстенът със здравето: по една дъга на светлина, в нейния цвят, с
   процеп между тях. Числото в средата е средното на светлините. */
export function HealthRing({ score, lights, size = 132 }) {
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  const n = Math.max(lights.length, 1)
  const gap = 6
  const seg = c / n - gap
  return (
    <svg className={styles.ring} width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={`Здраве ${score} от 100`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {lights.map((l, i) => (
          <circle key={l.key} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={LEVEL_COLOR[l.level]} strokeWidth="11" strokeLinecap="round"
            strokeDasharray={`${Math.max(seg, 1)} ${c}`}
            strokeDashoffset={-(i * (seg + gap)) - gap / 2} />
        ))}
      </g>
      <text x="50%" y="50%" textAnchor="middle" className={styles.ringNum} dy="0.05em">{score}</text>
      <text x="50%" y="50%" textAnchor="middle" className={styles.ringLabel} dy="2.2em">здраве</text>
    </svg>
  )
}

/* Тънката крива в плочката: запълнена отдолу, с точка на последния ден. */
export function Spark({ values, color = 'var(--accent)', height = 40 }) {
  const id = useId().replace(/:/g, '')
  const w = 160
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? w / (values.length - 1) : w
  const pts = values.map((v, i) => [i * step, height - 4 - (v / max) * (height - 10)])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1] ?? [0, height]
  return (
    <svg className={styles.spark} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`sp${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${height} L0,${height} Z`} fill={`url(#sp${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  )
}

function niceMax(v) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const f = v / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

/* Стълбове по ден, пунктир за обичайното, червено за ден над два пъти
   обичайното. labels — подписите отдолу; fmt — как се пише числото по оста. */
export function DayBars({ values, labels, normal, fmt = String, height = 180, title }) {
  const W = 520
  const pad = { l: 44, r: 12, t: 10, b: 26 }
  const top = niceMax(Math.max(...values, normal || 0, 1))
  const ih = height - pad.t - pad.b
  const iw = W - pad.l - pad.r
  const bw = iw / values.length
  const y = (v) => pad.t + ih - (v / top) * ih
  const ticks = [0, top / 2, top]
  return (
    <svg className={styles.chart} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={title}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={styles.grid} />
          <text x={pad.l - 8} y={y(t)} dy="0.35em" textAnchor="end" className={styles.axis}>{fmt(t)}</text>
        </g>
      ))}
      {values.map((v, i) => {
        const hot = normal > 0 && v > normal * 2
        const h = Math.max(v > 0 ? 2 : 0, (v / top) * ih)
        return (
          <g key={i}>
            <rect x={pad.l + i * bw + bw * 0.18} y={pad.t + ih - h} width={bw * 0.64} height={h}
              rx="3" className={hot ? styles.barHot : styles.bar}>
              <title>{`${labels[i]}: ${fmt(v)}`}</title>
            </rect>
            {(values.length <= 14 || i % 2 === values.length % 2) && (
              <text x={pad.l + i * bw + bw / 2} y={height - 8} textAnchor="middle" className={styles.axis}>{labels[i]}</text>
            )}
          </g>
        )
      })}
      {/* Числото на пунктира е в подписа под графиката: тук то лягаше върху
          стълбовете точно в дните, в които има какво да се види. */}
      {normal > 0 && <line x1={pad.l} x2={W - pad.r} y1={y(normal)} y2={y(normal)} className={styles.normal} />}
    </svg>
  )
}

/* Натрупани стълбове: няколко серии в един стълб на ден. */
export function StackBars({ series: rows, labels, height = 180, title, fmt = String }) {
  const W = 520
  const pad = { l: 36, r: 12, t: 10, b: 26 }
  const totals = labels.map((_, i) => rows.reduce((s, r) => s + (r.values[i] || 0), 0))
  const top = niceMax(Math.max(...totals, 1))
  const ih = height - pad.t - pad.b
  const iw = W - pad.l - pad.r
  const bw = iw / labels.length
  const y = (v) => pad.t + ih - (v / top) * ih
  return (
    <svg className={styles.chart} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={title}>
      {[0, top / 2, top].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={styles.grid} />
          <text x={pad.l - 8} y={y(t)} dy="0.35em" textAnchor="end" className={styles.axis}>{fmt(t)}</text>
        </g>
      ))}
      {labels.map((lab, i) => {
        let acc = 0
        return (
          <g key={i}>
            {rows.map((r) => {
              const v = r.values[i] || 0
              if (!v) return null
              const h = (v / top) * ih
              const yy = pad.t + ih - ((acc + v) / top) * ih
              acc += v
              return (
                <rect key={r.key} x={pad.l + i * bw + bw * 0.18} y={yy} width={bw * 0.64} height={h} fill={r.color}>
                  <title>{`${lab} · ${r.label}: ${fmt(v)}`}</title>
                </rect>
              )
            })}
            {(labels.length <= 14 || i % 2 === labels.length % 2) && (
              <text x={pad.l + i * bw + bw / 2} y={height - 8} textAnchor="middle" className={styles.axis}>{lab}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* Една хоризонтална лента с дял — за „къде отива тежестта". */
export function ShareBar({ label, value, share, color }) {
  return (
    <div className={styles.share}>
      <div className={styles.shareHead}>
        <span className={styles.shareLabel}><i style={{ background: color }} />{label}</span>
        <span className={styles.shareValue}>{value}</span>
      </div>
      <div className={styles.track}><span style={{ width: `${Math.min(100, share * 100)}%`, background: color }} /></div>
    </div>
  )
}

export function Dot({ level: lv }) {
  return <i className={styles.dot} style={{ background: LEVEL_COLOR[lv] }} aria-hidden="true" />
}
