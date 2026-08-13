import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Photos keyed by exercise name, shared across everyone.
 *
 * One query for the whole page rather than one per exercise: a block is ten
 * lifts, and ten round trips on a phone is a stutter. Keyed by name so a
 * machine photographed once is recognised in every block and in every client's
 * programme that calls it the same thing.
 */
export function useExercisePhotos() {
  const { user } = useAuth()
  const [byName, setByName] = useState({})

  const load = useCallback(() => {
    supabase
      .from('exercise_photos')
      .select('exercise_name, photo_url')
      .then(({ data }) => {
        const m = {}
        for (const r of data ?? []) m[r.exercise_name] = r.photo_url
        setByName(m)
      })
  }, [])

  useEffect(() => { load() }, [load])

  /** Shrunk before upload: a phone camera frame is several megabytes, and the
   *  card it ends up in is 300 pixels wide. */
  async function resize(file, maxDim = 900, quality = 0.82) {
    const bitmap = await createImageBitmap(file)
    const scale  = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
  }

  async function upload(exerciseName, file) {
    if (!user?.id || !file) return null
    const blob = await resize(file)
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`

    const { error: upErr } = await supabase.storage
      .from('exercise-photos')
      .upload(path, blob, { contentType: 'image/jpeg' })
    if (upErr) return null

    const { data: { publicUrl } } = supabase.storage
      .from('exercise-photos').getPublicUrl(path)

    // Upsert, so re-photographing a lift replaces the picture rather than
    // failing on the primary key.
    const { error } = await supabase.from('exercise_photos').upsert(
      { exercise_name: exerciseName, photo_url: publicUrl, added_by: user.id },
      { onConflict: 'exercise_name' },
    )
    if (error) return null

    setByName(prev => ({ ...prev, [exerciseName]: publicUrl }))
    return publicUrl
  }

  return { byName, upload, refresh: load }
}
