import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function dateOffsetStr(offset) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

function computeStreak(historyLogs, supplements) {
  if (supplements.length === 0) return 0
  const suppIds = supplements.map(s => s.id)

  // Group logs by date → Set of supplement IDs taken
  const byDate = {}
  historyLogs.forEach(l => {
    if (!byDate[l.date]) byDate[l.date] = new Set()
    byDate[l.date].add(l.supplement_id)
  })

  function isComplete(ds) {
    const taken = byDate[ds]
    if (!taken) return false
    return suppIds.every(id => taken.has(id))
  }

  const today = todayStr()
  let streak = 0
  // If today isn't finished yet, allow streak to start from yesterday
  const startOffset = isComplete(today) ? 0 : 1

  for (let i = startOffset; i < 60; i++) {
    if (isComplete(dateOffsetStr(i))) streak++
    else break
  }
  return streak
}

export function useSupplements(userId = null) {
  const { user } = useAuth()
  const uid = userId ?? user?.id

  const [supplements, setSupplements] = useState([])
  const [taken, setTaken]             = useState({})
  const [historyLogs, setHistoryLogs] = useState([])
  const [loading, setLoading]         = useState(true)

  const load = useCallback(async () => {
    if (!uid) return
    const date    = todayStr()
    const since   = dateOffsetStr(59)
    const [suppRes, logRes, histRes] = await Promise.all([
      supabase.from('supplements').select('*').eq('user_id', uid).order('sort_order').order('created_at'),
      supabase.from('supplement_logs').select('supplement_id').eq('user_id', uid).eq('date', date),
      supabase.from('supplement_logs').select('supplement_id, date').eq('user_id', uid).gte('date', since),
    ])
    setSupplements(suppRes.data || [])
    const map = {}
    ;(logRes.data || []).forEach(l => { map[l.supplement_id] = true })
    setTaken(map)
    setHistoryLogs(histRes.data || [])
    setLoading(false)
  }, [uid])

  useEffect(() => {
    if (!uid) return
    load()
  }, [uid, load])

  async function toggle(suppId) {
    const date = todayStr()
    if (taken[suppId]) {
      await supabase.from('supplement_logs')
        .delete()
        .eq('user_id', uid)
        .eq('supplement_id', suppId)
        .eq('date', date)
      setTaken(prev => { const n = { ...prev }; delete n[suppId]; return n })
      setHistoryLogs(prev => prev.filter(l => !(l.supplement_id === suppId && l.date === date)))
    } else {
      await supabase.from('supplement_logs')
        .upsert({ user_id: uid, supplement_id: suppId, date }, { onConflict: 'user_id,supplement_id,date' })
      setTaken(prev => ({ ...prev, [suppId]: true }))
      setHistoryLogs(prev => [...prev, { supplement_id: suppId, date }])
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

  const takenCount = Object.keys(taken).length
  const totalCount = supplements.length
  const streak     = computeStreak(historyLogs, supplements)

  // Per-supplement streak (consecutive days each individual supplement was taken)
  function getSupplementStreak(suppId) {
    const today = todayStr()
    const takenOnDay = (ds) => historyLogs.some(l => l.supplement_id === suppId && l.date === ds)
    const startOffset = takenOnDay(today) ? 0 : 1
    let s = 0
    for (let i = startOffset; i < 60; i++) {
      if (takenOnDay(dateOffsetStr(i))) s++
      else break
    }
    return s
  }

  return {
    supplements,
    taken,
    loading,
    toggle,
    addSupplement,
    removeSupplement,
    takenCount,
    totalCount,
    streak,
    getSupplementStreak,
  }
}
