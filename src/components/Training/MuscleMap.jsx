import { useMemo, useState } from 'react'
import { muscleStats } from '../../utils/muscleStats'
import styles from './MuscleMap.module.css'

const MODES = [
  { id: 'recovery',    label: 'ВЪЗСТ.',    hint: 'Зелено — готова. Кехлибарено — още се възстановява. Червено — прясно тренирана.' },
  { id: 'lastTrained', label: 'ПОСЛЕДНО',  hint: 'По-плътно = отдавна не си я тренирал.' },
  { id: 'overload',    label: 'ПРОГРЕСИЯ', hint: 'Зелено — качваш обема спрямо предишните две седмици. Червено — падаш.' },
  { id: 'volume',      label: 'ОБЕМ 7Д',   hint: 'По-плътно = повече обем за последните седем дни.' },
]

// Solid group colours — no opacity, no shading. The dark divider lines between
// two muscles of the same colour are what say "these are two muscles"; a fill
// at 80% opacity just makes the shape look faded.
function colorFor(mode, group, recovery, stats, ctx) {
  const rec = recovery?.[group]
  const s   = stats?.[group] ?? {}
  const NONE = '#26221a'   // dark neutral for untrained — reads as body colour

  if (mode === 'recovery') {
    if (!rec?.trained) return NONE
    if (rec.pct >= 80) return '#7BC97F'
    if (rec.pct >= 50) return '#FFB74D'
    return '#EF5350'
  }
  if (mode === 'lastTrained') {
    if (s.daysSince == null) return NONE
    if (s.daysSince <= 2) return '#7BC97F'
    if (s.daysSince <= 6) return '#FFB74D'
    return '#EF5350'
  }
  if (mode === 'overload') {
    if (s.overload == null) return NONE
    if (s.overload >  0.05) return '#7BC97F'
    if (s.overload < -0.05) return '#EF5350'
    return '#FFB74D'
  }
  if (mode === 'volume') {
    if (!s.volume7) return NONE
    const ratio = ctx.maxVolume7 > 0 ? s.volume7 / ctx.maxVolume7 : 0
    if (ratio > 0.66) return '#FFB74D'
    if (ratio > 0.33) return '#C79150'
    return '#7A5F3C'
  }
  return NONE
}

const OUT  = 'rgba(255,255,255,0.42)'
const DIV  = 'rgba(0,0,0,0.55)'
const HEAD_FILL = '#1a1610'
const SW   = 1.4

// One closed silhouette per view. Wide at delts (x≈18), narrow at waist (x≈62),
// wide again at hips — the V that the earlier drafts kept losing.
const BODY_OUTLINE = `
  M 85 10
  Q 62 10 62 34
  Q 62 56 74 60
  L 74 68
  Q 62 70 46 76
  Q 22 82 18 104
  Q 14 138 20 172
  Q 16 210 22 250
  Q 24 288 34 308
  Q 44 314 50 306
  Q 52 282 48 250
  Q 52 212 46 178
  Q 54 142 54 116
  Q 58 108 62 108
  Q 60 138 64 168
  Q 66 200 68 226
  Q 60 254 52 268
  Q 44 306 48 360
  Q 42 412 48 456
  Q 44 486 52 502
  L 60 510
  L 80 514
  Q 84 514 84 502
  Q 82 484 82 458
  Q 78 416 80 372
  Q 82 328 84 288
  L 84 262
  L 86 262
  Q 88 328 90 372
  Q 92 416 88 458
  Q 88 484 86 502
  Q 86 514 90 514
  L 110 510
  L 118 502
  Q 126 486 122 456
  Q 128 412 122 360
  Q 126 306 118 268
  Q 110 254 102 226
  Q 104 200 106 168
  Q 110 138 108 108
  Q 112 108 116 116
  Q 116 142 124 178
  Q 118 212 122 250
  Q 118 282 120 306
  Q 126 314 136 308
  Q 146 288 148 250
  Q 154 210 150 172
  Q 156 138 152 104
  Q 148 82 124 76
  Q 108 70 96 68
  L 96 60
  Q 108 56 108 34
  Q 108 10 85 10
  Z
`

/**
 * The right half of the FRONT body. Muscles tile the silhouette from the
 * centreline outward, so every square millimetre inside the outline is claimed
 * by some group — no dark stripes leaking through between shapes. The left
 * half is a mirror around x = 85, done once with scale(-1,1) translate(-170,0).
 */
function FrontRightMuscles({ c }) {
  return (
    <g>
      {/* Trap slope from neck out to shoulder cap (extra) */}
      <path d="M85 66 Q100 68 118 82 L108 92 L85 90 Z" fill={c.extra} />

      {/* Deltoid — one large cap around the shoulder joint (upper) */}
      <path d="M108 92 Q132 100 144 128 Q140 158 122 170 Q108 164 102 140 Q100 112 108 92 Z"
            fill={c.upper} />

      {/* Pectoralis major — one big shield per side (upper) */}
      <path d="M85 90 Q108 96 122 122 Q122 156 110 172 Q94 174 85 170 Z" fill={c.upper} />

      {/* Serratus slips under armpit (extra) */}
      <path d="M118 168 L128 174 L118 178 L128 184 L118 188 L126 194"
            stroke={c.extra} strokeWidth="3.5" strokeLinecap="round" fill="none" />

      {/* Biceps — fills the upper arm (pull) */}
      <path d="M122 170 Q148 190 148 226 Q138 240 122 234 Q114 202 118 170 Z" fill={c.pull} />

      {/* Forearm — fills lower arm from elbow to wrist (extra) */}
      <path d="M122 234 Q150 250 148 302 Q136 316 124 310 Q114 272 118 234 Z" fill={c.extra} />

      {/* Rectus abdominis — one big block for the right column (extra) */}
      <path d="M85 172 L108 172 Q112 220 108 262 L85 262 Z" fill={c.extra} />

      {/* Oblique — the side flank between abs and lat/hip (extra) */}
      <path d="M108 172 Q118 220 116 264 Q124 240 122 200 Q120 180 118 172 Z" fill={c.extra} />

      {/* Quadriceps — the big outer thigh muscle mass (lower) */}
      <path d="M85 268 L118 268 Q132 320 128 410 L108 412 Q98 340 95 268 Z" fill={c.lower} />
      {/* Vastus medialis — the inner-knee teardrop (lower, brighter shade via layer) */}
      <path d="M85 380 Q92 402 100 416 L118 416 Q114 400 108 380 Z" fill={c.lower} />

      {/* Tibialis + calf front — fills the shin (extra) */}
      <path d="M85 430 L118 430 Q120 470 116 502 L88 502 Z" fill={c.extra} />

      {/* ── Anatomical divider lines ── */}
      {/* Sternum / linea alba (drawn on centreline in the main render) */}
      {/* Pec lower fold */}
      <path d="M92 162 Q108 172 122 164" stroke={DIV} strokeWidth="1.2" fill="none" />
      {/* Ab row dividers */}
      <path d="M85 196 L108 196" stroke={DIV} strokeWidth="1.2" fill="none" />
      <path d="M85 220 L108 220" stroke={DIV} strokeWidth="1.2" fill="none" />
      <path d="M85 244 L108 244" stroke={DIV} strokeWidth="1.2" fill="none" />
      {/* Ab / oblique divider */}
      <path d="M108 172 L108 260" stroke={DIV} strokeWidth="1" fill="none" />
      {/* Delt / pec seam */}
      <path d="M108 92 Q112 130 122 168" stroke={DIV} strokeWidth="1.1" fill="none" />
      {/* Bicep long / short seam */}
      <path d="M132 172 Q132 200 132 232" stroke={DIV} strokeWidth="0.9" fill="none" />
      {/* Inguinal V */}
      <path d="M118 264 L88 288" stroke={DIV} strokeWidth="1.3" fill="none" />
      {/* Quad head seam */}
      <path d="M104 272 Q110 340 114 410" stroke={DIV} strokeWidth="0.9" fill="none" />
      {/* Knee cap */}
      <ellipse cx="103" cy="422" rx="11" ry="6" fill="none" stroke={OUT} strokeWidth="1" />
    </g>
  )
}

function BackRightMuscles({ c }) {
  return (
    <g>
      {/* Trapezius upper wing (extra) */}
      <path d="M85 66 L118 84 Q124 108 118 132 L108 138 L85 138 Z" fill={c.extra} />
      {/* Trapezius mid band (extra) */}
      <path d="M85 138 L108 138 Q112 158 106 170 L85 170 Z" fill={c.extra} />

      {/* Rear deltoid — one cap around the shoulder (upper) */}
      <path d="M108 92 Q132 100 144 128 Q140 158 122 170 Q106 162 102 140 Q104 108 108 92 Z"
            fill={c.upper} />

      {/* Latissimus dorsi — the huge wing (pull) */}
      <path d="M108 138 Q140 190 132 262 L85 262 L85 170 L106 170 Z" fill={c.pull} />

      {/* Triceps — fills back of upper arm (upper) */}
      <path d="M122 170 Q150 200 148 240 Q138 250 122 244 Q114 208 118 170 Z" fill={c.upper} />

      {/* Forearm extensors (extra) */}
      <path d="M122 244 Q150 260 148 302 Q136 316 124 310 Q114 278 118 244 Z" fill={c.extra} />

      {/* Erector spinae — narrow column down centre spine (extra) */}
      <path d="M85 200 L96 200 L96 262 L85 262 Z" fill={c.extra} />

      {/* Gluteus maximus (lower) */}
      <path d="M85 266 L120 266 Q134 296 124 322 L85 322 Z" fill={c.lower} />

      {/* Hamstrings — fills back of thigh (lower) */}
      <path d="M85 326 L124 326 Q128 372 122 416 L92 416 Q88 372 85 326 Z" fill={c.lower} />

      {/* Gastrocnemius — fills back of calf (extra) */}
      <path d="M85 430 L120 430 Q122 470 116 502 L92 502 Q88 470 85 430 Z" fill={c.extra} />

      {/* ── Divider lines ── */}
      {/* Trap upper/mid seam */}
      <path d="M85 138 L108 138" stroke={DIV} strokeWidth="1.1" fill="none" />
      {/* Lat / trap seam */}
      <path d="M108 138 Q118 176 130 218" stroke={DIV} strokeWidth="1" fill="none" />
      {/* Spine crease */}
      <path d="M85 138 L85 262" stroke={DIV} strokeWidth="1.2" fill="none" />
      {/* Tricep three-head hint */}
      <path d="M132 176 Q134 208 130 240" stroke={DIV} strokeWidth="0.9" fill="none" />
      {/* Glute crease */}
      <path d="M85 324 Q104 320 124 324" stroke={DIV} strokeWidth="1.1" fill="none" />
      {/* Ham inner/outer seam */}
      <path d="M108 328 L108 414" stroke={DIV} strokeWidth="0.9" fill="none" />
      {/* Popliteal fossa (knee back) */}
      <path d="M88 422 Q108 428 124 422" stroke={OUT} strokeWidth="1" fill="none" />
      {/* Gastroc two-head seam */}
      <path d="M108 432 L108 500" stroke={DIV} strokeWidth="0.9" fill="none" />
    </g>
  )
}

export default function MuscleMap({ recovery, sessions = [], completions = [] }) {
  const [mode, setMode] = useState('recovery')

  const stats = useMemo(() => muscleStats(sessions, completions), [sessions, completions])
  const ctx = useMemo(() => ({
    maxVolume7: Math.max(...Object.values(stats).map(s => s.volume7 || 0), 1),
  }), [stats])

  const c = {
    upper: colorFor(mode, 'upper', recovery, stats, ctx),
    lower: colorFor(mode, 'lower', recovery, stats, ctx),
    pull:  colorFor(mode, 'pull',  recovery, stats, ctx),
    extra: colorFor(mode, 'extra', recovery, stats, ctx),
  }

  const activeHint = MODES.find(m => m.id === mode)?.hint

  return (
    <div className={styles.wrap}>
      <div className={styles.filterBar} role="tablist">
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={`${styles.filter} ${mode === m.id ? styles.activeFilter : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 340 560" className={styles.svg} aria-hidden="true">

        {/* ═════════ FRONT ═════════ */}
        <g>
          {/* Body silhouette base — a subtle dark fill so hands/feet/head read
              as body and any tiny uncovered sliver still looks like skin
              rather than a hole. */}
          <path d={BODY_OUTLINE} fill="#26221a" stroke={OUT} strokeWidth={SW} />
          {/* Muscles go on top, both sides */}
          <FrontRightMuscles c={c} />
          <g transform="matrix(-1 0 0 1 170 0)">
            <FrontRightMuscles c={c} />
          </g>
          {/* Centre-line dividers (sternum + linea alba) */}
          <line x1="85" y1="92" x2="85" y2="262" stroke={DIV} strokeWidth="1.4" />
          {/* Head circle drawn last so it sits above any muscle tint */}
          <circle cx="85" cy="34" r="22" fill={HEAD_FILL} stroke={OUT} strokeWidth={SW} />
          <text x="85" y="548" textAnchor="middle" className={styles.caption}>ПРЕДНА</text>
        </g>

        {/* ═════════ BACK ═════════ */}
        <g transform="translate(170 0)">
          <path d={BODY_OUTLINE} fill="#26221a" stroke={OUT} strokeWidth={SW} />
          <BackRightMuscles c={c} />
          <g transform="matrix(-1 0 0 1 170 0)">
            <BackRightMuscles c={c} />
          </g>
          {/* Spine centre-line */}
          <line x1="85" y1="66" x2="85" y2="262" stroke={DIV} strokeWidth="1.4" />
          <circle cx="85" cy="34" r="22" fill={HEAD_FILL} stroke={OUT} strokeWidth={SW} />
          <text x="85" y="548" textAnchor="middle" className={styles.caption}>ЗАДНА</text>
        </g>
      </svg>

      {activeHint && <p className={styles.hint}>{activeHint}</p>}
    </div>
  )
}
