import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import BarcodeScanner from '../FoodLogger/BarcodeScanner'
import styles from './RecipeForm.module.css'

function CameraIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size} aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
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

export default function RecipeForm({ recipe, onSave, onCancel }) {
  const { user, profile } = useAuth()
  const isCoach = profile?.role === 'coach'

  const [name, setName]             = useState(recipe?.name || '')
  const [photoFile, setPhotoFile]   = useState(null)
  const [photoPreview, setPhotoPreview] = useState(recipe?.photo_url || '')
  const [ingredients, setIngredients] = useState(recipe?.ingredients || [])
  const [servings, setServings]     = useState(String(recipe?.servings ?? 1))
  const [isShared, setIsShared]     = useState(recipe?.is_shared || false)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)

  // Ingredient picker
  const [pickerOpen, setPickerOpen]     = useState(false)
  const [pickerTab, setPickerTab]       = useState('ai') // 'ai' | 'manual'
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
  function openPicker() {
    setPickerOpen(true)
    setPickerTab('ai')
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
    setManual(emptyManual)
    setPickerOpen(false)
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
      if (error || !data?.per100g) throw new Error('Не е намерено')
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
    setPending(null)
    setPickerOpen(false)
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

    if (err) { console.error('Recipe save error:', err); setSaveError(err.message || 'Грешка при запазване.'); setSaving(false); return }
    onSave(data)
  }

  return (
    <div className={styles.form}>
      {scanning && (
        <BarcodeScanner onFound={handleBarcodeFound} onClose={() => setScanning(false)} />
      )}

      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onCancel} type="button">←</button>
        <span className={styles.title}>{recipe ? 'РЕДАКТИРАЙ РЕЦЕПТА' : 'НОВА РЕЦЕПТА'}</span>
      </div>

      {/* Photo */}
      <div className={styles.photoBox} onClick={() => photoInputRef.current?.click()}>
        {photoPreview
          ? <img src={photoPreview} className={styles.photoImg} alt="" />
          : <div className={styles.photoPlaceholder}><CameraIcon size={24} /><span>Добави снимка</span></div>
        }
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={handlePhotoChange}
        />
      </div>

      {/* Name */}
      <input
        className={styles.nameInput}
        type="text"
        placeholder="Наименование на рецептата..."
        value={name}
        onChange={e => setName(e.target.value)}
      />

      {/* Ingredients */}
      <div className={styles.section}>
        <div className={styles.sectionRow}>
          <span className={styles.sectionTitle}>СЪСТАВКИ</span>
          <button className={styles.addIngBtn} onClick={openPicker} type="button">+ Добави</button>
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
                >AI + Баркод</button>
                <button
                  className={`${styles.pickerTab} ${pickerTab === 'manual' ? styles.pickerTabActive : ''}`}
                  onClick={() => { setPickerTab('manual'); setPending(null) }}
                  type="button"
                >Ръчно</button>
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
                    {pending.per100g.kcal} ккал · П{pending.per100g.protein}g · В{pending.per100g.carbs}g · М{pending.per100g.fat}g / 100g
                  </div>
                  <div className={styles.gramRow}>
                    <label className={styles.gramLabel}>Грамаж</label>
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
                    <button className={styles.cancelSmall} onClick={() => setPending(null)} type="button">← Назад</button>
                    <button className={styles.confirmBtn} onClick={confirmIngredient} type="button">Добави</button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.pickerRow}>
                    <input
                      className={styles.pickerInput}
                      type="text"
                      placeholder="Търси съставка с AI..."
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
                      title="Баркод"
                    >📷</button>
                  </div>
                  {pickerError && <p className={styles.pickerError}>{pickerError}</p>}
                  {pickerResults.map((item, i) => (
                    <div key={i} className={styles.pickerResult} onClick={() => selectPickerResult(item)}>
                      <div className={styles.pickerResultName}>{item.name}</div>
                      <div className={styles.pickerResultMacros}>
                        {item.per100g.kcal} ккал · П{item.per100g.protein}g / 100g
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
                  placeholder="Наименование..."
                  value={manual.name}
                  onChange={e => setM('name', e.target.value)}
                  autoFocus
                />
                <div className={styles.manualGrid}>
                  {[
                    { key: 'kcal',    label: 'Ккал' },
                    { key: 'protein', label: 'Протеин g' },
                    { key: 'carbs',   label: 'Въгл. g' },
                    { key: 'fat',     label: 'Мазн. g' },
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
                  <label className={styles.gramLabel}>Грамаж</label>
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
                >Добави съставката</button>
              </>
            )}
          </div>
        )}

        {/* Ingredient list */}
        {ingredients.length === 0 ? (
          <p className={styles.emptyIngredients}>Все още няма съставки</p>
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
            Общо: {Math.round(totals.kcal)} ккал · П{Math.round(totals.protein * 10) / 10}g ·
            В{Math.round(totals.carbs * 10) / 10}g · М{Math.round(totals.fat * 10) / 10}g · {totalGrams}g
          </div>
        )}
      </div>

      {/* Servings */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>ПОРЦИИ</span>
        <div className={styles.servingRow}>
          <label className={styles.servingLabel}>Брой порции в рецептата</label>
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
            1 порция ≈ {Math.round(totals.kcal / numServings)} ккал ·
            П {Math.round(totals.protein / numServings * 10) / 10}g ·
            {Math.round(totalGrams / numServings)}g
          </div>
        )}
      </div>

      {/* Coach: share toggle */}
      {isCoach && (
        <div className={styles.section}>
          <div className={styles.shareRow}>
            <span className={styles.shareLabel}>Сподели с клиенти</span>
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
        {saving ? 'Запазва...' : recipe ? 'Запази промените' : 'Запази рецептата'}
      </button>
    </div>
  )
}
