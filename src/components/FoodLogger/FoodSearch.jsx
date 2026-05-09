import { useState, useEffect, useRef } from 'react'
import { searchFoods } from '../../utils/openFoodFacts'
import styles from './FoodSearch.module.css'

export default function FoodSearch({ onAdd }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [grams, setGrams] = useState('100')
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const foods = await searchFoods(query)
        setResults(foods)
      } catch {
        setError('Грешка при търсене. Провери връзката.')
      } finally {
        setIsLoading(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function handleSelect(food) {
    setSelected(food)
    setGrams('100')
  }

  function handleConfirm() {
    const g = parseFloat(grams)
    if (!g || g <= 0) return
    onAdd(selected, g)
    setSelected(null)
    setQuery('')
    setResults([])
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inputWrap}>
        <span className={styles.searchIcon} aria-hidden="true">🔍</span>
        <input
          className={styles.input}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Търси храна..."
          aria-label="Търси храна"
        />
        {query && (
          <button
            className={styles.clear}
            onClick={() => { setQuery(''); setResults([]) }}
            aria-label="Изчисти търсенето"
          >
            ×
          </button>
        )}
      </div>

      {isLoading && (
        <div className={styles.status}>
          <span className={styles.spinner} aria-label="Зарежда..." />
          Търси...
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {results.length > 0 && !selected && (
        <ul className={styles.results} role="listbox" aria-label="Резултати от търсенето">
          {results.map(food => (
            <li
              key={food.id}
              className={styles.resultItem}
              onClick={() => handleSelect(food)}
              role="option"
              aria-selected="false"
            >
              <div className={styles.foodName}>{food.name}</div>
              {food.brand && <div className={styles.foodBrand}>{food.brand}</div>}
              <div className={styles.foodMacros}>
                <span>{Math.round(food.per100g.kcal)} ккал</span>
                <span>П {food.per100g.protein}g</span>
                <span>В {food.per100g.carbs}g</span>
                <span>М {food.per100g.fat}g</span>
                <span className={styles.per}>/ 100g</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className={styles.addPanel}>
          <div className={styles.selectedName}>{selected.name}</div>
          <div className={styles.gramRow}>
            <label className={styles.gramLabel} htmlFor="grams-input">Грамаж</label>
            <input
              id="grams-input"
              className={styles.gramInput}
              type="number"
              min="1"
              max="2000"
              value={grams}
              onChange={e => setGrams(e.target.value)}
            />
            <span className={styles.gramUnit}>g</span>
          </div>
          {grams > 0 && (
            <div className={styles.preview}>
              {Math.round(selected.per100g.kcal * grams / 100)} ккал ·
              П {Math.round(selected.per100g.protein * grams / 100 * 10) / 10}g ·
              В {Math.round(selected.per100g.carbs   * grams / 100 * 10) / 10}g ·
              М {Math.round(selected.per100g.fat     * grams / 100 * 10) / 10}g
            </div>
          )}
          <div className={styles.panelActions}>
            <button className={styles.cancelBtn} onClick={() => setSelected(null)}>
              Назад
            </button>
            <button className={styles.addBtn} onClick={handleConfirm}>
              + Добави
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
