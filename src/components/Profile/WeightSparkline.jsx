const W = 300
const H = 80
const PAD = 8

export default function WeightSparkline({ weights }) {
  const last30 = weights.slice(-30)
  if (last30.length < 2) return null

  const vals = last30.map(e => e.kg)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1

  const points = last30.map((e, i) => {
    const x = PAD + (i / (last30.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((e.kg - min) / range) * (H - PAD * 2)
    return { x, y, ...e }
  })

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = `M${points[0].x},${H} ` +
    points.map(p => `L${p.x},${p.y}`).join(' ') +
    ` L${points[points.length - 1].x},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8F135" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#C8F135" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#wgrad)" />
      <polyline points={polyline} fill="none" stroke="#C8F135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#C8F135" />
      ))}
      <text x={points[0].x} y={H - 1} fontSize="8" fill="#8888AA" textAnchor="middle">{points[0].date.slice(5)}</text>
      <text x={points[points.length-1].x} y={H - 1} fontSize="8" fill="#8888AA" textAnchor="middle">{points[points.length-1].date.slice(5)}</text>
    </svg>
  )
}
