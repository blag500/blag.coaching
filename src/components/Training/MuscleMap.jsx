import { useMemo, useState } from 'react'
import { muscleStats } from '../../utils/muscleStats'
import styles from './MuscleMap.module.css'

const MODES = [
  { id: 'recovery',    label: 'ВЪЗСТ.',    hint: 'Зелено — готова. Кехлибарено — още се възстановява. Червено — прясно тренирана.' },
  { id: 'lastTrained', label: 'ПОСЛЕДНО',  hint: 'По-плътно = отдавна не си я тренирал.' },
  { id: 'overload',    label: 'ПРОГРЕСИЯ', hint: 'Зелено — качваш обема спрямо предишните две седмици. Червено — падаш.' },
  { id: 'volume',      label: 'ОБЕМ 7Д',   hint: 'По-плътно = повече обем за последните седем дни.' },
]

function colorFor(mode, group, recovery, stats, ctx) {
  const rec = recovery?.[group]
  const s   = stats?.[group] ?? {}
  const NONE = 'rgba(255,255,255,0.05)'

  if (mode === 'recovery') {
    if (!rec?.trained) return NONE
    const a = 0.55 + rec.pct / 260
    if (rec.pct >= 80) return `rgba(129,199,132,${a})`
    if (rec.pct >= 50) return `rgba(255,183,77,${a})`
    return `rgba(239,83,80,${0.6 + (100 - rec.pct) / 300})`
  }
  if (mode === 'lastTrained') {
    if (s.daysSince == null) return NONE
    const d = s.daysSince
    if (d <= 2) return `rgba(129,199,132,${0.55 + d * 0.1})`
    if (d <= 6) return `rgba(255,183,77,${0.55 + (d - 3) * 0.1})`
    return `rgba(239,83,80,${Math.min(1, 0.65 + (d - 7) * 0.04)})`
  }
  if (mode === 'overload') {
    if (s.overload == null) return NONE
    if (s.overload >  0.05) return `rgba(129,199,132,${Math.min(1, 0.55 + s.overload * 0.8)})`
    if (s.overload < -0.05) return `rgba(239,83,80,${Math.min(1, 0.55 - s.overload * 0.8)})`
    return 'rgba(255,183,77,0.55)'
  }
  if (mode === 'volume') {
    if (!s.volume7) return NONE
    const ratio = ctx.maxVolume7 > 0 ? s.volume7 / ctx.maxVolume7 : 0
    return `rgba(255,183,77,${0.35 + ratio * 0.6})`
  }
  return NONE
}

const SIL  = 'rgba(14,12,8,0.85)'
const OUT  = 'rgba(255,255,255,0.28)'
const DIV  = 'rgba(0,0,0,0.5)'
const SW   = 1.2

// A single closed path that traces head, neck, one arm, the torso's V, the
// leg, across the crotch, and back up the other side. One continuous outline
// beats stacked parts because there are no gaps where an arm meets a torso —
// the shoulder curves into the bicep the way a body does. Wide at the delts
// (x≈18), narrow at the waist (x≈62), wide again at the hips: that is the
// V that was missing.
const BODY_OUTLINE = `
  M 85 10
  Q 62 10 62 34
  Q 62 56 74 60
  L 74 68
  Q 62 70 46 76
  Q 22 82 18 104
  Q 14 138 20 172
  Q 16 210 22 250
  Q 24 288 34 306
  Q 44 312 48 302
  Q 50 280 44 250
  Q 48 212 42 178
  Q 52 142 52 116
  Q 56 108 62 108
  Q 60 138 62 168
  Q 64 200 66 226
  Q 58 254 50 268
  Q 42 306 46 360
  Q 40 412 46 456
  Q 42 486 50 500
  L 60 508
  L 78 512
  Q 84 512 84 500
  Q 82 484 82 458
  Q 78 416 80 372
  Q 82 328 84 288
  L 84 262
  L 86 262
  Q 88 328 90 372
  Q 92 416 88 458
  Q 88 484 86 500
  Q 86 512 92 512
  L 110 508
  L 120 500
  Q 128 486 124 456
  Q 130 412 124 360
  Q 128 306 120 268
  Q 112 254 104 226
  Q 106 200 108 168
  Q 110 138 108 108
  Q 114 108 118 116
  Q 118 142 128 178
  Q 122 212 126 250
  Q 120 280 122 302
  Q 126 312 136 306
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
 * Right-half front muscles. Left half is a mirror around x=85, drawn by
 * wrapping the same group in scale(-1,1) translate(-170,0) — one source of
 * truth per muscle so the two sides cannot drift apart.
 */
function FrontRightMuscles({ c }) {
  return (
    <g>
      {/* Trap slope from neck to shoulder (extra) */}
      <path d="M85 66 Q100 70 118 84 L110 92 Q96 86 85 86 Z"
            fill={c.extra} opacity="0.82" />

      {/* Deltoid — anterior head, the front cap (upper) */}
      <path d="M110 92 Q128 100 132 122 Q130 140 118 144 Q104 138 100 122 Q100 106 106 92 Z"
            fill={c.upper} opacity="0.96" />
      {/* Deltoid — lateral head, the shoulder ball (upper) */}
      <path d="M132 122 Q142 148 134 172 Q120 176 112 160 Q110 142 116 130 Z"
            fill={c.upper} opacity="0.9" />

      {/* Pectoralis major — one big shield per side (upper) */}
      <path d="M92 92 Q112 96 122 116 Q126 148 118 168 Q102 172 92 168 Z"
            fill={c.upper} opacity="0.98" />
      {/* Lower pec fold */}
      <path d="M94 164 Q108 172 120 166" stroke={DIV} strokeWidth="1" fill="none" />

      {/* Serratus anterior — three slips under the armpit (extra) */}
      <path d="M122 158 L130 164 M122 170 L132 176 M122 182 L130 188"
            stroke={c.extra} strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />

      {/* Biceps — long head, outer bulge (pull) */}
      <path d="M138 148 Q150 184 142 224 Q128 226 122 200 Q124 168 132 148 Z"
            fill={c.pull} opacity="0.94" />
      {/* Biceps — short head, inner bulge (pull) */}
      <path d="M124 152 Q116 184 124 224 Q134 224 132 200 Q132 172 128 152 Z"
            fill={c.pull} opacity="0.82" />

      {/* Forearm — brachioradialis + flexor mass (extra) */}
      <path d="M140 232 Q152 268 142 306 Q128 310 124 282 Q122 252 132 232 Z"
            fill={c.extra} opacity="0.9" />
      <path d="M126 236 Q124 264 128 288 Q132 306 132 306 L132 236 Z"
            fill={c.extra} opacity="0.72" />

      {/* Rectus abdominis — right column, three blocks (extra) */}
      <path d="M87 178 Q102 182 104 194 L104 206 Q94 208 87 206 Z"
            fill={c.extra} opacity="0.92" />
      <path d="M87 210 L104 210 L104 226 Q95 228 87 226 Z"
            fill={c.extra} opacity="0.92" />
      <path d="M87 230 L104 230 Q104 246 100 258 Q92 258 87 254 Z"
            fill={c.extra} opacity="0.92" />

      {/* Oblique (extra) */}
      <path d="M104 184 Q112 218 108 256 L118 254 Q122 216 116 184 Z"
            fill={c.extra} opacity="0.78" />

      {/* Inguinal V — that diagonal from hip to pubis */}
      <path d="M116 260 L94 282" stroke={DIV} strokeWidth="1.2" fill="none" />

      {/* Quadriceps — rectus femoris (middle head, lower) */}
      <path d="M88 288 Q92 340 92 400 L104 400 Q106 340 102 288 Z"
            fill={c.lower} opacity="0.94" />
      {/* Vastus lateralis — outer sweep (lower) */}
      <path d="M106 292 Q124 340 122 400 L136 396 Q138 340 128 290 Z"
            fill={c.lower} opacity="0.9" />
      {/* Vastus medialis — inner-knee teardrop (lower) */}
      <path d="M85 372 Q90 398 96 412 L110 412 Q108 396 104 372 Z"
            fill={c.lower} opacity="0.98" />
      {/* Sartorius — diagonal band */}
      <path d="M108 292 L86 412" stroke={DIV} strokeWidth="0.9" fill="none" />
      {/* Divider between rectus and vastus lateralis */}
      <path d="M108 294 Q112 348 118 400" stroke={DIV} strokeWidth="0.7" fill="none" />

      {/* Knee cap */}
      <ellipse cx="102" cy="420" rx="10" ry="6" fill="none" stroke={OUT} strokeWidth="0.9" />

      {/* Tibialis anterior — shin (extra) */}
      <path d="M92 432 Q94 468 96 498 L108 498 Q110 468 106 432 Z"
            fill={c.extra} opacity="0.84" />
      {/* Peroneus stripe (extra) */}
      <path d="M118 434 Q122 466 120 496 L124 496 Q124 466 122 434 Z"
            fill={c.extra} opacity="0.7" />
    </g>
  )
}

function BackRightMuscles({ c }) {
  return (
    <g>
      {/* Trap upper wing (extra) */}
      <path d="M85 66 L118 84 Q122 106 112 128 L96 132 L85 130 Z"
            fill={c.extra} opacity="0.9" />
      {/* Trap mid band (extra) */}
      <path d="M96 132 L112 128 Q116 148 108 168 L96 168 Z"
            fill={c.extra} opacity="0.82" />
      {/* Trap lower descending fibres (extra) */}
      <path d="M96 168 L108 168 L88 200 Z"
            fill={c.extra} opacity="0.72" />

      {/* Rear deltoid (upper) */}
      <path d="M108 92 Q130 104 134 128 Q130 148 116 152 Q102 146 100 128 Q102 112 108 92 Z"
            fill={c.upper} opacity="0.95" />
      {/* Infraspinatus — rear shoulder fan (upper) */}
      <path d="M110 152 Q108 176 120 184 Q130 176 128 156 Z"
            fill={c.upper} opacity="0.74" />

      {/* Latissimus dorsi — the wing (pull) */}
      <path d="M108 148 Q136 196 130 254 L96 254 L96 174 Q102 158 108 148 Z"
            fill={c.pull} opacity="0.96" />

      {/* Rhomboid crease along spine */}
      <path d="M85 128 L85 200" stroke={DIV} strokeWidth="1" fill="none" />

      {/* Triceps — long head, innermost (upper) */}
      <path d="M132 148 Q144 184 140 226 Q128 228 124 200 Q124 172 130 148 Z"
            fill={c.upper} opacity="0.94" />
      {/* Triceps — lateral head, outer (upper) */}
      <path d="M142 158 Q152 188 146 224 Q140 226 136 204 Q136 180 140 158 Z"
            fill={c.upper} opacity="0.86" />

      {/* Forearm extensors (extra) */}
      <path d="M140 232 Q152 268 142 306 Q128 310 124 282 Q122 252 132 232 Z"
            fill={c.extra} opacity="0.9" />
      <path d="M126 236 Q124 264 128 288 L132 306 L132 236 Z"
            fill={c.extra} opacity="0.72" />

      {/* Erector spinae — thick column down the spine (extra) */}
      <path d="M86 196 L96 196 L96 268 L86 268 Z"
            fill={c.extra} opacity="0.8" />

      {/* Gluteus maximus (lower) */}
      <path d="M86 272 L122 272 Q136 300 126 322 L86 324 Z"
            fill={c.lower} opacity="0.96" />

      {/* Hamstrings — biceps femoris (outer, lower) */}
      <path d="M116 328 Q130 372 124 412 L112 412 Q108 372 106 328 Z"
            fill={c.lower} opacity="0.92" />
      {/* Hamstrings — semi (inner, lower) */}
      <path d="M86 330 Q90 372 96 412 L108 412 Q108 372 104 330 Z"
            fill={c.lower} opacity="0.86" />
      {/* Popliteal fossa (knee back) */}
      <path d="M88 420 Q108 424 124 420" stroke={OUT} strokeWidth="0.8" fill="none" />

      {/* Gastrocnemius — medial head (extra) */}
      <path d="M88 432 Q92 466 96 496 L108 496 Q106 466 104 432 Z"
            fill={c.extra} opacity="0.96" />
      {/* Gastrocnemius — lateral head (extra) */}
      <path d="M110 432 Q124 466 118 494 L108 496 Q108 466 108 432 Z"
            fill={c.extra} opacity="0.88" />
      {/* Soleus (extra) */}
      <path d="M92 498 Q98 512 106 516 L118 516 Q122 512 118 498 Z"
            fill={c.extra} opacity="0.78" />
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

  const body = (
    <>
      {/* Whole silhouette in one continuous curve */}
      <path d={BODY_OUTLINE} fill={SIL} stroke={OUT} strokeWidth={SW} />
      {/* Sternum + linea alba divider, drawn on the centreline */}
      <line x1="85" y1="92" x2="85" y2="258" stroke={DIV} strokeWidth="1.2" />
    </>
  )

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
          {body}
          <FrontRightMuscles c={c} />
          <g transform="matrix(-1 0 0 1 170 0)">
            <FrontRightMuscles c={c} />
          </g>
          <text x="85" y="548" textAnchor="middle" className={styles.caption}>ПРЕДНА</text>
        </g>

        {/* ═════════ BACK ═════════ */}
        <g transform="translate(170 0)">
          <path d={BODY_OUTLINE} fill={SIL} stroke={OUT} strokeWidth={SW} />
          <BackRightMuscles c={c} />
          <g transform="matrix(-1 0 0 1 170 0)">
            <BackRightMuscles c={c} />
          </g>
          <text x="85" y="548" textAnchor="middle" className={styles.caption}>ЗАДНА</text>
        </g>
      </svg>

      {activeHint && <p className={styles.hint}>{activeHint}</p>}
    </div>
  )
}
