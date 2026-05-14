import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useCustomFoods() {
  const { user } = useAuth()
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase
      .from('custom_foods')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setFoods(data || [])
        setLoading(false)
      })
  }, [user?.id])

  async function saveFood({ name, kcal, protein, carbs, fat, serving_grams = 100, is_recipe = false, ingredients = null }) {
    if (!user) return null
    const { data } = await supabase
      .from('custom_foods')
      .insert({
        user_id: user.id,
        name,
        kcal:          Math.round(kcal),
        protein:       Math.round(protein * 10) / 10,
        carbs:         Math.round(carbs   * 10) / 10,
        fat:           Math.round(fat     * 10) / 10,
        serving_grams: parseFloat(serving_grams) || 100,
        is_recipe,
        ingredients:   ingredients ?? null,
      })
      .select()
      .single()
    if (data) setFoods(prev => [data, ...prev])
    return data
  }

  async function deleteFood(id) {
    await supabase.from('custom_foods').delete().eq('id', id)
    setFoods(prev => prev.filter(f => f.id !== id))
  }

  return { foods, loading, saveFood, deleteFood }
}
