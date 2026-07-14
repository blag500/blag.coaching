import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useMealLibrary() {
  const { user } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('meal_library')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setMeals(data)
        setLoading(false)
      })
  }, [user?.id])

  async function addMeal(fields) {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('meal_library')
      .insert({ user_id: user.id, ...fields })
      .select()
      .single()
    if (!error && data) setMeals(prev => [data, ...prev])
    return { error }
  }

  async function deleteMeal(id) {
    setMeals(prev => prev.filter(m => m.id !== id))
    await supabase.from('meal_library').delete().eq('id', id)
  }

  return { meals, loading, addMeal, deleteMeal }
}
