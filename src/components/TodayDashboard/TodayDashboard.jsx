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
        <span className={styles.cardLabel}>КАЛОРИИ ДНЕС</span>
        <div className={styles.pieRow}>
          <MacroPie totals={totals} targets={targets} />
          <div className={styles.legend}>
            <LegendItem color="#42A5F5" label="ПРОТЕИН" value={Math.round(totals.protein || 0)} target={targets.protein} />
            <LegendItem color="#66BB6A" label="ВЪГЛЕХИДРАТИ" value={Math.round(totals.carbs || 0)} target={targets.carbs} />
            <LegendItem color="#ffb74d" label="МАЗНИНИ" value={Math.round(totals.fat || 0)} target={targets.fat} />
          </div>
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

function MacroPie({ totals, targets }) {
  const r    = 44
  const sw   = 15
  const circ = 2 * Math.PI * r

  const pKcal = (totals.protein || 0) * 4
  const cKcal = (totals.carbs   || 0) * 4
  const fKcal = (totals.fat     || 0) * 9
  const tKcal = Math.max(targets.kcal || 1, 1)

  const pLen = Math.min(pKcal / tKcal, 1) * circ
  const cLen = Math.min(cKcal / tKcal, Math.max(0, 1 - pKcal / tKcal)) * circ
  const fLen = Math.min(fKcal / tKcal, Math.max(0, 1 - (pKcal + cKcal) / tKcal)) * circ

  const over = (totals.kcal || 0) > tKcal

  return (
    <svg width="130" height="130" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth={sw} />
      {/* Fat */}
      {fLen > 0.5 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="#ffb74d" strokeWidth={sw}
          strokeDasharray={`${fLen} ${circ}`}
          strokeDashoffset={-(pLen + cLen)}
          transform="rotate(-90 60 60)"
          strokeLinecap="butt"
        />
      )}
      {/* Carbs */}
      {cLen > 0.5 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="#66BB6A" strokeWidth={sw}
          strokeDasharray={`${cLen} ${circ}`}
          strokeDashoffset={-pLen}
          transform="rotate(-90 60 60)"
          strokeLinecap="butt"
        />
      )}
      {/* Protein */}
      {pLen > 0.5 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="#42A5F5" strokeWidth={sw}
          strokeDasharray={`${pLen} ${circ}`}
          strokeDashoffset={0}
          transform="rotate(-90 60 60)"
          strokeLinecap="butt"
        />
      )}
      {/* Center kcal */}
      <text x="60" y="53" textAnchor="middle"
        fill={over ? '#ef5350' : 'var(--text)'}
        fontSize="22" fontFamily="'Bebas Neue', sans-serif" letterSpacing="1">
        {Math.round(totals.kcal || 0)}
      </text>
      <text x="60" y="66" textAnchor="middle"
        fill="var(--muted)" fontSize="9" fontFamily="'JetBrains Mono', monospace">
        ккал
      </text>
      <text x="60" y="78" textAnchor="middle"
        fill="var(--muted)" fontSize="9" fontFamily="'JetBrains Mono', monospace">
        / {targets.kcal}
      </text>
    </svg>
  )
}

function LegendItem({ color, label, value, target }) {
  const over = target > 0 && value > target
  return (
    <div className={styles.legendItem}>
      <span className={styles.legendDot} style={{ background: color }} />
      <div className={styles.legendText}>
        <span className={styles.legendLabel}>{label}</span>
        <span className={`${styles.legendVal} ${over ? styles.legendOver : ''}`}>
          {value}g <span className={styles.legendTarget}>/ {target}g</span>
        </span>
      </div>
    </div>
  )
}
