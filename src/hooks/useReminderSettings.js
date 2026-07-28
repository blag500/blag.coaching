import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DEFAULTS = {
  email_enabled:     false,
  weight_email:      false,
  habits_email:      false,
  supplements_email: false,
  water_email:       false,
  food_email:        false,
  training_email:    false,
}

// Pass targetUserId to manage another user's settings (coach use case)
export function useReminderSettings(targetUserId = null) {
  const { user } = useAuth()
  const uid = targetUserId || user?.id
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (!uid) return
    supabase
      .from('reminder_settings')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings({ ...DEFAULTS, ...data })
        setLoading(false)
      })
  }, [uid])

  const save = useCallback(async (next) => {
    if (!uid) return
    setSettings(next)
    setSaving(true)
    await supabase
      .from('reminder_settings')
      .upsert(
        { user_id: uid, ...next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    setSaving(false)
  }, [uid])

  const toggle = useCallback((key) => {
    save({ ...settings, [key]: !settings[key] })
  }, [save, settings])

  // Master switch — turns all email reminders on or off at once
  const toggleAll = useCallback((enabled) => {
    save({
      ...settings,
      email_enabled:     enabled,
      weight_email:      enabled,
      habits_email:      enabled,
      supplements_email: enabled,
      water_email:       enabled,
      food_email:        enabled,
      training_email:    enabled,
    })
  }, [save, settings])

  return { settings, toggle, toggleAll, loading, saving }
}
