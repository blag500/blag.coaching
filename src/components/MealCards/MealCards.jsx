import { useState, useMemo, useRef, useEffect } from 'react'
import { useMealLibrary } from '../../hooks/useMealLibrary'
import styles from './MealCards.module.css'

// ── System meals (hardcoded) ──────────────────────────────────────────────────

const SYSTEM_MEALS = [
  {
    id: 'yufka',
    name: 'Протеинова Юфка + Whey',
    category: 'pre',
    kcal: 466, protein: 34.5, carbs: 78.4, fat: 3.1,
    serving_grams: 0,
    prep_min: 2,
    price_bgn: '1.14 – 2.54 лв.',
    availability: null,
    tools: ['Купа', 'Топла вода'],
    notes: null,
    photo_url: '/meals/yufka.jpeg',
    isSystem: true,
  },
  {
    id: 'sladuk',
    name: 'Телешка кайма + Сладък картоф',
    category: 'post',
    kcal: 442, protein: 39.4, carbs: 46.1, fat: 6.8,
    serving_grams: 0,
    prep_min: 37,
    price_bgn: '3.85 лв.',
    availability: 'Kaufland',
    tools: ['Фурна / Еър фрайър', 'Котлон'],
    notes: null,
    photo_url: '/meals/sladuk.jpeg',
    isSystem: true,
  },
]

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_META = {
  pre:       { label: 'ПРЕДИ ТРЕНИРОВКА', color: '#4FC3F7' },
  post:      { label: 'СЛЕД ТРЕНИРОВКА',  color: '#66BB6A' },
  breakfast: { label: 'ЗАКУСКА',          color: '#FFB74D' },
  lunch:     { label: 'ОБЯД',             color: '#AB47BC' },
  dinner:    { label: 'ВЕЧЕРЯ',           color: '#FF8A65' },
  snack:     { label: 'СНАК',             color: '#42A5F5' },
  any:       { label: 'ВСЯКО ХРАНЕНЕ',    color: '#78909C' },
}

const MACRO_META = [
  { key: 'kcal',    label: 'ККАЛ',         unit: '',  color: '#F06292', max: 550 },
  { key: 'protein', label: 'ПРОТЕИН',       unit: 'g', color: '#66BB6A', max: 50  },
  { key: 'carbs',   label: 'ВЪГЛЕХИДРАТИ', unit: 'g', color: '#4FC3F7', max: 100 },
  { key: 'fat',     label: 'МАЗНИНИ',      unit: 'g', color: '#FFB74D', max: 20  },
]

const CHIPS = [
  { id: 'notime',    label: 'Бързо'     },
  { id: 'protein',   label: 'Протеин'   },
  { id: 'pre',       label: 'Преди'     },
  { id: 'post',      label: 'След'      },
  { id: 'breakfast', label: 'Закуска'   },
  { id: 'lunch',     label: 'Обяд'      },
  { id: 'dinner',    label: 'Вечеря'    },
  { id: 'snack',     label: 'Снак'      },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function prepLabel(min) {
  if (!min) return null
  if (min < 5)  return `${min} мин`
  if (min <= 10) return `${min} мин`
  return `${min - 5}–${min + 5} мин`
}

function getFiltered(meals, query, activeChips) {
  const q = query.toLowerCase().trim()
  return meals.filter(m => {
    if (activeChips.has('notime')    && m.prep_min > 5)          return false
    if (activeChips.has('protein')   && m.protein  < 30)         return false
    if (activeChips.has('pre')       && m.category !== 'pre')     return false
    if (activeChips.has('post')      && m.category !== 'post')    return false
    if (activeChips.has('breakfast') && m.category !== 'breakfast') return false
    if (activeChips.has('lunch')     && m.category !== 'lunch')   return false
    if (activeChips.has('dinner')    && m.category !== 'dinner')  return false
    if (activeChips.has('snack')     && m.category !== 'snack')   return false
    if (q) {
      const timeWords    = ['бързо','нямам','минута','no time','quick']
      const proteinWords = ['протеин','protein','мускул']
      const preWords     = ['преди','pre','before']
      const postWords    = ['след','post','after']
      if (timeWords.some(w => q.includes(w))    && m.prep_min > 5)    return false
      if (proteinWords.some(w => q.includes(w)) && m.protein  < 30)   return false
      if (preWords.some(w => q.includes(w))     && m.category !== 'pre')  return false
      if (postWords.some(w => q.includes(w))    && m.category !== 'post') return false
    }
    return true
  })
}

// ── MacroRing ─────────────────────────────────────────────────────────────────

function MacroRing({ value, unit, label, color, max }) {
  const r     = 20
  const circ  = 2 * Math.PI * r
  const ratio = Math.min(value / max, 1)
  const off   = circ * (1 - ratio)
  return (
    <div className={styles.ring}>
      <div className={styles.ringSvgWrap}>
        <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
          <circle
            cx="24" cy="24" r={r} fill="none"
            stroke={color} strokeWidth="3.5"
            strokeDasharray={circ} strokeDashoffset={off}
            strokeLinecap="round" transform="rotate(-90 24 24)"
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

// ── MealCard ──────────────────────────────────────────────────────────────────

function MealCard({ meal, onDelete }) {
  const [flipped, setFlipped] = useState(false)
  const cat = CATEGORY_META[meal.category] ?? CATEGORY_META.any

  return (
    <div
      className={`${styles.cardScene} ${flipped ? styles.flipped : ''}`}
      onClick={() => setFlipped(f => !f)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setFlipped(f => !f)}
      aria-label={`${meal.name} — натисни за детайли`}
    >
      <div className={styles.cardInner}>

        {/* FRONT */}
        <div className={styles.cardFront}>
          <div className={styles.cardFrontTop}>
            <div className={styles.topBadgeRow}>
              <span className={styles.badge} style={{ color: cat.color, background: `${cat.color}1a`, borderColor: `${cat.color}40` }}>
                {cat.label}
              </span>
              {!meal.isSystem && onDelete && (
                <button
                  className={styles.deleteBtn}
                  onClick={e => { e.stopPropagation(); onDelete(meal.id) }}
                  type="button"
                  aria-label="Изтрий"
                >
                  ×
                </button>
              )}
            </div>
            <h3 className={styles.mealName}>{meal.name}</h3>
          </div>

          <div className={styles.ringsGrid}>
            {MACRO_META.map(m => (
              <MacroRing
                key={m.key}
                value={meal[m.key] ?? meal.macros?.[m.key] ?? 0}
                unit={m.unit}
                label={m.label}
                color={m.color}
                max={m.max}
              />
            ))}
          </div>

          <div className={styles.cardFooter}>
            {meal.prep_min > 0 && (
              <>
                <div className={styles.footerItem}>
                  <span className={styles.footerIcon}>⏱</span>
                  <span className={styles.footerText}>{prepLabel(meal.prep_min)}</span>
                </div>
                <div className={styles.footerDivider} />
              </>
            )}
            {meal.price_bgn && (
              <>
                <div className={styles.footerItem}>
                  <span className={styles.footerIcon}>₣</span>
                  <span className={styles.footerText}>{meal.price_bgn}</span>
                </div>
                {meal.availability && <div className={styles.footerDivider} />}
              </>
            )}
            {meal.availability && (
              <div className={styles.footerItem}>
                <span className={styles.footerIcon}>📍</span>
                <span className={styles.footerText}>{meal.availability}</span>
              </div>
            )}
            {meal.serving_grams > 0 && (
              <>
                <div className={styles.footerDivider} />
                <div className={styles.footerItem}>
                  <span className={styles.footerText}>{meal.serving_grams}g</span>
                </div>
              </>
            )}
          </div>

          <span className={styles.flipHint}>Натисни за детайли ↩</span>
        </div>

        {/* BACK */}
        {meal.photo_url ? (
          <div className={styles.cardBack}>
            <img src={meal.photo_url} alt={meal.name} className={styles.mealPhoto} />
            <div className={styles.backOverlay}>
              <p className={styles.backTitle}>{meal.name}</p>
              <BackDetails meal={meal} />
            </div>
            <span className={styles.flipHintBack}>Натисни за макроси ↩</span>
          </div>
        ) : (
          <div className={`${styles.cardBack} ${styles.cardBackNoPhoto}`}>
            <div className={styles.backNoPhotoContent}>
              <p className={styles.backTitle}>{meal.name}</p>
              <BackDetails meal={meal} />
            </div>
            <span className={styles.flipHintBack}>Натисни за макроси ↩</span>
          </div>
        )}

      </div>
    </div>
  )
}

function BackDetails({ meal }) {
  return (
    <>
      {meal.tools?.length > 0 && (
        <div className={styles.toolsList}>
          {meal.tools.map(t => (
            <span key={t} className={styles.toolChip}>{t}</span>
          ))}
        </div>
      )}
      {meal.notes && (
        <p className={styles.backNotes}>{meal.notes}</p>
      )}
    </>
  )
}

// ── AddMealModal ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', category: 'any',
  kcal: '', protein: '', carbs: '', fat: '',
  serving_grams: '', prep_min: '', price_bgn: '',
  availability: '', tools: '', notes: '',
}

function AddMealModal({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const sheetRef = useRef(null)

  useEffect(() => {
    sheetRef.current?.scrollTo({ top: 0 })
  }, [])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function scrollTop() {
    sheetRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Въведи наименование'); scrollTop(); return }
    if (!form.kcal)        { setError('Въведи калории');      scrollTop(); return }
    setSaving(true)
    const toolsArr = form.tools
      ? form.tools.split(',').map(t => t.trim()).filter(Boolean)
      : []
    const { error: err } = await onSave({
      name:          form.name.trim(),
      category:      form.category,
      kcal:          parseFloat(form.kcal)    || 0,
      protein:       parseFloat(form.protein) || 0,
      carbs:         parseFloat(form.carbs)   || 0,
      fat:           parseFloat(form.fat)     || 0,
      serving_grams: parseInt(form.serving_grams) || 0,
      prep_min:      parseInt(form.prep_min)  || 0,
      price_bgn:     form.price_bgn.trim()   || null,
      availability:  form.availability.trim() || null,
      tools:         toolsArr.length ? toolsArr : null,
      notes:         form.notes.trim() || null,
    })
    if (err) { setError('Грешка при запис'); setSaving(false); return }
    onClose()
  }

  return (
    <div className={styles.modal}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet} ref={sheetRef}>
        <div className={styles.handle} />
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>НОВО ЯСТИЕ</span>
          <button className={styles.modalClose} onClick={onClose} type="button">×</button>
        </div>

        {/* Name */}
        <label className={styles.fieldLabel}>Наименование *</label>
        <input
          className={styles.fieldInput}
          type="text"
          placeholder="напр. Пилешки гърди + ориз"
          value={form.name}
          onChange={e => set('name', e.target.value)}
        />

        {/* Category */}
        <label className={styles.fieldLabel}>Категория</label>
        <div className={styles.catPills}>
          {Object.entries(CATEGORY_META).map(([id, meta]) => (
            <button
              key={id}
              className={`${styles.catPill} ${form.category === id ? styles.catPillActive : ''}`}
              style={form.category === id ? { borderColor: meta.color, color: meta.color } : {}}
              onClick={() => set('category', id)}
              type="button"
            >
              {meta.label}
            </button>
          ))}
        </div>

        {/* Macros */}
        <label className={styles.fieldLabel}>Макроси (на порция)</label>
        <div className={styles.macroRow}>
          {[
            { key: 'kcal',    ph: 'Ккал', color: '#F06292' },
            { key: 'protein', ph: 'Протеин g', color: '#66BB6A' },
            { key: 'carbs',   ph: 'Въгл. g',  color: '#4FC3F7' },
            { key: 'fat',     ph: 'Мазн. g',  color: '#FFB74D' },
          ].map(f => (
            <input
              key={f.key}
              className={styles.macroInput}
              type="number"
              min="0"
              placeholder={f.ph}
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              style={{ '--m-color': f.color }}
            />
          ))}
        </div>

        {/* Meta row */}
        <div className={styles.metaRow}>
          <div className={styles.metaField}>
            <label className={styles.fieldLabel}>Порция (g)</label>
            <input className={styles.fieldInput} type="number" min="0"
              placeholder="напр. 350" value={form.serving_grams}
              onChange={e => set('serving_grams', e.target.value)} />
          </div>
          <div className={styles.metaField}>
            <label className={styles.fieldLabel}>Подготовка (мин)</label>
            <input className={styles.fieldInput} type="number" min="0"
              placeholder="напр. 10" value={form.prep_min}
              onChange={e => set('prep_min', e.target.value)} />
          </div>
        </div>

        {/* Price & availability */}
        <div className={styles.metaRow}>
          <div className={styles.metaField}>
            <label className={styles.fieldLabel}>Цена (BGN)</label>
            <input className={styles.fieldInput} type="text"
              placeholder="напр. 3.50 лв." value={form.price_bgn}
              onChange={e => set('price_bgn', e.target.value)} />
          </div>
          <div className={styles.metaField}>
            <label className={styles.fieldLabel}>Наличност</label>
            <input className={styles.fieldInput} type="text"
              placeholder="напр. Lidl / Kaufland" value={form.availability}
              onChange={e => set('availability', e.target.value)} />
          </div>
        </div>

        {/* Tools */}
        <label className={styles.fieldLabel}>Инструменти (разделени със запетая)</label>
        <input className={styles.fieldInput} type="text"
          placeholder="напр. Котлон, Фурна" value={form.tools}
          onChange={e => set('tools', e.target.value)} />

        {/* Notes */}
        <label className={styles.fieldLabel}>Бележки</label>
        <textarea className={styles.fieldTextarea} rows={2}
          placeholder="Допълнителна информация..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)} />

        {error && <p className={styles.formError}>{error}</p>}

        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
          type="button"
        >
          {saving ? 'ЗАПИСВА...' : 'ЗАПИШИ ЯСТИЕ'}
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MealCards() {
  const { meals: dbMeals, loading, addMeal, deleteMeal } = useMealLibrary()
  const [query, setQuery]           = useState('')
  const [activeChips, setActiveChips] = useState(new Set())
  const [showAdd, setShowAdd]       = useState(false)

  // Normalize DB meals to same shape as SYSTEM_MEALS
  const allMeals = useMemo(() => {
    const normalized = dbMeals.map(m => ({ ...m, isSystem: false }))
    return [...normalized, ...SYSTEM_MEALS]
  }, [dbMeals])

  function toggleChip(id) {
    setActiveChips(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => getFiltered(allMeals, query, activeChips), [allMeals, query, activeChips])

  async function handleAdd(fields) {
    return addMeal(fields)
  }

  return (
    <div className={styles.wrap}>

      <div className={styles.libTopRow}>
        <button className={styles.addMealBtn} onClick={() => setShowAdd(true)} type="button">
          + ДОБАВИ ЯСТИЕ
        </button>
      </div>

      <div className={styles.filterBar}>
        <input
          className={styles.filterInput}
          type="text"
          placeholder="Опиши ситуацията... (напр. нямам време)"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

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

      {!loading && filtered.length === 0 && (
        <p className={styles.empty}>Няма резултати. Опитай друг филтър.</p>
      )}

      <div className={styles.cardList}>
        {filtered.map(meal => (
          <MealCard
            key={meal.id}
            meal={meal}
            onDelete={meal.isSystem ? null : deleteMeal}
          />
        ))}
      </div>

      {showAdd && (
        <AddMealModal
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
