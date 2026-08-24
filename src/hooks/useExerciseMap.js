import { useState, useEffect } from 'react'

/**
 * Per-exercise muscle-group tag, kept per user device.
 *
 * Solves the "the name is not the same next time" problem: someone writes
 * "Bench press" today, "bench-press" next week, "DB bench" the week after —
 * exact-name matching leaves each with a lone data point. Tagging the group
 * once ("this belongs to ГОРНА") lets the group-level stats and the mannequin
 * keep the muscle in view even when the string drifts.
 *
 * Kept in localStorage rather than the profile to avoid a migration for a
 * feature that has to prove itself first. When the map becomes load-bearing
 * — e.g. progressive-overload views group by it — this hook moves to profile
 * and syncs across devices.
 */
const KEY = 'blag_exercise_muscle_map'

export function useExerciseMap() {
  const [map, setMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') }
    catch { return {} }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(map)) }
    catch { /* quota — the map is convenience, not truth */ }
  }, [map])

  return {
    map,
    /** Tag an exercise name with a group id ('upper' | 'pull' | 'lower' | 'extra'). */
    setGroup: (name, group) => setMap(m => ({ ...m, [name]: group })),
    clearGroup: name => setMap(m => {
      const copy = { ...m }
      delete copy[name]
      return copy
    }),
  }
}
