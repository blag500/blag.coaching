import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './EfficientProducts.module.css'

const FORM_EMPTY = { name: '', source: '', price: '', indicator: '' }

const FORM_FIELDS = [
  { key: 'name',      label: 'Наименование',       placeholder: 'напр. Пилешки гърди' },
  { key: 'source',    label: 'Откъде се набавя',   placeholder: 'напр. Kaufland, Lidl, онлайн...' },
  { key: 'price',     label: 'Цена',               placeholder: 'напр. 4.99 лв / кг' },
  { key: 'indicator', label: 'С какво се отличава', placeholder: 'напр. Висок протеин, Богат на омега-3...' },
]

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  )
}

function ProductCard({ product, currentUserId, onDelete }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.cardName}>{product.name}</span>
        <span className={styles.indicator}>{product.indicator}</span>
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <PinIcon />
          {product.source}
        </span>
        <span className={styles.metaItem}>
          <TagIcon />
          {product.price}
        </span>
      </div>
      {product.added_by === currentUserId && (
        <button
          className={styles.deleteBtn}
          onClick={() => onDelete(product.id)}
          type="button"
          aria-label="Изтрий"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default function EfficientProducts({ onBack }) {
  const { user } = useAuth()
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(FORM_EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => {
    supabase
      .from('efficient_products')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setProducts(data)
        setLoading(false)
      })
  }, [])

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit() {
    if (!user) return
    const filled = FORM_FIELDS.every(f => form[f.key].trim())
    if (!filled) return
    setSubmitting(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('efficient_products')
      .insert({
        name:      form.name.trim(),
        source:    form.source.trim(),
        price:     form.price.trim(),
        indicator: form.indicator.trim(),
        added_by:  user.id,
      })
      .select()
      .single()
    if (err) {
      setError('Грешка при добавяне. Опитай пак.')
    } else if (data) {
      setProducts(prev => [data, ...prev])
      setForm(FORM_EMPTY)
      setShowForm(false)
    }
    setSubmitting(false)
  }

  async function handleDelete(id) {
    await supabase.from('efficient_products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const canSubmit = FORM_FIELDS.every(f => form[f.key].trim()) && !submitting

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">
          ← ОТКРИЙ
        </button>
        <h1 className={styles.title}>ЕФЕКТИВНИ ПРОДУКТИ</h1>
        <p className={styles.subtitle}>Добавено от общността · всеки може да допринесе</p>
      </header>

      {showForm ? (
        <div className={styles.formWrap}>
          <h2 className={styles.formTitle}>НОВА НАХОДКА</h2>
          {FORM_FIELDS.map(f => (
            <div key={f.key} className={styles.formField}>
              <label className={styles.formLabel} htmlFor={`ep-${f.key}`}>{f.label}</label>
              <input
                id={`ep-${f.key}`}
                className={styles.formInput}
                type="text"
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setField(f.key, e.target.value)}
              />
            </div>
          ))}
          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.formActions}>
            <button
              className={styles.cancelBtn}
              onClick={() => { setShowForm(false); setError(null) }}
              type="button"
            >
              Отказ
            </button>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!canSubmit}
              type="button"
            >
              {submitting ? 'Изпраща...' : '+ Добави'}
            </button>
          </div>
        </div>
      ) : (
        <button
          className={styles.contributeBtn}
          onClick={() => setShowForm(true)}
          type="button"
        >
          + Добави продукт
        </button>
      )}

      {loading ? (
        <p className={styles.empty}>Зарежда...</p>
      ) : products.length === 0 ? (
        <p className={styles.empty}>Все още няма продукти. Бъди първият!</p>
      ) : (
        <div className={styles.list}>
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              currentUserId={user?.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
