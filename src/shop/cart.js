/* Количката живее в браузъра: без акаунт, без сървър, докато не се плати.
   Ред = продукт + вкус; един и същ протеин в два вкуса са два реда. */

const KEY = 'zs.cart'

export function readCart() {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(rows) ? rows.filter((r) => r && r.id && r.qty > 0) : []
  } catch {
    return []
  }
}

export function writeCart(rows) {
  try { localStorage.setItem(KEY, JSON.stringify(rows)) } catch { /* частен прозорец */ }
}

export const lineKey = (r) => `${r.id}|${r.flavor ?? ''}`

export function addLine(rows, id, flavor, qty = 1) {
  const k = lineKey({ id, flavor })
  const hit = rows.find((r) => lineKey(r) === k)
  if (hit) return rows.map((r) => (lineKey(r) === k ? { ...r, qty: Math.min(50, r.qty + qty) } : r))
  return [...rows, { id, flavor: flavor ?? null, qty }]
}

export function setQty(rows, key, qty) {
  return qty <= 0 ? rows.filter((r) => lineKey(r) !== key) : rows.map((r) => (lineKey(r) === key ? { ...r, qty: Math.min(50, qty) } : r))
}

export const euro = (cents) => (cents / 100).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
