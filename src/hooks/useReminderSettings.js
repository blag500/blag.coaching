import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DEFAULTS = {
  weight_email:      true,
  habits_email:      true,
  supplements_email: true,
  water_email:       true,
  food_email:        true,
  training_email:    true,
}

export function useReminderSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('reminder_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings({ ...DEFAULTS, ...data })
        setLoading(false)
      })
  }, [user?.id])

  const toggle = useCallback(async (key) => {
    if (!user?.id) return
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    setSaving(true)
    await supabase
      .from('reminder_settings')
      .upsert(
        { user_id: user.id, ...next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    setSaving(false)
  }, [user?.id, settings])

  return { settings, toggle, loading, saving }
}
