import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { buildSessions } from '../utils/training'

/**
 * The whole training record, loaded once for the page.
 *
 * Four components used to ask Supabase the same two questions on their own —
 * the dashboard, the calendar, the progression chart and the day log — which
 * meant four round trips for one screen and four chances for them to disagree
 * about what had been logged. They share this instead, and `refresh` is what a
 * newly saved set calls to bring all of them forward together.
 *
 * A cap of 4000 set rows is roughly three years of hard training; past that the
 * oldest sets stop being loaded rather than the page stops rendering.
 */
export function useTrainingHistory(userId) {
  const { user } = useAuth()
  const id = userId ?? user?.id
  const [logs, setLogs] = useState([])
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!id) { setLoading(false); return }
    const [{ data: l }, { data: c }] = await Promise.all([
      supabase
        .from('exercise_logs')
        .select('id, date, exercise_name, weight, reps, sets, set_index, replaces, notes')
        .eq('user_id', id)
        .order('date', { ascending: false })
        .limit(4000),
      supabase
        .from('workout_completions')
        .select('block_label, completed_date')
        .eq('user_id', id)
        .order('completed_date', { ascending: false }),
    ])
    setLogs(l ?? [])
    setCompletions(c ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { setLoading(true); refresh() }, [refresh])

  const sessions = useMemo(() => buildSessions(logs, completions), [logs, completions])

  return { sessions, logs, completions, loading, refresh }
}
