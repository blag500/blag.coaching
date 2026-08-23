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
    const a = 0.5 + rec.pct / 260
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

// Silhouette + divider palette. The body is a dark fill under the muscles, so
// the coloured shapes read as muscle bellies on skin instead of stickers on a
// blank page. The divider is what turns two abutting shapes with the same fill
// into a pec-plus-shoulder rather than a single blob.
const SIL  = 'rgba(14,12,8,0.75)'
const OUT  = 'rgba(255,255,255,0.32)'
const DIV  = 'rgba(0,0,0,0.42)'
const SW   = 1.15

/**
 * Right-half muscle overlays for the front view. Left-half is drawn by mirroring
 * this whole group with a scale(-1,1) around x = 85. Writing each muscle once
 * is what keeps the two halves in lockstep — if the pec shape changes on one
 * side, it changes on both, and there is no chance of a two-day drift where a
 * chest tweak lands on the right and not the left.
 */
function FrontRightMuscles({ c }) {
  return (
    <g>
      {/* Trapezius upper — the slope from neck to shoulder (extra) */}
      <path d="M85 68 Q98 70 116 82 L110 90 Q98 82 85 82 Z"
            fill={c.extra} opacity="0.78" />

      {/* Deltoid — anterior head (upper) */}
      <path d="M116 84 Q126 90 130 108 Q126 122 118 128 Q108 124 108 110 Q110 96 116 84 Z"
            fill={c.upper} opacity="0.94" />
      {/* Deltoid — lateral head, visible below the anterior (upper) */}
      <path d="M130 108 Q136 128 132 148 Q124 152 116 142 Q114 128 118 118 Z"
            fill={c.upper} opacity="0.86" />

      {/* Pectoralis major — clavicular head (upper) */}
      <path d="M92 88 Q108 92 118 106 L118 128 L92 128 Z"
            fill={c.upper} opacity="0.96" />
      {/* Pectoralis major — sternal head (upper) */}
      <path d="M92 128 L118 128 Q120 148 114 160 Q100 164 92 158 Z"
            fill={c.upper} opacity="0.92" />
      {/* Sternum divider */}
      <line x1="88" y1="88" x2="88" y2="164" stroke={DIV} strokeWidth="1.2" />
      {/* Lower pec fold */}
      <path d="M94 156 Q106 164 118 158" stroke={DIV} strokeWidth="0.9" fill="none" />

      {/* Serratus anterior — three finger-like slips under the armpit (extra) */}
      <path d="M118 138 L124 145 M118 148 L126 154 M118 158 L124 162"
            stroke={c.extra} strokeWidth="2" strokeLinecap="round" opacity="0.9" />

      {/* Biceps — long head (pull) */}
      <path d="M132 128 Q140 152 138 190 Q130 194 124 178 Q122 154 128 132 Z"
            fill={c.pull} opacity="0.93" />
      {/* Biceps — short head, inner (pull) */}
      <path d="M124 132 Q120 158 126 190 Q132 190 132 168 Q134 148 132 132 Z"
            fill={c.pull} opacity="0.82" />
      {/* Brachialis peek (extra) */}
      <path d="M122 190 Q126 200 130 208" stroke={DIV} strokeWidth="0.8" fill="none" />

      {/* Forearm — brachioradialis + flexors (extra) */}
      <path d="M136 198 Q144 240 138 288 Q126 292 122 264 Q120 232 128 200 Z"
            fill={c.extra} opacity="0.88" />
      <path d="M124 202 Q122 232 122 260 Q122 282 128 288 L128 202 Z"
            fill={c.extra} opacity="0.72" />

      {/* Rectus abdominis — right column, three blocks (extra) */}
      <path d="M90 168 Q102 170 104 182 L104 194 Q96 194 90 190 Z"
            fill={c.extra} opacity="0.92" />
      <path d="M90 196 L104 196 L104 214 Q96 216 90 214 Z"
            fill={c.extra} opacity="0.92" />
      <path d="M90 218 L104 218 Q106 234 100 246 Q94 244 90 240 Z"
            fill={c.extra} opacity="0.92" />

      {/* Obliques (extra) */}
      <path d="M104 176 Q110 210 106 246 L114 244 Q118 208 114 176 Z"
            fill={c.extra} opacity="0.75" />

      {/* Inguinal line — that visible diagonal from hip to pubis */}
      <path d="M110 250 L96 268" stroke={DIV} strokeWidth="1" fill="none" />

      {/* Quadriceps — rectus femoris, the middle head (lower) */}
      <path d="M96 270 Q100 320 100 386 L110 386 Q112 320 108 270 Z"
            fill={c.lower} opacity="0.94" />
      {/* Vastus lateralis, outer head (lower) */}
      <path d="M112 274 Q124 320 122 388 L134 386 Q136 320 128 272 Z"
            fill={c.lower} opacity="0.9" />
      {/* Vastus medialis — that inner-knee teardrop (lower) */}
      <path d="M92 358 Q94 380 100 396 L114 396 Q112 380 108 358 Z"
            fill={c.lower} opacity="0.98" />
      {/* Sartorius — the diagonal band across the thigh */}
      <path d="M110 270 L94 396" stroke={DIV} strokeWidth="0.8" fill="none" />
      {/* Divider between rectus and vastus lateralis */}
      <path d="M110 274 Q114 330 116 386" stroke={DIV} strokeWidth="0.6" fill="none" />

      {/* Knee cap outline */}
      <ellipse cx="108" cy="400" rx="10" ry="6" fill="none" stroke={OUT} strokeWidth="0.9" />

      {/* Tibialis anterior — shin muscle (extra) */}
      <path d="M96 410 Q98 448 100 480 L108 480 Q110 448 108 410 Z"
            fill={c.extra} opacity="0.82" />
      {/* Peroneus — thin outer shin stripe (extra) */}
      <path d="M116 412 Q120 448 118 478 L124 478 Q124 448 122 412 Z"
            fill={c.extra} opacity="0.7" />
    </g>
  )
}

function BackRightMuscles({ c }) {
  return (
    <g>
      {/* Trapezius — upper wing (extra), one of a matched pair */}
      <path d="M85 68 L112 82 Q116 100 108 118 L94 122 L85 118 Z"
            fill={c.extra} opacity="0.9" />
      {/* Trapezius — mid, the flat band between the blades (extra) */}
      <path d="M94 122 L108 118 Q112 134 108 152 L94 154 Z"
            fill={c.extra} opacity="0.82" />

      {/* Rear deltoid (upper) */}
      <path d="M116 86 Q128 94 132 110 Q128 126 118 132 Q108 128 108 114 Q112 98 116 86 Z"
            fill={c.upper} opacity="0.94" />
      {/* Infraspinatus — the rear-shoulder fan below the delt (upper) */}
      <path d="M108 132 Q106 148 116 156 Q124 148 122 134 Z"
            fill={c.upper} opacity="0.72" />

      {/* Teres major peek — that little bump between lat and delt (pull) */}
      <path d="M118 128 Q122 138 120 148" stroke={DIV} strokeWidth="0.9" fill="none" />

      {/* Latissimus dorsi — the wing (pull) */}
      <path d="M106 128 Q128 168 122 220 L94 222 L94 152 Q100 138 106 128 Z"
            fill={c.pull} opacity="0.96" />
      {/* Rhomboid crease */}
      <path d="M92 122 L92 180" stroke={DIV} strokeWidth="1" fill="none" />

      {/* Triceps — long head, innermost (upper) */}
      <path d="M128 130 Q138 160 138 200 Q130 200 124 176 Q124 148 128 130 Z"
            fill={c.upper} opacity="0.94" />
      {/* Triceps — lateral head (upper) */}
      <path d="M136 140 Q146 168 140 198 Q136 200 132 180 Q132 156 136 140 Z"
            fill={c.upper} opacity="0.86" />

      {/* Forearm extensors (extra) */}
      <path d="M138 202 Q144 240 138 288 Q126 292 122 264 Q120 232 130 204 Z"
            fill={c.extra} opacity="0.88" />
      <path d="M124 208 Q122 240 122 268 L128 288 L128 208 Z"
            fill={c.extra} opacity="0.7" />

      {/* Erector spinae — the lower-back column (extra) */}
      <path d="M87 168 L93 168 L93 240 L87 240 Z"
            fill={c.extra} opacity="0.78" />

      {/* Gluteus maximus (lower) */}
      <path d="M86 244 L118 244 Q130 268 122 290 L86 292 Z"
            fill={c.lower} opacity="0.96" />
      {/* Gluteus medius — hip cap on the side (lower) */}
      <path d="M118 244 Q126 254 128 270" stroke={DIV} strokeWidth="0.9" fill="none" />

      {/* Hamstrings — biceps femoris, the outer head (lower) */}
      <path d="M112 296 Q124 340 122 386 L110 386 Q108 340 106 296 Z"
            fill={c.lower} opacity="0.92" />
      {/* Hamstrings — semitendinosus / semimembranosus, inner (lower) */}
      <path d="M92 298 Q94 340 96 386 L106 386 Q106 340 104 298 Z"
            fill={c.lower} opacity="0.86" />
      {/* Popliteal fossa (knee back divide) */}
      <path d="M94 396 Q108 400 122 396" stroke={OUT} strokeWidth="0.7" fill="none" />

      {/* Gastrocnemius — medial head, the inner peak (extra) */}
      <path d="M94 408 Q96 442 100 470 L110 470 Q108 442 106 408 Z"
            fill={c.extra} opacity="0.96" />
      {/* Gastrocnemius — lateral head, the outer peak (extra) */}
      <path d="M112 408 Q124 442 118 468 L110 470 Q110 442 110 408 Z"
            fill={c.extra} opacity="0.88" />
      {/* Soleus — the flat below the calf peak (extra) */}
      <path d="M96 472 Q100 486 108 490 L118 490 Q120 486 116 472 Z"
            fill={c.extra} opacity="0.76" />
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

  // The whole-body outline for one view. One flowing path per part (torso, arm,
  // leg) instead of stacked rectangles — the difference between a person and a
  // robot is that a person's forearm curves into the elbow instead of butting
  // against it, and single-path bezier shapes are what say that.
  //
  // Center of body: x = 85. Right and left arms/legs are the same shape
  // reflected around x = 85 by scale(-1,1) translate(-170,0).
  const bodyOutline = (
    <>
      {/* Head */}
      <circle cx="85" cy="34" r="22" fill={SIL} stroke={OUT} strokeWidth={SW} />
      {/* Neck (sternocleidomastoid stripes visible on front) */}
      <path d="M74 54 L74 74 Q85 82 96 74 L96 54" fill={SIL} stroke={OUT} strokeWidth="1" />

      {/* Torso — shoulders → armpit → waist → hip */}
      <path d="M62 78 Q52 82 33 96 Q26 130 32 168 Q40 210 55 250
               L 115 250 Q130 210 138 168 Q144 130 137 96 Q118 82 108 78
               L 96 74 Q85 82 74 74 Z"
            fill={SIL} stroke={OUT} strokeWidth={SW} />

      {/* Right arm — one flowing shape from shoulder to wrist */}
      <path d="M33 96 Q22 118 24 158 Q22 200 28 248 Q26 282 34 298
               Q40 302 46 298 Q52 282 52 250 Q54 210 50 178
               Q50 138 58 100 Q46 92 33 96 Z"
            fill={SIL} stroke={OUT} strokeWidth={SW} />
      {/* Left arm (mirror) */}
      <path d="M137 96 Q148 118 146 158 Q148 200 142 248 Q144 282 136 298
               Q130 302 124 298 Q118 282 118 250 Q116 210 120 178
               Q120 138 112 100 Q124 92 137 96 Z"
            fill={SIL} stroke={OUT} strokeWidth={SW} />

      {/* Right leg — hip to ankle */}
      <path d="M55 250 Q46 320 50 386 Q44 434 46 476 Q50 490 60 490
               L 82 490 Q86 476 84 448 Q84 400 86 350
               Q88 300 86 260 Z"
            fill={SIL} stroke={OUT} strokeWidth={SW} />
      {/* Left leg */}
      <path d="M115 250 Q124 320 120 386 Q126 434 124 476 Q120 490 110 490
               L 88 490 Q84 476 86 448 Q86 400 84 350
               Q82 300 84 260 Z"
            fill={SIL} stroke={OUT} strokeWidth={SW} />

      {/* Feet */}
      <path d="M50 490 Q46 502 56 508 L82 508 Q86 502 82 490 Z"
            fill={SIL} stroke={OUT} strokeWidth={SW} />
      <path d="M120 490 Q124 502 114 508 L88 508 Q84 502 88 490 Z"
            fill={SIL} stroke={OUT} strokeWidth={SW} />
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

      <svg viewBox="0 0 340 540" className={styles.svg} aria-hidden="true">

        {/* ═════════ FRONT ═════════ */}
        <g>
          {bodyOutline}
          <FrontRightMuscles c={c} />
          {/* Mirror the right-half muscles to the left, around x = 85 */}
          <g transform="matrix(-1 0 0 1 170 0)">
            <FrontRightMuscles c={c} />
          </g>
          <text x="85" y="528" textAnchor="middle" className={styles.caption}>ПРЕДНА</text>
        </g>

        {/* ═════════ BACK ═════════ */}
        <g transform="translate(170 0)">
          {bodyOutline}
          <BackRightMuscles c={c} />
          <g transform="matrix(-1 0 0 1 170 0)">
            <BackRightMuscles c={c} />
          </g>
          <text x="85" y="528" textAnchor="middle" className={styles.caption}>ЗАДНА</text>
        </g>
      </svg>

      {activeHint && <p className={styles.hint}>{activeHint}</p>}
    </div>
  )
}
