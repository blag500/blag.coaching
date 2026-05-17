import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { suggestMacros } from '../../utils/usda'
import BarcodeScanner from './BarcodeScanner'
import RecipeList from '../Recipes/RecipeList'
import MealBot from '../MealBot/MealBot'
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

export default function FoodSearch({ onAdd, onAddRaw }) {
  const [mode, setMode] = useState('ai') // 'ai' | 'manual' | 'recent' | 'bot' | 'recipes'

  return (
    <div className={styles.wrap}>
      <div className={styles.modeBar}>
        {[
          { id: 'ai',      label: 'AI' },
          { id: 'manual',  label: 'РЪЧНО' },
          { id: 'recent',  label: 'СКОР.' },
          { id: 'bot',     label: 'БОТ' },
          { id: 'recipes', label: 'РЕЦЕПТИ' },
        ].map(m => (
          <button
            key={m.id}
            className={`${styles.modeBtn} ${mode === m.id ? styles.modeBtnActive : ''}`}
            onClick={() => setMode(m.id)}
            type="button"
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'ai'      && <AiMode onAdd={onAdd} onAddRaw={onAddRaw} />}
      {mode === 'manual'  && <ManualMode onAddRaw={onAddRaw} />}
      {mode === 'recent'  && <RecentMode onAddRaw={onAddRaw} />}
      {mode === 'bot'     && <MealBot onAddRaw={onAddRaw} />}
      {mode === 'recipes' && <RecipeList onAddRaw={onAddRaw} />}
    </div>
  )
}

// ─── AI macro lookup mode ────────────────────────────────────────────────────

function AiMode({ onAdd, onAddRaw }) {
  const [query, setQuery]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [labelLoading, setLabelLoading] = useState(false)
  const [error, setError]           = useState(null)
  const [result, setResult]         = useState(null)
  const [grams, setGrams]           = useState('100')
  const [scanning, setScanning]     = useState(false)
  const addPanelRef  = useRef(null)
  const photoInputRef = useRef(null)

  useEffect(() => {
    if (result && addPanelRef.current) {
      setTimeout(() => addPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
    }
  }, [result])

  async function handleSearch() {
    if (!query.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('macro-lookup', {
        body: { query: query.trim() },
      })
      if (fnError) throw fnError
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

  function handleBarcodeFound(food) {
    setScanning(false)
    setResult({ name: food.name, per100g: food.per100g, typical_grams: 100 })
    setGrams('100')
    setQuery('')
  }

  function handleAdd() {
    const g = parseFloat(grams)
    if (!g || g <= 0 || !result) return
    const ratio = g / 100
    onAddRaw({
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
  }

  const g = parseFloat(grams)

  return (
    <>
      {scanning && (
        <BarcodeScanner onFound={handleBarcodeFound} onClose={() => setScanning(false)} />
      )}

      <div className={styles.inputWrap}>
        <span className={styles.searchIcon} aria-hidden="true">✨</span>
        <input
          className={styles.input}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setResult(null); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Опиши ястие или съставка..."
          aria-label="AI търсене на макроси"
        />
        {query ? (
          <button className={styles.clear} onClick={() => { setQuery(''); setResult(null); setError(null) }} aria-label="Изчисти">×</button>
        ) : (
          <button className={styles.scanBtn} onClick={() => setScanning(true)} aria-label="Баркод" title="Скенирай баркод">📷</button>
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
    </>
  )
}

// ─── Manual entry mode ───────────────────────────────────────────────────────

function ManualMode({ onAddRaw }) {
  const empty = { name: '', kcal: '', protein: '', carbs: '', fat: '', grams: '' }
  const [form, setForm] = useState(empty)
  const [added, setAdded] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggLoading, setSuggLoading] = useState(false)
  const debounceRef = useRef(null)

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  function handleNameChange(val) {
    set('name', val)
    clearTimeout(debounceRef.current)
    if (!val.trim() || val.trim().length < 2) { setSuggestions([]); setSuggLoading(false); return }
    setSuggLoading(true)
    debounceRef.current = setTimeout(async () => {
      const results = await suggestMacros(val)
      setSuggestions(results)
      setSuggLoading(false)
    }, 600)
  }

  function applySuggestion(s) {
    setForm(prev => ({
      ...prev,
      kcal:    String(s.kcal),
      protein: String(s.protein),
      carbs:   String(s.carbs),
      fat:     String(s.fat),
    }))
    setSuggestions([])
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
    setSuggestions([])
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
        onChange={e => handleNameChange(e.target.value)}
      />
      {suggLoading && (
        <p className={styles.suggLoading}>Търси в базата...</p>
      )}
      {suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              className={styles.suggItem}
              onClick={() => applySuggestion(s)}
              type="button"
            >
              <span className={styles.suggName}>{s.name}</span>
              <span className={styles.suggMacros}>
                {s.kcal} ккал · П {s.protein}g · В {s.carbs}g · М {s.fat}g <span className={styles.per}>/ 100g</span>
              </span>
            </button>
          ))}
        </div>
      )}
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
