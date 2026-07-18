import { useAllOrders } from '../../hooks/useShop'
import styles from './OrdersPanel.module.css'

const STATUS_LABELS = {
  pending_payment: 'ЧАКАЩО ПЛАЩАНЕ',
  confirmed:       'ПОТВЪРДЕНО',
  preparing:       'ПОДГОТВЯ СЕ',
  delivered:       'ДОСТАВЕНО',
  cancelled:       'ОТКАЗАНО',
}

const STATUS_NEXT = {
  confirmed:  'preparing',
  preparing:  'delivered',
}

const STATUS_NEXT_LABEL = {
  confirmed:  'ПОДГОТВЯ СЕ →',
  preparing:  'ДОСТАВЕНО ✓',
}

function formatPrice(stotinki) {
  return (stotinki / 100).toFixed(2) + ' лв.'
}

function formatDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLOR = {
  pending_payment: 'var(--muted)',
  confirmed:       '#42A5F5',
  preparing:       '#ffb74d',
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
        <h1 className={styles.title}>ПОРЪЧКИ</h1>
        {active.length > 0 && (
          <div className={styles.activeBadge}>{active.length} АКТИВНИ</div>
        )}
      </header>

      {orders.length === 0 && (
        <div className={styles.empty}>Все още няма поръчки.</div>
      )}

      {active.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionLabel}>АКТИВНИ</div>
          <div className={styles.list}>
            {active.map(o => <OrderCard key={o.id} order={o} onAdvance={() => updateStatus(o.id, STATUS_NEXT[o.status])} />)}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionLabel}>ИСТОРИЯ</div>
          <div className={styles.list}>
            {done.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function OrderCard({ order, onAdvance }) {
  const clientName = order.profiles?.name || order.profiles?.email || 'Клиент'
  const nextLabel  = STATUS_NEXT_LABEL[order.status]
  const color      = STATUS_COLOR[order.status] || 'var(--muted)'

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <span className={styles.clientName}>{clientName}</span>
          <span className={styles.orderDate}>{formatDate(order.created_at)}</span>
        </div>
        <div className={styles.cardTopRight}>
          <span className={styles.statusChip} style={{ color, borderColor: color }}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
          <span className={styles.total}>{formatPrice(order.total_stotinki)}</span>
        </div>
      </div>

      {order.order_items?.length > 0 && (
        <div className={styles.itemList}>
          {order.order_items.map(item => (
            <div key={item.id} className={styles.item}>
              <span className={styles.itemName}>{item.name_snapshot}</span>
              <span className={styles.itemMeta}>×{item.qty} · {formatPrice(item.unit_price_stotinki * item.qty)}</span>
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

      {nextLabel && onAdvance && (
        <button className={styles.advanceBtn} onClick={onAdvance} type="button">
          {nextLabel}
        </button>
      )}
    </div>
  )
}
