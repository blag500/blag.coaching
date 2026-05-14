import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined) // undefined = still loading
  const [profile, setProfile]   = useState(null)
  const [authError, setAuthError] = useState(null)

  // Load profile from Supabase
  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error && data) {
      if (data.role === 'client') {
        // Use security-definer RPC so clients can look up the coach ID
        // without needing SELECT access to other profile rows.
        const { data: coachId } = await supabase.rpc('get_coach_id')
        setProfile(coachId ? { ...data, coach_id: coachId } : data)
      } else {
        setProfile(data)
      }
    }
  }

  useEffect(() => {
    // Restore existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) fetchProfile(s.user.id)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user) fetchProfile(s.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setAuthError(error.message); return false }
    return true
  }

  async function signUp(email, password, name) {
    setAuthError(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setAuthError(error.message); return false }
    // Set display name immediately after signup
    if (data.user) {
      await supabase.from('profiles').update({ name }).eq('id', data.user.id)
    }
    return true
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    if (!session?.user) return
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single()
    if (!error && data) setProfile(data)
    return { error }
  }

  // Coach: update any client's profile
  async function updateClientProfile(clientId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', clientId)
      .select()
      .single()
    return { data, error }
  }

  // Coach: fetch last 7 days of food, habits, weight for a client
  async function fetchClientFullStats(clientId) {
    const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    const [foodRes, habitRes, weightRes] = await Promise.all([
      supabase.from('food_logs').select('date, kcal').eq('user_id', clientId).gte('date', sevenDaysAgo).order('date'),
      supabase.from('habit_completions').select('date, completed').eq('user_id', clientId).gte('date', sevenDaysAgo),
      supabase.from('weight_logs').select('date, kg').eq('user_id', clientId).order('date').limit(30),
    ])
    const foodByDay = {}
    ;(foodRes.data || []).forEach(e => { foodByDay[e.date] = (foodByDay[e.date] || 0) + e.kcal })
    const habitsByDay = {}
    ;(habitRes.data || []).forEach(h => {
      if (!habitsByDay[h.date]) habitsByDay[h.date] = { completed: 0 }
      if (h.completed) habitsByDay[h.date].completed++
    })
    return { foodByDay, habitsByDay, weights: weightRes.data || [] }
  }

  // Coach: fetch today's stats for a specific client
  async function fetchClientStats(clientId) {
    const today = new Date().toISOString().slice(0, 10)
    const [foodRes, habitRes, weightRes] = await Promise.all([
      supabase.from('food_logs').select('kcal').eq('user_id', clientId).eq('date', today),
      supabase.from('habit_completions').select('completed').eq('user_id', clientId).eq('date', today),
      supabase.from('weight_logs').select('date, kg').eq('user_id', clientId).order('date', { ascending: false }).limit(1),
    ])
    return {
      kcalToday:       (foodRes.data  || []).reduce((s, e) => s + e.kcal, 0),
      habitsCompleted: (habitRes.data || []).filter(h => h.completed).length,
      latestWeight:    weightRes.data?.[0] ?? null,
    }
  }

  // Coach: fetch all clients
  async function fetchClients() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('name')
    return { data, error }
  }

  // Exercise logs
  async function fetchExerciseLogs(clientId, dateStr) {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', clientId)
      .eq('date', dateStr)
      .order('created_at')
    return { data, error }
  }

  async function addExerciseLog(exerciseName, weight, reps, sets, notes) {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('exercise_logs')
      .insert({
        user_id: session?.user.id,
        date: today,
        exercise_name: exerciseName,
        weight: weight ? parseFloat(weight) : null,
        reps: reps ? parseInt(reps) : null,
        sets: sets ? parseInt(sets) : null,
        notes: notes || null,
      })
      .select()
      .single()
    return { data, error }
  }

  async function removeExerciseLog(logId) {
    const { error } = await supabase
      .from('exercise_logs')
      .delete()
      .eq('id', logId)
    return { error }
  }

  // Messaging
  async function fetchMessages(otherUserId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(from_user_id.eq.${session?.user.id},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${session?.user.id})`)
      .order('created_at')
    return { data, error }
  }

  async function sendMessage(toUserId, content) {
    if (!session?.user) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('messages')
      .insert({
        from_user_id: session.user.id,
        to_user_id: toUserId,
        content,
      })
      .select()
      .single()
    return { data, error }
  }

  async function markMessagesAsRead(otherUserId) {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('to_user_id', session?.user.id)
      .eq('from_user_id', otherUserId)
  }

  const loading = session === undefined

  return (
    <AuthContext.Provider value={{
      session,
      user:    session?.user ?? null,
      profile,
      loading,
      authError,
      signIn,
      signUp,
      signOut,
      updateProfile,
      updateClientProfile,
      fetchClients,
      fetchClientStats,
      fetchClientFullStats,
      fetchExerciseLogs,
      addExerciseLog,
      removeExerciseLog,
      fetchMessages,
      sendMessage,
      markMessagesAsRead,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
