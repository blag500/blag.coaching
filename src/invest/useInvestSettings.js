import { useEffect, useState } from 'react'
import { DEFAULTS } from './projection'

/* Настройките на прогнозата и плана — едни и същи допускания за двата таба.
 *
 * Ръстът, инфлацията и таксите са едни, каквото и да питаш: „колко ще имам"
 * и „колко да внасям" с различен ръст биха дали два отговора, които не се
 * връзват. Затова стоят на едно място.
 *
 * В телефона (localStorage): лично удобство, не данни. Изгубени — връщат се
 * подразбиращите се и нищо не се чупи. Ключът е старият, за да не се изгубят
 * вече нагласените. */

const KEY = 'blag_invest_projection_v1'

export const PLAN_DEFAULTS = {
  target: 100000,
  targetYear: new Date().getFullYear() + 20,
  targetReal: false,
  planFrequency: 'week',
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return { ...DEFAULTS, ...PLAN_DEFAULTS, ...(raw ? JSON.parse(raw) : {}) }
  } catch {
    return { ...DEFAULTS, ...PLAN_DEFAULTS }
  }
}

export function useInvestSettings() {
  const [p, setP] = useState(load)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* без памет */ }
  }, [p])
  return [p, setP]
}
