import { useState } from 'react'
import { useShop } from '../../hooks/useShop'
import { useCart } from '../../hooks/useCart'
import CartDrawer from './CartDrawer'
import styles from './ShopPage.module.css'

const CATEGORIES = [
  { id: 'all',      label: 'ВСИЧКИ'   },
  { id: 'protein',  label: 'ПРОТЕИН'  },
  { id: 'carbs',    label: 'ВЪГЛ.'    },
  { id: 'snacks',   label: 'ЗАКУСКИ'  },
  { id: 'other',    label: 'ДРУГО'    },
]

function formatPrice(stotinki) {
  return (stotinki / 100).toFixed(2) + ' лв.'
}

export default function ShopPage({ initialOrderSuccess }) {
  const { products, loading } = useShop()
  const cart = useCart()
  const [category, setCategory] = useState('all')
  const [cartOpen, setCartOpen] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(initialOrderSuccess ?? false)

  const visible = category === 'all'
    ? products
    : products.filter(p => p.category === category)

  if (loading) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>МАГАЗИН</h1>
          <p className={styles.subtitle}>БЪРЗА ДОСТАВКА · ПРОСЛЕДЕНИ МАКРОСИ</p>
        </div>
        <button
          className={`${styles.cartBtn} ${cart.itemCount > 0 ? styles.cartBtnActive : ''}`}
          onClick={() => setCartOpen(true)}
          type="button"
          aria-label="Количка"
        >
          🛒
          {cart.itemCount > 0 && (
            <span className={styles.cartBadge}>{cart.itemCount}</span>
          )}
        </button>
      </header>

      {orderSuccess && (
        <div className={styles.successBanner}>
          <span>✓ Поръчката е потвърдена! Продуктите са логнати в дневника.</span>
          <button onClick={() => setOrderSuccess(false)} type="button" className={styles.successClose}>×</button>
        </div>
      )}

      {/* Category tabs */}
      <div className={styles.catRow}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            className={`${styles.catBtn} ${category === c.id ? styles.catBtnActive : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>Няма продукти в тази категория.</div>
      ) : (
        <div className={styles.grid}>
          {visible.map(p => {
            const inCart = cart.items.find(i => i.product_id === p.id)
            return (
              <div key={p.id} className={styles.card}>
                {p.image_url ? (
                  <img src={p.image_url} className={styles.cardImg} alt={p.name} />
                ) : (
                  <div className={styles.cardImgPlaceholder}>
                    {p.category === 'protein' ? '🥛' : p.category === 'carbs' ? '🌾' : p.category === 'snacks' ? '🍫' : '📦'}
                  </div>
                )}
                <div className={styles.cardBody}>
                  <span className={styles.cardName}>{p.name}</span>
                  {p.description && <span className={styles.cardDesc}>{p.description}</span>}
                  <div className={styles.cardMacros}>
                    <span className={styles.macroChip} style={{ color: '#42A5F5' }}>{p.protein_per_serving}g П</span>
                    <span className={styles.macroChip} style={{ color: '#66BB6A' }}>{p.carbs_per_serving}g В</span>
                    <span className={styles.macroChip} style={{ color: '#ffb74d' }}>{p.fat_per_serving}g М</span>
                    <span className={styles.macroChip} style={{ color: 'var(--muted)' }}>{p.kcal_per_serving} kcal</span>
                  </div>
                  <div className={styles.cardServing}>
                    {p.serving_size}{p.serving_unit} на порция
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.price}>{formatPrice(p.price_stotinki)}</span>
                  {inCart ? (
                    <div className={styles.qtyRow}>
                      <button type="button" className={styles.qtyBtn} onClick={() => cart.updateQty(p.id, inCart.qty - 1)}>−</button>
                      <span className={styles.qtyNum}>{inCart.qty}</span>
                      <button type="button" className={styles.qtyBtn} onClick={() => cart.updateQty(p.id, inCart.qty + 1)}>+</button>
                    </div>
                  ) : (
                    <button type="button" className={styles.addBtn} onClick={() => cart.addItem(p)}>
                      + ДОБАВИ
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cartOpen && (
        <CartDrawer cart={cart} onClose={() => setCartOpen(false)} onOrderSuccess={() => { setOrderSuccess(true); setCartOpen(false) }} />
      )}
    </div>
  )
}
