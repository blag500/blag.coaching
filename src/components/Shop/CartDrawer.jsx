import { useState } from 'react'
import { useShop } from '../../hooks/useShop'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './CartDrawer.module.css'

export default function CartDrawer({ cart, onClose, onOrderSuccess }) {
  const { checkout } = useShop()
  const { t } = useSettings()
  const formatPrice = stotinki => t('cart.currency', { amount: (stotinki / 100).toFixed(2) })
  const [address, setAddress] = useState('')
  const [notes,   setNotes]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleCheckout() {
    if (!cart.items.length) return
    setLoading(true)
    setError('')
    try {
      const { url } = await checkout({
        items: cart.items,
        deliveryAddress: address,
        deliveryNotes:   notes,
      })
      cart.clearCart()
      window.location.href = url
    } catch (err) {
      setError(err.message || t('cart.err.order'))
      setLoading(false)
    }
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.drawer}>
        <div className={styles.header}>
          <span className={styles.title}>{t('cart.title')}</span>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label={t('cart.close')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className={styles.empty}>{t('cart.empty')}</div>
        ) : (
          <>
            <div className={styles.itemList}>
              {cart.items.map(item => (
                <div key={item.product_id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.itemMacros}>{item.protein}g {t('nutr.card.pShort')} · {item.kcal} {t('unit.kcal')}</span>
                  </div>
                  <div className={styles.itemRight}>
                    <div className={styles.qtyRow}>
                      <button type="button" className={styles.qtyBtn} onClick={() => cart.updateQty(item.product_id, item.qty - 1)}>−</button>
                      <span className={styles.qtyNum}>{item.qty}</span>
                      <button type="button" className={styles.qtyBtn} onClick={() => cart.updateQty(item.product_id, item.qty + 1)}>+</button>
                    </div>
                    <span className={styles.itemPrice}>{formatPrice(item.price_stotinki * item.qty)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.deliverySection}>
              <input
                className={styles.input}
                placeholder={t('cart.address')}
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
              <input
                className={styles.input}
                placeholder={t('cart.notes')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>{t('cart.total')}</span>
              <span className={styles.totalVal}>{formatPrice(cart.totalStotinki)}</span>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.checkoutBtn}
              onClick={handleCheckout}
              disabled={loading || !address.trim()}
              type="button"
            >
              {loading ? t('cart.loading') : t('cart.pay')}
            </button>

            <p className={styles.hint}>{t('cart.footnote')}</p>
          </>
        )}
      </div>
    </>
  )
}
