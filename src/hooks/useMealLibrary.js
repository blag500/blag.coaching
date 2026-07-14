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
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setMeals(data)
        setLoading(false)
      })
  }, [user?.id])

  async function uploadPhoto(file) {
    if (!user?.id || !file) return null
    const ext  = file.name.split('.').pop() || 'jpg'
    const path = `meal-library/${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('meal-photos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) { console.error('meal photo upload:', error); return null }
    const { data } = supabase.storage.from('meal-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function addMeal(fields) {
    if (!user?.id) return { error: new Error('not logged in') }
    const { data, error } = await supabase
      .from('meal_library')
      .insert({ user_id: user.id, ...fields })
      .select()
      .single()
    if (error) console.error('meal_library insert:', error)
    if (!error && data) setMeals(prev => [data, ...prev])
    return { error }
  }

  async function deleteMeal(id) {
    setMeals(prev => prev.filter(m => m.id !== id))
    await supabase.from('meal_library').delete().eq('id', id)
  }

  return { meals, loading, addMeal, deleteMeal, uploadPhoto }
}
