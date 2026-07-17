import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function useSupplements(userId = null) {
  const { user } = useAuth()
  const uid = userId ?? user?.id

  const [supplements, setSupplements] = useState([])
  const [taken, setTaken]             = useState({})
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!uid) return
    load()
  }, [uid])

  async function load() {
    const date = todayStr()
    const [suppRes, logRes] = await Promise.all([
      supabase.from('supplements').select('*').eq('user_id', uid).order('sort_order').order('created_at'),
      supabase.from('supplement_logs').select('supplement_id').eq('user_id', uid).eq('date', date),
    ])
    setSupplements(suppRes.data || [])
    const map = {}
    ;(logRes.data || []).forEach(l => { map[l.supplement_id] = true })
    setTaken(map)
    setLoading(false)
  }

  async function toggle(suppId) {
    const date = todayStr()
    if (taken[suppId]) {
      await supabase.from('supplement_logs')
        .delete()
        .eq('user_id', uid)
        .eq('supplement_id', suppId)
        .eq('date', date)
      setTaken(prev => { const n = { ...prev }; delete n[suppId]; return n })
    } else {
      await supabase.from('supplement_logs')
        .upsert({ user_id: uid, supplement_id: suppId, date }, { onConflict: 'user_id,supplement_id,date' })
      setTaken(prev => ({ ...prev, [suppId]: true }))
    }
  }

  async function addSupplement({ name, dose, timing }) {
    const { data, error } = await supabase
      .from('supplements')
      .insert({ user_id: uid, name, dose: dose || null, timing: timing || null })
      .select()
      .single()
    if (!error && data) setSupplements(prev => [...prev, data])
  }

  async function removeSupplement(id) {
    await supabase.from('supplements').delete().eq('id', id)
    setSupplements(prev => prev.filter(s => s.id !== id))
    setTaken(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  return {
    supplements,
    taken,
    loading,
    toggle,
    addSupplement,
    removeSupplement,
    takenCount: Object.keys(taken).length,
    totalCount: supplements.length,
  }
}
