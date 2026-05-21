import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function calcReadiness(log) {
  if (!log) return null
  const scores = []
  if (log.quality)   scores.push(log.quality)
  if (log.energy)    scores.push(log.energy)
  if (log.stress)    scores.push(6 - log.stress)    // invert: low stress = good
  if (log.soreness)  scores.push(6 - log.soreness)  // invert: low soreness = good
  if (log.mood)      scores.push(log.mood)
  if (!scores.length) return null
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length
  return Math.round((avg - 1) / 4 * 100)
}

export function useSleepLogs() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase.from('sleep_logs').select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(90)
      .then(({ data }) => {
        if (data) setLogs(data)
        setLoading(false)
      })
  }, [user?.id])

  const todayLog = logs.find(l => l.date === today) ?? null

  async function logSleep(fields) {
    if (!user) return { error: new Error('not logged in') }
    const { data, error } = await supabase.from('sleep_logs').upsert(
      { user_id: user.id, date: today, ...fields },
      { onConflict: 'user_id,date' }
    ).select().single()
    if (!error && data) setLogs(prev => [data, ...prev.filter(l => l.date !== today)])
    return { error }
  }

  return { logs, todayLog, loading, logSleep, today }
}
