import { useMemo } from 'react'
import { HABITS } from '../data/appData'

const KEY_RE = /^blag_habits_(\d{4}-\d{2}-\d{2})$/

export function useHabitHistory() {
  return useMemo(() => {
    const map = new Map()
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        const match = key && key.match(KEY_RE)
        if (!match) continue
        const date = match[1]
        const raw = localStorage.getItem(key)
        const checked = raw ? JSON.parse(raw) : {}
        const completed = HABITS.filter(h => checked[h.id]).length
        map.set(date, { completed, total: HABITS.length })
      }
    } catch {}
    return map
  }, [])
}
