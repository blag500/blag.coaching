import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './CatalogManager.module.css'

const CATEGORIES = [
  { id: 'protein', label: 'Протеин'  },
  { id: 'carbs',   label: 'Въглехидрати' },
  { id: 'snacks',  label: 'Закуски'  },
  { id: 'other',   label: 'Друго'    },
]

const UNITS = ['g', 'ml', 'бр', 'пакет']

const EMPTY_FORM = {
  name: '', description: '', category: 'protein',
  price_stotinki: '', image_url: '',
  kcal_per_serving: '', protein_per_serving: '',
  carbs_per_serving: '', fat_per_serving: '',
  serving_size: '100', serving_unit: 'g',
  available: true, sort_order: '0',
}

function toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n }
function toInt(v) { const n = parseInt(v);   return isNaN(n) ? 0 : n }

export default function CatalogManager({ onClose }) {
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(null) // null | 'new' | product.id
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('catalog_products')
      .select('*')
      .order('sort_order')
      .order('name')
    setProducts(data || [])
    setLoading(false)
  }

  function openNew() {
    setForm(EMPTY_FORM)
    setEditing('new')
    setError('')
  }

  function openEdit(p) {
    setForm({
      name:               p.name,
      description:        p.description || '',
      category:           p.category,
      price_stotinki:     String(p.price_stotinki),
      image_url:          p.image_url || '',
      kcal_per_serving:   String(p.kcal_per_serving),
      protein_per_serving: String(p.protein_per_serving),
      carbs_per_serving:  String(p.carbs_per_serving),
      fat_per_serving:    String(p.fat_per_serving),
      serving_size:       String(p.serving_size),
      serving_unit:       p.serving_unit,
      available:          p.available,
      sort_order:         String(p.sort_order),
    })
    setEditing(p.id)
    setError('')
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function save() {
    if (!form.name.trim()) { setError('Въведи наименование'); return }
    if (!form.price_stotinki) { setError('Въведи цена'); return }
    setSaving(true)
    setError('')

    const payload = {
      name:               form.name.trim(),
      description:        form.description.trim() || null,
      category:           form.category,
      price_stotinki:     toInt(form.price_stotinki),
      image_url:          form.image_url.trim() || null,
      kcal_per_serving:   toInt(form.kcal_per_serving),
      protein_per_serving: toNum(form.protein_per_serving),
      carbs_per_serving:  toNum(form.carbs_per_serving),
      fat_per_serving:    toNum(form.fat_per_serving),
      serving_size:       toNum(form.serving_size),
      serving_unit:       form.serving_unit,
      available:          form.available,
      sort_order:         toInt(form.sort_order),
    }

    let err
    if (editing === 'new') {
      const res = await supabase.from('catalog_products').insert(payload).select().single()
      err = res.error
      if (!err && res.data) setProducts(prev => [...prev, res.data])
    } else {
      const res = await supabase.from('catalog_products').update(payload).eq('id', editing).select().single()
      err = res.error
      if (!err && res.data) setProducts(prev => prev.map(p => p.id === editing ? res.data : p))
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    setEditing(null)
  }

  async function toggleAvailable(p) {
    const { data } = await supabase
      .from('catalog_products')
      .update({ available: !p.available })
      .eq('id', p.id)
      .select()
      .single()
    if (data) setProducts(prev => prev.map(x => x.id === p.id ? data : x))
  }

  async function remove(id) {
    if (!window.confirm('Изтрий продукта?')) return
    await supabase.from('catalog_products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>КАТАЛОГ</span>
          <div className={styles.headerRight}>
            <button type="button" className={styles.addBtn} onClick={openNew}>+ ДОБАВИ</button>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Затвори">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? null : (
          <div className={styles.list}>
            {products.length === 0 && (
              <div className={styles.empty}>Все още няма продукти.</div>
            )}
            {products.map(p => (
              <div key={p.id} className={`${styles.row} ${!p.available ? styles.rowUnavailable : ''}`}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowName}>{p.name}</span>
                  <span className={styles.rowMeta}>
                    {(p.price_stotinki / 100).toFixed(2)} лв. · {p.protein_per_serving}g П · {p.kcal_per_serving} kcal
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <button type="button" className={`${styles.availBtn} ${p.available ? styles.availBtnOn : ''}`}
                    onClick={() => toggleAvailable(p)} title={p.available ? 'Деактивирай' : 'Активирай'}>
                    {p.available ? '●' : '○'}
                  </button>
                  <button type="button" className={styles.editBtn} onClick={() => openEdit(p)}>✎</button>
                  <button type="button" className={styles.delBtn}  onClick={() => remove(p.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editing !== null && (
          <div className={styles.formOverlay}>
            <div className={styles.form}>
              <div className={styles.formTitle}>{editing === 'new' ? 'НОВ ПРОДУКТ' : 'РЕДАКТИРАЙ'}</div>

              <input className={styles.input} placeholder="Наименование *" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
              <input className={styles.input} placeholder="Описание" value={form.description} onChange={e => set('description', e.target.value)} />

              <div className={styles.row2}>
                <select className={styles.select} value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input className={styles.input} placeholder="Цена (стотинки)" type="number" value={form.price_stotinki}
                  onChange={e => set('price_stotinki', e.target.value)} />
              </div>

              <div className={styles.priceHint}>
                {form.price_stotinki ? `= ${(toInt(form.price_stotinki) / 100).toFixed(2)} лв.` : ''}
              </div>

              <div className={styles.macroGrid}>
                <div className={styles.macroField}>
                  <label className={styles.macroLabel}>Kcal</label>
                  <input className={styles.input} type="number" value={form.kcal_per_serving} onChange={e => set('kcal_per_serving', e.target.value)} />
                </div>
                <div className={styles.macroField}>
                  <label className={styles.macroLabel} style={{ color: '#42A5F5' }}>Протеин g</label>
                  <input className={styles.input} type="number" value={form.protein_per_serving} onChange={e => set('protein_per_serving', e.target.value)} />
                </div>
                <div className={styles.macroField}>
                  <label className={styles.macroLabel} style={{ color: '#66BB6A' }}>Въглехид. g</label>
                  <input className={styles.input} type="number" value={form.carbs_per_serving} onChange={e => set('carbs_per_serving', e.target.value)} />
                </div>
                <div className={styles.macroField}>
                  <label className={styles.macroLabel} style={{ color: '#ffb74d' }}>Мазнини g</label>
                  <input className={styles.input} type="number" value={form.fat_per_serving} onChange={e => set('fat_per_serving', e.target.value)} />
                </div>
              </div>

              <div className={styles.row2}>
                <input className={styles.input} placeholder="Порция" type="number" value={form.serving_size} onChange={e => set('serving_size', e.target.value)} />
                <select className={styles.select} value={form.serving_unit} onChange={e => set('serving_unit', e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className={styles.row2}>
                <input className={styles.input} placeholder="Ред (sort_order)" type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
                <label className={styles.availToggle}>
                  <input type="checkbox" checked={form.available} onChange={e => set('available', e.target.checked)} />
                  <span>Активен</span>
                </label>
              </div>

              <input className={styles.input} placeholder="Image URL (незадължително)" value={form.image_url} onChange={e => set('image_url', e.target.value)} />

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditing(null)}>ОТКАЗ</button>
                <button type="button" className={styles.saveBtn} onClick={save} disabled={saving}>
                  {saving ? '...' : 'ЗАПАЗИ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
