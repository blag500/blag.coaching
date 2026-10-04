import { useMemo, useState } from 'react'
import { smoothPath } from '../../utils/smoothPath'
import { stepAt } from '../calc'
import styles from './ValueChart.module.css'

/* Стойността на сметката във времето, с внесеното нето като стъпала отдолу.
 * Разстоянието между двете линии е печалбата — без нея една линия, която
 * расте, не казва дали расте от пазара или от превода в началото на месеца. */

const W = 340
const H = 170
const PAD = { top: 12, right: 8, bottom: 22, left: 8 }

function shortMoney(v, currency) {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency', currency, currencyDisplay: 'narrowSymbol', notation: 'compact', maximumFractionDigits: 1,
  }).format(v)
}

export default function ValueChart({ points, steps, currency, daily, gradId }) {
  const [hover, setHover] = useState(null)

  const geo = useMemo(() => {
    if (points.length < 2) return null
    const t0 = points[0].t
    const t1 = points[points.length - 1].t
    const deposits = steps.length
      ? points.map((p) => ({ t: p.t, v: stepAt(steps, p.t) }))
      : []
    const all = [...points.map((p) => p.v), ...deposits.map((d) => d.v).filter((v) => v > 0)]
    let lo = Math.min(...all)
    let hi = Math.max(...all)
    const pad = (hi - lo) * 0.08 || hi * 0.01 || 1
    lo -= pad
    hi += pad
    const x = (t) => PAD.left + ((t - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right)
    const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom)
    const pts = points.map((p) => ({ x: x(p.t), y: y(p.v), p }))
    const line = smoothPath(pts, 0.3)
    const area = `${line} L${pts[pts.length - 1].x},${H - PAD.bottom} L${pts[0].x},${H - PAD.bottom} Z`
    // Стъпалата са стъпала, не крива: парите влизат в един миг.
    let dep = ''
    deposits.forEach((d, i) => {
      if (d.v <= 0) return
      const px = x(d.t)
      const py = y(d.v)
      dep += dep ? ` H${px} V${py}` : `M${px},${py}`
      if (i === deposits.length - 1) dep += ` H${px}`
    })
    return { pts, line, area, dep, t0, t1, lo, hi, x, y }
  }, [points, steps])

  if (!geo) {
    return (
      <div className={styles.empty}>
        Графиката се появява след втората снимка — снимките са всеки час.
      </div>
    )
  }

  const fmtAxis = (t) => new Date(t).toLocaleDateString('bg-BG',
    daily ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', hour: '2-digit' })

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = geo.pts[0]
    for (const q of geo.pts) if (Math.abs(q.x - px) < Math.abs(best.x - px)) best = q
    setHover(best)
  }

  const hv = hover?.p
  return (
    <div className={styles.wrap}>
      <div className={styles.readout} aria-live="polite">
        {hv ? (
          <>
            <strong>{new Intl.NumberFormat('bg-BG', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(hv.v)}</strong>
            <span>{new Date(hv.t).toLocaleString('bg-BG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </>
        ) : (
          <span>{shortMoney(geo.lo, currency)} – {shortMoney(geo.hi, currency)}</span>
        )}
      </div>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Стойност на сметката във времето"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className={styles.gradTop} />
            <stop offset="100%" className={styles.gradBottom} />
          </linearGradient>
        </defs>
        <path d={geo.area} fill={`url(#${gradId})`} />
        {geo.dep && <path d={geo.dep} className={styles.deposit} />}
        <path d={geo.line} className={styles.line} />
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={PAD.top} y2={H - PAD.bottom} className={styles.cursor} />
            <circle cx={hover.x} cy={hover.y} r="3.5" className={styles.dot} />
          </>
        )}
        <text x={PAD.left} y={H - 6} className={styles.axis}>{fmtAxis(geo.t0)}</text>
        <text x={W - PAD.right} y={H - 6} className={styles.axis} textAnchor="end">{fmtAxis(geo.t1)}</text>
      </svg>
    </div>
  )
}
