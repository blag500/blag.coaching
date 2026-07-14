import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFoodLog } from '../../hooks/useFoodLog'
import DatePicker from '../DatePicker/DatePicker'
import { useCustomFoods } from '../../hooks/useCustomFoods'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import NutritionProgress from './NutritionProgress'
import FoodSearch from '../FoodLogger/FoodSearch'
import FoodLog from '../FoodLogger/FoodLog'
import MealCards from '../MealCards/MealCards'
import RecipeBuilder from '../FoodLogger/RecipeBuilder'
import styles from './NutritionCards.module.css'

const QUOTES = [
  'Дисциплината е разликата между това, което искаш сега, и това, което искаш най-много.',
  'Тялото постига това, което умът вярва.',
  'Не се сравнявай с другите. Сравнявай се с този, който беше вчера.',
  'Всяка тренировка е инвестиция в следващата.',
  'Болката е временна. Гордостта е завинаги.',
  'Успехът е сумата от малките усилия, повтаряни всеки ден.',
  'Не чакай мотивация. Изгради дисциплина.',
]

function greeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'ДОБРО УТРО'
  if (h >= 12 && h < 17) return 'ДОБЪР ДЕН'
  return 'ДОБЪР ВЕЧЕР'
}

export default function NutritionCards({ onNavigate }) {
  const { profile } = useAuth()
  const { log, totals, addEntry, addRawEntry, updateEntry, removeEntry, clearLog, uploadMealPhoto, removeMealPhoto, refresh, selectedDate, setSelectedDate, isToday } = useFoodLog()
  const { distance, refreshing } = usePullToRefresh(refresh)
  const { foods: customFoods, loading: foodsLoading, saveFood, deleteFood } = useCustomFoods()
  const [view, setView] = useState('log')
  const [showBuilder, setShowBuilder] = useState(false)
  const [logServings, setLogServings] = useState({}) // id → servings input

  const targets = {
    kcal:    profile?.calories ?? 0,
    protein: profile?.protein  ?? 0,
    carbs:   profile?.carbs    ?? 0,
    fat:     profile?.fat      ?? 0,
  }

  async function handleSaveCustomFood(data) {
    await saveFood(data)
  }

  function handleLogCustomFood(food) {
    const servings = parseFloat(logServings[food.id]) || 1
    addRawEntry({
      name:    food.name,
      grams:   Math.round(food.serving_grams * servings),
      kcal:    Math.round(food.kcal    * servings),
      protein: Math.round(food.protein * servings * 10) / 10,
      carbs:   Math.round(food.carbs   * servings * 10) / 10,
      fat:     Math.round(food.fat     * servings * 10) / 10,
    })
    setLogServings(prev => ({ ...prev, [food.id]: '' }))
  }

  const recipes  = customFoods.filter(f =>  f.is_recipe)
  const products = customFoods.filter(f => !f.is_recipe)

  const pullPct   = Math.min(distance / 68, 1)
  const showPull  = distance > 4

  const remaining = {
    kcal:    targets.kcal    - Math.round(totals.kcal    || 0),
    protein: targets.protein - Math.round(totals.protein || 0),
    carbs:   targets.carbs   - Math.round(totals.carbs   || 0),
    fat:     targets.fat     - Math.round(totals.fat     || 0),
  }

  const firstName = (profile?.name || '').split(' ')[0].toUpperCase()
  const dailyQuote = QUOTES[new Date().getDay() % QUOTES.length]

  return (
    <div className={styles.page}>
      {view === 'log' && <MacroRemainingBar remaining={remaining} targets={targets} />}
      {showPull && (
        <div className={styles.pullIndicator} style={{ height: distance, opacity: pullPct }}>
          <svg
            className={refreshing ? styles.pullSpin : ''}
            style={{ transform: `rotate(${pullPct * 200}deg)` }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" width="20" height="20" aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      )}
      <header className={styles.header}>
        <h1 className={styles.title}>
          {greeting()}{firstName ? `, ${firstName}` : ''}
        </h1>
        <div className={styles.avatar}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} className={styles.avatarImg} alt="" />
            : <span className={styles.avatarInitial}>{(profile?.name || '?')[0].toUpperCase()}</span>
          }
        </div>
      </header>

      <div className={styles.toggle}>
        <button
          className={`${styles.toggleBtn} ${view === 'log' ? styles.toggleActive : ''}`}
          onClick={() => setView('log')}
          type="button"
        >
          ХРАНЕНЕ
        </button>
        <button
          className={`${styles.toggleBtn} ${view === 'meals' ? styles.toggleActive : ''}`}
          onClick={() => setView('meals')}
          type="button"
        >
          БИБЛИОТЕКА
        </button>
      </div>

      {!targets.kcal && (
        <button className={styles.setupPrompt} onClick={() => onNavigate?.('explore')} type="button">
          <span className={styles.setupIcon}>🎯</span>
          <div className={styles.setupText}>
            <span className={styles.setupTitle}>Настрой дневните си макроси</span>
            <span className={styles.setupDesc}>Изчисли TDEE и протеин за твоята цел →</span>
          </div>
        </button>
      )}

      {view === 'log' ? (
        <>
          <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />
          <NutritionProgress totals={totals} targets={targets} />
          <FoodSearch onAdd={addEntry} onAddRaw={addRawEntry} totals={totals} targets={targets} />
          <FoodLog log={log} onRemove={removeEntry} onClear={clearLog} onEdit={updateEntry} onAddRaw={addRawEntry} onPhotoUpload={uploadMealPhoto} onPhotoRemove={removeMealPhoto} />
          <p className={styles.quote}>"{dailyQuote}"</p>
        </>
      ) : (
        <LibraryTab
          recipes={recipes}
          products={products}
          loading={foodsLoading}
          logServings={logServings}
          setLogServings={setLogServings}
          onLog={handleLogCustomFood}
          onDelete={deleteFood}
          onNewItem={() => setShowBuilder(true)}
        />
      )}

      {showBuilder && (
        <RecipeBuilder
          onSave={handleSaveCustomFood}
          onClose={() => setShowBuilder(false)}
        />
      )}
    </div>
  )
}

// ─── Library Tab ─────────────────────────────────────────────────────────────

function LibraryTab({ recipes, products, loading, logServings, setLogServings, onLog, onDelete, onNewItem }) {
  return (
    <div className={styles.library}>
      <div className={styles.libraryHeader}>
        <span className={styles.libraryTitle}>МОЯТА БИБЛИОТЕКА</span>
        <button className={styles.newBtn} onClick={onNewItem} type="button">
          + НОВО
        </button>
      </div>

      {loading ? (
        <p className={styles.libEmpty}>Зарежда...</p>
      ) : recipes.length === 0 && products.length === 0 ? (
        <div className={styles.libEmpty}>
          <p>Нямаш запазени рецепти или продукти.</p>
          <p className={styles.libHint}>Натисни + НОВО за да добавиш.</p>
        </div>
      ) : (
        <>
          {recipes.length > 0 && (
            <section>
              <h3 className={styles.groupLabel}>РЕЦЕПТИ</h3>
              <div className={styles.itemList}>
                {recipes.map(food => (
                  <CustomFoodCard
                    key={food.id}
                    food={food}
                    servings={logServings[food.id] ?? ''}
                    onServingsChange={v => setLogServings(prev => ({ ...prev, [food.id]: v }))}
                    onLog={() => onLog(food)}
                    onDelete={() => onDelete(food.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {products.length > 0 && (
            <section>
              <h3 className={styles.groupLabel}>ПРОДУКТИ</h3>
              <div className={styles.itemList}>
                {products.map(food => (
                  <CustomFoodCard
                    key={food.id}
                    food={food}
                    servings={logServings[food.id] ?? ''}
                    onServingsChange={v => setLogServings(prev => ({ ...prev, [food.id]: v }))}
                    onLog={() => onLog(food)}
                    onDelete={() => onDelete(food.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Pre-defined meal templates */}
      <div className={styles.templatesSection}>
        <h3 className={styles.groupLabel}>ШАБЛОНИ</h3>
        <MealCards />
      </div>
    </div>
  )
}

// ─── Macro Remaining Bar ─────────────────────────────────────────────────────

function macroColor(remaining, target) {
  if (remaining < 0) return '#ef5350'
  if (target > 0 && remaining / target < 0.15) return '#ffb74d'
  return '#66BB6A'
}

function MacroRemainingBar({ remaining, targets }) {
  const items = [
    { label: 'Ккал',  val: remaining.kcal,    target: targets.kcal,    unit: '' },
    { label: 'П',     val: remaining.protein,  target: targets.protein,  unit: 'g' },
    { label: 'В',     val: remaining.carbs,    target: targets.carbs,    unit: 'g' },
    { label: 'М',     val: remaining.fat,      target: targets.fat,      unit: 'g' },
  ]

  return (
    <div className={styles.remainBar}>
      <span className={styles.remainTitle}>ОСТАВАЩО</span>
      <div className={styles.remainItems}>
        {items.map(item => (
          <div key={item.label} className={styles.remainItem}>
            <span className={styles.remainLabel}>{item.label}</span>
            <span
              className={styles.remainVal}
              style={{ color: macroColor(item.val, item.target) }}
            >
              {item.val > 0 ? item.val : item.val === 0 ? '0' : item.val}{item.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomFoodCard({ food, servings, onServingsChange, onLog, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={styles.foodCard}>
      <button
        className={styles.foodCardHeader}
        onClick={() => setExpanded(v => !v)}
        type="button"
      >
        <div className={styles.foodCardInfo}>
          <span className={styles.foodCardName}>{food.name}</span>
          <span className={styles.foodCardMacros}>
            {food.kcal} ккал · П{food.protein}g · В{food.carbs}g · М{food.fat}g
            {food.serving_grams > 0 && <> · {food.serving_grams}g/порция</>}
          </span>
        </div>
        <span className={styles.foodCardChevron}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className={styles.foodCardBody}>
          {food.is_recipe && food.ingredients?.length > 0 && (
            <div className={styles.ingredientPreview}>
              {food.ingredients.filter(i => i.name).map((ing, i) => (
                <span key={i} className={styles.ingChip}>{ing.name}{ing.grams ? ` ${ing.grams}g` : ''}</span>
              ))}
            </div>
          )}
          <div className={styles.logRow}>
            <div className={styles.servingsWrap}>
              <label className={styles.servingsLabel}>Порции</label>
              <input
                className={styles.servingsInput}
                type="number"
                min="0.5"
                step="0.5"
                placeholder="1"
                value={servings}
                onChange={e => onServingsChange(e.target.value)}
              />
            </div>
            <button className={styles.logBtn} onClick={onLog} type="button">
              + Логни
            </button>
            <button className={styles.delBtn} onClick={onDelete} type="button" aria-label="Изтрий">
              🗑
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
