import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('done', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
    setTasks(data ?? [])
    setLoading(false)
  }

  async function addTask({ text, category = 'general', priority = 1, due_date = null, start_time = null, duration_min = null }) {
    const { data } = await supabase
      .from('tasks')
      .insert({ user_id: user.id, text: text.trim(), category, priority, due_date, start_time, duration_min })
      .select()
      .single()
    if (data) setTasks(prev => sortTasks([data, ...prev]))
    return data ?? null
  }

  /* Часът и продължителността се менят и след вписване — задача се премества по
     линията, а не се трие и пише наново. Оптимистично, с връщане назад
     при отказ: блок, който се връща след секунда, казва истината по-добре от
     кръгче, което се върти над цялата линия. */
  async function updateTask(id, patch) {
    const before = tasks
    setTasks(prev => sortTasks(prev.map(t => (t.id === id ? { ...t, ...patch } : t))))
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) { setTasks(before); return { error: error.message } }
    setTasks(prev => sortTasks(prev.map(t => (t.id === id ? data : t))))
    return { data }
  }

  async function toggleTask(id) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const { data } = await supabase
      .from('tasks')
      .update({ done: !task.done, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) setTasks(prev => sortTasks(prev.map(t => t.id === id ? data : t)))
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return { tasks, loading, addTask, updateTask, toggleTask, deleteTask }
}

// Coach-side: fetch + push tasks for a specific client
export function useClientTasks(clientId) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) return
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', clientId)
      .order('done', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => { setTasks(data ?? []); setLoading(false) })
  }, [clientId])

  async function pushTask({ text, due_date = null, priority = 1 }) {
    const { data, error } = await supabase
      .rpc('create_task_for_client', {
        p_client_id: clientId,
        p_text:      text,
        p_due_date:  due_date,
        p_priority:  priority,
      })
    if (!error && data) setTasks(prev => sortTasks([data, ...prev]))
    return { error }
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function toggleTask(id) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const { data } = await supabase
      .from('tasks')
      .update({ done: !task.done, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (data) setTasks(prev => sortTasks(prev.map(t => t.id === id ? data : t)))
  }

  return { tasks, loading, pushTask, deleteTask, toggleTask }
}

function sortTasks(list) {
  const today = new Date().toISOString().slice(0, 10)
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const da = a.due_date ?? '9999'
    const db = b.due_date ?? '9999'
    if (da !== db) return da < db ? -1 : 1
    return b.priority - a.priority
  })
}
