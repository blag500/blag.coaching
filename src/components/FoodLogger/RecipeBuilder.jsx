import { useState, useRef } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './RecipeBuilder.module.css'

function emptyIngredient() {
  return { id: Date.now(), name: '', grams: '', kcal: '', protein: '', carbs: '', fat: '' }
}

export default function RecipeBuilder({ onSave, onClose }) {
  const { t } = useSettings()
  const [name, setName]               = useState('')
  const [isRecipe, setIsRecipe]       = useState(true)
  const [servingGrams, setServingGrams] = useState('')
  const [ingredients, setIngredients] = useState([emptyIngredient()])
  const [saving, setSaving]           = useState(false)
  const savingRef                     = useRef(false)

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
    if (savingRef.current) return   // guard against double-tap duplicating the entry
    savingRef.current = true
    setSaving(true)

    try {
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
      onClose()
    } finally {
      savingRef.current = false
      setSaving(false)
    }
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
            {t('rb.recipe')}
          </button>
          <button
            className={`${styles.typeBtn} ${!isRecipe ? styles.typeBtnActive : ''}`}
            onClick={() => setIsRecipe(false)}
            type="button"
          >
            {t('rb.product')}
          </button>
        </div>

        <div className={styles.nameRow}>
          <input
            className={styles.nameInput}
            type="text"
            placeholder={isRecipe ? t('rb.recipeNamePh') : t('rb.productNamePh')}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        {isRecipe ? (
          <>
            <div className={styles.sectionLabel}>{t('rb.ingredients')}</div>
            <div className={styles.ingredientList}>
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className={styles.ingredientRow}>
                  <span className={styles.ingNum}>{idx + 1}</span>
                  <div className={styles.ingFields}>
                    <input
                      className={`${styles.ingInput} ${styles.ingName}`}
                      type="text"
                      placeholder={t('rb.ingredientPh')}
                      value={ing.name}
                      onChange={e => updateIngredient(ing.id, 'name', e.target.value)}
                    />
                    <div className={styles.ingMacros}>
                      {[
                        { key: 'grams',   ph: 'g' },
                        { key: 'kcal',    ph: t('rb.phKcal') },
                        { key: 'protein', ph: t('rb.phProtein') },
                        { key: 'carbs',   ph: t('rb.phCarbs') },
                        { key: 'fat',     ph: t('rb.phFat') },
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
              {t('rb.addIngredient')}
            </button>

            {totals.kcal > 0 && (
              <div className={styles.totalsBox}>
                <span className={styles.totalsLabel}>{t('rb.total')}</span>
                <span className={styles.totalsVal}>{t('rb.totalKcal', { n: Math.round(totals.kcal) })}</span>
                <span className={styles.totalsMacro}>{t('rb.totalProtein', { n: Math.round(totals.protein * 10) / 10 })}</span>
                <span className={styles.totalsMacro}>{t('rb.totalCarbs', { n: Math.round(totals.carbs * 10) / 10 })}</span>
                <span className={styles.totalsMacro}>{t('rb.totalFat', { n: Math.round(totals.fat * 10) / 10 })}</span>
                {totalGrams > 0 && <span className={styles.totalsGrams}>{Math.round(totalGrams)}g</span>}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.sectionLabel}>{t('rb.per100')}</div>
            <div className={styles.productGrid}>
              {[
                { k: 'kcal',    label: t('rb.calories'),   val: prodKcal,    set: setProdKcal,    ph: t('rb.phKcalReq') },
                { k: 'protein', label: t('macro.protein'), val: prodProtein, set: setProdProtein, ph: 'g' },
                { k: 'carbs',   label: t('macro.carbs'),   val: prodCarbs,   set: setProdCarbs,   ph: 'g' },
                { k: 'fat',     label: t('macro.fat'),     val: prodFat,     set: setProdFat,     ph: 'g' },
                { k: 'serving', label: t('rb.serving'),    val: servingGrams,set: setServingGrams,ph: '100' },
              ].map(({ k, label, val, set, ph }) => (
                <div key={k} className={styles.productField}>
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
          <button className={styles.cancelBtn} onClick={onClose} type="button">{t('rb.cancel')}</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!canSave || saving}
            type="button"
          >
            {saving ? '...' : t('rb.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
