import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function useFoodLog() {
  const { user } = useAuth()
  const [log, setLog] = useState([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr())
      .order('added_at')
      .then(({ data }) => { if (data) setLog(data) })
  }, [user?.id])

  async function addEntry(food, grams) {
    if (!user) return
    const ratio = grams / 100
    const entry = {
      user_id: user.id,
      date:    todayStr(),
      name:    food.name,
      grams,
      kcal:    Math.round(food.per100g.kcal    * ratio),
      protein: Math.round(food.per100g.protein * ratio * 10) / 10,
      carbs:   Math.round(food.per100g.carbs   * ratio * 10) / 10,
      fat:     Math.round(food.per100g.fat     * ratio * 10) / 10,
    }
    const { data } = await supabase.from('food_logs').insert(entry).select().single()
    if (data) setLog(prev => [...prev, data])
  }

  async function removeEntry(id) {
    await supabase.from('food_logs').delete().eq('id', id)
    setLog(prev => prev.filter(e => e.id !== id))
  }

  async function clearLog() {
    if (!user) return
    await supabase.from('food_logs').delete().eq('user_id', user.id).eq('date', todayStr())
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
