import { useEffect, useRef, useState } from 'react'
import styles from './MacroDonut.module.css'

// Каларичен принос по грам за всеки макрос
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 }

/**
 * Единичен пръстен с 3 арк-сегмента (Протеин · Въглехидрати · Мазнини),
 * пропорционални на каларичния им принос към общото прието днес.
 * В центъра — общ ккал; отдясно — статусен етикет спрямо целта.
 */
export default function MacroDonut({ totals, targets }) {
  const p = Math.max(0, totals?.protein || 0)
  const c = Math.max(0, totals?.carbs   || 0)
  const f = Math.max(0, totals?.fat     || 0)

  const kcalP = p * KCAL_PER_G.protein
  const kcalC = c * KCAL_PER_G.carbs
  const kcalF = f * KCAL_PER_G.fat
  const totalKcal = Math.max(0, Math.round(totals?.kcal || 0))
  const sumMacroKcal = kcalP + kcalC + kcalF

  const hasData = sumMacroKcal > 0
  const targetKcal = targets?.kcal ?? 0

  // Статус спрямо целта
  const remaining = Math.max(0, targetKcal - totalKcal)
  const over      = targetKcal > 0 && totalKcal > targetKcal
  const status = !targetKcal
    ? { label: 'Няма цел', tone: 'muted' }
    : over
    ? { label: `+${totalKcal - targetKcal} над`, tone: 'over' }
    : totalKcal >= targetKcal * 0.9
    ? { label: 'Постигна', tone: 'ok' }
    : totalKcal >= targetKcal * 0.5
    ? { label: 'На път', tone: 'progress' }
    : totalKcal > 0
    ? { label: 'Начало', tone: 'progress' }
    : { label: 'Още не', tone: 'muted' }

  // Пропорции — колко от периметъра заема всеки макрос
  const shareP = hasData ? kcalP / sumMacroKcal : 0
  const shareC = hasData ? kcalC / sumMacroKcal : 0
  const shareF = hasData ? kcalF / sumMacroKcal : 0

  // SVG геометрия
  const cx = 60, cy = 60, r = 46, sw = 12
  const circ = 2 * Math.PI * r
  const GAP  = 4                     // визуален разрив между сегментите
  const gapCount = hasData ? 3 : 0
  const available = circ - GAP * gapCount

  // Плавна анимация от 0 → цел
  const [anim, setAnim] = useState({ p: 0, c: 0, f: 0 })
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      requestAnimationFrame(() => setAnim({ p: shareP, c: shareC, f: shareF }))
      return
    }
    setAnim({ p: shareP, c: shareC, f: shareF })
  }, [shareP, shareC, shareF])

  const lenP = available * anim.p
  const lenC = available * anim.c
  const lenF = available * anim.f

  // Върти всяка арка на съответното място
  const startP = -90                                                          // top
  const startC = startP + (available * shareP / circ) * 360 + (GAP / circ) * 360
  const startF = startC + (available * shareC / circ) * 360 + (GAP / circ) * 360

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>МАКРО БАЛАНС</span>
        <span className={styles.subtitle}>днес</span>
      </div>

      <div className={styles.body}>
        <svg viewBox="0 0 120 120" className={styles.svg} aria-hidden="true">
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={sw}
          />
          {/* Ако няма данни — само track и голямо число в центъра */}
          {hasData && (
            <>
              <Arc cx={cx} cy={cy} r={r} sw={sw} color="#66BB6A"
                length={lenP} circ={circ} rotate={startP} />
              <Arc cx={cx} cy={cy} r={r} sw={sw} color="#4FC3F7"
                length={lenC} circ={circ} rotate={startC} />
              <Arc cx={cx} cy={cy} r={r} sw={sw} color="#ffb74d"
                length={lenF} circ={circ} rotate={startF} />
            </>
          )}
        </svg>

        <div className={styles.center}>
          <div className={styles.centerNum}>{totalKcal}</div>
          <div className={styles.centerUnit}>ккал</div>
        </div>

        <div className={styles.statusBlock}>
          <div className={`${styles.status} ${styles['status_' + status.tone]}`}>
            {status.label}
          </div>
          {targetKcal > 0 && !over && (
            <div className={styles.statusSub}>
              {remaining} ккал<br/>оставащи
            </div>
          )}
          {targetKcal > 0 && over && (
            <div className={styles.statusSub}>
              спрямо<br/>{targetKcal} ккал
            </div>
          )}
        </div>
      </div>

      {/* Легенда */}
      <ul className={styles.legend}>
        <LegendRow color="#66BB6A" label="Протеин" g={Math.round(p)} kcal={Math.round(kcalP)} target={targets?.protein} unit="g" />
        <LegendRow color="#4FC3F7" label="Въглехидрати" g={Math.round(c)} kcal={Math.round(kcalC)} target={targets?.carbs} unit="g" />
        <LegendRow color="#ffb74d" label="Мазнини" g={Math.round(f)} kcal={Math.round(kcalF)} target={targets?.fat} unit="g" />
      </ul>
    </div>
  )
}

function Arc({ cx, cy, r, sw, color, length, circ, rotate }) {
  return (
    <circle
      cx={cx} cy={cy} r={r}
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeDasharray={`${length} ${circ}`}
      strokeLinecap="round"
      transform={`rotate(${rotate} ${cx} ${cy})`}
      style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)' }}
    />
  )
}

function LegendRow({ color, label, g, kcal, target, unit }) {
  return (
    <li className={styles.legendRow}>
      <span className={styles.legendDot} style={{ background: color }} />
      <span className={styles.legendLabel}>{label}</span>
      <span className={styles.legendValue}>
        <strong>{g}{unit}</strong>
        {target ? <span className={styles.legendTarget}>/ {target}{unit}</span> : null}
        <span className={styles.legendKcal}>· {kcal} ккал</span>
      </span>
    </li>
  )
}
