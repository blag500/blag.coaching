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
 *
 * Green, not gold. Gold is what the whole interface is made of, so a gold line
 * is another piece of the furniture; the green the app already uses for carbs
 * and for the steps habit reads as something alive, and this is the one number
 * a person watches for weeks. It is a constant, never a verdict — the line is
 * the same colour whichever way it points, because down is progress for someone
 * cutting and a setback for someone gaining.
 */
const LINE = '#66BB6A'

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

  /* How much of the box the readings are allowed to fill.
     There is no axis here, so this number is a choice, not a fact — every
     sparkline makes it, and it decides whether two kilos look like two kilos or
     like a cliff. It began at 0.45, which was quiet to the point of saying
     nothing; 0.78 gives the month its shape back. Higher still and a single bad
     morning would tower over the trend it interrupts.
     Flat history divides by zero and, more usefully, belongs in the middle. */
  const FILL = 0.78
  const seen = hi - lo || 1
  const mid = (hi + lo) / 2
  const span = seen / FILL
  const min = mid - span / 2

  const pts = weights.map((w, i) => ({
    x: PAD + (i / (weights.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (w.kg - min) / span) * (H - PAD * 2),
  }))

  // Barely rounded. The profile chart's soft curve is drawn across 300 pixels;
  // the same softening across 124 turns every peak into a hump and the line
  // stops describing anything.
  const line = smoothPath(pts, 0.14)
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
          <stop offset="0%"   stopColor={LINE} stopOpacity="0.30" />
          <stop offset="100%" stopColor={LINE} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={LINE}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Where it stands now — the one point worth marking when the axis is gone. */}
      <circle cx={last.x} cy={last.y} r="2.2" fill={LINE} />
    </svg>
  )
}
