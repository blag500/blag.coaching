import { useState, useCallback } from 'react'

const STORAGE_KEY = 'blag_cart'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

// cart item: { product_id, qty, name, price_stotinki, kcal, protein, carbs, fat }
export function useCart() {
  const [items, setItems] = useState(load)

  const save = useCallback((next) => {
    setItems(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  function addItem(product) {
    setItems(prev => {
      const exists = prev.find(i => i.product_id === product.id)
      const next = exists
        ? prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { product_id: product.id, qty: 1, name: product.name, price_stotinki: product.price_stotinki, kcal: product.kcal_per_serving, protein: product.protein_per_serving, carbs: product.carbs_per_serving, fat: product.fat_per_serving }]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function removeItem(productId) {
    setItems(prev => {
      const next = prev.filter(i => i.product_id !== productId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function updateQty(productId, qty) {
    if (qty < 1) { removeItem(productId); return }
    setItems(prev => {
      const next = prev.map(i => i.product_id === productId ? { ...i, qty } : i)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function clearCart() { save([]) }

  const totalStotinki = items.reduce((s, i) => s + i.price_stotinki * i.qty, 0)
  const itemCount     = items.reduce((s, i) => s + i.qty, 0)

  return { items, addItem, removeItem, updateQty, clearCart, totalStotinki, itemCount }
}
