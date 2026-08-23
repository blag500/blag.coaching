import { useMemo, useState } from 'react'
import { muscleStats } from '../../utils/muscleStats'
import styles from './MuscleMap.module.css'

const MODES = [
  { id: 'recovery',    label: 'ВЪЗСТ.',    hint: 'Зелено — готова. Кехлибарено — още се възстановява. Червено — прясно тренирана.' },
  { id: 'lastTrained', label: 'ПОСЛЕДНО',  hint: 'По-плътно = отдавна не си я тренирал.' },
  { id: 'overload',    label: 'ПРОГРЕСИЯ', hint: 'Зелено — качваш обема спрямо предишните две седмици. Червено — падаш.' },
  { id: 'volume',      label: 'ОБЕМ 7Д',   hint: 'По-плътно = повече обем за последните седем дни.' },
]

/**
 * Intensity within a mode is opacity, not a fifth colour. The palette is the
 * same three-step green / amber / red the readiness ring and the row list use,
 * so a colour on the body reads the same as the colour next to a row name; the
 * fill's density then says "how green" or "how red" without inventing a shade
 * nobody has learned yet.
 */
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

  const stroke = 'rgba(255,255,255,0.32)'
  const sw = 1

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

      <svg viewBox="0 0 360 460" className={styles.svg} aria-hidden="true">

        {/* ═════════ FRONT ═════════ */}
        <g transform="translate(0 12)">

          <circle cx="90" cy="30" r="18" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M82 46 L82 58 Q90 63 98 58 L98 46" fill="none" stroke={stroke} strokeWidth={sw} />
          {/* Sternocleidomastoid */}
          <path d="M84 48 Q86 56 90 64" fill="none" stroke={stroke} strokeWidth={0.8} />
          <path d="M96 48 Q94 56 90 64" fill="none" stroke={stroke} strokeWidth={0.8} />

          {/* Body outline */}
          <path d="M60 70 Q50 92 54 130 L58 180 Q52 200 58 220 Q90 232 122 220
                   Q126 200 122 180 L126 130 Q130 92 120 70 Q90 62 60 70 Z"
                fill="none" stroke={stroke} strokeWidth={sw} />

          {/* Trapezius upper slope (extra) */}
          <path d="M74 62 Q90 55 106 62 L102 76 Q90 71 78 76 Z"
                fill={c.extra} opacity="0.75" />

          {/* Deltoids — anterior, lateral, posterior visible edge (upper) */}
          <path d="M60 72 Q52 84 56 96 Q62 96 66 90 Q66 78 62 72 Z" fill={c.upper} opacity="0.92" />
          <path d="M56 96 Q52 108 58 118 Q64 116 66 106 Q66 98 62 96 Z" fill={c.upper} opacity="0.85" />
          <path d="M120 72 Q128 84 124 96 Q118 96 114 90 Q114 78 118 72 Z" fill={c.upper} opacity="0.92" />
          <path d="M124 96 Q128 108 122 118 Q116 116 114 106 Q114 98 118 96 Z" fill={c.upper} opacity="0.85" />

          {/* Pectoralis — clavicular head (upper) + sternal (upper) */}
          <path d="M70 80 Q64 100 72 116 L88 116 L88 90 Q78 80 70 80 Z" fill={c.upper} opacity="0.95" />
          <path d="M110 80 Q116 100 108 116 L92 116 L92 90 Q102 80 110 80 Z" fill={c.upper} opacity="0.95" />
          {/* Sternum divide */}
          <line x1="90" y1="80" x2="90" y2="116" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
          {/* Lower pec crease */}
          <path d="M72 112 Q80 118 88 116" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none" />
          <path d="M108 112 Q100 118 92 116" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none" />

          {/* Serratus anterior (extra) — visible strips under armpit */}
          <path d="M64 116 L68 122 M64 122 L70 128 M64 128 L70 134" stroke={c.extra} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M116 116 L112 122 M116 122 L110 128 M116 128 L110 134" stroke={c.extra} strokeWidth="1.5" strokeLinecap="round" />

          {/* Biceps — long head + short head (pull) */}
          <path d="M52 102 Q46 128 50 152 Q58 152 60 128 Q58 102 52 102 Z" fill={c.pull} opacity="0.9" />
          <path d="M60 106 Q56 128 60 150 Q66 148 68 128 Q66 106 60 106 Z" fill={c.pull} opacity="0.8" />
          <path d="M128 102 Q134 128 130 152 Q122 152 120 128 Q122 102 128 102 Z" fill={c.pull} opacity="0.9" />
          <path d="M120 106 Q124 128 120 150 Q114 148 112 128 Q114 106 120 106 Z" fill={c.pull} opacity="0.8" />

          {/* Forearms — flexors + brachioradialis (extra) */}
          <path d="M48 156 Q42 190 46 220 Q56 220 58 190 Q56 156 48 156 Z" fill={c.extra} opacity="0.85" />
          <path d="M58 156 Q56 190 58 218 L64 218 Q66 190 64 156 Z" fill={c.extra} opacity="0.7" />
          <path d="M132 156 Q138 190 134 220 Q124 220 122 190 Q124 156 132 156 Z" fill={c.extra} opacity="0.85" />
          <path d="M122 156 Q124 190 122 218 L116 218 Q114 190 116 156 Z" fill={c.extra} opacity="0.7" />

          {/* Rectus abdominis — 6 rows around linea alba (extra) */}
          {[0, 1].map(row => (
            <g key={'ab-a' + row}>
              <rect x="76" y={124 + row * 14} width="12" height="12" rx="3" fill={c.extra} opacity="0.9" />
              <rect x="92" y={124 + row * 14} width="12" height="12" rx="3" fill={c.extra} opacity="0.9" />
            </g>
          ))}
          <rect x="76" y="154" width="12" height="16" rx="3" fill={c.extra} opacity="0.9" />
          <rect x="92" y="154" width="12" height="16" rx="3" fill={c.extra} opacity="0.9" />
          {/* Linea alba shadow */}
          <line x1="90" y1="122" x2="90" y2="172" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />

          {/* Obliques (extra) */}
          <path d="M64 122 Q60 156 68 184 L74 184 L74 122 Z" fill={c.extra} opacity="0.7" />
          <path d="M116 122 Q120 156 112 184 L106 184 L106 122 Z" fill={c.extra} opacity="0.7" />

          {/* Hip / pelvic */}
          <path d="M58 180 Q90 190 122 180 L118 208 Q90 214 62 208 Z" fill="none" stroke={stroke} strokeWidth={sw} />
          {/* Adductor peaks — inguinal V */}
          <path d="M80 190 L90 210 L100 190" stroke={stroke} strokeWidth="0.8" fill="none" />

          {/* Quads — 4 heads per leg (lower) */}
          {/* Left leg */}
          <path d="M60 215 Q52 260 58 310 L70 310 Q72 260 72 215 Z" fill={c.lower} opacity="0.92" />
          <path d="M72 215 Q70 260 70 310 L82 310 Q84 260 84 215 Z" fill={c.lower} opacity="0.88" />
          <path d="M84 215 Q84 240 84 268 L92 268 L92 215 Z" fill={c.lower} opacity="0.82" />
          {/* Vastus medialis drop */}
          <path d="M78 290 Q82 305 86 315 L72 315 Q74 305 74 290 Z" fill={c.lower} opacity="0.98" />

          {/* Right leg */}
          <path d="M120 215 Q128 260 122 310 L110 310 Q108 260 108 215 Z" fill={c.lower} opacity="0.92" />
          <path d="M108 215 Q110 260 110 310 L98 310 Q96 260 96 215 Z" fill={c.lower} opacity="0.88" />
          <path d="M96 215 Q96 240 96 268 L88 268 L88 215 Z" fill={c.lower} opacity="0.82" />
          <path d="M102 290 Q98 305 94 315 L108 315 Q106 305 106 290 Z" fill={c.lower} opacity="0.98" />

          {/* Knees + shin outline */}
          <path d="M58 316 Q52 360 60 400 L72 400 Q76 360 72 316 Z" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M122 316 Q128 360 120 400 L108 400 Q104 360 108 316 Z" fill="none" stroke={stroke} strokeWidth={sw} />

          {/* Tibialis anterior + peroneus (extra) */}
          <path d="M65 326 Q60 360 65 392 L70 392 Q72 360 70 326 Z" fill={c.extra} opacity="0.75" />
          <path d="M115 326 Q120 360 115 392 L110 392 Q108 360 110 326 Z" fill={c.extra} opacity="0.75" />

          {/* Feet */}
          <path d="M60 400 Q56 412 64 418 L72 418 Q76 412 72 400 Z" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M120 400 Q124 412 116 418 L108 418 Q104 412 108 400 Z" fill="none" stroke={stroke} strokeWidth={sw} />

          <text x="90" y="440" textAnchor="middle" className={styles.caption}>ПРЕДНА</text>
        </g>

        {/* ═════════ BACK ═════════ */}
        <g transform="translate(180 12)">

          <circle cx="90" cy="30" r="18" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M82 46 L82 58 Q90 63 98 58 L98 46" fill="none" stroke={stroke} strokeWidth={sw} />

          <path d="M60 70 Q50 92 54 130 L58 180 Q52 200 58 220 Q90 232 122 220
                   Q126 200 122 180 L126 130 Q130 92 120 70 Q90 62 60 70 Z"
                fill="none" stroke={stroke} strokeWidth={sw} />

          {/* Trapezius — upper + middle sections (extra) */}
          <path d="M90 58 L72 74 Q68 92 74 108 L90 116 L106 108 Q112 92 108 74 Z"
                fill={c.extra} opacity="0.9" />
          <line x1="90" y1="58" x2="90" y2="116" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />

          {/* Rear deltoids (upper) */}
          <path d="M60 72 Q52 86 58 100 Q66 98 68 88 Q68 74 64 72 Z" fill={c.upper} opacity="0.92" />
          <path d="M120 72 Q128 86 122 100 Q114 98 112 88 Q112 74 116 72 Z" fill={c.upper} opacity="0.92" />
          {/* Infraspinatus edge (upper) */}
          <path d="M62 102 Q60 118 68 124 Q74 118 72 106 Z" fill={c.upper} opacity="0.7" />
          <path d="M118 102 Q120 118 112 124 Q106 118 108 106 Z" fill={c.upper} opacity="0.7" />

          {/* Rhomboids — small diamond between shoulder blades (pull) */}
          <path d="M84 110 L90 118 L96 110 L90 102 Z" fill={c.pull} opacity="0.7" />

          {/* Latissimus dorsi — big wings (pull) */}
          <path d="M72 108 Q60 140 66 180 L90 184 L90 128 Q80 120 72 108 Z"
                fill={c.pull} opacity="0.95" />
          <path d="M108 108 Q120 140 114 180 L90 184 L90 128 Q100 120 108 108 Z"
                fill={c.pull} opacity="0.95" />
          {/* Teres major bump */}
          <path d="M70 112 Q66 124 72 132" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none" />
          <path d="M110 112 Q114 124 108 132" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none" />

          {/* Triceps — long, lateral, medial heads (upper) */}
          <path d="M50 104 Q44 132 48 156 Q56 156 60 132 Q58 104 50 104 Z" fill={c.upper} opacity="0.92" />
          <path d="M60 108 Q58 132 60 154 L66 154 Q66 132 64 108 Z" fill={c.upper} opacity="0.82" />
          <path d="M130 104 Q136 132 132 156 Q124 156 120 132 Q122 104 130 104 Z" fill={c.upper} opacity="0.92" />
          <path d="M120 108 Q122 132 120 154 L114 154 Q114 132 116 108 Z" fill={c.upper} opacity="0.82" />

          {/* Forearms extensors (extra) */}
          <path d="M48 158 Q42 190 46 220 Q56 220 58 190 Q56 158 48 158 Z" fill={c.extra} opacity="0.85" />
          <path d="M58 158 Q56 190 58 218 L64 218 Q66 190 64 158 Z" fill={c.extra} opacity="0.7" />
          <path d="M132 158 Q138 190 134 220 Q124 220 122 190 Q124 158 132 158 Z" fill={c.extra} opacity="0.85" />
          <path d="M122 158 Q124 190 122 218 L116 218 Q114 190 116 158 Z" fill={c.extra} opacity="0.7" />

          {/* Erector spinae (extra) — two columns down spine */}
          <path d="M82 130 L82 178 L88 178 L88 130 Z" fill={c.extra} opacity="0.75" />
          <path d="M92 130 L92 178 L98 178 L98 130 Z" fill={c.extra} opacity="0.75" />

          {/* Gluteus maximus + medius (lower) */}
          <path d="M60 184 Q52 214 66 224 L90 224 L90 186 Q74 182 60 184 Z"
                fill={c.lower} opacity="0.95" />
          <path d="M120 184 Q128 214 114 224 L90 224 L90 186 Q106 182 120 184 Z"
                fill={c.lower} opacity="0.95" />
          {/* Gluteus medius side caps */}
          <path d="M58 184 Q56 200 62 210" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none" />
          <path d="M122 184 Q124 200 118 210" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none" />

          {/* Hamstrings — biceps femoris + semi (lower) */}
          <path d="M60 228 Q52 270 58 310 L72 310 Q74 270 74 228 Z" fill={c.lower} opacity="0.9" />
          <path d="M74 228 Q72 270 74 310 L86 310 Q88 270 88 228 Z" fill={c.lower} opacity="0.85" />
          <path d="M120 228 Q128 270 122 310 L108 310 Q106 270 106 228 Z" fill={c.lower} opacity="0.9" />
          <path d="M106 228 Q108 270 106 310 L94 310 Q92 270 92 228 Z" fill={c.lower} opacity="0.85" />

          {/* Popliteal fossa (knee back) */}
          <path d="M62 314 Q72 318 82 314" stroke={stroke} strokeWidth="0.7" fill="none" />
          <path d="M118 314 Q108 318 98 314" stroke={stroke} strokeWidth="0.7" fill="none" />

          {/* Gastrocnemius — medial + lateral heads (extra) */}
          <path d="M58 320 Q52 350 58 380 L68 380 Q72 350 70 320 Z" fill={c.extra} opacity="0.95" />
          <path d="M70 320 Q74 350 72 380 L82 380 Q78 350 78 320 Z" fill={c.extra} opacity="0.88" />
          <path d="M122 320 Q128 350 122 380 L112 380 Q108 350 110 320 Z" fill={c.extra} opacity="0.95" />
          <path d="M110 320 Q106 350 108 380 L98 380 Q102 350 102 320 Z" fill={c.extra} opacity="0.88" />
          {/* Soleus (below gastroc) */}
          <path d="M60 382 Q58 395 64 400 L74 400 Q78 395 74 382 Z" fill={c.extra} opacity="0.75" />
          <path d="M120 382 Q122 395 116 400 L106 400 Q102 395 106 382 Z" fill={c.extra} opacity="0.75" />

          {/* Lower leg outline */}
          <path d="M58 316 Q52 360 60 400 L72 400 Q76 360 72 316 Z" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M122 316 Q128 360 120 400 L108 400 Q104 360 108 316 Z" fill="none" stroke={stroke} strokeWidth={sw} />

          {/* Feet */}
          <path d="M60 400 Q56 412 64 418 L72 418 Q76 412 72 400 Z" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M120 400 Q124 412 116 418 L108 418 Q104 412 108 400 Z" fill="none" stroke={stroke} strokeWidth={sw} />

          <text x="90" y="440" textAnchor="middle" className={styles.caption}>ЗАДНА</text>
        </g>
      </svg>

      {activeHint && <p className={styles.hint}>{activeHint}</p>}
    </div>
  )
}
