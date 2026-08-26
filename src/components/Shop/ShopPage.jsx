import { useState } from 'react'
import { useShop } from '../../hooks/useShop'
import { useCart } from '../../hooks/useCart'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import CartDrawer from './CartDrawer'
import CatalogManager from './CatalogManager'
import styles from './ShopPage.module.css'

const CATEGORIES = [
  { id: 'all',         labelKey: 'shop.cat.all'         },
  { id: 'bars_snacks', labelKey: 'shop.cat.bars'        },
  { id: 'pantry',      labelKey: 'shop.cat.pantry'      },
  { id: 'supplements', labelKey: 'shop.cat.supplements' },
]

export default function ShopPage({ initialOrderSuccess }) {
  const { products, loading } = useShop()
  const cart = useCart()
  const { profile } = useAuth()
  const { t } = useSettings()
  const formatPrice = stotinki => t('cart.currency', { amount: (stotinki / 100).toFixed(2) })
  const isCoach = profile?.role === 'coach'
  const [category, setCategory] = useState('all')
  const [cartOpen,     setCartOpen]     = useState(false)
  const [managerOpen,  setManagerOpen]  = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(initialOrderSuccess ?? false)

  const visible = category === 'all'
    ? products
    : products.filter(p => p.category === category)

  if (loading) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('shop.title')}</h1>
          <p className={styles.subtitle}>{t('shop.subtitle')}</p>
        </div>
        <div className={styles.headerBtns}>
          {isCoach && (
            <button className={styles.manageBtn} onClick={() => setManagerOpen(true)} type="button" aria-label={t('shop.manage')}>
              ⚙
            </button>
          )}
          <button
            className={`${styles.cartBtn} ${cart.itemCount > 0 ? styles.cartBtnActive : ''}`}
            onClick={() => setCartOpen(true)}
            type="button"
            aria-label={t('shop.cart')}
          >
            🛒
            {cart.itemCount > 0 && (
              <span className={styles.cartBadge}>{cart.itemCount}</span>
            )}
          </button>
        </div>
      </header>

      {orderSuccess && (
        <div className={styles.successBanner}>
          <span>{t('shop.confirmed')}</span>
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
            {t(c.labelKey)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>{t('shop.emptyCat')}</div>
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
                    <span className={styles.macroChip} style={{ color: '#42A5F5' }}>{p.protein_per_serving}g {t('nutr.card.pShort')}</span>
                    <span className={styles.macroChip} style={{ color: '#66BB6A' }}>{p.carbs_per_serving}g {t('nutr.card.cShort')}</span>
                    <span className={styles.macroChip} style={{ color: 'var(--accent)' }}>{p.fat_per_serving}g {t('nutr.card.fShort')}</span>
                    <span className={styles.macroChip} style={{ color: 'var(--muted)' }}>{p.kcal_per_serving} {t('unit.kcal')}</span>
                  </div>
                  <div className={styles.cardServing}>
                    {t('shop.perServing', { n: p.serving_size, unit: p.serving_unit })}
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
                      {t('shop.add')}
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

      {managerOpen && (
        <CatalogManager onClose={() => setManagerOpen(false)} />
      )}
    </div>
  )
}
