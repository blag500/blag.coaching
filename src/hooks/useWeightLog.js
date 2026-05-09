import { useLocalStorage } from './useLocalStorage'

const KEY = 'blag_weight_v1'
const MAX = 90

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function useWeightLog() {
  const [weights, setWeights] = useLocalStorage(KEY, [])

  function addWeight(kg) {
    const today = todayStr()
    setWeights(prev => {
      const filtered = prev.filter(e => e.date !== today)
      const next = [...filtered, { date: today, kg }].sort((a, b) => a.date.localeCompare(b.date))
      return next.slice(-MAX)
    })
  }

  function removeWeight(date) {
    setWeights(prev => prev.filter(e => e.date !== date))
  }

  const todayEntry = weights.find(e => e.date === todayStr()) ?? null

  const last7 = weights.slice(-7)
  let trend = null
  if (last7.length >= 2) {
    const delta = last7[last7.length - 1].kg - last7[0].kg
    trend = Math.round(delta * 10) / 10
  }

  return { weights, todayEntry, trend, addWeight, removeWeight }
}
