import { useState, useMemo } from 'react'
import styles from './MealCards.module.css'

const MEALS = [
  {
    id: 'yufka',
    name: 'Протеинова Юфка + Whey',
    category: 'pre',
    categoryLabel: 'ПРЕДИ ТРЕНИРОВКА',
    macros: { kcal: 466, protein: 34.5, carbs: 78.4, fat: 3.1 },
    prepMin: 2,
    prepLabel: '2 мин',
    price: { bgn: '1.14 – 2.54 лв.', eur: '0.58 – 1.30 €' },
    tools: ['Купа', 'Топла вода'],
    source: null,
    photo: '/meals/yufka.jpeg',
  },
  {
    id: 'sladuk',
    name: 'Телешка кайма + Сладък картоф',
    category: 'post',
    categoryLabel: 'СЛЕД ТРЕНИРОВКА',
    macros: { kcal: 442, protein: 39.4, carbs: 46.1, fat: 6.8 },
    prepMin: 37,
    prepLabel: '35 – 40 мин',
    price: { bgn: '3.85 лв.', eur: '1.97 €' },
    tools: ['Фурна / Еър фрайър', 'Котлон'],
    source: 'Kaufland',
    photo: '/meals/sladuk.jpeg',
  },
]

const MACRO_META = [
  { key: 'kcal',    label: 'ККАЛ',  unit: '',  color: '#F06292', max: 550 },
  { key: 'protein', label: 'ПРОТЕИН', unit: 'g', color: '#66BB6A', max: 50  },
  { key: 'carbs',   label: 'ВЪГЛЕХИДРАТИ',   unit: 'g', color: '#4FC3F7', max: 100 },
  { key: 'fat',     label: 'МАЗНИНИ',  unit: 'g', color: '#FFB74D', max: 20  },
]

const CHIPS = [
  { id: 'notime',  label: 'Бързо' },
  { id: 'budget',  label: 'Бюджет' },
  { id: 'protein', label: 'Протеин' },
  { id: 'pre',     label: 'Преди' },
  { id: 'post',    label: 'След' },
]

function MacroRing({ value, unit, label, color, max }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const ratio = Math.min(value / max, 1)
  const offset = circ * (1 - ratio)
  return (
    <div className={styles.ring}>
      <div className={styles.ringSvgWrap}>
        <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
          <circle
            cx="24" cy="24" r={r}
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 24 24)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className={styles.ringCenter}>
          <span className={styles.ringValue}>{value}</span>
          {unit && <span className={styles.ringUnit}>{unit}</span>}
        </div>
      </div>
      <span className={styles.ringLabel}>{label}</span>
    </div>
  )
}

function MealCard({ meal }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className={`${styles.cardScene} ${flipped ? styles.flipped : ''}`}
      onClick={() => setFlipped(f => !f)}
      role="button"
      aria-label={`${meal.name} — нажми за снимка`}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setFlipped(f => !f)}
    >
      <div className={styles.cardInner}>

        {/* FRONT */}
        <div className={styles.cardFront}>
          <div className={styles.cardFrontTop}>
            <span className={`${styles.badge} ${meal.category === 'pre' ? styles.badgePre : styles.badgePost}`}>
              {meal.categoryLabel}
            </span>
            <h3 className={styles.mealName}>{meal.name}</h3>
          </div>

          <div className={styles.ringsGrid}>
            {MACRO_META.map(m => (
              <MacroRing
                key={m.key}
                value={meal.macros[m.key]}
                unit={m.unit}
                label={m.label}
                color={m.color}
                max={m.max}
              />
            ))}
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.footerItem}>
              <span className={styles.footerIcon}>⏱</span>
              <span className={styles.footerText}>{meal.prepLabel}</span>
            </div>
            <div className={styles.footerDivider} />
            <div className={styles.footerItem}>
              <span className={styles.footerIcon}>₣</span>
              <span className={styles.footerText}>{meal.price.bgn}</span>
            </div>
            <div className={styles.footerDivider} />
            <div className={styles.footerItem}>
              <span className={styles.footerText}>{meal.price.eur}</span>
            </div>
          </div>

          <span className={styles.flipHint}>Натисни за снимка ↩</span>
        </div>

        {/* BACK */}
        <div className={styles.cardBack}>
          <img src={meal.photo} alt={meal.name} className={styles.mealPhoto} />
          <div className={styles.backOverlay}>
            <p className={styles.backTitle}>{meal.name}</p>
            <div className={styles.toolsList}>
              {meal.tools.map(t => (
                <span key={t} className={styles.toolChip}>{t}</span>
              ))}
            </div>
            {meal.source && (
              <span className={styles.sourceTag}>📍 {meal.source}</span>
            )}
          </div>
          <span className={styles.flipHintBack}>Натисни за макроси ↩</span>
        </div>

      </div>
    </div>
  )
}

function getFiltered(query, activeChips) {
  const q = query.toLowerCase()
  return MEALS.filter(meal => {
    if (activeChips.has('notime')  && meal.prepMin > 5)              return false
    if (activeChips.has('budget')  && meal.macros.kcal > 450 && meal.prepMin > 5) return false
    if (activeChips.has('protein') && meal.macros.protein < 37)      return false
    if (activeChips.has('pre')     && meal.category !== 'pre')        return false
    if (activeChips.has('post')    && meal.category !== 'post')       return false
    if (q) {
      const timeWords    = ['бързо','бърза','нямам','минута','2 мин','no time','quick']
      const budgetWords  = ['евтин','бюджет','budget','cheap']
      const proteinWords = ['протеин','protein','мускул']
      const preWords     = ['преди','pre','before']
      const postWords    = ['след','post','after']
      if (timeWords.some(w => q.includes(w))    && meal.prepMin > 5)         return false
      if (budgetWords.some(w => q.includes(w))  && meal.prepMin > 20)        return false
      if (proteinWords.some(w => q.includes(w)) && meal.macros.protein < 37) return false
      if (preWords.some(w => q.includes(w))     && meal.category !== 'pre')   return false
      if (postWords.some(w => q.includes(w))    && meal.category !== 'post')  return false
    }
    return true
  })
}

export default function MealCards() {
  const [query, setQuery]           = useState('')
  const [activeChips, setActiveChips] = useState(new Set())

  function toggleChip(id) {
    setActiveChips(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => getFiltered(query, activeChips), [query, activeChips])

  const suggestion = filtered.length === 1
    ? `💡 Препоръчваме: ${filtered[0].name}`
    : filtered.length === 0
    ? '🤔 Няма съвпадение — опитай друг филтър'
    : null

  return (
    <div className={styles.wrap}>

      {/* AI filter bar */}
      <div className={styles.filterBar}>
        <input
          className={styles.filterInput}
          type="text"
          placeholder="Опиши ситуацията... (напр. нямам време)"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Quick chips */}
      <div className={styles.chips}>
        {CHIPS.map(chip => (
          <button
            key={chip.id}
            className={`${styles.chip} ${activeChips.has(chip.id) ? styles.chipActive : ''}`}
            onClick={() => toggleChip(chip.id)}
            type="button"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {suggestion && <p className={styles.suggestion}>{suggestion}</p>}

      {/* Cards */}
      <div className={styles.cardList}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>Няма резултати. Опитай друг филтър.</p>
        ) : (
          filtered.map(meal => <MealCard key={meal.id} meal={meal} />)
        )}
      </div>
    </div>
  )
}
