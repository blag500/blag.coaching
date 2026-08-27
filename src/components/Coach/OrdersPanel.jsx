import { useAllOrders } from '../../hooks/useShop'
import { useSettings } from '../../contexts/SettingsContext'
import styles from './OrdersPanel.module.css'
import { loc } from '../../utils/locale'

const STATUS_LABEL_KEYS = {
  pending_payment: 'op.status.pending_payment',
  confirmed:       'op.status.confirmed',
  preparing:       'op.status.preparing',
  delivered:       'op.status.delivered',
  cancelled:       'op.status.cancelled',
}

const STATUS_NEXT = {
  confirmed:  'preparing',
  preparing:  'delivered',
}

const STATUS_NEXT_LABEL_KEYS = {
  confirmed:  'op.next.confirmed',
  preparing:  'op.next.preparing',
}

function formatPrice(t, stotinki) {
  return t('cart.currency', { amount: (stotinki / 100).toFixed(2) })
}

function formatDate(lang, ts) {
  const d = new Date(ts)
  return d.toLocaleDateString(loc(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLOR = {
  pending_payment: 'var(--muted)',
  confirmed:       '#42A5F5',
  preparing:       'var(--accent)',
  delivered:       '#66BB6A',
  cancelled:       '#ef5350',
}

export default function OrdersPanel() {
  const { orders, loading, updateStatus } = useAllOrders()

  if (loading) return null

  const active = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
  const done   = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled')

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('op.title')}</h1>
        {active.length > 0 && (
          <div className={styles.activeBadge}>{t('op.activeBadge', { n: active.length })}</div>
        )}
      </header>

      {orders.length === 0 && (
        <div className={styles.empty}>{t('op.empty')}</div>
      )}

      {active.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionLabel}>{t('op.active')}</div>
          <div className={styles.list}>
            {active.map(o => <OrderCard key={o.id} order={o} onAdvance={() => updateStatus(o.id, STATUS_NEXT[o.status])} />)}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionLabel}>{t('op.history')}</div>
          <div className={styles.list}>
            {done.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function OrderCard({ order, onAdvance }) {
  const { t, lang } = useSettings()
  const clientName = order.profiles?.name || order.profiles?.email || t('op.client')
  const nextKey    = STATUS_NEXT_LABEL_KEYS[order.status]
  const color      = STATUS_COLOR[order.status] || 'var(--muted)'

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <span className={styles.clientName}>{clientName}</span>
          <span className={styles.orderDate}>{formatDate(lang, order.created_at)}</span>
        </div>
        <div className={styles.cardTopRight}>
          <span className={styles.statusChip} style={{ color, borderColor: color }}>
            {STATUS_LABEL_KEYS[order.status] ? t(STATUS_LABEL_KEYS[order.status]) : order.status}
          </span>
          <span className={styles.total}>{formatPrice(t, order.total_stotinki)}</span>
        </div>
      </div>

      {order.order_items?.length > 0 && (
        <div className={styles.itemList}>
          {order.order_items.map(item => (
            <div key={item.id} className={styles.item}>
              <span className={styles.itemName}>{item.name_snapshot}</span>
              <span className={styles.itemMeta}>×{item.qty} · {formatPrice(t, item.unit_price_stotinki * item.qty)}</span>
            </div>
          ))}
        </div>
      )}

      {order.delivery_address && (
        <div className={styles.address}>📍 {order.delivery_address}</div>
      )}
      {order.delivery_notes && (
        <div className={styles.notes}>💬 {order.delivery_notes}</div>
      )}

      {nextKey && onAdvance && (
        <button className={styles.advanceBtn} onClick={onAdvance} type="button">
          {t(nextKey)}
        </button>
      )}
    </div>
  )
}
