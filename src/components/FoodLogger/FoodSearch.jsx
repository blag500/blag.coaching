import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { searchFoods } from '../../utils/openFoodFacts'
import RecipeList from '../Recipes/RecipeList'
import MealBot from '../MealBot/MealBot'
import BarcodeScanner from './BarcodeScanner'
import styles from './FoodSearch.module.css'

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function resizeImage(file, maxDim = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.naturalWidth  * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('resize failed')); return }
        const reader = new FileReader()
        reader.onload = () => resolve({ base64: reader.result.split(',')[1], mediaType: 'image/jpeg' })
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.85)
    }
    img.onerror = reject
    img.src = url
  })
}

export default function FoodSearch({ onAdd, onAddRaw, totals = {}, targets = {} }) {
  const [mode, setMode] = useState('ai')

  return (
    <div className={styles.wrap}>
      <div className={styles.modeBar}>
        {[
          { id: 'ai',      label: 'AI',      icon: '◈' },
          { id: 'manual',  label: 'РЪЧНО',   icon: '✎' },
          { id: 'recent',  label: 'СКОР.',   icon: '↺' },
          { id: 'suggest', label: 'ПРЕПОР.', icon: '★' },
          { id: 'bot',     label: 'БОТ',     icon: '◉' },
          { id: 'recipes', label: 'РЕЦЕПТИ', icon: '≡' },
        ].map(m => (
          <button
            key={m.id}
            className={`${styles.modeBtn} ${mode === m.id ? styles.modeBtnActive : ''}`}
            onClick={() => setMode(m.id)}
            type="button"
          >
            <span className={styles.modeBtnIcon}>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {mode === 'ai'      && <AiMode onAdd={onAdd} onAddRaw={onAddRaw} onAdded={() => setMode('recent')} />}
      {mode === 'manual'  && <ManualMode onAddRaw={onAddRaw} />}
{mode === 'recent'  && <RecentMode onAddRaw={onAddRaw} />}
      {mode === 'suggest' && <SuggestMode totals={totals} targets={targets} onAddRaw={onAddRaw} />}
      {mode === 'bot'     && <MealBot onAddRaw={onAddRaw} />}
      {mode === 'recipes' && <RecipeList onAddRaw={onAddRaw} />}
    </div>
  )
}

// ─── AI macro lookup mode ────────────────────────────────────────────────────

function AiMode({ onAdd, onAddRaw, onAdded }) {
  const [query, setQuery]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [labelLoading, setLabelLoading] = useState(false)
  const [foodPhotoLoading, setFoodPhotoLoading] = useState(false)
  const [error, setError]           = useState(null)
  const [result, setResult]         = useState(null)      // single food
  const [multiItems, setMultiItems] = useState(null)      // multi-food array
  const [grams, setGrams]           = useState('100')
  const addPanelRef     = useRef(null)
  const photoInputRef   = useRef(null)
  const foodPhotoInputRef = useRef(null)

  useEffect(() => {
    if ((result || multiItems) && addPanelRef.current) {
      setTimeout(() => addPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
    }
  }, [result, multiItems])

  function resetResults() {
    setResult(null)
    setMultiItems(null)
    setError(null)
  }

  async function handleSearch() {
    if (!query.trim() || loading) return
    setLoading(true)
    resetResults()
    try {
      const { data, error: fnError } = await supabase.functions.invoke('macro-lookup', {
        body: { query: query.trim() },
      })
      if (fnError) {
        let body
        try { body = await fnError.context?.json() } catch { /* ignore */ }
        if (fnError.context?.status === 422 || body?.error === 'unrecognized') {
          setError('Не разпознахме тази храна. Опитай с по-ясно описание.')
        } else {
          setError('Неуспешно търсене. Провери връзката и опитай отново.')
        }
        return
      }
      // Multi-food response
      if (data?.type === 'multi' && Array.isArray(data.items)) {
        setMultiItems(data.items.map(item => ({
          ...item,
          // store per-gram ratios so we can recalculate when grams change
          _pgKcal:    item.kcal    / item.grams,
          _pgProtein: item.protein / item.grams,
          _pgCarbs:   item.carbs   / item.grams,
          _pgFat:     item.fat     / item.grams,
        })))
        return
      }
      // Single food response
      if (!data?.per100g) throw new Error('invalid response')
      setResult(data)
      setGrams(String(data.typical_grams || 100))
    } catch {
      setError('Неуспешно търсене. Провери връзката и опитай отново.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLabelPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLabelLoading(true)
    setError(null)
    setResult(null)
    setMultiItems(null)
    try {
      const { base64, mediaType } = await resizeImage(file)
      const { data, error: fnError } = await supabase.functions.invoke('label-scan', {
        body: { image: base64, mediaType },
      })
      if (fnError) {
        let detail = fnError.message
        try {
          const body = await fnError.context?.json()
          detail = JSON.stringify(body)
        } catch { try { detail = await fnError.context?.text() } catch {} }
        throw new Error(detail)
      }
      if (!data?.per100g) throw new Error(`invalid response: ${JSON.stringify(data)}`)
      setResult(data)
      setGrams(String(data.typical_grams || 100))
    } catch (err) {
      setError(`Грешка: ${err.message}`)
    } finally {
      setLabelLoading(false)
    }
  }

  async function handleAdd() {
    const g = parseFloat(grams)
    if (!g || g <= 0 || !result) return
    const ratio = g / 100
    await onAddRaw({
      name:    result.name,
      grams:   g,
      kcal:    Math.round(result.per100g.kcal    * ratio),
      protein: Math.round(result.per100g.protein * ratio * 10) / 10,
      carbs:   Math.round(result.per100g.carbs   * ratio * 10) / 10,
      fat:     Math.round(result.per100g.fat     * ratio * 10) / 10,
    })
    setResult(null)
    setQuery('')
    setGrams('100')
    onAdded?.()
  }

  async function handleFoodPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setFoodPhotoLoading(true)
    setError(null)
    setResult(null)
    setMultiItems(null)
    try {
      const { base64, mediaType } = await resizeImage(file)
      const { data, error: fnError } = await supabase.functions.invoke('food-photo', {
        body: { image: base64, mediaType },
      })
      if (fnError) {
        let detail = fnError.message
        try {
          const body = await fnError.context?.json()
          detail = JSON.stringify(body)
        } catch { try { detail = await fnError.context?.text() } catch {} }
        throw new Error(detail)
      }
      if (data?.type === 'multi' && Array.isArray(data.items)) {
        setMultiItems(data.items.map(item => ({
          ...item,
          _pgKcal:    item.kcal    / item.grams,
          _pgProtein: item.protein / item.grams,
          _pgCarbs:   item.carbs   / item.grams,
          _pgFat:     item.fat     / item.grams,
        })))
        return
      }
      if (!data?.per100g) throw new Error(`invalid response: ${JSON.stringify(data)}`)
      setResult(data)
      setGrams(String(data.typical_grams || 100))
    } catch (err) {
      setError(`Грешка: ${err.message}`)
    } finally {
      setFoodPhotoLoading(false)
    }
  }

  const g = parseFloat(grams)

  return (
    <>
      <div className={styles.inputWrap}>
        <span className={styles.searchIcon} aria-hidden="true">✨</span>
        <input
          className={styles.input}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); resetResults() }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Храна или няколко със запетая..."
          aria-label="AI търсене на макроси"
        />
        {query && (
          <button className={styles.clear} onClick={() => { setQuery(''); resetResults() }} aria-label="Изчисти">×</button>
        )}
      </div>

      <div className={styles.aiActions}>
        <button
          className={styles.aiSearchBtn}
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          type="button"
        >
          {loading
            ? <><span className={styles.spinner} style={{ marginRight: 8 }} />Анализира...</>
            : 'Намери макроси'}
        </button>

        <button
          className={styles.labelScanBtn}
          onClick={() => foodPhotoInputRef.current?.click()}
          disabled={foodPhotoLoading}
          type="button"
          title="Снимай ястие — Gemini разпознава храните"
        >
          <CameraIcon />
          {foodPhotoLoading
            ? <><span className={styles.spinner} style={{ marginLeft: 6 }} />Анализира...</>
            : 'Снимка на ястие'}
        </button>

        <button
          className={styles.labelScanBtn}
          onClick={() => photoInputRef.current?.click()}
          disabled={labelLoading}
          type="button"
          title="Снимай хранителна стойност от етикет"
        >
          <CameraIcon />
          {labelLoading
            ? <><span className={styles.spinner} style={{ marginLeft: 6 }} />Разчита...</>
            : 'Снимка на етикет'}
        </button>
      </div>

      <input
        className={styles.photoFileInput}
        type="file"
        accept="image/*"
        ref={foodPhotoInputRef}
        onChange={handleFoodPhoto}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        className={styles.photoFileInput}
        type="file"
        accept="image/*"
        ref={photoInputRef}
        onChange={handleLabelPhoto}
        tabIndex={-1}
        aria-hidden="true"
      />

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div ref={addPanelRef} className={styles.addPanel}>
          <input
            className={styles.nameInput}
            type="text"
            value={result.name}
            onChange={e => setResult(prev => ({ ...prev, name: e.target.value }))}
            aria-label="Наименование"
          />
          <div className={styles.aiPer100g}>
            на 100g: {result.per100g.kcal} ккал · П{result.per100g.protein}g · В{result.per100g.carbs}g · М{result.per100g.fat}g
          </div>
          <div className={styles.gramRow}>
            <label className={styles.gramLabel} htmlFor="ai-grams-input">Грамаж</label>
            <input
              id="ai-grams-input"
              className={styles.gramInput}
              type="number"
              min="1"
              max="2000"
              value={grams}
              onChange={e => setGrams(e.target.value)}
              autoFocus
            />
            <span className={styles.gramUnit}>g</span>
          </div>
          {g > 0 && (
            <div className={styles.preview}>
              {Math.round(result.per100g.kcal    * g / 100)} ккал ·
              П {Math.round(result.per100g.protein * g / 100 * 10) / 10}g ·
              В {Math.round(result.per100g.carbs   * g / 100 * 10) / 10}g ·
              М {Math.round(result.per100g.fat     * g / 100 * 10) / 10}g
            </div>
          )}
          <div className={styles.panelActions}>
            <button className={styles.cancelBtn} onClick={() => setResult(null)} type="button">Назад</button>
            <button className={styles.addBtn} onClick={handleAdd} type="button">+ Добави</button>
          </div>
        </div>
      )}

      {multiItems && (
        <div ref={addPanelRef}>
          <MultiAddPanel
            initialItems={multiItems}
            onAdd={(items) => {
              items.forEach(item => onAddRaw({
                name:    item.name,
                grams:   item.grams,
                kcal:    item.kcal,
                protein: item.protein,
                carbs:   item.carbs,
                fat:     item.fat,
              }))
              setMultiItems(null)
              setQuery('')
              onAdded?.()
            }}
            onCancel={() => setMultiItems(null)}
          />
        </div>
      )}
    </>
  )
}

// ─── Multi-food confirmation panel ───────────────────────────────────────────

function MultiAddPanel({ initialItems, onAdd, onCancel }) {
  const [items, setItems] = useState(initialItems)

  function updateGrams(idx, rawVal) {
    const g = Math.max(10, parseFloat(rawVal) || 10)
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const gr = Math.round(g)
      return {
        ...item,
        grams:   gr,
        kcal:    Math.round(item._pgKcal    * gr),
        protein: Math.round(item._pgProtein * gr * 10) / 10,
        carbs:   Math.round(item._pgCarbs   * gr * 10) / 10,
        fat:     Math.round(item._pgFat     * gr * 10) / 10,
      }
    }))
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const totals = items.reduce((acc, item) => ({
    kcal:    Math.round(acc.kcal    + item.kcal),
    protein: Math.round((acc.protein + item.protein) * 10) / 10,
    carbs:   Math.round((acc.carbs   + item.carbs)   * 10) / 10,
    fat:     Math.round((acc.fat     + item.fat)     * 10) / 10,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  if (items.length === 0) {
    return (
      <div className={styles.multiPanel}>
        <p className={styles.multiEmpty}>Всички храни са премахнати.</p>
        <button className={styles.cancelBtn} onClick={onCancel} type="button">Назад</button>
      </div>
    )
  }

  return (
    <div className={styles.multiPanel}>
      <div className={styles.multiHeader}>
        <span className={styles.multiTitle}>
          {items.length} {items.length === 1 ? 'храна' : 'храни'} — провери грамажа
        </span>
        <span className={styles.multiHint}>Коригирай количествата при нужда</span>
      </div>

      <div className={styles.multiList}>
        {items.map((item, i) => (
          <div key={i} className={styles.multiItem}>
            <div className={styles.multiItemHead}>
              <span className={styles.multiItemName}>{item.name}</span>
              <button
                className={styles.multiItemRemove}
                onClick={() => removeItem(i)}
                type="button"
                aria-label="Премахни"
              >×</button>
            </div>
            <div className={styles.multiItemRow}>
              <div className={styles.multiGramWrap}>
                <input
                  className={styles.gramInput}
                  type="number"
                  min="10"
                  max="2000"
                  value={item.grams}
                  onChange={e => updateGrams(i, e.target.value)}
                />
                <span className={styles.gramUnit}>g</span>
              </div>
              <span className={styles.multiItemMacros}>
                {item.kcal} ккал · П{item.protein}g · В{item.carbs}g · М{item.fat}g
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.multiTotals}>
        <span className={styles.multiTotalsLabel}>ОБЩО</span>
        <span className={styles.multiTotalsVal}>
          {totals.kcal} ккал · П{totals.protein}g · В{totals.carbs}g · М{totals.fat}g
        </span>
      </div>

      <div className={styles.panelActions}>
        <button className={styles.cancelBtn} onClick={onCancel} type="button">Назад</button>
        <button className={styles.addBtn} onClick={() => onAdd(items)} type="button">
          + Добави {items.length === 1 ? '1 храна' : `${items.length} храни`}
        </button>
      </div>
    </div>
  )
}

// ─── Barcode scan mode ───────────────────────────────────────────────────────

function BarcodeMode({ onAddRaw, onAdded }) {
  const [scanning, setScanning] = useState(true)
  const [result, setResult]     = useState(null)
  const [grams, setGrams]       = useState('100')

  function handleFound(food) {
    setResult(food)
    setScanning(false)
  }

  async function handleAdd() {
    const g = parseFloat(grams)
    if (!g || !result) return
    const ratio = g / 100
    const name  = result.name + (result.brand ? ` (${result.brand})` : '')
    await onAddRaw({
      name,
      grams:   g,
      kcal:    Math.round(result.per100g.kcal    * ratio),
      protein: Math.round(result.per100g.protein * ratio * 10) / 10,
      carbs:   Math.round(result.per100g.carbs   * ratio * 10) / 10,
      fat:     Math.round(result.per100g.fat     * ratio * 10) / 10,
    })
    setResult(null)
    setGrams('100')
    setScanning(true)
    onAdded?.()
  }

  if (scanning) {
    return (
      <BarcodeScanner
        onFound={handleFound}
        onClose={() => setScanning(false)}
      />
    )
  }

  if (!result) {
    return (
      <div className={styles.barcodeRetry}>
        <p className={styles.error}>Продуктът не е намерен.</p>
        <button className={styles.addBtn} onClick={() => setScanning(true)} type="button">
          Опитай отново
        </button>
      </div>
    )
  }

  const g = parseFloat(grams) || 0

  return (
    <div className={styles.addPanel}>
      <input
        className={styles.nameInput}
        type="text"
        value={result.name}
        onChange={e => setResult(prev => ({ ...prev, name: e.target.value }))}
        aria-label="Наименование"
      />
      {result.brand && (
        <div className={styles.aiPer100g}>{result.brand}</div>
      )}
      <div className={styles.aiPer100g}>
        на 100g: {result.per100g.kcal} ккал · П{result.per100g.protein}g · В{result.per100g.carbs}g · М{result.per100g.fat}g
      </div>
      <div className={styles.gramRow}>
        <label className={styles.gramLabel} htmlFor="bc-grams-input">Грамаж</label>
        <input
          id="bc-grams-input"
          className={styles.gramInput}
          type="number"
          min="1"
          max="2000"
          value={grams}
          onChange={e => setGrams(e.target.value)}
          autoFocus
        />
        <span className={styles.gramUnit}>g</span>
      </div>
      {g > 0 && (
        <div className={styles.preview}>
          {Math.round(result.per100g.kcal    * g / 100)} ккал ·
          П {Math.round(result.per100g.protein * g / 100 * 10) / 10}g ·
          В {Math.round(result.per100g.carbs   * g / 100 * 10) / 10}g ·
          М {Math.round(result.per100g.fat     * g / 100 * 10) / 10}g
        </div>
      )}
      <div className={styles.panelActions}>
        <button className={styles.cancelBtn} onClick={() => setScanning(true)} type="button">← Сканирай</button>
        <button className={styles.addBtn} onClick={handleAdd} type="button">+ Добави</button>
      </div>
    </div>
  )
}

// ─── Manual entry mode ───────────────────────────────────────────────────────

function ManualMode({ onAddRaw }) {
  const empty = { name: '', kcal: '', protein: '', carbs: '', fat: '', grams: '' }
  const [form, setForm] = useState(empty)
  const [added, setAdded] = useState(false)

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  function handleAdd() {
    if (!form.name.trim() || !form.kcal) return
    onAddRaw({
      name:    form.name.trim(),
      grams:   parseFloat(form.grams) || 0,
      kcal:    parseFloat(form.kcal)    || 0,
      protein: parseFloat(form.protein) || 0,
      carbs:   parseFloat(form.carbs)   || 0,
      fat:     parseFloat(form.fat)     || 0,
    })
    setForm(empty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const canAdd = form.name.trim() && form.kcal

  return (
    <div className={styles.manualWrap}>
      <input
        className={`${styles.input} ${styles.manualName}`}
        type="text"
        placeholder="Наименование на храната..."
        value={form.name}
        onChange={e => set('name', e.target.value)}
      />
      <div className={styles.macroGrid}>
        {[
          { key: 'kcal',    label: 'Ккал',  required: true },
          { key: 'protein', label: 'Протеин g' },
          { key: 'carbs',   label: 'Въгл. g' },
          { key: 'fat',     label: 'Мазн. g' },
          { key: 'grams',   label: 'Грамаж g' },
        ].map(({ key, label, required }) => (
          <div key={key} className={styles.macroField}>
            <label className={styles.macroLabel}>{label}{required && ' *'}</label>
            <input
              className={styles.macroInput}
              type="number"
              min="0"
              step="0.1"
              value={form[key]}
              onChange={e => set(key, e.target.value)}
              placeholder="0"
            />
          </div>
        ))}
      </div>
      <button
        className={`${styles.addBtn} ${added ? styles.addBtnDone : ''}`}
        onClick={handleAdd}
        disabled={!canAdd}
        type="button"
      >
        {added ? '✓ Добавено' : '+ Добави към лога'}
      </button>
    </div>
  )
}

// ─── Recent foods mode ───────────────────────────────────────────────────────

function RecentMode({ onAddRaw }) {
  const { user } = useAuth()
  const [recents, setRecents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedName, setSelectedName] = useState(null)
  const [newGrams, setNewGrams] = useState('100')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('food_logs')
      .select('name, grams, kcal, protein, carbs, fat, added_at')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        const seen = new Set()
        const unique = []
        for (const entry of data) {
          if (!seen.has(entry.name)) {
            seen.add(entry.name)
            unique.push(entry)
            if (unique.length >= 50) break
          }
        }
        setRecents(unique)
        setLoading(false)
      })
  }, [user?.id])

  function handleSelect(item) {
    setSelectedName(item.name)
    setNewGrams(String(item.grams > 0 ? item.grams : 100))
  }

  function handleConfirm(item) {
    const g = parseFloat(newGrams)
    if (!g || g <= 0) return
    const base = item.grams > 0 ? item.grams : 100
    const ratio = g / base
    onAddRaw({
      name:    item.name,
      grams:   g,
      kcal:    Math.round(item.kcal    * ratio),
      protein: Math.round(item.protein * ratio * 10) / 10,
      carbs:   Math.round(item.carbs   * ratio * 10) / 10,
      fat:     Math.round(item.fat     * ratio * 10) / 10,
    })
    setSelectedName(null)
    setQuery('')
  }

  if (loading) return <p className={styles.recentEmpty}>Зарежда...</p>
  if (recents.length === 0) return <p className={styles.recentEmpty}>Няма скорошни храни</p>

  const filtered = query.trim()
    ? recents.filter(r => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    : recents

  return (
    <>
      <div className={styles.recentSearchWrap}>
        <input
          className={styles.recentSearch}
          type="text"
          placeholder="Филтрирай скорошни..."
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedName(null) }}
          aria-label="Търси в скорошни"
        />
        {query && (
          <button className={styles.recentSearchClear} onClick={() => { setQuery(''); setSelectedName(null) }} type="button" aria-label="Изчисти">×</button>
        )}
      </div>
      {filtered.length === 0 && (
        <p className={styles.recentEmpty}>Няма намерени храни</p>
      )}
    <ul className={styles.recentList}>
      {filtered.map((item, i) => {
        const isExpanded = selectedName === item.name
        const g = parseFloat(newGrams)
        const base = item.grams > 0 ? item.grams : 100
        const ratio = g > 0 ? g / base : 0

        return (
          <li key={i} className={`${styles.recentItem} ${isExpanded ? styles.recentItemExpanded : ''}`}>
            {isExpanded ? (
              <>
                <span className={styles.recentName}>{item.name}</span>
                <div className={styles.gramRow}>
                  <label className={styles.gramLabel}>Грамаж</label>
                  <input
                    className={styles.gramInput}
                    type="number"
                    min="1"
                    max="2000"
                    value={newGrams}
                    onChange={e => setNewGrams(e.target.value)}
                    autoFocus
                  />
                  <span className={styles.gramUnit}>g</span>
                </div>
                {ratio > 0 && (
                  <div className={styles.preview}>
                    {Math.round(item.kcal * ratio)} ккал ·
                    П {Math.round(item.protein * ratio * 10) / 10}g ·
                    В {Math.round(item.carbs   * ratio * 10) / 10}g ·
                    М {Math.round(item.fat     * ratio * 10) / 10}g
                  </div>
                )}
                <div className={styles.panelActions}>
                  <button className={styles.cancelBtn} onClick={() => setSelectedName(null)} type="button">Назад</button>
                  <button className={styles.addBtn} onClick={() => handleConfirm(item)} type="button">+ Добави</button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.recentInfo}>
                  <span className={styles.recentName}>{item.name}</span>
                  <span className={styles.recentMacros}>
                    {item.kcal} ккал · П{item.protein}g · В{item.carbs}g · М{item.fat}g
                    {item.grams > 0 && <> · {item.grams}g</>}
                  </span>
                </div>
                <button
                  className={styles.recentAddBtn}
                  onClick={() => handleSelect(item)}
                  type="button"
                  aria-label={`Добави ${item.name}`}
                >
                  +
                </button>
              </>
            )}
          </li>
        )
      })}
    </ul>
    </>
  )
}

// ─── Suggest / Препоръки mode ─────────────────────────────────────────────────

function scoreHistoryFoods(foods, remaining) {
  if (remaining.kcal <= 30) return []
  return foods
    .map(f => {
      const base = f.grams > 0 ? f.grams : 100
      const kpg = f.kcal / base
      if (kpg <= 0) return null
      const sugG    = Math.min(600, Math.max(30, Math.round((remaining.kcal * 0.5) / kpg)))
      const kcal    = Math.round(kpg * sugG)
      const protein = Math.round((f.protein / base) * sugG * 10) / 10
      const carbs   = Math.round((f.carbs   / base) * sugG * 10) / 10
      const fat     = Math.round((f.fat     / base) * sugG * 10) / 10
      const ps      = remaining.protein > 0 ? Math.min(1, protein / remaining.protein) : 0.5
      const cs      = remaining.carbs   > 0 ? Math.min(1, carbs   / remaining.carbs)   : 0.5
      const fs      = remaining.fat     > 0 ? Math.min(1, fat     / remaining.fat)     : 0.5
      const over    = kcal > remaining.kcal * 1.1 ? 0.6 : 1
      return { name: f.name, grams: sugG, kcal, protein, carbs, fat,
               score: (ps * 0.5 + cs * 0.3 + fs * 0.2) * over }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}

function buildOFFQuery(remaining, targets) {
  const pctP = targets.protein > 0 ? remaining.protein / targets.protein : 0
  const pctC = targets.carbs   > 0 ? remaining.carbs   / targets.carbs   : 0
  const pctF = targets.fat     > 0 ? remaining.fat     / targets.fat     : 0
  if (pctP >= pctC && pctP >= pctF) return 'chicken eggs protein'
  if (pctC >= pctP && pctC >= pctF) return 'rice oatmeal'
  return 'nuts almonds'
}

function SuggestCard({ item, onAdd, hint }) {
  const [expanded, setExpanded] = useState(false)
  const [grams, setGrams]       = useState(String(item.grams))

  const g     = parseFloat(grams) || 0
  const ratio = item.grams > 0 ? g / item.grams : 0

  function handleAdd() {
    onAdd({
      name:    item.name,
      grams:   g,
      kcal:    Math.round(item.kcal    * ratio),
      protein: Math.round(item.protein * ratio * 10) / 10,
      carbs:   Math.round(item.carbs   * ratio * 10) / 10,
      fat:     Math.round(item.fat     * ratio * 10) / 10,
    })
  }

  return (
    <li className={`${styles.suggestCard} ${expanded ? styles.suggestCardExpanded : ''}`}>
      {expanded ? (
        <>
          <span className={styles.suggestCardName}>{item.name}</span>
          <div className={styles.gramRow}>
            <label className={styles.gramLabel}>Грамаж</label>
            <input
              className={styles.gramInput}
              type="number" min="1" max="2000"
              value={grams}
              onChange={e => setGrams(e.target.value)}
              autoFocus
            />
            <span className={styles.gramUnit}>g</span>
          </div>
          {ratio > 0 && (
            <div className={styles.preview}>
              {Math.round(item.kcal * ratio)} ккал ·
              П {Math.round(item.protein * ratio * 10) / 10}g ·
              В {Math.round(item.carbs   * ratio * 10) / 10}g ·
              М {Math.round(item.fat     * ratio * 10) / 10}g
            </div>
          )}
          <div className={styles.panelActions}>
            <button className={styles.cancelBtn} onClick={() => setExpanded(false)} type="button">Назад</button>
            <button className={styles.addBtn} onClick={handleAdd} type="button">+ Добави</button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.suggestCardInfo}>
            <span className={styles.suggestCardName}>{item.name}</span>
            <span className={styles.suggestCardMacros}>
              {item.kcal} ккал · П{item.protein}g · В{item.carbs}g · М{item.fat}g · {item.grams}g
              {hint && <span className={styles.suggestCardHint}> · {hint}</span>}
            </span>
          </div>
          <button className={styles.suggestAddBtn} onClick={() => setExpanded(true)} type="button">+</button>
        </>
      )}
    </li>
  )
}

function HistorySuggestions({ remaining, onAddRaw }) {
  const { profile } = useAuth()
  const [items, setItems]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('food_logs')
      .select('name, grams, kcal, protein, carbs, fat')
      .eq('user_id', profile.id)
      .order('logged_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        const seen = new Set()
        const unique = data.filter(r => {
          if (seen.has(r.name)) return false
          seen.add(r.name)
          return true
        })
        setItems(scoreHistoryFoods(unique, remaining))
        setLoading(false)
      })
  }, [profile?.id])

  if (loading) return <p className={styles.suggestEmpty}>Зарежда...</p>
  if (!items?.length) return <p className={styles.suggestEmpty}>Няма история за анализ</p>

  return (
    <ul className={styles.suggestList}>
      {items.map((item, i) => (
        <SuggestCard key={i} item={item} hint="от история" onAdd={onAddRaw} />
      ))}
    </ul>
  )
}

function OFFSuggestions({ remaining, targets, onAddRaw }) {
  const [query, setQuery]     = useState('')
  const [items, setItems]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const autoRan               = useRef(false)

  useEffect(() => {
    if (autoRan.current) return
    autoRan.current = true
    const q = buildOFFQuery(remaining, targets)
    setQuery(q)
    runSearch(q)
  }, [])

  async function runSearch(q) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    try {
      const results = await searchFoods(q.trim())
      const scored = results
        .filter(r => r.per100g.kcal > 0)
        .map(r => {
          const kpg  = r.per100g.kcal / 100
          const sugG = Math.min(600, Math.max(30, Math.round((remaining.kcal * 0.5) / kpg)))
          return {
            name:    r.name + (r.brand ? ` (${r.brand})` : ''),
            grams:   sugG,
            kcal:    Math.round(r.per100g.kcal    / 100 * sugG),
            protein: Math.round(r.per100g.protein / 100 * sugG * 10) / 10,
            carbs:   Math.round(r.per100g.carbs   / 100 * sugG * 10) / 10,
            fat:     Math.round(r.per100g.fat     / 100 * sugG * 10) / 10,
          }
        })
        .slice(0, 8)
      setItems(scored)
    } catch {
      setError('Грешка при търсене')
    }
    setLoading(false)
  }

  return (
    <>
      <div className={styles.offSearchRow}>
        <input
          className={styles.offSearch}
          type="text"
          placeholder="Търси в OpenFoodFacts..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runSearch(query)}
        />
        <button
          className={styles.offSearchBtn}
          onClick={() => runSearch(query)}
          type="button"
          disabled={loading}
        >
          {loading ? '...' : '→'}
        </button>
      </div>
      {error && <p className={styles.suggestEmpty}>{error}</p>}
      {!loading && items?.length === 0 && <p className={styles.suggestEmpty}>Няма резултати</p>}
      {items && items.length > 0 && (
        <ul className={styles.suggestList}>
          {items.map((item, i) => (
            <SuggestCard key={i} item={item} hint="OpenFoodFacts" onAdd={onAddRaw} />
          ))}
        </ul>
      )}
    </>
  )
}

function SuggestMode({ totals, targets, onAddRaw }) {
  const [subTab, setSubTab] = useState('history')

  const remaining = {
    kcal:    Math.max(0, (targets.kcal    || 0) - (totals.kcal    || 0)),
    protein: Math.max(0, (targets.protein || 0) - (totals.protein || 0)),
    carbs:   Math.max(0, (targets.carbs   || 0) - (totals.carbs   || 0)),
    fat:     Math.max(0, (targets.fat     || 0) - (totals.fat     || 0)),
  }

  return (
    <div className={styles.suggestWrap}>
      <div className={styles.remainingBanner}>
        <span className={styles.remainingLabel}>Остават</span>
        <div className={styles.remainingValues}>
          <span className={styles.remKcal}>{Math.round(remaining.kcal)} ккал</span>
          <span className={styles.remMacro}>П {Math.round(remaining.protein)}g</span>
          <span className={styles.remMacro}>В {Math.round(remaining.carbs)}g</span>
          <span className={styles.remMacro}>М {Math.round(remaining.fat)}g</span>
        </div>
      </div>

      <div className={styles.subTabRow}>
        <button
          className={`${styles.subTabBtn} ${subTab === 'history' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('history')}
          type="button"
        >МОЯ ИСТОРИЯ</button>
        <button
          className={`${styles.subTabBtn} ${subTab === 'off' ? styles.subTabActive : ''}`}
          onClick={() => setSubTab('off')}
          type="button"
        >НОВИ ХРАНИ</button>
      </div>

      {subTab === 'history' && <HistorySuggestions remaining={remaining} onAddRaw={onAddRaw} />}
      {subTab === 'off'     && <OFFSuggestions remaining={remaining} targets={targets} onAddRaw={onAddRaw} />}
    </div>
  )
}
