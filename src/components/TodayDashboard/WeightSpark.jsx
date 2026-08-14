import { smoothPath } from '../../utils/smoothPath'

/**
 * The whole weight history as one small line, no axes and no numbers.
 *
 * The profile chart answers "what exactly did I weigh on the 8th"; this answers
 * "which way is this going", which is the only question worth putting on a
 * dashboard. Ticks, labels and range pills at this size would be unreadable and
 * would cost the space that makes the shape legible.
 *
 * Scaled to its own minimum and maximum rather than to zero: over a month a
 * person moves two kilos in ninety, and a line drawn from zero is flat by
 * construction — it would say "nothing is happening" every single day.
 */
/* Wider than it first was. The card had a hand's width of nothing between the
   number and the line, and the cure for empty space is to let the thing that
   carries information have it — a longer line separates readings that were
   piling on top of each other, which is more legible rather than busier. */
const W = 124
const H = 32
const PAD = 3.5

export default function WeightSpark({ weights, gradId = 'todayWeightSpark' }) {
  if (!weights || weights.length < 2) return null

  const vals = weights.map(w => w.kg)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)

  /* Headroom above and below, rather than stretching the readings from floor to
     ceiling. Scaled edge to edge, a month that moved two kilos fills thirty
     pixels with every daily wobble at full height, and the line reads as a heart
     monitor instead of a direction. The 0.45 is the wobble's share of the box:
     the shape survives, the noise stops shouting. Flat history divides by zero
     and, more usefully, belongs in the middle. */
  const seen = hi - lo || 1
  const mid = (hi + lo) / 2
  const span = seen / 0.45
  const min = mid - span / 2

  const pts = weights.map((w, i) => ({
    x: PAD + (i / (weights.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (w.kg - min) / span) * (H - PAD * 2),
  }))

  const line = smoothPath(pts)
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`
  const last = pts[pts.length - 1]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.26" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* Where it stands now — the one point worth marking when the axis is gone. */}
      <circle cx={last.x} cy={last.y} r="2.2" fill="var(--accent)" />
    </svg>
  )
}
