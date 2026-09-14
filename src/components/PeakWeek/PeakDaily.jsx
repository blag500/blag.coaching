import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import styles from './PeakTracker.module.css'

/**
 * Дневната таблица: теглото хранене по хранене.
 *
 * Седмичната таблица сравнява дни. Тази сравнява часове вътре в деня — и е
 * другият инструмент от метода, който тръгва три-четири дни преди сцената.
 * Смисълът ѝ е в три неща наведнъж: кога през деня се появява най-добрият вид,
 * колко вдига всяко хранене и колко пада теглото за нощта. Нито едно от трите
 * не се вижда от едно число на ден.
 *
 * Редовете са храненията, колоните са дните — обърнато спрямо седмичната
 * таблица, и то нарочно: тук дните са четири, а редовете осем, и окото сравнява
 * надолу по един ден или напряко по едно хранене.
 *
 * Числата лягат в същата таблица, в която влизат и мереннията от „намери си
 * вида" (`peak_week_logs`): едно мерене е едно мерене, независимо дали е
 * записано оттук или оттам. Новото е само, че вече знае към кое хранене е.
 */

const SLOTS = ['fasted', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'bed']

/* Четири дни назад от сцената. Източникът казва три-четири; четири дава един
   ден повече, а празната колона не пречи на никого. */
const DAYS_SHOWN = 4

const kgOf = v => {
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 400 ? n : null
}

export default function PeakDaily({ week, plan }) {
  const { user } = useAuth()
  const { t } = useSettings()
  const [cells, setCells] = useState({})     // { `${date}|${slot}`: { id, kg } }
  const [draft, setDraft] = useState({})     // каквото се пише в момента
  const inflight = useRef({})
  const pending  = useRef({})
  const timers   = useRef({})

  /* Записът чете от пейка, не от затварянето.
     Забавеният запис държи състоянието такова, каквото е било в мига на
     насрочването — а дотогава е написана следващата клетка. Видя се веднага:
     теглото на гладно се записваше, а това преди лягане, написано секунда
     по-късно, не заминаваше никъде. Същият капан, който вече е документиран в
     дневника на тренировката. */
  const draftRef = useRef(draft)
  const cellsRef = useRef(cells)
  useEffect(() => { draftRef.current = draft }, [draft])
  useEffect(() => { cellsRef.current = cells }, [cells])

  useEffect(() => {
    if (!week?.id) return
    let alive = true
    supabase
      .from('peak_week_logs')
      .select('id, date, slot, kg')
      .eq('peak_week_id', week.id)
      .not('slot', 'is', null)
      .then(({ data }) => {
        if (!alive) return
        const m = {}
        for (const r of data ?? []) m[`${r.date}|${r.slot}`] = { id: r.id, kg: r.kg }
        setCells(m)
      })
    return () => { alive = false }
  }, [week?.id])

  if (!week?.id || !plan?.days?.length) return null

  /* Последните дни преди сцената, включително самия ден. */
  const days = plan.days.slice(-DAYS_SHOWN)

  function drain(key) {
    if (!pending.current[key]) return
    pending.current[key] = false
    setTimeout(() => save(key), 60)
  }

  async function save(key) {
    if (!user) return
    if (inflight.current[key]) { pending.current[key] = true; return }

    const [date, slot] = key.split('|')
    const typed = draftRef.current[key]
    const kg = kgOf(typed)
    const had = cellsRef.current[key]

    /* Изтрито поле значи изтрито мерене: ред с празно тегло е ред, който само
       обърква сравнението. */
    if (typed !== undefined && typed.trim() === '' && had?.id) {
      inflight.current[key] = true
      await supabase.from('peak_week_logs').delete().eq('id', had.id)
      inflight.current[key] = false
      setCells(prev => { const n = { ...prev }; delete n[key]; return n })
      drain(key)
      return
    }

    if (kg == null || kg === had?.kg) return

    inflight.current[key] = true
    const { data, error } = had?.id
      ? await supabase.from('peak_week_logs').update({ kg }).eq('id', had.id).select('id').single()
      : await supabase.from('peak_week_logs')
          .insert({ peak_week_id: week.id, user_id: user.id, date, slot, kg })
          .select('id').single()
    inflight.current[key] = false
    drain(key)
    if (error) return

    setCells(prev => ({ ...prev, [key]: { id: data.id, kg } }))
    haptic('success')
  }

  function edit(key, value) {
    setDraft(d => ({ ...d, [key]: value }))
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => save(key), 900)
  }

  /* Колко е паднало за нощта: вечерното мерене срещу сутрешното на следващия
     ден. Това е числото, заради което се пише цялата таблица. */
  function overnight(i) {
    const bed = cells[`${days[i].date}|bed`]?.kg
    const am  = cells[`${days[i + 1]?.date}|fasted`]?.kg
    if (bed == null || am == null) return null
    return Math.round((am - bed) * 10) / 10
  }

  return (
    <section className={styles.wrap}>
      <header className={styles.head}>
        <h2 className={styles.title}>{t('pd.title')}</h2>
        <p className={styles.sub}>{t('pd.sub')}</p>
      </header>

      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.stickyHead}>{t('pd.col.slot')}</th>
              {days.map(d => (
                <th key={d.date} style={{ minWidth: 78 }}>
                  {d.daysOut === 0
                    ? t('pd.showDay')
                    : t(d.daysOut === 1 ? 'pd.out.one' : 'pd.out.other', { n: d.daysOut })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot => (
              <tr key={slot}>
                <th className={styles.sticky}>
                  <span className={styles.slotName}>{t(`pd.slot.${slot}`)}</span>
                </th>
                {days.map(d => {
                  const key = `${d.date}|${slot}`
                  const shown = draft[key] ?? (cells[key]?.kg ?? '')
                  return (
                    <td key={key}>
                      <input
                        className={styles.cell}
                        value={shown}
                        onChange={e => edit(key, e.target.value)}
                        onBlur={() => save(key)}
                        inputMode="decimal"
                        aria-label={`${t(`pd.slot.${slot}`)} — ${d.daysOut}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* Падането за нощта: вечер срещу следващата сутрин. */}
            <tr className={styles.sumRow}>
              <th className={styles.sticky}>
                <span className={styles.slotName}>{t('pd.overnight')}</span>
              </th>
              {days.map((d, i) => {
                const v = overnight(i)
                return (
                  <td key={d.date}>
                    <span className={styles.sumCell}>
                      {v == null ? '–' : `${v > 0 ? '+' : ''}${v}`}
                    </span>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <p className={styles.hint}>{t('pd.hint')}</p>
    </section>
  )
}
