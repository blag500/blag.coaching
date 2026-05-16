import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function useFoodLog() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [log, setLog] = useState([])

  const isToday = selectedDate === todayStr()

  const fetchLog = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', selectedDate)
      .order('added_at')
    if (data) setLog(prev => {
      const temps = prev.filter(e => String(e.id).startsWith('temp-'))
      return temps.length ? [...data, ...temps] : data
    })
  }, [user?.id, selectedDate])

  useEffect(() => { fetchLog() }, [fetchLog])

  async function addEntry(food, grams) {
    if (!user) return
    const ratio = grams / 100
    const entry = {
      user_id: user.id,
      date:    selectedDate,
      name:    food.name,
      grams,
      kcal:    Math.round(food.per100g.kcal    * ratio),
      protein: Math.round(food.per100g.protein * ratio * 10) / 10,
      carbs:   Math.round(food.per100g.carbs   * ratio * 10) / 10,
      fat:     Math.round(food.per100g.fat     * ratio * 10) / 10,
    }
    const tempId = `temp-${Date.now()}`
    setLog(prev => [...prev, { ...entry, id: tempId }])
    const { data, error } = await supabase.from('food_logs').insert(entry).select().single()
    if (data) {
      setLog(prev => prev.map(e => e.id === tempId ? data : e))
    } else {
      console.error('food_logs insert failed:', error)
      setLog(prev => prev.filter(e => e.id !== tempId))
    }
  }

  async function addRawEntry({ name, grams, kcal, protein, carbs, fat }) {
    if (!user) return
    const entry = {
      user_id: user.id,
      date:    selectedDate,
      name,
      grams:   grams   || 0,
      kcal:    Math.round(kcal),
      protein: Math.round(protein * 10) / 10,
      carbs:   Math.round(carbs   * 10) / 10,
      fat:     Math.round(fat     * 10) / 10,
    }
    const tempId = `temp-${Date.now()}`
    setLog(prev => [...prev, { ...entry, id: tempId }])
    const { data, error } = await supabase.from('food_logs').insert(entry).select().single()
    if (data) {
      setLog(prev => prev.map(e => e.id === tempId ? data : e))
    } else {
      console.error('food_logs raw insert failed:', error)
      setLog(prev => prev.filter(e => e.id !== tempId))
    }
  }

  async function updateEntry(id, updates) {
    setLog(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    const { data, error } = await supabase
      .from('food_logs')
      .update(updates)
      .eq('id', id)
      .select()
    if (error || !data?.length) {
      console.error('food_logs update failed:', error)
      fetchLog()
    }
  }

  async function removeEntry(id) {
    setLog(prev => prev.filter(e => e.id !== id))
    await supabase.from('food_logs').delete().eq('id', id)
  }

  async function clearLog() {
    if (!user) return
    setLog([])
    await supabase.from('food_logs').delete().eq('user_id', user.id).eq('date', selectedDate)
  }

  const totals = log.reduce((acc, e) => ({
    kcal:    Math.round(acc.kcal    + (Number(e.kcal)    || 0)),
    protein: Math.round((acc.protein + (Number(e.protein) || 0)) * 10) / 10,
    carbs:   Math.round((acc.carbs   + (Number(e.carbs)   || 0)) * 10) / 10,
    fat:     Math.round((acc.fat     + (Number(e.fat)     || 0)) * 10) / 10,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  return {
    log, totals, selectedDate, setSelectedDate, isToday,
    addEntry, addRawEntry, updateEntry, removeEntry, clearLog,
    refresh: fetchLog,
  }
}
