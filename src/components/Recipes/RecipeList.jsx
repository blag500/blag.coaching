import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import RecipeForm from './RecipeForm'
import styles from './RecipeList.module.css'

function calcTotals(ingredients) {
  return (ingredients || []).reduce((acc, ing) => {
    const r = (ing.grams || 0) / 100
    return {
      kcal:    acc.kcal    + (ing.per100g?.kcal    || 0) * r,
      protein: acc.protein + (ing.per100g?.protein || 0) * r,
      carbs:   acc.carbs   + (ing.per100g?.carbs   || 0) * r,
      fat:     acc.fat     + (ing.per100g?.fat     || 0) * r,
    }
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
}

export default function RecipeList({ onAddRaw }) {
  const { user } = useAuth()
  const [recipes, setRecipes]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [query, setQuery]         = useState('')
  const [creating, setCreating]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [expanded, setExpanded]   = useState(null)
  const [logMode, setLogMode]     = useState('servings')
  const [servingVal, setServingVal] = useState('1')
  const [gramVal, setGramVal]     = useState('100')

  useEffect(() => { loadRecipes() }, [user?.id])

  async function loadRecipes() {
    if (!user) return
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('loadRecipes error:', error)
    setRecipes(data || [])
    setLoading(false)
  }

  function openRecipe(recipe) {
    if (expanded === recipe.id) { setExpanded(null); return }
    setExpanded(recipe.id)
    setLogMode('servings')
    setServingVal('1')
    setGramVal(String(recipe.total_grams || 100))
  }

  function handleAdd(recipe) {
    const totals = calcTotals(recipe.ingredients)
    let ratio, grams

    if (logMode === 'servings') {
      const s = parseFloat(servingVal) || 1
      ratio = s / (recipe.servings || 1)
      grams = (recipe.total_grams || 0) * ratio
    } else {
      const g = parseFloat(gramVal) || 100
      grams = g
      ratio = g / (recipe.total_grams || 100)
    }

    onAddRaw({
      name:    recipe.name,
      grams:   Math.round(grams),
      kcal:    Math.round(totals.kcal    * ratio),
      protein: Math.round(totals.protein * ratio * 10) / 10,
      carbs:   Math.round(totals.carbs   * ratio * 10) / 10,
      fat:     Math.round(totals.fat     * ratio * 10) / 10,
    })
    setExpanded(null)
  }

  async function handleDelete(id) {
    if (!window.confirm('Изтрий рецептата?')) return
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    if (expanded === id) setExpanded(null)
  }

  if (creating || editing) {
    return (
      <RecipeForm
        recipe={editing}
        onSave={saved => {
          setRecipes(prev =>
            editing
              ? prev.map(r => r.id === saved.id ? saved : r)
              : [saved, ...prev]
          )
          setCreating(false)
          setEditing(null)
        }}
        onCancel={() => { setCreating(false); setEditing(null) }}
      />
    )
  }

  const filtered = query.trim()
    ? recipes.filter(r => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    : recipes

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <div className={styles.searchWrap}>
          <input
            className={styles.search}
            type="text"
            placeholder="Търси рецепти..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className={styles.searchClear} onClick={() => setQuery('')} type="button">×</button>
          )}
        </div>
        <button className={styles.newBtn} onClick={() => setCreating(true)} type="button">
          + Нова
        </button>
      </div>

      {loading ? (
        <p className={styles.empty}>Зарежда...</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>
          {recipes.length === 0 ? 'Нямаш рецепти. Добави първата!' : 'Няма намерени рецепти.'}
        </p>
      ) : (
        <ul className={styles.list}>
          {filtered.map(recipe => {
            const totals  = calcTotals(recipe.ingredients)
            const isExp   = expanded === recipe.id
            const s       = parseFloat(servingVal) || 1
            const g       = parseFloat(gramVal) || 100
            const ratio   = logMode === 'servings'
              ? s / (recipe.servings || 1)
              : g / (recipe.total_grams || 100)

            return (
              <li key={recipe.id} className={`${styles.item} ${isExp ? styles.itemExpanded : ''}`}>
                {!isExp ? (
                  <div className={styles.row} onClick={() => openRecipe(recipe)}>
                    {recipe.photo_url
                      ? <img src={recipe.photo_url} className={styles.thumb} alt="" />
                      : <div className={styles.thumbPlaceholder}>🍽</div>
                    }
                    <div className={styles.info}>
                      <span className={styles.name}>{recipe.name}</span>
                      <span className={styles.meta}>
                        {Math.round(totals.kcal)} ккал · {recipe.servings} порции · {recipe.total_grams}g
                      </span>
                    </div>
                    <button
                      className={styles.addBtn}
                      onClick={e => { e.stopPropagation(); openRecipe(recipe) }}
                      type="button"
                      aria-label={`Добави ${recipe.name}`}
                    >+</button>
                  </div>
                ) : (
                  <div className={styles.expanded}>
                    {/* Header */}
                    <div className={styles.expandedTop}>
                      {recipe.photo_url && (
                        <img src={recipe.photo_url} className={styles.thumbLg} alt="" />
                      )}
                      <div className={styles.expandedInfo}>
                        <div className={styles.expandedName}>{recipe.name}</div>
                        <div className={styles.expandedMacros}>
                          {Math.round(totals.kcal)} ккал · П{Math.round(totals.protein * 10) / 10}g ·
                          В{Math.round(totals.carbs * 10) / 10}g · М{Math.round(totals.fat * 10) / 10}g
                        </div>
                        <div className={styles.expandedSub}>{recipe.servings} порции · {recipe.total_grams}g общо</div>
                      </div>
                    </div>

                    {/* Mode toggle */}
                    <div className={styles.modeToggle}>
                      <button
                        className={`${styles.modeBtn} ${logMode === 'servings' ? styles.modeBtnActive : ''}`}
                        onClick={() => setLogMode('servings')}
                        type="button"
                      >Порции</button>
                      <button
                        className={`${styles.modeBtn} ${logMode === 'grams' ? styles.modeBtnActive : ''}`}
                        onClick={() => setLogMode('grams')}
                        type="button"
                      >Грамаж</button>
                    </div>

                    {/* Input */}
                    {logMode === 'servings' ? (
                      <div className={styles.portionRow}>
                        <span className={styles.portionLabel}>Порции</span>
                        <input
                          className={styles.portionInput}
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={servingVal}
                          onChange={e => setServingVal(e.target.value)}
                          autoFocus
                        />
                        <span className={styles.portionSub}>от {recipe.servings}</span>
                      </div>
                    ) : (
                      <div className={styles.portionRow}>
                        <span className={styles.portionLabel}>Грамаж</span>
                        <input
                          className={styles.portionInput}
                          type="number"
                          min="1"
                          value={gramVal}
                          onChange={e => setGramVal(e.target.value)}
                          autoFocus
                        />
                        <span className={styles.portionSub}>g</span>
                      </div>
                    )}

                    {/* Preview */}
                    {ratio > 0 && (
                      <div className={styles.preview}>
                        {Math.round(totals.kcal    * ratio)} ккал ·
                        П {Math.round(totals.protein * ratio * 10) / 10}g ·
                        В {Math.round(totals.carbs   * ratio * 10) / 10}g ·
                        М {Math.round(totals.fat     * ratio * 10) / 10}g
                      </div>
                    )}

                    {/* Actions */}
                    <div className={styles.actions}>
                      <button className={styles.cancelBtn} onClick={() => setExpanded(null)} type="button">Назад</button>
                      <button className={styles.editBtn} onClick={() => setEditing(recipe)} type="button">Редактирай</button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(recipe.id)} type="button">Изтрий</button>
                      <button className={styles.logBtn} onClick={() => handleAdd(recipe)} type="button">+ Добави</button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
