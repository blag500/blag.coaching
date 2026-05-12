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
    if (!error && data) setProfile(data)
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

  // Coach: fetch all clients
  async function fetchClients() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('name')
    return { data, error }
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
