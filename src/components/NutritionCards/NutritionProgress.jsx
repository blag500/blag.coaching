import styles from './NutritionProgress.module.css'

const MACROS = [
  { key: 'protein', label: 'ПРОТЕИН', short: 'П', unit: 'g',   color: '#66BB6A' },
  { key: 'carbs',   label: 'ВЪГЛ.',   short: 'В', unit: 'g',   color: '#4FC3F7' },
  { key: 'fat',     label: 'МАЗНИНИ', short: 'М', unit: 'g',   color: 'var(--accent)' },
]

const R  = 46          // ring radius
const SW = 10          // stroke width
const C  = 2 * Math.PI * R   // circumference ≈ 289.03

// Gradient and filter ids are global to the document, so two of these on one
// screen would quietly share — and steal — each other's definitions.
export default function NutritionProgress({
  totals, targets, kcalBurned = 0, eatBack = false, idBase = 'np',
}) {
  const kcalLogged = totals.kcal  || 0
  const kcalTarget = (eatBack && kcalBurned > 0)
    ? (targets.kcal || 0) + kcalBurned
    : targets.kcal || 1
  const kcalOver   = kcalLogged > kcalTarget
  const kcalPct    = Math.min(kcalLogged / kcalTarget, 1)

  // Caloric contribution of each macro in what's been logged
  const pCal       = (totals.protein || 0) * 4
  const cCal       = (totals.carbs   || 0) * 4
  const fCal       = (totals.fat     || 0) * 9
  const macroTotal = pCal + cCal + fCal || 1

  // Each segment occupies a proportional slice of the kcalPct arc
  const totalArc = kcalPct * C
  const pArc     = (pCal / macroTotal) * totalArc
  const cArc     = (cCal / macroTotal) * totalArc
  const fArc     = (fCal / macroTotal) * totalArc

  // stroke-dashoffset formula: C – startPosition
  const segments = [
    { key: 'protein', color: '#66BB6A', arc: pArc, offset: C },
    { key: 'carbs',   color: '#4FC3F7', arc: cArc, offset: C - pArc },
    { key: 'fat',     color: 'var(--accent)', arc: fArc, offset: C - pArc - cArc },
  ]

  const kcalPctDisplay = Math.round(kcalPct * 100)

  return (
    <div className={styles.wrap}>
      <span className={styles.heading}>ПРИЕМ ДНЕС</span>

      <div className={styles.inner}>

        {/* ── Donut ─────────────────────────────────── */}
        <div className={styles.donutCol}>
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              {/* The light on the ring: strongest at the top left, gone by the
                  bottom right — the same direction the cards are lit from. */}
              <linearGradient id={`${idBase}-sheen`} x1="0.1" y1="0" x2="0.8" y2="1">
                <stop offset="0%"   stopColor="#fff" stopOpacity="0.34" />
                <stop offset="38%"  stopColor="#fff" stopOpacity="0.09" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              {/* A soft bloom under the arcs, so colour spills onto the card the
                  way a lit edge would rather than stopping dead at the stroke. */}
              <filter id={`${idBase}-bloom`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.4" />
              </filter>
            </defs>

            <g transform="rotate(-90, 60, 60)">
              {/* Bloom pass — the same arcs, blurred, underneath everything. */}
              <g opacity="0.42" filter={`url(#${idBase}-bloom)`}>
                {!kcalOver && segments.map(seg =>
                  seg.arc > 0.3 && (
                    <circle
                      key={`glow-${seg.key}`}
                      cx="60" cy="60" r={R}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={SW}
                      strokeDasharray={`${seg.arc} ${C - seg.arc}`}
                      strokeDashoffset={seg.offset}
                    />
                  )
                )}
              </g>
              {/* Background track */}
              <circle
                cx="60" cy="60" r={R}
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth={SW}
              />
              {/* Darkened where the empty part of the ring sits, so the track
                  reads as a channel the colour is filling. */}
              <circle
                cx="60" cy="60" r={R}
                fill="none"
                stroke="#000"
                strokeOpacity="0.28"
                strokeWidth={SW}
              />

              {/* Over-target: solid red ring */}
              {kcalOver && (
                <circle
                  cx="60" cy="60" r={R}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={SW}
                />
              )}

              {/* Segmented P / C / F arcs */}
              {!kcalOver && segments.map(seg =>
                seg.arc > 0.3 && (
                  <circle
                    key={seg.key}
                    cx="60" cy="60" r={R}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={SW}
                    strokeLinecap="butt"
                    strokeDasharray={`${seg.arc} ${C - seg.arc}`}
                    strokeDashoffset={seg.offset}
                  />
                )
              )}
            </g>

            {/* The bevel, drawn over the whole ring and outside the rotation so
                the highlight stays where the light is rather than turning with
                the data. Two half-width arcs: the outer one catches the light,
                the inner one falls into shadow, and between them the flat band
                of colour starts to read as something with a thickness. */}
            <circle
              cx="60" cy="60" r={R + SW / 4}
              fill="none"
              stroke={`url(#${idBase}-sheen)`}
              strokeWidth={SW / 2}
              pointerEvents="none"
            />
            <circle
              cx="60" cy="60" r={R - SW / 4}
              fill="none"
              stroke="#000"
              strokeOpacity="0.22"
              strokeWidth={SW / 2}
              pointerEvents="none"
            />

            {/* Center text */}
            <text x="60" y="50"
              textAnchor="middle"
              fill={kcalOver ? '#ef4444' : 'var(--text)'}
              fontSize="22"
              fontFamily="var(--font-heading)"
              letterSpacing="1">
              {kcalLogged}
            </text>
            <text x="60" y="63"
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="10"
              fontFamily="var(--font-body)">
              ккал
            </text>
            <text x="60" y="75"
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="9"
              fontFamily="var(--font-body)">
              / {kcalTarget}
            </text>
            <text x="60" y="88"
              textAnchor="middle"
              fill={kcalOver ? '#ef4444' : 'var(--muted)'}
              fontSize="9"
              fontFamily="var(--font-body)">
              {kcalPctDisplay}%
            </text>
          </svg>

          {/* Burned calories badge */}
          {kcalBurned > 0 && (
            <div className={styles.burnedBadge}>
              <span>−{kcalBurned}</span>
            </div>
          )}

          {/* Colour legend */}
          <div className={styles.legend}>
            {MACROS.map(m => (
              <span key={m.key} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: m.color }} />
                <span className={styles.legendLetter}>{m.short}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Macro bars ────────────────────────────── */}
        <div className={styles.barsCol}>
          {MACROS.map(m => {
            const current = totals[m.key]  || 0
            const target  = targets[m.key] || 0
            const pct     = Math.min(current / (target || 1) * 100, 100)
            const over    = current > target
            return (
              <div key={m.key} className={styles.row}>
                <div className={styles.meta}>
                  <span className={styles.label}>{m.label}</span>
                  <span
                    className={styles.values}
                    style={{ color: over ? '#ef4444' : m.color }}
                  >
                    {current}<span className={styles.unit}>{m.unit}</span>
                    <span className={styles.sep}>/</span>
                    {target}<span className={styles.unit}>{m.unit}</span>
                  </span>
                </div>
                <div className={styles.track}>
                  <div
                    className={styles.fill}
                    style={{
                      width: `${pct}%`,
                      background: over ? '#ef4444' : m.color,
                      boxShadow: over ? 'none' : `0 0 6px ${m.color}55`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
