import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function useWeightLog() {
  const { user } = useAuth()
  const [weights, setWeights] = useState([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date')
      .then(({ data }) => { if (data) setWeights(data) })
  }, [user?.id])

  async function addWeight(kg) {
    if (!user) return { error: new Error('not logged in') }
    const today = todayStr()
    const { data, error } = await supabase
      .from('weight_logs')
      .upsert({ user_id: user.id, date: today, kg }, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (data) {
      setWeights(prev => {
        const filtered = prev.filter(e => e.date !== today)
        return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date))
      })
    }
    return { error }
  }

  async function removeWeight(date) {
    if (!user) return
    await supabase.from('weight_logs').delete().eq('user_id', user.id).eq('date', date)
    setWeights(prev => prev.filter(e => e.date !== date))
  }

  const todayEntry = weights.find(e => e.date === todayStr()) ?? null

  const last7 = weights.slice(-7)
  let trend = null
  if (last7.length >= 2) {
    const delta = last7[last7.length - 1].kg - last7[0].kg
    trend = Math.round(delta * 10) / 10
  }

  return { weights, todayEntry, trend, addWeight, removeWeight }
}
