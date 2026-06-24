import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function useBudget() {
  const { user } = useAuth()
  const [config, setConfig] = useState(undefined)   // undefined = loading, null = no config
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)
    const month = monthStart()
    const [{ data: cfg }, { data: txns }] = await Promise.all([
      supabase
        .from('budget_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .maybeSingle(),
      supabase
        .from('budget_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', month)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
    ])
    setConfig(cfg ?? null)
    setTransactions(txns ?? [])
    setLoading(false)
  }

  async function upsertConfig(data) {
    const month = monthStart()
    const { data: row } = await supabase
      .from('budget_config')
      .upsert(
        { user_id: user.id, month, ...data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,month' }
      )
      .select()
      .single()
    if (row) setConfig(row)
  }

  async function addTransaction({ date, description, amount }) {
    const { data } = await supabase
      .from('budget_transactions')
      .insert({ user_id: user.id, date, description: description || null, amount })
      .select()
      .single()
    if (data) {
      setTransactions(prev =>
        [data, ...prev].sort((a, b) =>
          b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
        )
      )
    }
  }

  async function deleteTransaction(id) {
    await supabase.from('budget_transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  return { config, transactions, loading, upsertConfig, addTransaction, deleteTransaction }
}
