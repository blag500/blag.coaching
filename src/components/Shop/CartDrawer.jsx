import { useState } from 'react'
import { useShop } from '../../hooks/useShop'
import styles from './CartDrawer.module.css'

function formatPrice(stotinki) {
  return (stotinki / 100).toFixed(2) + ' лв.'
}

export default function CartDrawer({ cart, onClose, onOrderSuccess }) {
  const { checkout } = useShop()
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
      setError(err.message || 'Грешка при поръчката')
      setLoading(false)
    }
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.drawer}>
        <div className={styles.header}>
          <span className={styles.title}>КОЛИЧКА</span>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Затвори">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className={styles.empty}>Количката е празна.</div>
        ) : (
          <>
            <div className={styles.itemList}>
              {cart.items.map(item => (
                <div key={item.product_id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.itemMacros}>{item.protein}g П · {item.kcal} kcal</span>
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
                placeholder="Адрес за доставка"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
              <input
                className={styles.input}
                placeholder="Бележки (незадължително)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>ОБЩО</span>
              <span className={styles.totalVal}>{formatPrice(cart.totalStotinki)}</span>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.checkoutBtn}
              onClick={handleCheckout}
              disabled={loading || !address.trim()}
              type="button"
            >
              {loading ? 'ЗАРЕЖДА...' : 'ПЛАТИ С КАРТА →'}
            </button>

            <p className={styles.hint}>
              Макросите ще се логнат автоматично след потвърждение на плащането.
            </p>
          </>
        )}
      </div>
    </>
  )
}
