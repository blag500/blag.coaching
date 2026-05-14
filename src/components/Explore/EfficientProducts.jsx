import { useState } from 'react'
import styles from './EfficientProducts.module.css'

// protein per 100 kcal = protein / (kcal / 100)
const PRODUCTS = [
  {
    id: 'pilesni-gurdi',
    name: 'Пилешки гърди',
    category: 'protein',
    store: 'Kaufland / Billa / Lidl',
    pricePer100g: '1.20 – 1.80 лв.',
    per100g: { kcal: 105, protein: 23, carbs: 0, fat: 1.5 },
    tip: 'Купувай в семейна опаковка — значително по-евтино. Грилуй на тефлон, осоли след готвене.',
    efficiency: 5,
  },
  {
    id: 'tson-konserva',
    name: 'Риба тон (в собствен сок)',
    category: 'fish',
    store: 'Kaufland / Lidl / Billa',
    pricePer100g: '0.70 – 1.10 лв.',
    per100g: { kcal: 116, protein: 25, carbs: 0, fat: 1 },
    tip: 'Избирай "в собствен сок" вместо в олио. Идеален за бърза закуска или салата.',
    efficiency: 5,
  },
  {
    id: 'izvara',
    name: 'Извара 0%',
    category: 'dairy',
    store: 'Kaufland / Billa',
    pricePer100g: '0.45 – 0.65 лв.',
    per100g: { kcal: 60, protein: 11, carbs: 4, fat: 0.3 },
    tip: 'Една от най-евтините протеинови храни. Смесвай с мед и плодове за десерт с добри макроси.',
    efficiency: 5,
  },
  {
    id: 'grutsko-kismlyako',
    name: 'Гръцко кисело мляко 0%',
    category: 'dairy',
    store: 'Lidl / Kaufland',
    pricePer100g: '0.30 – 0.50 лв.',
    per100g: { kcal: 57, protein: 10, carbs: 3.6, fat: 0.2 },
    tip: 'Lidl Milbona е отлично съотношение цена/качество. Добавяй при закуска или като снак.',
    efficiency: 5,
  },
  {
    id: 'yaytsa',
    name: 'Яйца',
    category: 'eggs',
    store: 'Навсякъде',
    pricePer100g: '0.20 – 0.35 лв.',
    per100g: { kcal: 155, protein: 13, carbs: 1, fat: 11 },
    tip: '1 яйце ≈ 7g протеин. Белтъкът е почти чист протеин (3.5g), жълтъкът добавя здравословни мазнини.',
    efficiency: 3,
  },
  {
    id: 'skumriya',
    name: 'Скумрия (замразена)',
    category: 'fish',
    store: 'Kaufland / Billa',
    pricePer100g: '0.50 – 0.80 лв.',
    per100g: { kcal: 158, protein: 19, carbs: 0, fat: 9 },
    tip: 'Богата на Омега-3 мастни киселини. Идеална за фурна — 20 мин на 200°C.',
    efficiency: 4,
  },
  {
    id: 'pureshko-file',
    name: 'Пуешко филе',
    category: 'protein',
    store: 'Kaufland / Billa',
    pricePer100g: '1.40 – 2.00 лв.',
    per100g: { kcal: 99, protein: 22, carbs: 0, fat: 0.7 },
    tip: 'Почти идентичен с пилешкото, малко по-нежен вкус. Подходящ за meal prep.',
    efficiency: 5,
  },
  {
    id: 'protein-prash',
    name: 'Суроватъчен протеин',
    category: 'supplement',
    store: 'myprotein.com / bodybuilding.bg',
    pricePer100g: '1.50 – 2.50 лв.',
    per100g: { kcal: 400, protein: 78, carbs: 8, fat: 5 },
    tip: 'Myprotein Impact Whey е най-изгодният на пазара. Купувай при промоции (-50%).',
    efficiency: 5,
  },
  {
    id: 'lentensi',
    name: 'Леща (сварена)',
    category: 'legumes',
    store: 'Навсякъде',
    pricePer100g: '0.10 – 0.20 лв.',
    per100g: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
    tip: 'Най-евтиният протеинов източник. Богата на фибри и желязо. Не е пълноценен протеин — комбинирай с месо или яйца.',
    efficiency: 3,
  },
  {
    id: 'nakut',
    name: 'Нахут (сварен)',
    category: 'legumes',
    store: 'Навсякъде',
    pricePer100g: '0.15 – 0.25 лв.',
    per100g: { kcal: 160, protein: 9, carbs: 27, fat: 2.6 },
    tip: 'Добра алтернатива за разнообразие. Запичай в ер фрайър за хрупкав снак с 9g протеин.',
    efficiency: 2,
  },
]

const CATEGORY_LABELS = {
  protein:    'Птиче месо',
  fish:       'Риба',
  dairy:      'Млечни',
  eggs:       'Яйца',
  supplement: 'Добавки',
  legumes:    'Бобови',
}

const CATEGORY_COLORS = {
  protein:    '#ffb74d',
  fish:       '#4FC3F7',
  dairy:      '#81C784',
  eggs:       '#FFD54F',
  supplement: '#CE93D8',
  legumes:    '#A5D6A7',
}

const FILTERS = [
  { id: 'all',        label: 'Всички' },
  { id: 'protein',    label: 'Птиче' },
  { id: 'fish',       label: 'Риба' },
  { id: 'dairy',      label: 'Млечни' },
  { id: 'eggs',       label: 'Яйца' },
  { id: 'supplement', label: 'Добавки' },
  { id: 'legumes',    label: 'Бобови' },
]

function efficiencyStars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

function proteinPer100kcal(p) {
  return Math.round((p.protein / p.kcal) * 100 * 10) / 10
}

function ProductCard({ product }) {
  const [flipped, setFlipped] = useState(false)
  const p100kcal = proteinPer100kcal(product.per100g)
  const catColor = CATEGORY_COLORS[product.category] || '#ffb74d'

  return (
    <div
      className={`${styles.cardWrap} ${flipped ? styles.flipped : ''}`}
      onClick={() => setFlipped(v => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setFlipped(v => !v)}
      aria-label={`${product.name} — натисни за детайли`}
    >
      <div className={styles.cardInner}>
        {/* Front */}
        <div className={styles.cardFace}>
          <div className={styles.catBadge} style={{ background: catColor + '22', color: catColor, borderColor: catColor + '44' }}>
            {CATEGORY_LABELS[product.category]}
          </div>
          <h3 className={styles.cardName}>{product.name}</h3>
          <div className={styles.heroStat}>
            <span className={styles.heroNum}>{product.per100g.protein}g</span>
            <span className={styles.heroLabel}>протеин / 100g</span>
          </div>
          <div className={styles.frontRow}>
            <div className={styles.frontStat}>
              <span className={styles.frontNum}>{product.per100g.kcal}</span>
              <span className={styles.frontUnit}>ккал</span>
            </div>
            <div className={styles.frontStat}>
              <span className={styles.frontNum} style={{ color: catColor }}>{p100kcal}g</span>
              <span className={styles.frontUnit}>П/100ккал</span>
            </div>
          </div>
          <div className={styles.frontStore}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {product.store}
          </div>
          <div className={styles.frontPrice}>{product.pricePer100g}</div>
          <div className={styles.stars} aria-label={`${product.efficiency} от 5 звезди ефективност`}>
            {efficiencyStars(product.efficiency)}
          </div>
          <span className={styles.flipHint}>Натисни за детайли ↩</span>
        </div>

        {/* Back */}
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          <h3 className={styles.backName}>{product.name}</h3>
          <div className={styles.macroGrid}>
            {[
              { label: 'Ккал',          val: product.per100g.kcal,    color: '#F06292', unit: '' },
              { label: 'Протеин',       val: product.per100g.protein, color: '#66BB6A', unit: 'g' },
              { label: 'Въглехидрати', val: product.per100g.carbs,   color: '#4FC3F7', unit: 'g' },
              { label: 'Мазнини',       val: product.per100g.fat,     color: '#FFB74D', unit: 'g' },
            ].map(m => (
              <div key={m.label} className={styles.macroBox}>
                <span className={styles.macroVal} style={{ color: m.color }}>{m.val}{m.unit}</span>
                <span className={styles.macroLbl}>{m.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.effRow}>
            <span className={styles.effLabel}>П / 100 ККАЛ</span>
            <span className={styles.effVal}>{p100kcal}g</span>
          </div>
          <div className={styles.tipBox}>
            <span className={styles.tipIcon}>💡</span>
            <p className={styles.tipText}>{product.tip}</p>
          </div>
          <span className={styles.flipHint}>Натисни за затваряне ↩</span>
        </div>
      </div>
    </div>
  )
}

export default function EfficientProducts({ onBack }) {
  const [filter, setFilter] = useState('all')

  const visible = filter === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === filter)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">
          ← ОТКРИЙ
        </button>
        <h1 className={styles.title}>ЕФЕКТИВНИ ПРОДУКТИ</h1>
        <p className={styles.subtitle}>Протеин · Цена · Магазин — 100g база</p>
      </header>

      <div className={styles.filterBar}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`${styles.chip} ${filter === f.id ? styles.chipActive : ''}`}
            onClick={() => setFilter(f.id)}
            type="button"
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.cards}>
        {visible.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
