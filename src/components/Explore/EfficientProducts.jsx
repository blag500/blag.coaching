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

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function ProductCard({ product, currentUserId, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(FORM_EMPTY)
  const [saving, setSaving] = useState(false)
  const isOwner = product.added_by === currentUserId

  function startEdit() {
    setDraft({ name: product.name, source: product.source, price: product.price, indicator: product.indicator })
    setEditing(true)
  }

  async function handleSave() {
    const updates = { name: draft.name.trim(), source: draft.source.trim(), price: draft.price.trim(), indicator: draft.indicator.trim() }
    if (FORM_FIELDS.some(f => !updates[f.key])) return
    setSaving(true)
    await onEdit(product.id, updates)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className={`${styles.card} ${editing ? styles.cardEditing : ''}`}>
      {!editing && product.photo_url && (
        <img src={product.photo_url} alt={product.name} className={styles.cardPhoto} />
      )}
      <div className={styles.cardBody}>
        {editing ? (
          <>
            {FORM_FIELDS.map(f => (
              <div key={f.key} className={styles.formField}>
                <label className={styles.formLabel}>{f.label}</label>
                <input
                  className={styles.formInput}
                  type="text"
                  value={draft[f.key]}
                  onChange={e => setDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={() => setEditing(false)} type="button">Отказ</button>
              <button
                className={styles.submitBtn}
                onClick={handleSave}
                disabled={saving || FORM_FIELDS.some(f => !draft[f.key].trim())}
                type="button"
              >
                {saving ? 'Запазва...' : 'Запази'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.cardTop}>
              <span className={styles.cardName}>{product.name}</span>
              {isOwner && (
                <div className={styles.cardActions}>
                  <button className={styles.editBtn} onClick={startEdit} type="button" aria-label="Редактирай">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className={styles.deleteBtn} onClick={() => onDelete(product.id)} type="button" aria-label="Изтрий">×</button>
                </div>
              )}
            </div>
            <span className={styles.indicator}>{product.indicator}</span>
            <div className={styles.cardMeta}>
              <span className={styles.metaItem}><PinIcon />{product.source}</span>
              <span className={styles.metaItem}><TagIcon />{product.price}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function EfficientProducts({ onBack }) {
  const { user } = useAuth()
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(FORM_EMPTY)
  const [photoFile, setPhotoFile]   = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

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

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function cancelForm() {
    setShowForm(false)
    setForm(FORM_EMPTY)
    setPhotoFile(null)
    setPhotoPreview(null)
    setError(null)
  }

  async function handleSubmit() {
    if (!user) return
    if (!FORM_FIELDS.every(f => form[f.key].trim())) return
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
      setSubmitting(false)
      return
    }

    let product = data
    if (photoFile) {
      const ext = photoFile.name.split('.').pop().toLowerCase()
      const path = `${user.id}/${data.id}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('product-photos')
        .upload(path, photoFile, { upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('product-photos').getPublicUrl(path)
        const photoUrl = urlData.publicUrl
        await supabase.from('efficient_products').update({ photo_url: photoUrl }).eq('id', data.id)
        product = { ...data, photo_url: photoUrl }
      }
    }

    setProducts(prev => [product, ...prev])
    setForm(FORM_EMPTY)
    setPhotoFile(null)
    setPhotoPreview(null)
    setShowForm(false)
    setSubmitting(false)
  }

  async function handleDelete(id) {
    await supabase.from('efficient_products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function handleEdit(id, updates) {
    const { error } = await supabase.from('efficient_products').update(updates).eq('id', id)
    if (!error) setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
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

          <div className={styles.formField}>
            <label className={styles.formLabel}>Снимка (незадължително)</label>
            <label className={styles.photoUploadLabel} htmlFor="ep-photo">
              {photoPreview ? (
                <img src={photoPreview} alt="преглед" className={styles.photoPreviewImg} />
              ) : (
                <span className={styles.photoUploadHint}>
                  <CameraIcon />
                  Добави снимка
                </span>
              )}
            </label>
            <input
              id="ep-photo"
              type="file"
              accept="image/*"
              className={styles.photoFileInput}
              onChange={handlePhotoChange}
            />
          </div>

          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={cancelForm} type="button">Отказ</button>
            <button className={styles.submitBtn} onClick={handleSubmit} disabled={!canSubmit} type="button">
              {submitting ? 'Изпраща...' : '+ Добави'}
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.contributeBtn} onClick={() => setShowForm(true)} type="button">
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
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
