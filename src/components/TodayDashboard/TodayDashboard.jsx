import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFoodLog } from '../../hooks/useFoodLog'
import { useWeightLog } from '../../hooks/useWeightLog'
import styles from './TodayDashboard.module.css'

export default function TodayDashboard({ onNavigate }) {
  const { profile } = useAuth()
  const { log, totals, addRawEntry } = useFoodLog()
  const { todayEntry, weights, addWeight } = useWeightLog()
  const [weightInput, setWeightInput] = useState('')
  const [weightSaved, setWeightSaved] = useState(false)

  const targets = {
    kcal:    profile?.calories ?? 0,
    protein: profile?.protein  ?? 0,
    carbs:   profile?.carbs    ?? 0,
    fat:     profile?.fat      ?? 0,
  }

  const pctKcal    = targets.kcal > 0 ? Math.min(1, (totals.kcal || 0) / targets.kcal) : 0
  const kcalLeft   = Math.max(0, targets.kcal - (totals.kcal || 0))
  const recentFood = [...(log || [])].reverse().slice(0, 3)

  const lastWeight = weights.length > 1 ? weights[weights.length - 2] : null
  const hour       = new Date().getHours()
  const greeting   = hour < 12 ? 'ДОБРО УТРО' : hour < 18 ? 'ДОБЪР ДЕН' : 'ДОБЪР ВЕЧЕР'

  async function handleLogWeight() {
    const kg = parseFloat(weightInput.replace(',', '.'))
    if (!kg || kg < 20 || kg > 300) return
    await addWeight(kg)
    setWeightInput('')
    setWeightSaved(true)
    setTimeout(() => setWeightSaved(false), 2000)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.greeting}>{greeting}</p>
        <h1 className={styles.name}>{profile?.name?.split(' ')[0]?.toUpperCase() ?? 'BLAG'}</h1>
      </header>

      {/* ── Calories card ── */}
      <div className={styles.card}>
        <div className={styles.cardRow}>
          <span className={styles.cardLabel}>КАЛОРИИ ДНЕС</span>
          <span className={styles.kcalVal}>
            <span className={styles.kcalEaten}>{Math.round(totals.kcal || 0)}</span>
            <span className={styles.kcalSep}> / </span>
            <span className={styles.kcalTarget}>{targets.kcal}</span>
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${pctKcal >= 1 ? styles.progressFull : ''}`}
            style={{ width: `${pctKcal * 100}%` }}
          />
        </div>

        <div className={styles.macroRow}>
          <MacroChip label="ПРОТЕИН" value={Math.round(totals.protein || 0)} target={targets.protein} unit="g" />
          <MacroChip label="ВЪГЛЕХ." value={Math.round(totals.carbs   || 0)} target={targets.carbs}   unit="g" />
          <MacroChip label="МАЗНИНИ" value={Math.round(totals.fat     || 0)} target={targets.fat}     unit="g" />
        </div>

        {kcalLeft > 0 && (
          <p className={styles.kcalHint}>Остават {Math.round(kcalLeft)} ккал за деня</p>
        )}
      </div>

      {/* ── Quick log button ── */}
      <button className={styles.logBtn} onClick={() => onNavigate('nutrition')} type="button">
        + ЛОГНИ ХРАНА
      </button>

      {/* ── Recent food ── */}
      {recentFood.length > 0 && (
        <div className={styles.card}>
          <span className={styles.cardLabel}>ПОСЛЕДНО ДОБАВЕНО</span>
          <div className={styles.recentList}>
            {recentFood.map((f, i) => (
              <div key={i} className={styles.recentRow}>
                <span className={styles.recentName}>{f.name}</span>
                <span className={styles.recentKcal}>{f.kcal} ккал</span>
              </div>
            ))}
          </div>
          <button className={styles.seeAll} onClick={() => onNavigate('nutrition')} type="button">
            Виж всичко →
          </button>
        </div>
      )}

      {/* ── Weight ── */}
      <div className={styles.card}>
        <span className={styles.cardLabel}>ТЕГЛО</span>
        {todayEntry ? (
          <div className={styles.weightDone}>
            <span className={styles.weightVal}>{todayEntry.kg} кг</span>
            <span className={styles.weightTag}>логнато днес</span>
            {lastWeight && (
              <span className={styles.weightDelta}>
                {todayEntry.kg > lastWeight.kg ? '+' : ''}{Math.round((todayEntry.kg - lastWeight.kg) * 10) / 10} кг от последното
              </span>
            )}
          </div>
        ) : (
          <>
            {weights.length > 0 && (
              <p className={styles.weightLast}>Последно: {weights[weights.length - 1].kg} кг</p>
            )}
            <div className={styles.weightRow}>
              <input
                className={styles.weightInput}
                type="number"
                inputMode="decimal"
                placeholder="0.0 кг"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
              />
              <button
                className={`${styles.weightBtn} ${weightSaved ? styles.weightBtnSaved : ''}`}
                onClick={handleLogWeight}
                type="button"
              >
                {weightSaved ? '✓' : 'ЛОГНИ'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Check-in shortcut ── */}
      <button className={styles.checkinCard} onClick={() => onNavigate('profile')} type="button">
        <div className={styles.checkinText}>
          <span className={styles.cardLabel}>СЕДМИЧЕН ЧЕК-ИН</span>
          <span className={styles.checkinSub}>Снимки · Съни · Прогрес</span>
        </div>
        <span className={styles.checkinArrow}>→</span>
      </button>
    </div>
  )
}

function MacroChip({ label, value, target, unit }) {
  const over = target > 0 && value > target
  return (
    <div className={styles.macroChip}>
      <span className={styles.macroChipLabel}>{label}</span>
      <span className={`${styles.macroChipVal} ${over ? styles.macroOver : ''}`}>
        {value}{unit}
      </span>
      <span className={styles.macroChipTarget}>/ {target}{unit}</span>
    </div>
  )
}
