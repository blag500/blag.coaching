import { useState, useEffect } from 'react'

const KEY = 'blag_food_log_v1'

export function useFoodLog() {
  const [log, setLog] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(log))
    } catch {
      // ignore
    }
  }, [log])

  function addEntry(food, grams) {
    const ratio = grams / 100
    setLog(prev => [...prev, {
      id: crypto.randomUUID(),
      name: food.name,
      grams,
      kcal:    Math.round(food.per100g.kcal    * ratio),
      protein: Math.round(food.per100g.protein * ratio * 10) / 10,
      carbs:   Math.round(food.per100g.carbs   * ratio * 10) / 10,
      fat:     Math.round(food.per100g.fat     * ratio * 10) / 10,
      addedAt: Date.now(),
    }])
  }

  function removeEntry(id) {
    setLog(prev => prev.filter(e => e.id !== id))
  }

  function clearLog() {
    setLog([])
  }

  const totals = log.reduce((acc, e) => ({
    kcal:    Math.round(acc.kcal    + e.kcal),
    protein: Math.round((acc.protein + e.protein) * 10) / 10,
    carbs:   Math.round((acc.carbs   + e.carbs)   * 10) / 10,
    fat:     Math.round((acc.fat     + e.fat)      * 10) / 10,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  return { log, totals, addEntry, removeEntry, clearLog }
}
