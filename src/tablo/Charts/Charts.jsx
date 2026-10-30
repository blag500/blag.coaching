import styles from './Charts.module.css'

/* Графиките на таблото. Само SVG, без библиотека — като WeightChart.
 * Цветовете идват от src/plain.css: --ok, --warn, --bad, --series-*. */

const LEVEL_COLOR = { ok: 'var(--ok)', watch: 'var(--warn)', high: 'var(--bad)' }

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
              rx="2" className={hot ? styles.barHot : styles.bar}>
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

/* Мини-крива за плочка с число (по Tremor SparkChart): 28 точки, линия 2px,
   бледа площ отдолу, точка на последния ден. Без оси — числото е над нея,
   а промяната спрямо миналата седмица е под нея, с думи. */
export function Spark({ values, label }) {
  const W = 120, H = 32, n = values.length
  if (n < 2) return null
  const max = Math.max(...values, 1)
  const pts = values.map((v, i) => [(i / (n - 1)) * W, H - 3 - (v / max) * (H - 6)])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  const [lx, ly] = pts[n - 1]
  return (
    <svg className={styles.spark} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <path d={`${line}L${W},${H}L0,${H}Z`} className={styles.sparkArea} />
      <path d={line} className={styles.sparkLine} vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.5" className={styles.sparkDot} />
    </svg>
  )
}

/* Колко от какво (по Tremor BarList): име, лента, брой. Лентата е в мастило,
   не в цвят — цветът в таблото е запазен за наред/следи/внимание. */
export function BarList({ rows }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className={styles.barList}>
      {rows.map((r) => (
        <li key={r.name}>
          <span className={styles.barListFill} style={{ width: `${(r.value / max) * 100}%` }} />
          <span className={styles.barListName}>{r.name}</span>
          <span className={styles.barListValue}>{r.value}</span>
        </li>
      ))}
    </ul>
  )
}
