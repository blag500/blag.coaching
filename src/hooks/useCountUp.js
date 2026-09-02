import { useEffect, useRef, useState } from 'react'

/* Числата, които се качват.
 *
 * В цялото приложение нито едно число не се движеше. Лентите се наливаха,
 * пръстените се затваряха, капките изскачаха — а числото над тях просто беше
 * едно, а на следващия кадър друго. Заради това лентата и стойността ѝ
 * казваха различни неща: едната пътуваше, другата вече беше пристигнала.
 *
 * Тук числото пътува със същото движение като лентата под него. Не е ефект
 * заради ефекта: качващото се число е единственото, което прави разликата
 * между 1240 и 1310 kcal видима — иначе тя е две цифри, които се смениха,
 * докато погледът е бил другаде.
 */

/* Същата крива като --ease-glide в CSS: бързо тръгване, меко спиране, без
   превишаване. Число, което мине над целта си и се върне, се чете като грешка
   на брояча, а не като движение. */
function easeOut(t) { return 1 - Math.pow(1 - t, 3) }

function prefersReducedMotion() {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * @param {number}  value      крайната стойност
 * @param {object}  opts
 * @param {number}  opts.duration  колко трае пътуването, ms
 * @param {number}  opts.decimals  знаци след запетаята (килограмите искат 1)
 * @param {boolean} opts.fromZero  дали първото качване тръгва от нула
 * @param {number}  opts.delay     изчакване преди тръгване, ms — за да върви
 *                                 числото в такт с лентата под него, когато
 *                                 четири ленти се наливат на вълна
 * @returns {number} стойността за този кадър
 */
export function useCountUp(value, { duration = 700, decimals = 0, fromZero = true, delay = 0 } = {}) {
  const target = Number.isFinite(value) ? value : 0
  const [shown, setShown] = useState(() => (fromZero ? 0 : target))
  /* Къде е числото точно сега, а не откъде е тръгнало. Ако целта се смени по
     средата на пътуването — храна, вписана два пъти подред — новото пътуване
     започва от там, докъдето е стигнало окото, не от предишното начало. */
  const shownRef = useRef(fromZero ? 0 : target)
  const rafRef   = useRef(0)

  useEffect(() => {
    /* Изключено движение, липсваща стойност или нула разлика: числото е на
       мястото си веднага. Нула разлика е честият случай — този ефект се пуска
       при всяко пренарисуване на родителя. */
    if (shownRef.current === target || prefersReducedMotion()) {
      shownRef.current = target
      setShown(target)
      return
    }

    const from  = shownRef.current
    const delta = target - from
    /* Закъснението е част от началото, а не отделен таймер: един rAF цикъл
       държи и изчакването, и пътуването, така че отказът в края спира и
       двете. Отделен setTimeout би пуснал брояча върху размонтиран компонент. */
    const start = performance.now() + delay

    /* Кратък скок се изминава по-бързо от дълъг: 1240 → 1245 не заслужава
       същите 700ms като 0 → 1240, иначе малката поправка изглежда като
       забавяне. Под 40ms няма какво да се види, затова има и под. */
    const span = Math.max(
      40,
      Math.min(duration, duration * Math.min(1, Math.abs(delta) / Math.max(Math.abs(target), 1) + 0.25)),
    )

    function step(now) {
      if (now < start) { rafRef.current = requestAnimationFrame(step); return }
      const t = Math.min(1, (now - start) / span)
      const v = from + delta * easeOut(t)
      /* Закръглението е тук, не при рисуването: иначе ефектът върти по един
         кадър в секунда стойности, които се рисуват еднакво, и React
         пренарисува дървото без нищо да се е променило на екрана. */
      const rounded = decimals > 0
        ? Math.round(v * 10 ** decimals) / 10 ** decimals
        : Math.round(v)
      shownRef.current = rounded
      setShown(rounded)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        /* Кацането е точно на целта, не на закръглената крива: последният
           кадър трябва да е числото, а не почти него. */
        shownRef.current = target
        setShown(target)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, decimals, delay])

  return shown
}
