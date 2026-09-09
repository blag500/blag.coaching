import { useState, useRef, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './RecipeBuilder.module.css'

function emptyIngredient() {
  return { id: Date.now(), name: '', grams: '', kcal: '', protein: '', carbs: '', fat: '' }
}

/* Черновата. Същата уговорка като в RecipeForm, но това е другият вход: този
 * лист пише в custom_foods — рецепта или продукт за библиотеката. Той е и
 * по-крехкият от двата, защото е лист: допирът по фона го затваря веднага, без
 * да пита, а рецепта от осем съставки е двайсет и пет числа. */
const DRAFT_KEY = 'blag_custom_food_draft'

function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') }
  catch { return null }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* частен режим */ }
}
function hasContent(d) {
  if (!d) return false
  if (d.name?.trim()) return true
  if (d.prodKcal || d.prodProtein || d.prodCarbs || d.prodFat) return true
  return (d.ingredients || []).some(i => i.name?.trim() || i.grams || i.kcal)
}

export default function RecipeBuilder({ onSave, onClose }) {
  const { t } = useSettings()
  const d0 = useRef(hasContent(readDraft()) ? readDraft() : null).current

  const [name, setName]               = useState(d0?.name ?? '')
  const [isRecipe, setIsRecipe]       = useState(d0?.isRecipe ?? true)
  const [servingGrams, setServingGrams] = useState(d0?.servingGrams ?? '')
  const [ingredients, setIngredients] = useState(d0?.ingredients?.length ? d0.ingredients : [emptyIngredient()])
  /* Етикетът на кутията казва „на 100 г". Дотук полето искаше числото за
     точното количество, тоест човек с 30 грама фъстъци трябваше да умножи
     наум — за всяка съставка и за всеки макрос. Затова това е подразбраното.
     RecipeForm го прави така отдавна; тук беше останало наопаки. */
  const [per100, setPer100]           = useState(d0?.per100 ?? true)
  const [draftBack, setDraftBack]     = useState(!!d0)
  const [saving, setSaving]           = useState(false)
  const savingRef                     = useRef(false)

  // For standalone product (not recipe): store per-100g macros in dedicated fields
  const [prodKcal,    setProdKcal]    = useState(d0?.prodKcal ?? '')
  const [prodProtein, setProdProtein] = useState(d0?.prodProtein ?? '')
  const [prodCarbs,   setProdCarbs]   = useState(d0?.prodCarbs ?? '')
  const [prodFat,     setProdFat]     = useState(d0?.prodFat ?? '')

  /* Пише се при всяка промяна, не при излизане: излизането може и да не мине
     през нас — допир по фона, замятане към друг раздел, убито приложение. */
  useEffect(() => {
    const draft = { name, isRecipe, servingGrams, ingredients, per100, prodKcal, prodProtein, prodCarbs, prodFat }
    if (!hasContent(draft)) { clearDraft(); return }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* частен режим */ }
  }, [name, isRecipe, servingGrams, ingredients, per100, prodKcal, prodProtein, prodCarbs, prodFat])

  function startOver() {
    clearDraft()
    setName(''); setIsRecipe(true); setServingGrams('')
    setIngredients([emptyIngredient()]); setPer100(true)
    setProdKcal(''); setProdProtein(''); setProdCarbs(''); setProdFat('')
    setDraftBack(false)
  }

  /** Какво реално дава един ред — след умножението, ако числата са на 100 г. */
  function used(ing) {
    const f = per100 ? (parseFloat(ing.grams) || 0) / 100 : 1
    return {
      kcal:    (parseFloat(ing.kcal)    || 0) * f,
      protein: (parseFloat(ing.protein) || 0) * f,
      carbs:   (parseFloat(ing.carbs)   || 0) * f,
      fat:     (parseFloat(ing.fat)     || 0) * f,
    }
  }

  function updateIngredient(id, field, value) {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  function addIngredient() {
    setIngredients(prev => [...prev, emptyIngredient()])
  }

  function removeIngredient(id) {
    setIngredients(prev => prev.filter(i => i.id !== id))
  }

  const totals = ingredients.reduce((acc, i) => {
    const u = used(i)
    return {
      kcal:    acc.kcal    + u.kcal,
      protein: acc.protein + u.protein,
      carbs:   acc.carbs   + u.carbs,
      fat:     acc.fat     + u.fat,
    }
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  const totalGrams = ingredients.reduce((acc, i) => acc + (parseFloat(i.grams) || 0), 0)

  async function handleSave() {
    if (!name.trim()) return
    if (savingRef.current) return   // guard against double-tap duplicating the entry
    savingRef.current = true
    setSaving(true)

    try {
      if (isRecipe) {
        /* В записа отиват сметнатите числа, не тези от етикета: рецептата е
           ястие с грамажи, а не списък с кутии. */
        const validIngredients = ingredients.filter(i => i.name.trim()).map(i => {
          const u = used(i)
          return {
            id: i.id, name: i.name, grams: i.grams,
            kcal:    Math.round(u.kcal),
            protein: Math.round(u.protein * 10) / 10,
            carbs:   Math.round(u.carbs   * 10) / 10,
            fat:     Math.round(u.fat     * 10) / 10,
          }
        })
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
      clearDraft()
      onClose()
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const canSave = name.trim() && (
    isRecipe
      ? ingredients.some(i => i.name.trim() && i.kcal && (!per100 || parseFloat(i.grams) > 0))
      : prodKcal
  )

  return (
    <div className={styles.modal}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.handle} />

        {/* Излизането вече не е загуба. Казва се, защото иначе човек, който е
            излязъл по невнимание, просто не отваря пак. */}
        {draftBack && (
          <div className={styles.draftBar}>
            <span>{t('rb.draftBack')}</span>
            <button className={styles.draftClear} onClick={startOver} type="button">
              {t('rb.startOver')}
            </button>
          </div>
        )}

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
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>{t('rb.ingredients')}</span>
              {/* Как се четат числата, които следват. Етикетът на кутията е
                  на 100 г — затова това е подразбраното и стои насреща. */}
              <div className={styles.modeToggle}>
                <button
                  className={`${styles.modeBtn} ${per100 ? styles.modeBtnOn : ''}`}
                  onClick={() => setPer100(true)}
                  type="button"
                >{t('rb.modePer100')}</button>
                <button
                  className={`${styles.modeBtn} ${!per100 ? styles.modeBtnOn : ''}`}
                  onClick={() => setPer100(false)}
                  type="button"
                >{t('rb.modeUsed')}</button>
              </div>
            </div>
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
                    {/* Колко дава редът наистина. Умножението е скрито, но не
                        и резултатът: човек трябва да види, че сметката е
                        станала, преди да запази. */}
                    {per100 && ing.kcal !== '' && (
                      <span className={styles.ingGives}>
                        {parseFloat(ing.grams) > 0
                          ? t('rb.rowGives', { n: Math.round(used(ing).kcal) })
                          : t('rb.needGrams')}
                      </span>
                    )}
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
