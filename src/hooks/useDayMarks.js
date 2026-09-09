import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Какво е станало в дните наоколо.
 *
 * Календарът дотук знаеше само кой ден е кой — всичките изглеждаха еднакво и
 * нищо в него не беше твое. Ден, в който си ял и си тренирал, и ден, в който
 * не си отворил приложението, стояха с едно и също лице.
 *
 * Тук се вадят точките: кои дни носят нещо и кои са стигнали целта. Малко е,
 * но е разликата между линийка и дневник.
 *
 * Прозорецът е месецът на избраната дата и по един от двете страни. Дъгата
 * показва пет дни настрани, календарчето — цял месец, а прелистването на
 * месец е и без това новото зареждане.
 */

function pad(n) { return String(n).padStart(2, '0') }
function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

/** Първият ден на месеца преди този и последният на месеца след него. */
function window3(around) {
  const d = new Date(around + 'T12:00:00')
  const from = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  const to   = new Date(d.getFullYear(), d.getMonth() + 2, 0)
  return [iso(from), iso(to)]
}

/**
 * @param {'food'|'training'} kind    какво се брои
 * @param {string} around             дата, около която се гледа (ISO)
 * @param {object} opts               { target } — дневна цел за храна, ако има
 * @returns {Object<string, 1|2>}     ден → 1 има нещо, 2 стигната цел
 */
export function useDayMarks(kind, around, { target = 0, userId = null } = {}) {
  const { user } = useAuth()
  const uid = userId || user?.id
  const [marks, setMarks] = useState({})
  // Ключът е месецът, не денят: иначе всяко влачене на дъгата през полунощ
  // би пускало нова заявка.
  const monthKey = around ? around.slice(0, 7) : ''

  useEffect(() => {
    if (!uid || !monthKey) return
    let alive = true
    const [from, to] = window3(around)

    async function load() {
      const next = {}

      if (kind === 'food') {
        const { data } = await supabase
          .from('food_logs').select('date, kcal')
          .eq('user_id', uid).gte('date', from).lte('date', to)
        const sum = {}
        for (const r of data || []) sum[r.date] = (sum[r.date] || 0) + (r.kcal || 0)
        for (const [d, kcal] of Object.entries(sum)) {
          // Същият праг като наградата: осемдесет на сто е „стигнал си", а не
          // „почти". Два различни прага за едно и също нещо на два екрана са
          // по-лоши от липсващ знак.
          next[d] = target > 0 && kcal / target >= 0.8 ? 2 : 1
        }
      } else {
        const [ex, wo] = await Promise.all([
          supabase.from('exercise_logs').select('completed_date')
            .eq('user_id', uid).gte('completed_date', from).lte('completed_date', to),
          supabase.from('workout_completions').select('completed_date')
            .eq('user_id', uid).gte('completed_date', from).lte('completed_date', to),
        ])
        for (const r of [...(ex.data || []), ...(wo.data || [])]) {
          if (r.completed_date) next[r.completed_date] = 2
        }
      }

      if (alive) setMarks(next)
    }

    load()
    return () => { alive = false }
    // `around` се мени всеки ден, но прозорецът зависи само от месеца му.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, uid, monthKey, target])

  return marks
}
