import { createContext, useContext, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { haptic } from '../lib/haptics'
import BadgePopup from '../components/TodayDashboard/BadgePopup'

/**
 * Наградите на деня — на едно място.
 *
 * Дотук откриването и показването живееха вътре в таблото. Значи наградата
 * се появяваше само ако човекът гледа таблото, а той не го гледа: калориите
 * се достигат в ХРАНЕНЕ, тренировката се отчита в ТРЕНИРОВКА. Награда, която
 * се показва някъде другаде, а не там, където е спечелена, е награда, която
 * никой не вижда.
 *
 * Затова тук стои какво значи „заслужена" и как изглежда, а екраните само
 * казват какво знаят: report('calories', вярно ли е). Всеки от тях вече държи
 * тази истина — храненето знае калориите, навиците знаят себе си — и никой не
 * прави заявка втори път само за да я каже.
 */

const Ctx = createContext(null)

/** Кой ден е — наградата е дневна и се дава веднъж на ден. */
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function RewardsProvider({ children }) {
  const [queue, setQueue] = useState([])
  // Последното, което всеки екран е казал. Оттук се вади и перфектният ден:
  // той не е отделно събитие, а трите заедно.
  const said = useRef({})

  const award = useCallback(type => {
    const k = `blag_badge_${type}_${todayKey()}`
    try {
      if (localStorage.getItem(k)) return
      localStorage.setItem(k, '1')
    } catch { /* частен режим — наградата минава, паметта не */ }
    setQueue(q => [...q, type])
    haptic('celebrate')
  }, [])

  /**
   * Екран съобщава какво знае.
   *
   * Дава се само при преминаване от „не" към „да", видяно в тази сесия.
   * Първото съобщаване само запомня: човек, който отваря приложението върху
   * вече изпълнен ден, не е постигнал нищо в този момент, а празненство при
   * всяко отваряне спира да значи каквото и да е било още на третия път.
   */
  const report = useCallback((key, done, ready = true) => {
    /* Незнанието не се записва. Мрежата отговаря след първото рисуване, значи
       „нула калории" в началото не е факт, а липса на отговор — а ако се
       запише като факт, зареждането на вече изпълнен ден изглежда като
       постижение и наградата изскача при всяко отваряне. */
    if (!ready) return

    const was = said.current[key]
    said.current[key] = done
    if (was === undefined || !done || was) return

    award(key)
    const s = said.current
    if (s.calories && s.habits && s.training) award('perfect')
  }, [award])

  const value = { report, award }

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* През портал към body: вътре в табовете има трансформация за суайпа,
          а position: fixed под трансформиран предшественик се закача за него
          вместо за екрана. */}
      {queue[0] && createPortal(
        <BadgePopup
          badge={queue[0]}
          onDone={() => setQueue(q => q.slice(1))}
        />,
        document.body,
      )}
    </Ctx.Provider>
  )
}

export function useRewards() {
  return useContext(Ctx) ?? { report: () => {}, award: () => {} }
}
