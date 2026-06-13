import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const TODAY = () => new Date().toISOString().slice(0, 10)

export function useWaterLog(target = 8) {
  const { user } = useAuth()
  const [glasses, setGlasses] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('water_logs')
      .select('glasses')
      .eq('user_id', user.id)
      .eq('log_date', TODAY())
      .maybeSingle()
      .then(({ data }) => {
        if (data) setGlasses(data.glasses)
        setLoading(false)
      })
  }, [user?.id])

  const set = useCallback(async (n) => {
    if (!user?.id) return
    const val = Math.max(0, Math.min(n, target + 4))
    setGlasses(val)
    await supabase
      .from('water_logs')
      .upsert({ user_id: user.id, log_date: TODAY(), glasses: val, updated_at: new Date().toISOString() },
               { onConflict: 'user_id,log_date' })
  }, [user?.id, target])

  const add = useCallback((delta) => set(glasses + delta), [set, glasses])

  return { glasses, target, add, set, loading }
}
