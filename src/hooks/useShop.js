import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useShop() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    loadProducts()
    if (user?.id) loadOrders()
  }, [user?.id])

  async function loadProducts() {
    const { data } = await supabase
      .from('catalog_products')
      .select('*')
      .eq('available', true)
      .order('sort_order')
      .order('name')
    setProducts(data || [])
    setLoading(false)
  }

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setOrders(data || [])
  }

  async function checkout({ items, deliveryAddress, deliveryNotes }) {
    const { data: { session } } = await supabase.auth.getSession()
    const origin   = window.location.origin
    const logDate  = new Date().toISOString().slice(0, 10)

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          items: items.map(i => ({ product_id: i.product_id, qty: i.qty })),
          delivery_address: deliveryAddress,
          delivery_notes:   deliveryNotes,
          log_date:         logDate,
          success_url:      origin,
          cancel_url:       origin,
        }),
      }
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'checkout failed')
    return json // { url, order_id }
  }

  return { products, orders, loading, checkout, reload: loadOrders }
}

// ── Coach: all orders ─────────────────────────────────────────────────────
export function useAllOrders() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), profiles!orders_user_id_fkey(name, email)')
      .order('created_at', { ascending: false })
      .limit(100)
    setOrders(data || [])
    setLoading(false)
  }

  async function updateStatus(orderId, status) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
  }

  return { orders, loading, updateStatus, reload: load }
}

// ── Recommendation engine ─────────────────────────────────────────────────
export function recommendProducts(products, targets, totals) {
  if (!products.length) return []

  const proteinGap = Math.max(0, (targets.protein || 0) - (totals.protein || 0))
  const carbsGap   = Math.max(0, (targets.carbs   || 0) - (totals.carbs   || 0))
  const kcalGap    = Math.max(0, (targets.kcal    || 0) - (totals.kcal    || 0))

  // No meaningful deficit → no recommendations
  if (proteinGap < 10 && carbsGap < 20 && kcalGap < 200) return []

  return products
    .filter(p => p.available)
    .map(p => {
      const proteinScore = proteinGap > 5  ? Math.min(1, p.protein_per_serving / proteinGap) * 0.55 : 0
      const carbsScore   = carbsGap   > 10 ? Math.min(1, p.carbs_per_serving   / carbsGap)   * 0.25 : 0
      const kcalScore    = kcalGap    > 50 ? Math.min(1, p.kcal_per_serving    / kcalGap)    * 0.20 : 0
      return { ...p, _score: proteinScore + carbsScore + kcalScore }
    })
    .filter(p => p._score > 0.08)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)
}
