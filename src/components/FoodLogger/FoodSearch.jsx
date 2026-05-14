import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { searchFoods } from '../../utils/openFoodFacts'
import { suggestMacros } from '../../utils/usda'
import BarcodeScanner from './BarcodeScanner'
import styles from './FoodSearch.module.css'

export default function FoodSearch({ onAdd, onAddRaw }) {
  const [mode, setMode] = useState('search') // 'search' | 'manual' | 'recent'

  return (
    <div className={styles.wrap}>
      <div className={styles.modeBar}>
        {[
          { id: 'search', label: 'ТЪРСИ' },
          { id: 'manual', label: 'РЪЧНО' },
          { id: 'recent', label: 'СКОРОШНИ' },
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

      {mode === 'search' && <SearchMode onAdd={onAdd} />}
      {mode === 'manual' && <ManualMode onAddRaw={onAddRaw} />}
      {mode === 'recent' && <RecentMode onAddRaw={onAddRaw} />}
    </div>
  )
}

// ─── Search mode (unchanged logic) ──────────────────────────────────────────

function SearchMode({ onAdd }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [grams, setGrams]       = useState('100')
  const [scanning, setScanning] = useState(false)
  const debounceRef = useRef(null)
  const addPanelRef = useRef(null)

  useEffect(() => {
    if (selected && addPanelRef.current) {
      setTimeout(() => addPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
    }
  }, [selected])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
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

  function handleBarcodeFound(food) {
    setScanning(false)
    setSelected(food)
    setGrams('100')
    setQuery('')
    setResults([])
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
    <>
      {scanning && (
        <BarcodeScanner onFound={handleBarcodeFound} onClose={() => setScanning(false)} />
      )}
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
        {query ? (
          <button className={styles.clear} onClick={() => { setQuery(''); setResults([]) }} aria-label="Изчисти">×</button>
        ) : (
          <button className={styles.scanBtn} onClick={() => setScanning(true)} aria-label="Баркод" title="Скенирай баркод">📷</button>
        )}
      </div>

      {isLoading && (
        <div className={styles.status}>
          <span className={styles.spinner} aria-label="Зарежда..." />Търси...
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}

      {results.length > 0 && !selected && (
        <ul className={styles.results} role="listbox">
          {results.map(food => (
            <li key={food.id} className={styles.resultItem} onClick={() => { setSelected(food); setGrams('100') }} role="option" aria-selected="false">
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
        <div ref={addPanelRef} className={styles.addPanel}>
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
            <button className={styles.cancelBtn} onClick={() => setSelected(null)}>Назад</button>
            <button className={styles.addBtn} onClick={handleConfirm}>+ Добави</button>
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

  useEffect(() => {
    if (!user) return
    supabase
      .from('food_logs')
      .select('name, grams, kcal, protein, carbs, fat, added_at')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        // Deduplicate by name, keep most recent
        const seen = new Set()
        const unique = []
        for (const entry of data) {
          if (!seen.has(entry.name)) {
            seen.add(entry.name)
            unique.push(entry)
            if (unique.length >= 15) break
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
  }

  if (loading) return <p className={styles.recentEmpty}>Зарежда...</p>
  if (recents.length === 0) return <p className={styles.recentEmpty}>Няма скорошни храни</p>

  return (
    <ul className={styles.recentList}>
      {recents.map((item, i) => {
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
  )
}
