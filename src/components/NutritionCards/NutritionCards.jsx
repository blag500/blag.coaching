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

export default function NutritionCards() {
  const { profile } = useAuth()
  const { log, totals, addEntry, addRawEntry, updateEntry, removeEntry, clearLog, refresh, selectedDate, setSelectedDate, isToday } = useFoodLog()
  const { distance, refreshing } = usePullToRefresh(refresh)
  const { foods: customFoods, loading: foodsLoading, saveFood, deleteFood } = useCustomFoods()
  const [view, setView] = useState('log')
  const [showBuilder, setShowBuilder] = useState(false)
  const [logServings, setLogServings] = useState({}) // id → servings input

  const targets = {
    kcal:    profile?.calories ?? 2450,
    protein: profile?.protein  ?? 180,
    carbs:   profile?.carbs    ?? 250,
    fat:     profile?.fat      ?? 70,
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

  return (
    <div className={styles.page}>
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
        <h1 className={styles.title}>NUTRITION</h1>
        <p className={styles.subtitle}>Дневен прием и рецепти</p>
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

      {view === 'log' ? (
        <>
          <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />
          <NutritionProgress totals={totals} targets={targets} />
          <FoodSearch onAdd={addEntry} onAddRaw={addRawEntry} />
          <FoodLog log={log} onRemove={removeEntry} onClear={clearLog} onEdit={updateEntry} onAddRaw={addRawEntry} />
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
