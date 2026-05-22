import { useState } from 'react'
import styles from './WeightChart.module.css'

const RANGES = [
  { key: '2W',  label: '2 СЕД', days: 14  },
  { key: '1M',  label: '1 МЕС', days: 30  },
  { key: '3M',  label: '3 МЕС', days: 90  },
  { key: 'ALL', label: 'ВСЕ',   days: null },
]

const W = 300
const H = 160
const PAD_L = 38
const PAD_R = 10
const PAD_T = 14
const PAD_B = 24

function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cpx = (curr.x - prev.x) * 0.4
    d += ` C${prev.x + cpx},${prev.y} ${curr.x - cpx},${curr.y} ${curr.x},${curr.y}`
  }
  return d
}

export default function WeightChart({ weights, targetWeight, gradId = 'wcGrad', range: rangeProp, onRange: onRangeProp }) {
  const [rangeInternal, setRangeInternal] = useState('1M')
  const range    = rangeProp    ?? rangeInternal
  const setRange = onRangeProp  ?? setRangeInternal

  const rangeObj = RANGES.find(r => r.key === range)
  const cutoff = rangeObj.days
    ? new Date(Date.now() - rangeObj.days * 86400000).toISOString().slice(0, 10)
    : null
  const data = cutoff ? weights.filter(w => w.date >= cutoff) : weights

  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  if (data.length < 2) {
    return (
      <div className={styles.wrap}>
        <RangePills range={range} onRange={setRange} />
        <p className={styles.empty}>Недостатъчно данни за периода</p>
      </div>
    )
  }

  const vals = data.map(d => d.kg)
  const minKg = Math.min(...vals, targetWeight ?? Infinity)
  const maxKg = Math.max(...vals, targetWeight ?? -Infinity)
  const pad = Math.max((maxKg - minKg) * 0.15, 1)
  const minVal = minKg - pad
  const maxVal = maxKg + pad
  const rangeVal = maxVal - minVal

  function toX(i) {
    return PAD_L + (i / (data.length - 1)) * chartW
  }
  function toY(kg) {
    return PAD_T + (1 - (kg - minVal) / rangeVal) * chartH
  }

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.kg), ...d }))
  const last = points[points.length - 1]

  const linePath = smoothPath(points)
  const areaPath = `${linePath} L${last.x},${H - PAD_B} L${points[0].x},${H - PAD_B} Z`

  const yTicks = []
  for (let i = 0; i <= 3; i++) {
    const kg = minVal + (i / 3) * rangeVal
    yTicks.push({ kg: Math.round(kg * 10) / 10, y: toY(kg) })
  }

  const n = data.length
  const xLabelIdxs = n <= 3
    ? [...Array(n).keys()]
    : [0, Math.round((n - 1) / 2), n - 1]

  const goalY = targetWeight != null ? toY(targetWeight) : null
  const goalInRange = goalY != null && goalY >= PAD_T && goalY <= H - PAD_B

  return (
    <div className={styles.wrap}>
      <RangePills range={range} onRange={setRange} />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#C9A227" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#C9A227" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            />
            <text x={PAD_L - 5} y={t.y + 3} fontSize="7.5" fill="#666" textAnchor="end">
              {t.kg}
            </text>
          </g>
        ))}

        {goalInRange && (
          <>
            <line
              x1={PAD_L} y1={goalY} x2={W - PAD_R} y2={goalY}
              stroke="#C9A227" strokeWidth="1.2" strokeDasharray="5,4" opacity="0.5"
            />
            <text x={W - PAD_R + 2} y={goalY + 3} fontSize="7" fill="#C9A227" opacity="0.7">цел</text>
          </>
        )}

        <path d={areaPath} fill={`url(#${gradId})`} />

        <path
          d={linePath}
          fill="none"
          stroke="#C9A227"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx={last.x} cy={last.y} r="7" fill="none" stroke="#C9A227" strokeOpacity="0.22" strokeWidth="2" />
        <circle cx={last.x} cy={last.y} r="3.5" fill="#C9A227" />

        {xLabelIdxs.map(idx => (
          <text
            key={idx}
            x={toX(idx)}
            y={H - 5}
            fontSize="7.5"
            fill="#666"
            textAnchor={idx === 0 ? 'start' : idx === n - 1 ? 'end' : 'middle'}
          >
            {data[idx].date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  )
}

function RangePills({ range, onRange }) {
  return (
    <div className={styles.pills}>
      {RANGES.map(r => (
        <button
          key={r.key}
          className={`${styles.pill} ${range === r.key ? styles.pillActive : ''}`}
          onClick={() => onRange(r.key)}
          type="button"
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
