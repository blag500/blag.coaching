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
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
    setTasks(data ?? [])
    setLoading(false)
  }

  async function addTask({ text, category = 'general', priority = 1 }) {
    const { data } = await supabase
      .from('tasks')
      .insert({ user_id: user.id, text: text.trim(), category, priority })
      .select()
      .single()
    if (data) setTasks(prev => [data, ...prev].sort(byPriorityThenDate))
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
    if (data) setTasks(prev => prev.map(t => t.id === id ? data : t))
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return { tasks, loading, addTask, toggleTask, deleteTask }
}

function byPriorityThenDate(a, b) {
  if (b.priority !== a.priority) return b.priority - a.priority
  return new Date(b.created_at) - new Date(a.created_at)
}
