import { useState, useRef, useEffect } from 'react'
import EstimateFlag from '../EstimateFlag/EstimateFlag'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { supabase } from '../../lib/supabase'
import BarcodeScanner from '../FoodLogger/BarcodeScanner'
import styles from './RecipeForm.module.css'
import Pictogram from '../Pictogram/Pictogram'

function CameraIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size} aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

/* Черновата.
 *
 * Рецептата се пише вътре в раздел, който се сменя със замятане на пръст.
 * Едно погрешно замятане размонтира екрана и осемте съставки, които човекът
 * е събирал с търсене, баркод и ръка, ги няма — а нищо не е казало, че ще
 * стане така, защото нищо не се е счупило: просто е сменена страница.
 *
 * Затова написаното живее извън компонента. Излизането спира да е загуба и
 * става прекъсване.
 *
 * Снимката не се пази: File не се сериализира, а да се държи цяла снимка в
 * localStorage би изяло квотата на пръв опит. Тя е и единственото, което се
 * връща с едно натискане. */
const DRAFT_KEY = 'blag_recipe_form_draft'

/**
 * Две мишени, един екран.
 *
 * Рецепта и „моя храна" бяха два редактора: този и листът в БИБЛИОТЕКА. Днес
 * ги поправяхме два пъти един след друг — веднъж черновата, веднъж сметката
 * на сто грама — и втория път се сетихме за втория едва след като първият
 * беше пуснат. Това е цената на два екрана за едно решение.
 *
 * Богатият модел изразява бедния: съставка с макроси на сто грама и грамаж
 * дава и рецепта, и продукт — продуктът е рецепта от една съставка. Обратното
 * не важи, затова оцелява този.
 *
 * Таблиците остават две. Едната пази съставките и снимката, другата — готови
 * макроси за порция; преобразуването е долу, в saveAsFood, и е точно:
 * порцията е сборът, делен на броя порции.
 */
const TARGET_DRAFT = { recipes: DRAFT_KEY, foods: 'blag_custom_food_draft' }

function readDraft(key = DRAFT_KEY) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') }
  catch { return null }
}
function clearDraft(key = DRAFT_KEY) {
  try { localStorage.removeItem(key) } catch { /* частен режим */ }
}
function draftHasContent(d) {
  return !!d && (d.name?.trim() || (d.ingredients || []).length > 0)
}

function calcTotals(ingredients) {
  return ingredients.reduce((acc, ing) => {
    const r = (ing.grams || 0) / 100
    return {
      kcal:    acc.kcal    + (ing.per100g?.kcal    || 0) * r,
      protein: acc.protein + (ing.per100g?.protein || 0) * r,
      carbs:   acc.carbs   + (ing.per100g?.carbs   || 0) * r,
      fat:     acc.fat     + (ing.per100g?.fat     || 0) * r,
    }
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
}

export default function RecipeForm({ recipe, onSave, onCancel, target = 'recipes', saveFood = null }) {
  const { user, profile } = useAuth()
  const { t } = useSettings()
  const isCoach = profile?.role === 'coach'

  /* Черновата важи само за нова рецепта. Отваряш ли съществуваща, тя носи
     своите стойности — чужда чернова върху нея би била тихо разваляне на
     чуждо ястие. */
  const draftKey = TARGET_DRAFT[target] ?? DRAFT_KEY
  const draft0 = useRef(recipe ? null : (draftHasContent(readDraft(draftKey)) ? readDraft(draftKey) : null)).current

  const [name, setName]             = useState(recipe?.name || draft0?.name || '')
  const [photoFile, setPhotoFile]   = useState(null)
  const [photoPreview, setPhotoPreview] = useState(recipe?.photo_url || '')
  const [ingredients, setIngredients] = useState(recipe?.ingredients || draft0?.ingredients || [])
  const [servings, setServings]     = useState(String(recipe?.servings ?? draft0?.servings ?? 1))
  const [isShared, setIsShared]     = useState(recipe?.is_shared || draft0?.isShared || false)
  const [draftBack, setDraftBack]   = useState(!!draft0)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)

  // Ingredient picker
  const [pickerOpen, setPickerOpen]     = useState(false)
  /* Кой начин е ползвал последно. Човек, който въвежда осем съставки на ръка,
     ги въвежда по един и същи начин — а панелът се връщаше на търсенето при
     всяко отваряне и искаше по едно излишно натискане на съставка. */
  const [pickerTab, setPickerTab]       = useState(() => {
    try { return localStorage.getItem('blag_recipe_picker_tab') || 'ai' } catch { return 'ai' }
  })
  const [pickerQuery, setPickerQuery]   = useState('')
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerResults, setPickerResults] = useState([])
  const [pickerError, setPickerError]   = useState(null)
  const [scanning, setScanning]         = useState(false)
  const [pending, setPending]           = useState(null) // { name, per100g }
  const [pendingGrams, setPendingGrams] = useState('100')

  // Manual ingredient entry
  const emptyManual = { name: '', kcal: '', protein: '', carbs: '', fat: '', grams: '' }
  const [manual, setManual] = useState(emptyManual)
  function setM(field, val) { setManual(prev => ({ ...prev, [field]: val })) }

  const photoInputRef = useRef(null)

  /* Пише се при всяка промяна, а не при излизане: излизането може и да не мине
     през нас — замятане към друг раздел, презареждане, убито приложение. */
  useEffect(() => {
    if (recipe) return
    const d = { name, ingredients, servings, isShared }
    if (!draftHasContent(d)) { clearDraft(draftKey); return }
    try { localStorage.setItem(draftKey, JSON.stringify(d)) } catch { /* частен режим */ }
  }, [recipe, draftKey, name, ingredients, servings, isShared])

  /** Начисто — единственият начин недовършеното да бъде наистина изхвърлено. */
  function startOver() {
    clearDraft(draftKey)
    setName(''); setIngredients([]); setServings('1'); setIsShared(false)
    setPhotoFile(null); setPhotoPreview('')
    setDraftBack(false)
  }

  const totals     = calcTotals(ingredients)
  const totalGrams = ingredients.reduce((s, i) => s + (i.grams || 0), 0)
  const numServings = parseFloat(servings) || 1

  // ── Photo ───────────────────────────────────────────────────────────────────
  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  // ── Ingredient picker ────────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('blag_recipe_picker_tab', pickerTab) } catch { /* частен режим */ }
  }, [pickerTab])

  function openPicker() {
    setPickerOpen(true)
    setPending(null)
    setPickerQuery('')
    setPickerResults([])
    setPickerError(null)
    setManual(emptyManual)
  }

  function confirmManual() {
    if (!manual.name.trim() || !manual.kcal) return
    setIngredients(prev => [...prev, {
      name:  manual.name.trim(),
      grams: parseFloat(manual.grams) || 0,
      per100g: {
        kcal:    parseFloat(manual.kcal)    || 0,
        protein: parseFloat(manual.protein) || 0,
        carbs:   parseFloat(manual.carbs)   || 0,
        fat:     parseFloat(manual.fat)     || 0,
      },
    }])
    /* Панелът остава отворен. Рецептата рядко е от една съставка, а
       затварянето след всяка означаваше две излишни натискания на съставка —
       отвори пак и се върни на ръчното. Добавената вече се вижда в списъка
       отгоре, значи и без затваряне е ясно, че е приета. */
    setManual(emptyManual)
  }

  async function handlePickerSearch() {
    if (!pickerQuery.trim() || pickerLoading) return
    setPickerLoading(true)
    setPickerError(null)
    setPickerResults([])
    try {
      const { data, error } = await supabase.functions.invoke('macro-lookup', {
        body: { query: pickerQuery.trim() },
      })
      if (error || !data?.per100g) throw new Error(t('rf.notFound'))
      setPickerResults([data])
    } catch (err) {
      setPickerError(err.message)
    } finally {
      setPickerLoading(false)
    }
  }

  function selectPickerResult(item) {
    setPending({ name: item.name, per100g: item.per100g })
    setPendingGrams(String(item.typical_grams || 100))
    setPickerResults([])
  }

  function handleBarcodeFound(food) {
    setScanning(false)
    setPending({ name: food.name, per100g: food.per100g })
    setPendingGrams('100')
  }

  function confirmIngredient() {
    const g = parseFloat(pendingGrams)
    if (!g || g <= 0 || !pending) return
    setIngredients(prev => [...prev, {
      name:    pending.name,
      grams:   g,
      per100g: pending.per100g,
    }])
    /* Същото и тук: следващата съставка се търси веднага. */
    setPending(null)
    setPickerQuery('')
    setPickerResults([])
  }

  function updateGrams(idx, val) {
    setIngredients(prev => prev.map((ing, i) =>
      i === idx ? { ...ing, grams: parseFloat(val) || 0 } : ing
    ))
  }

  function removeIngredient(idx) {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!name.trim() || ingredients.length === 0) return
    setSaving(true)
    setSaveError(null)

    /* Моята храна няма нито снимка, нито споделяне — тя е ред с числа, който
       се вписва в дневника. Затова тръгва по свой път и не пипа хранилището. */
    if (target === 'foods') {
      const n = numServings || 1
      const row = await saveFood?.({
        name:          name.trim(),
        // Рецепта е това, което има повече от една съставка. Един продукт е
        // една съставка — не е нужно да питаме човека какво прави.
        is_recipe:     ingredients.length > 1,
        serving_grams: Math.round((totalGrams / n) * 10) / 10 || 100,
        kcal:          totals.kcal    / n,
        protein:       totals.protein / n,
        carbs:         totals.carbs   / n,
        fat:           totals.fat     / n,
        ingredients,
      })
      setSaving(false)
      if (!row) { setSaveError(t('rf.saveErr')); return }
      clearDraft(draftKey)
      onSave(row)
      return
    }

    let photoUrl = recipe?.photo_url || ''
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('recipe-photos')
        .upload(path, photoFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('recipe-photos').getPublicUrl(path)
        photoUrl = urlData.publicUrl
      }
    }

    const payload = {
      user_id:     user.id,
      name:        name.trim(),
      photo_url:   photoUrl || null,
      ingredients,
      servings:    numServings,
      total_grams: totalGrams,
      is_shared:   isCoach ? isShared : false,
    }

    let data, err
    if (recipe?.id) {
      ;({ data, error: err } = await supabase
        .from('recipes').update(payload).eq('id', recipe.id).select().single())
    } else {
      ;({ data, error: err } = await supabase
        .from('recipes').insert(payload).select().single())
    }

    if (err) { console.error('Recipe save error:', err); setSaveError(err.message || t('rf.saveErr')); setSaving(false); return }
    clearDraft(draftKey)
    onSave(data)
  }

  return (
    <div className={styles.form}>
      {scanning && (
        <BarcodeScanner onFound={handleBarcodeFound} onClose={() => setScanning(false)} />
      )}

      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onCancel} type="button">←</button>
        {/* Едно и също поле, различно име: в библиотеката това не е рецепта, а
            „моя храна" — а екран, който те лъже как се казва направеното,
            после те кара да го търсиш другаде. */}
        <span className={styles.title}>
          {target === 'foods'
            ? t('rf.newFoodTitle')
            : (recipe ? t('rf.editTitle') : t('rf.newTitle'))}
        </span>
      </div>

      {/* Казва се, защото иначе човек, който е излязъл по невнимание веднъж,
          просто не отваря пак. */}
      {draftBack && (
        <div className={styles.draftBar}>
          <span>{t('rf.draftBack')}</span>
          <button className={styles.draftClear} onClick={startOver} type="button">
            {t('rf.startOver')}
          </button>
        </div>
      )}

      {/* Снимката е за рецептата, не за продукта: custom_foods няма къде да я
          сложи, а поле, което нищо не пази, е обещание, което не се спазва. */}
      {target === 'recipes' && (
      <div className={styles.photoBox} onClick={() => photoInputRef.current?.click()}>
        {photoPreview
          ? <img src={photoPreview} className={styles.photoImg} alt="" />
          : <div className={styles.photoPlaceholder}><CameraIcon size={24} /><span>{t('rf.photoAdd')}</span></div>
        }
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={handlePhotoChange}
        />
      </div>

      )}

      {/* Name */}
      <input
        className={styles.nameInput}
        type="text"
        placeholder={t('rf.namePh')}
        value={name}
        onChange={e => setName(e.target.value)}
      />

      {/* Ingredients */}
      <div className={styles.section}>
        <div className={styles.sectionRow}>
          <span className={styles.sectionTitle}>{t('rf.ingredients')}</span>
          <button className={styles.addIngBtn} onClick={openPicker} type="button">{t('rf.addIng')}</button>
        </div>

        {/* Picker panel */}
        {pickerOpen && (
          <div className={styles.picker}>
            {/* Tab toggle + close */}
            <div className={styles.pickerHeader}>
              <div className={styles.pickerTabs}>
                <button
                  className={`${styles.pickerTab} ${pickerTab === 'ai' ? styles.pickerTabActive : ''}`}
                  onClick={() => { setPickerTab('ai'); setPending(null) }}
                  type="button"
                >{t('rf.tab.ai')}</button>
                <button
                  className={`${styles.pickerTab} ${pickerTab === 'manual' ? styles.pickerTabActive : ''}`}
                  onClick={() => { setPickerTab('manual'); setPending(null) }}
                  type="button"
                >{t('rf.tab.manual')}</button>
              </div>
              <button className={styles.pickerClose} onClick={() => setPickerOpen(false)} type="button">×</button>
            </div>

            {/* AI tab */}
            {pickerTab === 'ai' && (
              pending ? (
                <>
                  <input
                    className={styles.pendingName}
                    value={pending.name}
                    onChange={e => setPending(p => ({ ...p, name: e.target.value }))}
                  />
                  <div className={styles.pendingMacros}>
                    {t('rf.per100g', { kcal: pending.per100g.kcal, p: pending.per100g.protein, c: pending.per100g.carbs, f: pending.per100g.fat })}
                  </div>
                  <div className={styles.gramRow}>
                    <label className={styles.gramLabel}>{t('rf.grams')}</label>
                    <input
                      className={styles.gramInput}
                      type="number"
                      min="1"
                      value={pendingGrams}
                      onChange={e => setPendingGrams(e.target.value)}
                      autoFocus
                    />
                    <span className={styles.gramUnit}>g</span>
                  </div>
                  <div className={styles.pickerActions}>
                    <button className={styles.cancelSmall} onClick={() => setPending(null)} type="button">{t('rf.back')}</button>
                    <button className={styles.confirmBtn} onClick={confirmIngredient} type="button">{t('rf.confirm')}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.pickerRow}>
                    <input
                      className={styles.pickerInput}
                      type="text"
                      placeholder={t('rf.searchIng')}
                      value={pickerQuery}
                      onChange={e => setPickerQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePickerSearch()}
                      autoFocus
                    />
                    <button
                      className={styles.pickerSearchBtn}
                      onClick={handlePickerSearch}
                      disabled={!pickerQuery.trim() || pickerLoading}
                      type="button"
                    >
                      {pickerLoading ? '…' : '→'}
                    </button>
                    <button
                      className={styles.pickerBarcodeBtn}
                      onClick={() => setScanning(true)}
                      type="button"
                      title={t('rf.barcode')}
                    ><Pictogram name="camera" size={15} /></button>
                  </div>
                  {pickerError && <p className={styles.pickerError}>{pickerError}</p>}
                  {pickerResults.length > 0 && <EstimateFlag />}
                  {pickerResults.map((item, i) => (
                    <div key={i} className={styles.pickerResult} onClick={() => selectPickerResult(item)}>
                      <div className={styles.pickerResultName}>{item.name}</div>
                      <div className={styles.pickerResultMacros}>
                        {t('rf.per100gShort', { kcal: item.per100g.kcal, p: item.per100g.protein })}
                      </div>
                    </div>
                  ))}
                </>
              )
            )}

            {/* Manual tab */}
            {pickerTab === 'manual' && (
              <>
                <input
                  className={styles.pendingName}
                  placeholder={t('rf.manualNamePh')}
                  value={manual.name}
                  onChange={e => setM('name', e.target.value)}
                  autoFocus
                />
                <div className={styles.manualGrid}>
                  {[
                    { key: 'kcal',    label: t('rf.macro.kcal') },
                    { key: 'protein', label: t('rf.macro.protein') },
                    { key: 'carbs',   label: t('rf.macro.carbs') },
                    { key: 'fat',     label: t('rf.macro.fat') },
                  ].map(({ key, label }) => (
                    <div key={key} className={styles.manualField}>
                      <label className={styles.manualLabel}>{label} / 100g</label>
                      <input
                        className={styles.manualInput}
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={manual[key]}
                        onChange={e => setM(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.gramRow}>
                  <label className={styles.gramLabel}>{t('rf.grams')}</label>
                  <input
                    className={styles.gramInput}
                    type="number"
                    min="1"
                    placeholder="100"
                    value={manual.grams}
                    onChange={e => setM('grams', e.target.value)}
                  />
                  <span className={styles.gramUnit}>g</span>
                </div>
                <button
                  className={styles.confirmBtn}
                  onClick={confirmManual}
                  disabled={!manual.name.trim() || !manual.kcal}
                  type="button"
                >{t('rf.addIngBtn')}</button>
              </>
            )}
          </div>
        )}

        {/* Ingredient list */}
        {ingredients.length === 0 ? (
          <p className={styles.emptyIngredients}>{t('rf.emptyIng')}</p>
        ) : (
          <ul className={styles.ingList}>
            {ingredients.map((ing, idx) => (
              <li key={idx} className={styles.ingItem}>
                <span className={styles.ingName}>{ing.name}</span>
                <input
                  className={styles.ingGrams}
                  type="number"
                  min="1"
                  value={ing.grams}
                  onChange={e => updateGrams(idx, e.target.value)}
                />
                <span className={styles.ingUnit}>g</span>
                <button className={styles.ingRemove} onClick={() => removeIngredient(idx)} type="button">×</button>
              </li>
            ))}
          </ul>
        )}

        {ingredients.length > 0 && (
          <div className={styles.totalsRow}>
            {t('rf.total', {
              kcal: Math.round(totals.kcal),
              p: Math.round(totals.protein * 10) / 10,
              c: Math.round(totals.carbs * 10) / 10,
              f: Math.round(totals.fat * 10) / 10,
              grams: totalGrams,
            })}
          </div>
        )}
      </div>

      {/* Servings */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>{t('rf.servings')}</span>
        <div className={styles.servingRow}>
          <label className={styles.servingLabel}>{t('rf.servingsLabel')}</label>
          <input
            className={styles.servingInput}
            type="number"
            min="0.5"
            step="0.5"
            value={servings}
            onChange={e => setServings(e.target.value)}
          />
        </div>
        {ingredients.length > 0 && numServings > 0 && (
          <div className={styles.perServing}>
            {t('rf.perServing', {
              kcal: Math.round(totals.kcal / numServings),
              p: Math.round(totals.protein / numServings * 10) / 10,
            })} ·
            {Math.round(totalGrams / numServings)}g
          </div>
        )}
      </div>

      {/* Споделянето също е на рецептата: моята храна е моя, тя няма кому да
          се дава. */}
      {isCoach && target === 'recipes' && (
        <div className={styles.section}>
          <div className={styles.shareRow}>
            <span className={styles.shareLabel}>{t('rf.share')}</span>
            <button
              className={`${styles.toggle} ${isShared ? styles.toggleOn : ''}`}
              onClick={() => setIsShared(v => !v)}
              type="button"
              aria-pressed={isShared}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
        </div>
      )}

      {saveError && <p className={styles.error}>{saveError}</p>}

      <button
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={!name.trim() || ingredients.length === 0 || saving}
        type="button"
      >
        {saving ? t('rf.saving') : recipe ? t('rf.saveChanges') : t(target === 'foods' ? 'rf.saveFood' : 'rf.saveRecipe')}
      </button>
    </div>
  )
}
