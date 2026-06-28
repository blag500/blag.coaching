import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function monthStart(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

export function nextMonthStart(monthStr) {
  const d = new Date(monthStr + 'T12:00')
  d.setMonth(d.getMonth() + 1)
  return monthStart(d)
}

export function prevMonthStart(monthStr) {
  const d = new Date(monthStr + 'T12:00')
  d.setMonth(d.getMonth() - 1)
  return monthStart(d)
}

export function useBudget(month) {
  const { user } = useAuth()
  const [config, setConfig] = useState(undefined)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !month) return
    load()
  }, [user?.id, month])

  async function load() {
    setLoading(true)
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
        .lt('date', nextMonthStart(month))
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
    ])
    setConfig(cfg ?? null)
    setTransactions(txns ?? [])
    setLoading(false)
  }

  async function upsertConfig(data) {
    // Always merge with the current config so partial updates don't reset other fields
    const merged = {
      budget_amount:    config?.budget_amount    ?? 0,
      buffer_pct:       config?.buffer_pct       ?? 0.1,
      savings_amount:   config?.savings_amount   ?? 0,
      planned_expenses: config?.planned_expenses ?? [],
      ...data,
    }
    const { data: row } = await supabase
      .from('budget_config')
      .upsert(
        { user_id: user.id, month, ...merged, updated_at: new Date().toISOString() },
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
