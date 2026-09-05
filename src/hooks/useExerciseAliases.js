import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* Кое име е същото като кое.
 *
 * Прогресията групира по написаното, затова „Лежанка" и „Лежанка с щанга" са
 * две криви за едно движение. Тук стои казаното от човека, а вписванията
 * остават непокътнати: дневникът пази това, което е било написано в деня, а
 * обединяването е поглед върху него и се маха с един ред.
 */

const key = s => String(s || '').trim().toLowerCase()

export function useExerciseAliases() {
  const { user } = useAuth()
  const uid = user?.id ?? null
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!uid) return
    const { data } = await supabase
      .from('exercise_aliases')
      .select('id, alias, canonical')
      .eq('user_id', uid)
    setRows(data ?? [])
    setLoading(false)
  }, [uid])

  useEffect(() => { load() }, [load])

  /**
   * Името, в което се влива дадено име — до дъно.
   *
   * Веригите са възможни: А сочи към Б, после Б към В. Обхождат се, докато
   * спрат, с таван на стъпките — псевдоним, сочещ обратно към себе си през
   * трети, би въртял вечно, а един счупен ред не бива да заковава екрана.
   */
  const resolve = useMemo(() => {
    const map = new Map(rows.map(r => [key(r.alias), r.canonical]))
    return name => {
      let cur = name
      for (let i = 0; i < 8; i++) {
        const next = map.get(key(cur))
        if (!next || key(next) === key(cur)) break
        cur = next
      }
      return cur
    }
  }, [rows])

  /** Кои имена се вливат в това. */
  const mergedInto = useCallback(
    canonical => rows.filter(r => key(resolve(r.alias)) === key(canonical)).map(r => r.alias),
    [rows, resolve],
  )

  /** Обединява `alias` в `canonical`. */
  const merge = useCallback(async (alias, canonical) => {
    if (!uid) return { error: 'no user' }
    if (key(alias) === key(canonical)) return { error: 'same' }
    const { error } = await supabase
      .from('exercise_aliases')
      .insert({ user_id: uid, alias, canonical })
    if (error) return { error: error.message }
    await load()
    return {}
  }, [uid, load])

  const unmerge = useCallback(async (alias) => {
    if (!uid) return { error: 'no user' }
    const row = rows.find(r => key(r.alias) === key(alias))
    if (!row) return {}
    const { error } = await supabase.from('exercise_aliases').delete().eq('id', row.id)
    if (error) return { error: error.message }
    await load()
    return {}
  }, [uid, rows, load])

  return { rows, loading, resolve, mergedInto, merge, unmerge, refresh: load }
}
