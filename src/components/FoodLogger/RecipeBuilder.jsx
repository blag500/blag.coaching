import { useState } from 'react'
import styles from './RecipeBuilder.module.css'

function emptyIngredient() {
  return { id: Date.now(), name: '', grams: '', kcal: '', protein: '', carbs: '', fat: '' }
}

export default function RecipeBuilder({ onSave, onClose }) {
  const [name, setName]               = useState('')
  const [isRecipe, setIsRecipe]       = useState(true)
  const [servingGrams, setServingGrams] = useState('')
  const [ingredients, setIngredients] = useState([emptyIngredient()])
  const [saving, setSaving]           = useState(false)

  // For standalone product (not recipe): store per-100g macros in dedicated fields
  const [prodKcal,    setProdKcal]    = useState('')
  const [prodProtein, setProdProtein] = useState('')
  const [prodCarbs,   setProdCarbs]   = useState('')
  const [prodFat,     setProdFat]     = useState('')

  function updateIngredient(id, field, value) {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  function addIngredient() {
    setIngredients(prev => [...prev, emptyIngredient()])
  }

  function removeIngredient(id) {
    setIngredients(prev => prev.filter(i => i.id !== id))
  }

  const totals = ingredients.reduce((acc, i) => ({
    kcal:    acc.kcal    + (parseFloat(i.kcal)    || 0),
    protein: acc.protein + (parseFloat(i.protein) || 0),
    carbs:   acc.carbs   + (parseFloat(i.carbs)   || 0),
    fat:     acc.fat     + (parseFloat(i.fat)      || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  const totalGrams = ingredients.reduce((acc, i) => acc + (parseFloat(i.grams) || 0), 0)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)

    if (isRecipe) {
      const validIngredients = ingredients.filter(i => i.name.trim())
      await onSave({
        name:          name.trim(),
        is_recipe:     true,
        serving_grams: parseFloat(servingGrams) || totalGrams || 100,
        kcal:          Math.round(totals.kcal),
        protein:       Math.round(totals.protein * 10) / 10,
        carbs:         Math.round(totals.carbs   * 10) / 10,
        fat:           Math.round(totals.fat     * 10) / 10,
        ingredients:   validIngredients.length > 0 ? validIngredients : null,
      })
    } else {
      await onSave({
        name:          name.trim(),
        is_recipe:     false,
        serving_grams: parseFloat(servingGrams) || 100,
        kcal:          parseFloat(prodKcal)    || 0,
        protein:       parseFloat(prodProtein) || 0,
        carbs:         parseFloat(prodCarbs)   || 0,
        fat:           parseFloat(prodFat)     || 0,
        ingredients:   null,
      })
    }

    setSaving(false)
    onClose()
  }

  const canSave = name.trim() && (
    isRecipe
      ? ingredients.some(i => i.name.trim() && i.kcal)
      : prodKcal
  )

  return (
    <div className={styles.modal}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.handle} />

        <div className={styles.typeToggle}>
          <button
            className={`${styles.typeBtn} ${isRecipe ? styles.typeBtnActive : ''}`}
            onClick={() => setIsRecipe(true)}
            type="button"
          >
            РЕЦЕПТА
          </button>
          <button
            className={`${styles.typeBtn} ${!isRecipe ? styles.typeBtnActive : ''}`}
            onClick={() => setIsRecipe(false)}
            type="button"
          >
            ПРОДУКТ
          </button>
        </div>

        <div className={styles.nameRow}>
          <input
            className={styles.nameInput}
            type="text"
            placeholder={isRecipe ? 'Наименование на рецептата...' : 'Наименование на продукта...'}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        {isRecipe ? (
          <>
            <div className={styles.sectionLabel}>СЪСТАВКИ</div>
            <div className={styles.ingredientList}>
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className={styles.ingredientRow}>
                  <span className={styles.ingNum}>{idx + 1}</span>
                  <div className={styles.ingFields}>
                    <input
                      className={`${styles.ingInput} ${styles.ingName}`}
                      type="text"
                      placeholder="Съставка"
                      value={ing.name}
                      onChange={e => updateIngredient(ing.id, 'name', e.target.value)}
                    />
                    <div className={styles.ingMacros}>
                      {[
                        { key: 'grams',   ph: 'g'      },
                        { key: 'kcal',    ph: 'ккал'   },
                        { key: 'protein', ph: 'П g'     },
                        { key: 'carbs',   ph: 'В g'     },
                        { key: 'fat',     ph: 'М g'     },
                      ].map(({ key, ph }) => (
                        <input
                          key={key}
                          className={styles.ingNum2}
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder={ph}
                          value={ing[key]}
                          onChange={e => updateIngredient(ing.id, key, e.target.value)}
                        />
                      ))}
                    </div>
                  </div>
                  {ingredients.length > 1 && (
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeIngredient(ing.id)}
                      type="button"
                    >×</button>
                  )}
                </div>
              ))}
            </div>

            <button className={styles.addIngBtn} onClick={addIngredient} type="button">
              + Добави съставка
            </button>

            {totals.kcal > 0 && (
              <div className={styles.totalsBox}>
                <span className={styles.totalsLabel}>ОБЩО</span>
                <span className={styles.totalsVal}>{Math.round(totals.kcal)} ккал</span>
                <span className={styles.totalsMacro}>П {Math.round(totals.protein * 10) / 10}g</span>
                <span className={styles.totalsMacro}>В {Math.round(totals.carbs * 10) / 10}g</span>
                <span className={styles.totalsMacro}>М {Math.round(totals.fat * 10) / 10}g</span>
                {totalGrams > 0 && <span className={styles.totalsGrams}>{Math.round(totalGrams)}g</span>}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.sectionLabel}>МАКРОСИ НА 100g / ПОРЦИЯ</div>
            <div className={styles.productGrid}>
              {[
                { label: 'Калории',       val: prodKcal,    set: setProdKcal,    ph: 'ккал *' },
                { label: 'Протеин',       val: prodProtein, set: setProdProtein, ph: 'g' },
                { label: 'Въглехидрати',  val: prodCarbs,   set: setProdCarbs,   ph: 'g' },
                { label: 'Мазнини',       val: prodFat,     set: setProdFat,     ph: 'g' },
                { label: 'Порция (g)',    val: servingGrams,set: setServingGrams,ph: '100' },
              ].map(({ label, val, set, ph }) => (
                <div key={label} className={styles.productField}>
                  <label className={styles.productLabel}>{label}</label>
                  <input
                    className={styles.productInput}
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={ph}
                    value={val}
                    onChange={e => set(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} type="button">Отмени</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!canSave || saving}
            type="button"
          >
            {saving ? '...' : 'Запази'}
          </button>
        </div>
      </div>
    </div>
  )
}
