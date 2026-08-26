import { useRef, useMemo, useState, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './WeightScroller.module.css'

const ROW = 60 // px per row; drives both layout and drag sensitivity

/**
 * Stronger-style vertical weight picker. A fixed strip of every value from
 * min..max is rendered once and translated as the value changes, so the number
 * doesn't teleport — it slides. Three rows are visible at any time: the
 * current pick in the middle, dimmed neighbours above and below.
 *
 * Drag is honoured — a downward swipe decrements (the number above rolls into
 * place), an upward swipe increments. Buttons on the flanks bump by one.
 */
export default function WeightScroller({ value, onChange, min = 30, max = 200 }) {
  const { t } = useSettings()
  const clamp = v => Math.min(max, Math.max(min, v))
  const set   = v => onChange(clamp(v))

  const startY = useRef(null)
  const lastCommit = useRef(value)
  const [dragging, setDragging] = useState(false)

  function onTouchStart(e) {
    startY.current = e.touches[0].clientY
    lastCommit.current = value
    setDragging(true)
  }
  function onTouchMove(e) {
    if (startY.current == null) return
    const dy = e.touches[0].clientY - startY.current
    const steps = -Math.trunc(dy / ROW)
    const target = clamp(lastCommit.current + steps)
    if (target !== value) onChange(target)
  }
  function onTouchEnd() {
    startY.current = null
    setDragging(false)
  }

  const values = useMemo(() => {
    const out = []
    for (let v = min; v <= max; v++) out.push(v)
    return out
  }, [min, max])

  // How far the strip has to shift for `value` to sit in the middle slot.
  const shift = -(value - min) * ROW

  return (
    <div
      className={styles.wrap}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="spinbutton"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
    >
      <div className={styles.frame} aria-hidden="true" />

      <button
        type="button"
        className={styles.bump}
        onClick={() => set(value - 1)}
        aria-label={t('ob.weight.less')}
        style={{ top: 0 }}
      />
      <button
        type="button"
        className={styles.bump}
        onClick={() => set(value + 1)}
        aria-label={t('ob.weight.more')}
        style={{ bottom: 0 }}
      />

      <div className={styles.viewport}>
        <div
          className={styles.strip}
          style={{
            transform: `translateY(${shift}px)`,
            transition: dragging
              ? 'transform 90ms linear'
              : 'transform 260ms cubic-bezier(0.22, 0.9, 0.28, 1)',
          }}
        >
          {values.map(v => {
            const dist = Math.abs(v - value)
            const cls =
              dist === 0 ? styles.rowPick
              : dist === 1 ? styles.rowNear
              : dist === 2 ? styles.rowFar
              : styles.rowHidden
            return (
              <div key={v} className={`${styles.row} ${cls}`}>
                {v} <span className={styles.unit}>kg</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
