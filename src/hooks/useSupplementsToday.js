import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useSupplementsToday() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [supplements, setSupplements] = useState([])
  const [takenIds, setTakenIds]       = useState(new Set())
  const [loading, setLoading]         = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const [supsRes, logsRes] = await Promise.all([
      supabase.from('supplements').select('*')
        .eq('user_id', user.id).order('sort_order').order('created_at'),
      supabase.from('supplement_logs').select('supplement_id')
        .eq('user_id', user.id).eq('date', today),
    ])
    if (supsRes.data) setSupplements(supsRes.data)
    if (logsRes.data) setTakenIds(new Set(logsRes.data.map(l => l.supplement_id)))
    setLoading(false)
  }, [user?.id, today])

  useEffect(() => { load() }, [load])

  async function toggle(supplementId) {
    if (!user) return
    if (takenIds.has(supplementId)) {
      await supabase.from('supplement_logs').delete()
        .eq('user_id', user.id).eq('supplement_id', supplementId).eq('date', today)
      setTakenIds(prev => { const s = new Set(prev); s.delete(supplementId); return s })
    } else {
      await supabase.from('supplement_logs').upsert(
        { user_id: user.id, supplement_id: supplementId, date: today },
        { onConflict: 'user_id,supplement_id,date' }
      )
      setTakenIds(prev => new Set([...prev, supplementId]))
    }
  }

  async function addSupplement({ name, dose, reminders }) {
    if (!user) return { error: new Error('not logged in') }
    // Map reminders array to timing string for storage
    const timing = reminders && reminders.length > 0
      ? reminders.map(r => ({ morning: 'Сутринта', afternoon: 'Обед', evening: 'Вечерта' }[r] || r)).join(', ')
      : null
    const { data, error } = await supabase.from('supplements').insert({
      user_id: user.id,
      name:    name.trim(),
      dose:    dose.trim() || null,
      timing,
    }).select().single()
    if (!error && data) setSupplements(prev => [...prev, data])
    return { error }
  }

  async function removeSupplement(id) {
    await supabase.from('supplements').delete().eq('id', id)
    setSupplements(prev => prev.filter(s => s.id !== id))
    setTakenIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  return { supplements, takenIds, loading, toggle, addSupplement, removeSupplement }
}
