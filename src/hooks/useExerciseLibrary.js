import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* Заготовките за упражнения.
 *
 * Списъкът, от който се избира заместител, вместо да се пише име на ръка.
 * Един ред е едно упражнение с един мускул; по мускула се подреждат и по него
 * ги намира дневникът, когато заместваш.
 *
 * Живее в базата, а не в localStorage като днешния заместител: списък, който
 * човек е градил месеци, не бива да изчезне със сменен телефон.
 */
export function useExerciseLibrary() {
  const { user } = useAuth()
  const uid = user?.id ?? null

  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const load = useCallback(async () => {
    if (!uid) return
    const { data, error: err } = await supabase
      .from('exercise_library')
      .select('id, name, folder, scheme, muscle, created_at')
      .eq('user_id', uid)
      .order('name', { ascending: true })
    if (err) { setError(err.message); setLoading(false); return }
    setItems(data ?? [])
    setError(null)
    setLoading(false)
  }, [uid])

  useEffect(() => { load() }, [load])

  const add = useCallback(async ({ name, scheme, muscle }) => {
    if (!uid) return { error: 'no user' }
    const clean = String(name || '').trim()
    if (!clean) return { error: 'empty' }
    const { data, error: err } = await supabase
      .from('exercise_library')
      .insert({
        user_id: uid,
        name: clean,
        scheme: (scheme || '').trim() || null,
        muscle: muscle || null,
      })
      .select()
      .single()
    /* Дубликатът го спира уникалният индекс, не проверка тук: проверка преди
       вписване има прозорец между двете, а индексът няма. За човека това не е
       грешка — упражнението вече го има в списъка. */
    if (err) return { error: err.code === '23505' ? 'duplicate' : err.message }
    setItems(prev => [...prev, data])
    return { data }
  }, [uid])

  const remove = useCallback(async (id) => {
    const before = items
    setItems(prev => prev.filter(i => i.id !== id))
    const { error: err } = await supabase.from('exercise_library').delete().eq('id', id)
    if (err) { setItems(before); return { error: err.message } }
    return {}
  }, [items])

  const update = useCallback(async (id, patch) => {
    const { data, error: err } = await supabase
      .from('exercise_library')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (err) return { error: err.message }
    setItems(prev => prev.map(i => (i.id === id ? data : i)))
    return { data }
  }, [])

  return { items, loading, error, add, remove, update, refresh: load }
}
