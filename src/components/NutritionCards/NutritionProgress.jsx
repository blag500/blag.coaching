import styles from './NutritionProgress.module.css'

const MACROS = [
  { key: 'protein', label: 'ПРОТЕИН', short: 'П', unit: 'g',   color: '#66BB6A' },
  { key: 'carbs',   label: 'ВЪГЛ.',   short: 'В', unit: 'g',   color: '#4FC3F7' },
  { key: 'fat',     label: 'МАЗНИНИ', short: 'М', unit: 'g',   color: '#FFB74D' },
]

const R  = 46          // ring radius
const SW = 10          // stroke width
const C  = 2 * Math.PI * R   // circumference ≈ 289.03

export default function NutritionProgress({ totals, targets, kcalBurned = 0, eatBack = false }) {
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
    { key: 'fat',     color: '#FFB74D', arc: fArc, offset: C - pArc - cArc },
  ]

  const kcalPctDisplay = Math.round(kcalPct * 100)

  return (
    <div className={styles.wrap}>
      <span className={styles.heading}>ПРИЕМ ДНЕС</span>

      <div className={styles.inner}>

        {/* ── Donut ─────────────────────────────────── */}
        <div className={styles.donutCol}>
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
            <g transform="rotate(-90, 60, 60)">
              {/* Background track */}
              <circle
                cx="60" cy="60" r={R}
                fill="none"
                stroke="var(--surface-2)"
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

            {/* Center text */}
            <text x="60" y="50"
              textAnchor="middle"
              fill={kcalOver ? '#ef4444' : 'var(--text)'}
              fontSize="22"
              fontFamily="'Cinzel', Georgia, serif"
              letterSpacing="1">
              {kcalLogged}
            </text>
            <text x="60" y="63"
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="10"
              fontFamily="'Inter', system-ui, sans-serif">
              ккал
            </text>
            <text x="60" y="75"
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="9"
              fontFamily="'Inter', system-ui, sans-serif">
              / {kcalTarget}
            </text>
            <text x="60" y="88"
              textAnchor="middle"
              fill={kcalOver ? '#ef4444' : 'var(--muted)'}
              fontSize="9"
              fontFamily="'Inter', system-ui, sans-serif">
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
