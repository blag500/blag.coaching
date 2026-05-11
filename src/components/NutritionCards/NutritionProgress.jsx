import { useFoodLog } from '../../hooks/useFoodLog'
import styles from './NutritionProgress.module.css'

function getTargets() {
  try {
    const p = JSON.parse(localStorage.getItem('blag_profile_v1') || '{}')
    return {
      calories: p.calories || 2450,
      protein:  p.protein  || 180,
      carbs:    250,
      fat:      70,
    }
  } catch {
    return { calories: 2450, protein: 180, carbs: 250, fat: 70 }
  }
}

const BARS = [
  { key: 'calories', label: 'КАЛОРИИ',     unit: 'ккал', color: '#F06292' },
  { key: 'protein',  label: 'ПРОТЕИН',     unit: 'g',    color: '#C8F135' },
  { key: 'carbs',    label: 'ВЪГЛЕХИДРАТИ', unit: 'g',   color: '#4FC3F7' },
  { key: 'fat',      label: 'МАЗНИНИ',     unit: 'g',    color: '#FFB74D' },
]

export default function NutritionProgress() {
  const { totals } = useFoodLog()
  const targets = getTargets()

  return (
    <div className={styles.wrap}>
      <h2 className={styles.heading}>ПРИЕМ ДНЕС</h2>
      {BARS.map(bar => {
        const current = totals[bar.key]
        const target  = targets[bar.key]
        const pct     = Math.min((current / target) * 100, 100)
        const over    = current > target

        return (
          <div key={bar.key} className={styles.row}>
            <div className={styles.meta}>
              <span className={styles.label}>{bar.label}</span>
              <span
                className={styles.values}
                style={{ color: over ? 'var(--red)' : bar.color }}
              >
                {current}
                <span className={styles.unit}>{bar.unit}</span>
                <span className={styles.sep}>/</span>
                {target}
                <span className={styles.unit}>{bar.unit}</span>
              </span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{
                  width: `${pct}%`,
                  background: over ? 'var(--red)' : bar.color,
                  boxShadow: over ? 'none' : `0 0 8px ${bar.color}66`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
